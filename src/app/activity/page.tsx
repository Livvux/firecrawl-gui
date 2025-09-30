"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityItem } from "@/domain/firecrawl";
import { createFirecrawlClient, FirecrawlError } from "@/io/firecrawl-client";
import { usePolling } from "@/hooks/usePolling";
import { useLocalConfig } from "@/state/useLocalConfig";

const formatDate = (value?: string | null) => {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
};

export default function ActivityPage() {
  const { config } = useLocalConfig();
  const [unsupported, setUnsupported] = useState(false);

  const client = useMemo(() => {
    if (!config.baseUrl) {
      return undefined;
    }
    return createFirecrawlClient({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
    });
  }, [config.baseUrl, config.apiKey]);

  const fetchActivity = useCallback(
    async (signal: AbortSignal) => {
      if (!client) {
        throw new Error("Configure the server URL first.");
      }
      return client.activity({ signal });
    },
    [client],
  );

  const { data, error, isLoading, isActive, start, stop } = usePolling<ActivityItem[]>(
    fetchActivity,
    6000,
    {
      autoStart: false,
      onError: (err) => {
        if (err instanceof FirecrawlError && err.status === 404) {
          setUnsupported(true);
          stop();
        }
      },
    },
  );

  useEffect(() => {
    if (!client) {
      stop();
      return;
    }
    setUnsupported(false);
    start();
    return stop;
  }, [client, start, stop]);

  if (!config.baseUrl) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
        Configure your Firecrawl server URL on the overview page to start polling
        for activity.
      </div>
    );
  }

  if (unsupported) {
    return (
      <div className="rounded-2xl border border-amber-500/60 bg-amber-500/10 p-6 text-sm text-amber-100">
        This Firecrawl deployment does not expose `/v2/activity`. Polling has been
        disabled.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Recent jobs</h2>
        <button
          type="button"
          onClick={isActive ? stop : start}
          className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-200 transition hover:border-cyan-400 hover:text-white"
        >
          {isActive ? "Pause polling" : "Resume polling"}
        </button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-800">
        <table className="min-w-full divide-y divide-slate-800 text-sm">
          <thead className="bg-slate-900/70 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">URL/ID</th>
              <th className="px-4 py-3 text-left">Created</th>
              <th className="px-4 py-3 text-left">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900/70 bg-slate-950/50">
            {(data ?? []).map((item) => (
              <tr key={item.id ?? `${item.jobId}-${item.createdAt}`}>
                <td className="px-4 py-3 text-slate-200">{item.type ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-200">
                    {item.status ?? "unknown"}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400">
                  {item.url ?? item.jobId ?? "—"}
                </td>
                <td className="px-4 py-3 text-slate-400">{formatDate(item.createdAt)}</td>
                <td className="px-4 py-3 text-slate-400">{formatDate(item.updatedAt)}</td>
              </tr>
            ))}
            {!data?.length && !isLoading && !error && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  No activity has been reported yet.
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-rose-300">
                  {error.message}
                </td>
              </tr>
            )}
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Loading...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
