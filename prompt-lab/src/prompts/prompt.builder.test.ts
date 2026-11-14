import { describe, expect, it } from "vitest";

import {
    buildAnalyzerMessages,
    buildGeneratorMessages,
} from "./prompt.builder.js";

import type {
    ConversationContext,
    ConversationInput,
} from "../types/conversation.types.js";

const sampleInput: ConversationInput = {
    messages: [
        {
            role: "self",
            content: "How was your weekend?",
            timestamp: "2026-11-14T10:00:00.000Z",
        },
        {
            role: "other",
            content: "Pretty good, just relaxed at home.",
        },
    ],
};

const sampleContext: ConversationContext = {
    summary: "Two people are having a casual conversation.",
    emotionalTone: "Relaxed and neutral.",
    intent: "The other person is casually sharing their weekend.",
    engagementLevel: "moderate",
    topic: "Weekend activities",
    conversationStage: "getting_to_know",
    conversationDirection: "The conversation can continue naturally.",
    boundarySignals: [],
};

describe("buildAnalyzerMessages", () => {
    it("should return system and user messages", () => {
        const messages = buildAnalyzerMessages(sampleInput);

        expect(messages).toHaveLength(2);
        expect(messages[0].role).toBe("system");
        expect(messages[1].role).toBe("user");
    });

    it("should include the analyzer system prompt", () => {
        const messages = buildAnalyzerMessages(sampleInput);

        expect(messages[0].content).toContain(
            "conversation analysis engine",
        );
    });

    it("should preserve conversation messages and roles", () => {
        const messages = buildAnalyzerMessages(sampleInput);
        const payload = JSON.parse(messages[1].content);

        expect(payload.conversation).toHaveLength(2);
        expect(payload.conversation[0].role).toBe("self");
        expect(payload.conversation[1].role).toBe("other");
        expect(payload.conversation[0].content).toBe(
            "How was your weekend?",
        );
    });

    it("should preserve optional timestamps", () => {
        const messages = buildAnalyzerMessages(sampleInput);
        const payload = JSON.parse(messages[1].content);

        expect(payload.conversation[0].timestamp).toBe(
            "2026-11-14T10:00:00.000Z",
        );

        expect(payload.conversation[1]).not.toHaveProperty("timestamp");
    });

    it("should not include requested vibe or goal in analyzer input", () => {
        const input: ConversationInput = {
            ...sampleInput,
            requestedVibe: "flirty",
            requestedGoal: "ask_out",
        };

        const messages = buildAnalyzerMessages(input);
        const serializedInput = messages[1].content;

        expect(serializedInput).not.toContain("requestedVibe");
        expect(serializedInput).not.toContain("requestedGoal");
        expect(serializedInput).not.toContain("expectedContext");
        expect(serializedInput).not.toContain("expectedBehavior");
    });
});

describe("buildGeneratorMessages", () => {
    it("should return system and user messages", () => {
        const messages = buildGeneratorMessages(
            sampleInput,
            sampleContext,
        );

        expect(messages).toHaveLength(2);
        expect(messages[0].role).toBe("system");
        expect(messages[1].role).toBe("user");
    });

    it("should use normal vibe and continue conversation by default", () => {
        const messages = buildGeneratorMessages(
            sampleInput,
            sampleContext,
        );

        const payload = JSON.parse(messages[1].content);

        expect(payload.requestedVibe).toBe("normal");
        expect(payload.requestedGoal).toBe("continue_conversation");
    });

    it("should include the requested vibe guidance", () => {
        const input: ConversationInput = {
            ...sampleInput,
            requestedVibe: "playful",
        };

        const messages = buildGeneratorMessages(input, sampleContext);

        expect(messages[0].content).toContain(
            "Keep teasing affectionate and respectful.",
        );
    });

    it("should include the requested conversational goal", () => {
        const input: ConversationInput = {
            ...sampleInput,
            requestedGoal: "ask_out",
        };

        const messages = buildGeneratorMessages(input, sampleContext);

        expect(messages[0].content).toContain(
            "Make the invitation clear, relaxed, and easy to decline.",
        );
    });

    it("should include analyzed context in generator input", () => {
        const messages = buildGeneratorMessages(
            sampleInput,
            sampleContext,
        );

        const payload = JSON.parse(messages[1].content);

        expect(payload.analyzedContext).toEqual(sampleContext);
    });

    it("should preserve the original conversation", () => {
        const messages = buildGeneratorMessages(
            sampleInput,
            sampleContext,
        );

        const payload = JSON.parse(messages[1].content);

        expect(payload.conversation).toHaveLength(2);
        expect(payload.conversation[0].content).toBe(
            "How was your weekend?",
        );
        expect(payload.conversation[1].content).toBe(
            "Pretty good, just relaxed at home.",
        );
    });

    it("should not include benchmark evaluation data", () => {
        const messages = buildGeneratorMessages(
            sampleInput,
            sampleContext,
        );

        const serializedInput = messages[1].content;

        expect(serializedInput).not.toContain("expectedContext");
        expect(serializedInput).not.toContain("expectedBehavior");
        expect(serializedInput).not.toContain("evaluationCriteria");
    });
});