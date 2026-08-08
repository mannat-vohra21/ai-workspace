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

export interface Message {
  id: string;
  projectId: string;
  role: MessageRole;
  content: string;
  verification?: VerificationInfo | null;
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
