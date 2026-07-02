# Demo Runbook — "Beyond the Demo: Steering Live Agents in Production with Mastra Signals"

15-minute slot. ~5 min slides, ~8 min live demo, ~2 min close. Rehearse once — a full
demo cycle takes ~2.5 minutes of agent runtime.

## Pre-flight (do this at the venue, before doors)

```bash
cd ~/Projects/mastra-signals-demo
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

## The script (timings from pressing `1`)

**Slides 1–6 (~4 min).** The setup: demos are request/response; production is rude;
here are the six verbs; two code slides. Keep pace — the demo is the talk.

**Slide 7 → switch to the console tab.**

1. **t=0** — Press `1`. "We just got paged. checkout p99 is 13x baseline. I'm not going
   to prompt-engineer — I paged an agent. Watch it work: hypothesis, one tool at a time."
   Let it narrate through health check → deploys (~20s).

2. **t≈20s** — Press `2` (mid-run, while a tool is spinning). "And now real life happens:
   a SECOND page fires. Nobody typed this — it's a webhook hitting
   `sendNotificationSignal()` on the running thread." Watch it acknowledge and triage it
   as a downstream symptom *without restarting the investigation*. This is the money moment — name it.

3. **t≈30s** — Press `3`, hit Enter (prefilled EU steer). "I know something it doesn't —
   customers are only complaining in the EU. I steer it like I'd steer a coworker.
   Mid-run. No restart, no lost context."

4. **t≈40s** — Press `4`. "The postmortem shouldn't interrupt the incident. `queueMessage()`
   — it runs as the next turn, automatically, when the current run finishes."

5. **While it rolls back / confirms recovery** — switch to the third tab. "One more thing —
   this is a different browser tab. Same thread, same live stream, via
   `subscribeToThread()`. Your whole team can watch and steer one agent. This is what
   multiplayer agents look like."

6. **Postmortem streams in on its own.** "I didn't touch anything. The queued turn fired
   when the incident closed." (Optionally press `5` earlier to show the state lane —
   skip if tight on time.)

**Slides 8–11 (~2 min).** How it routes (wake/deliver/queue/persist), what it unlocks,
thesis: *an agent is a process you talk to*, then the steal-this-demo slide.

## Recovery moves (things that can go wrong on stage)

- **DO NOT touch any file in the repo while the demo runs.** `mastra dev` hot-reloads on
  save — a restart kills the active run and drops queued messages. Close your editor.
  If the server ever crash-loops with `EADDRINUSE`, close console tabs (SSE holds the
  port), `pkill -f "mastra dev"`, and `npm run dev` again — 30 seconds.

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

## One-liners worth saying

- "That's not an agent, that's a slow function call."
- "The webhook didn't prompt the agent. It *signaled* it. Different verb, different world."
- "Kill-and-reprompt is the ctrl-alt-del of agent engineering. We can do better."
- "Threads are addressable. Everything else falls out of that."
