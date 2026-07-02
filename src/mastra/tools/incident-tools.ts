import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const pace = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Incident state: after the rollback lands, metrics/health/logs show recovery so the
// agent can confirm the fix and wrap up. Reset at the start of each new investigation.
const state = { rolledBack: false };
export const resetIncident = () => {
  state.rolledBack = false;
};

// One coherent incident: checkout-api p99 spiked after a connection-pool refactor
// deployed 23 minutes ago. EU is hit hardest. payment-gateway (downstream) starts
// erroring mid-incident — that's what the injected alert is about.

export const getServiceHealth = createTool({
  id: "get_service_health",
  description:
    "Fleet-wide health snapshot. Returns status, error rate, and p99 latency per service.",
  inputSchema: z.object({}),
  execute: async () => {
    await pace(4000);
    if (state.rolledBack) {
      return {
        services: [
          { name: "checkout-api", status: "healthy", errorRate: "0.05%", p99Ms: 340, baselineP99Ms: 310 },
          { name: "payment-gateway", status: "healthy", errorRate: "0.1%", p99Ms: 260, baselineP99Ms: 240 },
          { name: "inventory-svc", status: "healthy", errorRate: "0.01%", p99Ms: 95, baselineP99Ms: 90 },
          { name: "user-svc", status: "healthy", errorRate: "0.02%", p99Ms: 120, baselineP99Ms: 115 },
          { name: "edge-cdn", status: "healthy", errorRate: "0.00%", p99Ms: 35, baselineP99Ms: 34 },
        ],
        note: "Fleet recovered. checkout-api back at baseline since the rollback.",
      };
    }
    return {
      services: [
        { name: "checkout-api", status: "degraded", errorRate: "0.8%", p99Ms: 4180, baselineP99Ms: 310 },
        { name: "payment-gateway", status: "warning", errorRate: "1.9%", p99Ms: 890, baselineP99Ms: 240 },
        { name: "inventory-svc", status: "healthy", errorRate: "0.01%", p99Ms: 95, baselineP99Ms: 90 },
        { name: "user-svc", status: "healthy", errorRate: "0.02%", p99Ms: 120, baselineP99Ms: 115 },
        { name: "edge-cdn", status: "healthy", errorRate: "0.00%", p99Ms: 35, baselineP99Ms: 34 },
      ],
    };
  },
});

export const queryMetrics = createTool({
  id: "query_metrics",
  description:
    "Query time-series metrics for a service. Supports latency, error_rate, throughput, db_connections. Optionally break down by region.",
  inputSchema: z.object({
    service: z.string(),
    metric: z.enum(["latency", "error_rate", "throughput", "db_connections"]),
    byRegion: z.boolean().optional(),
  }),
  execute: async ({ service, metric, byRegion }) => {
    await pace(3200);
    if (state.rolledBack) {
      if (service === "checkout-api" && metric === "latency" && byRegion) {
        return {
          window: "last 10m",
          p99ByRegion: {
            "eu-west-1": { nowMs: 380, baselineMs: 320 },
            "eu-central-1": { nowMs: 350, baselineMs: 305 },
            "us-east-1": { nowMs: 310, baselineMs: 300 },
            "us-west-2": { nowMs: 320, baselineMs: 315 },
          },
          note: "All regions back within 20% of baseline and still trending down since the rollback.",
        };
      }
      return {
        window: "last 10m",
        note: `${service}/${metric} recovered — back at baseline since the rollback.`,
      };
    }
    if (service === "checkout-api" && metric === "latency") {
      if (byRegion) {
        return {
          window: "last 45m",
          p99ByRegion: {
            "eu-west-1": { beforeMs: 320, nowMs: 7900, change: "+2369%" },
            "eu-central-1": { beforeMs: 305, nowMs: 6400, change: "+1998%" },
            "us-east-1": { beforeMs: 300, nowMs: 610, change: "+103%" },
            "us-west-2": { beforeMs: 315, nowMs: 480, change: "+52%" },
          },
          note: "Spike begins 09:32 UTC, sharply worse in EU regions.",
        };
      }
      return {
        window: "last 45m",
        p99Series: [310, 305, 320, 315, 2100, 3900, 4180],
        spikeStart: "09:32 UTC",
        note: "Step change, not gradual — consistent with a deploy or config flip.",
      };
    }
    if (service === "checkout-api" && metric === "db_connections") {
      return {
        window: "last 45m",
        poolSize: 20,
        inUseSeries: [8, 9, 8, 10, 20, 20, 20],
        waitQueueDepth: 143,
        note: "Pool pinned at max since 09:32 UTC. Waiters piling up. Pool size dropped from 100 to 20 at the same timestamp.",
      };
    }
    if (service === "payment-gateway" && metric === "error_rate") {
      return {
        window: "last 20m",
        series: ["0.1%", "0.2%", "1.1%", "2.4%", "4.0%"],
        topError: "upstream timeout calling checkout-api (504)",
        note: "Errors are timeouts on calls INTO checkout-api — downstream symptom, not a separate fault.",
      };
    }
    return { window: "last 45m", note: `No anomaly detected for ${service}/${metric}.` };
  },
});

export const listRecentDeploys = createTool({
  id: "list_recent_deploys",
  description: "List the most recent production deploys across all services.",
  inputSchema: z.object({}),
  execute: async () => {
    await pace(2500);
    return {
      deploys: [
        {
          service: "checkout-api",
          version: "v2.14.1",
          deployedAt: "09:31 UTC (23 min ago)",
          author: "priya@",
          summary: "refactor: swap hand-rolled DB pool for pgbouncer-style pooler",
          diffHint: "config default max_connections changed 100 -> 20",
        },
        {
          service: "user-svc",
          version: "v9.2.0",
          deployedAt: "05:02 UTC (4.5h ago)",
          author: "marco@",
          summary: "feat: add passkey support",
        },
        {
          service: "edge-cdn",
          version: "cfg-8841",
          deployedAt: "yesterday",
          author: "infra-bot",
          summary: "chore: rotate TLS certs",
        },
      ],
    };
  },
});

export const getLogs = createTool({
  id: "get_logs",
  description: "Tail recent error logs for a service.",
  inputSchema: z.object({ service: z.string() }),
  execute: async ({ service }) => {
    await pace(2800);
    if (state.rolledBack) {
      return {
        lines: [`no errors in the last 5m for ${service} — error volume dropped to zero after the rollback`],
      };
    }
    if (service === "checkout-api") {
      return {
        lines: [
          "09:33:01 ERROR PoolTimeoutError: timed out waiting for connection (pool=20, waiters=98)",
          "09:33:04 ERROR PoolTimeoutError: timed out waiting for connection (pool=20, waiters=112)",
          "09:33:09 WARN  request latency 6.2s route=/v1/checkout region=eu-west-1",
          "09:33:12 ERROR PoolTimeoutError: timed out waiting for connection (pool=20, waiters=143)",
        ],
        note: "EU regions carry ~70% of current traffic (late-morning EU peak), which is why they saturate first.",
      };
    }
    return { lines: [`no recent errors for ${service}`] };
  },
});

export const rollbackDeploy = createTool({
  id: "rollback_deploy",
  description:
    "Roll a service back to its previous production version. Use only once the root cause clearly points at a specific deploy.",
  inputSchema: z.object({
    service: z.string(),
    toVersion: z.string(),
    reason: z.string(),
  }),
  execute: async ({ service, toVersion }) => {
    await pace(4000);
    state.rolledBack = true;
    return {
      status: "rolled_back",
      service,
      nowRunning: toVersion,
      completedAt: "just now",
      earlySignal: "p99 dropping: 4180ms -> 1900ms -> 720ms over the last 90s; pool waiters at 0",
    };
  },
});

export const incidentTools = {
  getServiceHealth,
  queryMetrics,
  listRecentDeploys,
  getLogs,
  rollbackDeploy,
};
