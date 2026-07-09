import "dotenv/config";
import express from "express";
import type OpenAI from "openai";
import { createLlmClient, CURATED_MODELS, DEFAULT_MODEL } from "./llm/openrouter";
import { getSession, resetSession } from "./state/session";
import { runAgentTurn } from "./agent/loop";

const PORT = 3001;

const app = express();
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/models", (_req, res) => {
  res.json({ models: CURATED_MODELS, defaultModel: DEFAULT_MODEL });
});

app.post("/api/reset", (_req, res) => {
  resetSession();
  res.json({ ok: true });
});

// The LLM client is created on first use so a missing API key surfaces as a
// readable error event in the stream, not a crash at server start.
let llmClient: OpenAI | null = null;

// Single in-memory session ⇒ one agent turn at a time.
let turnInProgress = false;

app.post("/api/chat", async (req, res) => {
  const { prompt, model } = req.body as { prompt?: string; model?: string };
  if (!prompt?.trim()) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }
  if (turnInProgress) {
    res.status(409).json({ error: "a turn is already running" });
    return;
  }

  turnInProgress = true;
  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Cache-Control", "no-cache");
  const emit = (event: unknown) => res.write(`${JSON.stringify(event)}\n`);

  try {
    llmClient ??= createLlmClient();
    const turn = runAgentTurn(llmClient, getSession(), prompt, model ?? DEFAULT_MODEL);
    for await (const event of turn) {
      emit(event);
    }
  } catch (err) {
    emit({ type: "error", message: (err as Error).message });
  } finally {
    turnInProgress = false;
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`server listening on http://localhost:${PORT}`);
});
