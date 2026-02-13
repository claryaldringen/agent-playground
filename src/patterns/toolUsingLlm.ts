/*
 * Easiest agent pattern: LLM decides whether to call a tool or answer directly.
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

type ToolUsingLlmArgs = {
  llm: Llm;
  tools: Tool[];
  userPrompt: string;
  maxSteps?: number;
};

export const run = async (args: ToolUsingLlmArgs) => {
  const maxSteps = args.maxSteps ?? 6;

  const toolList = args.tools
    .map((tool) => ` - ${tool.name}: ${tool.description}`)
    .join("\n");

  const messages: string[] = [];
  messages.push(`USER: ${args.userPrompt}`);

  for(let step = 1; step < maxSteps; step++) {
    const prompt = [
      `You are a tool-using assistant.`,
      ``,
      `AVAILABLE TOOLS:`,
      toolList || "(none)",
      ``,
      `RULES:`,
      ` - If you need a tool, return ONLY valid JSON: {"type":"tool","name":"toolName","input":{...}}`,
      ` - If you can answer now, return ONLY valid JSON: {"type":"final","answer":"..."} `,
      ` - No extra text, no markdown.`,
      ``,
      `CONTEXT:`,
      messages.join("\n"),
    ].join("\n");

    const llmText = await args.llm.generate(prompt);

    let decision: AgentDecision;
    try {
      decision = parseDecision(llmText);
    } catch (e) {
      messages.push(
        `SYSTEM: Your last output was invalid JSON. Error: ${String(e)}`,
      );
      messages.push(
        `SYSTEM: Output MUST be strictly one of the two JSON shapes.`,
      );
      continue;
    }

    if(decision.type === "final") {
      return { ok: true, answer: decision.answer, steps: step };
    }

    const tool = args.tools.find(({name}) => name === decision.name)

    if(!tool) {
      messages.push(
        `SYSTEM: The tool "${decision.name}" is not in list of tools.`,
      );
      continue;
    }

    const result = await tool.invoke(decision.input);

    messages.push(
      `ASSISTANT: {"type":"tool","name":"${decision.name}","input":${JSON.stringify(decision.input)}}`,
    );
    messages.push(
      `TOOL_RESULT(${decision.name}): ${result.ok ? JSON.stringify(result.data) : `ERROR: ${result.error}`}`,
    );
  }

  return {
    ok: false,
    answer: `Max steps (${maxSteps}) reached without a final answer.`,
    steps: maxSteps,
  };
};
