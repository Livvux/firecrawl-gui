"use client";

import { useEffect, useMemo, useState } from "react";
import { ChangelogEntry } from "@/domain/firecrawl";
import { createFirecrawlClient, FirecrawlError } from "@/io/firecrawl-client";
import { useLocalConfig } from "@/state/useLocalConfig";

interface FlattenedEntry {
  version?: string;
  date?: string;
  items: string[];
}

const normaliseEntries = (
  response: ChangelogEntry[] | { entries?: string[] } | undefined,
): FlattenedEntry[] => {
  if (!response) {
    return [];
  }
  if (Array.isArray(response)) {
    return response.map((entry) => ({
      version: typeof entry.version === "string" ? entry.version : undefined,
      date: typeof entry.date === "string" ? entry.date : undefined,
      items: Array.isArray(entry.entries)
        ? entry.entries.filter((item): item is string => typeof item === "string")
        : [],
    }));
  }
  if (response.entries && Array.isArray(response.entries)) {
    return [
      {
        version: undefined,
        date: undefined,
        items: response.entries.filter((item): item is string => typeof item === "string"),
      },
    ];
  }
  return [];
};

export default function WhatsNewPage() {
  const { config } = useLocalConfig();
  const [entries, setEntries] = useState<FlattenedEntry[]>([]);
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
      .changelog({ signal: controller.signal })
      .then((result) => setEntries(normaliseEntries(result)))
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
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        Configure your server to fetch the latest changelog entries.
      </div>
    );
  }

  if (unsupported) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        No changelog endpoint detected. Check your deployment notes for updates.
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600 shadow-sm">
        Failed to load changelog: {error}
      </div>
    );
  }

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading...</p>;
  }

  if (!entries.length) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        No changelog entries were returned. Add a changelog to your Firecrawl instance to populate this view.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-slate-900">What&apos;s new</h2>
      <div className="space-y-6">
        {entries.map((entry, index) => (
          <article
            key={`${entry.version ?? ""}-${index}`}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <header className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
              {entry.version && (
                <span className="rounded-full bg-orange-100 px-3 py-1 text-orange-600">
                  v{entry.version}
                </span>
              )}
              {entry.date && <span className="text-slate-400">{entry.date}</span>}
            </header>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-700">
              {entry.items.map((item, itemIndex) => (
                <li key={itemIndex}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}
