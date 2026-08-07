"use client";

import { useState } from "react";
import ProjectCard from "@/components/ProjectCard";
import NewProjectForm from "@/components/NewProjectForm";
import type { Project, Domain } from "@/types";
import { FolderKanban, Sparkles, Code2, FileText, Microscope, Briefcase, Layers } from "lucide-react";

const FILTER_TABS: { id: string; label: string; icon: React.ElementType }[] = [
  { id: "ALL", label: "All Workspaces", icon: FolderKanban },
  { id: "Code", label: "Code", icon: Code2 },
  { id: "Content", label: "Content", icon: FileText },
  { id: "Research", label: "Research", icon: Microscope },
  { id: "Business", label: "Business", icon: Briefcase },
  { id: "Other", label: "Other", icon: Layers },
];

export default function ProjectsGallery({
  initialProjects,
}: {
  initialProjects: Project[];
}) {
  const [activeTab, setActiveTab] = useState("ALL");

  const filteredProjects =
    activeTab === "ALL"
      ? initialProjects
      : initialProjects.filter((p) => p.domain === activeTab);

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {FILTER_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const count =
            tab.id === "ALL"
              ? initialProjects.length
              : initialProjects.filter((p) => p.domain === tab.id).length;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium border transition-all whitespace-nowrap ${
                isActive
                  ? "bg-violet-600/20 border-violet-500 text-white shadow-lg shadow-violet-950/40"
                  : "bg-white/[0.03] border-white/10 text-gray-400 hover:text-gray-200 hover:bg-white/5"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-violet-400" : "text-gray-400"}`} />
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] ${isActive ? "bg-violet-500/30 text-violet-200" : "bg-white/5 text-gray-500"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid of Projects */}
      {filteredProjects.length === 0 ? (
        <div className="rounded-2xl border border-white/10 glass-panel p-12 text-center max-w-lg mx-auto my-8 space-y-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400 mb-2">
            <Sparkles className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-white">No Workspaces Found</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            {activeTab === "ALL"
              ? "You haven't created any AI workspace yet. Launch your first project to start working with dual AI agents."
              : `No workspaces found under the "${activeTab}" domain.`}
          </p>
          <div className="pt-2 flex justify-center">
            <NewProjectForm />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" style={{ perspective: "1200px" }}>
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
