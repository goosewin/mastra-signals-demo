/**
 * Moderation and back-pressure for many clients sharing one agent run.
 * Nothing here is Mastra-specific.
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
  /** When false, steers are collected but never delivered. */
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

/** Next steer to deliver, or null if gated or rate-limited. */
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

export function resetRoom() {
  room.queue.length = 0;
  room.delivered.length = 0;
  room.received = 0;
  room.dropped = 0;
  room.floodgatesOpen = false;
  room.lastDeliveredAt = 0;
  lastSteerByHandle.clear();
}
