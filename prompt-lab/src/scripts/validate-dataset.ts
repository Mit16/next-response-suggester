
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ConversationDatasetSchema } from "../schemas/scenario.schema.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));

const datasetPath = resolve(
  currentDirectory,
  "../../scenarios/conversations.json"
);

function validateDataset(): void {
  console.log("\n==================================");
  console.log("  CONVERSATION DATASET VALIDATOR");
  console.log("==================================\n");

  let rawData: string;

  try {
    rawData = readFileSync(datasetPath, "utf-8");
  } catch (error) {
    console.error("Failed to read dataset:", error);
    process.exitCode = 1;
    return;
  }

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(rawData);
  } catch (error) {
    console.error("Invalid JSON:", error);
    process.exitCode = 1;
    return;
  }

  const result = ConversationDatasetSchema.safeParse(parsedJson);

  if (!result.success) {
    console.error("Dataset validation failed:\n");

    for (const issue of result.error.issues) {
      const location = issue.path.join(".");

      console.error(`- ${location}: ${issue.message}`);
    }

    process.exitCode = 1;
    return;
  }

  const scenarios = result.data;

  const categoryCounts = scenarios.reduce<Record<string, number>>(
    (counts, scenario) => {
      counts[scenario.category] =
        (counts[scenario.category] ?? 0) + 1;

      return counts;
    },
    {}
  );

  console.log("Dataset validation successful.\n");

  console.log(`Total scenarios: ${scenarios.length}`);
  console.log(
    `Unique IDs: ${new Set(scenarios.map((item) => item.id)).size}`
  );
  console.log(
    `Categories: ${Object.keys(categoryCounts).length}`
  );

  console.log("\nCategory distribution:");

  for (const [category, count] of Object.entries(categoryCounts)) {
    console.log(`  ${category}: ${count}`);
  }

  console.log("\nAll scenarios passed validation.");
}

validateDataset();
