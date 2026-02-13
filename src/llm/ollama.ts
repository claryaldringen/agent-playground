import { Llm } from "../core/types";

type OllamaGenerateResponse = {
  response: string;
};

export const createOllamaLlm = (args: {
  model: string;
  baseUrl?: string;
  temperature?: number;
}) => {
  const baseUrl = args.baseUrl ?? "http://127.0.0.1:11434";
  const temperature = args.temperature ?? 0.2;

  const llm: Llm = {
    generate: async (prompt: string) => {
      const res = await fetch(`${baseUrl}/api/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: args.model,
          prompt,
          stream: false,
          options: { temperature },
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          `Ollama error: ${res.status} ${res.statusText} ${text}`,
        );
      }

      const json = (await res.json()) as OllamaGenerateResponse;
      return json.response ?? "";
    },
  };

  return llm;
};
