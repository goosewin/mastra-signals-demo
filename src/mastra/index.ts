import "dotenv/config";
import { Mastra } from "@mastra/core/mastra";
import { incidentAgent } from "./agents/incident-agent.js";
import { demoRoutes } from "./server/routes.js";
import { storage } from "../lib/storage.js";

export const mastra = new Mastra({
  agents: { incidentAgent },
  storage,
  server: {
    apiRoutes: demoRoutes,
  },
});
