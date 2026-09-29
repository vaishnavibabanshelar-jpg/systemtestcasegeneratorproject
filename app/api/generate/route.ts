import { NextResponse } from "next/server";
import mammoth from "mammoth";
import pdf from "pdf-parse";
import { generateTests } from "@/lib/generator";
import { outputTypes, type OutputType } from "@/lib/schema";

export const runtime = "nodejs";
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_TEXT_LENGTH = 25_000;

function fail(message: string, status: number) { return NextResponse.json({ error: message }, { status }); }
function normalize(value: string) { return value.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim(); }

async function extract(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) throw new Error("The uploaded file exceeds the 5 MB limit.");
  const name = file.name.toLowerCase(); const buffer = Buffer.from(await file.arrayBuffer());
  if (name.endsWith(".txt") || name.endsWith(".md")) return buffer.toString("utf8");
  if (name.endsWith(".docx")) {
    if (buffer.subarray(0, 2).toString() !== "PK") throw new Error("The DOCX file is not valid.");
    return (await mammoth.extractRawText({ buffer })).value;
  }
  if (name.endsWith(".pdf")) {
    if (buffer.subarray(0, 4).toString() !== "%PDF") throw new Error("The PDF file is not valid.");
    return (await pdf(buffer)).text;
  }
  throw new Error("Use a TXT, Markdown, DOCX, or text-based PDF file.");
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const pasted = String(form.get("requirements") || ""); const feature = String(form.get("feature") || "").slice(0, 120);
    const depth = form.get("depth") === "thorough" ? "thorough" : "standard";
    const outputs = String(form.get("outputs") || "manual").split(",").filter((x): x is OutputType => outputTypes.includes(x as OutputType));
    const upload = form.get("file"); const extracted = upload instanceof File && upload.size ? await extract(upload) : "";
    const requirements = normalize([pasted, extracted && `Source file: ${upload instanceof File ? upload.name : "upload"}\n${extracted}`].filter(Boolean).join("\n\n"));
    if (!requirements) return fail("Add requirements or upload a supported document.", 400);
    if (requirements.length > MAX_TEXT_LENGTH) return fail("Requirements must be 25,000 characters or fewer after extraction.", 413);
    if (!outputs.length) return fail("Choose at least one output type.", 400);
    return NextResponse.json({ result: await generateTests({ requirements, feature, depth, outputs }), normalizedRequirements: requirements });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate tests.";
    if (message === "OPENAI_NOT_CONFIGURED") return fail("The server is missing OPENAI_API_KEY. Add it to .env.local and restart.", 503);
    if (message.includes("file") || message.includes("PDF") || message.includes("DOCX") || message.includes("limit")) return fail(message, 400);
    console.error("Generation request failed", error instanceof Error ? error.name : "unknown");
    return fail("Generation failed. Check your configuration and try again.", 502);
  }
}
