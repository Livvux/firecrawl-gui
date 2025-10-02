"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { ResultPane } from "@/components/common/ResultPane";
import {
  CrawlPayload,
  FirecrawlFormat,
  JsonValue,
  MapPayload,
  ScrapePayload,
  SearchPayload,
  SitemapMode,
} from "@/domain/firecrawl";
import { createFirecrawlClient, FirecrawlError } from "@/io/firecrawl-client";
import { useLocalConfig } from "@/state/useLocalConfig";
import { cn } from "@/lib/utils";

type OperationId = "scrape" | "search" | "map" | "crawl";

interface OperationMeta {
  label: string;
  subtitle: string;
  badge?: string;
  actionLabel: string;
}

const operations: Record<OperationId, OperationMeta> = {
  scrape: {
    label: "Scrape",
    subtitle: "Fetch a single page with optional extraction preferences.",
    actionLabel: "Start scraping",
  },
  search: {
    label: "Search",
    subtitle: "Run a web search and optionally scrape top results.",
    badge: "New",
    actionLabel: "Start searching",
  },
  map: {
    label: "Map",
    subtitle: "Generate a quick sitemap snapshot for a section.",
    actionLabel: "Start mapping",
  },
  crawl: {
    label: "Crawl",
    subtitle: "Launch a deeper crawl job for multiple pages.",
    actionLabel: "Start crawling",
  },
};

interface ScrapeFormState {
  url: string;
  format: FirecrawlFormat;
  onlyMainContent: boolean;
  waitFor: string;
  mobile: boolean;
}

interface SearchFormState {
  query: string;
  limit: string;
  lang: string;
  scrapeResults: boolean;
  format: FirecrawlFormat;
  onlyMainContent: boolean;
}

interface MapFormState {
  url: string;
  limit: string;
  sitemap: SitemapMode;
  includeSubdomains: boolean;
  ignoreQueryParameters: boolean;
}

interface CrawlFormState {
  url: string;
  limit: string;
  maxDepth: string;
  deduplicate: boolean;
  includeSubdomains: boolean;
  allowExternalLinks: boolean;
}

const DEFAULT_SCRAPE_STATE: ScrapeFormState = {
  url: "https://example.com",
  format: "markdown",
  onlyMainContent: true,
  waitFor: "",
  mobile: false,
};

const DEFAULT_SEARCH_STATE: SearchFormState = {
  query: "Top restaurants in San Francisco",
  limit: "3",
  lang: "en",
  scrapeResults: true,
  format: "markdown",
  onlyMainContent: true,
};

const DEFAULT_MAP_STATE: MapFormState = {
  url: "https://example.com/docs",
  limit: "200",
  sitemap: "include",
  includeSubdomains: false,
  ignoreQueryParameters: false,
};

const DEFAULT_CRAWL_STATE: CrawlFormState = {
  url: "https://example.com/blog/*",
  limit: "50",
  maxDepth: "2",
  deduplicate: true,
  includeSubdomains: false,
  allowExternalLinks: false,
};

const parsePositiveInt = (value: string): number | undefined => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return Math.floor(parsed);
};

const buildScrapePayload = (state: ScrapeFormState): ScrapePayload => ({
  url: state.url.trim(),
  formats: [state.format],
  onlyMainContent: state.onlyMainContent,
  waitFor: state.waitFor ? Number(state.waitFor) : undefined,
  mobile: state.mobile || undefined,
});

const buildSearchPayload = (state: SearchFormState): SearchPayload => ({
  query: state.query.trim(),
  limit: parsePositiveInt(state.limit),
  lang: state.lang.trim() || undefined,
  scrapeOptions: state.scrapeResults
    ? {
        formats: [state.format],
        onlyMainContent: state.onlyMainContent,
      }
    : undefined,
});

const buildMapPayload = (state: MapFormState): MapPayload => {
  const limit = parsePositiveInt(state.limit);
  const payload: MapPayload = {
    url: state.url.trim(),
    sitemap: state.sitemap,
  };

  if (limit !== undefined) {
    payload.limit = limit;
  }
  if (state.includeSubdomains) {
    payload.includeSubdomains = true;
  }
  if (state.ignoreQueryParameters) {
    payload.ignoreQueryParameters = true;
  }

  return payload;
};

const buildCrawlPayload = (state: CrawlFormState): CrawlPayload => ({
  url: state.url.trim(),
  limit: parsePositiveInt(state.limit),
  maxDepth: parsePositiveInt(state.maxDepth),
  allowExternalLinks: state.allowExternalLinks,
  deduplicateSimilarURLs: state.deduplicate,
  includeSubdomains: state.includeSubdomains,
});

const accentButtonClass =
  "rounded-full px-5 py-2 text-sm font-semibold text-white transition focus-visible:ring-2 focus-visible:ring-orange-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white bg-orange-500 hover:bg-orange-400";

const Tabs = ({
  active,
  onSelect,
}: {
  active: OperationId;
  onSelect: (id: OperationId) => void;
}) => (
  <div className="flex justify-center">
    <div className="flex flex-wrap items-center gap-2 rounded-full border border-slate-200 bg-white/80 p-1.5 shadow-lg shadow-slate-200/60">
      {(Object.keys(operations) as OperationId[]).map((id) => {
        const meta = operations[id];
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className={cn(
              "relative flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition focus-visible:outline-none",
              isActive
                ? "bg-white text-slate-900 shadow-md shadow-slate-200"
                : "text-slate-500 hover:text-slate-900",
            )}
          >
            {meta.label}
            {meta.badge && (
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-600">
                {meta.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  </div>
);

const OperationHeader = ({
  label,
  subtitle,
  badge,
}: {
  label: string;
  subtitle: string;
  badge?: string;
}) => (
  <header className="flex flex-col gap-2">
    <div className="flex items-center gap-3 text-sm text-slate-500">
      <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
        Playground
      </span>
      {badge && (
        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-600">
          {badge}
        </span>
      )}
    </div>
    <h2 className="text-2xl font-semibold text-slate-900">{label}</h2>
    <p className="text-sm text-slate-500">{subtitle}</p>
  </header>
);

const ScrapeCard = ({
  state,
  onStateChange,
  onSubmit,
  onPreview,
  isLoading,
  meta,
}: {
  state: ScrapeFormState;
  onStateChange: (next: ScrapeFormState) => void;
  onSubmit: (payload: ScrapePayload) => Promise<void>;
  onPreview: (payload: ScrapePayload) => void;
  isLoading: boolean;
  meta: OperationMeta;
}) => {
  const payload = buildScrapePayload(state);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit(payload);
  };

  const handleChange = <K extends keyof ScrapeFormState>(key: K) =>
    (value: ScrapeFormState[K]) => {
      onStateChange({ ...state, [key]: value });
    };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/50"
    >
      <div className="flex flex-col gap-6">
        <OperationHeader {...meta} />
        <label className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
            URL
          </span>
          <input
            type="url"
            required
            value={state.url}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              handleChange("url")(event.target.value)
            }
            placeholder="https://example.com"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-inner focus:border-orange-400"
          />
        </label>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
            <input
              type="checkbox"
              checked={state.onlyMainContent}
              onChange={(event) => handleChange("onlyMainContent")(event.target.checked)}
              className="h-4 w-4 accent-orange-500"
            />
            Main content only
          </label>
          <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
            <input
              type="checkbox"
              checked={state.mobile}
              onChange={(event) => handleChange("mobile")(event.target.checked)}
              className="h-4 w-4 accent-orange-500"
            />
            Mobile viewport
          </label>
          <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
            Format
            <select
              value={state.format}
              onChange={(event) =>
                handleChange("format")(event.target.value as FirecrawlFormat)
              }
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm"
            >
              <option value="markdown">Markdown</option>
              <option value="html">HTML</option>
              <option value="json">JSON</option>
              <option value="raw">Raw</option>
            </select>
          </label>
          <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
            Wait for
            <input
              type="number"
              min={0}
              step={100}
              value={state.waitFor}
              onChange={(event) => handleChange("waitFor")(event.target.value)}
              placeholder="1000"
              className="w-20 rounded-full border border-slate-200 bg-white px-2 py-1 text-sm"
            />
            ms
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onPreview(payload)}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:border-slate-300"
          >
            Get code
          </button>
          <button
            type="submit"
            className={cn(accentButtonClass, isLoading && "cursor-not-allowed opacity-70")}
            disabled={isLoading}
          >
            {isLoading ? "Sending..." : meta.actionLabel}
          </button>
        </div>
      </div>
    </form>
  );
};

const SearchCard = ({
  state,
  onStateChange,
  onSubmit,
  onPreview,
  isLoading,
  meta,
}: {
  state: SearchFormState;
  onStateChange: (next: SearchFormState) => void;
  onSubmit: (payload: SearchPayload) => Promise<void>;
  onPreview: (payload: SearchPayload) => void;
  isLoading: boolean;
  meta: OperationMeta;
}) => {
  const payload = buildSearchPayload(state);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit(payload);
  };

  const handleChange = <K extends keyof SearchFormState>(key: K) =>
    (value: SearchFormState[K]) => {
      onStateChange({ ...state, [key]: value });
    };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/50"
    >
      <div className="flex flex-col gap-6">
        <OperationHeader {...meta} />
        <label className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
            Query
          </span>
          <input
            type="text"
            required
            value={state.query}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              handleChange("query")(event.target.value)
            }
            placeholder="Find the latest product announcements"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-inner focus:border-orange-400"
          />
        </label>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
            Limit
            <input
              type="number"
              min={1}
              max={20}
              value={state.limit}
              onChange={(event) => handleChange("limit")(event.target.value)}
              className="w-16 rounded-full border border-slate-200 bg-white px-2 py-1 text-sm"
            />
          </label>
          <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
            Language
            <input
              type="text"
              value={state.lang}
              onChange={(event) => handleChange("lang")(event.target.value)}
              placeholder="en"
              className="w-16 rounded-full border border-slate-200 bg-white px-2 py-1 text-sm"
            />
          </label>
          <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
            <input
              type="checkbox"
              checked={state.scrapeResults}
              onChange={(event) => handleChange("scrapeResults")(event.target.checked)}
              className="h-4 w-4 accent-orange-500"
            />
            Scrape results
          </label>
          {state.scrapeResults && (
            <>
              <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
                Format
                <select
                  value={state.format}
                  onChange={(event) =>
                    handleChange("format")(event.target.value as FirecrawlFormat)
                  }
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm"
                >
                  <option value="markdown">Markdown</option>
                  <option value="html">HTML</option>
                  <option value="json">JSON</option>
                </select>
              </label>
              <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
                <input
                  type="checkbox"
                  checked={state.onlyMainContent}
                  onChange={(event) =>
                    handleChange("onlyMainContent")(event.target.checked)
                  }
                  className="h-4 w-4 accent-orange-500"
                />
                Main content only
              </label>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onPreview(payload)}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:border-slate-300"
          >
            Get code
          </button>
          <button
            type="submit"
            className={cn(accentButtonClass, isLoading && "cursor-not-allowed opacity-70")}
            disabled={isLoading}
          >
            {isLoading ? "Sending..." : meta.actionLabel}
          </button>
        </div>
      </div>
    </form>
  );
};

const MapCard = ({
  state,
  onStateChange,
  onSubmit,
  onPreview,
  isLoading,
  meta,
}: {
  state: MapFormState;
  onStateChange: (next: MapFormState) => void;
  onSubmit: (payload: MapPayload) => Promise<void>;
  onPreview: (payload: MapPayload) => void;
  isLoading: boolean;
  meta: OperationMeta;
}) => {
  const payload = buildMapPayload(state);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit(payload);
  };

  const handleChange = <K extends keyof MapFormState>(key: K) =>
    (value: MapFormState[K]) => {
      onStateChange({ ...state, [key]: value });
    };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/50"
    >
      <div className="flex flex-col gap-6">
        <OperationHeader {...meta} />
        <label className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
            URL or pattern
          </span>
          <input
            type="text"
            required
            value={state.url}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              handleChange("url")(event.target.value)
            }
            placeholder="https://example.com/docs"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-inner focus:border-orange-400"
          />
        </label>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
            Limit
            <input
              type="number"
              min={1}
              value={state.limit}
              onChange={(event) => handleChange("limit")(event.target.value)}
              className="w-20 rounded-full border border-slate-200 bg-white px-2 py-1 text-sm"
            />
          </label>
          <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
            Sitemap
            <select
              value={state.sitemap}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                handleChange("sitemap")(event.target.value as SitemapMode)
              }
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm"
            >
              <option value="include">Include sitemap</option>
              <option value="only">Only sitemap URLs</option>
              <option value="exclude">Ignore sitemap</option>
            </select>
          </label>
          <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
            <input
              type="checkbox"
              checked={state.includeSubdomains}
              onChange={(event) => handleChange("includeSubdomains")(event.target.checked)}
              className="h-4 w-4 accent-orange-500"
            />
            Include subdomains
          </label>
          <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
            <input
              type="checkbox"
              checked={state.ignoreQueryParameters}
              onChange={(event) =>
                handleChange("ignoreQueryParameters")(event.target.checked)
              }
              className="h-4 w-4 accent-orange-500"
            />
            Ignore query params
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onPreview(payload)}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:border-slate-300"
          >
            Get code
          </button>
          <button
            type="submit"
            className={cn(accentButtonClass, isLoading && "cursor-not-allowed opacity-70")}
            disabled={isLoading}
          >
            {isLoading ? "Sending..." : meta.actionLabel}
          </button>
        </div>
      </div>
    </form>
  );
};

const CrawlCard = ({
  state,
  onStateChange,
  onSubmit,
  onPreview,
  isLoading,
  meta,
}: {
  state: CrawlFormState;
  onStateChange: (next: CrawlFormState) => void;
  onSubmit: (payload: CrawlPayload) => Promise<void>;
  onPreview: (payload: CrawlPayload) => void;
  isLoading: boolean;
  meta: OperationMeta;
}) => {
  const payload = buildCrawlPayload(state);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit(payload);
  };

  const handleChange = <K extends keyof CrawlFormState>(key: K) =>
    (value: CrawlFormState[K]) => {
      onStateChange({ ...state, [key]: value });
    };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/50"
    >
      <div className="flex flex-col gap-6">
        <OperationHeader {...meta} />
        <label className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
            URL or pattern
          </span>
          <input
            type="text"
            required
            value={state.url}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              handleChange("url")(event.target.value)
            }
            placeholder="https://example.com/docs/*"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-inner focus:border-orange-400"
          />
        </label>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
            Limit
            <input
              type="number"
              min={1}
              value={state.limit}
              onChange={(event) => handleChange("limit")(event.target.value)}
              className="w-20 rounded-full border border-slate-200 bg-white px-2 py-1 text-sm"
            />
          </label>
          <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
            Max depth
            <input
              type="number"
              min={0}
              value={state.maxDepth}
              onChange={(event) => handleChange("maxDepth")(event.target.value)}
              className="w-20 rounded-full border border-slate-200 bg-white px-2 py-1 text-sm"
            />
          </label>
          <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
            <input
              type="checkbox"
              checked={state.deduplicate}
              onChange={(event) => handleChange("deduplicate")(event.target.checked)}
              className="h-4 w-4 accent-orange-500"
            />
            Deduplicate similar URLs
          </label>
          <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
            <input
              type="checkbox"
              checked={state.includeSubdomains}
              onChange={(event) =>
                handleChange("includeSubdomains")(event.target.checked)
              }
              className="h-4 w-4 accent-orange-500"
            />
            Include subdomains
          </label>
          <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
            <input
              type="checkbox"
              checked={state.allowExternalLinks}
              onChange={(event) =>
                handleChange("allowExternalLinks")(event.target.checked)
              }
              className="h-4 w-4 accent-orange-500"
            />
            Allow external links
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onPreview(payload)}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:border-slate-300"
          >
            Get code
          </button>
          <button
            type="submit"
            className={cn(accentButtonClass, isLoading && "cursor-not-allowed opacity-70")}
            disabled={isLoading}
          >
            {isLoading ? "Sending..." : meta.actionLabel}
          </button>
        </div>
      </div>
    </form>
  );
};

export default function PlaygroundPage() {
  const { config } = useLocalConfig();
  const [activeOperation, setActiveOperation] = useState<OperationId>("scrape");
  const [scrapeState, setScrapeState] = useState(DEFAULT_SCRAPE_STATE);
  const [searchState, setSearchState] = useState(DEFAULT_SEARCH_STATE);
  const [mapState, setMapState] = useState(DEFAULT_MAP_STATE);
  const [crawlState, setCrawlState] = useState(DEFAULT_CRAWL_STATE);
  const [response, setResponse] = useState<JsonValue | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<string | undefined>();

  const client = useMemo(() => {
    if (!config.baseUrl) {
      return undefined;
    }
    return createFirecrawlClient({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
    });
  }, [config.baseUrl, config.apiKey]);

  const showPreview = (payload: unknown) => {
    try {
      setPreview(JSON.stringify(payload, null, 2));
    } catch (error) {
      console.warn("Failed to serialise payload", error);
      setPreview(undefined);
    }
  };

  const runRequest = async (
    operation: OperationId,
    payload: ScrapePayload | SearchPayload | MapPayload | CrawlPayload,
  ) => {
    showPreview(payload);
    if (!client) {
      setErrorMessage("Configure the server URL on the overview page first.");
      return;
    }
    setIsLoading(true);
    setErrorMessage(undefined);
    setResponse(undefined);

    try {
      switch (operation) {
        case "scrape": {
          const result = await client.scrape(payload as ScrapePayload);
          setResponse(result as JsonValue);
          break;
        }
        case "search": {
          const result = await client.search(payload as SearchPayload);
          setResponse(result as JsonValue);
          break;
        }
        case "map": {
          const result = await client.map(payload as MapPayload);
          setResponse(result as JsonValue);
          break;
        }
        case "crawl": {
          const result = await client.crawl(payload as CrawlPayload);
          setResponse(result as JsonValue);
          break;
        }
        default:
          throw new Error("Unsupported operation");
      }
    } catch (error) {
      if (error instanceof FirecrawlError) {
        setErrorMessage(`${error.message} (${error.status || "network"})`);
      } else if ((error as Error).name === "AbortError") {
        // ignore aborts so users can retry silently
      } else {
        setErrorMessage(error instanceof Error ? error.message : String(error));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const hero = (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-8 py-16 text-center shadow-2xl shadow-slate-200/60">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(255,237,213,0.4)_0%,_rgba(255,255,255,0.9)_60%,_rgba(226,232,240,0.8)_100%)]"
      />
      <div className="mx-auto max-w-2xl space-y-4">
        <p className="text-xs font-medium uppercase tracking-[0.4em] text-orange-500">
          Playground
        </p>
        <h1 className="text-4xl font-semibold text-slate-900">
          API, docs and playground — all in one place
        </h1>
        <p className="text-base text-slate-500">
          Compose Firecrawl requests with guided forms, preview the JSON payload, and send them to your self-hosted node instantly.
        </p>
      </div>
    </section>
  );

  return (
    <div className="flex flex-col gap-8">
      {hero}
      <Tabs active={activeOperation} onSelect={setActiveOperation} />
      <div className="space-y-6">
        {activeOperation === "scrape" && (
          <ScrapeCard
            state={scrapeState}
            onStateChange={setScrapeState}
            onSubmit={(payload) => runRequest("scrape", payload)}
            onPreview={(payload) => showPreview(payload)}
            isLoading={isLoading}
            meta={operations.scrape}
          />
        )}
        {activeOperation === "search" && (
          <SearchCard
            state={searchState}
            onStateChange={setSearchState}
            onSubmit={(payload) => runRequest("search", payload)}
            onPreview={(payload) => showPreview(payload)}
            isLoading={isLoading}
            meta={operations.search}
          />
        )}
        {activeOperation === "map" && (
          <MapCard
            state={mapState}
            onStateChange={setMapState}
            onSubmit={(payload) => runRequest("map", payload)}
            onPreview={(payload) => showPreview(payload)}
            isLoading={isLoading}
            meta={operations.map}
          />
        )}
        {activeOperation === "crawl" && (
          <CrawlCard
            state={crawlState}
            onStateChange={setCrawlState}
            onSubmit={(payload) => runRequest("crawl", payload)}
            onPreview={(payload) => showPreview(payload)}
            isLoading={isLoading}
            meta={operations.crawl}
          />
        )}
        <ResultPane
          data={response}
          error={errorMessage}
          isLoading={isLoading}
          preview={preview}
          onClosePreview={() => setPreview(undefined)}
        />
      </div>
    </div>
  );
}
