# AI Workspace

A project workspace that gives every AI conversation persistent memory — and adds a multi-agent verification layer ("Council Mode") that catches mistakes before they reach you.

Built with Next.js 14, TypeScript, and Tailwind CSS. Powered by Google Gemini, Groq (Llama 3.3), and NVIDIA Nemotron 3 Ultra — with automatic domain-based routing between them.

## The Problem

AI chat tools forget everything the moment you close the tab or hit a usage limit. Switching between providers means re-explaining your entire project from scratch — and a single AI's answer is taken at face value, with no second opinion.

## What This Does

- **Persistent project memory** — every conversation automatically extracts and tracks goals, completed work, pending tasks, and decisions, so context survives across sessions.
- **Smart Provider Routing** — each project's domain (Code / Content / Research / Business) automatically determines which AI provider handles it: Groq for code and business tasks, Gemini for content, NVIDIA Nemotron 3 Ultra for research. A visible badge on every response shows which provider actually answered, and the app transparently falls back to Groq if the selected provider is unavailable.
- **Council Mode** — a multi-agent pipeline where one AI plans, a second builds the response, and a *different* AI (on a separate provider) independently reviews it before it's shown to you. If the reviewer finds issues, the response is automatically revised.
- **Voice input/output** — talk to the assistant instead of typing, and have responses read back to you.
- **Context export** — download a project's full memory as Markdown or PDF, so you can carry it into any other AI tool.
- **Multi-domain support** — works for coding, content writing, research, and business planning, not just one use case.

## How Council Mode Works

```
User message
     │
     ▼
 Planner (Gemini)  →  short plan of approach
     │
     ▼
 Builder (Gemini)  →  drafts the actual response
     │
     ▼
 Verifier (Groq — a different provider)  →  independently checks the draft
     │
     ├── Approved ──────────────► shown to user
     │
     └── Issues found ──► Builder revises once ──► shown to user
```

Because the Verifier runs on a different AI provider than the Builder, this isn't one model grading its own homework — it's a genuine second opinion. In testing, this caught real bugs a single pass missed (e.g. an off-by-one primality check and an inefficient `O(n)` loop that should have been `O(√n)`), and produced a corrected response automatically.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router), TypeScript |
| Styling | Tailwind CSS |
| Database | SQLite (better-sqlite3) |
| AI providers | Google Gemini, Groq (Llama 3.3), NVIDIA Nemotron 3 Ultra |
| Voice | Browser Web Speech API |
| PDF export | jsPDF |

## Getting Started

```bash
git clone https://github.com/mannat-vohra21/ai-workspace.git
cd ai-workspace
npm install
```

Create a `.env.local` file:
```
GEMINI_API_KEY=your_gemini_key
GROQ_API_KEY=your_groq_key
NVIDIA_API_KEY=your_nvidia_key
```

Get free keys at [Google AI Studio](https://aistudio.google.com), [Groq Console](https://console.groq.com), and [NVIDIA Build](https://build.nvidia.com).

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/
  api/
    chat/route.ts       — plain chat endpoint
    verify/route.ts     — Council Mode endpoint
    memory/route.ts     — project memory retrieval
  projects/
    page.tsx            — dashboard
    [id]/page.tsx        — project detail + chat
lib/
  gemini.ts              — all AI provider calls (Gemini + Groq)
  db.ts                  — SQLite access layer
  voice.ts                — speech recognition/synthesis hook
components/
  ChatInterface.tsx, ProjectCard.tsx, NewProjectForm.tsx,
  MemoryPanel.tsx, ExportModal.tsx
types/
  index.ts                — shared TypeScript types
```

## Design Decisions

- **Domain-based smart routing, not a fixed model.** Each project's domain routes to whichever provider tends to suit it best (Groq for fast/structured code and business output, Gemini for nuanced writing, NVIDIA Nemotron 3 Ultra for reasoning-heavy research) — and the response always carries a badge showing which provider actually served it, with automatic fallback to Groq if the chosen one is unavailable.
- **Cross-provider verification, not self-review.** Having the same model check its own output tends to rubber-stamp mistakes. Routing the Verifier to a separate provider (Groq) makes the check meaningful.
- **Fail-soft memory updates.** If the AI's memory-extraction call returns malformed JSON, the app retries once, then silently falls back to the previous memory state rather than breaking the chat — a demo or real session should never crash over a formatting hiccup.
- **Client-side PDF generation.** Export runs entirely in the browser (no server round-trip, no added API cost) since the data needed is already in memory.

## Status

Actively developed. Planner, Verifier, Revise, and memory-extraction currently route through Groq while Gemini's free-tier quota is temporarily exhausted — see the `RESTORE-GEMINI CHECKLIST` comment in `lib/gemini.ts` for how those roles switch back once quota resets. Builder routing (Gemini/Groq/NVIDIA by domain) is unaffected and already live.

## License

MIT