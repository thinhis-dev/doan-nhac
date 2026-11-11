export type Ping = (clientTime: number) => Promise<{ serverTime: number }>;

const PING_COUNT = 3;

let offsetMs = 0;

/**
 * Estimates serverTime - clientTime. Sends three pings and keeps the offset
 * from the fastest round trip.
 */
export async function measureOffset(ping: Ping, now: () => number = Date.now): Promise<number> {
  let best: { rtt: number; offset: number } | undefined;
  for (let i = 0; i < PING_COUNT; i++) {
    const sent = now();
    const { serverTime } = await ping(sent);
    const received = now();
    const rtt = received - sent;
    const offset = serverTime - (sent + rtt / 2);
    if (!best || rtt < best.rtt) best = { rtt, offset };
  }
  return best?.offset ?? 0;
}

export async function syncClock(ping: Ping): Promise<number> {
  offsetMs = await measureOffset(ping);
  return offsetMs;
}

/** The current time on the server clock, in epoch ms. */
export function serverNow(): number {
  return Date.now() + offsetMs;
}
