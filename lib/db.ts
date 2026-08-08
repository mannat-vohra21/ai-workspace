import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import type { Domain, Message, Project, ProjectMemory, VerificationInfo } from "@/types";
import { EMPTY_MEMORY } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "app.db");

function initDb(): Database.Database {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      domain TEXT NOT NULL,
      memory TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      verification TEXT,
      provider TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_messages_project_id ON messages(project_id);
  `);

  // Migration safety net for databases created before the `provider` column
  // existed — CREATE TABLE IF NOT EXISTS above won't add it to an old table.
  const messageColumns = db.prepare("PRAGMA table_info(messages)").all() as { name: string }[];
  if (!messageColumns.some((c) => c.name === "provider")) {
    db.exec("ALTER TABLE messages ADD COLUMN provider TEXT");
  }

  return db;
}

// Cache the connection on globalThis so Next.js dev server hot-reloads
// don't open a new sqlite connection on every module re-evaluation.
const globalForDb = globalThis as unknown as { __db?: Database.Database };
const db = globalForDb.__db ?? initDb();
if (process.env.NODE_ENV !== "production") {
  globalForDb.__db = db;
}

interface ProjectRow {
  id: string;
  title: string;
  description: string;
  domain: string;
  memory: string;
  created_at: string;
}

interface MessageRow {
  id: string;
  project_id: string;
  role: string;
  content: string;
  verification: string | null;
  provider: string | null;
  created_at: string;
}

function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    domain: row.domain as Domain,
    createdAt: row.created_at,
  };
}

function rowToMessage(row: MessageRow): Message {
  return {
    id: row.id,
    projectId: row.project_id,
    role: row.role as Message["role"],
    content: row.content,
    verification: row.verification ? (JSON.parse(row.verification) as VerificationInfo) : null,
    provider: (row.provider as Message["provider"]) ?? undefined,
    createdAt: row.created_at,
  };
}

export function listProjects(): Project[] {
  const rows = db
    .prepare("SELECT * FROM projects ORDER BY created_at DESC")
    .all() as ProjectRow[];
  return rows.map(rowToProject);
}

export function getProject(id: string): Project | null {
  const row = db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as
    | ProjectRow
    | undefined;
  return row ? rowToProject(row) : null;
}

export function createProject(input: {
  title: string;
  description: string;
  domain: Domain;
}): Project {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  db.prepare(
    "INSERT INTO projects (id, title, description, domain, memory, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, input.title, input.description, input.domain, JSON.stringify(EMPTY_MEMORY), createdAt);
  return { id, title: input.title, description: input.description, domain: input.domain, createdAt };
}

export function deleteProject(id: string): void {
  db.prepare("DELETE FROM messages WHERE project_id = ?").run(id);
  db.prepare("DELETE FROM projects WHERE id = ?").run(id);
}

export function getMemory(projectId: string): ProjectMemory {
  const row = db.prepare("SELECT memory FROM projects WHERE id = ?").get(projectId) as
    | { memory: string }
    | undefined;
  if (!row) return EMPTY_MEMORY;
  try {
    return JSON.parse(row.memory) as ProjectMemory;
  } catch {
    return EMPTY_MEMORY;
  }
}

export function setMemory(projectId: string, memory: ProjectMemory): void {
  db.prepare("UPDATE projects SET memory = ? WHERE id = ?").run(
    JSON.stringify(memory),
    projectId
  );
}

export function listMessages(projectId: string): Message[] {
  const rows = db
    .prepare("SELECT * FROM messages WHERE project_id = ? ORDER BY created_at ASC")
    .all(projectId) as MessageRow[];
  return rows.map(rowToMessage);
}

export function addMessage(input: {
  projectId: string;
  role: Message["role"];
  content: string;
  verification?: VerificationInfo | null;
  provider?: Message["provider"] | null;
}): Message {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  db.prepare(
    "INSERT INTO messages (id, project_id, role, content, verification, provider, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(
    id,
    input.projectId,
    input.role,
    input.content,
    input.verification ? JSON.stringify(input.verification) : null,
    input.provider ?? null,
    createdAt
  );
  return {
    id,
    projectId: input.projectId,
    role: input.role,
    content: input.content,
    verification: input.verification ?? null,
    provider: input.provider ?? undefined,
    createdAt,
  };
}
