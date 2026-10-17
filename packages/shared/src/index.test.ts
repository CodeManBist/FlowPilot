import { describe, expect, it } from "vitest";
import { FLOWPILOT_NAME, getHealthStatus } from "./index.js";

describe("FlowPilot shared package", () => {
  it("exports the correct application name", () => {
    expect(FLOWPILOT_NAME).toBe("FlowPilot");
  });

  it("returns the expected health status", () => {
    expect(getHealthStatus()).toEqual({
      status: "ok",
      service: "FlowPilot",
    });
  });
});
