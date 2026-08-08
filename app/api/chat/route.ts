import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";
import { generateBuilderResponse, updateMemoryFromExchange } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const { projectId, message } = (await request.json()) as {
      projectId?: string;
      message?: string;
    };

    if (!projectId || !message?.trim()) {
      return NextResponse.json(
        { error: "projectId and message are required." },
        { status: 400 }
      );
    }

    const project = db.getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const history = db.listMessages(projectId);
    db.addMessage({ projectId, role: "user", content: message });

    const { text: aiText, provider } = await generateBuilderResponse(history, message, project.domain);
    const assistantMessage = db.addMessage({
      projectId,
      role: "assistant",
      content: aiText,
      provider,
    });

    const currentMemory = db.getMemory(projectId);
    const updatedMemory = await updateMemoryFromExchange(currentMemory, message, aiText);
    db.setMemory(projectId, updatedMemory);

    return NextResponse.json({ message: assistantMessage, memory: updatedMemory });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
