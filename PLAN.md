# ReAct Loop Demo — Natural-Language Banking Dashboard

## 1. Goal

Teach engineers how ReAct-style agent loops work by using one in an unusual context:
instead of the classic "chat + tool calls" transcript, the agent's tool calls are
**instructions to a rendering engine** that draws a banking dashboard. The user
describes the dashboard they want in natural language; the agent reasons about the
request, calls rendering tools, and the UI updates live — one tool call at a time.

Two audiences, two views:

- **User view** — a banking dashboard on top, a prompt bar at the bottom. Type a
  request, watch the dashboard build itself. If the request is ambiguous, the agent
  asks a clarifying question in the chat area before rendering.
- **Debug view (engineers)** — a toggleable panel showing the full anatomy of the
  loop: every request/response cycle, the model's reasoning text, each tool call
  with its exact JSON input, each tool result, finish reasons, and token usage.
  This is the actual teaching surface — the dashboard is the hook, the debug panel
  is the lesson.

Because the goal is pedagogy, **code clarity beats cleverness everywhere**. The
agent loop is hand-written (no framework, no SDK "runner" helper) so readers can
see the whole request → tool call → execute → tool result → repeat cycle in one
file.

## 2. Code quality principles

These govern every milestone; reviewers should push back on violations.

- **Right-sized abstraction.** Abstractions exist only where the problem demands
  a seam: the LLM client (so providers/models swap), the tool executor registry
  (so tools are data + functions, not a switch statement sprawl), and the
  spec-reducer boundary (tools mutate state, React renders it). No generic
  "plugin systems", no interfaces with a single implementation, no config for
  things that never vary.
- **Human-reviewable files.** Target ≤ ~150 lines per file; hard ceiling ~250.
  When a file outgrows that, split along the natural seam (e.g. one file per
  widget renderer, one file per tool group) rather than extracting arbitrary
  helpers. Every file should be readable top-to-bottom in one sitting.
- **Data first.** Core behavior is expressed as plain typed data (`DashboardSpec`,
  `LoopEvent`, tool schemas) and pure functions over it. Side effects (HTTP, LLM
  calls, session state) live at the edges.
- **Comments explain *why*, sparingly.** The loop file gets teaching comments
  (that's its job); everywhere else, clear naming over commentary.
- **No speculative generality.** Single in-memory session, no DB, no auth, no
  retry frameworks. If the demo doesn't need it, it doesn't exist.

## 3. How this maps to ReAct

| ReAct concept | In this demo |
|---|---|
| **Thought** | The model's reasoning output (shown in the debug panel when the selected model exposes it) |
| **Action** | A tool call: `upsert_section`, `set_chart_widget`, `ask_user`, … |
| **Observation** | The tool result fed back: success/failure, the updated dashboard state, or the data catalog |
| **Loop** | Server keeps calling the API while `finish_reason == "tool_calls"` |
| **Final answer** | A plain-text turn: a summary of what was rendered, or a clarifying question via `ask_user` |

The demo makes one point vividly: *the LLM never draws anything*. It only emits
structured tool calls; deterministic code (the "rendering engine") owns the UI.
That separation — model proposes actions, harness executes them — is the core
idea of every agent loop.

## 4. Architecture

```
┌────────────────────────── Browser (React + Vite) ─────────────────────────┐
│  ┌──────────────────────────────────────────────┐  ┌───────────────────┐  │
│  │  Dashboard renderer                          │  │  Debug panel      │  │
│  │  (renders DashboardSpec — pure function of   │  │  (renders the     │  │
│  │   state, no agent logic)                     │  │   LoopEvent log)  │  │
│  └──────────────────────────────────────────────┘  └───────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │  Prompt bar + chat strip + model picker                              │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└───────────────▲────────────────────────────────────────────────────────────┘
                │  POST /api/chat  → NDJSON stream of LoopEvents
                │  POST /api/reset      GET /api/models
┌───────────────┴──────────── Node server (Express + TS) ────────────────────┐
│  agent/loop.ts      — the hand-written ReAct loop (the teaching artifact)  │
│  agent/tools/       — tool definitions (JSON schema) + executors           │
│  agent/systemPrompt.ts                                                     │
│  llm/openrouter.ts  — thin OpenRouter client (OpenAI-compatible)           │
│  state/session.ts   — conversation history + current DashboardSpec         │
│  data/mockBank.ts   — seeded mock accounts & transactions                  │
│  OPENROUTER_API_KEY stays server-side                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

Key decisions and why:

- **LLM access via OpenRouter.** One API, many models — ideal for a teaching demo
  because you can re-run the same prompt against different models and compare how
  their tool-calling behavior differs in the debug panel. We use the official
  `openai` npm package pointed at `https://openrouter.ai/api/v1` (OpenRouter is
  OpenAI-chat-completions compatible, including `tools` / `tool_calls`).
- **Model is a runtime choice, not a constant.** A model picker in the UI sends
  the model id with each prompt; the server threads it through to OpenRouter. A
  curated default list (e.g. `anthropic/claude-sonnet-4.6`, `openai/gpt-5.2`,
  `google/gemini-3-pro`, one small/cheap model for contrast) lives in server
  config, exposed via `GET /api/models`, plus a free-text override for any
  OpenRouter model id. Each debug-panel iteration is tagged with the model that
  served it — switching models mid-conversation is allowed and instructive.
- **Reasoning visibility varies by model.** OpenRouter surfaces reasoning for
  models that expose it (via the `reasoning` request option / response field).
  The loop requests it when available and the debug panel renders whatever comes
  back; for models that hide reasoning the panel says so explicitly — itself a
  useful teaching point.
- **Loop runs on the server.** The API key can't live in the browser, and a server
  loop lets us stream structured `LoopEvent`s to the client so the dashboard and
  debug panel update *per tool call*, not per turn.
- **Manual loop, no framework.** We write `while (finish_reason === "tool_calls")`
  ourselves, heavily commented. That loop is the whole lesson.
- **Tools mutate a declarative `DashboardSpec`; React renders the spec.** Tools
  never touch the DOM. The "rendering engine" is a reducer over a JSON document,
  and the React app is a pure view of it. This also makes the debug story clean —
  you can diff the spec before/after each tool call.
- **Streaming transport: NDJSON over a `fetch` POST response.** Simplest thing
  that streams; no WebSocket/SSE ceremony. Each line is one `LoopEvent`.
- **Single in-memory session** (conversation + spec), with a Reset button. No
  auth, no DB — this is a demo.

### Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Charts | Recharts (line/bar) |
| Styling | Plain CSS with variables (readable for a demo; no utility-class noise) |
| Server | Express + TypeScript (tsx for dev) |
| LLM | OpenRouter via the `openai` npm package (`baseURL: https://openrouter.ai/api/v1`) |
| Validation | zod for tool-argument shape checks |
| Shared types | `shared/` package imported by both client and server |
| Data | Seeded pseudo-random generator → deterministic mock transactions |

## 5. The dashboard spec (state the tools manipulate)

```ts
interface DashboardSpec {
  sections: Section[];            // render order = array order
}

interface Section {
  id: string;                     // model-chosen slug, e.g. "checking-overview"
  title: string;
  color: SectionColor;            // named palette: "blue" | "green" | "amber" | ...
  widget: BalanceWidget | TransactionsWidget | ChartWidget | null;
}

interface BalanceWidget {
  kind: "balance";
  accountIds: string[] | "all";   // one account, several, or aggregate
  aggregate: boolean;             // sum across accounts vs one card per account
}

interface TransactionsWidget {
  kind: "transactions";
  filters: {
    accountIds?: string[];
    categories?: string[];
    dateRange?: { from: string; to: string };   // ISO dates
    minAmount?: number;
    maxAmount?: number;
    search?: string;              // substring match on description
  };
  sort: { field: "date" | "amount" | "description" | "category"; dir: "asc" | "desc" };
  pageSize: number;               // pagination controls rendered by the UI
  rowLimit?: number;              // hard cap across all pages
}

interface ChartWidget {
  kind: "chart";
  chartType: "line" | "bar";
  metric: "balance" | "spending";
  accountIds?: string[];          // default: all
  categories?: string[];          // one or more series when metric = spending
  interval: "day" | "week" | "month";
  dateRange?: { from: string; to: string };
}
```

One widget per section — matches the brief ("each section could show 1/2/3") and
keeps both the tool surface and the renderer simple. All data derivation
(filtering, sorting, paginating, bucketing for charts) happens client-side in
plain, testable selector functions over the mock dataset.

## 6. Tool set (the agent's vocabulary)

Small, orthogonal tools produce a legible tool-call trace — better teaching
material than one mega-tool. It also stress-tests weaker models nicely: you can
watch in the debug panel which models sequence the tools correctly.

Each tool is one module exporting `{ name, description, schema (zod), execute }`;
`agent/tools/index.ts` assembles the registry, derives the JSON schema sent to
the API, and dispatches calls. Adding a tool = adding a file.

**Observation tool** (shows that ReAct actions include *looking things up*):

- `get_data_catalog()` → accounts (id, name, type, current balance), transaction
  categories, and available date range. The system prompt tells the model to call
  this before referencing accounts or categories it hasn't seen.

**Rendering tools** (each returns the updated section/spec summary as its result):

- `upsert_section({ id, title, color, position? })` — create or restyle/retitle a
  section; `position` inserts at an index.
- `remove_section({ id })`
- `reorder_sections({ orderedIds })` — full replacement of the order.
- `set_balance_widget({ sectionId, accountIds | "all", aggregate })`
- `set_transactions_widget({ sectionId, filters, sort, pageSize, rowLimit? })`
- `set_chart_widget({ sectionId, chartType, metric, accountIds?, categories?, interval, dateRange? })`

**Conversation tool:**

- `ask_user({ question, options? })` — the clarifying-question mechanism. The
  executor doesn't answer it; instead the loop **ends the turn**, the question is
  rendered in the chat strip (with quick-reply chips if `options` given), and the
  user's reply comes back as the tool result on the next request. This is the
  cleanest way to model human-in-the-loop inside a tool-use conversation, and it
  demonstrates that a "tool" can be *the user*.

Executors validate inputs semantically (unknown section id, unknown account, bad
date range) and zod validates argument shape; both kinds of failure return error
tool results with actionable messages instead of crashing. That lets the demo
show the model *recovering* from a failed action — half the point of the
observation step — and makes tool-call quality across OpenRouter models visibly
comparable.

## 7. The loop (server, `agent/loop.ts`)

Per user prompt (with the selected `model` id):

1. Append the user message (or the pending `ask_user` tool result) to history.
2. `while (true)`:
   a. Call `POST /chat/completions` via the OpenAI client with system prompt,
      `tools`, full history, and `reasoning` requested where supported. Emit
      `LoopEvent: request_start` (tagged with model) / `reasoning` / usage.
   b. Append the assistant message (content + `tool_calls`) to history.
   c. If `finish_reason === "tool_calls"`:
      - For each entry in `tool_calls`: emit `tool_call` event → if it's
        `ask_user`, emit `clarification_needed` and **return** (turn ends, loop
        suspends); otherwise `JSON.parse` the arguments, execute against the
        session's `DashboardSpec`, emit `tool_result` + `spec_updated` events,
        and append a `role: "tool"` message with the matching `tool_call_id`.
      - Continue the loop.
   d. Otherwise (`finish_reason === "stop"`): emit `assistant_message` (the
      summary text) and return.
3. A `maxIterations` guard (e.g. 15) prevents runaway loops and is itself a
   teachable moment, surfaced in the debug panel when hit.

`LoopEvent` (the NDJSON stream vocabulary, shared type):

```ts
type LoopEvent =
  | { type: "request_start"; iteration: number; model: string }
  | { type: "reasoning"; iteration: number; text: string }
  | { type: "tool_call"; iteration: number; id: string; name: string; input: unknown }
  | { type: "tool_result"; iteration: number; toolCallId: string; result: string; isError: boolean }
  | { type: "spec_updated"; spec: DashboardSpec }          // client re-renders dashboard live
  | { type: "clarification_needed"; question: string; options?: string[] }
  | { type: "assistant_message"; text: string }
  | { type: "usage"; iteration: number; promptTokens: number; completionTokens: number; finishReason: string }
  | { type: "error"; message: string };
```

The client appends every event to a log (debug panel renders the log) and reacts
to `spec_updated` / `clarification_needed` / `assistant_message` for the user view.

### System prompt sketch

Defines the role ("you control a banking dashboard through tools — you cannot
output UI directly"), the one-widget-per-section rule, when to ask clarifying
questions (ambiguous account references, vague timeframes, unclear chart intent —
but don't over-ask for reasonable defaults), the instruction to check
`get_data_catalog` before naming accounts/categories, and to finish each turn
with a one-or-two-sentence summary of what changed. Kept model-agnostic — no
provider-specific prompt tricks — so model comparisons stay fair.

## 8. Mock banking data (`data/mockBank.ts`)

- 4 accounts: Everyday Checking, High-Yield Savings, Credit Card, Joint Checking.
- ~12 months of transactions per account from a **seeded** generator (same data on
  every restart → reproducible demos), with realistic descriptions and categories:
  groceries, dining, rent, utilities, transport, entertainment, income, transfers.
- Balances derived by replaying transactions from an opening balance, so balance
  charts over time are internally consistent with the transaction table.

## 9. Frontend

- **`<Dashboard spec={spec} />`** — maps sections to cards; section color drives a
  header accent + tinted background. Widgets: `BalanceCard`, `TransactionsTable`
  (client-side sort headers + pagination controls honoring `pageSize`/`rowLimit`),
  `Chart` (Recharts line/bar with one series per account/category). One file per
  widget renderer.
- **Prompt bar + chat strip + model picker** — input at the bottom with a model
  dropdown beside it (curated list from `/api/models` + free-text override);
  above it a slim strip showing the latest agent summary or pending clarifying
  question (with option chips). While the loop runs, a small activity indicator
  names the tool currently executing ("rendering: set_chart_widget…").
- **Debug panel** — toggled by a header switch (persisted in localStorage). Slides
  in from the right. Content per turn: iteration cards tagged with the serving
  model, reasoning text (or "model does not expose reasoning"), tool calls (name +
  pretty-printed JSON, color-coded), tool results (errors in red), finish reason
  and token usage; plus a raw-history tab (the exact `messages` array) and a spec
  tab (current `DashboardSpec` JSON). Everything the API saw and said, nothing
  hidden.
- **State:** a single `useReducer` over the `LoopEvent` stream in `App.tsx` — no
  state-management library.

## 10. Repository layout

```
react-loop-demo/
├── PLAN.md
├── README.md              # ReAct explainer + how to run + guided tour of the code
├── package.json           # npm workspaces: client, server, shared
├── shared/src/            # DashboardSpec, LoopEvent, tool input types
├── server/src/
│   ├── index.ts            # Express app: /api/chat (NDJSON), /api/reset, /api/models
│   ├── agent/loop.ts       # ★ the ReAct loop
│   ├── agent/tools/        # ★ one module per tool + index.ts registry
│   ├── agent/systemPrompt.ts
│   ├── llm/openrouter.ts   # OpenAI client configured for OpenRouter + model list
│   ├── state/session.ts
│   └── data/mockBank.ts
└── client/src/
    ├── App.tsx             # useReducer over LoopEvents; layout shell
    ├── api/stream.ts       # fetch + NDJSON reader → LoopEvent iterator
    ├── dashboard/          # Dashboard, Section, BalanceCard, TransactionsTable, Chart
    ├── chat/               # PromptBar, ModelPicker, ChatStrip, OptionChips
    ├── debug/              # DebugPanel, IterationCard, JsonView, RawHistory
    └── data/selectors.ts   # filter/sort/paginate/bucket over mock data
```

★ = the parts the README tour centers on.

## 11. Milestones

1. **Scaffold** — workspaces, Vite React app, Express server, shared types,
   `.env.example` (`OPENROUTER_API_KEY`), dev script running both.
2. **Static dashboard** — mock data + renderer driven by a hard-coded
   `DashboardSpec`; verifies widgets/selectors independent of any AI.
3. **Agent core** — OpenRouter client, tools + executors + loop on the server;
   exercised via a tiny CLI script before the UI is wired (fast iteration on
   prompt/tool design, easy model A/B from the terminal).
4. **Wire the UI** — prompt bar → `/api/chat` → streamed events → live dashboard
   updates per tool call; model picker.
5. **Clarifying questions** — `ask_user` end-to-end with option chips.
6. **Debug panel** — event log rendering, raw history, spec inspector.
7. **Polish & docs** — reset, error surfaces, loop guard, README with the ReAct
   explainer and code tour.

Each milestone is a working checkpoint and a natural commit boundary.

## 12. Open questions (defaults chosen — flag if you want different)

1. **API key source** — `OPENROUTER_API_KEY` in server env (`.env`, gitignored).
2. **Default model** — `anthropic/claude-sonnet-4.6` as the out-of-the-box pick
   (strong tool calling at reasonable cost), switchable per request. Curated
   list finalized during milestone 3 based on which models handle the tool set
   well.
3. **Session scope** — one shared in-memory session (demo runs locally, single
   user). Multi-session would add an id per browser tab; skipping unless you
   want it.
4. **Undo/history of specs** — not planned. The debug panel shows spec snapshots
   per tool call, but there's no "revert dashboard" button. Easy to add later
   since the spec is a plain JSON document.
