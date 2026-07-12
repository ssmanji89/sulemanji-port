import { describe, expect, it } from "vitest";
import { canTransition } from "../src/domain/state-machine";

describe("case transitions", () => {
  it("allows intake_received to normal_queue", () => {
    expect(canTransition("intake_received", "normal_queue")).toBe(true);
  });

  it("rejects normal_queue to session_confirmed", () => {
    expect(canTransition("normal_queue", "session_confirmed")).toBe(false);
  });
});
