import { describe, expect, it } from "vitest";
import { ERROR_CODES } from "../../shared/protocol";
import { errorText, vi } from "./strings-vi";

describe("strings-vi", () => {
  it("has a Vietnamese message for every protocol error code", () => {
    for (const code of ERROR_CODES) expect(vi.errors[code]).toBeTruthy();
  });

  it("falls back for an unknown code", () => {
    expect(errorText("WHATEVER")).toBe(vi.errors.BAD_PAYLOAD);
  });
});
