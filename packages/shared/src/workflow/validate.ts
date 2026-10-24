import type { ValidationIssue } from "./validation-types.js";
import { WorkflowDefinitionSchema } from "./schema.js";
import type { NodeRegistry } from "./node-registry.js";

interface DfsFrame {
  nodeId: string;
  nextNeighborIndex: number;
}

type DfsState = 0 | 1 | 2;

export function validateWorkflow(
  input: unknown,
  registry: NodeRegistry,
): ValidationIssue[] {
  const result = WorkflowDefinitionSchema.safeParse(input);

  // Return schema errors before running graph checks.
  if (!result.success) {
    return result.error.issues.map((issue) => ({
      code: "SCHEMA_INVALID",
      severity: "error",
      message: issue.message,
      path: issue.path.join("."),
    }));
  }

  const definition = result.data;
  const issues: ValidationIssue[] = [];

  // Check whether node types and versions are supported.
  for (const node of definition.nodes) {
    if (!registry.supports(node.type, node.typeVersion)) {
      issues.push({
        code: "NODE_TYPE_UNSUPPORTED",
        severity: "error",
        message: `Unsupported node type or version: ${node.type}@${node.typeVersion}`,
        nodeId: node.id,
      });
    }
  }

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
        message: `Edge ${edge.id} connects a node to itself`,
        nodeId: edge.source.nodeId,
        edgeId: edge.id,
      });
    }
  }

  // Build the graph for cycle detection.
  const indegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const node of definition.nodes) {
    if (!indegree.has(node.id)) {
      indegree.set(node.id, 0);
      adjacency.set(node.id, []);
    }
  }

  // Ignore invalid endpoints and self-loops already reported above.
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

  // Kahn's algorithm: start with nodes that have no incoming edges.
  const queue: string[] = [];

  for (const [nodeId, count] of indegree) {
    if (count === 0) {
      queue.push(nodeId);
    }
  }

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

  // If Kahn's algorithm cannot process every unique node,
  // search the remaining graph for an ordered cycle path.
  if (processedCount < indegree.size) {
    const state = new Map<string, DfsState>();

    for (const nodeId of indegree.keys()) {
      state.set(nodeId, 0);
    }

    let cyclePath: string[] | undefined;

    // Only explore nodes left with positive indegree.
    for (const [startNodeId, remainingIndegree] of indegree) {
      if (remainingIndegree === 0 || state.get(startNodeId) !== 0) {
        continue;
      }

      const stack: DfsFrame[] = [{ nodeId: startNodeId, nextNeighborIndex: 0 }];
      const activePath: string[] = [startNodeId];
      const activePathIndex = new Map<string, number>([[startNodeId, 0]]);

      state.set(startNodeId, 1);

      while (stack.length > 0 && !cyclePath) {
        const frame = stack[stack.length - 1]!;
        const neighbors = adjacency.get(frame.nodeId)!;

        if (frame.nextNeighborIndex >= neighbors.length) {
          state.set(frame.nodeId, 2);
          activePathIndex.delete(frame.nodeId);
          activePath.pop();
          stack.pop();
          continue;
        }

        const neighborId = neighbors[frame.nextNeighborIndex]!;
        frame.nextNeighborIndex++;

        // Ignore nodes Kahn's algorithm already removed.
        if (indegree.get(neighborId) === 0) {
          continue;
        }

        const neighborState = state.get(neighborId)!;

        if (neighborState === 0) {
          state.set(neighborId, 1);
          activePathIndex.set(neighborId, activePath.length);
          activePath.push(neighborId);

          stack.push({
            nodeId: neighborId,
            nextNeighborIndex: 0,
          });
        } else if (neighborState === 1) {
          const cycleStartIndex = activePathIndex.get(neighborId)!;
          cyclePath = [...activePath.slice(cycleStartIndex), neighborId];
        }
      }

      if (cyclePath) {
        break;
      }
    }

    const cycleNodeIds = cyclePath ?? [
      ...[...indegree.entries()]
        .filter(([, count]) => count > 0)
        .map(([nodeId]) => nodeId),
    ];

    issues.push({
      code: "CYCLE_DETECTED",
      severity: "error",
      message: `Cycle detected: ${cycleNodeIds.join(" -> ")}`,
    });
  }

  return issues;
}
