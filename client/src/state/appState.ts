import type { DashboardSpec, LoopEvent } from "shared";

/** What the chat strip is currently showing. */
export interface ChatNotice {
  kind: "summary" | "question" | "error";
  text: string;
  options?: string[];
}

export interface AppState {
  spec: DashboardSpec;
  /** Full event log — the debug panel renders this verbatim. */
  events: LoopEvent[];
  notice: ChatNotice | null;
  running: boolean;
  /** Tool currently executing, for the activity indicator. */
  currentTool: string | null;
  /** True while the agent waits on an ask_user answer. */
  awaitingAnswer: boolean;
}

export type AppAction =
  | { type: "turn_start" }
  | { type: "loop_event"; event: LoopEvent }
  | { type: "turn_end" }
  | { type: "reset" };

export const initialState: AppState = {
  spec: { sections: [] },
  events: [],
  notice: null,
  running: false,
  currentTool: null,
  awaitingAnswer: false,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "turn_start":
      return { ...state, running: true, currentTool: null, notice: null, awaitingAnswer: false };
    case "turn_end":
      return { ...state, running: false, currentTool: null };
    case "reset":
      return { ...initialState, spec: { sections: [] } };
    case "loop_event":
      return applyEvent(state, action.event);
  }
}

function applyEvent(state: AppState, event: LoopEvent): AppState {
  const next = { ...state, events: [...state.events, event] };
  switch (event.type) {
    case "tool_call":
      return { ...next, currentTool: event.name };
    case "spec_updated":
      return { ...next, spec: event.spec };
    case "clarification_needed":
      return {
        ...next,
        notice: { kind: "question", text: event.question, options: event.options },
        awaitingAnswer: true,
      };
    case "assistant_message":
      return { ...next, notice: { kind: "summary", text: event.text } };
    case "error":
      return { ...next, notice: { kind: "error", text: event.message } };
    default:
      return next;
  }
}
