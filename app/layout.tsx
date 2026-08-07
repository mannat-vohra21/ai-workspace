import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import * as db from "@/lib/db";
import WorkspaceLayout from "@/components/WorkspaceLayout";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Workspace | Spatial Dual-AI Platform",
  description: "AI-to-AI workspace with project memory and verified multi-agent build mode",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const projects = db.listProjects();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="h-full bg-[#07070a] text-[#f3f4f6] overflow-hidden antialiased">
        <WorkspaceLayout projects={projects}>{children}</WorkspaceLayout>
      </body>
    </html>
  );
}
