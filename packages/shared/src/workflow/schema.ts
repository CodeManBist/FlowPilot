
import { z } from "zod";

const WorkflowSettingsSchema = z
  .object({
    maxConcurrency: z.number().int().positive(),
    executionTimeoutMs: z.number().int().positive(),
  })
  .strict();

const NodePositionSchema = z
  .object({
    x: z.number(),
    y: z.number(),
  })
  .strict();

const WorkflowNodeSchema = z
  .object({
    id: z.string().min(1),
    type: z.string().min(1),
    typeVersion: z.number().int().positive(),
    name: z.string().min(1),
    position: NodePositionSchema,
    config: z.record(z.string(), z.unknown()),
    policy: z.record(z.string(), z.unknown()),
  })
  .strict();

const WorkflowEdgeEndpointSchema = z
  .object({
    nodeId: z.string().min(1),
    port: z.string().min(1),
  })
  .strict();

const WorkflowEdgeSchema = z
  .object({
    id: z.string().min(1),
    source: WorkflowEdgeEndpointSchema,
    target: WorkflowEdgeEndpointSchema,
  })
  .strict();

export const WorkflowDefinitionSchema = z
  .object({
    schemaVersion: z.literal(1),
    name: z.string().min(1),
    settings: WorkflowSettingsSchema,
    nodes: z.array(WorkflowNodeSchema),
    edges: z.array(WorkflowEdgeSchema),
  })
  .strict();

export type WorkflowDefinition = z.infer<
  typeof WorkflowDefinitionSchema
>;

export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;

export type WorkflowEdge = z.infer<typeof WorkflowEdgeSchema>;
