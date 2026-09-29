# Test Case Generator Agent — MVP Specification

## 1. Goal

Build a secure web application that converts product requirements into a reviewable test suite containing both structured manual test cases and runnable TypeScript automation artifacts:

- Playwright browser tests for user-interface journeys.
- Playwright API request tests for API-oriented requirements.

The product shortens test-design time while keeping a human reviewer in control. Generated content is a draft: users review, edit, select, export, and download it before using it in a project.

## 2. Users and primary workflow

Primary users are QA engineers, SDETs, developers, product managers, and business analysts with requirements but no complete test suite.

1. The user enters an optional feature name and pastes requirements or uploads a supported document.
2. The application extracts and displays the normalized requirement text for confirmation.
3. The user selects generation depth (`standard` or `thorough`) and applicable outputs (manual cases, Playwright UI, and/or Playwright API).
4. The server asks OpenAI for schema-constrained test design and automation artifacts.
5. The user reviews and edits cases and code, removes unsuitable items, and chooses what to export.
6. The user downloads manual cases as CSV or XLSX and automation artifacts as a ZIP containing a ready-to-adapt TypeScript project layout.

## 3. Scope

### In scope

- Responsive single-page web application.
- Requirement entry by pasted plain text and document upload.
- Initial upload formats: `.txt`, `.md`, `.docx`, and text-based `.pdf`; unsupported, encrypted, scanned-only, or extraction-failed documents produce a clear recovery message.
- Server-side OpenAI integration using Structured Outputs/JSON Schema.
- Generation of positive, negative, boundary, validation, error-handling, accessibility-smoke, Playwright UI, and Playwright API coverage where justified by the supplied requirement.
- Editable manual cases and editable generated test source in the current browser session.
- CSV, XLSX, and ZIP export.
- Requirement-to-test traceability and explicit assumptions/gaps.
- Request validation, rate limiting, timeout handling, privacy-safe logs, and accessible user feedback.

### Explicit MVP limits

- English input and output only.
- No authentication, shared workspaces, saved history, or persistence of requirement contents by default.
- No direct Jira, TestRail, Azure DevOps, GitHub, repository, browser-runtime, or test-execution integration.
- No autonomous approval, merge, commit, or execution of generated code.
- Generated Playwright tests are project-neutral templates. They must use configuration placeholders instead of inventing URLs, credentials, selectors, endpoints, schemas, or business behavior absent from the requirements.
- OCR, images embedded in documents, and spreadsheet uploads are out of scope.

## 4. Functional requirements

### 4.1 Requirement intake

- Require either non-blank pasted requirements or one uploaded document; allow both and combine them in a documented order.
- Accept optional feature/module name and use it for displayed metadata and safe export filenames.
- Limit raw upload size to 5 MB and normalized extracted text to 25,000 characters. Both limits must be configurable server-side.
- Validate MIME type and file signature; never trust the browser-provided extension or content type.
- Extract text server-side, normalize whitespace, retain source markers (for example `Pasted text`, document filename, and page/section where available), then return a preview for user confirmation.
- Do not retain uploads or extracted text after request completion. Process temporary files outside public/static paths and delete them reliably.

### 4.2 Generation request and response

- Let users choose `standard` (default) or `thorough` depth and one or more output types: `manual`, `playwright_ui`, `playwright_api`.
- Send normalized requirements to a server endpoint only; the browser must never receive an OpenAI API key.
- Use an OpenAI model that supports strict structured output. Pin model and schema versions in server configuration.
- Require a schema-valid response with: requirement summary, stated assumptions, uncovered ambiguities, manual cases, UI test artifacts, API test artifacts, and non-fatal warnings.
- Every generated item must cite one or more source requirement references. The agent must label an assumption rather than present it as fact.
- Manual cases must include ID, title, description, preconditions, priority, category, ordered steps, expected result, and source references.
- UI artifacts must include a filename, test title, traceability, required configuration/fixtures, and TypeScript source using `@playwright/test`.
- API artifacts must include the same metadata and TypeScript source using Playwright's `APIRequestContext`; endpoint base URLs, tokens, IDs, and uncertain payload fields must be configuration variables or `TODO` markers.
- Reject malformed, incomplete, oversized, or schema-invalid model responses. Return a generic retryable error; never expose provider response bodies or credentials.
- Do not claim coverage for a behavior not grounded in the requirements. Emit a gap or assumption instead.

### 4.3 Review and editing

- Display a summary with generated count by category/output, assumptions, and requirements that need clarification.
- Show manual cases in a selectable list/detail editor. All export fields, including each ordered step, are editable.
- Show automation artifacts in a selectable code editor/viewer with filename, framework, traceability, assumptions, and editable source.
- Support item deletion, select-all by output type, and regeneration from the same confirmed input. Warn before regeneration replaces edited results.
- Keep all review edits in browser memory only for the active session.

### 4.4 Export

- Export selected manual cases as UTF-8 CSV and XLSX.
- Use this manual-case column order: `Test Case ID`, `Feature`, `Title`, `Description`, `Preconditions`, `Priority`, `Category`, `Steps`, `Expected Result`, `Source Requirement`.
- CSV must follow RFC 4180-compatible escaping and keep multi-step text in one cell using numbered lines.
- XLSX must create one worksheet named `Test Cases`, freeze the header row, wrap long text, and use readable columns.
- Export selected automation artifacts in a ZIP containing:
  - `package.json` with `@playwright/test` scripts and dependencies;
  - `playwright.config.ts` using environment-driven base URL/configuration;
  - `tests/ui/*.spec.ts` and `tests/api/*.spec.ts` as selected;
  - `README.md` explaining required environment variables, assumptions, setup, and how to run the generated tests.
- ZIP and manual export filenames use a sanitized feature slug and ISO date, for example `checkout-test-suite-2026-09-29.zip`.

## 5. Non-functional requirements and constraints

- Implement as a TypeScript full-stack application; the current static prototype may be replaced during implementation.
- Use a shared runtime schema library (for example Zod) for browser/server contracts and model-output validation.
- Keep OpenAI access behind a provider adapter so a future provider change does not affect the domain model or UI.
- Configure `OPENAI_API_KEY` only server-side; validate its presence at startup and redact secrets from all logs/errors.
- Add server-side request-size limits, per-IP rate limiting, an abortable model timeout, concurrency limits, and consistent error envelopes.
- Treat uploaded documents, extracted content, model output, and generated code as untrusted. Never execute generated code; sanitize rendered text and avoid unsafe HTML rendering.
- Collect only minimal non-content operational telemetry if enabled (status, duration, and error class). Never log requirement text, files, model prompts/responses, source code, or credentials in production.
- Meet WCAG 2.1 AA-oriented basics: labeled controls, keyboard operation, visible focus, adequate contrast, semantic headings, and screen-reader status/error announcements.
- Support current Chrome, Edge, Firefox, and Safari desktop browsers; make intake and review usable on current mobile browsers.

## 6. Architecture

Use one TypeScript web application with a browser client and server API. A Next.js-style full-stack framework is the implementation default because it supports secure server routes, streaming/progress-capable UI, shared types, and deployment in one unit. Equivalent TypeScript architecture is acceptable only if it preserves the contracts below.

```text
Browser
  ├─ intake form, upload, and normalized-text confirmation
  ├─ generation options and transient review state
  ├─ manual-case editor / automation-code editor
  └─ CSV, XLSX, and ZIP export
                     │ HTTPS
                     ▼
Server API
  ├─ input/file validation and text extraction
  ├─ request limits, rate limiting, and error mapping
  ├─ prompt builder and OpenAI provider adapter
  ├─ strict response-schema validation and normalization
  └─ no-persistence request lifecycle
                     │
                     ▼
OpenAI API (Structured Outputs)
```

### Domain contract

```ts
type TestCategory =
  | "positive" | "negative" | "boundary" | "validation"
  | "error_handling" | "accessibility_smoke";
type Priority = "high" | "medium" | "low";
type OutputType = "manual" | "playwright_ui" | "playwright_api";

type ManualTestCase = {
  id: string; feature: string; title: string; description: string;
  preconditions: string[]; priority: Priority; category: TestCategory;
  steps: string[]; expectedResult: string; sourceRequirements: string[];
};
type AutomationArtifact = {
  id: string; type: "playwright_ui" | "playwright_api"; filename: string;
  title: string; sourceRequirements: string[]; assumptions: string[];
  requiredConfiguration: string[]; source: string;
};
type GenerationResult = {
  schemaVersion: "1"; requirementSummary: string; assumptions: string[];
  ambiguities: string[]; warnings: string[]; manualCases: ManualTestCase[];
  automationArtifacts: AutomationArtifact[];
};
```

IDs must be stable through review edits. The generation endpoint must be versioned and return a `GenerationResult`; extraction and generation may be separate endpoints to support an explicit text-confirmation step.

## 7. Implementation steps

1. Replace or migrate the static prototype into the selected TypeScript full-stack application. Establish linting, formatting, type checking, unit/integration/E2E test commands, environment documentation, and CI.
2. Define shared Zod schemas for intake, extracted text, generation options, `GenerationResult`, exports, and standard error envelopes. Add server request-size, file-signature, and text-length validation.
3. Implement temporary document ingestion/extraction for TXT, Markdown, DOCX, and text PDFs. Preserve source markers, return confirmation text, and guarantee cleanup on success/failure.
4. Implement the OpenAI provider adapter, prompt builder, strict structured-output schema, timeout/cancellation, response normalization, and redacted error handling. Add prompt rules for traceability, no invented facts, assumptions/gaps, and secure project-neutral generated code.
5. Build the accessible intake/confirmation/generation UI with options, progress, retry, and recoverable error states.
6. Build editable manual-case and automation-artifact review experiences, selection controls, edit-replacement confirmation, and local-session state management.
7. Implement CSV/XLSX export and ZIP project assembly. Unit-test CSV escaping, workbook structure, ZIP file layout, filename sanitization, and generated README/config templates.
8. Add test coverage: schema/validation and extraction tests; mocked OpenAI success, timeout, and malformed-output tests; UI review/edit tests; and an E2E happy path using a mocked provider. Complete accessibility/responsive checks and deployment documentation.

## 8. Success criteria

- A user can paste a valid requirement or upload each supported file type, confirm extracted text, and receive a non-empty schema-valid result without exposing an API key to the browser.
- A requirement with validation and numeric/length limits yields relevant positive plus validation/negative and boundary manual cases, each with traceability.
- When selected, the result includes both UI and API Playwright artifacts with TypeScript syntax, `@playwright/test` imports, and no fabricated concrete URLs, credentials, selectors, or endpoints.
- A user can edit a manual case and a generated source file; the selected exports contain the exact edits.
- CSV opens with commas, quotes, and multi-line steps preserved; XLSX contains a readable `Test Cases` sheet; ZIP contains the documented Playwright project layout and README.
- Blank, oversized, unsupported, extraction-failed, rate-limited, timed-out, provider-failed, and schema-invalid requests yield safe, actionable recovery messages.
- Requirement text, uploads, raw model content, and secrets are not persisted or logged by default; generated code is never executed by the service.
- Automated checks cover API contracts, extraction safety, export behavior, review actions, and the primary end-to-end flow; format, type, lint, and test commands pass.

## 9. Accepted implementation assumptions

- The first automation target is TypeScript with Playwright Test for both browser and API tests.
- OpenAI is the initial provider and is called exclusively from the server using a configured API key.
- The MVP accepts both pasted requirements and the four specified document formats.
- The application is single-user and ephemeral: no account or content persistence is required for the MVP.
