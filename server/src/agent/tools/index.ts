import { z } from "zod";
import type OpenAI from "openai";
import type { AnyToolDefinition, ToolContext } from "./types";
import { ToolError } from "./types";
import { getDataCatalog } from "./catalog";
import { removeSection, reorderSections, upsertSection } from "./sections";
import { setBalanceWidget, setChartWidget, setTransactionsWidget } from "./widgets";
import { askUser } from "./askUser";

export { ASK_USER } from "./askUser";
export type { ToolContext } from "./types";

/** The agent's full vocabulary. Adding a tool = adding a file + one entry here. */
const TOOLS: AnyToolDefinition[] = [
  getDataCatalog,
  upsertSection,
  removeSection,
  reorderSections,
  setBalanceWidget,
  setTransactionsWidget,
  setChartWidget,
  askUser,
];

/** Tool definitions in the wire format the chat-completions API expects. */
export const openAiTools: OpenAI.Chat.Completions.ChatCompletionTool[] = TOOLS.map(
  (tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: z.toJSONSchema(tool.schema) as Record<string, unknown>,
    },
  }),
);

export interface ToolOutcome {
  result: string;
  isError: boolean;
}

/**
 * Validate and run one tool call. Schema violations and semantic failures
 * (ToolError) come back as error results — observations the model can react
 * to — never as exceptions.
 */
export function executeTool(
  name: string,
  args: unknown,
  ctx: ToolContext,
): ToolOutcome {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) {
    return { result: `Unknown tool "${name}".`, isError: true };
  }
  const parsed = tool.schema.safeParse(args);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    return { result: `Invalid arguments for ${name}: ${issues}`, isError: true };
  }
  try {
    return { result: tool.execute(parsed.data, ctx), isError: false };
  } catch (err) {
    if (err instanceof ToolError) {
      return { result: err.message, isError: true };
    }
    throw err;
  }
}
