import * as db from "@/lib/db";
import NewProjectForm from "@/components/NewProjectForm";
import ProjectsGallery from "./ProjectsGallery";

export default async function ProjectsPage() {
  const projects = db.listProjects();

  return (
    <main className="flex-1 overflow-y-auto p-6 md:p-10 select-none">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-400 mb-1">
              <span className="inline-block w-2 h-2 rounded-full bg-violet-500 animate-ping" />
              Collaborative Workspaces
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              AI Workspaces
            </h1>
            <p className="mt-1.5 text-sm text-gray-400 max-w-xl">
              Select or launch an AI-to-AI workspace. Dual agents analyze, verify, and execute your project tasks in real time.
            </p>
          </div>

          <div className="shrink-0">
            <NewProjectForm />
          </div>
        </div>

        {/* Gallery Component with Filtering */}
        <ProjectsGallery initialProjects={projects} />
      </div>
    </main>
  );
}