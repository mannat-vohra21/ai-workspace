export type Domain = "Code" | "Content" | "Research" | "Business" | "Other";

export interface Project {
  id: string;
  title: string;
  description: string;
  domain: Domain;
  createdAt: string;
}

export type MessageRole = "user" | "assistant";

export interface VerificationInfo {
  status: "approved" | "revised";
  reason?: string;
  issues?: string[];
  plan?: string;
  builderProvider?: string;
  verifierProvider?: string;
}

/** Metadata stored in SQLite — NO content or base64, just enough to render chips. */
export interface AttachmentMeta {
  name: string;
  type: "text" | "image";
  size: number; // bytes (original)
}

/** Payload sent from client to API — includes actual content for processing. */
export interface AttachmentPayload {
  name: string;
  type: "text" | "image";
  mimeType: string;
  content: string; // plain text for text files, base64 for images
}

export interface Message {
  id: string;
  projectId: string;
  role: MessageRole;
  content: string;
  verification?: VerificationInfo | null;
  provider?: "gemini" | "groq" | "nvidia";
  attachments?: AttachmentMeta[];
  createdAt: string;
}

export interface ProjectMemory {
  goals: string[];
  completedWork: string[];
  pendingTasks: string[];
  decisions: string[];
}

export const EMPTY_MEMORY: ProjectMemory = {
  goals: [],
  completedWork: [],
  pendingTasks: [],
  decisions: [],
};

export interface ChatResponse {
  message: Message;
  memory: ProjectMemory;
}
