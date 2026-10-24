import { describe, expect, it } from "vitest";
import { validWorkflow } from "./fixtures/valid-workflow.js";
import { validateWorkflow } from "./validate.js";

const testRegistry = {
  supports: (type: string, typeVersion: number) =>
    (type === "trigger.manual" || type === "http.request") && typeVersion === 1,
};

describe("validateWorkflow", () => {
  it("reports duplicate node IDs", () => {
    const duplicateNodeWorkflow = {
      ...validWorkflow,
      nodes: [...validWorkflow.nodes, { ...validWorkflow.nodes[0] }],
    };

    const issues = validateWorkflow(duplicateNodeWorkflow, testRegistry);

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
      edges: [...validWorkflow.edges, { ...validWorkflow.edges[0] }],
    };

    const issues = validateWorkflow(duplicateEdgeWorkflow, testRegistry);

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

    const issues = validateWorkflow(missingNodeWorkflow, testRegistry);

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

    const issues = validateWorkflow(cyclicWorkflow, testRegistry);

    expect(issues).toContainEqual(
      expect.objectContaining({
        code: "CYCLE_DETECTED",
        severity: "error",
        message: expect.stringContaining("trigger_1 -> http_1 -> trigger_1"),
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

    const issues = validateWorkflow(selfLoopWorkflow, testRegistry);

    expect(issues).toContainEqual(
      expect.objectContaining({
        code: "SELF_LOOP",
        severity: "error",
        edgeId: "e_self",
      }),
    );
  });

  it("reports multiple independent issues in one validation pass", () => {
    const invalidWorkflow = {
      ...validWorkflow,
      nodes: [...validWorkflow.nodes, { ...validWorkflow.nodes[0] }],
      edges: [
        ...validWorkflow.edges,
        {
          id: "e1",
          source: {
            nodeId: "trigger_1",
            port: "main",
          },
          target: {
            nodeId: "missing_node",
            port: "main",
          },
        },
      ],
    };

    const issues = validateWorkflow(invalidWorkflow, testRegistry);
    const issueCodes = issues.map((issue) => issue.code);

    expect(issueCodes).toContain("DUPLICATE_NODE_ID");
    expect(issueCodes).toContain("DUPLICATE_EDGE_ID");
    expect(issueCodes).toContain("EDGE_NODE_MISSING");
  });

  it("reports malformed workflow structure", () => {
    const invalidWorkflow = {
      ...validWorkflow,
      settings: {
        ...validWorkflow.settings,
        maxConcurrency: "four",
      },
    };

    const issues = validateWorkflow(invalidWorkflow, testRegistry);

    expect(issues).toContainEqual(
      expect.objectContaining({
        code: "SCHEMA_INVALID",
        severity: "error",
      }),
    );
  });

  it("does not crash when required workflow fields are missing", () => {
    const invalidWorkflow = {
      schemaVersion: 1,
      name: "Broken workflow",
    };

    expect(() => validateWorkflow(invalidWorkflow, testRegistry)).not.toThrow();

    const issues = validateWorkflow(invalidWorkflow, testRegistry);

    expect(issues).toContainEqual(
      expect.objectContaining({
        code: "SCHEMA_INVALID",
        severity: "error",
      }),
    );
  });

  it("reports an unsupported node type", () => {
    const unsupportedWorkflow = {
      ...validWorkflow,
      nodes: validWorkflow.nodes.map((node) =>
        node.id === "http_1" ? { ...node, type: "unknown.node" } : node,
      ),
    };

    const issues = validateWorkflow(unsupportedWorkflow, testRegistry);

    expect(issues).toContainEqual(
      expect.objectContaining({
        code: "NODE_TYPE_UNSUPPORTED",
        severity: "error",
        nodeId: "http_1",
      }),
    );
  });
});
