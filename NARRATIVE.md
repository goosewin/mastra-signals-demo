# "2:47 AM" — the stage narrative

The demo is not a feature tour. It's a retelling of an incident night everyone in the
room has lived — except this time there's a copilot, and the incident starts in the
first three minutes. You teach the API *while the incident runs*, in the natural
20-second gaps of the agent stream. The thesis lands ~30 seconds after the rollback,
at the emotional peak. Recap slides come after, as the steal-sheet.

**Delivery rules (more important than any line below):**
- Talk **before** the keypress. Shut up for the first ~5 seconds of every stream —
  a spinner plus a confidently silent speaker reads as *real*. One pointed line after.
- Never verbally predict a number before it's on screen. React to the screen
  ("there it is — look at the EU number"), don't pre-commit ("it will say 7.9s").
- Cue beats off **observable state** (a tool chip spinning), never off the clock.
- The 2–3s tool pauses need nothing. Let them breathe.
- One insult, three uses: **"a batch job with good marketing."** Don't coin variants.

---

## Cold open (slide 1, ~30s)

> "Quick show of hands — who's been paged during dinner?" *(gesture at the pizza)*
> "Keep them up if it was checkout, payments, or 'something is slow.' …Yeah.
> Tonight's for you."

## Setup (slides 2–3, ~2 min — keep moving)

- "Every agent demo you've seen works because the world politely stops changing while
  the agent runs. One prompt, one answer, applause."
- "Production is *rude*. Webhooks fire mid-run. Users change their minds mid-sentence.
  And your agent has exactly one move: die and get re-prompted."
- Punchline, land it clean: **"That's not an agent. That's a batch job with good
  marketing."**
- Your options today (fast, off slide 3): kill-and-reprompt, poll-and-cram, or build
  your own message bus. "There goes the quarter."

## Handoff to the demo (slide 4, ~30s — then switch to the console)

> "Mastra is an open-source TypeScript agent runtime, and it just shipped something
> called Signals — a way to talk to an agent that's *already running*. I could show
> you six API slides. Instead: it's 2:47 in the morning, and checkout is melting.
>
> Full disclosure, since tonight is literally called *Beyond Demos*: the outage is
> staged — canned telemetry, scripted timeline. Every signal you're about to see
> hitting a live agent mid-run is real. Fake world, real runtime."

Switch to the steering console. Demo starts by minute 3.

## The incident (~8 min)

### Beat 1 — press `1` (page the agent)

Before the keypress:
> "My phone does the thing. p99 is thirteen times baseline, the revenue graph is doing
> a cliff impression, and I am horizontal. Last Tuesday, the pager woke *me* up first.
> Tonight it pages the agent."

Press `1`. **Silence** while the first text streams. Then, over the health check:
> "Hypothesis, one tool, read the result, next. It's not psychic — it's methodical.
> Every one of these chips is a decision nobody had to be awake for."

Use the stream gaps to teach (this replaces the old code slides mid-deck):
> "What woke it up is `sendMessage()` — one call, addressed to a thread. If the agent
> had already been running, the same call would've been delivered *into* the loop.
> For delivery, you don't have to care which. That's the whole API bet."

### Beat 2 — press `2` while a tool chip is spinning (the second page)

Before the keypress:
> "Now the part demos never show you: incidents travel in packs. Watch what it does
> with a *second* alert — most agents fork a new conversation or lose the thread.
> This key is standing in for your PagerDuty webhook — in production it's the exact
> same call, `sendNotificationSignal()`, fired from your webhook handler. Same payload,
> same dedupe key."

Press `2`. Silence while it lands. It's treating it as related — say so as it verifies:
> "Symptom, not second incident. That's what your senior engineer does at 3 AM.
> A batch job with good marketing does not."

(If it fully triages it downstream — 504s calling INTO checkout — point at that line
on screen. If it hedges, that's fine: "it's verifying instead of assuming. Good.")

### Beat 3 — press `3`, Enter (the human steer)

Before the keypress:
> "But here's what no dashboard knows and I do: support tickets are all coming from
> Berlin. So I tell it — the way I'd tell a coworker. Mid-run. Because you don't
> restart a colleague to give them new information." *(pause — let that one sit)*

Press Enter. When the region breakdown lands, react to the screen:
> "There it is — look at the EU numbers. Six to eight seconds against a 300-millisecond
> baseline. It heard me, kept its evidence, changed direction. Same thread."

### Beat 4 — press `4` while a tool chip is spinning (queue the postmortem)

> "It's closing in on the fix. And I already know what comes after every incident:
> the postmortem, written at 4 AM by someone who can no longer spell 'mitigation.'
> `queueMessage()` — it waits its turn and fires the second this turn finishes.
> Nobody got interrupted."

### Beat 5 — the second responder (switch to the third tab)

> "My teammate just joined. Different tab — could just as easily be her laptop in
> another timezone: `subscribeToThread()`, the runtime is the pipe, any number of
> clients ride the same live stream. There is no 'can someone catch me up' in this
> incident. **The thread IS the catch-up.**"

(If you can put the two windows side by side and let the room watch both streams move
in lockstep, do that instead of narrating it.)

### Resolution — the rollback

It should land on the rollback on its own; if it hesitates, steer it — out loud:
> "Evidence is clear — roll back now. …It hesitated, I steered. That's not a bug in
> the demo. That *is* the demo."

When the rollback + recovery numbers hit the screen:
> "Root cause: last night's 'refactor' took the connection pool from 100 to 20.
> Someone approved that PR at 5 PM on a Friday. We don't talk about it. —
> p99 falling, pool waiters at zero, and the postmortem is about to write itself.
> I never opened a dashboard."

## The moral (slides 5–7, ~2 min — go to the thesis FAST)

**Slide 5 — thesis, ~30s after the rollback, said slowly:**
> "A production agent isn't a function call. **It's a process you talk to.**"

**Slide 6 — the steal-sheet ("everything you just watched"):**
> "Five of the six verbs, one addressable thread. Wake, deliver, queue, persist —
> those are routing behaviors; the runtime decides, you just talk. The Signals wiring
> in this demo is about 200 lines. It runs on `mastra dev` on my laptop tonight;
> multi-instance is the same code plus Redis pub/sub."

CopilotKit handoff (they demo next — friendly, one line):
> "And this console is deliberately bare — keystrokes and a raw stream — because
> tonight the runtime is the star. If you want this steering UX living inside your
> actual product's UI: don't move, that's the next demo."

**Slide 7 — go build + fireside bridge:**
> "Signals are experimental, and the person who decides what they become is ten feet
> away. Steal this repo, break it tonight, and tell Sam what's missing over pizza.
> Everyone who had a hand up at the start — the demo was for you. The fireside at 6:10
> is where we ask the two people building this stuff why shipping agents is still this
> hard. That gap — between the demo that gets applause and the process that survives
> 2:47 AM — is exactly what I'm going to push Sam and Atai on. Stick around."

Leave the final slide (repo link) up through the fireside.

## Fireside ammo (you moderate at 6:10 — pre-loaded callbacks)

- Open with: "An hour ago I claimed a production agent is a process you talk to.
  Sam — defend or destroy that."
- "Batch job with good marketing" — reuse when someone describes a brittle agent.
- "Production is rude" — reuse when the conversation hits reliability.

## Spares (use if energy dips or things go sideways)

- Tool chip spinning long: *(deadpan)* "We even simulated the observability latency.
  Authenticity."
- Alert lands after the run finished: "Idle thread? It just woke up. Same verb.
  Nobody schedules their incidents for your demo."
- Total restart (press `0`, `1`): keep talking; a full run is ~90 seconds — narrate
  the incident shape from memory, you know exactly what it will find.
