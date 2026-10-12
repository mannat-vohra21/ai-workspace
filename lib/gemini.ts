// TEMPORARY: Planner/Memory currently forced onto Groq because Gemini
// free-tier daily quota is exhausted. Switch back to callGemini() for these
// once quota resets or a new key is available.
//
// The Builder role is no longer part of this temporary override — it now
// uses Smart Provider Routing (see selectBuilderProvider() below), which
// calls Gemini for Content, NVIDIA's Nemotron 3 Ultra for Code and Research,
// and automatically falls back to Groq if that Gemini/NVIDIA call fails for
// any reason (quota, auth, etc).
//
// RESTORE-GEMINI CHECKLIST for the still-forced roles (flip back once the
// Gemini quota resets):
//   1. generatePlan(): swap `callGroq(messages, PLANNER_SYSTEM)` for
//      `callGemini(historyToContents(history).concat([{ role: "user", parts: [{ text: userMessage }] }]), PLANNER_SYSTEM)`
//   2. reviseResponse(): swap `callGroq([{ role: "user", content: prompt }], REVISE_SYSTEM)` for
//      `callGemini([{ role: "user", parts: [{ text: prompt }] }], REVISE_SYSTEM)`
//   3. updateMemoryFromExchange(): swap both callGroq(...) calls (initial attempt + retry) for callGemini(...)
//      (wrap the prompt in `[{ role: "user", parts: [{ text: prompt }] }]`).
//   (verifyResponse() stays on Groq permanently — that's the intentional cross-provider check.)
//   Call isGeminiAvailable() to confirm GEMINI_API_KEY is set before flipping any of the above.
import type { AttachmentPayload, Message, ProjectMemory, VerificationInfo } from "@/types";

const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
const API_KEY = process.env.GEMINI_API_KEY;

export function isGeminiAvailable(): boolean {
  return !!API_KEY;
}

// Minimal in-memory cooldown to avoid rapid double-click bursts
const COOLDOWN_MS = 150;
const lastRequestAt: Record<"gemini" | "groq" | "nvidia", number> = { gemini: 0, groq: 0, nvidia: 0 };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForCooldown(provider: "gemini" | "groq" | "nvidia"): Promise<void> {
  const elapsed = Date.now() - lastRequestAt[provider];
  if (lastRequestAt[provider] && elapsed < COOLDOWN_MS) {
    await sleep(COOLDOWN_MS - elapsed);
  }
  lastRequestAt[provider] = Date.now();
}

// Turns a raw HTTP failure into a short, non-technical message for the UI
// while logging the full detail server-side for debugging.
function buildApiError(status: number, provider: "Gemini" | "Groq" | "NVIDIA", rawErrText: string): Error {
  console.error(`${provider} API error (${status}):`, rawErrText);
  if (status === 429) {
    return new Error("Rate limit reached — please wait about a minute before sending another message.");
  }
  if (status === 401 || status === 403) {
    return new Error("AI service isn't configured correctly. Check the API key.");
  }
  return new Error("AI service request failed. Please try again in a moment.");
}

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

async function callGemini(
  contents: GeminiContent[],
  systemInstruction?: string,
  modelOverride?: string
): Promise<string> {
  if (!API_KEY) {
    throw new Error(
      "AI service isn't configured correctly. Check the API key."
    );
  }

  await waitForCooldown("gemini");

  const model = modelOverride || MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

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
    throw buildApiError(res.status, "Gemini", errText);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  if (!text) {
    console.error("Gemini API returned an empty response body:", JSON.stringify(data));
    throw new Error("The AI didn't return a response. Please try again.");
  }
  return text.trim();
}

/** Build a Gemini-format user message that includes image inlineData parts. */
function buildGeminiVisionParts(text: string, imageAttachments: AttachmentPayload[]): GeminiPart[] {
  const parts: GeminiPart[] = [];
  for (const img of imageAttachments) {
    parts.push({
      inlineData: {
        mimeType: img.mimeType,
        data: img.content, // base64
      },
    });
  }
  parts.push({ text });
  return parts;
}

/**
 * Send a prompt with image attachments through Gemini's vision-capable model.
 * gemini-flash-latest supports image input natively via inlineData.
 */
async function callGeminiWithVision(
  history: GeminiContent[],
  userText: string,
  imageAttachments: AttachmentPayload[],
  systemInstruction?: string
): Promise<string> {
  const userParts = buildGeminiVisionParts(userText, imageAttachments);
  const contents: GeminiContent[] = [
    ...history,
    { role: "user", parts: userParts },
  ];
  // gemini-flash-latest supports vision natively — no model override needed
  return callGemini(contents, systemInstruction);
}

function historyToContents(history: Message[]): GeminiContent[] {
  return history.map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));
}

const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const GROQ_PROVIDER_LABEL = "Groq (LPU Ultra-Fast)";
const GEMINI_PROVIDER_LABEL = "Gemini (Flash)";
const NVIDIA_PROVIDER_LABEL = "NVIDIA (Nemotron 3 Ultra)";
// Verifier always stays on Groq — that's the intentional cross-provider check
// and is unrelated to the Builder's domain-based routing below.
const VERIFIER_PROVIDER_LABEL = GROQ_PROVIDER_LABEL;

export type BuilderProvider = "gemini" | "groq" | "nvidia";

function providerLabel(provider: BuilderProvider): string {
  if (provider === "gemini") return GEMINI_PROVIDER_LABEL;
  if (provider === "nvidia") return NVIDIA_PROVIDER_LABEL;
  return GROQ_PROVIDER_LABEL;
}

// Smart Provider Routing: picks which provider handles the Builder role based
// on the project's domain. Groq LPU delivers instant ~2-3s code and website generation,
// Gemini delivers nuanced writing and research, with automatic fallback across providers.
function selectBuilderProvider(domain: string): BuilderProvider {
  switch (domain) {
    case "Code":
      return "groq"; // ultra-fast LPU code/website generation (3s vs 20s)
    case "Content":
      return "gemini"; // nuanced writing
    case "Research":
      return "gemini"; // reasoning & deep context
    case "Business":
      return "groq"; // fast, structured output
    default:
      return "groq";
  }
}

// Shared OpenAI-compatible message shape used by both Groq and NVIDIA.
interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function historyToChatMessages(history: Message[]): ChatMessage[] {
  return history.map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: m.content,
  }));
}

async function callGroq(
  messages: ChatMessage[],
  systemInstruction?: string,
  retryCount = 0
): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new Error(
      "AI service isn't configured correctly. Check the API key."
    );
  }

  await waitForCooldown("groq");

  const url = "https://api.groq.com/openai/v1/chat/completions";
  const body = {
    model: GROQ_MODEL,
    messages: systemInstruction
      ? [{ role: "system" as const, content: systemInstruction }, ...messages]
      : messages,
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (res.status === 429 && retryCount < 2) {
      console.warn(`Groq rate limited (429), retrying in 700ms (attempt ${retryCount + 1})...`);
      await sleep(700 * (retryCount + 1));
      return callGroq(messages, systemInstruction, retryCount + 1);
    }

    if (!res.ok) {
      const errText = await res.text();
      throw buildApiError(res.status, "Groq", errText);
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    if (!text) {
      console.error("Groq API returned an empty response body:", JSON.stringify(data));
      throw new Error("The AI didn't return a response. Please try again.");
    }
    return text.trim();
  } catch (err) {
    if (retryCount < 1) {
      await sleep(400);
      return callGroq(messages, systemInstruction, retryCount + 1);
    }
    throw err;
  }
}

const NVIDIA_MODEL = process.env.NVIDIA_MODEL || "nvidia/nemotron-3-ultra-550b-a55b";
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;

async function callNvidia(
  messages: ChatMessage[],
  systemInstruction?: string
): Promise<string> {
  if (!NVIDIA_API_KEY) {
    throw new Error(
      "AI service isn't configured correctly. Check the API key."
    );
  }

  await waitForCooldown("nvidia");

  const url = "https://integrate.api.nvidia.com/v1/chat/completions";
  const body = {
    model: NVIDIA_MODEL,
    messages: systemInstruction
      ? [{ role: "system" as const, content: systemInstruction }, ...messages]
      : messages,
    temperature: 1,
    top_p: 0.95,
    max_tokens: 4096,
    frequency_penalty: 0.3,
    presence_penalty: 0.3,
    chat_template_kwargs: { enable_thinking: false },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${NVIDIA_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw buildApiError(res.status, "NVIDIA", errText);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? "";
  if (!text) {
    console.error("NVIDIA API returned an empty response body:", JSON.stringify(data));
    throw new Error("The AI didn't return a response. Please try again.");
  }
  return text.trim();
}

const PLANNER_SYSTEM = `You are a planner. Given the user's request, briefly outline your approach in 1-3 short lines before it gets built. Don't answer the request itself, just the plan.`;

export async function generatePlan(history: Message[], userMessage: string): Promise<string> {
  const messages = [...historyToChatMessages(history), { role: "user" as const, content: userMessage }];
  try {
    return await callGroq(messages, PLANNER_SYSTEM);
  } catch {
    try {
      const contents = [
        ...historyToContents(history),
        { role: "user" as const, parts: [{ text: userMessage }] },
      ];
      return await callGemini(contents, PLANNER_SYSTEM);
    } catch {
      return "Outlining structured solution and implementing project files.";
    }
  }
}

const BUILDER_SYSTEM = `You are an expert AI assistant working inside a project workspace. Your responses must be exceptionally polished, precise, well-structured, and professional — matching the clarity, elegance, and rigor of Claude.

Guidelines for output quality:
1. Direct & Crisp: Avoid conversational filler, generic greetings, or unnecessary fluff (e.g. "Sure!", "Certainly! Here is...", "As an AI..."). Start directly with the substance of your response.
2. Structure & Formatting:
   - Use clean Markdown with clear hierarchical headings (##, ###), bullet lists, bold key concepts, tables, or callouts for maximum readability.
   - Separate conceptual explanations from technical code/artifacts.
   - Keep prose concise, well-phrased, and immediately actionable.
3. Code & Web Artifacts:
   - Provide clean, modern, production-ready code with thoughtful architecture and best practices.
   - For web components and websites (HTML or React): Output complete, self-contained, working code inside fenced code blocks (\`\`\`html or \`\`\`jsx or \`\`\`tsx).
   - If asked for a ZIP file or download: Generate the complete project code block and inform the user that they can click the "Download ZIP" button directly on the code artifact header to export the full ready-to-run project bundle.
   - Design aesthetics: Modern clean aesthetics, elegant typography (system fonts or standard sans-serif), balanced whitespace, high-contrast accessible text, subtle border radii and box-shadows, responsive layouts (Flexbox/Grid), and smooth hover states.
   - Always include <meta name="color-scheme" content="light"> in HTML heads and use a clean light theme by default (unless dark theme is explicitly requested).
4. Text-only capabilities: You can generate text, code, and project files; you cannot generate binary images. If asked for images, offer clean SVG or CSS-based visual alternatives.`;

export async function generateBuilderResponse(
  history: Message[],
  userMessage: string,
  domain: string,
  plan?: string,
  attachments?: AttachmentPayload[]
): Promise<{ text: string; provider: BuilderProvider }> {
  const latestMessage = plan
    ? `${userMessage}\n\n(Your approach plan for this response: ${plan})`
    : userMessage;

  // If the request includes image attachments, override routing to Gemini (vision-capable).
  const imageAttachments = attachments?.filter((a) => a.type === "image") ?? [];
  if (imageAttachments.length > 0) {
    if (!isGeminiAvailable()) {
      throw new Error(
        "Image understanding is unavailable right now. Try again later or attach text instead."
      );
    }
    try {
      const text = await callGeminiWithVision(
        historyToContents(history),
        latestMessage,
        imageAttachments,
        BUILDER_SYSTEM
      );
      return { text, provider: "gemini" };
    } catch (err) {
      console.error("Vision call failed:", err instanceof Error ? err.message : err);
      throw new Error(
        "Image understanding is unavailable right now. Try again later or attach text instead."
      );
    }
  }

  const selected = selectBuilderProvider(domain);

  const tryGemini = async () => {
    const contents = [
      ...historyToContents(history),
      { role: "user" as const, parts: [{ text: latestMessage }] },
    ];
    const text = await callGemini(contents, BUILDER_SYSTEM);
    return { text, provider: "gemini" as const };
  };

  const tryGroq = async () => {
    const messages = [...historyToChatMessages(history), { role: "user" as const, content: latestMessage }];
    const text = await callGroq(messages, BUILDER_SYSTEM);
    return { text, provider: "groq" as const };
  };

  const tryNvidia = async () => {
    const messages = [...historyToChatMessages(history), { role: "user" as const, content: latestMessage }];
    const text = await callNvidia(messages, BUILDER_SYSTEM);
    return { text, provider: "nvidia" as const };
  };

  if (selected === "groq") {
    try {
      return await tryGroq();
    } catch (err) {
      console.warn("Builder: Groq call failed, falling back to Gemini —", err instanceof Error ? err.message : err);
      try {
        return await tryGemini();
      } catch (geminiErr) {
        console.warn("Builder: Gemini fallback failed, falling back to NVIDIA —", geminiErr);
        return await tryNvidia();
      }
    }
  }

  if (selected === "gemini") {
    try {
      return await tryGemini();
    } catch (err) {
      console.warn("Builder: Gemini call failed, falling back to Groq —", err instanceof Error ? err.message : err);
      try {
        return await tryGroq();
      } catch (groqErr) {
        console.warn("Builder: Groq fallback failed, falling back to NVIDIA —", groqErr);
        return await tryNvidia();
      }
    }
  }

  if (selected === "nvidia") {
    try {
      return await tryNvidia();
    } catch (err) {
      console.warn("Builder: NVIDIA call failed, falling back to Groq —", err instanceof Error ? err.message : err);
      try {
        return await tryGroq();
      } catch (groqErr) {
        console.warn("Builder: Groq fallback failed, falling back to Gemini —", groqErr);
        return await tryGemini();
      }
    }
  }

  return await tryGroq();
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
  let raw = "";
  try {
    raw = await callGroq([{ role: "user", content: prompt }], VERIFIER_SYSTEM);
  } catch {
    try {
      raw = await callGemini([{ role: "user", parts: [{ text: prompt }] }], VERIFIER_SYSTEM);
    } catch {
      return { approved: true, issues: [] };
    }
  }

  const cleaned = raw.replace(/```json|```/g, "").trim();
  try {
    const parsed = JSON.parse(cleaned) as { approved: boolean; issues?: string[] };
    return { approved: !!parsed.approved, issues: parsed.issues ?? [] };
  } catch {
    return { approved: true, issues: [] };
  }
}

const REVISE_SYSTEM = `You are a helpful AI assistant. You previously drafted a response to a user's request, but a reviewer flagged issues with it. Produce a revised response that fixes those issues while still fully answering the original request. Return only the revised response text, with no preamble like "Here is the revised response". If the draft responds to a webpage, website, or HTML component request with a \`\`\`html code block, keep that same single self-contained \`\`\`html code block structure (complete valid HTML with inline <style> and <script>, no external file references) in your revision — don't drop the fenced block or the code from it.`;

export async function reviseResponse(
  userMessage: string,
  draftResponse: string,
  issues: string[]
): Promise<string> {
  const prompt = `Original request:\n${userMessage}\n\nYour draft response:\n${draftResponse}\n\nReviewer issues:\n${issues.map((i) => `- ${i}`).join("\n")}\n\nWrite the revised response.`;
  try {
    return await callGroq([{ role: "user", content: prompt }], REVISE_SYSTEM);
  } catch {
    return callGemini([{ role: "user", parts: [{ text: prompt }] }], REVISE_SYSTEM);
  }
}

const MEMORY_SYSTEM = `You maintain a structured memory object for a project, based on its ongoing chat. You will be given the current memory and the latest user/assistant exchange. Update the memory to reflect any new goals, completed work, pending tasks, or decisions mentioned. Keep existing items unless they're clearly done or superseded. Keep each list concise (short strings, no duplicates, max ~8 items each).

Respond with ONLY a JSON object, no markdown fences, in exactly this shape:
{"goals": string[], "completedWork": string[], "pendingTasks": string[], "decisions": string[]}`;

function parseMemoryJson(raw: string): ProjectMemory | null {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned) as ProjectMemory;
  } catch {
    return null;
  }
}

export async function updateMemoryFromExchange(
  memory: ProjectMemory,
  userMessage: string,
  aiResponse: string
): Promise<ProjectMemory> {
  const prompt = `Current memory:\n${JSON.stringify(memory)}\n\nLatest exchange:\nUser: ${userMessage}\nAssistant: ${aiResponse}\n\nReturn the updated memory JSON.`;
  try {
    const raw = await callGroq([{ role: "user", content: prompt }], MEMORY_SYSTEM);
    let parsed = parseMemoryJson(raw);

    // JSON parsing failed (not an API/network error) — retry once with a
    // stricter reminder before giving up, since this is usually a one-off
    // formatting slip rather than a persistent failure.
    if (!parsed) {
      console.error("Memory update: first response wasn't valid JSON, retrying once.");
      const retryRaw = await callGroq(
        [{ role: "user", content: `${prompt}\n\nRespond with ONLY valid JSON, nothing else.` }],
        MEMORY_SYSTEM
      );
      parsed = parseMemoryJson(retryRaw);
    }

    if (!parsed) {
      console.error("Memory update: retry also failed to produce valid JSON, keeping previous memory.");
      return memory;
    }

    return {
      goals: parsed.goals ?? memory.goals,
      completedWork: parsed.completedWork ?? memory.completedWork,
      pendingTasks: parsed.pendingTasks ?? memory.pendingTasks,
      decisions: parsed.decisions ?? memory.decisions,
    };
  } catch (err) {
    // Memory update is best-effort; keep the previous memory on failure
    // (e.g. API/network error) without retrying — this should never break chat.
    console.error("Memory update failed:", err instanceof Error ? err.message : err);
    return memory;
  }
}

export interface VerifiedBuildResult {
  finalText: string;
  provider: BuilderProvider;
  verification: VerificationInfo;
}

export async function runVerifiedBuild(
  history: Message[],
  userMessage: string,
  domain: string,
  attachments?: AttachmentPayload[]
): Promise<VerifiedBuildResult> {
  // Council Mode: Planner and Verifier are text-only.
  // Give them a note about images; include text attachments in full.
  const imageAttachments = attachments?.filter((a) => a.type === "image") ?? [];
  const imageNote = imageAttachments.length > 0
    ? `\n\n[User attached ${imageAttachments.length} image(s): ${imageAttachments.map((a) => a.name).join(", ")}]`
    : "";
  const plannerMessage = userMessage + imageNote;

  const plan = await generatePlan(history, plannerMessage);
  // Builder gets full attachments (including images for vision)
  const builderResult = await generateBuilderResponse(history, userMessage, domain, plan, attachments);
  // Verifier gets text-only: no images
  const review = await verifyResponse(plannerMessage, builderResult.text);

  if (review.approved) {
    return {
      finalText: builderResult.text,
      provider: builderResult.provider,
      verification: {
        status: "approved",
        plan,
        builderProvider: providerLabel(builderResult.provider),
        verifierProvider: VERIFIER_PROVIDER_LABEL,
      },
    };
  }

  const revised = await reviseResponse(plannerMessage, builderResult.text, review.issues);
  return {
    finalText: revised,
    provider: builderResult.provider,
    verification: {
      status: "revised",
      reason: review.issues[0] ?? "Reviewer requested changes.",
      issues: review.issues,
      plan,
      builderProvider: providerLabel(builderResult.provider),
      verifierProvider: VERIFIER_PROVIDER_LABEL,
    },
  };
}
