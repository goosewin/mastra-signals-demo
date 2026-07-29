import "dotenv/config";
import { Mastra } from "@mastra/core/mastra";
import { triageAgent } from "./agents/triage-agent.js";
import { demoRoutes } from "./server/routes.js";
import { storage } from "../lib/storage.js";
import { connectMongo } from "../lib/mongo.js";

void connectMongo().catch((err) => {
  console.error("[mongo] not reachable — is the container up?", err.message);
});

export const mastra = new Mastra({
  agents: { triageAgent },
  storage,
  server: {
    apiRoutes: demoRoutes,
  },
});
