import type { LoopEvent } from "shared";

/** POST the prompt and yield LoopEvents as NDJSON lines arrive. */
export async function* streamChat(
  prompt: string,
  model: string,
): AsyncGenerator<LoopEvent> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, model }),
  });
  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `chat request failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newline;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) yield JSON.parse(line) as LoopEvent;
    }
  }
  if (buffer.trim()) yield JSON.parse(buffer) as LoopEvent;
}
