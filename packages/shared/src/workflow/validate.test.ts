
import { describe, expect, it } from "vitest";
import { validWorkflow } from "./fixtures/valid-workflow.js";
import { validateWorkflow } from "./validate.js";

describe("validateWorkflow", () => {
  it("reports duplicate node IDs", () => {
    const duplicateNodeWorkflow = {
      ...validWorkflow,
      nodes: [
        ...validWorkflow.nodes,
        { ...validWorkflow.nodes[0] },
      ],
    };

    const issues = validateWorkflow(duplicateNodeWorkflow);

    expect(issues).toContainEqual(
      expect.objectContaining({
        code: "DUPLICATE_NODE_ID",
        severity: "error",
        nodeId: "trigger_1",
      }),
    );
  });

  it("reports duplicate edge IDs", () => {
    const duplicateEdgeWorkflow = {
      ...validWorkflow,
      edges: [
        ...validWorkflow.edges,
        { ...validWorkflow.edges[0] },
      ],
    };

    const issues = validateWorkflow(duplicateEdgeWorkflow);

    expect(issues).toContainEqual(
      expect.objectContaining({
        code: "DUPLICATE_EDGE_ID",
        severity: "error",
        edgeId: "e1",
      }),
    );
  });

  it("reports edges pointing to missing nodes", () => {
    const missingNodeWorkflow = {
      ...validWorkflow,
      edges: [
        {
          ...validWorkflow.edges[0],
          id: "e_missing",
          target: {
            ...validWorkflow.edges[0].target,
            nodeId: "non_existent_node",
          },
        },
      ],
    };

    const issues = validateWorkflow(missingNodeWorkflow);

    expect(issues).toContainEqual(
      expect.objectContaining({
        code: "EDGE_NODE_MISSING",
        severity: "error",
        edgeId: "e_missing",
      }),
    );
  });

  
  it("reports a cycle between two nodes", () => {
    const cyclicWorkflow = {
      ...validWorkflow,
      edges: [
        {
          id: "e1",
          source: { nodeId: "trigger_1", port: "main" },
          target: { nodeId: "http_1", port: "main" },
        },
        {
          id: "e2",
          source: { nodeId: "http_1", port: "main" },
          target: { nodeId: "trigger_1", port: "main" },
        },
      ],
    };

    const issues = validateWorkflow(cyclicWorkflow);

    expect(issues).toContainEqual(
      expect.objectContaining({
        code: "CYCLE_DETECTED",
        severity: "error",
      }),
    );
  });

  it("reports a self-loop", () => {
    const selfLoopWorkflow = {
      ...validWorkflow,
      edges: [
        {
          id: "e_self",
          source: { nodeId: "trigger_1", port: "main" },
          target: { nodeId: "trigger_1", port: "main" },
        },
      ],
    };

    const issues = validateWorkflow(selfLoopWorkflow);

    expect(issues).toContainEqual(
      expect.objectContaining({
        code: "SELF_LOOP",
        severity: "error",
        edgeId: "e_self",
      }),
    );
  });

});
