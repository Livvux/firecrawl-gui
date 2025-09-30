"use client";

import { useMemo, useState } from "react";
import { RequestForm } from "@/components/common/RequestForm";
import {
  CrawlPayload,
  ExtractPayload,
  JsonValue,
  ScrapePayload,
  SearchPayload,
} from "@/domain/firecrawl";
import { createFirecrawlClient } from "@/io/firecrawl-client";
import { useLocalConfig } from "@/state/useLocalConfig";

const ensureObject = (payload: JsonValue, context: string) => {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new Error(`${context} payload must be a JSON object`);
  }
  return payload as Record<string, JsonValue>;
};

const toScrapePayload = (payload: JsonValue): ScrapePayload => {
  const value = ensureObject(payload, "Scrape");
  if (typeof value.url !== "string") {
    throw new Error("Scrape payload requires a string `url`.");
  }
  return value as unknown as ScrapePayload;
};

const toSearchPayload = (payload: JsonValue): SearchPayload => {
  const value = ensureObject(payload, "Search");
  if (typeof value.query !== "string") {
    throw new Error("Search payload requires a string `query`.");
  }
  return value as unknown as SearchPayload;
};

const toCrawlPayload = (payload: JsonValue): CrawlPayload => {
  const value = ensureObject(payload, "Crawl");
  if (typeof value.url !== "string") {
    throw new Error("Crawl payload requires a string `url` or pattern.");
  }
  return value as unknown as CrawlPayload;
};

const toExtractPayload = (payload: JsonValue): ExtractPayload => {
  const value = ensureObject(payload, "Extract");
  if (!Array.isArray(value.urls) || value.urls.some((item) => typeof item !== "string")) {
    throw new Error("Extract payload requires `urls` as an array of strings.");
  }
  return value as unknown as ExtractPayload;
};

type PlaygroundTab = {
  id: "scrape" | "search" | "crawl" | "extract";
  label: string;
  description: string;
  defaultValue: JsonValue;
  presets: Array<{ label: string; body: JsonValue }>;
};

const tabs: PlaygroundTab[] = [
  {
    id: "scrape",
    label: "Scrape",
    description:
      "Fetch a single URL with optional content extraction settings (formats, main content).",
    defaultValue: {
      url: "https://example.com",
      formats: ["markdown"],
      onlyMainContent: true,
    } satisfies ScrapePayload as unknown as JsonValue,
    presets: [
      {
        label: "Markdown",
        body: {
          url: "https://example.com",
          formats: ["markdown"],
        } satisfies ScrapePayload as unknown as JsonValue,
      },
      {
        label: "HTML",
        body: {
          url: "https://example.com",
          formats: ["html"],
          waitFor: 1500,
        } satisfies ScrapePayload as unknown as JsonValue,
      },
    ],
  },
  {
    id: "search",
    label: "Search",
    description:
      "Run a web search and optionally scrape the top results for structured content.",
    defaultValue: {
      query: "latest firecrawl updates",
      limit: 3,
      lang: "en",
      scrapeOptions: {
        formats: ["markdown"],
        onlyMainContent: true,
      },
    } satisfies SearchPayload as unknown as JsonValue,
    presets: [],
  },
  {
    id: "crawl",
    label: "Crawl",
    description:
      "Start an asynchronous crawl job to fetch multiple pages from a site section.",
    defaultValue: {
      url: "https://example.com/blog/*",
      limit: 25,
      maxDepth: 2,
      deduplicateSimilarURLs: true,
    } satisfies CrawlPayload as unknown as JsonValue,
    presets: [],
  },
  {
    id: "extract",
    label: "Extract",
    description:
      "Extract structured data by prompting Firecrawl with a schema across one or more URLs.",
    defaultValue: {
      urls: ["https://example.com"],
      prompt: "Extract product name and price if present",
      schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          price: { type: "number" },
        },
      },
    } satisfies ExtractPayload as unknown as JsonValue,
    presets: [],
  },
];

export default function PlaygroundPage() {
  const { config } = useLocalConfig();
  const [activeTab, setActiveTab] = useState<PlaygroundTab["id"]>("scrape");

  const client = useMemo(() => {
    if (!config.baseUrl) {
      return undefined;
    }
    return createFirecrawlClient({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
    });
  }, [config.baseUrl, config.apiKey]);

  const sendRequest = async (
    tabId: (typeof tabs)[number]["id"],
    payload: JsonValue,
  ): Promise<JsonValue> => {
    if (!client) {
      throw new Error("Configure the server URL on the overview or settings page first.");
    }

    switch (tabId) {
      case "scrape":
        return client.scrape(toScrapePayload(payload)) as unknown as JsonValue;
      case "search":
        return client.search(toSearchPayload(payload)) as unknown as JsonValue;
      case "crawl":
        return client.crawl(toCrawlPayload(payload)) as unknown as JsonValue;
      case "extract":
        return client.extract(toExtractPayload(payload)) as unknown as JsonValue;
      default:
        throw new Error("Unsupported operation");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2 text-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={
              activeTab === tab.id
                ? "rounded-full bg-cyan-500 px-4 py-2 font-semibold text-slate-900"
                : "rounded-full border border-slate-700 px-4 py-2 text-slate-300 transition hover:border-cyan-400 hover:text-white"
            }
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div key={tab.id} className={tab.id === activeTab ? "block" : "hidden"}>
          <RequestForm
            title={tab.label}
            description={tab.description}
            defaultValue={tab.defaultValue}
            presets={tab.presets}
            onSend={(payload) => sendRequest(tab.id, payload)}
          />
        </div>
      ))}
    </div>
  );
}
