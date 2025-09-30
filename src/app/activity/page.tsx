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
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        Configure your Firecrawl server URL on the overview page to start polling for activity.
      </div>
    );
  }

  if (unsupported) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-700 shadow-sm">
        This Firecrawl deployment does not expose `/v2/activity`. Polling has been disabled.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {Array.isArray(data) &&
        data.some((item) => {
          const source = (item as Record<string, unknown>).source;
          return typeof source === "string" && source.startsWith("v1/");
        }) && (
          <div className="rounded-3xl border border-sky-200 bg-sky-50 p-4 text-xs text-sky-700">
            Showing live data from legacy `/v1` endpoints. Results include active crawls and
            queue status only.
          </div>
        )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Recent jobs</h2>
        <button
          type="button"
          onClick={isActive ? stop : start}
          className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
        >
          {isActive ? "Pause polling" : "Resume polling"}
        </button>
      </div>
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.25em] text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">URL / ID</th>
              <th className="px-4 py-3 text-left">Created</th>
              <th className="px-4 py-3 text-left">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {(data ?? []).map((item) => (
              <tr key={item.id ?? `${item.jobId}-${item.createdAt}`} className="transition hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-700">{item.type ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    {item.status ?? "unknown"}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {item.url ?? item.jobId ?? "—"}
                </td>
                <td className="px-4 py-3 text-slate-500">{formatDate(item.createdAt)}</td>
                <td className="px-4 py-3 text-slate-500">{formatDate(item.updatedAt)}</td>
              </tr>
            ))}
            {!data?.length && !isLoading && !error && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  No activity has been reported yet.
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-rose-500">
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
