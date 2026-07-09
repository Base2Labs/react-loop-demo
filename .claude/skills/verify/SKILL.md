---
name: verify
description: Drive this app end-to-end without an OpenRouter key, using a scripted stub LLM and headless Chrome.
---

# Verifying react-loop-demo

The full stack (server loop → NDJSON stream → React UI → debug panel) can be
exercised without spending tokens: the server honors `OPENROUTER_BASE_URL`, so
point it at a local stub that speaks the OpenAI chat-completions shape.

## Recipe

1. **Stub LLM** — a ~100-line `node:http` server on a spare port (e.g. 9099)
   that returns the *next* canned chat-completion per POST. Script it to cover:
   reasoning present + absent, multi-tool iterations, one semantic error
   (e.g. `set_chart_widget` on a nonexistent section) so the model "recovers",
   an `ask_user` with options (suspends the turn), and a final plain-text
   summary after the answer. Valid account ids: `everyday-checking`,
   `joint-checking`, `high-yield-savings`, `credit-card`. Section colors:
   blue/green/amber/rose/violet/slate.

2. **Servers**
   ```bash
   node stub-llm.mjs &                                            # :9099
   cd server && OPENROUTER_BASE_URL=http://127.0.0.1:9099 \
     OPENROUTER_API_KEY=stub npx tsx src/index.ts &               # :3001
   cd client && npx vite &                                        # :5173
   ```

3. **Browser** — no Playwright in the repo; install `playwright-core` in the
   scratchpad and launch the system browser:
   ```js
   chromium.launch({ executablePath: "/usr/bin/google-chrome", headless: true })
   ```
   Drive `http://localhost:5173`: fill `.prompt-bar input`, click Send, answer
   the clarifying question via `.chip`, inspect `.debug-panel` / `.turn-group` /
   `.tool-result.error`, screenshot.

## Gotchas

- The stub is a one-shot script: its response counter doesn't reset with
  `POST /api/reset`. Restart the stub process before replaying a conversation.
- The debug panel's Loop tab renders client-side event state — a page reload
  empties it (History/Spec tabs still work; they come from the server).
- Don't `pkill -f stub-llm.mjs` — the pattern matches your own shell. Kill by
  port instead: `fuser -k 9099/tcp 3001/tcp 5173/tcp`.
- A favicon 404 on page load is pre-existing noise, not a failure.
