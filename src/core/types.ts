export type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [key: string]: Json };

export type ToolResult =
  | { ok: true; data: Json }
  | { ok: false; error: string };

export type Tool = {
  name: string;
  description: string;
  invoke: (input: Json) => Promise<ToolResult>;
};

export type Llm = {
  generate: (prompt: string) => Promise<string>;
}