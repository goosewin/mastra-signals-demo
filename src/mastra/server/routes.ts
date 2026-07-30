import { registerApiRoute } from "@mastra/core/server";
import { readFile } from "node:fs/promises";
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { transform } from "esbuild";
import { toString } from "qrcode";
import { wallHtml } from "./wall-html.js";
import { phoneHtml } from "./phone-html.js";
import { resetRepo, resetBranch, countFailingChecks } from "../tools/triage-tools.js";
import { PROJECT_DIR, REPO_DIR } from "../../lib/paths.js";
import {
  insertReport,
  recentReports,
  reportCount,
  seedReports,
  mongoHealthy,
} from "../../lib/mongo.js";
import {
  room,
  vote,
  acceptSteer,
  castVote,
  closeVote,
  openVote,
  nextSteerToDeliver,
  resetRoom,
  GLOBAL_STEER_INTERVAL_MS,
} from "../../lib/room.js";

const RESOURCE_ID = "agent-hour";

const target = (threadId: string) => ({ resourceId: RESOURCE_ID, threadId });

/** The thread the room is currently steering. Set on /demo/start. */
let activeThreadId: string | null = null;
let pendingApproval: { toolCallId?: string; toolName: string } | null = null;
let lastReportCount = 0;

/** Tunnel URL, persisted outside the project so it survives a `mastra dev` reload. */
const URL_FILE = join(homedir(), ".agent-hour-url");
let publicUrl = process.env.PUBLIC_URL ?? "";
function getPublicUrl() {
  if (publicUrl) return publicUrl;
  try {
    publicUrl = readFileSync(URL_FILE, "utf8").trim();
  } catch {
    /* not set yet */
  }
  return publicUrl;
}

type MastraLike = { getAgent: (id: string) => any };

/**
 * Background loop: delivers queued steers under back-pressure, and keeps the
 * `field-reports` state lane in sync with Mongo.
 */
let loopStarted = false;
function startRoomLoop(mastra: MastraLike) {
  if (loopStarted) return;
  loopStarted = true;

  setInterval(async () => {
    if (!activeThreadId) return;
    const agent = mastra.getAgent("triageAgent");

    // At most one steer per interval, delivered into the active run.
    const steer = nextSteerToDeliver();
    if (steer) {
      try {
        await agent.sendMessage(
          {
            contents: `[${steer.handle} in the room] ${steer.text}`,
            attributes: { sentFrom: "audience", handle: steer.handle },
          },
          target(activeThreadId),
        );
      } catch (err) {
        console.error("[room] steer delivery failed:", err);
      }
    }

    // Republish the backlog only when it changes; cacheKey dedupes the rest.
    try {
      const count = await reportCount();
      if (count !== lastReportCount) {
        lastReportCount = count;
        const docs = await recentReports(12);
        await agent.sendStateSignal(
          {
            id: "field-reports",
            mode: "snapshot",
            cacheKey: `field-reports:${count}`,
            contents:
              `${count} bug reports from people using the order page right now. Most recent first:\n` +
              docs.map((d) => `- ${d.handle}: ${d.text}`).join("\n"),
            value: { count },
          },
          target(activeThreadId),
        );
      }
    } catch (err) {
      console.error("[room] state signal failed:", err);
    }
  }, 2500);
}

/** Server-side watcher: notices when the run pauses for approval and opens the room vote. */
async function watchForApproval(mastra: MastraLike, threadId: string) {
  const agent = mastra.getAgent("triageAgent");
  try {
    const sub = await agent.subscribeToThread({ threadId, resourceId: RESOURCE_ID });
    for await (const chunk of sub.stream) {
      if (chunk?.type === "tool-call-approval") {
        const payload = chunk.payload ?? {};
        pendingApproval = {
          toolCallId: payload.toolCallId,
          toolName: payload.toolName ?? "open_pull_request",
        };
        openVote(
          payload.toolCallId,
          pendingApproval.toolName,
          payload.args?.title ?? "Open a pull request with the fix",
        );
        console.log("[approval] room vote opened:", pendingApproval);
      }
    }
  } catch (err) {
    console.error("[approval] watcher ended:", err);
  }
}

export const demoRoutes = [
  /* ---------------- Screens ---------------- */

  registerApiRoute("/wall", {
    method: "GET",
    handler: async (c) => c.html(wallHtml),
  }),

  registerApiRoute("/phone", {
    method: "GET",
    handler: async (c) => c.html(phoneHtml),
  }),

  // Absolute path: `mastra dev` runs from its bundle output, so cwd is not the root.
  registerApiRoute("/deck", {
    method: "GET",
    handler: async (c) => c.html(await readFile(join(PROJECT_DIR, "deck/slides.html"), "utf8")),
  }),

  // Rendered locally so the page makes no external requests.
  registerApiRoute("/qr", {
    method: "GET",
    handler: async (c) => {
      const text = c.req.query("text") ?? "";
      const svg = await toString(text, { type: "svg", margin: 1, width: 380 });
      return new Response(svg, {
        headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-store" },
      });
    },
  }),

  /* ------- The order page itself, served straight out of the repo ------- */

  registerApiRoute("/cafe", {
    method: "GET",
    handler: async (c) => c.html(await readFile(join(REPO_DIR, "index.html"), "utf8")),
  }),

  // Transpiled on request, so an edit is live on reload with no build step. Both paths:
  // index.html's "./src/pricing.ts" resolves against /cafe to /src/pricing.ts.
  ...["/src/pricing.ts", "/cafe/src/pricing.ts"].map((path) =>
    registerApiRoute(path, {
      method: "GET",
      handler: async (c) => {
        const src = await readFile(join(REPO_DIR, "src/pricing.ts"), "utf8");
        const out = await transform(src, { loader: "ts", format: "esm", target: "es2022" });
        return new Response(out.code, {
          headers: { "Content-Type": "application/javascript", "Cache-Control": "no-store" },
        });
      },
    }),
  ),

  /* ---------------- Audience endpoints ---------------- */

  registerApiRoute("/room/report", {
    method: "POST",
    handler: async (c) => {
      const { handle, text } = await c.req.json();
      const clean = String(text ?? "").trim().slice(0, 240);
      if (clean.length < 5) return c.json({ ok: false, reason: "Add a little more detail." });
      room.participants.add(String(handle ?? "someone").slice(0, 24));
      await insertReport(String(handle ?? "someone").slice(0, 24), clean);
      return c.json({ ok: true });
    },
  }),

  registerApiRoute("/room/steer", {
    method: "POST",
    handler: async (c) => {
      const { handle, text } = await c.req.json();
      const result = acceptSteer(String(handle ?? ""), String(text ?? ""));
      return c.json(
        result.ok
          ? { ok: true, queued: room.queue.length, gated: !room.floodgatesOpen }
          : { ok: false, reason: result.reason },
      );
    },
  }),

  registerApiRoute("/room/vote", {
    method: "POST",
    handler: async (c) => {
      const { handle, approve } = await c.req.json();
      return c.json(castVote(String(handle ?? ""), Boolean(approve)));
    },
  }),

  /** Polled by the wall and every phone — the whole room state in one payload. */
  registerApiRoute("/room/state", {
    method: "GET",
    handler: async (c) => {
      // Read the real count every poll — the wall's Mongo counter must tick the
      // moment someone files, not only once a run is live.
      const reports = await reportCount().catch(() => lastReportCount);
      return c.json({
        participants: room.participants.size,
        received: room.received,
        dropped: room.dropped,
        queued: room.queue.length,
        floodgatesOpen: room.floodgatesOpen,
        steerIntervalMs: GLOBAL_STEER_INTERVAL_MS,
        queue: room.queue.slice(0, 6),
        delivered: room.delivered.slice(-8).reverse(),
        reports,
        publicUrl: getPublicUrl(),
        vote: {
          open: vote.open,
          toolName: vote.toolName,
          summary: vote.summary,
          yes: vote.yes.size,
          no: vote.no.size,
          resolved: vote.resolved,
        },
      });
    },
  }),

  registerApiRoute("/room/reports", {
    method: "GET",
    handler: async (c) => c.json({ reports: await recentReports(15) }),
  }),

  /* ---------------- Speaker controls ---------------- */

  registerApiRoute("/demo/start", {
    method: "POST",
    handler: async (c) => {
      const mastra = c.get("mastra") as MastraLike;
      const agent = mastra.getAgent("triageAgent");
      const { threadId } = await c.req.json();
      activeThreadId = threadId;
      lastReportCount = 0;
      startRoomLoop(mastra);
      void watchForApproval(mastra, threadId);
      agent.sendMessage(
        "People are using the Motoring Coffee order page right now and filing bug reports. Read the backlog, verify which reports are real, and fix exactly what has been reported — nothing more. Open a pull request once every reported bug is fixed.",
        target(threadId),
      );
      return c.json({ ok: true });
    },
  }),

  /** Open or close the floodgates on audience steering. */
  registerApiRoute("/demo/floodgates", {
    method: "POST",
    handler: async (c) => {
      const { open } = await c.req.json();
      room.floodgatesOpen = Boolean(open);
      return c.json({ ok: true, floodgatesOpen: room.floodgatesOpen });
    },
  }),

  /** A hard external event lands mid-run — the webhook path. */
  registerApiRoute("/demo/alert", {
    method: "POST",
    handler: async (c) => {
      const mastra = c.get("mastra") as MastraLike;
      const agent = mastra.getAgent("triageAgent");
      const count = await reportCount();
      await agent.sendNotificationSignal(
        {
          source: "order-page-monitor",
          kind: "alert",
          priority: "high",
          summary: `Checkout error rate spiking on the live order page — ${count} field reports now open, several describing totals that render as "error".`,
          payload: { reports: count },
          dedupeKey: "monitor:order-page:errors",
        },
        target(activeThreadId ?? ""),
      );
      return c.json({ ok: true });
    },
  }),

  /** Queue the follow-up turn — runs after the current one finishes. */
  registerApiRoute("/demo/queue", {
    method: "POST",
    handler: async (c) => {
      const mastra = c.get("mastra") as MastraLike;
      const agent = mastra.getAgent("triageAgent");
      await agent.queueMessage(
        "Now write a short CHANGELOG entry for the fix you just shipped, crediting the people in the room who reported it by handle.",
        target(activeThreadId ?? ""),
      );
      return c.json({ ok: true, queued: true });
    },
  }),

  /** Resolve the room's vote into a real tool approval. */
  registerApiRoute("/demo/resolve-vote", {
    method: "POST",
    handler: async (c) => {
      const mastra = c.get("mastra") as MastraLike;
      const agent = mastra.getAgent("triageAgent");
      const body = await c.req.json().catch(() => ({}));
      const approved = body.approved ?? vote.yes.size >= vote.no.size;
      if (!activeThreadId) return c.json({ ok: false, reason: "no active thread" }, 400);

      await agent.sendToolApproval({
        threadId: activeThreadId,
        resourceId: RESOURCE_ID,
        toolCallId: pendingApproval?.toolCallId,
        approved,
        ...(approved
          ? {}
          : {
              declineContext: {
                reason: "The room voted no.",
                message:
                  "The room declined this pull request. Ask what they want changed before proposing again.",
              },
            }),
      });

      closeVote(approved ? "approved" : "declined");
      pendingApproval = null;
      return c.json({ ok: true, approved });
    },
  }),

  registerApiRoute("/demo/reset", {
    method: "POST",
    handler: async (c) => {
      await resetRepo();
      resetBranch();
      await seedReports();
      resetRoom();
      activeThreadId = null;
      pendingApproval = null;
      lastReportCount = 0;
      return c.json({ ok: true });
    },
  }),

  registerApiRoute("/demo/public-url", {
    method: "POST",
    handler: async (c) => {
      const { url } = await c.req.json();
      publicUrl = String(url ?? "").replace(/\/$/, "");
      writeFileSync(URL_FILE, publicUrl, "utf8");
      return c.json({ ok: true, publicUrl });
    },
  }),

  /** Preflight — everything that has to be true before a run. */
  registerApiRoute("/demo/health", {
    method: "GET",
    handler: async (c) => {
      const [mongoOk, repoOk, checks] = await Promise.all([
        mongoHealthy(),
        readFile(join(REPO_DIR, "src/pricing.ts"), "utf8").then(
          () => true,
          () => false,
        ),
        countFailingChecks().catch(() => -1),
      ]);
      // The bugs must still be present, or there is nothing for the agent to fix.
      const failing = checks;
      return c.json({
        mongo: mongoOk,
        repo: repoOk,
        openaiKey: Boolean(process.env.OPENAI_API_KEY),
        publicUrl: getPublicUrl() || null,
        activeThread: activeThreadId,
        baselineFailing: failing,
        baselineOk: failing === 7,
      });
    },
  }),

  /* ---------------- The shared live stream ---------------- */

  registerApiRoute("/demo/stream", {
    method: "GET",
    handler: async (c) => {
      const mastra = c.get("mastra") as MastraLike;
      const agent = mastra.getAgent("triageAgent");
      const threadId = c.req.query("threadId");
      if (!threadId) return c.json({ error: "threadId required" }, 400);

      const subscription = await agent.subscribeToThread({
        threadId,
        resourceId: RESOURCE_ID,
      });

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const heartbeat = setInterval(() => {
            try {
              controller.enqueue(encoder.encode(": hb\n\n"));
            } catch {
              clearInterval(heartbeat);
            }
          }, 20000);
          try {
            for await (const chunk of subscription.stream) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
            }
          } catch {
            // client went away or the run errored — just close
          } finally {
            clearInterval(heartbeat);
            subscription.unsubscribe();
            try {
              controller.close();
            } catch {
              // already closed
            }
          }
        },
        cancel() {
          subscription.unsubscribe();
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    },
  }),
];
