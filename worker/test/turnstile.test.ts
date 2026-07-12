import { afterEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../src/env";
import { verifyTurnstile } from "../src/security/turnstile";

const env = {
  TURNSTILE_SECRET: "secret",
} as Env;

describe("verifyTurnstile", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fails closed when the verification request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network failed");
      }),
    );

    await expect(verifyTurnstile(env, "token")).resolves.toBe(false);
  });

  it("fails closed when the verification response is not valid JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("not-json", { status: 200 })),
    );

    await expect(verifyTurnstile(env, "token")).resolves.toBe(false);
  });
});
