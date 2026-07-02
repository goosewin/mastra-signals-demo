# Beyond the Demo: Steering Live Agents in Production with Mastra Signals

A production-shaped incident-response agent you can **steer while it runs**, built on
[Mastra Signals](https://mastra.ai/docs/agents/signals). Presented at *Beyond Demos:
Production AI Agents with Mastra × CopilotKit* (AWS Builder Loft, SF, July 2026).

The premise: a demo agent is request/response — the world politely stops changing while
it runs. A production agent gets interrupted: webhooks fire mid-run, humans change their
minds, state drifts. Signals make a running agent **addressable**:

| Verb | What it does |
|------|--------------|
| `sendMessage()` | joins the active loop mid-run, or wakes an idle thread |
| `queueMessage()` | runs as the next turn after the current run finishes |
| `sendNotificationSignal()` | durable inbox for external events (webhooks, CI, Slack) |
| `sendStateSignal()` | durable thread-scoped state lanes |
| `sendSignal()` | low-level system context, incl. processor-emitted signals |
| `subscribeToThread()` | any number of clients watch the same live stream |

## What's in the demo

An **SRE incident copilot** (`incident-agent`) investigates a checkout-latency SEV-1
using canned-but-coherent observability tools (health, metrics, deploys, logs, rollback).
While it streams, a **steering console** fires signals at the running thread:

- 🚨 a second PagerDuty alert lands mid-run (`sendNotificationSignal`) — the agent triages
  it as a downstream symptom without restarting
- 🎯 you steer it mid-investigation like a coworker (`sendMessage`)
- ⏭ the postmortem is queued and runs itself after the incident closes (`queueMessage`)
- 🧊 a deploy-freeze policy rides a durable state lane (`sendStateSignal`)
- open the console in a second tab → same thread, same live stream (`subscribeToThread`
  relayed over SSE)

## Run it

With [nub](https://nubjs.com) — one binary, no nvm, no tsx (it reads `.nvmrc` and
auto-provisions Node 22):

```bash
brew install nubjs/tap/nub   # or: curl -fsSL https://nubjs.com/install.sh | bash
nub install
cp .env.example .env         # set OPENAI_API_KEY
nub run dev                  # Mastra dev server
```

Or the classic path:

```bash
nvm use                 # Node 22+
npm install
cp .env.example .env    # set OPENAI_API_KEY
npm run dev             # Mastra dev server
```

Open **http://localhost:4111/demo** — the steering console. Keys `1`/`2`/`3`/`4`/`5`
fire the actions, `0` starts a fresh incident. Or drive it from a terminal:

```bash
nub scripts/inject.ts start  inc-demo     # nub runs TS directly — tsx not needed
nub scripts/inject.ts alert  inc-demo
nub scripts/inject.ts steer  inc-demo "focus on the EU regions"
nub scripts/inject.ts queue  inc-demo "draft the postmortem"
```

(`npm run inject -- <action> <threadId> [text]` still works via tsx on the classic path.)

The slide deck for the talk is [`deck/slides.html`](deck/slides.html); the stage
mechanics are in [`DEMO-RUNBOOK.md`](DEMO-RUNBOOK.md) and the spoken narrative in
[`NARRATIVE.md`](NARRATIVE.md).

## Layout

| Path | Role |
|------|------|
| [`src/mastra/agents/incident-agent.ts`](src/mastra/agents/incident-agent.ts) | The SRE copilot: instructions, tools, memory |
| [`src/mastra/tools/incident-tools.ts`](src/mastra/tools/incident-tools.ts) | Canned observability tools (stateful: recovery after rollback) |
| [`src/mastra/server/routes.ts`](src/mastra/server/routes.ts) | Steering endpoints wrapping the Signals API + SSE relay |
| [`src/mastra/server/dashboard-html.ts`](src/mastra/server/dashboard-html.ts) | The steering console (zero-dependency single page) |
| [`scripts/inject.ts`](scripts/inject.ts) | Terminal signal injector |

Signals are **experimental** — APIs may change. For multi-instance deployments, add
Redis Streams pub/sub (`@mastra/redis-streams`) so signals route across processes.
