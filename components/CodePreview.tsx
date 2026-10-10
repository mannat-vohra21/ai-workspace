"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, ExternalLink, Download, Check, Loader2 } from "lucide-react";
import { downloadProjectZip } from "@/lib/exportZip";

interface CodePreviewProps {
  code: string;
  language?: string;
  embedded?: boolean;
  title?: string;
}

function buildExecutableHtml(rawCode: string, lang?: string): string {
  const trimmed = rawCode.trim();
  const normalizedLang = (lang || "").toLowerCase();
  const isReact =
    normalizedLang === "jsx" ||
    normalizedLang === "tsx" ||
    normalizedLang === "react" ||
    trimmed.includes("import React") ||
    trimmed.includes("export default") ||
    (trimmed.includes("function App") && !trimmed.includes("<!DOCTYPE html>")) ||
    (trimmed.includes("const App =") && !trimmed.includes("<!DOCTYPE html>"));

  if (isReact) {
    // Clean React code for Babel browser runtime:
    // 1. Remove import statements that Babel standalone in browser can't resolve natively
    let clientCode = trimmed
      .replace(/import\s+React\s*(?:,\s*\{[^}]*\})?\s*from\s*['"][^'"]*['"];?/g, "")
      .replace(/import\s*\{[^}]*\}\s*from\s*['"][^'"]*['"];?/g, "")
      .replace(/import\s+[^'"]*\s*from\s*['"][^'"]*['"];?/g, "")
      .replace(/export\s+default\s+\w+;?/g, "")
      .replace(/export\s+default\s+/g, "const DefaultExport = ")
      .replace(/export\s+/g, "");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>Live React Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    html, body {
      color-scheme: light;
      background-color: #ffffff;
      color: #0f172a;
      min-height: 100vh;
      margin: 0;
      padding: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    #error-display {
      display: none;
      margin: 16px;
      padding: 16px;
      background: #fff1f2;
      border: 1px solid #fecdd3;
      border-radius: 8px;
      color: #9f1239;
      font-size: 13px;
    }
  </style>
</head>
<body class="bg-slate-50 text-slate-900 min-h-screen">
  <div id="error-display"></div>
  <div id="root"></div>

  <script>
    window.onerror = function(msg, url, lineNo, columnNo, error) {
      var errEl = document.getElementById("error-display");
      if (errEl) {
        errEl.style.display = "block";
        errEl.innerHTML = "<strong>Preview Runtime Notice:</strong><p style='margin-top:4px;font-family:monospace;'>" + (msg || error) + "</p>";
      }
      return false;
    };
  </script>

  <script type="text/babel">
    const { useState, useEffect, useRef, useMemo, useCallback } = React;

    // Resilient Icon Proxy: renders clean SVGs for any imported Lucide icon
    const LucideProxy = new Proxy({}, {
      get: function(target, prop) {
        return function FallbackIcon(props) {
          const size = props.size || 20;
          return (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={size}
              height={size}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={props.className || "w-5 h-5 inline-block"}
              {...props}
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v4l3 3" />
            </svg>
          );
        };
      }
    });

    const {
      ShoppingBag, ShoppingCart, Heart, Star, Menu, X, ArrowRight, ArrowLeft,
      User, Search, Filter, Check, ChevronRight, ChevronDown, ChevronLeft,
      Sparkles, Mail, Phone, MapPin, Instagram, Twitter, Facebook, Eye,
      Plus, Minus, Trash2, Edit, ExternalLink, ShieldCheck, Zap
    } = LucideProxy;

    try {
      ${clientCode}

      // Identify the component to mount
      var TargetComponent = null;
      if (typeof App !== 'undefined') {
        TargetComponent = App;
      } else if (typeof DefaultExport !== 'undefined') {
        TargetComponent = DefaultExport;
      } else if (typeof FashionSite !== 'undefined') {
        TargetComponent = FashionSite;
      } else if (typeof Website !== 'undefined') {
        TargetComponent = Website;
      } else if (typeof FashionWebsite !== 'undefined') {
        TargetComponent = FashionWebsite;
      } else if (typeof Main !== 'undefined') {
        TargetComponent = Main;
      } else {
        for (var key in window) {
          if (typeof window[key] === 'function' && /^[A-Z]/.test(key) && key !== 'React' && key !== 'ReactDOM' && key !== 'Babel' && key !== 'LucideProxy') {
            TargetComponent = window[key];
            break;
          }
        }
      }

      if (TargetComponent) {
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(TargetComponent));
      } else {
        document.getElementById('root').innerHTML = '<div class="p-6 text-sm text-slate-600">Component rendered.</div>';
      }
    } catch (err) {
      var errEl = document.getElementById("error-display");
      if (errEl) {
        errEl.style.display = "block";
        errEl.innerHTML = "<strong>React Compilation Notice:</strong><p style='margin-top:4px;font-family:monospace;'>" + err.message + "</p>";
      }
    }
  </script>
</body>
</html>`;
  }

  // Standard HTML page: inject Tailwind CDN and color guard if missing
  let html = trimmed;
  const tailwindCdn = '<script src="https://cdn.tailwindcss.com"></script>';
  const colorGuard = '<meta name="color-scheme" content="light"><style>html,body{color-scheme:light;background:#ffffff;color:#111111;}body{min-height:100vh;}</style>';

  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (headTag) => `${headTag}${colorGuard}${!html.includes('tailwindcss') ? tailwindCdn : ''}`);
  }
  if (/<html[^>]*>/i.test(html)) {
    return html.replace(/<html[^>]*>/i, (htmlTag) => `${htmlTag}<head>${colorGuard}${tailwindCdn}</head>`);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${colorGuard}
  ${tailwindCdn}
</head>
<body class="bg-white text-slate-900 min-h-screen">
  ${html}
</body>
</html>`;
}

export default function CodePreview({
  code,
  language = "html",
  embedded = false,
  title = "Fashion Project",
}: CodePreviewProps) {
  const [blobUrl, setBlobUrl] = useState<string>("");
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [downloadedZip, setDownloadedZip] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const executableHtml = buildExecutableHtml(code, language);

  const handleIframeLoad = () => {
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
      const node = iframeRef.current;
      if (node) {
        void node.getBoundingClientRect();
      }
    });
  };

  useEffect(() => {
    if (!executableHtml) return;
    const blob = new Blob([executableHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [executableHtml]);

  const handleOpenInNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, "_blank");
    }
  };

  const handleDownloadZip = async () => {
    try {
      setIsDownloadingZip(true);
      await downloadProjectZip({
        code,
        language,
        projectName: title || "fashion-website",
      });
      setDownloadedZip(true);
      setTimeout(() => setDownloadedZip(false), 2500);
    } catch (err) {
      console.error("ZIP download error:", err);
    } finally {
      setIsDownloadingZip(false);
    }
  };

  if (embedded) {
    return (
      <div className="relative w-full flex flex-col">
        {/* Sub-toolbar */}
        <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#101016] border-b border-white/5">
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live Sandboxed Runtime</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadZip}
              disabled={isDownloadingZip}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs text-violet-300 hover:text-white bg-violet-600/20 hover:bg-violet-600/35 border border-violet-500/30 transition-colors font-medium"
              title="Download project as ZIP file"
            >
              {isDownloadingZip ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Zipping...</span>
                </>
              ) : downloadedZip ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Downloaded ZIP</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download ZIP</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleOpenInNewTab}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs text-gray-400 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              title="Open preview in new browser tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Tab</span>
            </button>
          </div>
        </div>

        {/* Live Frame */}
        <div className="relative w-full h-[520px] bg-white">
          <iframe
            ref={iframeRef}
            srcDoc={executableHtml}
            sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
            className="w-full h-full border-none"
            title="Interactive Preview Sandbox"
            onLoad={handleIframeLoad}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mt-3 flex flex-col rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden shadow-xl">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-2 text-xs text-gray-300 font-medium">
          <Eye className="w-3.5 h-3.5 text-violet-400" />
          <span>Interactive Preview</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadZip}
            disabled={isDownloadingZip}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs text-violet-300 hover:text-white bg-violet-600/20 hover:bg-violet-600/35 border border-violet-500/30 transition-colors font-medium"
            title="Download full project as ZIP"
          >
            {isDownloadingZip ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Zipping...</span>
              </>
            ) : downloadedZip ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Downloaded ZIP</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Download ZIP</span>
              </>
            )}
          </button>

          <button
            onClick={handleOpenInNewTab}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-gray-400 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            title="Open preview in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open in new tab</span>
          </button>
        </div>
      </div>

      {/* Frame body */}
      <div className="relative w-full h-[500px] bg-white">
        <iframe
          ref={iframeRef}
          srcDoc={executableHtml}
          sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
          className="w-full h-full border-none"
          title="HTML Preview Sandbox"
          onLoad={handleIframeLoad}
        />
      </div>
    </div>
  );
}
