"use client";

import { useState } from "react";
import { X, Copy, Check, FileText, Download } from "lucide-react";
import jsPDF from "jspdf";
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

export function generatePDF(projectTitle: string, memory: ProjectMemory) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const leftMargin = 20;
  const rightMargin = 20;
  const topMargin = 20;
  const bottomMargin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - leftMargin - rightMargin;

  let y = topMargin;

  function checkOverflow(neededHeight: number) {
    if (y + neededHeight > pageHeight - bottomMargin) {
      doc.addPage();
      y = topMargin;
    }
  }

  // 1. Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(17, 24, 39); // Dark grey / black
  const titleLines = doc.splitTextToSize(`Project Context: ${projectTitle}`, contentWidth);
  doc.text(titleLines, leftMargin, y);
  y += titleLines.length * 8;

  // 2. Generated Date / Time
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128); // Muted grey
  const timestamp = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  doc.text(`Generated on ${timestamp}`, leftMargin, y);
  y += 6;

  // Horizontal Rule
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(leftMargin, y, pageWidth - rightMargin, y);
  y += 10;

  // Sections data
  const sections: { title: string; items: string[] }[] = [
    { title: "Goals", items: memory?.goals ?? [] },
    { title: "Completed Work", items: memory?.completedWork ?? [] },
    { title: "Pending Tasks", items: memory?.pendingTasks ?? [] },
    { title: "Decisions", items: memory?.decisions ?? [] },
  ];

  sections.forEach((section) => {
    // Section Heading (14pt, bold)
    checkOverflow(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(31, 41, 55);
    doc.text(section.title, leftMargin, y);
    y += 7;

    // Bulleted items or "None yet"
    if (!section.items || section.items.length === 0) {
      checkOverflow(8);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(11);
      doc.setTextColor(107, 114, 128);
      doc.text("None yet", leftMargin + 4, y);
      y += 8;
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(55, 65, 81);

      section.items.forEach((item) => {
        const lines = doc.splitTextToSize(item, contentWidth - 8);
        const itemHeight = lines.length * 5.5 + 2;

        checkOverflow(itemHeight);

        // Bullet dot
        doc.text("•", leftMargin + 2, y);
        // Wrapped text
        doc.text(lines, leftMargin + 7, y);

        y += itemHeight;
      });
    }

    y += 4; // Space between sections
  });

  // Slugify filename
  const slug = projectTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "project";
  const filename = `${slug}-summary.pdf`;

  doc.save(filename);
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
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const summary = buildContextSummary(projectTitle, memory);

  async function handleCopy() {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownloadPDF() {
    setIsGeneratingPDF(true);
    try {
      generatePDF(projectTitle, memory);
    } catch (err) {
      console.error("Failed to generate PDF", err);
    } finally {
      setTimeout(() => setIsGeneratingPDF(false), 500);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[85vh] w-full max-w-xl flex-col gap-4 rounded-2xl glass-panel p-6 shadow-2xl shadow-purple-950/60 border border-white/10 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Export Context Summary</h2>
              <p className="text-xs text-gray-400">Export project memory as Markdown or PDF</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Markdown Content Box */}
        <pre className="flex-1 overflow-auto rounded-xl border border-white/10 bg-[#07070d] p-4 text-xs font-mono text-gray-300 leading-relaxed select-text">
          {summary}
        </pre>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 flex-wrap">
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Close
          </button>

          {/* Markdown Copy Button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 px-3.5 py-2 text-xs font-medium text-white transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-gray-300" />
                <span>Copy Markdown</span>
              </>
            )}
          </button>

          {/* PDF Download Button */}
          <button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            className="flex items-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 border border-violet-500/40 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-violet-950/40 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isGeneratingPDF ? "Generating PDF..." : "Download PDF"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}