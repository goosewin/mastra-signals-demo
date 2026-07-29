# Steering a live agent with Mastra Signals

A demo of [Mastra Signals](https://mastra.ai/docs/agents/signals): many people steering
one *already-running* agent from their phones, without restarting it.

Built for Agent (After) Hour — Mastra × MongoDB, San Francisco, July 2026.

## What it does

A small coffee-ordering page ships with four real bugs
([goosewin/agent-hour-live](https://github.com/goosewin/agent-hour-live)). People open it,
find the bugs, and file reports into MongoDB. An agent reads that backlog, runs the real
test suite, fixes the bugs one at a time, and opens a pull request — which only lands once
the audience votes to approve it.

While the agent works, anyone can send a message into its running loop. The message is
delivered mid-turn: no restart, no re-prompt, no lost context.

The tests, file edits, git branch, pull request and database writes are all real. There is
no scripted timeline and no canned telemetry.

## The Signals surface

| Call | Where it appears |
|------|------------------|
| `sendMessage()` | Starts the run; also delivers each audience steer into the live loop |
| `queueMessage()` | A follow-up turn that waits for the current one to finish |
| `sendNotificationSignal()` | An external monitor alert arriving mid-run |
| `sendStateSignal()` | The Mongo backlog as a snapshot lane, refreshed only when it changes |
| `subscribeToThread()` | Projector, phones and a server-side watcher on one stream |
| `sendToolApproval()` | Resolves the suspended `open_pull_request` call |

Wiring: [routes.ts](src/mastra/server/routes.ts) ·
[room.ts](src/lib/room.ts) ·
[triage-agent.ts](src/mastra/agents/triage-agent.ts)

## Running it

Requires Node 22 (see `.nvmrc`), Docker, an authenticated `gh`, and `OPENAI_API_KEY`
in `.env`.

```bash
npm install
npm run dev
./scripts/preflight.sh
```

`preflight.sh` starts MongoDB and a Cloudflare tunnel, publishes the public URL, and
verifies the target repo still has its four failing tests — without them there is nothing
for the agent to fix.

| Route | Purpose |
|-------|---------|
| `/wall` | Projector view: agent stream, live signal feed, vote |
| `/phone` | Audience view: file a report, steer the run, vote |
| `/cafe` | The order page, served from the target repo |
| `/demo/health` | Preflight status |

Clone the target repo to `../agent-hour-live`, or set `TARGET_REPO_DIR`.

## Implementation notes

- **Back-pressure is required, not optional.** Many clients writing into one loop needs
  rate limiting. [room.ts](src/lib/room.ts) delivers at most one steer every 7 seconds,
  enforces a 25-second per-sender cooldown, and filters content.
- **The target repo lives outside this project deliberately.** `mastra dev` restarts on
  file changes, and a restart terminates the active run — so the agent must not edit
  files inside this tree.
- **Audience input is additive.** With no participants the demo still runs; the operator
  supplies the steers instead.
- **`maxSteps` defaults to 5**, which silently truncates a run of this shape. See
  `defaultOptions` in [triage-agent.ts](src/mastra/agents/triage-agent.ts).
- **Child processes use `process.execPath`**, since a `node` on `PATH` may be too old to
  strip TypeScript types.

## License

MIT
