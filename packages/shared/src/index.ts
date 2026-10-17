export const FLOWPILOT_NAME = "FlowPilot";

export function getHealthStatus() {
  return {
    status: "ok" as const,
    service: FLOWPILOT_NAME,
  };
}
