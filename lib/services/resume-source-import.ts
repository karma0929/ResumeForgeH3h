import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import { ValidationError } from "@/lib/errors";

const MAX_FILE_BYTES = 8 * 1024 * 1024;

function normalizeText(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extensionFromName(name: string) {
  const index = name.lastIndexOf(".");
  if (index < 0) return "";
  return name.slice(index + 1).toLowerCase();
}

function detectFileKind(file: File): "pdf" | "docx" | "txt" | "unknown" {
  const ext = extensionFromName(file.name);
  const mime = (file.type || "").toLowerCase();

  if (ext === "pdf" || mime.includes("pdf")) return "pdf";
  if (
    ext === "docx" ||
    mime.includes("wordprocessingml.document") ||
    mime.includes("application/msword")
  ) {
    return "docx";
  }
  if (ext === "txt" || mime.startsWith("text/plain")) return "txt";
  return "unknown";
}

export async function extractResumeTextFromSource(input: {
  file?: File | null;
  pastedText?: string;
}) {
  const pastedText = normalizeText(input.pastedText ?? "");
  const file = input.file ?? null;

  if (!file || file.size <= 0) {
    if (pastedText.length < 40) {
      throw new ValidationError("Upload a PDF, DOCX, TXT file or paste resume text.");
    }
    return pastedText;
  }

  if (file.size > MAX_FILE_BYTES) {
    throw new ValidationError("Resume file is too large. Maximum size is 8 MB.");
  }

  const kind = detectFileKind(file);
  if (kind === "unknown") {
    throw new ValidationError("Unsupported file type. Please upload PDF, DOCX, or TXT.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let extracted = "";

  if (kind === "pdf") {
    const parsed = await pdfParse(buffer);
    extracted = parsed.text ?? "";
  } else if (kind === "docx") {
    const parsed = await mammoth.extractRawText({ buffer });
    extracted = parsed.value ?? "";
  } else {
    extracted = buffer.toString("utf-8");
  }

  const normalized = normalizeText(extracted);
  if (normalized.length < 40) {
    if (pastedText.length >= 40) {
      return pastedText;
    }
    throw new ValidationError("Extracted text is too short. Please paste more complete resume text.");
  }

  return normalized;
}
