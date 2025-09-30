"use client";

import { useState } from "react";
import { JsonValue } from "@/domain/firecrawl";

interface ResultPaneProps {
  data?: JsonValue;
  error?: string;
  isLoading?: boolean;
  preview?: string;
  onClosePreview?: () => void;
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

export const ResultPane = ({ data, error: errorMessage, isLoading, preview, onClosePreview }: ResultPaneProps) => {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
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
    <section className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/40">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-500 transition hover:bg-slate-100"
          >
            {isOpen ? "Collapse" : "Expand"}
          </button>
          <span className="font-medium text-slate-700">Response</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-full border border-slate-200 px-3 py-1 transition hover:bg-slate-100"
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
                ? "rounded-full border border-slate-200 px-3 py-1 transition hover:bg-slate-100"
                : "rounded-full border border-slate-100 px-3 py-1 text-slate-300"
            }
            disabled={!content}
          >
            Download
          </button>
        </div>
      </header>
      {preview && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-600">
          <div className="flex items-center justify-between">
            <span className="font-medium uppercase tracking-[0.24em] text-slate-500">
              Request payload
            </span>
            <button
              type="button"
              className="text-xs text-slate-400 underline hover:text-slate-600"
              onClick={onClosePreview}
            >
              Hide
            </button>
          </div>
          <pre className="overflow-auto text-xs leading-relaxed">{preview}</pre>
        </div>
      )}
      {isOpen && (
        <div className="relative">
          <pre className="h-72 overflow-auto rounded-2xl bg-slate-900/95 p-4 font-mono text-xs leading-relaxed text-slate-100">
            {isLoading ? "Loading..." : content || "No data yet."}
          </pre>
        </div>
      )}
      {errorMessage && <p className="text-xs text-rose-500">{errorMessage}</p>}
    </section>
  );
};
