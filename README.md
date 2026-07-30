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

`preflight.sh` starts MongoDB and a Cloudflare tunnel, verifies the public URL from the
outside, and checks the target repo still has its seven failing tests — without them
there is nothing for the agent to fix.

| Route | Purpose |
|-------|---------|
| `/wall` | Projector view: agent stream, live room feed, approval banner |
| `/phone` | Audience view: one box — bug reports and steers alike |
| `/cafe` | The order page, served from the target repo |
| `/demo/health` | Preflight status |

Clone the target repo to `../agent-hour-live`, or set `TARGET_REPO_DIR`.

## Making it reachable for a real audience

This part bit us on stage. Read it before you put a QR code in front of a room.

The audience's phones need a public URL for `/phone`. How you get one matters:

- **Cloudflare quick tunnels (`cloudflared tunnel --url`) are ephemeral.** The
  `*.trycloudflare.com` hostname is bound to the *connection*, not the process. Close
  the laptop lid, switch wifi, or disconnect long enough and the hostname is
  deregistered — DNS stops resolving for everyone — while `cloudflared` keeps running
  as if nothing happened. A tunnel started at home is dead by the time you reach the
  venue, and nothing on your machine tells you.
- **Never trust a tunnel you didn't just verify from the outside.** The only check that
  means anything is fetching the public URL the way a phone will:
  `curl -sf https://YOUR-TUNNEL.trycloudflare.com/phone`. A running process, or a URL
  that worked two hours ago, counts for nothing. `preflight.sh` does this check and
  mints a fresh tunnel when it fails — run it **at the venue**, minutes before doors,
  never only before you leave.
- **For a real event, use a stable hostname:** a named Cloudflare tunnel (free, needs
  a domain), ngrok with a reserved domain, or Tailscale Funnel. Those survive
  reconnects; quick tunnels don't.
- **Mind the concurrency.** Quick tunnels throttle around ~200 concurrent requests,
  and this phone page polls every 1.5 s per client — a room of ~200 saturates one by
  itself. Big rooms want a named/paid tunnel, a longer poll interval, or phones on the
  venue LAN hitting the laptop's IP directly.
- **If the tunnel dies mid-demo:** restart it and POST the new URL to
  `/demo/public-url` — the wall's QR updates within a second, no reload.

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
