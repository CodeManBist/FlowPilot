export const validWorkflow = {
  schemaVersion: 1,
  name: "Simple workflow",
  settings: {
    maxConcurrency: 4,
    executionTimeoutMs: 300000,
  },
  nodes: [
    {
      id: "trigger_1",
      type: "trigger.manual",
      typeVersion: 1,
      name: "Start",
      position: { x: 0, y: 120 },
      config: {},
      policy: {},
    },
    {
      id: "http_1",
      type: "http.request",
      typeVersion: 1,
      name: "Fetch article",
      position: { x: 260, y: 120 },
      config: {},
      policy: {},
    },
  ],
  edges: [
    {
      id: "e1",
      source: { nodeId: "trigger_1", port: "main" },
      target: { nodeId: "http_1", port: "main" },
    },
  ],
};
