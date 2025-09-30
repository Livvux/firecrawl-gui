"use client";

import { FormEvent } from "react";
import { HealthResponse } from "@/domain/firecrawl";
import { cn } from "@/lib/utils";

interface ConnectionBarProps {
  baseUrl: string;
  apiKey: string;
  onConfigChange: (values: { baseUrl?: string; apiKey?: string }) => void;
  onCheck: () => Promise<void>;
  isChecking: boolean;
  validationMessage?: string;
  lastHealth?: HealthResponse;
  errorMessage?: string;
  healthUnsupported?: boolean;
  healthNotice?: string;
}

export const ConnectionBar = ({
  baseUrl,
  apiKey,
  onConfigChange,
  onCheck,
  isChecking,
  validationMessage,
  lastHealth,
  errorMessage,
  healthUnsupported,
  healthNotice,
}: ConnectionBarProps) => {
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onCheck();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/30"
    >
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Connection</h2>
          <p className="text-sm text-slate-400">
            Provide the base URL for your self-hosted Firecrawl instance and an
            optional API key.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Server base URL
            </span>
            <input
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-400"
              value={baseUrl}
              onChange={(event) => onConfigChange({ baseUrl: event.target.value })}
              placeholder="https://firecrawl.local"
              required
              autoComplete="url"
            />
            {validationMessage && (
              <span className="text-xs text-rose-400">{validationMessage}</span>
            )}
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              API key (optional)
            </span>
            <input
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-400"
              value={apiKey}
              onChange={(event) => onConfigChange({ apiKey: event.target.value })}
              placeholder="fc-..."
              autoComplete="off"
              type="password"
            />
          </label>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-400">Health:</span>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-semibold",
                isChecking
                  ? "bg-slate-700 text-slate-200"
                  : lastHealth?.status === "ok"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : errorMessage
                      ? "bg-rose-500/20 text-rose-300"
                      : "bg-slate-700/80 text-slate-300",
              )}
            >
              {isChecking
                ? "Checking..."
                : lastHealth?.status?.toUpperCase() ?? "Unknown"}
            </span>
            {lastHealth?.version && (
              <span className="text-xs text-slate-400">
                v{lastHealth.version}
              </span>
            )}
            {healthUnsupported && (
              <span className="text-xs text-amber-300">
                Endpoint nicht vorhanden
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              disabled={isChecking || !!validationMessage}
            >
              {isChecking ? "Checking..." : "Check connection"}
            </button>
            {errorMessage && (
              <span className="text-xs text-rose-300">{errorMessage}</span>
            )}
          </div>
        </div>
        {healthNotice && (
          <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            {healthNotice}
          </p>
        )}
      </div>
    </form>
  );
};
