"use client";

import { useState } from "react";
import { createProjectAction } from "@/lib/actions";
import type { Domain } from "@/types";

const DOMAINS: Domain[] = ["Code", "Content", "Research", "Business", "Other"];

export default function NewProjectForm() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        + New Project
      </button>
    );
  }

  return (
    <form
      action={createProjectAction}
      className="mb-6 flex flex-col gap-3 rounded-md border border-gray-200 bg-gray-50 p-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">New Project</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>

      <input
        name="title"
        required
        placeholder="Project title"
        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      <textarea
        name="description"
        placeholder="Short description (optional)"
        rows={2}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      <select
        name="domain"
        defaultValue="Code"
        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
      >
        {DOMAINS.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>

      <button
        type="submit"
        className="self-start rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Create Project
      </button>
    </form>
  );
}
