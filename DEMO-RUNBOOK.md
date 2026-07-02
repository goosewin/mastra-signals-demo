# Demo Runbook — "Beyond the Demo: Steering Live Agents in Production with Mastra Signals"

15-minute slot. ~3 min setup slides, ~8 min live demo, ~2.5 min close, buffer. The full
spoken narrative (word-for-word beats, delivery rules, fireside callbacks) is in
[NARRATIVE.md](NARRATIVE.md) — this file is the mechanics. Rehearse once — a full demo
cycle takes ~2.5 minutes of agent runtime.

## Pre-flight (do this at the venue, before doors)

```bash
cd ~/Projects/mastra-signals-demo
nub run dev        # Mastra dev server on :4111 — nub reads .nvmrc, provisions Node 22
```

Fallback if nub misbehaves (`brew install nubjs/tap/nub` if missing):

```bash
nvm use            # Node 22 — REQUIRED, system node is too old/new
npm run dev        # Mastra dev server on :4111
```

- Open **`deck/slides.html`** in a browser tab, fullscreen (arrow keys / space / click to advance).
- Open **http://localhost:4111/demo** in a second tab (the steering console).
- Open **http://localhost:4111/demo** in a THIRD tab and leave it on another window —
  this is the "second responder" reveal.
- Click **♻️ New incident** once to get a fresh thread.
- Do one silent full run at the venue to warm everything (model latency, wifi).
- Kill the venue wifi risk: demo only needs OpenAI API access, nothing else.

## Keyboard shortcuts on the console (no mouse fumbling on stage)

| Key | Action | Signals API |
|-----|--------|-------------|
| `1` | Page the agent (start) | `sendMessage()` — wakes idle thread |
| `2` | Second PagerDuty alert | `sendNotificationSignal()` |
| `3` | Focus steer input (Enter sends) | `sendMessage()` into active loop |
| `4` | Queue postmortem | `queueMessage()` |
| `5` | Flip deploy-freeze state lane | `sendStateSignal()` |
| `0` | New incident (fresh thread) | — |

## The flow (spoken lines live in NARRATIVE.md — this is the mechanics)

**Slides 1–4 (~3 min).** Cold open (show of hands, gesture at pizza) → the demo lie
("batch job with good marketing") → production is rude → slide 4 is the handoff:
Mastra one-liner + the staged-outage disclosure. Demo starts by minute 3 — the API
teaching happens as voiceover *during* the agent's streaming gaps, not on slides.

**Slide 4 → switch to the console tab.** Cue every beat off **observable state**
(a tool chip spinning), never off the clock. Talk before the keypress; silence for the
first ~5s of every stream; one line after.

1. Press `1` — page the agent. Teach `sendMessage()` over the health-check gap.
2. While a tool chip spins — press `2` (second page). Set up BEFORE pressing ("this key
   stands in for your PagerDuty webhook — same call in production"), then silence while
   it lands, one line after ("symptom, not second incident").
3. While it works — press `3`, Enter (prefilled Berlin/EU steer). React to the region
   numbers on screen; never predict them.
4. While a tool chip spins — press `4` (queue postmortem). Must be mid-run.
5. During rollback/recovery — switch to the third tab (second responder). If possible,
   two windows side-by-side beats narrating it.
6. Postmortem streams in on its own. (`5` = state lane, optional, skip if tight.)

**Slides 5–8 (~2.5 min).** Thesis (~30s after the rollback, said slowly) → steal-sheet
(six verbs, "you watched five of them") → two-calls code slide → go build + CopilotKit
handoff + fireside bridge. Leave the final slide up through the fireside.

## Recovery moves (things that can go wrong on stage)

- **DO NOT touch any file in the repo while the demo runs.** `mastra dev` hot-reloads on
  save — a restart kills the active run and drops queued messages. Close your editor.
  If the server ever crash-loops with `EADDRINUSE`, close console tabs (SSE holds the
  port), `pkill -f "mastra dev"`, and `nub run dev` again — 30 seconds.

- **Agent finishes before you inject** — fine. `sendNotificationSignal()` on an idle
  thread *wakes it*. Say so: "idle thread? It wakes up. Active? It's delivered mid-loop.
  I don't have to care." (This is a feature, sell it as one.)
- **Press `4` (queue) only while the agent is mid-run** — a tool chip spinning. Queued
  messages fire after the *active* run completes; queueing against an idle thread just
  wakes it immediately, which muddies the "runs later, in order" story.
- **Agent wraps up early without rolling back** — steer it: *"evidence is clear — roll
  back now."* Don't apologize; narrate it: "it hesitated, I steered. That's the point."
- **Stream stalls / SSE drops** — EventSource auto-reconnects and re-subscribes. Wait 3s.
- **Total disaster** — press `0` (new incident), press `1`, keep talking over the restart.
  A full run is only ~90s.
- **Model being weird** — the tools are canned; the incident always has the same shape
  (pool 100→20 in checkout-api v2.14.1, EU-heavy, payment-gateway is downstream). You
  always know the right answer — narrate over it.

## One-liners worth saying (full set + delivery notes in NARRATIVE.md)

- "That's not an agent. That's a batch job with good marketing." (the callback — use it
  exactly three times: slide 2, after the triage beat, and once at the fireside)
- "You don't restart a colleague to give them new information." (pause after)
- "The thread IS the catch-up."
- "It hesitated, I steered. That's not a bug in the demo — that IS the demo."
- "Kill-and-reprompt is the ctrl-alt-del of agent engineering. We can do better."
- "Fake world, real runtime."
