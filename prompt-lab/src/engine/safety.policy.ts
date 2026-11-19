
import type {
    ConversationContext,
    ConversationGoal,
    ConversationInput,
    ConversationVibe,
} from "../types/conversation.types.js";

/**
 * Signals recognized by the deterministic safety policy.
 */
export type SafetySignal =
    | "romantic_rejection"
    | "emotional_distress"
    | "ambiguous_boundary";

/**
 * A conversation can either proceed with adjusted generation settings
 * or be blocked entirely.
 */
export type SafetyDecision =
    | {
        action: "no_action";
        reason: string;
        triggeredBy: "explicit_no_contact";
    }
    | {
        action: "allow";
        effectiveVibe: ConversationVibe;
        effectiveGoal: ConversationGoal;
        blockedVibes: ConversationVibe[];
        constraints: string[];
        signals: SafetySignal[];
    };

/**
 * These expressions intentionally target explicit language.
 * Broad words such as "stop" or "no" are not sufficient by themselves.
 */
const NO_CONTACT_PATTERNS: RegExp[] = [
    /\b(?:please\s+)?do\s+not\s+(?:contact|message|text|call|reach\s+out)\s+me\b/i,
    /\b(?:please\s+)?don't\s+(?:ever\s+)?(?:contact|message|text|call|reach\s+out)\s+me\b/i,
    /\b(?:please\s+)?stop\s+(?:contacting|messaging|texting|calling)\s+me\b/i,
    /\bi\s+want\s+you\s+to\s+stop\s+(?:contacting|messaging|texting|calling)\s+me\b/i,
    /\bleave\s+me\s+alone\b/i,
    /\bnever\s+(?:contact|message|text|call)\s+me\s+again\b/i,
    /\bno\s+more\s+(?:messages|texts|calls|contact)\b/i,
    /\bdon't\s+reach\s+out\s+to\s+me\s+again\b/i,
];

const ROMANTIC_REJECTION_PATTERNS: RegExp[] = [
    /\bi(?:'m| am)\s+not\s+interested\s+in\s+you\b/i,
    /\bi\s+don't\s+(?:feel\s+the\s+same|see\s+you\s+that\s+way)\b/i,
    /\bi\s+only\s+see\s+you\s+as\s+a\s+friend\b/i,
    /\bi\s+just\s+want\s+to\s+be\s+friends\b/i,
    /\blet's\s+just\s+be\s+friends\b/i,
    /\bwe(?:'re| are)\s+better\s+as\s+friends\b/i,
    /\bi(?:'m| am)\s+not\s+looking\s+for\s+a\s+relationship\b/i,
    /\bi(?:'m| am)\s+not\s+romantically\s+interested\b/i,
    /\bplease\s+don't\s+flirt\s+with\s+me\b/i,
    /\bstop\s+flirting\s+with\s+me\b/i,
    /\bi\s+don't\s+want\s+to\s+date\s+you\b/i,
];


const EMOTIONAL_DISTRESS_PATTERNS: RegExp[] = [
    /\bi(?:'m| am)\s+(?:(?:feeling|getting)\s+)?(?:(?:really|very|so|extremely)\s+)?(?:depressed|hopeless|overwhelmed|devastated)\b/i,

    /\bi(?:'ve| have)\s+been\s+(?:(?:feeling|getting)\s+)?(?:(?:really|very|so|extremely)\s+)?(?:depressed|hopeless|overwhelmed|devastated)\b/i,

    /\bi(?:'m| am)\s+struggling\b/i,
    /\bi\s+can't\s+cope\b/i,
    /\bi\s+can't\s+handle\s+(?:this|it|anything)\b/i,
    /\bi\s+feel\s+(?:hopeless|empty|broken|worthless)\b/i,
    /\bi(?:'m| am)\s+(?:really\s+)?(?:sad|upset|heartbroken)\b/i,
    /\bi(?:'ve| have)\s+been\s+crying\b/i,
    /\bi\s+lost\s+(?:someone|my\s+(?:mom|mother|dad|father|friend|partner))\b/i,
    /\b(?:my|our)\s+(?:mom|mother|dad|father|friend|partner)\s+(?:died|passed\s+away)\b/i,
    /\bi\s+had\s+a\s+panic\s+attack\b/i,
    /\bi(?:'m| am)\s+having\s+a\s+hard\s+time\b/i,
];


const EMOTIONAL_CONTEXT_PATTERNS: RegExp[] = [
    /\b(?:sounds?|seems?|appears?)\s+(?:really\s+|very\s+)?(?:depressed|hopeless|overwhelmed|devastated)\b/i,
    /\b(?:emotional\s+)?distress\b/i,
    /\bexperiencing\s+(?:emotional\s+)?distress\b/i,
];



const AMBIGUOUS_BOUNDARY_PATTERNS: RegExp[] = [
    /\bi(?:'m| am)\s+not\s+sure\s+about\s+(?:us|this|you)\b/i,
    /\bi\s+need\s+time\s+to\s+think\b/i,
    /\bi\s+need\s+some\s+space\b/i,
    /\bi(?:'m| am)\s+confused\s+about\s+my\s+feelings\b/i,
    /\bi\s+don't\s+know\s+what\s+i\s+want\b/i,
    /\bmy\s+feelings\s+are\s+complicated\b/i,
    /\bmixed\s+feelings\b/i,
];

const BLOCKED_ROMANTIC_VIBES: ConversationVibe[] = [
    "flirty",
    "romantic",
];

const BLOCKED_DISTRESS_VIBES: ConversationVibe[] = [
    "funny",
    "sarcastic",
    "flirty",
    "romantic",
];

const BLOCKED_AMBIGUOUS_VIBES: ConversationVibe[] = [
    "flirty",
    "romantic",
];

function matchesAny(
    text: string,
    patterns: RegExp[],
): boolean {
    return patterns.some((pattern) => pattern.test(text));
}

/**
 * Returns the latest message sent by the other person.
 *
 * A later message can reopen a conversation, so we avoid treating
 * an old message as a permanent boundary.
 */
function getLatestOtherMessage(
    input: ConversationInput,
): string {
    for (let index = input.messages.length - 1; index >= 0; index--) {
        const message = input.messages[index];

        if (message?.role === "other") {
            return message.content;
        }
    }

    return "";
}

/**
 * Analyzed boundary signals can reinforce a decision, but raw
 * conversation messages remain the primary evidence.
 */
function getBoundarySignalText(
    context: ConversationContext,
): string {
    return context.boundarySignals.join(" ");
}

/**
 * Deterministic safety policy.
 *
 * This class does not depend on an AI provider and can be tested
 * independently from the inference pipeline.
 */
export class SafetyPolicy {
    evaluate(
        input: ConversationInput,
        context: ConversationContext,
    ): SafetyDecision {
        const latestOtherMessage = getLatestOtherMessage(input);
        const boundarySignalText = getBoundarySignalText(context);

        // Rule 1: Explicit no-contact requests always block generation.
        const explicitNoContact =
            matchesAny(latestOtherMessage, NO_CONTACT_PATTERNS) ||
            matchesAny(boundarySignalText, NO_CONTACT_PATTERNS);

        if (explicitNoContact) {
            return {
                action: "no_action",
                reason:
                    "The other person has explicitly requested no further contact.",
                triggeredBy: "explicit_no_contact",
            };
        }

        const signals: SafetySignal[] = [];
        const blockedVibes = new Set<ConversationVibe>();
        const constraints: string[] = [];

        let effectiveVibe =
            input.requestedVibe ?? "normal";

        let effectiveGoal =
            input.requestedGoal ?? "continue_conversation";

        // Rule 2: Romantic rejection blocks romantic pursuit.
        const romanticRejection =
            matchesAny(
                latestOtherMessage,
                ROMANTIC_REJECTION_PATTERNS,
            ) ||
            matchesAny(
                boundarySignalText,
                ROMANTIC_REJECTION_PATTERNS,
            );

        if (romanticRejection) {
            signals.push("romantic_rejection");

            for (const vibe of BLOCKED_ROMANTIC_VIBES) {
                blockedVibes.add(vibe);
            }

            constraints.push(
                "Do not pursue romantic or flirtatious interaction.",
                "Respect the rejection without trying to change the other person's mind.",
            );

            if (BLOCKED_ROMANTIC_VIBES.includes(effectiveVibe)) {
                effectiveVibe = "normal";
            }

            if (effectiveGoal === "ask_out") {
                effectiveGoal = "continue_conversation";
            }
        }

        // Rule 3: Emotional distress prioritizes empathy.

        // Rule 3: Emotional distress prioritizes empathy.
        const distressText = [
            latestOtherMessage,
            context.emotionalTone,
            context.intent,
            context.summary,
        ].join(" ");

        const emotionalDistress =
            matchesAny(
                latestOtherMessage,
                EMOTIONAL_DISTRESS_PATTERNS,
            ) ||
            matchesAny(
                distressText,
                EMOTIONAL_CONTEXT_PATTERNS,
            );

        if (emotionalDistress) {
            signals.push("emotional_distress");

            for (const vibe of BLOCKED_DISTRESS_VIBES) {
                blockedVibes.add(vibe);
            }

            constraints.push(
                "Respond with empathy and emotional sensitivity.",
                "Avoid humor, sarcasm, flirting, and romantic escalation.",
                "Do not minimize or dismiss the other person's feelings.",
            );

            effectiveVibe = "caring";

            if (effectiveGoal !== "end_conversation") {
                effectiveGoal = "show_empathy";
            }
        }


        // Rule 4: Ambiguous boundaries require conservative interaction.
        const ambiguousBoundary =
            matchesAny(
                latestOtherMessage,
                AMBIGUOUS_BOUNDARY_PATTERNS,
            ) ||
            matchesAny(
                boundarySignalText,
                AMBIGUOUS_BOUNDARY_PATTERNS,
            );

        if (
            ambiguousBoundary ||
            context.engagementLevel === "uncertain"
        ) {
            signals.push("ambiguous_boundary");

            for (const vibe of BLOCKED_AMBIGUOUS_VIBES) {
                blockedVibes.add(vibe);
            }

            constraints.push(
                "Do not assume romantic interest or interpret uncertainty as consent.",
                "Keep the response respectful and avoid pressuring the other person.",
            );

            if (
                BLOCKED_AMBIGUOUS_VIBES.includes(effectiveVibe)
            ) {
                effectiveVibe = "normal";
            }

            if (effectiveGoal === "ask_out") {
                effectiveGoal = "continue_conversation";
            }
        }

        // Rule 5: Safety restrictions override requested preferences.
        if (blockedVibes.has(effectiveVibe)) {
            effectiveVibe = "normal";
        }

        return {
            action: "allow",
            effectiveVibe,
            effectiveGoal,
            blockedVibes: [...blockedVibes],
            constraints,
            signals,
        };
    }
}
