import { describe, expect, it } from "vitest";
import { measureOffset } from "./time-sync";

describe("measureOffset", () => {
  it("keeps the offset of the fastest round trip", async () => {
    let t = 1000;
    const rtts = [300, 40, 200];
    const serverAhead = 5000;
    let call = 0;
    const ping = async (sent: number) => {
      const rtt = rtts[call++] as number;
      // A slow trip has an asymmetric delay that would skew the estimate.
      const serverTime = sent + serverAhead + (rtt === 40 ? 20 : rtt - 10);
      t += rtt;
      return { serverTime };
    };
    const offset = await measureOffset(ping, () => t);
    expect(offset).toBe(serverAhead);
    expect(call).toBe(3);
  });
});
