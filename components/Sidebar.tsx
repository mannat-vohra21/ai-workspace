"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  Sparkles,
  FolderKanban,
  Plus,
  PanelLeftClose,
  PanelLeft,
  Search,
  Bot,
  Zap,
  Code2,
  FileText,
  Microscope,
  Briefcase,
  Layers,
} from "lucide-react";
import { useWorkspace } from "./WorkspaceLayout";
import type { Project, Domain } from "@/types";
import NewProjectForm from "@/components/NewProjectForm";

const DOMAIN_ICONS: Record<Domain, React.ElementType> = {
  Code: Code2,
  Content: FileText,
  Research: Microscope,
  Business: Briefcase,
  Other: Layers,
};

const DOMAIN_COLOR_CLASSES: Record<Domain, string> = {
  Code: "text-purple-400 bg-white/[0.03] border-white/10",
  Content: "text-pink-400 bg-white/[0.03] border-white/10",
  Research: "text-emerald-400 bg-white/[0.03] border-white/10",
  Business: "text-amber-400 bg-white/[0.03] border-white/10",
  Other: "text-gray-400 bg-white/[0.03] border-white/10",
};

export default function Sidebar({ projects }: { projects: Project[] }) {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useWorkspace();
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);

  const filteredProjects = projects.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.domain.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <aside
        className={`relative z-20 flex flex-col h-full glass-panel border-r border-white/[0.06] transition-all duration-300 ease-out select-none ${
          sidebarOpen ? "w-68" : "w-16"
        }`}
      >
        {/* Header Branding */}
        <div className="flex items-center justify-between h-14 px-3.5 border-b border-white/[0.06]">
          <Link href="/projects" className="flex items-center gap-2.5 overflow-hidden group">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 border border-white/10 text-white">
              <Sparkles className="w-4 h-4 text-violet-400" />
            </div>
            {sidebarOpen && (
              <div className="flex flex-col">
                <span className="text-xs font-semibold tracking-tight text-gray-200 flex items-center gap-1">
                  AI WORKSPACE
                  <span className="text-[9px] uppercase font-bold tracking-wider px-1 py-0.2 rounded bg-white/5 text-gray-400 border border-white/10">
                    Dual AI
                  </span>
                </span>
                <span className="text-[10px] text-gray-400">Spatial Workspace</span>
              </div>
            )}
          </Link>

          <button
            onClick={toggleSidebar}
            title={sidebarOpen ? "Collapse Sidebar (Ctrl+B)" : "Expand Sidebar (Ctrl+B)"}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Action Button: New Project */}
        <div className="p-2.5">
          <button
            onClick={() => setIsNewProjectModalOpen(true)}
            className={`w-full flex items-center justify-center gap-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white font-medium text-xs py-2 px-3 transition-colors group ${
              !sidebarOpen ? "px-0" : ""
            }`}
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            {sidebarOpen && <span>New Project</span>}
          </button>
        </div>

        {/* Search Bar (Expanded state only) */}
        {sidebarOpen && (
          <div className="px-2.5 mb-2">
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg pl-8 pr-2.5 py-1 text-xs text-gray-200 placeholder:text-gray-400 focus:outline-none focus:border-white/20 transition-all"
              />
            </div>
          </div>
        )}

        {/* Navigation & Projects List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
          {/* Main Route: All Projects */}
          <Link
            href="/projects"
            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              pathname === "/projects"
                ? "bg-white/10 text-white border border-white/10"
                : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
            }`}
            title="All Projects"
          >
            <FolderKanban className="w-4 h-4 shrink-0 text-gray-400" />
            {sidebarOpen && <span>All Projects</span>}
          </Link>

          {sidebarOpen && (
            <div className="pt-2.5 pb-1 px-2.5 flex items-center justify-between text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
              <span>Workspaces</span>
              <span className="text-[10px] text-gray-400 bg-white/5 px-1.5 py-0.2 rounded font-mono">
                {filteredProjects.length}
              </span>
            </div>
          )}

          {/* Project Items */}
          <div className="space-y-0.5">
            {filteredProjects.map((project) => {
              const isActive = pathname === `/projects/${project.id}`;
              const DomainIcon = DOMAIN_ICONS[project.domain] || Layers;
              const colorClass = DOMAIN_COLOR_CLASSES[project.domain] || DOMAIN_COLOR_CLASSES.Other;

              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                    isActive
                      ? "bg-white/10 text-white border border-white/10 font-medium"
                      : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                  }`}
                  title={project.title}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <DomainIcon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-violet-400" : "text-gray-400"}`} />
                    {sidebarOpen && (
                      <span className="truncate">{project.title}</span>
                    )}
                  </div>

                  {sidebarOpen && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded border shrink-0 ${colorClass}`}
                    >
                      {project.domain}
                    </span>
                  )}
                </Link>
              );
            })}

            {filteredProjects.length === 0 && sidebarOpen && (
              <div className="p-2 text-center text-xs text-gray-400">
                No projects found
              </div>
            )}
          </div>
        </div>

        {/* Footer: User & Dual AI Engine Status */}
        <div className="p-2.5 border-t border-white/[0.06]">
          <div
            className={`flex items-center gap-2.5 p-2 rounded-lg bg-white/[0.02] border border-white/[0.06] ${
              !sidebarOpen ? "justify-center px-0" : ""
            }`}
          >
            <div className="relative flex items-center justify-center w-7 h-7 rounded-md bg-white/5 border border-white/10 text-gray-300">
              <Bot className="w-3.5 h-3.5" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full" />
            </div>

            {sidebarOpen && (
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-medium text-gray-300 truncate">Builder & Verifier</span>
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5 text-emerald-400" /> Active Engine
                </span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* New Project Modal Dialog */}
      {isNewProjectModalOpen && (
        <NewProjectForm onClose={() => setIsNewProjectModalOpen(false)} />
      )}
    </>
  );
}
