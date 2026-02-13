/*
 * Supernailve LLM mock for Tool Using LLM pattern
 */

import { Llm } from "../core/types";

const findLastToolResult = (prompt: string) => {
  const lines = prompt.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith("TOOL_RESULT(")) return line;
  }
  return null;
};

const parseToolResultLine = (line: string) => {
  // line: TOOL_RESULT(calc): {...}  OR  TOOL_RESULT(calc): ERROR: ...
  const m = /^TOOL_RESULT\(([^)]+)\):\s*(.*)$/.exec(line);
  if (!m) return null;
  const tool = m[1];
  const rest = m[2];

  if (rest.startsWith("ERROR:")) {
    return { tool, ok: false as const, error: rest.replace(/^ERROR:\s*/, "") };
  }

  try {
    const data = JSON.parse(rest) as unknown;
    return { tool, ok: true as const, data };
  } catch {
    return {
      tool,
      ok: false as const,
      error: "Failed to parse TOOL_RESULT JSON.",
    };
  }
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export const createMockLlm = (): Llm => {
  const generate = async (prompt: string) => {
    const last = findLastToolResult(prompt);
    if (last) {
      const parsed = parseToolResultLine(last);

      if (!parsed) {
        return JSON.stringify({
          type: "final",
          answer: `Mock: I saw a tool result but couldn't parse it.`,
        });
      }

      if (!parsed.ok) {
        return JSON.stringify({
          type: "final",
          answer: `Mock: Tool "${parsed.tool}" failed: ${parsed.error}`,
        });
      }

      const value = (parsed.data as any)?.value;
      if (typeof value === "number") {
        return JSON.stringify({
          type: "final",
          answer: `Total is ${round2(value).toFixed(2)}`,
        });
      }

      return JSON.stringify({
        type: "final",
        answer: `Mock: Tool "${parsed.tool}" succeeded but result shape is unexpected: ${JSON.stringify(parsed.data)}`,
      });
    }

    if (prompt.includes("VAT") || prompt.includes("DPH")) {
      return JSON.stringify({
        type: "tool",
        name: "calc",
        input: { expression: "(123.45*1.19)+6.90" },
      });
    }

    return JSON.stringify({
      type: "final",
      answer: "Mock: No tool needed.",
    });
  };

  return { generate };
};
