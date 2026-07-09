# Progress Tracker

Lightweight replacement for a ticket system. This file is the single source of
truth for project state — update it (and commit) whenever a work session ends or
a milestone lands, so work can resume on any machine with just a `git clone`.

**How to resume:** read `PLAN.md` for the design, then jump to **Next up** below.
Copy `.env.example` to `server/.env` and set `OPENROUTER_API_KEY` before running.

## Status

- **Current milestone:** 4 — Wire the UI
- **Next up:** `/api/chat` NDJSON endpoint + `/api/models` + `/api/reset` on the
  server; client stream reader, LoopEvent reducer, live dashboard + prompt bar
  + model picker
- **Blocked on user:** live CLI test of the agent needs `OPENROUTER_API_KEY`
  in `server/.env` (copy from `.env.example`). Everything else is verified with
  a scripted fake LLM.

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
- [ ] **4. Wire the UI** — prompt bar → `/api/chat` → streamed LoopEvents →
      live dashboard updates per tool call; model picker
- [ ] **5. Clarifying questions** — `ask_user` end-to-end with option chips
- [ ] **6. Debug panel** — iteration cards, raw history tab, spec inspector
- [ ] **7. Polish & docs** — reset, error surfaces, loop guard, README with
      ReAct explainer + code tour

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

## Notes / gotchas

- (none yet)
