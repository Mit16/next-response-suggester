import type {
  ConversationGoal,
  ConversationInput,
  ConversationContext,
} from "../types/conversation.types.js";

import type { AIMessage } from "../providers/provider.interface.js";

import {
  ANALYZER_SYSTEM_PROMPT,
  GENERATOR_SYSTEM_PROMPT,
} from "./system.prompt.js";

import { getVibePrompt } from "./vibe.prompts.js";

const GOAL_PROMPTS: Record<ConversationGoal, string> = {
  continue_conversation: `
Continue the conversation naturally.
Build on the latest message and introduce a relevant conversational direction.
`,

  get_to_know_person: `
Help the user learn something meaningful about the other person.
Use relevant, natural questions rather than conducting an interview.
`,

  respond_to_dry_reply: `
Respond appropriately to a short or low-effort reply.
Avoid sounding desperate, demanding, or frustrated.
Do not force the other person to continue the conversation.
`,

  recover_from_awkward_silence: `
Help restart the conversation naturally after a pause.
Use shared context or introduce a relevant new topic.
Avoid drawing unnecessary attention to the silence.
`,

  make_them_laugh: `
Try to create a lighthearted moment using relevant humor.
Prioritize natural, situational humor over generic jokes.
`,

  show_empathy: `
Acknowledge the other person's feelings and respond with care.
Avoid minimizing their experience or making the conversation about yourself.
`,

  give_compliment: `
Give a genuine, contextually appropriate compliment.
Avoid excessive flattery, objectification, or artificial praise.
`,

  ask_out: `
Express interest in spending time together.
Make the invitation clear, relaxed, and easy to decline.
Never create pressure or imply that the other person owes an acceptance.
`,

  end_conversation: `
Help the user close the conversation politely and naturally.
Avoid introducing unnecessary new topics or questions.
`,
};

function serializeConversation(input: ConversationInput) {
  return input.messages.map((message) => ({
    role: message.role,
    content: message.content,
    ...(message.timestamp
      ? { timestamp: message.timestamp }
      : {}),
  }));
}

export function buildAnalyzerMessages(
  input: ConversationInput,
): AIMessage[] {
  const conversation = serializeConversation(input);

  return [
    {
      role: "system",
      content: ANALYZER_SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: JSON.stringify({
        task: "Analyze the following conversation.",
        conversation,
      }),
    },
  ];
}

export function buildGeneratorMessages(
  input: ConversationInput,
  context: ConversationContext,
): AIMessage[] {
  const vibe = input.requestedVibe ?? "normal";
  const goal = input.requestedGoal ?? "continue_conversation";

  const systemPrompt = [
    GENERATOR_SYSTEM_PROMPT,
    "\nREQUESTED VIBE GUIDANCE:",
    getVibePrompt(vibe),
    "\nCONVERSATIONAL GOAL:",
    GOAL_PROMPTS[goal],
  ].join("\n");

  const userPayload = {
    task: "Generate exactly three context-aware response suggestions.",
    conversation: serializeConversation(input),
    analyzedContext: context,
    requestedVibe: vibe,
    requestedGoal: goal,
  };

  return [
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "user",
      content: JSON.stringify(userPayload),
    },
  ];
}