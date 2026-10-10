"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy, Download, Loader2, FileCode } from "lucide-react";
import { downloadProjectZip } from "@/lib/exportZip";

interface FormattedMessageProps {
  content: string;
  isUser: boolean;
}

function CodeBlock({
  language,
  value,
}: {
  language: string;
  value: string;
}) {
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [zipped, setZipped] = useState(false);

  const normalizedLang = (language || "").toLowerCase();
  const lowerVal = value.toLowerCase();

  // Check if this code represents exportable project/website files
  const isExportable =
    normalizedLang === "html" ||
    normalizedLang === "jsx" ||
    normalizedLang === "tsx" ||
    normalizedLang === "react" ||
    normalizedLang === "javascript" ||
    normalizedLang === "typescript" ||
    lowerVal.includes("<body") ||
    lowerVal.includes("<html") ||
    lowerVal.includes("import react") ||
    lowerVal.includes("export default") ||
    lowerVal.includes("function app") ||
    lowerVal.includes("const app =") ||
    value.trim().length >= 80;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleDownloadZip = async () => {
    try {
      setIsZipping(true);
      await downloadProjectZip({
        code: value,
        language: normalizedLang || "html",
        projectName: "website-project",
      });
      setZipped(true);
      setTimeout(() => setZipped(false), 2500);
    } catch (err) {
      console.error("Zip download failed:", err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="my-4 rounded-xl border border-white/[0.09] bg-[#0c0c12] overflow-hidden shadow-2xl">
      {/* Code Card Top Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <FileCode className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-violet-300">
            {language || "code"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isExportable && (
            <button
              type="button"
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs text-violet-300 hover:text-white bg-violet-600/20 hover:bg-violet-600/35 border border-violet-500/30 transition-colors font-medium cursor-pointer"
              title="Download project as ready-to-run ZIP bundle"
            >
              {isZipping ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Zipping...</span>
                </>
              ) : zipped ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Downloaded ZIP</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download ZIP</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-gray-400 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
            title="Copy code to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Body */}
      <div className="p-4 overflow-x-auto max-h-[550px] text-xs font-mono leading-relaxed text-gray-200 bg-[#08080d]">
        <pre className="font-mono">
          <code>{value}</code>
        </pre>
      </div>
    </div>
  );
}

export default function FormattedMessage({ content, isUser }: FormattedMessageProps) {
  if (isUser) {
    return <div className="whitespace-pre-wrap leading-relaxed">{content}</div>;
  }

  return (
    <div className="prose prose-invert max-w-none text-sm leading-relaxed space-y-2.5">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-base font-bold text-white mt-4 mb-2 pb-1 border-b border-white/10 tracking-tight">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-semibold text-gray-100 mt-3.5 mb-1.5 tracking-tight">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-semibold text-violet-300 mt-2.5 mb-1 uppercase tracking-wider">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-sm text-gray-200 leading-relaxed my-1.5 last:mb-0">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-outside pl-5 my-2 space-y-1 text-gray-200 text-sm">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside pl-5 my-2 space-y-1 text-gray-200 text-sm">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-sm text-gray-200 leading-relaxed pl-0.5">
              {children}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-violet-400/70 pl-3.5 py-1.5 my-2.5 text-gray-300 italic bg-white/[0.02] rounded-r-lg">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-xs text-left border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-white/[0.06] text-gray-200 font-semibold border-b border-white/10">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-white/5 text-gray-300">{children}</tbody>
          ),
          tr: ({ children }) => <tr className="hover:bg-white/[0.02] transition-colors">{children}</tr>,
          th: ({ children }) => <th className="px-3.5 py-2.5 font-semibold text-gray-200">{children}</th>,
          td: ({ children }) => <td className="px-3.5 py-2 text-gray-300">{children}</td>,
          strong: ({ children }) => (
            <strong className="font-semibold text-white tracking-normal">{children}</strong>
          ),
          em: ({ children }) => <em className="italic text-gray-300">{children}</em>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors"
            >
              {children}
            </a>
          ),
          hr: () => <hr className="my-4 border-white/10" />,
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const codeString = String(children).replace(/\n$/, "");
            const isMultiline = codeString.includes("\n") || Boolean(match);

            if (isMultiline) {
              return <CodeBlock language={match ? match[1] : ""} value={codeString} />;
            }

            return (
              <code
                className="px-1.5 py-0.5 rounded-md bg-white/[0.08] text-violet-300 font-mono text-xs border border-white/10"
                {...props}
              >
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
