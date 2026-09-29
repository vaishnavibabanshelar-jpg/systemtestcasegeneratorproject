# Testcase Generator Agent

A Next.js web application that turns pasted or uploaded requirements into editable manual test cases plus Playwright UI/API test templates.

## Setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and set `OPENAI_API_KEY`.
3. Run `npm run dev`, then open the displayed local URL.

The OpenAI key is read exclusively by the server route. The app does not persist requirements, uploads, or generated content. It accepts TXT, Markdown, DOCX, and text-based PDF uploads up to 5 MB.

## Checks

Run `npm run typecheck` and `npm run build` before deployment.

Generated automation is deliberately project-neutral. Review its assumptions and replace every `TODO` or configuration placeholder before running it against a real system.
