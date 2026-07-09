# Progress Tracker

Lightweight replacement for a ticket system. This file is the single source of
truth for project state — update it (and commit) whenever a work session ends or
a milestone lands, so work can resume on any machine with just a `git clone`.

**How to resume:** read `PLAN.md` for the design, then jump to **Next up** below.
Copy `.env.example` to `server/.env` and set `OPENROUTER_API_KEY` before running.

## Status

- **All 7 milestones complete.** The project is done pending any user feedback.
- **Next up:** nothing scheduled. Possible follow-ons if wanted: multi-session
  support (id per browser tab), spec undo/revert, more models in the curated
  list.
- **Blocked on user:** nothing. `OPENROUTER_API_KEY` added 2026-07-09; live
  runs verified (see below). Stub-based verification recipe remains in
  `.claude/skills/verify/SKILL.md` for tokenless regression passes.
- **Live verification (2026-07-09, key in place):**
  - CLI: catalog → upsert_section → set_balance_widget → summary with real
    reasoning + usage (claude-sonnet-5).
  - Browser: ambiguous "Show my checking balance" → live clarifying question
    with 3 option chips → chip answer resumed the loop → dashboard rendered;
    debug panel showed real reasoning (mixed exposed/hidden) and token usage.
  - Model picker: switched to openai/gpt-5.4-mini mid-conversation; iteration
    cards tagged the new model; section added on top of the existing session.

## Milestones

- [x] **1. Scaffold** — workspaces, Vite React app, Express server, shared types,
      `.env.example`, dev script running client + server together
      *(verified: `npm run dev` boots both; `/api/health` works direct and via
      Vite proxy; `npm run typecheck` clean)*
- [x] **2. Static dashboard** — mock bank data + renderer driven by a hard-coded
      `DashboardSpec` (widgets & selectors work with no AI involved)
      *(verified: typecheck + vite build clean; selector sanity script passes,
      incl. last-chart-bucket == currentBalance invariant; demo spec renders all
      three widget types — visual pass still worth doing in a browser)*
- [x] **3. Agent core** — OpenRouter client, tool registry + executors, ReAct
      loop; exercised via a CLI script before the UI is wired
      *(verified with a scripted fake LLM: schema serialization, happy-path /
      semantic-error / schema-error executions, ask_user suspend + resume,
      every tool_call answered in history. Live model run still pending — needs
      OPENROUTER_API_KEY; then: `npm run cli --workspace server -- [model]`)*
- [x] **4. Wire the UI** — prompt bar → `/api/chat` → streamed LoopEvents →
      live dashboard updates per tool call; model picker
      *(verified: /api/models, /api/reset, 400 on empty prompt, 409 guard for
      concurrent turns, missing-key surfaces as a readable NDJSON error event;
      typecheck + build clean)*
- [x] **5. Clarifying questions** — `ask_user` end-to-end with option chips
      *(built with M4: ChatStrip question notice + OptionChips, awaitingAnswer
      placeholder, pendingAsk resume on the server. Suspend/resume structurally
      tested with the fake LLM; live-model pass pending API key)*
- [x] **6. Debug panel** — iteration cards, raw history tab, spec inspector
      *(verified in headless Chrome against a scripted stub LLM
      (`OPENROUTER_BASE_URL` override): turn/iteration grouping, hidden-reasoning
      note, red error result + recovery, ask_user turn boundary, usage footers,
      History tab fetching `/api/history`, Spec tab, localStorage persistence
      of the toggle across reloads)*
- [x] **7. Polish & docs** — reset, error surfaces, loop guard, README with
      ReAct explainer + code tour
      *(README written: quick start, ReAct mapping, turn anatomy, tool
      vocabulary, debug-panel guide, file-by-file code tour, design notes.
      Fixed the cli.ts EOF crash — piped input now exits cleanly. History tab
      refetches after Reset instead of showing stale messages; both verified
      at runtime against the stub. Loop guard already surfaces as a red error
      outcome in the panel; missing-key error surface verified in M4)*

## Decision log

- **2026-07-09** — Plan approved (see `PLAN.md`). LLM access via OpenRouter
  (`openai` npm package, `baseURL: https://openrouter.ai/api/v1`) so models can
  be swapped per request; model picker in the UI.
- **2026-07-09** — Code quality bar set: abstractions only at real seams (LLM
  client, tool registry, spec reducer); files target ≤150 lines, hard ceiling
  ~250 — split along natural seams when exceeded.
- **2026-07-09** — Tracking progress in this file instead of Jira; commit it
  with each work session.
- **2026-07-09** — Mock bank data lives in `shared/` (not `server/` as the plan
  sketched): the client derives all widget data locally and the server's
  `get_data_catalog` tool reads the same dataset, so a shared seeded generator
  avoids an API round trip and keeps both sides consistent by construction.
- **2026-07-09** — Chart series colors use the validated CVD-safe categorical
  palette (fixed slot order); color follows the entity (account/category), never
  its position in the current selection.
- **2026-07-09** — Curated model list checked against the live OpenRouter
  catalog (tool-capable): default `anthropic/claude-sonnet-5`, plus
  sonnet-4.6, gpt-5.5, gpt-5.4-mini, gemini-3.5-flash, llama-4-maverick.
- **2026-07-09** — Loop branches on `message.tool_calls` presence rather than
  `finish_reason` (some models report "stop" while still emitting tool calls).
  `spec_updated` only fires when the spec actually changed.
- **2026-07-09** — ask_user suspension: ordinary tool calls in the same turn are
  executed first so every tool_call id has a result in history; duplicate
  ask_user calls get an immediate "one question at a time" result.

- **2026-07-09** — `createLlmClient` honors `OPENROUTER_BASE_URL` so the whole
  stack can be driven by a local scripted stub (no tokens spent). The browser
  verification recipe lives in `.claude/skills/verify/SKILL.md`.
- **2026-07-09** — Debug panel groups the flat event log by "`request_start`
  with iteration 1 starts a new turn"; an ask_user resume therefore renders as
  its own turn, which matches what the API actually saw.

## Notes / gotchas

- The debug panel's Loop tab is client-side state — it empties on page reload
  (History and Spec tabs re-fetch from the server and survive).
- `cli.ts` treats a failed `rl.question` as EOF and exits cleanly (piped
  input used to crash with `ERR_USE_AFTER_CLOSE` — fixed in M7).
