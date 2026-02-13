import { calc } from "./tools/calc";
import { run } from "./patterns/toolUsingLlm";
import { createMockLlm } from "./llm/mockLlm";
import { createOllamaLlm } from "./llm/ollama";

const main = async () => {
  const tools = [calc];
  const llm = createOllamaLlm({ model: "llama3.1" });

  const result = await run({
    tools,
    llm,
    userPrompt:
      "Při prodeji knihy je komise 60% a manipulační poplatek je 29 Kč. Jaká je prodejní cena, aby komise byla 0 Kč?",
    maxSteps: 6,
  });

  console.log(result);
};

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
