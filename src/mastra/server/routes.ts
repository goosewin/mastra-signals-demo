import { registerApiRoute } from "@mastra/core/server";
import { dashboardHtml } from "./dashboard-html.js";
import { resetIncident } from "../tools/incident-tools.js";

const RESOURCE_ID = "demo-sre";

const target = (threadId: string) => ({ resourceId: RESOURCE_ID, threadId });

export const demoRoutes = [
  registerApiRoute("/demo", {
    method: "GET",
    handler: async (c) => c.html(dashboardHtml),
  }),

  // Kick off (or continue) the investigation — plain message input.
  registerApiRoute("/demo/start", {
    method: "POST",
    handler: async (c) => {
      const mastra = c.get("mastra");
      const agent = mastra.getAgent("incidentAgent");
      const { threadId } = await c.req.json();
      resetIncident();
      agent.sendMessage(
        "We just got paged: checkout latency is spiking in production and revenue is dropping. Investigate, find the root cause, and remediate.",
        target(threadId),
      );
      return c.json({ ok: true });
    },
  }),

  // Steer the agent mid-run — sendMessage() joins the ACTIVE loop.
  registerApiRoute("/demo/steer", {
    method: "POST",
    handler: async (c) => {
      const mastra = c.get("mastra");
      const agent = mastra.getAgent("incidentAgent");
      const { threadId, text } = await c.req.json();
      agent.sendMessage(
        { contents: text, attributes: { sentFrom: "steering-console" } },
        target(threadId),
      );
      return c.json({ ok: true });
    },
  }),

  // Queue a follow-up — runs as a new turn AFTER the current run completes.
  registerApiRoute("/demo/queue", {
    method: "POST",
    handler: async (c) => {
      const mastra = c.get("mastra");
      const agent = mastra.getAgent("incidentAgent");
      const { threadId, text } = await c.req.json();
      agent.queueMessage(text, target(threadId));
      return c.json({ ok: true });
    },
  }),

  // External event lands mid-run — durable notification signal (the webhook path).
  registerApiRoute("/demo/alert", {
    method: "POST",
    handler: async (c) => {
      const mastra = c.get("mastra");
      const agent = mastra.getAgent("incidentAgent");
      const { threadId } = await c.req.json();
      await agent.sendNotificationSignal(
        {
          source: "pagerduty",
          kind: "alert",
          priority: "high",
          summary:
            "NEW PAGE — payment-gateway error rate at 4.0% and climbing (threshold 1%). Triggered 09:49 UTC.",
          payload: { service: "payment-gateway", errorRate: "4.0%", threshold: "1%" },
          dedupeKey: "pagerduty:payment-gateway:error-rate",
        },
        target(threadId),
      );
      return c.json({ ok: true });
    },
  }),

  // Durable state lane — thread-scoped context the agent always sees fresh.
  registerApiRoute("/demo/state", {
    method: "POST",
    handler: async (c) => {
      const mastra = c.get("mastra");
      const agent = mastra.getAgent("incidentAgent");
      const { threadId, frozen } = await c.req.json();
      await agent.sendStateSignal(
        {
          id: "deploy-policy",
          mode: "snapshot",
          cacheKey: `deploy-policy:${frozen ? "frozen" : "open"}`,
          contents: frozen
            ? "Deploy policy: FREEZE ACTIVE. All deploys blocked except incident rollbacks."
            : "Deploy policy: open. Normal deploys allowed.",
          value: { deployFreeze: frozen },
        },
        target(threadId),
      );
      return c.json({ ok: true });
    },
  }),

  // SSE relay: any number of clients can watch the same thread live.
  registerApiRoute("/demo/stream", {
    method: "GET",
    handler: async (c) => {
      const mastra = c.get("mastra");
      const agent = mastra.getAgent("incidentAgent");
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
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`),
              );
            }
          } catch {
            // client went away or run errored — just close
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
