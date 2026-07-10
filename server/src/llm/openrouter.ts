import OpenAI from "openai";

/**
 * OpenRouter speaks the OpenAI chat-completions dialect, so the official
 * openai client works as-is with a different baseURL. One API, many models —
 * the demo lets you compare how different models drive the same tool set.
 */
export function createLlmClient(): OpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is not set. Copy .env.example to server/.env and add your key.",
    );
  }
  return new OpenAI({
    // Override exists for testing: point at a scripted stub server to
    // exercise the whole stack without spending tokens.
    baseURL: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
    apiKey,
    defaultHeaders: { "X-Title": "ReAct Loop Demo" },
  });
}

export const DEFAULT_MODEL = "openrouter/free";

/** Curated picks for the UI dropdown — any OpenRouter model id also works. */
export const CURATED_MODELS = [
  "anthropic/claude-sonnet-5",
  "anthropic/claude-sonnet-4.6",
  "openai/gpt-5.5",
  "openai/gpt-5.4-mini",
  "google/gemini-3.5-flash",
  "meta-llama/llama-4-maverick",
];
