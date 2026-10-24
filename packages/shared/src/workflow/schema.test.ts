import { describe, it, expect } from "vitest";
import { WorkflowDefinitionSchema } from "./schema.js";
import { validWorkflow } from "./fixtures/valid-workflow.js";

describe("WorkflowDefinitionSchema", () => {
  it("accepts a valid workflow", () => {
    const result = WorkflowDefinitionSchema.safeParse(validWorkflow);

    expect(result.success).toBe(true);
  });

  it("rejects a workflow with a missing schemaVersion", () => {
    const { schemaVersion: _schemaVersion, ...workflow } = validWorkflow;

    const result = WorkflowDefinitionSchema.safeParse(workflow);

    expect(result.success).toBe(false);
  });

  it("rejects an unsupported schemaVersion", () => {
    const workflow = {
      ...validWorkflow,
      schemaVersion: 2,
    };

    const result = WorkflowDefinitionSchema.safeParse(workflow);

    expect(result.success).toBe(false);
  });

  it("rejects an incorrect maxConcurrency type", () => {
    const workflow = {
      ...validWorkflow,
      settings: {
        ...validWorkflow.settings,
        maxConcurrency: "four",
      },
    };

    const result = WorkflowDefinitionSchema.safeParse(workflow);

    expect(result.success).toBe(false);
  });

  it("rejects an incorrect executionTimeoutMs type", () => {
    const workflow = {
      ...validWorkflow,
      settings: {
        ...validWorkflow.settings,
        executionTimeoutMs: "300000",
      },
    };

    const result = WorkflowDefinitionSchema.safeParse(workflow);

    expect(result.success).toBe(false);
  });

  it("rejects a node with a missing id", () => {
    const { id: _id, ...node } = validWorkflow.nodes[0];

    const workflow = {
      ...validWorkflow,
      nodes: [node, ...validWorkflow.nodes.slice(1)],
    };

    const result = WorkflowDefinitionSchema.safeParse(workflow);

    expect(result.success).toBe(false);
  });

  it("rejects a node with an incorrect position type", () => {
    const workflow = {
      ...validWorkflow,
      nodes: [
        {
          ...validWorkflow.nodes[0],
          position: {
            x: "zero",
            y: 120,
          },
        },
        ...validWorkflow.nodes.slice(1),
      ],
    };

    const result = WorkflowDefinitionSchema.safeParse(workflow);

    expect(result.success).toBe(false);
  });

  it("rejects an edge with a missing source nodeId", () => {
    const { nodeId: _nodeId, ...source } = validWorkflow.edges[0].source;

    const workflow = {
      ...validWorkflow,
      edges: [
        {
          ...validWorkflow.edges[0],
          source,
        },
      ],
    };

    const result = WorkflowDefinitionSchema.safeParse(workflow);

    expect(result.success).toBe(false);
  });

  it("rejects an edge with a missing target port", () => {
    const { port: _port, ...target } = validWorkflow.edges[0].target;

    const workflow = {
      ...validWorkflow,
      edges: [
        {
          ...validWorkflow.edges[0],
          target,
        },
      ],
    };

    const result = WorkflowDefinitionSchema.safeParse(workflow);

    expect(result.success).toBe(false);
  });

  it("rejects unknown top-level keys", () => {
    const workflow = {
      ...validWorkflow,
      unexpectedField: true,
    };

    const result = WorkflowDefinitionSchema.safeParse(workflow);

    expect(result.success).toBe(false);
  });
});
