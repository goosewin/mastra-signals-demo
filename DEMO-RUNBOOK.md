# Demo Runbook — "Stop killing your agents"

Agent (After) Hour · Motoring Coffee, 1525 Union St · 29 July 2026 · doors 6:00, talks 6:30.
20-minute slot. ~4 min slides, ~11 min demo, ~4 min close, buffer.

The spoken beats live in [NARRATIVE.md](NARRATIVE.md). This file is the mechanics.

---

## Pre-flight (do this at the venue, before doors)

```bash
cd ~/Projects/mastra-signals-demo && ./scripts/preflight.sh
```

That script starts Mongo, starts the tunnel, publishes the URL, and prints a checklist.
If you'd rather do it by hand, it's these four things:

```bash
docker start agenthour-mongo || docker run -d --name agenthour-mongo -p 27017:27017 mongo:7 --replSet rs0 --bind_ip_all
nub run dev                                          # or: nvm use && npm run dev
cloudflared tunnel --url http://localhost:4111       # copy the trycloudflare.com URL
curl -X POST localhost:4111/demo/public-url -H 'Content-Type: application/json' -d '{"url":"https://YOUR-TUNNEL.trycloudflare.com"}'
```

**Then check the one endpoint that matters:**

```bash
curl -s localhost:4111/demo/health
```

You want `mongo: true`, `repo: true`, `openaiKey: true`, `publicUrl` set, and
**`baselineOk: true`**. `baselineOk` means the order page still has its four bugs — if
it's false, the agent has nothing to fix and the demo is dead. Fix with `curl -X POST
localhost:4111/demo/reset`.

### Open these tabs

| Tab | URL | Where it goes |
|-----|-----|---------------|
| **Wall** | `localhost:4111/wall` | The projector. Fullscreen it. |
| **Deck** | `deck/slides.html` | The projector, before and after. |
| Order page | `localhost:4111/cafe` | Your laptop — for the reload reveal at the end. |
| Phone | the tunnel `/phone` | Your own phone, so you can seed a steer if the room is shy. |

Do **one full silent run** at the venue to warm model latency and confirm the tunnel.
Then `0` to reset. A full run is about 45 seconds of agent time and ~13 tool calls.

---

## Keys (all on the wall, no mouse on stage)

| Key | Action | Signals API |
|-----|--------|-------------|
| `1` | Page the agent — starts the run | `sendMessage()` |
| `2` | **Toggle audience steering** on/off | gates `sendMessage()` |
| `3` | External alert lands mid-run | `sendNotificationSignal()` |
| `4` | Queue the changelog follow-up | `queueMessage()` |
| `5` | Approve the pull request | `sendToolApproval()` |
| `T` | Decline it (the room said no) | `sendToolApproval({approved:false})` |
| `0` | Full reset — fresh thread, repo, backlog | — |
| `c` | Open the order page in a new tab | — |

Every keypress shows a toast on the wall naming the API call, so you never have to
remember which verb you just demonstrated.

---

## The flow

**Slides 1–3 (~3 min).** Show of hands on hitting Escape → every agent has one input →
production is rude → "a batch job with good marketing".

**Slide 4 (~45s).** Mastra one-liner. **Put the QR up.**

**Switch to the wall. Do NOT press `1` yet.**

1. **Let the room file bugs first (~90s).** This is the part that makes the rest work.
   Talk while the Mongo counter climbs. You need a real backlog before you start the
   agent, and people need time to scan, load, and type. Don't rush this — a climbing
   counter is the best visual you have and it costs you nothing.

2. **Press `1`.** Silence for ~5 seconds. Then narrate the first tool call. When
   `runChecks` comes back red, react to it — that's a real test suite failing.

3. **Press `2`** once a tool chip is spinning. Audience steering goes live. Now shut up
   and let the room drive. Wait for the first stranger's handle to appear in the stream
   and let it land before you say anything.

4. **Press `3`** only if the energy dips — the external alert is a spare, not a
   requirement.

5. **The vote opens by itself** when the agent proposes the PR. The run is genuinely
   parked here — this is your pacing lever, hold it as long as the room is enjoying it.
   Press `5` to approve. (`T` to decline is the more interesting demo if you have time.)

6. **The PR banner** appears with its own QR. Tell people to open it. Then switch to the
   order page tab and reload — the bug they reported is gone.

7. **Press `4`** for the queued changelog if you have a spare minute.

**Slides 5–8 (~3 min).** Thesis → seven verbs → the two calls → go build.

---

## Recovery moves

- **DO NOT edit or save any file in this repo while the demo runs.** `mastra dev`
  hot-reloads on save and a restart kills the active run. Close your editor. This is the
  single most likely way to break the demo — it killed four runs during the build.

- **Nobody scans the QR.** Steer it yourself from your own phone. Never wait on the room.
  The demo is identical, just quieter — audience input is additive, never load-bearing.

- **Someone steers it somewhere stupid.** Follow it, out loud. An agent visibly obeying a
  bad instruction is the feature working. Then overrule the room, also out loud.

- **The agent finishes before you're ready.** The thread is idle, not dead. Any steer
  wakes it. Say so: "idle thread? Same verb."

- **Stream stalls >30s.** Talk to it: "continue — you have enough evidence." The steer
  joins the run and it resumes. Narrate it as the feature.

- **The vote is a tie / nobody votes.** `5` approves regardless. The tally is theatre;
  you hold the actual key.

- **PR fails to open** (network, gh auth). The fix is still real and on disk — reload the
  order page and show the bug is gone. `gh auth status` beforehand to avoid this.

- **Tunnel dies.** The wall, the agent, and the whole demo still work on localhost —
  only phones drop off. Restart cloudflared, re-POST `/demo/public-url`; the wall picks
  up the new QR within ~1 second without a reload.

- **Total disaster.** `0`, then `1`, keep talking. A full run is ~45 seconds and you know
  exactly what it will find: large priced below medium, no guard on unknown drinks,
  negative quantities discounting the order, and tip charged on tax.

---

## What's actually real here

Worth being able to say plainly, because someone will ask:

- **Real:** the repo, the bugs, the test suite (`node test.ts`), the file edits, the git
  branch, the pull request, the MongoDB writes, every signal, and every person steering.
- **Staged:** the three seed bug reports in the backlog (so the agent has something to
  read before the room arrives), and the fact that the bugs were planted on purpose.
- **Not simulated at all:** there is no scripted timeline and no canned telemetry. If the
  agent does something surprising, that's the model, not a script.
