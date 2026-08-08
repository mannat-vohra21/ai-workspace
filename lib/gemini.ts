// TEMPORARY: Builder/Planner/Memory currently routed to Groq because Gemini
// free-tier daily quota is exhausted. Switch back to callGemini() for these
// once quota resets or a new key is available.
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

const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const GROQ_PROVIDER_LABEL = "Groq (Llama 3.3)";
const GEMINI_PROVIDER_LABEL = "Gemini (Flash)";
// TEMPORARY: both point at Groq until Gemini quota resets — swap
// BUILDER_PROVIDER_LABEL back to GEMINI_PROVIDER_LABEL alongside the
// generatePlan()/generateBuilderResponse()/reviseResponse() call swaps below.
const BUILDER_PROVIDER_LABEL: string = GROQ_PROVIDER_LABEL;
const VERIFIER_PROVIDER_LABEL = GROQ_PROVIDER_LABEL;

interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function historyToGroqMessages(history: Message[]): GroqMessage[] {
  return history.map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: m.content,
  }));
}

async function callGroq(
  messages: GroqMessage[],
  systemInstruction?: string
): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new Error(
      "GROQ_API_KEY is not set. Add it to .env.local to use cross-provider verification."
    );
  }

  const url = "https://api.groq.com/openai/v1/chat/completions";
  const body = {
    model: GROQ_MODEL,
    messages: systemInstruction
      ? [{ role: "system" as const, content: systemInstruction }, ...messages]
      : messages,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`Groq API error (${res.status}):`, errText);
    if (res.status === 401 || res.status === 403) {
      throw new Error("Groq API error: invalid or unauthorized GROQ_API_KEY.");
    }
    if (res.status === 429) {
      throw new Error("Groq API error: rate limit exceeded. Please try again shortly.");
    }
    throw new Error(`Groq API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? "";
  if (!text) {
    throw new Error("Groq API returned an empty response.");
  }
  return text.trim();
}

const PLANNER_SYSTEM = `You are a planner. Given the user's request, briefly outline your approach in 1-3 short lines before it gets built. Don't answer the request itself, just the plan.`;

export async function generatePlan(history: Message[], userMessage: string): Promise<string> {
  const messages = [...historyToGroqMessages(history), { role: "user" as const, content: userMessage }];
  return callGroq(messages, PLANNER_SYSTEM);
}

const BUILDER_SYSTEM = `You are a helpful AI assistant working inside a project workspace. Answer the user's latest message directly and usefully, using the prior conversation for context. You can only generate text — you cannot generate, create, or return images. If the user asks for an image, politely explain that image generation isn't supported yet and offer to help with text-based alternatives instead.`;
export async function generateBuilderResponse(
  history: Message[],
  userMessage: string,
  plan?: string
): Promise<string> {
  const latestMessage = plan
    ? `${userMessage}\n\n(Your approach plan for this response: ${plan})`
    : userMessage;
  const messages = [...historyToGroqMessages(history), { role: "user" as const, content: latestMessage }];
  return callGroq(messages, BUILDER_SYSTEM);
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
  const raw = await callGroq([{ role: "user", content: prompt }], VERIFIER_SYSTEM);

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
  // TEMPORARY: routed to Groq alongside the Builder (see note at top of file).
  return callGroq([{ role: "user", content: prompt }], REVISE_SYSTEM);
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
    const raw = await callGroq([{ role: "user", content: prompt }], MEMORY_SYSTEM);
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
  const plan = await generatePlan(history, userMessage);
  const draft = await generateBuilderResponse(history, userMessage, plan);
  const review = await verifyResponse(userMessage, draft);

  if (review.approved) {
    return {
      finalText: draft,
      verification: {
        status: "approved",
        plan,
        builderProvider: BUILDER_PROVIDER_LABEL,
        verifierProvider: VERIFIER_PROVIDER_LABEL,
      },
    };
  }

  const revised = await reviseResponse(userMessage, draft, review.issues);
  return {
    finalText: revised,
    verification: {
      status: "revised",
      reason: review.issues[0] ?? "Reviewer requested changes.",
      issues: review.issues,
      plan,
      builderProvider: BUILDER_PROVIDER_LABEL,
      verifierProvider: VERIFIER_PROVIDER_LABEL,
    },
  };
}
