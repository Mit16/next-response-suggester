
import { z } from "zod";

const ConversationMessageSchema = z.object({
  role: z.enum(["self", "other"]),
  content: z.string().trim().min(1).max(2000),
  timestamp: z.string().datetime().optional(),
});

const ExpectedContextSchema = z.object({
  emotionalTone: z.string().min(1),
  intent: z.string().min(1),
  engagementLevel: z.enum([
    "low",
    "moderate",
    "high",
    "uncertain",
  ]),
  topic: z.string().min(1),
  conversationStage: z.enum([
    "opening",
    "getting_to_know",
    "ongoing",
    "deepening",
    "closing",
    "uncertain",
  ]),
  conversationDirection: z.string().min(1),
  boundarySignals: z.array(z.string()),
});


export const ConversationScenarioSchema = z
  .object({
    id: z.string().regex(/^SC\d{3}$/),
    category: z.string().min(1),
    description: z.string().min(1),
    messages: z.array(ConversationMessageSchema).min(2),
    expectedContext: ExpectedContextSchema,
    expectedBehavior: z.array(z.string().min(1)).min(1),
    evaluationCriteria: z.array(z.string().min(1)).min(1),
  })
  .superRefine((scenario, ctx) => {
    const lastMessage = scenario.messages.at(-1);

    if (lastMessage?.role !== "other") {
      ctx.addIssue({
        code: "custom",
        path: ["messages"],
        message: "The final message must be from 'other'.",
      });
    }
  });


export const ConversationDatasetSchema = z
  .array(ConversationScenarioSchema)
  .min(1)
  .superRefine((scenarios, ctx) => {
    const ids = new Set<string>();

    scenarios.forEach((scenario, index) => {
      if (ids.has(scenario.id)) {
        ctx.addIssue({
          code: "custom",
          path: [index, "id"],
          message: `Duplicate scenario ID: ${scenario.id}`,
        });
      }

      ids.add(scenario.id);
    });
  });

export type ValidatedConversationScenario = z.infer<
  typeof ConversationScenarioSchema
>;
