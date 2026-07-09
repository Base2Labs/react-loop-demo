import type OpenAI from "openai";
import type { LoopEvent } from "shared";
import type { Session } from "../state/session";
import { ASK_USER, executeTool, openAiTools } from "./tools/index";
import { SYSTEM_PROMPT } from "./systemPrompt";

/**
 * THE REACT LOOP — the file this whole demo exists to teach.
 *
 * One user prompt = one "turn". A turn is a loop of API round trips:
 *
 *   ┌──▶ 1. send conversation + tool definitions to the model
 *   │    2. model replies with reasoning ("Thought") and either
 *   │       tool calls ("Action") or plain text (final answer)
 *   │    3. we execute each tool call and append its result
 *   │       ("Observation") to the conversation
 *   └─── 4. repeat — the model now sees what its actions did
 *
 * The model never touches the UI. It only proposes actions; `executeTool`
 * runs them against the session's DashboardSpec, and the client re-renders
 * from the `spec_updated` events we yield along the way.
 */

/** Safety valve: a confused model could call tools forever. */
const MAX_ITERATIONS = 15;

/** OpenRouter extension: ask models that support it to include reasoning. */
type WithReasoning = OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming & {
  reasoning?: { enabled: boolean };
};

export async function* runAgentTurn(
  client: OpenAI,
  session: Session,
  userInput: string,
  model: string,
): AsyncGenerator<LoopEvent> {
  appendUserInput(session, userInput);

  for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
    yield { type: "request_start", iteration, model };

    // 1. Ask the model what to do next. The API is stateless: we send the
    //    system prompt, the whole conversation, and the tool contract every time.
    const params: WithReasoning = {
      model,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...session.messages],
      tools: openAiTools,
      reasoning: { enabled: true },
    };
    const response = await client.chat.completions.create(params);

    const choice = response.choices[0];
    const message = choice.message;

    // 2. "Thought" — models expose reasoning to varying degrees; show what we get.
    const reasoning = (message as { reasoning?: string | null }).reasoning;
    if (reasoning) {
      yield { type: "reasoning", iteration, text: reasoning };
    }
    yield {
      type: "usage",
      iteration,
      promptTokens: response.usage?.prompt_tokens ?? 0,
      completionTokens: response.usage?.completion_tokens ?? 0,
      finishReason: choice.finish_reason,
    };

    // The assistant turn goes into history verbatim — including its tool
    // calls, so future iterations can see what was already tried.
    session.messages.push({
      role: "assistant",
      content: message.content,
      ...(message.tool_calls?.length ? { tool_calls: message.tool_calls } : {}),
    });

    // 3. No tool calls means the model is done: its text is the final answer.
    const toolCalls = (message.tool_calls ?? []).filter(
      (c): c is OpenAI.Chat.Completions.ChatCompletionMessageFunctionToolCall =>
        c.type === "function",
    );
    if (toolCalls.length === 0) {
      yield { type: "assistant_message", text: message.content ?? "(no response)" };
      return;
    }

    // 4. "Action" → "Observation": run each call, feed the result back.
    //    ask_user is special — it's answered by a human, so it suspends the
    //    loop; we handle it after the ordinary tools so every other call
    //    already has its result in history.
    const askCalls = toolCalls.filter((c) => c.function.name === ASK_USER);
    for (const call of toolCalls.filter((c) => c.function.name !== ASK_USER)) {
      const { name } = call.function;
      const args = safeParseArgs(call.function.arguments);
      yield { type: "tool_call", iteration, id: call.id, name, input: args.value };

      const specBefore = JSON.stringify(session.spec);
      const outcome = args.ok
        ? executeTool(name, args.value, { spec: session.spec })
        : { result: `Arguments were not valid JSON: ${args.error}`, isError: true };

      yield {
        type: "tool_result",
        iteration,
        toolCallId: call.id,
        result: outcome.result,
        isError: outcome.isError,
      };
      if (!outcome.isError && JSON.stringify(session.spec) !== specBefore) {
        yield { type: "spec_updated", spec: session.spec };
      }
      session.messages.push({ role: "tool", tool_call_id: call.id, content: outcome.result });
    }

    if (askCalls.length > 0) {
      yield* suspendForQuestion(session, askCalls, iteration);
      return; // turn over — the user's reply resumes the conversation
    }
  }

  yield {
    type: "error",
    message: `Loop guard: stopped after ${MAX_ITERATIONS} iterations without a final answer.`,
  };
}

/** A new turn starts with either a fresh user message or — if the agent asked
 * a question last turn — the user's answer delivered as that tool's result. */
function appendUserInput(session: Session, userInput: string): void {
  if (session.pendingAsk) {
    session.messages.push({
      role: "tool",
      tool_call_id: session.pendingAsk.toolCallId,
      content: `User's answer: ${userInput}`,
    });
    session.pendingAsk = null;
  } else {
    session.messages.push({ role: "user", content: userInput });
  }
}

/** Surface the first ask_user question and park the turn until the user replies. */
function* suspendForQuestion(
  session: Session,
  askCalls: OpenAI.Chat.Completions.ChatCompletionMessageFunctionToolCall[],
  iteration: number,
): Generator<LoopEvent> {
  const [first, ...extra] = askCalls;

  // The protocol requires a result for every tool call, so duplicate
  // questions get answered immediately with a nudge.
  for (const call of extra) {
    session.messages.push({
      role: "tool",
      tool_call_id: call.id,
      content: "Ignored: ask one question at a time.",
    });
  }

  const args = safeParseArgs(first.function.arguments);
  const input = (args.ok ? args.value : {}) as { question?: string; options?: string[] };
  const question = input.question ?? "Could you clarify your request?";

  yield { type: "tool_call", iteration, id: first.id, name: ASK_USER, input: args.value };
  session.pendingAsk = { toolCallId: first.id };
  yield { type: "clarification_needed", question, options: input.options };
}

function safeParseArgs(
  raw: string,
): { ok: true; value: unknown } | { ok: false; value: unknown; error: string } {
  try {
    return { ok: true, value: JSON.parse(raw || "{}") };
  } catch (err) {
    return { ok: false, value: raw, error: (err as Error).message };
  }
}
