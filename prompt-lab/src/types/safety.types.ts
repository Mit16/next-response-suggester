
import type {
  ConversationVibe,
} from "./conversation.types.js";

export interface GenerationSafety {
  blockedVibes: ConversationVibe[];
  constraints: string[];
  signals: string[];
}
