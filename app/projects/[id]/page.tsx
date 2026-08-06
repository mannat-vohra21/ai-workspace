import { notFound } from "next/navigation";
import Link from "next/link";
import * as db from "@/lib/db";
import ChatInterface from "@/components/ChatInterface";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = db.getProject(id);

  if (!project) {
    notFound();
  }

  const initialMessages = db.listMessages(id);
  const initialMemory = db.getMemory(id);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-6">
      <div>
        <Link href="/projects" className="text-sm text-gray-500 hover:text-gray-700">
          &larr; All projects
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">{project.title}</h1>
        {project.description && (
          <p className="text-sm text-gray-600">{project.description}</p>
        )}
      </div>

      <ChatInterface
        project={project}
        initialMessages={initialMessages}
        initialMemory={initialMemory}
      />
    </main>
  );
}
