
import { performance } from "node:perf_hooks";

import { env } from "../config/env.js";
// import { PoeProvider } from "../providers/poe.provider.js";
import { GroqProvider } from "../providers/groq.provider.js"
import { AIProviderError } from "../providers/provider.interface.js";

async function main(): Promise<void> {
    if (env.AI_PROVIDER !== "groq") {
        throw new Error(
            "This smoke test is configured specifically for the Groq provider."
        );
    }

    // const provider = new PoeProvider(env.POE_API_KEY);
    // const model = env.POE_MODEL;

    const provider = new GroqProvider(env.GROQ_API_KEY);
    const model = env.GROQ_MODEL;

    console.log("\n=================================");
    console.log("   GROQ PROVIDER SMOKE TEST");
    console.log("=================================");
    console.log(`Provider: ${provider.name}`);
    console.log(`Model: ${model}`);
    console.log("\nSending test request...\n");

    const startTime = performance.now();

    try {
        const result = await provider.generate({
            model,
            messages: [
                {
                    role: "system",
                    content:
                        "You are a connectivity test assistant. Follow instructions exactly.",
                },
                {
                    role: "user",
                    content: "Reply with exactly: GROQ_CONNECTION_OK",
                },
            ],
            temperature: 0,
            maxTokens: 512,
            responseFormat: "text",
        });

        const latencyMs = Math.round(performance.now() - startTime);

        if (!result.content.trim()) {
            throw new Error("Provider returned an empty response.");
        }

        console.log("Provider connectivity successful.");
        console.log("\nResponse:");
        console.log(result.content.trim());

        console.log("\nMetrics:");
        console.log(`Provider: ${provider.name}`);
        console.log(`Requested model: ${model}`);
        console.log(`Returned model: ${result.model}`);
        console.log(`Latency: ${latencyMs} ms`);
        console.log(`Prompt tokens: ${result.usage.promptTokens}`);
        console.log(`Completion tokens: ${result.usage.completionTokens}`);
        console.log(`Total tokens: ${result.usage.totalTokens}`);
        console.log(`Finish reason: ${result.finishReason ?? "unknown"}`);

        console.log("\n=================================");
        console.log("   SMOKE TEST PASSED");
        console.log("=================================\n");
    } catch (error: unknown) {
        console.error("\nSMOKE TEST FAILED.");

        if (error instanceof AIProviderError) {
            console.error(`Provider: ${error.provider}`);
            console.error(`Status code: ${error.statusCode ?? "unknown"}`);
            console.error(`Retryable: ${error.retryable}`);
            console.error(`Error: ${error.message}`);
        } else {
            console.error(
                error instanceof Error ? error.message : "Unknown error.",
            );
        }

        process.exitCode = 1;
    }
}

main().catch(() => {
    console.error("Smoke test terminated unexpectedly.");
    process.exitCode = 1;
});
