import "dotenv/config";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import type OpenAI from "openai";
import { createLlmClient, CURATED_MODELS, DEFAULT_MODEL } from "./llm/openrouter";
import { getSession, resetSession } from "./state/session";
import { runAgentTurn } from "./agent/loop";

const PORT = Number(process.env.PORT) || 3001;
const SESSION_COOKIE = "sid";
const AUTH_COOKIE = "authed";

const app = express();
app.use(express.json());

const parseCookies = (header: string | undefined) =>
  Object.fromEntries(
    (header ?? "").split(";").map((pair) => {
      const [key, ...rest] = pair.trim().split("=");
      return [key, decodeURIComponent(rest.join("="))];
    }),
  );

// Gates everything except the k8s health probe, which sends no credentials.
// Only active when BASIC_AUTH_USER/PASS are set, so local dev is unaffected.
const authUser = process.env.BASIC_AUTH_USER;
const authPass = process.env.BASIC_AUTH_PASS;
if (authUser && authPass) {
  // A page load fires several requests (document, JS bundle, on-mount API
  // calls) in parallel. If each had to pass the WWW-Authenticate challenge
  // on its own, whichever ones race ahead of the browser's credential cache
  // trigger their own native login prompt, so the user sees it twice. This
  // signed cookie lets every request after the first skip the challenge.
  const authSecret = crypto.randomBytes(32);
  const authToken = crypto.createHmac("sha256", authSecret).update(`${authUser}:${authPass}`).digest("hex");
  app.use((req, res, next) => {
    if (req.path === "/api/health") return next();
    if (parseCookies(req.headers.cookie)[AUTH_COOKIE] === authToken) return next();
    const [, encoded] = (req.headers.authorization ?? "").split(" ");
    const [user, pass] = Buffer.from(encoded ?? "", "base64").toString().split(":");
    if (user === authUser && pass === authPass) {
      res.cookie(AUTH_COOKIE, authToken, { httpOnly: true, sameSite: "lax" });
      return next();
    }
    res.set("WWW-Authenticate", 'Basic realm="react-loop-demo"');
    res.status(401).send("Authentication required");
  });
}

// Assigns each browser its own session id so concurrent users don't share
// one dashboard/conversation. Same-origin fetch sends cookies automatically,
// so the client needs no changes to participate.
declare global {
  namespace Express {
    interface Request {
      sessionId: string;
    }
  }
}
app.use((req, res, next) => {
  // Health probes don't keep cookies, so skip them — otherwise every check
  // would mint and immediately abandon a new session.
  if (req.path === "/api/health") return next();
  let sid = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  if (!sid) {
    sid = crypto.randomUUID();
    res.cookie(SESSION_COOKIE, sid, { httpOnly: true, sameSite: "lax" });
  }
  req.sessionId = sid;
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/models", (_req, res) => {
  res.json({ models: CURATED_MODELS, defaultModel: DEFAULT_MODEL });
});

app.post("/api/reset", (req, res) => {
  resetSession(req.sessionId);
  res.json({ ok: true });
});

// Debug panel's "raw history" tab: the exact messages array sent to the API.
app.get("/api/history", (req, res) => {
  const { messages, pendingAsk } = getSession(req.sessionId);
  res.json({ messages, pendingAsk });
});

// The LLM client is created on first use so a missing API key surfaces as a
// readable error event in the stream, not a crash at server start.
let llmClient: OpenAI | null = null;

// One agent turn at a time per session — different users can run concurrently.
const turnsInProgress = new Set<string>();

app.post("/api/chat", async (req, res) => {
  const { prompt, model } = req.body as { prompt?: string; model?: string };
  if (!prompt?.trim()) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }
  if (turnsInProgress.has(req.sessionId)) {
    res.status(409).json({ error: "a turn is already running" });
    return;
  }

  turnsInProgress.add(req.sessionId);
  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Cache-Control", "no-cache");
  const emit = (event: unknown) => res.write(`${JSON.stringify(event)}\n`);

  try {
    llmClient ??= createLlmClient();
    const turn = runAgentTurn(llmClient, getSession(req.sessionId), prompt, model ?? DEFAULT_MODEL);
    for await (const event of turn) {
      emit(event);
    }
  } catch (err) {
    emit({ type: "error", message: (err as Error).message });
  } finally {
    turnsInProgress.delete(req.sessionId);
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
