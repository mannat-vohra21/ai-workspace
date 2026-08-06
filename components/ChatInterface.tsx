"use client";

import { useRef, useState } from "react";
import type { Message, Project, ProjectMemory } from "@/types";
import MemoryPanel from "@/components/MemoryPanel";
import ExportModal from "@/components/ExportModal";
import { useSpeechRecognition, speak } from "@/lib/voice";

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

  const { isListening, isSupported, startListening, stopListening } = useSpeechRecognition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleMicClick() {
    if (isListening) {
      stopListening();
      return;
    }
    startListening((transcript) => {
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      inputRef.current?.focus();
    });
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

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={verificationMode}
              onChange={(e) => setVerificationMode(e.target.checked)}
            />
            Verification Mode
          </label>
          <button
            onClick={() => setShowExportModal(true)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Export Context Summary
          </button>
        </div>

        <div className="flex h-[50vh] flex-col gap-3 overflow-y-auto rounded-md border border-gray-200 p-4">
          {messages.length === 0 && (
            <p className="text-sm text-gray-400">
              Say hello to get started. Try the mic button to speak your message.
            </p>
          )}
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {isLoading && <p className="text-sm text-gray-400">Thinking…</p>}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-2">
          <button
            onClick={handleMicClick}
            disabled={!isSupported}
            title={isSupported ? "Speak your message" : "Speech recognition not supported in this browser"}
            className={`shrink-0 rounded-full p-2 text-lg ${
              isListening
                ? "bg-red-100 text-red-600"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            } ${!isSupported ? "cursor-not-allowed opacity-40" : ""}`}
          >
            🎤
          </button>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Listening…" : "Type your message…"}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>

      <div className="sm:w-64">
        <MemoryPanel memory={memory} />
      </div>

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

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[85%] rounded-md px-3 py-2 text-sm ${
          isUser ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
        }`}
      >
        <div className="flex items-start gap-2">
          <span className="whitespace-pre-wrap">{message.content}</span>
          {!isUser && (
            <button
              onClick={() => speak(message.content)}
              title="Read aloud"
              className="shrink-0 text-gray-500 hover:text-gray-800"
            >
              🔊
            </button>
          )}
        </div>
      </div>

      {message.verification && (
        <details className="mt-1 max-w-[85%] text-xs text-gray-500">
          <summary className="cursor-pointer">
            {message.verification.status === "approved"
              ? "Verification: ✅ Approved"
              : `Verification: revised after 1 round — ${message.verification.reason ?? "issues found"}`}
          </summary>
          {message.verification.issues && message.verification.issues.length > 0 && (
            <ul className="mt-1 list-inside list-disc">
              {message.verification.issues.map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          )}
        </details>
      )}
    </div>
  );
}
