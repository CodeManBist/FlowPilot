import type { ValidationIssue } from "./validation-types.js";

interface WorkflowNode {
  id: string;
}

interface WorkflowEdge {
  id: string;
  source: { nodeId: string; port: string };
  target: { nodeId: string; port: string };
}

interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export function validateWorkflow(
  definition: WorkflowDefinition,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check for duplicate node IDs.
  const seenNodeIds = new Set<string>();

  for (const node of definition.nodes) {
    if (seenNodeIds.has(node.id)) {
      issues.push({
        code: "DUPLICATE_NODE_ID",
        severity: "error",
        message: `Duplicate node ID: ${node.id}`,
        nodeId: node.id,
      });
    } else {
      seenNodeIds.add(node.id);
    }
  }

  // Collect node IDs that exist in this workflow.
  const nodeIds = new Set(definition.nodes.map((node) => node.id));

  // Check for duplicate edge IDs.
  const seenEdgeIds = new Set<string>();

  for (const edge of definition.edges) {
    if (seenEdgeIds.has(edge.id)) {
      issues.push({
        code: "DUPLICATE_EDGE_ID",
        severity: "error",
        message: `Duplicate edge ID: ${edge.id}`,
        edgeId: edge.id,
      });
    } else {
      seenEdgeIds.add(edge.id);
    }
  }

  // Check whether each edge references existing nodes.
  for (const edge of definition.edges) {
    if (!nodeIds.has(edge.source.nodeId) || !nodeIds.has(edge.target.nodeId)) {
      issues.push({
        code: "EDGE_NODE_MISSING",
        severity: "error",
        message: `Edge ${edge.id} references a node that does not exist`,
        edgeId: edge.id,
      });
    }
  }

  // Check for self-loops.
  for (const edge of definition.edges) {
    if (edge.source.nodeId === edge.target.nodeId) {
      issues.push({
        code: "SELF_LOOP",
        severity: "error",
        message: `Edge ${edge.id} connects a node to  itself`,
        nodeId: edge.source.nodeId,
        edgeId: edge.id,
      });
    }
  }

  // Detect cycles using Kahn's algorithm.
  const indegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const node of definition.nodes) {
    indegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }

  // Build the graph, ignoring edges whose endpoints do   not exist
  // and self-loops already reported above.
  for (const edge of definition.edges) {
    const sourceId = edge.source.nodeId;
    const targetId = edge.target.nodeId;

    if (
      !indegree.has(sourceId) ||
      !indegree.has(targetId) ||
      sourceId === targetId
    ) {
      continue;
    }

    adjacency.get(sourceId)!.push(targetId);
    indegree.set(targetId, indegree.get(targetId)! + 1);
  }

  // Start with all nodes that have no incoming edges.
  const queue: string[] = [];

  for (const [nodeId, count] of indegree) {
    if (count === 0) {
      queue.push(nodeId);
    }
  }

  // Remove nodes and update their neighbors' indegrees.
  let processedCount = 0;
  let queueIndex = 0;

  while (queueIndex < queue.length) {
    const nodeId = queue[queueIndex++]!;
    processedCount++;

    for (const neighborId of adjacency.get(nodeId)!) {
      const newIndegree = indegree.get(neighborId)! - 1;
      indegree.set(neighborId, newIndegree);

      if (newIndegree === 0) {
        queue.push(neighborId);
      }
    }
  }

  // If some nodes could not be   processed, a cycle exists.
  if (processedCount < definition.nodes.length) {
    const cycleNodeIds = [...indegree.entries()]
      .filter(([, count]) => count > 0)
      .map(([nodeId]) => nodeId);

    issues.push({
      code: "CYCLE_DETECTED",
      severity: "error",
      message: `Cycle detected  involving nodes: $ {cycleNodeIds.join(", ")}`,
    });
  }

  return issues;
}
