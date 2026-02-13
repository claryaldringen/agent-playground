import { Tool } from "../core/types";

export const calc: Tool = {
  name: "calc",
  description:
    'Evaluates arithmetic expression. Input: { "expression": "12*(3+4)" }',
  invoke: async (input) => {
    const expr = (input as any)?.expression;
    if (!expr || typeof expr !== "string") {
      return { ok: false, error: "calc expects { expression: string }" };
    }

    if (!/^[0-9+\-*/().\s]+$/.test(expr)) {
      return { ok: false, error: "Unsupported characters in expression." };
    }

    try {
      const value = Function(`"use sstrict"; return (${expr});`)() as number;
      if (Number.isNaN(value)) {
        return { ok: false, error: "Expression did not evaluate to a number." };
      }
      return { ok: true, data: { value } };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },
};
