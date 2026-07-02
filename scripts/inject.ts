// Fire signals at a running incident thread from the terminal.
// Usage: npm run inject -- <start|alert|steer|queue|freeze> <threadId> [text]
const [action, threadId, ...rest] = process.argv.slice(2);
const text = rest.join(" ");
const base = process.env.MASTRA_URL ?? "http://localhost:4111";

if (!action || !threadId) {
  console.error("usage: npm run inject -- <start|alert|steer|queue|freeze> <threadId> [text]");
  process.exit(1);
}

const routes: Record<string, { path: string; body: Record<string, unknown> }> = {
  start: { path: "/demo/start", body: { threadId } },
  alert: { path: "/demo/alert", body: { threadId } },
  steer: { path: "/demo/steer", body: { threadId, text } },
  queue: { path: "/demo/queue", body: { threadId, text } },
  freeze: { path: "/demo/state", body: { threadId, frozen: true } },
};

const route = routes[action];
if (!route) {
  console.error(`unknown action: ${action}`);
  process.exit(1);
}

const res = await fetch(base + route.path, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(route.body),
});
console.log(action, "->", res.status, await res.text());
