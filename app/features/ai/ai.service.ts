import { generateText, Output, stepCountIs } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { env } from "@/core/env";
import { SYSTEM_PROMPT } from "./ai.prompt";
import { getTools } from "./tools";
import { chatResponseSchema, type ChatResponse } from "./validations";

const anthropic = createAnthropic({ apiKey: env.ANTHROPIC_API_KEY });

export async function chat(
  question: string,
  orgId: string,
): Promise<ChatResponse> {
  const { output } = await generateText({
    model: anthropic("claude-sonnet-4-6"),
    output: Output.object({ schema: chatResponseSchema }),
    system: SYSTEM_PROMPT,
    prompt: question,
    tools: getTools(orgId),
    stopWhen: stepCountIs(5),
  });

  return output;
}
