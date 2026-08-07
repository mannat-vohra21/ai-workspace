"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Code2,
  FileText,
  Microscope,
  Briefcase,
  Layers,
  Calendar,
  Trash2,
  ArrowRight,
  Bot,
} from "lucide-react";
import { deleteProjectAction } from "@/lib/actions";
import type { Project, Domain } from "@/types";

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

const DOMAIN_ICONS: Record<Domain, React.ElementType> = {
  Code: Code2,
  Content: FileText,
  Research: Microscope,
  Business: Briefcase,
  Other: Layers,
};

const DOMAIN_STYLES: Record<Domain, string> = {
  Code: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  Content: "bg-pink-500/10 text-pink-400 border-pink-500/30",
  Research: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  Business: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  Other: "bg-gray-500/10 text-gray-400 border-gray-500/30",
};

const DOMAIN_GLOW: Record<Domain, string> = {
  Code: "rgba(168, 85, 247, 0.18)",
  Content: "rgba(244, 114, 182, 0.18)",
  Research: "rgba(52, 211, 153, 0.18)",
  Business: "rgba(251, 191, 36, 0.18)",
  Other: "rgba(156, 163, 175, 0.18)",
};

export default function ProjectCard({ project }: { project: Project }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glow, setGlow] = useState({ x: 50, y: 50 });
  const [isDeleting, setIsDeleting] = useState(false);

  const DomainIcon = DOMAIN_ICONS[project.domain] || Layers;
  const glowColor = DOMAIN_GLOW[project.domain] ?? DOMAIN_GLOW.Other;

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;

    const maxTilt = 6;
    setTilt({
      x: (py - 0.5) * -maxTilt,
      y: (px - 0.5) * maxTilt,
    });
    setGlow({ x: px * 100, y: py * 100 });
  }

  function handleMouseLeave() {
    setTilt({ x: 0, y: 0 });
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transformStyle: "preserve-3d",
        transition: "transform 200ms cubic-bezier(0.16, 1, 0.3, 1)",
        background: `radial-gradient(circle at ${glow.x}% ${glow.y}%, ${glowColor}, transparent 65%), rgba(18, 18, 26, 0.75)`,
      }}
      className="group relative flex flex-col justify-between rounded-2xl border border-white/10 p-5 backdrop-blur-md transition-all duration-300 hover:border-violet-500/40 hover:shadow-2xl hover:shadow-purple-950/30"
    >
      <Link href={`/projects/${project.id}`} className="flex flex-col gap-3">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 group-hover:border-violet-500/30 group-hover:bg-violet-500/10 transition-colors">
              <DomainIcon className="w-5 h-5 text-gray-300 group-hover:text-violet-400 transition-colors" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-white group-hover:text-violet-200 transition-colors">
                {project.title}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-gray-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-gray-500" />
                  {formatDate(project.createdAt)}
                </span>
              </div>
            </div>
          </div>

          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${
              DOMAIN_STYLES[project.domain] ?? DOMAIN_STYLES.Other
            }`}
          >
            {project.domain}
          </span>
        </div>

        {/* Description */}
        <p className="line-clamp-2 text-xs text-gray-400 leading-relaxed min-h-[36px]">
          {project.description || "No description provided for this workspace."}
        </p>
      </Link>

      {/* Footer bar */}
      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <Bot className="w-3.5 h-3.5 text-violet-400" />
          <span>Dual AI Enabled</span>
        </div>

        <div className="flex items-center gap-2">
          <form action={deleteProjectAction} onSubmit={() => setIsDeleting(true)}>
            <input type="hidden" name="id" value={project.id} />
            <button
              type="submit"
              disabled={isDeleting}
              title="Delete workspace"
              className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </form>

          <Link
            href={`/projects/${project.id}`}
            className="flex items-center gap-1 text-xs font-medium text-violet-400 group-hover:text-violet-300 transition-colors"
          >
            Open
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}