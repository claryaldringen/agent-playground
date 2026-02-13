/*
 * Easiest agent pattern: LLM decides whether to call a tool or answer directly.
 *
 * v2: Same pattern but with a reliability layer
 */

import { Json, Llm, Tool } from "../core/types";

type AgentDecision =
  | { type: "final"; answer: string }
  | { type: "tool"; name: string; input: Json };

const stripJsonFences = (s: string) =>
  s
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

const parseDecision = (text: string): AgentDecision => {
  const raw = stripJsonFences(text);

  let parsed;
  try {
    parsed = JSON.parse(raw) as any;
  } catch (e) {
    console.error(e);
  }

  if (!parsed || typeof parsed !== "object")
    throw new Error("LLM returned non-object JSON.");

  if (parsed.type === "final") {
    if (typeof parsed.answer !== "string")
      throw new Error("final.answer must be a string.");
    return { type: "final", answer: parsed.answer };
  }

  if (parsed.type === "tool") {
    if (typeof parsed.name !== "string")
      throw new Error("tool.name must be a string.");
    return {
      type: "tool",
      name: parsed.name,
      input: (parsed.input ?? null) as Json,
    };
  }

  throw new Error('LLM must return type "final" or "tool".');
};

type MsgRole = "system" | "user" | "assistant" | "tool";
type Msg = { role: MsgRole; content: string };

const formatContext = (msgs: Msg[]) =>
  msgs
    .map((m) => {
      if (m.role === "tool") return `TOOL: ${m.content}`;
      if (m.role === "system") return `SYSTEM: ${m.content}`;
      if (m.role === "user") return `USER: ${m.content}`;
      return `ASSISTANT: ${m.content}`;
    })
    .join("\n");

type ToolUsingLlmArgs = {
  llm: Llm;
  tools: Tool[];
  userPrompt: string;
  maxSteps?: number;
  contextWindow?: number;
  maxToolRetries?: number;
};

export const run = async (args: ToolUsingLlmArgs) => {
  const maxSteps = args.maxSteps ?? 6;
  const contextWindow = args.contextWindow ?? 20;
  const maxToolRetries = args.maxToolRetries ?? 1;

  const toolList = args.tools
    .map((tool) => ` - ${tool.name}: ${tool.description}`)
    .join("\n");

  const messages: Msg[] = [];
  messages.push({ role: "user", content: args.userPrompt });

  const toolRetryCount = new Map<string, number>();

  for (let step = 1; step <= maxSteps; step++) {
    const ctx = messages.slice(-contextWindow);

    const prompt = [
      `You are a tool-using assistant.`,
      ``,
      `AVAILABLE TOOLS:`,
      toolList || "(none)",
      ``,
      `RULES:`,
      ` - Return ONLY valid JSON, no extra text, no markdown.`,
      ` - If you need a tool: {"type":"tool","name":"toolName","input":{...}}`,
      ` - If you can answer now: {"type":"final","answer":"..."}`,
      ` - If a tool fails (TOOL returned ERROR), either:`,
      `    (a) retry with corrected input (at most ${maxToolRetries} time(s) for the same call), or`,
      `    (b) choose a different tool, or`,
      `    (c) return a final answer explaining the limitation.`,
      ``,
      `CONTEXT:`,
      formatContext(ctx),
    ].join("\n");

    const llmText = await args.llm.generate(prompt);

    let decision: AgentDecision;
    try {
      decision = parseDecision(llmText);
    } catch (e) {
      messages.push({
        role: "system",
        content:
          `Your last output was invalid. Error: ${String(e)}. ` +
          `Output MUST be strictly one of the two JSON shapes.`,
      });
      continue;
    }

    if (decision.type === "final") {
      return { ok: true, answer: decision.answer, steps: step };
    }

    const tool = args.tools.find(({ name }) => name === decision.name);

    if (!tool) {
      messages.push({
        role: "system",
        content: `The tool "${decision.name}" is not in the list of tools.`,
      });
      continue;
    }

    const toolCallJson = JSON.stringify({
      type: "tool",
      name: decision.name,
      input: decision.input,
    });

    messages.push({ role: "assistant", content: toolCallJson });

    const callKey = `${decision.name}::${JSON.stringify(decision.input)}`;
    const tries = toolRetryCount.get(callKey) ?? 0;

    const result = await tool.invoke(decision.input);

    if (result.ok) {
      messages.push({
        role: "tool",
        content: JSON.stringify({
          name: decision.name,
          ok: true,
          data: result.data,
        }),
      });
    } else {
      messages.push({
        role: "tool",
        content: JSON.stringify({
          name: decision.name,
          ok: false,
          error: result.error,
        }),
      });

      toolRetryCount.set(callKey, tries + 1);

      if (tries + 1 > maxToolRetries) {
        messages.push({
          role: "system",
          content:
            `Tool "${decision.name}" failed repeatedly for the same input. ` +
            `Do NOT call it again with the same input; change strategy or answer.`,
        });
      }
    }
  }

  return {
    ok: false,
    answer: `Max steps (${maxSteps}) reached without a final answer.`,
    steps: maxSteps,
  };
};
