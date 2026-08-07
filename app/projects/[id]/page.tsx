import { notFound } from "next/navigation";
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
    <main className="flex-1 flex flex-col h-full w-full overflow-hidden">
      <ChatInterface
        project={project}
        initialMessages={initialMessages}
        initialMemory={initialMemory}
      />
    </main>
  );
}