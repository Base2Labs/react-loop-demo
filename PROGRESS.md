# Progress Tracker

Lightweight replacement for a ticket system. This file is the single source of
truth for project state — update it (and commit) whenever a work session ends or
a milestone lands, so work can resume on any machine with just a `git clone`.

**How to resume:** read `PLAN.md` for the design, then jump to **Next up** below.
Copy `.env.example` to `server/.env` and set `OPENROUTER_API_KEY` before running.

## Status

- **Current milestone:** 1 — Scaffold
- **Next up:** create npm workspaces (shared / server / client) and dev scripts

## Milestones

- [ ] **1. Scaffold** — workspaces, Vite React app, Express server, shared types,
      `.env.example`, dev script running client + server together
- [ ] **2. Static dashboard** — mock bank data + renderer driven by a hard-coded
      `DashboardSpec` (widgets & selectors work with no AI involved)
- [ ] **3. Agent core** — OpenRouter client, tool registry + executors, ReAct
      loop; exercised via a CLI script before the UI is wired
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

## Notes / gotchas

- (none yet)
