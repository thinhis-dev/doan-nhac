import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "./app";

describe("createApp", () => {
  let close: (() => Promise<void>) | undefined;
  afterEach(async () => {
    await close?.();
  });

  it("answers /healthz with ok", async () => {
    const { app } = await createApp({ clientDir: "/nonexistent" });
    close = () => app.close();
    const res = await app.inject({ method: "GET", url: "/healthz" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe("ok");
  });
});
