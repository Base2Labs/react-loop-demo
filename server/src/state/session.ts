import type OpenAI from "openai";
import type { DashboardSpec } from "shared";

/**
 * The demo runs one shared in-memory session: the full conversation history
 * (the API is stateless — we resend it each request) plus the dashboard spec
 * the tools mutate. `pendingAsk` bridges ask_user across turns: when set, the
 * next user input is delivered as that tool call's result.
 */
export interface Session {
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  spec: DashboardSpec;
  pendingAsk: { toolCallId: string } | null;
}

function createSession(): Session {
  return { messages: [], spec: { sections: [] }, pendingAsk: null };
}

let session = createSession();

export const getSession = (): Session => session;

export function resetSession(): Session {
  session = createSession();
  return session;
}
