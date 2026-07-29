# "Stop killing your agents" — the stage narrative

Agent (After) Hour · Motoring Coffee, San Francisco · 29 July 2026
20-minute slot. Doors 6:00, talks 6:30. Mastra + MongoDB co-hosted; CopilotKit demos last.

The demo is not a feature tour. The room becomes the second client on a live agent run —
they file real bugs from their phones, steer the agent mid-flight, and vote on whether it
ships. The thesis lands the moment a stranger's sentence changes what the agent does next.

**Delivery rules (more important than any line below):**
- Talk **before** the keypress. Shut up for the first ~5 seconds of every stream — a
  spinner plus a confidently silent speaker reads as *real*. One pointed line after.
- Never verbally predict a number before it's on screen. React to the screen ("there it
  is — look at the size multipliers"), don't pre-commit.
- Cue beats off **observable state** (a tool chip spinning, the report counter moving),
  never off the clock.
- The QR goes up **early** — minute 3. People need time to scan, and the counter climbing
  is your best visual.
- One insult, three uses: **"a batch job with good marketing."** Don't coin variants.
- When the room does something you didn't plan, follow it. That's the whole point.

---

## Cold open (slide 1, ~45s)

> "Show of hands — who has hit Escape on a coding agent this week?"
> *(wait — hands go up)*
> "Keep it up if, after you killed it, you had to re-explain everything you'd already
> told it once."
> *(pause)*
> "Right. So we've all agreed to use tools where the only way to say 'not like that' is
> to kill the process and start over. Tonight I want to talk about why that's the default,
> and what it looks like when it isn't."

## The problem (slides 2–3, ~2 min — keep moving)

- "Every agent you use has exactly one input: the first message. After that it's a sealed
  box until it comes back. You can watch it. You cannot talk to it."
- "So when it goes down the wrong path forty seconds in — and you can *see* it going down
  the wrong path — your options are: wait, or kill it and pay for the context again."
- Punchline, land it clean: **"That's not an agent. That's a batch job with good
  marketing."**
- "And it's worse in production, because production is *rude*. Webhooks fire mid-run. A
  customer replies. CI goes red. Your agent finds out about none of it."
- Your options today (fast, off slide 3): kill and re-prompt, poll and cram everything
  into the first prompt, or build your own message bus. "There goes the quarter."

## Handoff to the demo (slide 4, ~45s — then switch to the wall)

> "Mastra is an open-source TypeScript agent runtime, and it shipped something called
> Signals — a way to talk to an agent that's *already running*. I could show you six API
> slides. Instead I'm going to give the entire room the keys to one."
>
> "Nothing here is staged. The bugs are real, the tests are real, and at the end there'll
> be a real pull request on GitHub with your names in it."

**Put the QR up. This is the moment.** Switch to the wall.

> "That QR is a steering console. Scan it, and you can do two things: file a bug on our
> little order page, or type directly into the agent's brain while it's thinking.
> Please, be gentle. It's on a projector."

## The demo (~9 min)

### Beat 1 — start the run (press `1`)

Before the keypress:
> "Motoring Coffee has an order page. It has bugs. People have been filing reports —
> those are sitting in MongoDB right now — and this agent's whole job is to read the
> backlog, work out which complaints are real, and fix the worst one."

Press `1`. **Silence** while the first text streams. Then, over the first tool call:
> "Hypothesis, one tool, read the result, decide. It's not psychic, it's methodical."

Use the stream gaps to teach:
> "What woke it up is `sendMessage()` — one call, addressed to a thread. If the agent had
> already been running, that same call would have been delivered *into* the loop instead.
> You don't have to know which. That's the whole API bet."

When `runChecks` comes back red — react to the screen:
> "Four failing. Those aren't fixtures, that's `node test.ts` in a real repo."

### Beat 2 — open the floodgates (press `2`)

Watch the report counter. Once it's moving:
> "Look at the Mongo counter. Every one of those is somebody in this room, right now,
> finding a bug I didn't plant."
> *(if the count is climbing fast)* "Okay, you're thorough. That's a lot of bugs."

Press `2` — audience steering goes live.
> "Now the part that doesn't exist anywhere else. You are now talking to a **running
> process**. One message from the room reaches it every seven seconds — that's back
> pressure, not a limitation, because two hundred people typing into one loop is a denial
> of service with extra steps."

**Then stop talking and let the room drive.** When the first stranger's steer lands on
screen with their handle on it — that is the moment. Let it sit. Then:
> "That sentence was typed by someone in this room, on their phone, and it landed inside
> a loop that was already running. Nothing restarted. It kept every bit of evidence it
> had already gathered."

### Beat 3 — the external event (press `3`, only if energy dips)

> "And it's not just people. This is `sendNotificationSignal()` — the same call your
> webhook handler makes. PagerDuty, GitHub, CI, a customer reply. Same payload, same
> dedupe key, straight into the running loop."

### Beat 4 — the vote

When the agent proposes the pull request, the wall takes over with the vote.
> "It wants to ship. It doesn't get to decide that — you do."
> *(let the bars move)*
> "This is `sendToolApproval()`. The run is suspended on that tool call right now. It is
> not polling, it is not burning tokens, it is *parked* — waiting on two hundred people
> to make up their minds."

When it resolves:
> "There it goes."

### Beat 5 — the artifact

> "That's a real pull request, on a real repo, open right now. The branch is real, the
> diff is real, and the commit message credits the handles of the people who reported the
> bugs. Open it on your phone — the link's on screen."

*(reload `/cafe` on the projector)*
> "And the bug you reported four minutes ago is gone."

### Beat 6 — the queued follow-up (press `4`, optional if time)

> "One more. `queueMessage()` — this doesn't interrupt anything, it waits its turn and
> fires the moment this turn finishes. Nobody got cut off."

## The moral (slides 5–7, ~3 min)

**Slide 5 — thesis, said slowly, ~30 seconds after the vote resolves:**
> "A production agent isn't a function call. **It's a process you talk to.**"

**Slide 6 — the steal-sheet ("everything you just watched"):**
> "Seven verbs, one addressable thread. Wake it, deliver into it, queue behind it, give it
> durable state, gate its tools. You don't decide which one applies — you just talk, and
> the runtime routes it. The wiring in this demo is about 250 lines of TypeScript."

Credit where it's due, genuinely — this is a co-hosted night:
> "Every bug report you filed went into MongoDB, and the agent read the backlog live out
> of the same collection you were writing to. The world changed underneath it mid-run and
> it just... kept up. That's the co-host, and that's not a coincidence — the interesting
> part of an agent is almost always the state it's reading."

CopilotKit handoff (they're up next — friendly, one line):
> "This console is deliberately ugly — a QR code and a text box — because tonight the
> runtime is the star. If you want this steering UX living inside your actual product's
> UI: don't move, that's the next demo."

**Slide 7 — go build:**
> "Signals are in beta, and the people who decide what they become are in this room.
> The repo has everything — the agent, the console, the wiring. Steal it, break it, and
> tell us what's missing over pizza."
>
> "And go look at that pull request. You wrote it."

Leave the final slide up.

## Spares (use if energy dips or things go sideways)

- **Nobody scans the QR:** "Tough crowd. Fine — I'll be the room." Steer it yourself from
  the wall. The demo is identical, just quieter. Never wait on the audience.
- **Someone steers it somewhere stupid:** follow it. "Okay, we're doing that now." An
  agent visibly obeying a bad instruction *is* the feature working. Then steer it back
  out loud: "and now I'm overruling the room, which is also a signal."
- **Two contradictory steers:** "It just got told two opposite things by two strangers and
  picked one. Same as any standup."
- **Agent finishes before you're ready:** the thread is idle, not dead. Steer it — it
  wakes. "Idle thread? Same verb. Nobody schedules their interruptions for your demo."
- **Model stalls >30s:** talk to it. "continue — you have enough evidence." Narrate it as
  the feature: "it stalled, so I talked to it instead of killing it."
- **Vote goes badly / room votes no:** the *best* outcome. "The room said no. Watch —
  it's not retrying, it's asking what to change." Let it ask, then steer it.
- **Total disaster:** press `0`, `1`, keep talking. A full run is about two minutes and
  you know exactly what it will find.
