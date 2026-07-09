# Progress Tracker

Lightweight replacement for a ticket system. This file is the single source of
truth for project state — update it (and commit) whenever a work session ends or
a milestone lands, so work can resume on any machine with just a `git clone`.

**How to resume:** read `PLAN.md` for the design, then jump to **Next up** below.
Copy `.env.example` to `server/.env` and set `OPENROUTER_API_KEY` before running.

## Status

- **Current milestone:** 7 — Polish & docs (not started)
- **Next up (resume here):** README.md — the ReAct explainer, how-to-run, and
  the guided code tour (center on `agent/loop.ts` and `agent/tools/`). Then a
  polish pass: confirm Reset clears the debug panel state sensibly, check
  error surfaces (missing key, network drop mid-stream), and give the loop
  guard a visible treatment in the panel.
- **Blocked on user:** a live model run still needs `OPENROUTER_API_KEY` in
  `server/.env` (copy from `.env.example`). Everything through M6 is verified
  end-to-end in a real browser against a scripted stub LLM — see
  `.claude/skills/verify/SKILL.md` for the recipe.

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

- **2026-07-09** — `createLlmClient` honors `OPENROUTER_BASE_URL` so the whole
  stack can be driven by a local scripted stub (no tokens spent). The browser
  verification recipe lives in `.claude/skills/verify/SKILL.md`.
- **2026-07-09** — Debug panel groups the flat event log by "`request_start`
  with iteration 1 starts a new turn"; an ask_user resume therefore renders as
  its own turn, which matches what the API actually saw.

## Notes / gotchas

- The debug panel's Loop tab is client-side state — it empties on page reload
  (History and Spec tabs re-fetch from the server and survive).
