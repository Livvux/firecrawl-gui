"use client";

import { useEffect, useMemo, useState } from "react";
import { UsageSummary } from "@/domain/firecrawl";
import { createFirecrawlClient, FirecrawlError } from "@/io/firecrawl-client";
import { useLocalConfig } from "@/state/useLocalConfig";

const renderValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "—";
  }
  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
};

export default function UsagePage() {
  const { config } = useLocalConfig();
  const [data, setData] = useState<UsageSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unsupported, setUnsupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const client = useMemo(() => {
    if (!config.baseUrl) {
      return undefined;
    }
    return createFirecrawlClient({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
    });
  }, [config.baseUrl, config.apiKey]);

  useEffect(() => {
    if (!client) {
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    setUnsupported(false);

    client
      .usage({ signal: controller.signal })
      .then((result) => setData(result))
      .catch((err) => {
        if (err instanceof FirecrawlError && err.status === 404) {
          setUnsupported(true);
          return;
        }
        if ((err as Error).name === "AbortError") {
          return;
        }
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [client]);

  if (!config.baseUrl) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
        Configure your Firecrawl server URL to load usage metrics.
      </div>
    );
  }

  if (unsupported) {
    return (
      <div className="rounded-2xl border border-amber-500/60 bg-amber-500/10 p-6 text-sm text-amber-100">
        This instance does not expose `/v2/usage`. No usage metrics are available.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-white">Usage</h2>
      {isLoading && <p className="text-sm text-slate-400">Loading...</p>}
      {error && <p className="text-sm text-rose-300">{error}</p>}
      {data ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <dl className="grid gap-6 md:grid-cols-2">
            {Object.entries(data).map(([key, value]) => (
              <div key={key} className="rounded-lg border border-slate-800/60 bg-slate-950/70 p-4">
                <dt className="text-xs uppercase tracking-wide text-slate-400">
                  {key}
                </dt>
                <dd className="mt-2 whitespace-pre-wrap text-sm text-slate-200">
                  {renderValue(value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : (
        !isLoading && <p className="text-sm text-slate-400">No usage data returned.</p>
      )}
    </div>
  );
}
