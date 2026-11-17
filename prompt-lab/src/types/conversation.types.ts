
export type MessageRole = "self" | "other";

export interface ConversationMessage {
  role: MessageRole;
  content: string;
  timestamp?: string;
}

export type ConversationVibe =
  | "normal"
  | "funny"
  | "playful"
  | "flirty"
  | "romantic"
  | "sarcastic"
  | "caring"
  | "confident"
  | "professional";

export type ConversationGoal =
  | "continue_conversation"
  | "get_to_know_person"
  | "respond_to_dry_reply"
  | "recover_from_awkward_silence"
  | "make_them_laugh"
  | "show_empathy"
  | "give_compliment"
  | "ask_out"
  | "end_conversation";

export type EngagementLevel =
  | "low"
  | "moderate"
  | "high"
  | "uncertain";

export type ConversationStage =
  | "opening"
  | "getting_to_know"
  | "ongoing"
  | "deepening"
  | "closing"
  | "uncertain";

export interface ConversationInput {
  messages: ConversationMessage[];
  requestedVibe?: ConversationVibe;
  requestedGoal?: ConversationGoal;
}

export interface ConversationContext {
  summary: string;
  emotionalTone: string;
  intent: string;
  engagementLevel: EngagementLevel;
  topic: string;
  conversationStage: ConversationStage;
  conversationDirection: string;
  boundarySignals: string[];
}

export interface ResponseSuggestion {
  text: string;
  vibe: ConversationVibe;
  explanation: string;
}

export type SuggestionResult =
  | {
    status: "suggestions";
    context: ConversationContext;
    suggestions: ResponseSuggestion[];
  }
  | {
    status: "no_action";
    context: ConversationContext;
    reason: string;
  };

export interface ExpectedContext {
  emotionalTone: string;
  intent: string;
  engagementLevel: EngagementLevel;
  topic: string;
  conversationStage: ConversationStage;
  conversationDirection: string;
  boundarySignals: string[];
}

export interface ConversationScenario {
  id: string;
  category: string;
  description: string;
  messages: ConversationMessage[];
  expectedContext: ExpectedContext;
  expectedBehavior: string[];
  evaluationCriteria: string[];
}
