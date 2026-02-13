# Agent Playground (TypeScript)

A minimal TypeScript playground for experimenting with **LLM agent design patterns**.

This project is intentionally small, dependency-light, and focused on understanding how agent loops actually work under the hood.

It allows you to experiment with:

- Tool-using LLM pattern
- ReAct loops
- Planner → Executor
- Reflection (draft → critique → revise)
- Multi-agent setups
- Memory integration
- Ollama-based local models

---

## Philosophy

This is **not a framework**.

It is a learning playground where you:

- Control the loop
- Control the prompts
- Control the tool calls
- Understand every moving part

No hidden abstractions.

---

# Architecture Overview

The project is split into clear layers:

```
core/
  types, tool registry, tracer, memory

llm/
  LlmClient interface
  Ollama implementation
  Mock implementation

tools/
  Small, isolated, side-effect tools

patterns/
  Agent design patterns (Tool-using LLM, ReAct, etc.)

runs/
  Concrete runnable demos
```

Core loop:

```
User Prompt
   ↓
Agent Loop
   ↓
LLM decides:
   - return final answer
   - call tool
   ↓
Tool execution
   ↓
Result injected back into context
   ↓
Repeat
```

---

# Getting Started

## 1. Install dependencies

```bash
corepack enable
yarn install
```

If you haven't added TypeScript yet:

```bash
yarn add -D typescript @types/node
```

---

## 2. Build

```bash
yarn build
```

---

## 3. Run (Mock LLM)

```bash
yarn start
```

This uses a deterministic mock model for predictable behavior.

---

# Using Ollama (Real Local Model)

## 1. Install Ollama

Download from:

https://ollama.com

Verify installation:

```bash
ollama --version
```

---

## 2. Pull a model

Recommended starter models:

```bash
ollama pull llama3.1
# or
ollama pull qwen2.5
```

---

## 3. Run with Ollama

```bash
USE_OLLAMA=1 OLLAMA_MODEL=llama3.1 yarn build
USE_OLLAMA=1 OLLAMA_MODEL=llama3.1 yarn start
```

Environment variables:

| Variable      | Default                  |
|---------------|--------------------------|
| USE_OLLAMA    | 0                        |
| OLLAMA_MODEL  | llama3.1                 |
| OLLAMA_URL    | http://127.0.0.1:11434   |

---

# Implemented Pattern: Tool-Using LLM

This is the simplest agent pattern:

1. LLM receives prompt + tool descriptions.
2. LLM returns a JSON decision:
    - `{"type":"tool", ...}`
    - `{"type":"final", ...}`
3. Agent executes the tool if requested.
4. Tool result is appended to context.
5. Loop continues until a final answer is produced.

Example tool decision:

```json
{ "type": "tool", "name": "calc", "input": { "expression": "2+2" } }
```

Example final decision:

```json
{ "type": "final", "answer": "The total is 123.45" }
```

---

# Adding a New Tool

Create a file in `tools/`:

```ts
export const createMyTool = (): Tool => ({
  name: 'my_tool',
  description: 'What it does',
  invoke: async (input) => {
    return { ok: true, data: { result: 42 } }
  }
})
```

Register it:

```ts
const tools = createToolRegistry([
  createCalcTool(),
  createMyTool()
])
```

---

# Adding a New Agent Pattern

Create a new file inside:

```
patterns/
```

Export a function like:

```ts
export const runMyAgent = async (...) => {
  // agent loop logic here
}
```

Then create a runner inside:

```
runs/
```

And import it from `index.ts`.

---

# Linting & Formatting

If using Biome:

```bash
yarn lint
yarn format
yarn check
```

If using ESLint + Prettier:

```bash
yarn lint
yarn lint:fix
yarn format
```

---

# Suggested Experiments

1. Make the model compute VAT using a tool.
2. Add a `read_text_file` tool and summarize a file.
3. Add a memory store and persist previous answers.
4. Add JSON repair logic when parsing fails.
5. Implement the ReAct pattern.
6. Add a reflection loop.
7. Add a Planner → Executor split.

---

# Why This Exists

Modern “AI agents” are often just:

- LLM
- Tool calls
- Loop
- Context management

Understanding this loop deeply gives you:

- Better architectural decisions
- Easier production debugging
- A realistic mental model of agent limitations

---

# Next Steps

- Implement ReAct pattern
- Add reflection-based self-improvement
- Add structured evaluation
- Introduce long-term memory
- Build a multi-agent architecture

---

Built for experimentation and learning.
