# Stop killing your agents

A live demo of [Mastra Signals](https://mastra.ai/docs/agents/signals): a room full of
people steering one running agent from their phones, mid-flight, without restarting it.

Built for **Agent (After) Hour** — Mastra × MongoDB, Motoring Coffee, San Francisco,
29 July 2026.

- Talk beats: [NARRATIVE.md](NARRATIVE.md)
- Stage mechanics: [DEMO-RUNBOOK.md](DEMO-RUNBOOK.md)
- Slides: [deck/slides.html](deck/slides.html)
- The repo the agent fixes: [goosewin/agent-hour-live](https://github.com/goosewin/agent-hour-live)

## What happens

There's a little coffee-ordering page with four real bugs in it. The audience opens it on
their phones, finds the bugs, and files reports — straight into MongoDB. An agent reads
that backlog, runs the real test suite, fixes the bugs one at a time, and opens a real
pull request. The room approves the PR by vote.

While it's working, anyone can type into the agent's running loop. Their message lands
inside the turn — no restart, no lost context, evidence carried forward.

Nothing is scripted. The tests, the file edits, the git branch, the pull request and the
Mongo writes are all real.

## The Signals surface

Every verb in the demo, and where it shows up:

| Call | In the demo |
|------|-------------|
| `sendMessage()` | Pages the agent to start; also how the audience steers a live run |
| `queueMessage()` | The changelog follow-up — waits its turn, interrupts nothing |
| `sendNotificationSignal()` | An external monitor alert landing mid-run |
| `sendStateSignal()` | The Mongo backlog as a durable snapshot lane the agent always sees fresh |
| `subscribeToThread()` | The wall, every phone, and a server-side watcher, all on one stream |
| `sendToolApproval()` | The room's vote resolving the parked `open_pull_request` call |

The wiring is about 250 lines: [routes.ts](src/mastra/server/routes.ts),
[room.ts](src/lib/room.ts), [triage-agent.ts](src/mastra/agents/triage-agent.ts).

## Running it

Needs Node 22 (`.nvmrc`), Docker, `gh` authenticated, and an `OPENAI_API_KEY` in `.env`.

```bash
nub run dev            # or: nvm use && npm run dev
./scripts/preflight.sh # mongo + tunnel + health checks
```

Then open `/wall` on the projector and `/phone` on a phone.

`preflight.sh` refuses to pass unless the target repo still has its four failing tests —
without them there's nothing for the agent to fix.

## Notes for anyone stealing this

- **Back-pressure is not optional.** 250 people typing into one loop is a denial of
  service. [room.ts](src/lib/room.ts) enforces one delivered steer every 7 seconds, a
  25-second per-person cooldown, and a content filter, because it's going on a projector.
- **The target repo lives outside this one on purpose.** `mastra dev` hot-reloads on
  save; if the agent edited files inside this project, every edit would restart the
  server and kill the run.
- **Audience participation is additive, never load-bearing.** If nobody scans the QR the
  demo is identical, just quieter.
- The default `maxSteps` is 5, which is fewer than this job needs — see
  `defaultOptions` in [triage-agent.ts](src/mastra/agents/triage-agent.ts).
