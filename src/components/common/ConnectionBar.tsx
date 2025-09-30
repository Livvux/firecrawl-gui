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
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/40"
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-slate-900">Connection</h2>
          <p className="text-sm text-slate-500">
            Point the console to your Firecrawl deployment and optionally include an API key.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              Server base URL
            </span>
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-orange-400"
              value={baseUrl}
              onChange={(event) => onConfigChange({ baseUrl: event.target.value })}
              placeholder="https://firecrawl.local"
              required
              autoComplete="url"
            />
            {validationMessage && (
              <span className="text-xs text-rose-500">{validationMessage}</span>
            )}
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              API key (optional)
            </span>
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-orange-400"
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
            <span className="text-slate-500">Health:</span>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-semibold",
                isChecking
                  ? "bg-slate-200 text-slate-600"
                  : lastHealth?.status === "ok"
                    ? "bg-emerald-100 text-emerald-700"
                    : errorMessage
                      ? "bg-rose-100 text-rose-600"
                      : "bg-slate-100 text-slate-600",
              )}
            >
              {isChecking
                ? "Checking..."
                : lastHealth?.status?.toUpperCase() ?? "UNKNOWN"}
            </span>
            {lastHealth?.version && (
              <span className="text-xs text-slate-400">v{lastHealth.version}</span>
            )}
            {healthUnsupported && (
              <span className="text-xs text-amber-600">
                Endpoint missing
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
              disabled={isChecking || !!validationMessage}
            >
              {isChecking ? "Checking..." : "Check connection"}
            </button>
            {errorMessage && (
              <span className="text-xs text-rose-500">{errorMessage}</span>
            )}
          </div>
        </div>
        {healthNotice && (
          <p className="rounded-2xl border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            {healthNotice}
          </p>
        )}
      </div>
    </form>
  );
};
