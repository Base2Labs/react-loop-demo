import type { DashboardSpec } from "./dashboard";

/**
 * LoopEvents are the NDJSON stream vocabulary between server and client.
 * The server emits one event per meaningful step of the ReAct loop; the
 * client renders the dashboard from `spec_updated` and the debug panel
 * from the full log.
 */
export type LoopEvent =
  | { type: "request_start"; iteration: number; model: string }
  | { type: "reasoning"; iteration: number; text: string }
  | {
      type: "tool_call";
      iteration: number;
      id: string;
      name: string;
      input: unknown;
    }
  | {
      type: "tool_result";
      iteration: number;
      toolCallId: string;
      result: string;
      isError: boolean;
    }
  | { type: "spec_updated"; spec: DashboardSpec }
  | { type: "clarification_needed"; question: string; options?: string[] }
  | { type: "assistant_message"; text: string }
  | {
      type: "usage";
      iteration: number;
      promptTokens: number;
      completionTokens: number;
      finishReason: string;
    }
  | { type: "error"; message: string };
