import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";
import { generateBuilderResponse, updateMemoryFromExchange } from "@/lib/gemini";
import type { AttachmentPayload, AttachmentMeta } from "@/types";

const ALLOWED_TEXT_MIMES = new Set([
  "text/plain", "text/markdown", "application/json", "text/csv",
  "text/javascript", "application/javascript",
  "text/jsx", "text/typescript", "text/tsx",
  "text/x-python", "text/html", "text/css",
  "text/x-java", "text/x-c", "text/x-c++",
  "application/sql", "text/yaml", "text/x-yaml",
]);
const ALLOWED_IMAGE_MIMES = new Set([
  "image/png", "image/jpeg", "image/webp",
]);
const MAX_TEXT_SIZE = 200 * 1024; // 200 KB
const MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4 MB
const MAX_ATTACHMENTS = 3;

function validateAttachments(
  attachments: unknown
): { valid: AttachmentPayload[]; error?: string } {
  if (!attachments) return { valid: [] };
  if (!Array.isArray(attachments)) return { valid: [], error: "attachments must be an array." };
  if (attachments.length > MAX_ATTACHMENTS)
    return { valid: [], error: `Maximum ${MAX_ATTACHMENTS} attachments allowed.` };

  const validated: AttachmentPayload[] = [];
  for (const att of attachments) {
    if (!att || typeof att !== "object" || !att.name || !att.type || !att.mimeType || !att.content) {
      return { valid: [], error: "Each attachment must have name, type, mimeType, and content." };
    }
    const { name, type, mimeType, content } = att as AttachmentPayload;

    if (type === "text") {
      if (!ALLOWED_TEXT_MIMES.has(mimeType)) {
        return { valid: [], error: `File type "${mimeType}" is not supported for ${name}. Try .txt, .js, .py, .json, etc.` };
      }
      const sizeBytes = new TextEncoder().encode(content).length;
      if (sizeBytes > MAX_TEXT_SIZE) {
        return { valid: [], error: `${name} exceeds the 200 KB limit for text files.` };
      }
    } else if (type === "image") {
      if (!ALLOWED_IMAGE_MIMES.has(mimeType)) {
        return { valid: [], error: `Image type "${mimeType}" is not supported for ${name}. Try .png, .jpg, or .webp.` };
      }
      // base64 string → approximate original bytes
      const approxBytes = Math.ceil(content.length * 3 / 4);
      if (approxBytes > MAX_IMAGE_SIZE) {
        return { valid: [], error: `${name} exceeds the 4 MB limit for images.` };
      }
    } else {
      return { valid: [], error: `Unsupported attachment type "${type}" for ${name}.` };
    }

    validated.push({ name, type, mimeType, content });
  }
  return { valid: validated };
}

/** Build the augmented user message with text file contents inlined. */
function buildAugmentedMessage(text: string, attachments: AttachmentPayload[]): string {
  const textAttachments = attachments.filter((a) => a.type === "text");
  if (textAttachments.length === 0) return text;

  const blocks = textAttachments.map(
    (a) => `\n--- File: ${a.name} ---\n${a.content}\n--- End of file ---`
  );
  return text + blocks.join("");
}

/** Extract metadata (no content) for storage in SQLite. */
function toMetadata(attachments: AttachmentPayload[]): AttachmentMeta[] {
  return attachments.map((a) => ({
    name: a.name,
    type: a.type,
    size: a.type === "text"
      ? new TextEncoder().encode(a.content).length
      : Math.ceil(a.content.length * 3 / 4),
  }));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, message, attachments: rawAttachments } = body as {
      projectId?: string;
      message?: string;
      attachments?: unknown;
    };

    if (!projectId || !message?.trim()) {
      return NextResponse.json(
        { error: "projectId and message are required." },
        { status: 400 }
      );
    }

    const { valid: attachments, error: attError } = validateAttachments(rawAttachments);
    if (attError) {
      return NextResponse.json({ error: attError }, { status: 400 });
    }

    const project = db.getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const history = db.listMessages(projectId);
    const augmentedMessage = buildAugmentedMessage(message, attachments);
    const attachmentMeta = attachments.length > 0 ? toMetadata(attachments) : undefined;

    db.addMessage({ projectId, role: "user", content: message, attachments: attachmentMeta });

    const { text: aiText, provider } = await generateBuilderResponse(
      history, augmentedMessage, project.domain, undefined, attachments
    );
    const assistantMessage = db.addMessage({
      projectId,
      role: "assistant",
      content: aiText,
      provider,
    });

    const currentMemory = db.getMemory(projectId);

    // Memory update: pass only typed text + attachment names, never file contents or base64
    const memoryText = attachments.length > 0
      ? `${message}\n\n[Attachments: ${attachments.map((a) => a.name).join(", ")}]`
      : message;
    updateMemoryFromExchange(currentMemory, memoryText, aiText)
      .then((updatedMemory) => {
        db.setMemory(projectId, updatedMemory);
      })
      .catch((err) => {
        console.error("Background memory update error:", err);
      });

    return NextResponse.json({ message: assistantMessage, memory: currentMemory });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
