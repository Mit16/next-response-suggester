
import { describe, expect, it } from "vitest";

import {
    SuggestionResultSchema,
} from "./response.schema.js";

import type {
    ConversationContext,
    ResponseSuggestion,
} from "../types/conversation.types.js";

const context: ConversationContext = {
    summary: "The other person had an exhausting day.",
    emotionalTone: "Tired and slightly drained.",
    intent: "Sharing how their day went.",
    engagementLevel: "moderate",
    topic: "Daily experiences and tiredness.",
    conversationStage: "ongoing",
    conversationDirection:
        "The conversation could move toward empathetic support.",
    boundarySignals: [],
};

const suggestions: ResponseSuggestion[] = [
    {
        text: "Sounds like a long day. Everything okay?",
        vibe: "caring",
        explanation: "Acknowledges their exhaustion.",
    },
    {
        text: "That's rough. Hope you get some time to relax tonight.",
        vibe: "caring",
        explanation: "Offers support without demanding a response.",
    },
    {
        text: "Long day? You deserve a proper break.",
        vibe: "caring",
        explanation: "Keeps the response warm and conversational.",
    },
];

describe("SuggestionResultSchema", () => {
    it("should accept a valid suggestions result with exactly three suggestions", () => {
        const result = {
            status: "suggestions",
            context,
            suggestions,
        };

        const validation = SuggestionResultSchema.safeParse(result);

        expect(validation.success).toBe(true);

        if (validation.success) {
            expect(validation.data.status).toBe("suggestions");

            if (validation.data.status === "suggestions") {
                expect(validation.data.suggestions).toHaveLength(3);
            }
        }
    });

    it("should accept a valid no_action result", () => {
        const result = {
            status: "no_action",
            context,
            reason: "The other person explicitly requested no further contact.",
        };

        const validation = SuggestionResultSchema.safeParse(result);

        expect(validation.success).toBe(true);

        if (validation.success) {
            expect(validation.data.status).toBe("no_action");

            if (validation.data.status === "no_action") {
                expect(validation.data.reason).toBe(
                    "The other person explicitly requested no further contact.",
                );
            }
        }
    });

    it("should reject a suggestions result containing only two suggestions", () => {
        const result = {
            status: "suggestions",
            context,
            suggestions: suggestions.slice(0, 2),
        };

        const validation = SuggestionResultSchema.safeParse(result);

        expect(validation.success).toBe(false);
    });

    it("should reject a no_action result with an empty reason", () => {
        const result = {
            status: "no_action",
            context,
            reason: "",
        };

        const validation = SuggestionResultSchema.safeParse(result);

        expect(validation.success).toBe(false);
    });

    it("should reject an unknown status", () => {
        const result = {
            status: "unknown",
            context,
            suggestions,
        };

        const validation = SuggestionResultSchema.safeParse(result);

        expect(validation.success).toBe(false);
    });

    it("should reject a no_action result containing a suggestions field", () => {
        const result = {
            status: "no_action",
            context,
            reason: "The other person requested no further contact.",
            suggestions,
        };

        const validation = SuggestionResultSchema.safeParse(result);

        expect(validation.success).toBe(false);
    });
});
