import type { LoopEvent } from "shared";

export interface ToolCallView {
  id: string;
  name: string;
  input: unknown;
  /** Null while executing — or forever, for ask_user (the user is the result). */
  result: string | null;
  isError: boolean;
}

export interface IterationView {
  iteration: number;
  model: string;
  reasoning: string | null;
  toolCalls: ToolCallView[];
  usage: { promptTokens: number; completionTokens: number; finishReason: string } | null;
}

export type TurnOutcome =
  | { kind: "summary"; text: string }
  | { kind: "question"; text: string }
  | { kind: "error"; text: string };

export interface TurnView {
  iterations: IterationView[];
  outcome: TurnOutcome | null;
}

/**
 * Fold the flat LoopEvent log into turns → iterations for the debug panel.
 * Iteration numbering restarts at 1 on every /api/chat call, so a
 * `request_start` with iteration 1 begins a new turn (an ask_user resume
 * therefore shows as its own turn — which mirrors what the API saw).
 */
export function groupEvents(events: LoopEvent[]): TurnView[] {
  const turns: TurnView[] = [];
  let turn: TurnView | null = null;
  let iter: IterationView | null = null;

  const ensureTurn = (): TurnView => {
    if (!turn) {
      turn = { iterations: [], outcome: null };
      turns.push(turn);
    }
    return turn;
  };

  for (const event of events) {
    switch (event.type) {
      case "request_start":
        if (event.iteration === 1) turn = null;
        iter = {
          iteration: event.iteration,
          model: event.model,
          reasoning: null,
          toolCalls: [],
          usage: null,
        };
        ensureTurn().iterations.push(iter);
        break;
      case "reasoning":
        if (iter) iter.reasoning = (iter.reasoning ?? "") + event.text;
        break;
      case "tool_call":
        iter?.toolCalls.push({
          id: event.id,
          name: event.name,
          input: event.input,
          result: null,
          isError: false,
        });
        break;
      case "tool_result": {
        const call = iter?.toolCalls.find((c) => c.id === event.toolCallId);
        if (call) {
          call.result = event.result;
          call.isError = event.isError;
        }
        break;
      }
      case "usage":
        if (iter) {
          iter.usage = {
            promptTokens: event.promptTokens,
            completionTokens: event.completionTokens,
            finishReason: event.finishReason,
          };
        }
        break;
      case "assistant_message":
        ensureTurn().outcome = { kind: "summary", text: event.text };
        break;
      case "clarification_needed":
        ensureTurn().outcome = { kind: "question", text: event.question };
        break;
      case "error":
        ensureTurn().outcome = { kind: "error", text: event.message };
        break;
      case "spec_updated":
        break; // dashboard state — the Spec tab shows the latest snapshot
    }
  }
  return turns;
}
