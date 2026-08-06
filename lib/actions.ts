"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as db from "@/lib/db";
import type { Domain } from "@/types";

const VALID_DOMAINS: Domain[] = ["Code", "Content", "Research", "Business", "Other"];

export async function createProjectAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const domainRaw = String(formData.get("domain") ?? "Other");
  const domain = VALID_DOMAINS.includes(domainRaw as Domain) ? (domainRaw as Domain) : "Other";

  if (!title) {
    throw new Error("Project title is required.");
  }

  const project = db.createProject({ title, description, domain });
  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}

export async function deleteProjectAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  db.deleteProject(id);
  revalidatePath("/projects");
  redirect("/projects");
}
