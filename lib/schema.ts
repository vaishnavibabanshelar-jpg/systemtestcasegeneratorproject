import { z } from "zod";

export const outputTypes = ["manual", "playwright_ui", "playwright_api"] as const;
export type OutputType = (typeof outputTypes)[number];

export const manualCaseSchema = z.object({
  id: z.string().min(1), feature: z.string(), title: z.string().min(1), description: z.string(),
  preconditions: z.array(z.string()), priority: z.enum(["high", "medium", "low"]),
  category: z.enum(["positive", "negative", "boundary", "validation", "error_handling", "accessibility_smoke"]),
  steps: z.array(z.string()).min(1), expectedResult: z.string().min(1), sourceRequirements: z.array(z.string()).min(1)
});
export const artifactSchema = z.object({
  id: z.string().min(1), type: z.enum(["playwright_ui", "playwright_api"]), filename: z.string().min(1),
  title: z.string().min(1), sourceRequirements: z.array(z.string()).min(1), assumptions: z.array(z.string()),
  requiredConfiguration: z.array(z.string()), source: z.string().min(1)
});
export const generationResultSchema = z.object({
  schemaVersion: z.literal("1"), requirementSummary: z.string(), assumptions: z.array(z.string()),
  ambiguities: z.array(z.string()), warnings: z.array(z.string()), manualCases: z.array(manualCaseSchema),
  automationArtifacts: z.array(artifactSchema)
});
export type GenerationResult = z.infer<typeof generationResultSchema>;
export type ManualTestCase = z.infer<typeof manualCaseSchema>;
export type AutomationArtifact = z.infer<typeof artifactSchema>;
