"use client";

import { useState } from "react";
import { JsonValue } from "@/domain/firecrawl";

interface ResultPaneProps {
  data?: JsonValue;
  error?: string;
  isLoading?: boolean;
}

const prettyPrint = (value: JsonValue | undefined) => {
  if (value === undefined) {
    return "";
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

export const ResultPane = ({ data, error: errorMessage, isLoading }: ResultPaneProps) => {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const [isOpen, setIsOpen] = useState(true);

  const content = errorMessage ?? prettyPrint(data);

  const handleCopy = async () => {
    if (!content) {
      return;
    }
    try {
      await navigator.clipboard.writeText(content);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch (err) {
      console.warn("Failed to copy", err);
      setCopyState("error");
      setTimeout(() => setCopyState("idle"), 2000);
    }
  };

  const handleDownload = () => {
    if (!content) {
      return;
    }
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "firecrawl-response.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="flex h-full flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm text-slate-300">
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="rounded-md border border-slate-700 px-2 py-1 text-xs uppercase tracking-wide text-slate-200 transition hover:border-cyan-400 hover:text-white"
          >
            {isOpen ? "Collapse" : "Expand"}
          </button>
          <span className="font-medium text-slate-300">Response</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-md border border-slate-700 px-3 py-1 transition hover:border-slate-500"
          >
            {copyState === "copied"
              ? "Copied"
              : copyState === "error"
                ? "Copy failed"
                : "Copy"}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className={
              content
                ? "rounded-md border border-slate-700 px-3 py-1 transition hover:border-slate-500"
                : "rounded-md border border-slate-800 px-3 py-1 text-slate-500"
            }
            disabled={!content}
          >
            Download
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="relative flex-1">
          <pre className="h-72 overflow-auto rounded-lg bg-slate-950/70 p-4 text-xs leading-relaxed text-slate-200">
            {isLoading ? "Loading..." : content || "No data yet."}
          </pre>
        </div>
      )}
      {errorMessage && <p className="text-xs text-rose-300">{errorMessage}</p>}
    </section>
  );
};
