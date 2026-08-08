"use client";

import { useEffect, useState } from "react";
import { Eye, ExternalLink } from "lucide-react";

interface CodePreviewProps {
  code: string;
}

export default function CodePreview({ code }: CodePreviewProps) {
  const [blobUrl, setBlobUrl] = useState<string>("");

  useEffect(() => {
    // Generate a Blob URL for the "Open in new tab" feature
    if (!code) return;
    const blob = new Blob([code], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);

    // Clean up the URL on unmount or when code changes
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [code]);

  const handleOpenInNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, "_blank");
    }
  };

  return (
    <div className="w-full mt-3 flex flex-col rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] bg-white/[0.01]">
        <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
          <Eye className="w-3.5 h-3.5 text-violet-400" />
          <span>Live Preview</span>
        </div>
        <button
          onClick={handleOpenInNewTab}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] text-gray-400 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          title="Open preview in new tab"
        >
          <ExternalLink className="w-3 h-3" />
          <span>Open in new tab</span>
        </button>
      </div>

      {/* Frame body */}
      <div className="relative w-full h-[400px] bg-white">
        <iframe
          srcDoc={code}
          sandbox="allow-scripts"
          className="w-full h-full border-none"
          title="HTML Preview Sandbox"
        />
      </div>
    </div>
  );
}
