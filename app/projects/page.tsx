import * as db from "@/lib/db";
import NewProjectForm from "@/components/NewProjectForm";
import ProjectCard from "@/components/ProjectCard";

export default async function ProjectsPage() {
  const projects = db.listProjects();

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        <NewProjectForm />
      </div>

      {projects.length === 0 ? (
        <p className="text-sm text-gray-500">
          No projects yet. Create one to get started.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </main>
  );
}
