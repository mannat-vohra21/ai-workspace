"use client";

import { useState } from "react";
import type { ProjectMemory } from "@/types";

function list(items: string[]): string {
  return items.length ? items.map((i) => `- ${i}`).join("\n") : "_None yet_";
}

export function buildContextSummary(projectTitle: string, memory: ProjectMemory): string {
  return `# Context Summary: ${projectTitle}

## Goals
${list(memory.goals)}

## Completed Work
${list(memory.completedWork)}

## Pending Tasks
${list(memory.pendingTasks)}

## Decisions
${list(memory.decisions)}
`;
}

export default function ExportModal({
  projectTitle,
  memory,
  onClose,
}: {
  projectTitle: string;
  memory: ProjectMemory;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const summary = buildContextSummary(projectTitle, memory);

  async function handleCopy() {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-lg flex-col gap-3 rounded-md bg-white p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Export Context Summary</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <pre className="flex-1 overflow-auto whitespace-pre-wrap rounded-md bg-gray-50 p-3 text-sm text-gray-800">
          {summary}
        </pre>

        <button
          onClick={handleCopy}
          className="self-end rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}
