# ReAct Loop Demo — a banking dashboard you talk into existence

A teaching demo of how ReAct-style agent loops work. You describe a dashboard in
plain language; an LLM reasons about the request and drives a rendering engine
through tool calls — one action at a time, live. The dashboard is the hook. The
**debug panel** — every request, thought, tool call, result, and token count —
is the lesson.

The one idea this demo makes vivid: **the model never draws anything.** It only
emits structured tool calls; deterministic code executes them against a JSON
document, and React renders that document. Model proposes, harness disposes —
that separation is the core of every agent loop, from this demo to the coding
agent you used today.

## Quick start

```bash
npm install
cp .env.example server/.env      # add your key from https://openrouter.ai/keys
npm run dev                      # client on :5173, server on :3001
```

Open http://localhost:5173, flip on **Debug** (top right), and try:

- *Show my checking balance* — deliberately ambiguous: there are two checking
  accounts, so the agent should ask which one you mean.
- *Chart my grocery and dining spending by month as a bar chart*
- *Add a table of transactions over $200 this year, biggest first*
- *Make the chart section green and move it to the top*

There's also a terminal harness — the fastest way to A/B models:

```bash
npm run cli --workspace server               # default model
npm run cli --workspace server -- openai/gpt-5.4-mini
```

LLM access goes through [OpenRouter](https://openrouter.ai) so one key serves
many models. The picker next to the prompt bar switches models per request —
mid-conversation switching is allowed and instructive.

## How this maps to ReAct

ReAct ("Reason + Act", [Yao et al. 2022](https://arxiv.org/abs/2210.03629))
alternates between the model *thinking* about what to do and *doing* it via
actions whose results feed back in as observations.

| ReAct concept | In this demo |
|---|---|
| **Thought** | The model's reasoning text (debug panel, when the model exposes it) |
| **Action** | A tool call: `upsert_section`, `set_chart_widget`, `ask_user`, … |
| **Observation** | The tool result fed back: success summary, actionable error, or the data catalog |
| **Loop** | The server keeps calling the API while the reply contains tool calls |
| **Final answer** | A plain-text turn: a summary, or a clarifying question via `ask_user` |

## Anatomy of a turn

Everything happens in [`server/src/agent/loop.ts`](server/src/agent/loop.ts) —
a hand-written loop, no framework, heavily commented, because that loop *is*
the lesson:

1. Append the user's message to the conversation.
2. Send the system prompt + full conversation + tool definitions to the model.
   The API is stateless — it sees everything, every time.
3. If the reply contains tool calls, execute each one against the session's
   `DashboardSpec`, append each result as a `role: "tool"` message, and go to 2.
   The model now *sees what its actions did* — including failures.
4. If the reply is plain text, the turn is over: that text is the final answer.

Three wrinkles worth studying:

- **Errors are observations, not exceptions.** A tool call against a section
  that doesn't exist returns an error result telling the model what to fix.
  Watch the debug panel: the model reads it, creates the section, retries.
  That recovery is half the point of the observation step.
- **`ask_user` suspends the loop.** The executor can't answer a human question,
  so the loop ends the turn with the question pending; the user's reply comes
  back as *that tool call's result* on the next request. A "tool" can be the
  user — the cleanest way to model human-in-the-loop inside a tool-use
  conversation.
- **A loop guard caps iterations** (15). A confused model could call tools
  forever; when the guard trips it surfaces as an error event in the panel —
  itself a teachable moment.

## The agent's vocabulary

Small, orthogonal tools produce a legible trace — and stress-test weaker models
visibly. Each tool is one module exporting `{ name, description, schema, execute }`;
[`tools/index.ts`](server/src/agent/tools/index.ts) assembles the registry and
derives the JSON schema the API sees. Adding a tool = adding a file.

| Tool | Role |
|---|---|
| `get_data_catalog` | *Observation:* accounts, categories, date range. ReAct actions include looking things up. |
| `upsert_section` / `remove_section` / `reorder_sections` | Manage sections — the containers widgets live in |
| `set_balance_widget` / `set_transactions_widget` / `set_chart_widget` | Put content in a section (one widget per section) |
| `ask_user` | Ask a clarifying question; suspends the turn |

Tools never touch the DOM. They mutate a declarative `DashboardSpec`
([`shared/src/dashboard.ts`](shared/src/dashboard.ts)); the React app is a pure
view of it. All data derivation — filtering, sorting, bucketing — happens
client-side over a seeded mock dataset, so the server round-trips only the spec.

## Reading the debug panel

- **Loop tab** — turns → iteration cards. Each card: the serving model, its
  reasoning (or an explicit *"model did not expose reasoning"* — visibility
  varies by model and that's worth seeing), tool calls with exact JSON
  arguments, results (errors in red), and token usage per request. Note how
  the prompt token count *grows every iteration* — the whole conversation is
  re-sent each time.
- **History tab** — the raw `messages` array exactly as the API receives it,
  including `tool_call_id` pairing and the `User's answer:` result after a
  clarifying question.
- **Spec tab** — the current `DashboardSpec` JSON: the entire UI state the
  model manipulates, and everything the renderer needs.

## Code tour

Read in this order:

| File | What it teaches |
|---|---|
| [`server/src/agent/loop.ts`](server/src/agent/loop.ts) | ★ The ReAct loop: request → tool calls → results → repeat; ask_user suspension; the loop guard |
| [`server/src/agent/tools/`](server/src/agent/tools) | Tools as data + functions; zod schema → JSON schema; semantic validation that returns recoverable errors |
| [`server/src/agent/systemPrompt.ts`](server/src/agent/systemPrompt.ts) | Ground rules: check the catalog, when (not) to ask, recover from errors. Model-agnostic on purpose |
| [`shared/src/events.ts`](shared/src/events.ts) | `LoopEvent` — the NDJSON vocabulary the server streams per step |
| [`server/src/index.ts`](server/src/index.ts) | `/api/chat` as an NDJSON stream; single-session guardrails |
| [`client/src/api/stream.ts`](client/src/api/stream.ts) | fetch POST → async iterator of LoopEvents |
| [`client/src/state/appState.ts`](client/src/state/appState.ts) | One reducer over the event stream drives both dashboard and debug panel |
| [`client/src/debug/groupEvents.ts`](client/src/debug/groupEvents.ts) | Folding the flat event log back into turns → iterations |
| [`shared/src/mockBank.ts`](shared/src/mockBank.ts) | Seeded generator: same data every restart, balances consistent with transactions |

The dashboard renderer (`client/src/dashboard/`) is deliberately boring: a pure
function of the spec, one file per widget, no agent logic anywhere in it.

## Design notes

- **Manual loop, no SDK runner** — you can read the whole cycle in one file.
- **Loop branches on `tool_calls` presence, not `finish_reason`** — some models
  report `"stop"` while still emitting tool calls. Real-world lesson: trust the
  payload over the metadata.
- **NDJSON over a fetch POST** — the simplest transport that streams; each line
  is one `LoopEvent`, so the dashboard updates per tool call, not per turn.
- **One shared in-memory session, no DB, no auth** — it's a demo; state you can
  hold in your head. `POST /api/reset` (the Reset button) clears it.
- **`OPENROUTER_BASE_URL` override** — point the server at a scripted stub that
  speaks the chat-completions shape and the whole stack runs without spending
  tokens (that's how this repo is verified).

## Repository layout

```
shared/src/      DashboardSpec, LoopEvent, mock bank data (seeded)
server/src/
  index.ts       Express: /api/chat (NDJSON), /api/reset, /api/models, /api/history
  agent/         ★ loop.ts, systemPrompt.ts, tools/
  llm/           OpenRouter client + curated model list
  state/         the in-memory session (messages + spec + pending question)
  cli.ts         terminal harness for the same loop
client/src/
  api/           NDJSON stream reader
  state/         LoopEvent reducer + useAgent hook
  dashboard/     spec renderer: sections, balance cards, tables, charts
  chat/          prompt bar, model picker, chat strip, option chips
  debug/         ★ the debug panel: iteration cards, raw history, spec inspector
  data/          selectors: filter/sort/paginate/bucket over the mock data
```
