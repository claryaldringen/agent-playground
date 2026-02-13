import { calc } from "./tools/calc";
import { run } from "./patterns/toolUsingLlm";
import { createMockLlm } from "./llm/mockLlm";

const main = async () => {
  const tools = [calc];
  const llm = createMockLlm();

  const result = await run({
    tools,
    llm,
    userPrompt:
      "Compute VAT (DPH) for net 123.45 at 19% and add shipping 6.90.",
    maxSteps: 3
  });

  console.log(result);
};

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
