import "dotenv/config";
import readline from "node:readline/promises";
import type { LoopEvent } from "shared";
import { createLlmClient, DEFAULT_MODEL } from "./llm/openrouter";
import { getSession, resetSession } from "./state/session";
import { runAgentTurn } from "./agent/loop";

/**
 * Terminal harness for the agent — milestone 3's test rig and still the
 * fastest way to A/B models:  npm run cli --workspace server -- [model-id]
 */

const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;

function printEvent(event: LoopEvent): void {
  switch (event.type) {
    case "request_start":
      console.log(dim(`\n── iteration ${event.iteration} → ${event.model}`));
      break;
    case "reasoning":
      console.log(dim(`thought: ${event.text.trim()}`));
      break;
    case "tool_call":
      console.log(`${cyan(`action: ${event.name}`)} ${JSON.stringify(event.input)}`);
      break;
    case "tool_result": {
      const paint = event.isError ? red : dim;
      console.log(paint(`observation: ${event.result.split("\n")[0]}`));
      break;
    }
    case "spec_updated":
      console.log(
        dim(`dashboard: [${event.spec.sections.map((s) => `${s.id}:${s.widget?.kind ?? "empty"}`).join(", ")}]`),
      );
      break;
    case "clarification_needed":
      console.log(`\n${green("agent asks:")} ${event.question}`);
      if (event.options) console.log(dim(`options: ${event.options.join(" | ")}`));
      break;
    case "assistant_message":
      console.log(`\n${green("agent:")} ${event.text}`);
      break;
    case "usage":
      console.log(
        dim(`tokens: ${event.promptTokens} in / ${event.completionTokens} out (finish: ${event.finishReason})`),
      );
      break;
    case "error":
      console.log(red(`error: ${event.message}`));
      break;
  }
}

async function main(): Promise<void> {
  const client = createLlmClient();
  let model = process.argv[2] ?? DEFAULT_MODEL;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log(`ReAct loop CLI — model: ${model}`);
  console.log(dim("commands: /reset  /spec  /model <id>  /exit\n"));

  while (true) {
    const input = (await rl.question("you> ")).trim();
    if (!input) continue;
    if (input === "/exit") break;
    if (input === "/reset") {
      resetSession();
      console.log(dim("session reset"));
      continue;
    }
    if (input === "/spec") {
      console.log(JSON.stringify(getSession().spec, null, 2));
      continue;
    }
    if (input.startsWith("/model ")) {
      model = input.slice(7).trim();
      console.log(dim(`model → ${model}`));
      continue;
    }

    try {
      for await (const event of runAgentTurn(client, getSession(), input, model)) {
        printEvent(event);
      }
    } catch (err) {
      console.log(red(`request failed: ${(err as Error).message}`));
    }
    console.log();
  }
  rl.close();
}

main();
