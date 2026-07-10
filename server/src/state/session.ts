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

/** Idle sessions are swept so an unbounded stream of session ids (e.g. a
 * health-checker that doesn't keep cookies) can't grow this map forever. */
const IDLE_TTL_MS = 30 * 60 * 1000;
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

interface Entry {
  session: Session;
  lastSeen: number;
}

const sessions = new Map<string, Entry>();

export function getSession(id: string): Session {
  let entry = sessions.get(id);
  if (!entry) {
    entry = { session: createSession(), lastSeen: Date.now() };
    sessions.set(id, entry);
  } else {
    entry.lastSeen = Date.now();
  }
  return entry.session;
}

export function resetSession(id: string): Session {
  const session = createSession();
  sessions.set(id, { session, lastSeen: Date.now() });
  return session;
}

function sweepIdleSessions(): void {
  const cutoff = Date.now() - IDLE_TTL_MS;
  for (const [id, entry] of sessions) {
    if (entry.lastSeen < cutoff) sessions.delete(id);
  }
}

const sweepTimer = setInterval(sweepIdleSessions, SWEEP_INTERVAL_MS);
sweepTimer.unref();
