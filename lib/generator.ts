import OpenAI from "openai";
import { generationResultSchema, type OutputType } from "./schema";

const responseFormat = {
  type: "json_schema",
  name: "test_generation",
  strict: true,
  schema: {
    type: "object", additionalProperties: false,
    required: ["schemaVersion", "requirementSummary", "assumptions", "ambiguities", "warnings", "manualCases", "automationArtifacts"],
    properties: {
      schemaVersion: { type: "string", enum: ["1"] }, requirementSummary: { type: "string" },
      assumptions: { type: "array", items: { type: "string" } }, ambiguities: { type: "array", items: { type: "string" } }, warnings: { type: "array", items: { type: "string" } },
      manualCases: { type: "array", items: { type: "object", additionalProperties: false, required: ["id", "feature", "title", "description", "preconditions", "priority", "category", "steps", "expectedResult", "sourceRequirements"], properties: {
        id: { type: "string" }, feature: { type: "string" }, title: { type: "string" }, description: { type: "string" }, preconditions: { type: "array", items: { type: "string" } }, priority: { type: "string", enum: ["high", "medium", "low"] }, category: { type: "string", enum: ["positive", "negative", "boundary", "validation", "error_handling", "accessibility_smoke"] }, steps: { type: "array", items: { type: "string" } }, expectedResult: { type: "string" }, sourceRequirements: { type: "array", items: { type: "string" } }
      } } },
      automationArtifacts: { type: "array", items: { type: "object", additionalProperties: false, required: ["id", "type", "filename", "title", "sourceRequirements", "assumptions", "requiredConfiguration", "source"], properties: {
        id: { type: "string" }, type: { type: "string", enum: ["playwright_ui", "playwright_api"] }, filename: { type: "string" }, title: { type: "string" }, sourceRequirements: { type: "array", items: { type: "string" } }, assumptions: { type: "array", items: { type: "string" } }, requiredConfiguration: { type: "array", items: { type: "string" } }, source: { type: "string" }
      } } }
    }
  }
} as const;

export async function generateTests(input: { requirements: string; feature: string; depth: string; outputs: OutputType[] }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_NOT_CONFIGURED");
  const client = new OpenAI({ apiKey, timeout: 60_000, maxRetries: 1 });
  const requested = input.outputs.join(", ");
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    instructions: "You are a senior test engineer. Generate only the requested test outputs. Ground every item in supplied requirements. Never invent concrete URLs, credentials, selectors, endpoints, payload fields, or product behavior. Record gaps as ambiguities and uncertain details as assumptions. For Playwright code use @playwright/test, environment variables and TODO comments for unknown project values. Return strict JSON matching the supplied schema.",
    input: `Feature: ${input.feature || "Unspecified feature"}\nDepth: ${input.depth}\nRequested outputs: ${requested}\n\nRequirements:\n${input.requirements}`,
    text: { format: responseFormat }
  });
  if (!response.output_text) throw new Error("EMPTY_MODEL_RESPONSE");
  return generationResultSchema.parse(JSON.parse(response.output_text));
}
