"use client";

import { Target, CheckCircle2, ListTodo, Lightbulb, Share2, Sparkles } from "lucide-react";
import type { ProjectMemory } from "@/types";

function Section({
  title,
  items,
  icon: Icon,
  colorClass,
}: {
  title: string;
  items: string[];
  icon: React.ElementType;
  colorClass: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
          <Icon className={`w-3.5 h-3.5 ${colorClass}`} />
          {title}
        </h4>
        <span className="text-[10px] text-gray-500 font-mono bg-white/5 px-1.5 py-0.5 rounded">
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-gray-500 italic pl-5">No items recorded yet</p>
      ) : (
        <ul className="space-y-1.5 pl-1">
          {items.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-xs text-gray-300 leading-relaxed bg-white/[0.02] border border-white/5 p-2 rounded-lg"
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function MemoryPanel({
  memory,
  onExport,
  onClose,
}: {
  memory: ProjectMemory;
  onExport?: () => void;
  onClose?: () => void;
}) {
  const totalItems =
    memory.goals.length +
    memory.completedWork.length +
    memory.pendingTasks.length +
    memory.decisions.length;

  return (
    <div className="flex flex-col h-full glass-panel border-l border-white/10 select-none overflow-hidden">
      {/* Drawer Header */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white tracking-tight flex items-center gap-1.5">
              Project Context & Memory
            </h3>
            <span className="text-[10px] text-gray-400">{totalItems} active records</span>
          </div>
        </div>

        {onExport && (
          <button
            onClick={onExport}
            title="Export Context Summary"
            className="flex items-center gap-1 text-[11px] font-medium text-violet-400 hover:text-violet-300 bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 rounded-lg transition-colors"
          >
            <Share2 className="w-3 h-3" />
            Export
          </button>
        )}
      </div>

      {/* Memory Sections Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <Section
          title="Goals"
          items={memory.goals}
          icon={Target}
          colorClass="text-purple-400"
        />
        <Section
          title="Completed Work"
          items={memory.completedWork}
          icon={CheckCircle2}
          colorClass="text-emerald-400"
        />
        <Section
          title="Pending Tasks"
          items={memory.pendingTasks}
          icon={ListTodo}
          colorClass="text-amber-400"
        />
        <Section
          title="Decisions"
          items={memory.decisions}
          icon={Lightbulb}
          colorClass="text-pink-400"
        />
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-white/5 bg-white/[0.01] text-[11px] text-gray-500 flex items-center justify-between">
        <span>Auto-updated by AI</span>
        <span className="text-[10px] font-mono text-gray-400">Memory Sync v2</span>
      </div>
    </div>
  );
}