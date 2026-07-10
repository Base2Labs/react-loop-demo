import type OpenAI from "openai";
import type { DashboardSpec } from "shared";

/**
 * Each browser gets its own in-memory session, keyed by a session id (see the
 * `sid` cookie middleware in index.ts). The API is stateless — we resend the
 * full conversation history each request — so a session is just that history
 * plus the dashboard spec the tools mutate. `pendingAsk` bridges ask_user
 * across turns: when set, the next user input is delivered as that tool
 * call's result. Sessions live only in memory and don't survive a restart.
 */
export interface Session {
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  spec: DashboardSpec;
  pendingAsk: { toolCallId: string } | null;
}

function createSession(): Session {
  return { messages: [], spec: { sections: [] }, pendingAsk: null };
}

const sessions = new Map<string, Session>();

export function getSession(id: string): Session {
  let session = sessions.get(id);
  if (!session) {
    session = createSession();
    sessions.set(id, session);
  }
  return session;
}

export function resetSession(id: string): Session {
  const session = createSession();
  sessions.set(id, session);
  return session;
}
