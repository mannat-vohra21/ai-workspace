import Link from "next/link";
import { deleteProjectAction } from "@/lib/actions";
import type { Project } from "@/types";

const DOMAIN_COLORS: Record<string, string> = {
  Code: "bg-purple-100 text-purple-700",
  Content: "bg-pink-100 text-pink-700",
  Research: "bg-green-100 text-green-700",
  Business: "bg-amber-100 text-amber-700",
  Other: "bg-gray-100 text-gray-700",
};

export default function ProjectCard({ project }: { project: Project }) {
  return (
    <div className="flex flex-col justify-between rounded-md border border-gray-200 p-4 hover:border-gray-300">
      <Link href={`/projects/${project.id}`} className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-gray-900">{project.title}</h3>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
              DOMAIN_COLORS[project.domain] ?? DOMAIN_COLORS.Other
            }`}
          >
            {project.domain}
          </span>
        </div>
        {project.description && (
          <p className="line-clamp-2 text-sm text-gray-600">{project.description}</p>
        )}
        <p className="text-xs text-gray-400">
          Created {new Date(project.createdAt).toLocaleDateString()}
        </p>
      </Link>
      <form action={deleteProjectAction} className="mt-3 self-end">
        <input type="hidden" name="id" value={project.id} />
        <button type="submit" className="text-xs text-gray-400 hover:text-red-600">
          Delete
        </button>
      </form>
    </div>
  );
}
