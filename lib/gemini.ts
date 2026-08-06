import type { Message, ProjectMemory, VerificationInfo } from "@/types";

const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
const API_KEY = process.env.GEMINI_API_KEY;

interface GeminiContent {
  role: "user" | "model";
  parts: { text: string }[];
}

async function callGemini(
  contents: GeminiContent[],
  systemInstruction?: string
): Promise<string> {
  if (!API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to .env.local to use the AI features."
    );
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  const body: Record<string, unknown> = { contents };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  if (!text) {
    throw new Error("Gemini API returned an empty response.");
  }
  return text.trim();
}

function historyToContents(history: Message[]): GeminiContent[] {
  return history.map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));
}

const BUILDER_SYSTEM = `You are a helpful AI assistant working inside a project workspace. Answer the user's latest message directly and usefully, using the prior conversation for context.`;

export async function generateBuilderResponse(
  history: Message[],
  userMessage: string
): Promise<string> {
  const contents = [...historyToContents(history), { role: "user" as const, parts: [{ text: userMessage }] }];
  return callGemini(contents, BUILDER_SYSTEM);
}

const VERIFIER_SYSTEM = `You are a strict but fair reviewer. You will be given a user's request and an AI assistant's draft response to it. Decide whether the draft adequately and correctly addresses the request.

Respond with ONLY a JSON object, no markdown fences, in exactly this shape:
{"approved": true} — if the response is good
or
{"approved": false, "issues": ["short specific issue 1", "short specific issue 2"]} — if it has problems

Keep issues short, specific, and actionable. List at most 3 issues.`;

export async function verifyResponse(
  userMessage: string,
  draftResponse: string
): Promise<{ approved: boolean; issues: string[] }> {
  const prompt = `User's request:\n${userMessage}\n\nDraft response to review:\n${draftResponse}`;
  const raw = await callGemini([{ role: "user", parts: [{ text: prompt }] }], VERIFIER_SYSTEM);

  const cleaned = raw.replace(/```json|```/g, "").trim();
  try {
    const parsed = JSON.parse(cleaned) as { approved: boolean; issues?: string[] };
    return { approved: !!parsed.approved, issues: parsed.issues ?? [] };
  } catch {
    return { approved: true, issues: [] };
  }
}

const REVISE_SYSTEM = `You are a helpful AI assistant. You previously drafted a response to a user's request, but a reviewer flagged issues with it. Produce a revised response that fixes those issues while still fully answering the original request. Return only the revised response text, with no preamble like "Here is the revised response".`;

export async function reviseResponse(
  userMessage: string,
  draftResponse: string,
  issues: string[]
): Promise<string> {
  const prompt = `Original request:\n${userMessage}\n\nYour draft response:\n${draftResponse}\n\nReviewer issues:\n${issues.map((i) => `- ${i}`).join("\n")}\n\nWrite the revised response.`;
  return callGemini([{ role: "user", parts: [{ text: prompt }] }], REVISE_SYSTEM);
}

const MEMORY_SYSTEM = `You maintain a structured memory object for a project, based on its ongoing chat. You will be given the current memory and the latest user/assistant exchange. Update the memory to reflect any new goals, completed work, pending tasks, or decisions mentioned. Keep existing items unless they're clearly done or superseded. Keep each list concise (short strings, no duplicates, max ~8 items each).

Respond with ONLY a JSON object, no markdown fences, in exactly this shape:
{"goals": string[], "completedWork": string[], "pendingTasks": string[], "decisions": string[]}`;

export async function updateMemoryFromExchange(
  memory: ProjectMemory,
  userMessage: string,
  aiResponse: string
): Promise<ProjectMemory> {
  const prompt = `Current memory:\n${JSON.stringify(memory)}\n\nLatest exchange:\nUser: ${userMessage}\nAssistant: ${aiResponse}\n\nReturn the updated memory JSON.`;
  try {
    const raw = await callGemini([{ role: "user", parts: [{ text: prompt }] }], MEMORY_SYSTEM);
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as ProjectMemory;
    return {
      goals: parsed.goals ?? memory.goals,
      completedWork: parsed.completedWork ?? memory.completedWork,
      pendingTasks: parsed.pendingTasks ?? memory.pendingTasks,
      decisions: parsed.decisions ?? memory.decisions,
    };
  } catch {
    // Memory update is best-effort; keep the previous memory on failure.
    return memory;
  }
}

export interface VerifiedBuildResult {
  finalText: string;
  verification: VerificationInfo;
}

export async function runVerifiedBuild(
  history: Message[],
  userMessage: string
): Promise<VerifiedBuildResult> {
  const draft = await generateBuilderResponse(history, userMessage);
  const review = await verifyResponse(userMessage, draft);

  if (review.approved) {
    return { finalText: draft, verification: { status: "approved" } };
  }

  const revised = await reviseResponse(userMessage, draft, review.issues);
  return {
    finalText: revised,
    verification: {
      status: "revised",
      reason: review.issues[0] ?? "Reviewer requested changes.",
      issues: review.issues,
    },
  };
}
