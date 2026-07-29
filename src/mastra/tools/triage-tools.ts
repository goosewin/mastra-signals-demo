import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { recentReports, markAllSeen } from "../../lib/mongo.js";
import { REPO_DIR } from "../../lib/paths.js";

const exec = promisify(execFile);

export { REPO_DIR };

/** Allowlist — the agent cannot reach the rest of the filesystem. */
const EDITABLE = ["src/pricing.ts"];

/** Models reliably guess `.js` for browser code; accept it rather than erroring. */
const resolvePath = (path: string) => path.replace(/\.js$/, ".ts");

const git = (args: string[]) => exec("git", args, { cwd: REPO_DIR, timeout: 30_000 });

/** Fresh branch per run, so repeat runs don't collide. */
export const branchName = () => `fix/live-${Date.now().toString(36)}`;

let activeBranch: string | null = null;
export const getActiveBranch = () => activeBranch;
export const resetBranch = () => {
  activeBranch = null;
};

export const listFieldReports = createTool({
  id: "list_field_reports",
  description:
    "Read the current bug backlog reported by people using the Motoring Coffee order page. This is live data — new reports arrive while you work.",
  inputSchema: z.object({
    limit: z.number().optional().describe("How many of the most recent reports to read."),
  }),
  execute: async ({ limit }) => {
    const docs = await recentReports(limit ?? 25);
    await markAllSeen();
    return {
      count: docs.length,
      reports: docs.map((d) => ({
        from: d.handle,
        text: d.text,
        minutesAgo: Math.max(0, Math.round((Date.now() - new Date(d.at).getTime()) / 60000)),
      })),
    };
  },
});

export const readSource = createTool({
  id: "read_source",
  description: "Read a source file from the order-page repository.",
  inputSchema: z.object({
    path: z.string().describe("Repo-relative path. The pricing logic is src/pricing.ts."),
  }),
  execute: async ({ path }) => {
    const resolved = resolvePath(path);
    try {
      const contents = await readFile(join(REPO_DIR, resolved), "utf8");
      return { path: resolved, contents };
    } catch {
      return { path, error: `No such file: ${path}. Editable files: ${EDITABLE.join(", ")}` };
    }
  },
});

export const runChecks = createTool({
  id: "run_checks",
  description:
    "Run the repository's test suite and return the real output. Use this to confirm which bugs are real before fixing, and to verify your fix afterwards.",
  inputSchema: z.object({}),
  execute: async () => {
    try {
      // process.execPath, not "node" — the PATH node may be too old to strip types.
      const { stdout } = await exec(process.execPath, ["test.ts"], {
        cwd: REPO_DIR,
        timeout: 30_000,
      });
      return { exitCode: 0, allPassing: true, output: stdout.trim() };
    } catch (err) {
      const e = err as { stdout?: string; stderr?: string; code?: number };
      return {
        exitCode: e.code ?? 1,
        allPassing: false,
        output: (e.stdout ?? "").trim() || (e.stderr ?? "").trim(),
      };
    }
  },
});

export const applyFix = createTool({
  id: "apply_fix",
  description:
    "Rewrite a source file with your corrected version. Supply the COMPLETE new file contents, not a patch. Run the checks afterwards to confirm.",
  inputSchema: z.object({
    path: z.string().describe("Repo-relative path. Only src/pricing.js is editable."),
    contents: z.string().describe("The complete new contents of the file."),
    summary: z.string().describe("One short sentence describing what you changed and why."),
  }),
  execute: async ({ path, contents, summary }) => {
    const resolved = resolvePath(path);
    if (!EDITABLE.includes(resolved)) {
      return { ok: false, error: `${path} is not editable. Editable files: ${EDITABLE.join(", ")}` };
    }
    if (contents.trim().length < 50) {
      return { ok: false, error: "That looks truncated — send the complete file contents." };
    }
    await writeFile(join(REPO_DIR, resolved), contents, "utf8");
    return { ok: true, path: resolved, summary, note: "File written. Run the checks to verify." };
  },
});

export const openPullRequest = createTool({
  id: "open_pull_request",
  description:
    "Open a real pull request against the order-page repository with your fix. Only call this once the checks pass.",
  // The run suspends here until sendToolApproval() resolves it.
  requireApproval: true,
  inputSchema: z.object({
    title: z.string().describe("PR title."),
    body: z.string().describe("PR description: what was broken, who reported it, what you changed."),
  }),
  execute: async ({ title, body }) => {
    activeBranch = branchName();
    try {
      await git(["checkout", "-b", activeBranch]);
      await git(["add", "-A"]);
      await git([
        "-c",
        "user.email=agent@mastra.ai",
        "-c",
        "user.name=Incident Copilot",
        "commit",
        "-m",
        title,
      ]);
      await git(["push", "-u", "origin", activeBranch]);
      const { stdout } = await exec(
        "gh",
        ["pr", "create", "--title", title, "--body", body, "--head", activeBranch, "--base", "main"],
        { cwd: REPO_DIR, timeout: 45_000 },
      );
      const url = stdout.trim().split("\n").pop() ?? "";
      return { ok: true, url, branch: activeBranch };
    } catch (err) {
      const e = err as { stdout?: string; stderr?: string };
      return { ok: false, error: (e.stderr ?? e.stdout ?? String(err)).slice(0, 500) };
    }
  },
});

/** How many checks currently fail. Preflight asserts the baseline is still broken. */
export async function countFailingChecks(): Promise<number> {
  try {
    await exec(process.execPath, ["test.ts"], { cwd: REPO_DIR, timeout: 30_000 });
    return 0;
  } catch (err) {
    const out = (err as { stdout?: string }).stdout ?? "";
    return Number(/(\d+) failing/.exec(out)?.[1] ?? -1);
  }
}

/** Put the repo back to a clean main so the demo can be run twice. */
export async function resetRepo() {
  try {
    await git(["checkout", "--", "."]);
    await git(["checkout", "main"]);
    await git(["reset", "--hard", "origin/main"]);
    if (activeBranch) {
      await git(["branch", "-D", activeBranch]).catch(() => {});
      activeBranch = null;
    }
  } catch (err) {
    console.error("[repo] reset failed:", err);
  }
}

export const triageTools = {
  listFieldReports,
  readSource,
  runChecks,
  applyFix,
  openPullRequest,
};
