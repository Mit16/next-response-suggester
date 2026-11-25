
import type {
  ConversationVibe,
} from "./conversation.types.js";

export interface GenerationSafety {
  blockedVibes: ConversationVibe[];
  constraints: string[];
  signals: string[];
}

export interface GenerationFeedback {
  attempt: number;
  violations: string[];
}