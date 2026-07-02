import { mkdirSync } from "node:fs";
import { LibSQLStore } from "@mastra/libsql";

mkdirSync(".mastra", { recursive: true });

export const storage = new LibSQLStore({ id: "libsql", url: "file:./.mastra/mastra.db" });
