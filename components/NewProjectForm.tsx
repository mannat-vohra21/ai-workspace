"use client";

import { useState } from "react";
import { X, Sparkles, Code2, FileText, Microscope, Briefcase, Layers } from "lucide-react";
import { createProjectAction } from "@/lib/actions";
import type { Domain } from "@/types";

const DOMAINS: { id: Domain; label: string; icon: React.ElementType; color: string }[] = [
  { id: "Code", label: "Code", icon: Code2, color: "hover:border-purple-500/50 hover:bg-purple-500/10 text-purple-400" },
  { id: "Content", label: "Content", icon: FileText, color: "hover:border-pink-500/50 hover:bg-pink-500/10 text-pink-400" },
  { id: "Research", label: "Research", icon: Microscope, color: "hover:border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-400" },
  { id: "Business", label: "Business", icon: Briefcase, color: "hover:border-amber-500/50 hover:bg-amber-500/10 text-amber-400" },
  { id: "Other", label: "Other", icon: Layers, color: "hover:border-gray-500/50 hover:bg-gray-500/10 text-gray-400" },
];

export default function NewProjectForm({ onClose }: { onClose?: () => void }) {
  const [selectedDomain, setSelectedDomain] = useState<Domain>("Code");
  const [isOpenInline, setIsOpenInline] = useState(false);

  // If no onClose prop is provided, render trigger button and modal internally
  if (!onClose && !isOpenInline) {
    return (
      <button
        onClick={() => setIsOpenInline(true)}
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-950/40 hover:shadow-purple-900/60 transition-all hover:scale-[1.02]"
      >
        <Sparkles className="w-4 h-4" />
        New Project
      </button>
    );
  }

  const handleDismiss = () => {
    if (onClose) {
      onClose();
    } else {
      setIsOpenInline(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div
        className="relative w-full max-w-lg rounded-2xl glass-panel p-6 shadow-2xl shadow-purple-950/50 border border-white/10 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Create New Workspace</h2>
              <p className="text-xs text-gray-400">Setup a collaborative AI environment for your goal</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form action={createProjectAction} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Project Title <span className="text-pink-400">*</span>
            </label>
            <input
              name="title"
              required
              autoFocus
              placeholder="e.g. Next.js Architecture Redesign"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              name="description"
              placeholder="Briefly describe the domain, goal, or context..."
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-2">
              Domain Category
            </label>
            <input type="hidden" name="domain" value={selectedDomain} />
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {DOMAINS.map((d) => {
                const Icon = d.icon;
                const isSelected = selectedDomain === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedDomain(d.id)}
                    className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-violet-600/20 border-violet-500 text-white shadow-lg shadow-violet-950/40"
                        : `bg-white/[0.03] border-white/10 text-gray-400 ${d.color}`
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{d.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={handleDismiss}
              className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-purple-950/40 hover:shadow-purple-900/60 transition-transform hover:scale-[1.02]"
            >
              Create Workspace
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}