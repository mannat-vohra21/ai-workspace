"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  ShieldCheck,
  PanelRight,
  Share2,
  ArrowLeft,
  Bot,
  User,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Cpu,
  Zap,
} from "lucide-react";
import type { Message, Project, ProjectMemory } from "@/types";
import MemoryPanel from "@/components/MemoryPanel";
import ExportModal from "@/components/ExportModal";
import CodePreview from "@/components/CodePreview";
import { useSpeechRecognition, speak, stopSpeaking } from "@/lib/voice";
import { useWorkspace } from "@/components/WorkspaceLayout";

export default function ChatInterface({
  project,
  initialMessages,
  initialMemory,
}: {
  project: Project;
  initialMessages: Message[];
  initialMemory: ProjectMemory;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [memory, setMemory] = useState<ProjectMemory>(initialMemory);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationMode, setVerificationMode] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const { contextPanelOpen, toggleContextPanel } = useWorkspace();
  const { isListening, isSupported, startListening, stopListening } = useSpeechRecognition();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  function handleMicClick() {
    if (isListening) {
      stopListening();
      return;
    }
    startListening((transcript) => {
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      textareaRef.current?.focus();
    });
  }

  function handleToggleSpeak(id: string, content: string) {
    if (speakingId === id) {
      stopSpeaking();
      setSpeakingId(null);
      return;
    }
    setSpeakingId(id);
    speak(content, () => setSpeakingId(null));
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput("");
    setError(null);

    const optimisticUserMessage: Message = {
      id: `local-${Date.now()}`,
      projectId: project.id,
      role: "user",
      content: text,
      verification: null,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticUserMessage]);
    setIsLoading(true);

    try {
      const endpoint = verificationMode ? "/api/verify" : "/api/chat";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, message: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Request failed.");
      }
      setMessages((prev) => [...prev, data.message as Message]);
      setMemory(data.memory as ProjectMemory);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="relative flex flex-1 h-full w-full overflow-hidden bg-[#08080a]">
      {/* Central Conversation Workspace */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        {/* Workspace Top Header Bar */}
        <header className="flex items-center justify-between h-14 px-4 md:px-6 border-b border-white/[0.06] glass-panel z-10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/projects"
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors shrink-0"
              title="Back to Workspaces"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold text-gray-200 truncate">
                  {project.title}
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded border border-white/10 bg-white/[0.04] text-gray-400 font-medium shrink-0">
                  {project.domain}
                </span>
              </div>
            </div>
          </div>

          {/* Top Controls & Toggles */}
          <div className="flex items-center gap-2">
            {/* Subtle Verification Mode Switch */}
            <label className="flex items-center gap-2 px-2.5 py-1 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/5 cursor-pointer transition-colors select-none">
              <input
                type="checkbox"
                checked={verificationMode}
                onChange={(e) => setVerificationMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="relative w-6 h-3.5 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1.5px] after:left-[1.5px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:bg-violet-600/70" />
              <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                <ShieldCheck className={`w-3.5 h-3.5 ${verificationMode ? "text-violet-400" : "text-gray-500"}`} />
                <span className="hidden sm:inline">Council Mode</span>
              </div>
            </label>

            {/* Export Summary Action */}
            <button
              onClick={() => setShowExportModal(true)}
              title="Export Context Summary"
              className="p-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {/* Context Drawer Toggle Button */}
            <button
              onClick={toggleContextPanel}
              title={contextPanelOpen ? "Hide Context Panel (Ctrl+I)" : "Show Context Panel (Ctrl+I)"}
              className={`p-1.5 rounded-lg border transition-colors ${
                contextPanelOpen
                  ? "bg-white/10 border-white/20 text-white"
                  : "border-white/[0.08] bg-white/[0.02] text-gray-400 hover:text-white"
              }`}
            >
              <PanelRight className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Muted AI Collaboration Banner */}
        {verificationMode && (
          <div className="bg-white/[0.02] border-b border-white/[0.06] px-4 py-1.5 text-xs text-gray-400 flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Cpu className="w-3.5 h-3.5 text-violet-400 shrink-0" />
              <span className="truncate">
                Council Mode ON — Planner outlines approach, Builder drafts response, Verifier performs audit check.
              </span>
            </div>
            <span className="text-[10px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-gray-400 border border-white/10 shrink-0">
              3-Role Council
            </span>
          </div>
        )}

        {/* Conversation Stream Area (Flex child that scrolls cleanly above composer) */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-6 min-h-0">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full max-w-sm mx-auto text-center space-y-3 my-16">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/[0.04] border border-white/10 text-gray-400">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-gray-200">AI Workspace Active</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Start a conversation. Type instructions below or dictation via mic.
                </p>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              domain={project.domain}
              speakingId={speakingId}
              onToggleSpeak={handleToggleSpeak}
            />
          ))}

          {/* Thinking / AI Agent Active State */}
          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/5 border border-white/10 text-gray-400 shrink-0 mt-0.5">
                <Bot className="w-4 h-4 animate-pulse" />
              </div>
              <div className="flex flex-col space-y-1.5">
                <span className="text-[11px] font-medium text-gray-400">
                  {verificationMode ? "AI Council" : "Builder AI"}
                </span>
                <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-gray-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping" />
                  <span>{verificationMode ? "Planning approach, drafting, and verifying..." : "Formulating response..."}</span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div ref={messagesEndRef} className="h-2" />
        </div>

        {/* Dedicated Flex Bottom Composer (Never overlaps or collapses text) */}
        <div className="shrink-0 w-full p-3 md:p-4 border-t border-white/[0.06] bg-[#08080a]/90 backdrop-blur-md z-10 flex justify-center">
          <div className="w-full max-w-3xl composer-glass rounded-xl p-2">
            <div className="flex items-end gap-2">
              {/* Voice Speech Dictation Trigger */}
              <button
                onClick={handleMicClick}
                disabled={!isSupported}
                title={
                  isSupported
                    ? isListening
                      ? "Stop listening"
                      : "Voice dictation"
                    : "Speech recognition not supported"
                }
                className={`p-2 rounded-lg transition-colors shrink-0 ${
                  isListening
                    ? "bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse"
                    : "bg-white/5 border border-white/10 text-gray-400 hover:text-white"
                } ${!isSupported ? "cursor-not-allowed opacity-40" : ""}`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Text Area Input */}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder={
                  isListening
                    ? "Listening..."
                    : "Type a prompt or instruction... (Enter to send, Shift+Enter for newline)"
                }
                className="flex-1 max-h-28 bg-transparent px-2.5 py-1.5 text-sm text-gray-200 placeholder:text-gray-500 outline-none resize-none scrollbar-none font-sans"
              />

              {/* Muted Mode Toggle Pill */}
              <button
                type="button"
                onClick={() => setVerificationMode((prev) => !prev)}
                title="Toggle Council Mode"
                className={`px-2 py-1 rounded-lg text-[11px] font-medium border transition-colors hidden sm:flex items-center gap-1 shrink-0 ${
                  verificationMode
                    ? "bg-white/10 border-white/20 text-white"
                    : "bg-white/[0.02] border-white/10 text-gray-500 hover:text-gray-300"
                }`}
              >
                <Zap className="w-3 h-3 text-violet-400" />
                <span>{verificationMode ? "Verified" : "Standard"}</span>
              </button>

              {/* Send Action Button */}
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium border border-white/10 transition-colors disabled:cursor-not-allowed disabled:opacity-30 shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Slide-Over Context Panel (Project Memory Layer) */}
      <aside
        className={`relative z-20 h-full transition-all duration-300 ease-out select-none ${
          contextPanelOpen
            ? "w-72 border-l border-white/[0.06]"
            : "w-0 overflow-hidden border-none"
        }`}
      >
        <div className="w-72 h-full">
          <MemoryPanel
            memory={memory}
            onExport={() => setShowExportModal(true)}
            onClose={toggleContextPanel}
          />
        </div>
      </aside>

      {/* Export Context Summary Modal */}
      {showExportModal && (
        <ExportModal
          projectTitle={project.title}
          memory={memory}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}

const PROVIDER_ROUTE_META: Record<NonNullable<Message["provider"]>, { emoji: string; label: string }> = {
  groq: { emoji: "⚡", label: "Groq" },
  gemini: { emoji: "🧠", label: "Gemini" },
  nvidia: { emoji: "🟩", label: "NVIDIA" },
};

function extractHtmlBlock(content: string): string | null {
  if (!content) return null;

  // 1. Look for ```html ... ``` fenced block first (most common case)
  const htmlBlockRegex = /```html\b([\s\S]*?)```/i;
  const match = content.match(htmlBlockRegex);
  if (match && match[1]) {
    const code = match[1].trim();
    if (code) return code;
  }

  // 2. Look for any generic code block: ```[lang] ... ``` that contains HTML structures
  const genericBlockRegex = /```[a-zA-Z0-9_-]*([\s\S]*?)```/g;
  let blockMatch;
  while ((blockMatch = genericBlockRegex.exec(content)) !== null) {
    const code = blockMatch[1].trim();
    const lowerCode = code.toLowerCase();
    if (
      lowerCode.includes("<!doctype html") ||
      lowerCode.includes("<html") ||
      (lowerCode.includes("<head") && lowerCode.includes("<body")) ||
      lowerCode.includes("</html>") ||
      lowerCode.includes("</body>")
    ) {
      return code;
    }
  }

  // 3. Look for any HTML substring in the raw content starting with <!DOCTYPE html or <html and ending with </html> or </body>
  const lowerContent = content.toLowerCase();
  let startIdx = lowerContent.indexOf("<!doctype html");
  if (startIdx === -1) {
    startIdx = lowerContent.indexOf("<html");
  }

  if (startIdx !== -1) {
    let endIdx = lowerContent.lastIndexOf("</html>");
    if (endIdx !== -1) {
      endIdx += 7; // include </html>
    } else {
      endIdx = lowerContent.lastIndexOf("</body>");
      if (endIdx !== -1) {
        endIdx += 7; // include </body>
      }
    }

    if (endIdx !== -1 && endIdx > startIdx) {
      return content.substring(startIdx, endIdx).trim();
    }

    // Fallback: If it's a long text starting with html tag but without a clean closing tag
    if (lowerContent.length - startIdx > 100) {
      return content.substring(startIdx).trim();
    }
  }

  return null;
}

{/* Muted Subtle Message Item Component */}
function MessageBubble({
  message,
  domain,
  speakingId,
  onToggleSpeak,
}: {
  message: Message;
  domain: Project["domain"];
  speakingId: string | null;
  onToggleSpeak: (id: string, content: string) => void;
}) {
  const isUser = message.role === "user";
  const [showVerificationDetails, setShowVerificationDetails] = useState(false);
  const extractedHtml = !isUser ? extractHtmlBlock(message.content) : null;

  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1.5 group`}>
      {/* Message Header Badge */}
      <div className="flex items-center gap-1.5 px-1 text-[11px] text-gray-400 font-medium">
        {isUser ? (
          <>
            <span>You</span>
            <User className="w-3 h-3 text-gray-400" />
          </>
        ) : (
          <>
            <Bot className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-gray-300 font-medium">AI Assistant</span>
            {message.verification && (
              <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded bg-white/5 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-2.5 h-2.5" /> Verified
              </span>
            )}
          </>
        )}
      </div>

      {/* Message Bubble Container */}
      <div
        className={`relative max-w-[88%] md:max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-white/[0.08] text-white border border-white/10 rounded-tr-xs"
            : "glass-card border border-white/[0.06] text-gray-200 rounded-tl-xs"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="whitespace-pre-wrap flex-1">{message.content}</div>

          {/* Voice Text-To-Speech Toggle */}
          {!isUser && (
            <button
              onClick={() => onToggleSpeak(message.id, message.content)}
              title={speakingId === message.id ? "Stop reading" : "Read aloud"}
              className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            >
              {speakingId === message.id ? (
                <VolumeX className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Smart Provider Routing Badge */}
      {!isUser && message.provider && (
        <div className="max-w-[88%] md:max-w-[80%] flex items-center gap-1 px-1 text-[10px] text-gray-500">
          <span>{PROVIDER_ROUTE_META[message.provider].emoji}</span>
          <span>
            Routed to {PROVIDER_ROUTE_META[message.provider].label} — optimized for {domain} tasks
          </span>
        </div>
      )}

      {/* Verification Audit Breakdown Dropdown */}
      {message.verification && (
        <div className="max-w-[88%] md:max-w-[80%] text-xs">
          <button
            onClick={() => setShowVerificationDetails((prev) => !prev)}
            className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-200 transition-colors py-0.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
            <span>
              {message.verification.status === "approved"
                ? "Council Audit: Approved on first pass"
                : `Council Audit: Revised after verification (${message.verification.reason ?? "issues fixed"})`}
            </span>
            {showVerificationDetails ? (
              <ChevronUp className="w-3 h-3 text-gray-500" />
            ) : (
              <ChevronDown className="w-3 h-3 text-gray-500" />
            )}
          </button>

          {showVerificationDetails && (
            <div className="mt-1 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-2 text-gray-300">
              {message.verification.plan && (
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-semibold text-gray-400">Planner:</span>
                  <p className="text-xs text-gray-400 whitespace-pre-wrap">{message.verification.plan}</p>
                </div>
              )}
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-semibold text-gray-400">Builder → Verifier:</span>
                <div className="flex items-center gap-1.5 font-medium text-[11px] text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verification Status: {message.verification.status.toUpperCase()}</span>
                </div>
                {message.verification.verifierProvider && (
                  <div className="text-[10px] text-gray-500">
                    {message.verification.builderProvider &&
                    message.verification.builderProvider !== message.verification.verifierProvider
                      ? `Reviewed by ${message.verification.verifierProvider} — cross-provider check`
                      : `Reviewed by ${message.verification.verifierProvider}`}
                  </div>
                )}
              </div>
              {message.verification.issues && message.verification.issues.length > 0 && (
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-semibold text-gray-400">Addressed Issues:</span>
                  <ul className="list-disc list-inside space-y-0.5 text-xs text-gray-400">
                    {message.verification.issues.map((issue, idx) => (
                      <li key={idx}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Code Live Preview */}
      {extractedHtml && (
        <div className="w-full max-w-[88%] md:max-w-[80%]">
          <CodePreview code={extractedHtml} />
        </div>
      )}
    </div>
  );
}