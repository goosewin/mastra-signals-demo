import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/**
 * `mastra dev` runs the bundled server with its own working directory, so cwd is not
 * the project root. Walk up until we find the source tree.
 */
function findProjectRoot(start: string = process.cwd()): string {
  let dir = resolve(start);
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(dir, "src", "mastra", "index.ts"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return resolve(start);
}

export const PROJECT_DIR = process.env.PROJECT_DIR ?? findProjectRoot();

/** The repository the agent works on. A sibling of this project by default. */
export const REPO_DIR =
  process.env.TARGET_REPO_DIR ?? join(PROJECT_DIR, "..", "agent-hour-live");
