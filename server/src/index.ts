import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import type OpenAI from "openai";
import { createLlmClient, CURATED_MODELS, DEFAULT_MODEL } from "./llm/openrouter";
import { getSession, resetSession } from "./state/session";
import { runAgentTurn } from "./agent/loop";

const PORT = Number(process.env.PORT) || 3001;

const app = express();
app.use(express.json());

// Gates everything except the k8s health probe, which sends no credentials.
// Only active when BASIC_AUTH_USER/PASS are set, so local dev is unaffected.
const authUser = process.env.BASIC_AUTH_USER;
const authPass = process.env.BASIC_AUTH_PASS;
if (authUser && authPass) {
  app.use((req, res, next) => {
    if (req.path === "/api/health") return next();
    const [, encoded] = (req.headers.authorization ?? "").split(" ");
    const [user, pass] = Buffer.from(encoded ?? "", "base64").toString().split(":");
    if (user === authUser && pass === authPass) return next();
    res.set("WWW-Authenticate", 'Basic realm="react-loop-demo"');
    res.status(401).send("Authentication required");
  });
}

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

// Debug panel's "raw history" tab: the exact messages array sent to the API.
app.get("/api/history", (_req, res) => {
  const { messages, pendingAsk } = getSession();
  res.json({ messages, pendingAsk });
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

// Serves the built client in production; local dev uses the Vite dev server instead.
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../client/dist");
app.use(express.static(clientDist));
app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(clientDist, "index.html")));

app.listen(PORT, () => {
  console.log(`server listening on http://localhost:${PORT}`);
});
