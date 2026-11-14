import type { ConversationVibe } from "../types/conversation.types.js";

export const VIBE_PROMPTS: Record<ConversationVibe, string> = {
  normal: `
Use a natural, balanced conversational tone.
Keep the wording simple, clear, and genuine.
Avoid unnecessary humor, flirting, or exaggerated emotion.
`,

  funny: `
Use light, situational humor where appropriate.
Prefer clever observations, playful exaggeration, or relatable humor.
Do not force jokes into serious or emotionally sensitive conversations.
Avoid insulting, humiliating, or offensive humor.
`,

  playful: `
Use a relaxed, teasing, and energetic conversational style.
A little friendly mischief is welcome.
Keep teasing affectionate and respectful.
Never use personal insecurities or sensitive subjects as material for jokes.
`,

  flirty: `
Use subtle, confident, and respectful flirtation.
Show interest through playful wording or a tasteful compliment.
Avoid sexual pressure, excessive compliments, or premature intimacy.
Do not assume the other person reciprocates romantic interest.
If romantic interest has been rejected or boundaries are present,
do not generate flirtatious messages.
`,

  romantic: `
Use warm, sincere, and emotionally expressive language.
Communicate affection without becoming excessively dramatic.
Avoid artificial declarations of love or emotional dependency.
Match the level of intimacy already established in the conversation.
Never assume a romantic relationship exists.
`,

  sarcastic: `
Use clever, light sarcasm with a conversational edge.
Keep it humorous rather than hostile.
Avoid contempt, personal attacks, passive aggression, or cruelty.
Do not use sarcasm when empathy or emotional support is needed.
`,

  caring: `
Use empathetic, considerate, and reassuring language.
Acknowledge the other person's feelings when relevant.
Show genuine concern without sounding clinical or overly dramatic.
Avoid minimizing problems or immediately trying to fix everything.
Give the other person room to express themselves.
`,

  confident: `
Use direct, self-assured, and composed language.
Communicate clearly without unnecessary hesitation or over-explanation.
Avoid arrogance, entitlement, aggression, or pressure.
Confidence should never come at the expense of respect.
`,

  professional: `
Use clear, respectful, and professional language.
Keep the message concise and appropriately formal.
Avoid slang, excessive emojis, flirtation, and unnecessary humor.
Maintain a cooperative and constructive tone.
`,
};

export function getVibePrompt(vibe: ConversationVibe): string {
  return VIBE_PROMPTS[vibe];
}