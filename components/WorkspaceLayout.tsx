"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import type { Project } from "@/types";

interface WorkspaceContextType {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  contextPanelOpen: boolean;
  setContextPanelOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  toggleSidebar: () => void;
  toggleContextPanel: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within a WorkspaceLayout");
  }
  return ctx;
}

export default function WorkspaceLayout({
  projects,
  children,
}: {
  projects: Project[];
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [contextPanelOpen, setContextPanelOpen] = useState(true);

  // Keyboard shortcuts (Cmd/Ctrl + B for Sidebar, Cmd/Ctrl + I for Context Panel)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setSidebarOpen((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") {
        e.preventDefault();
        setContextPanelOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const toggleContextPanel = () => setContextPanelOpen((prev) => !prev);

  return (
    <WorkspaceContext.Provider
      value={{
        sidebarOpen,
        setSidebarOpen,
        contextPanelOpen,
        setContextPanelOpen,
        toggleSidebar,
        toggleContextPanel,
      }}
    >
      <div className="relative flex h-screen w-screen overflow-hidden text-[#f3f4f6]">
        {/* Spatial background visuals */}
        <div className="spatial-bg">
          <div className="spatial-glow-primary" />
          <div className="spatial-glow-secondary" />
          <div className="spatial-grid-pattern" />
          <div className="bg-grain" />
        </div>

        {/* Workspace Shell */}
        <div className="relative z-10 flex h-full w-full overflow-hidden">
          {/* Left Sidebar */}
          <Sidebar projects={projects} />

          {/* Center Main Workspace Content */}
          <div className="relative flex flex-1 flex-col h-full overflow-hidden min-w-0">
            {children}
          </div>
        </div>
      </div>
    </WorkspaceContext.Provider>
  );
}
