import type { z } from "zod";
import type { DashboardSpec } from "shared";

/** Everything a tool can touch: the session's dashboard spec. */
export interface ToolContext {
  spec: DashboardSpec;
}

/**
 * A tool = JSON-schema contract (via zod) + an executor.
 * The executor mutates ctx.spec and returns a short result string — the
 * "observation" the model sees on the next loop iteration.
 */
export interface ToolDefinition<Schema extends z.ZodType = z.ZodType> {
  name: string;
  description: string;
  schema: Schema;
  execute: (input: z.infer<Schema>, ctx: ToolContext) => string;
}

/** Identity helper that preserves each tool's schema type, so `execute`
 * receives properly typed input instead of `unknown`. */
export function defineTool<Schema extends z.ZodType>(
  tool: ToolDefinition<Schema>,
): ToolDefinition<Schema> {
  return tool;
}

/** Registry entry: the schema type is erased once a tool is registered —
 * `executeTool` validates at runtime before calling `execute`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyToolDefinition = ToolDefinition<z.ZodType<any>>;

/** Semantic failures (unknown section, bad account id, …) — reported back to
 * the model as an error tool result so it can recover, never thrown further. */
export class ToolError extends Error {}
