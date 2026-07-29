/**
 * Room state: everything that keeps 250 strangers typing into one live agent loop
 * from turning into noise. Nothing here is Mastra-specific — it's the moderation and
 * back-pressure layer you'd need in front of any multi-client agent.
 */

export type Steer = { handle: string; text: string; at: number };

const PER_PERSON_COOLDOWN_MS = 25_000;
/** Global back-pressure: at most one steer is delivered into the run this often. */
export const GLOBAL_STEER_INTERVAL_MS = 7_000;
const MAX_LEN = 140;

const lastSteerByHandle = new Map<string, number>();

export const room = {
  participants: new Set<string>(),
  /** Steers accepted but not yet delivered into the run. */
  queue: [] as Steer[],
  /** Every steer we've accepted, for the wall's ticker. */
  delivered: [] as Steer[],
  received: 0,
  dropped: 0,
  /** Speaker kill switch — when false, audience steers are collected but never delivered. */
  floodgatesOpen: false,
  lastDeliveredAt: 0,
};

const BLOCKLIST =
  /\b(fuck|shit|bitch|cunt|nigg|fag|rape|kys|retard|whore|slut)\b|https?:\/\/|@[a-z0-9_]{3,}/i;

export function sanitize(raw: string) {
  return raw.replace(/\s+/g, " ").trim().slice(0, MAX_LEN);
}

export type AcceptResult =
  | { ok: true; steer: Steer }
  | { ok: false; reason: string };

export function acceptSteer(handleRaw: string, textRaw: string): AcceptResult {
  const handle = sanitize(handleRaw).slice(0, 24) || "someone";
  const text = sanitize(textRaw);

  room.received++;

  if (text.length < 3) {
    room.dropped++;
    return { ok: false, reason: "Too short — say a bit more." };
  }
  if (BLOCKLIST.test(text) || BLOCKLIST.test(handle)) {
    room.dropped++;
    return { ok: false, reason: "Let's keep it clean — this is on a projector." };
  }

  const last = lastSteerByHandle.get(handle) ?? 0;
  const wait = PER_PERSON_COOLDOWN_MS - (Date.now() - last);
  if (wait > 0) {
    room.dropped++;
    return { ok: false, reason: `Hold on ${Math.ceil(wait / 1000)}s — give others a turn.` };
  }

  lastSteerByHandle.set(handle, Date.now());
  room.participants.add(handle);

  const steer: Steer = { handle, text, at: Date.now() };
  room.queue.push(steer);
  if (room.queue.length > 60) {
    room.queue.shift();
    room.dropped++;
  }
  return { ok: true, steer };
}

/**
 * Pull the next steer to deliver, respecting global back-pressure.
 * Returns null when the floodgates are shut or we delivered one too recently.
 */
export function nextSteerToDeliver(): Steer | null {
  if (!room.floodgatesOpen) return null;
  if (Date.now() - room.lastDeliveredAt < GLOBAL_STEER_INTERVAL_MS) return null;
  const steer = room.queue.shift();
  if (!steer) return null;
  room.lastDeliveredAt = Date.now();
  room.delivered.push(steer);
  if (room.delivered.length > 40) room.delivered.shift();
  return steer;
}

/* ---------- Room vote on a pending tool approval ---------- */

export const vote = {
  open: false,
  toolCallId: undefined as string | undefined,
  toolName: "",
  summary: "",
  yes: new Set<string>(),
  no: new Set<string>(),
  resolved: null as "approved" | "declined" | null,
};

export function openVote(toolCallId: string | undefined, toolName: string, summary: string) {
  vote.open = true;
  vote.toolCallId = toolCallId;
  vote.toolName = toolName;
  vote.summary = summary;
  vote.yes.clear();
  vote.no.clear();
  vote.resolved = null;
}

export function castVote(handleRaw: string, approve: boolean) {
  const handle = sanitize(handleRaw).slice(0, 24) || "someone";
  if (!vote.open) return { ok: false, reason: "No vote is open right now." };
  room.participants.add(handle);
  (approve ? vote.yes : vote.no).add(handle);
  (approve ? vote.no : vote.yes).delete(handle);
  return { ok: true };
}

export function closeVote(resolved: "approved" | "declined") {
  vote.open = false;
  vote.resolved = resolved;
}

export function resetRoom() {
  room.queue.length = 0;
  room.delivered.length = 0;
  room.received = 0;
  room.dropped = 0;
  room.floodgatesOpen = false;
  room.lastDeliveredAt = 0;
  lastSteerByHandle.clear();
  vote.open = false;
  vote.resolved = null;
  vote.yes.clear();
  vote.no.clear();
}
