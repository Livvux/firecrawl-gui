import {
  ActivityItem,
  ChangelogEntry,
  CrawlPayload,
  CrawlResponse,
  ExtractPayload,
  ExtractResponse,
  FirecrawlErrorShape,
  HealthResponse,
  JsonValue,
  ScrapePayload,
  ScrapeResponse,
  SearchPayload,
  SearchResponse,
  UsageSummary,
} from "@/domain/firecrawl";

export interface FirecrawlClientConfig {
  baseUrl: string;
  apiKey?: string;
}

export interface RequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;

export class FirecrawlError extends Error {
  public readonly status: number;
  public readonly body?: JsonValue;

  constructor(message: string, status: number, body?: JsonValue) {
    super(message);
    this.name = "FirecrawlError";
    this.status = status;
    this.body = body;
  }
}

type Method = "GET" | "POST";

type RequestInitWithTimeout = RequestInit & { timeoutMs?: number };

const buildHeaders = (method: Method, apiKey?: string) => {
  const headers = new Headers();
  if (method === "POST") {
    headers.set("Content-Type", "application/json");
  }
  if (apiKey) {
    headers.set("Authorization", `Bearer ${apiKey}`);
  }
  return headers;
};

const ensureUrl = (rawBase: string, path: string) => {
  const base = rawBase.replace(/\/$/, "");
  return `${base}${path}`;
};

const withTimeout = (signal: AbortSignal | undefined, timeoutMs: number) => {
  if (!timeoutMs) {
    return signal;
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) {
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  controller.signal.addEventListener(
    "abort",
    () => clearTimeout(timeoutId),
    { once: true },
  );
  return controller.signal;
};

const parseJson = async <T>(response: Response): Promise<T | undefined> => {
  const text = await response.text();
  if (!text) {
    return undefined;
  }
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    console.warn("Failed to parse JSON response", error);
    return undefined;
  }
};

const request = async <T>(
  config: FirecrawlClientConfig,
  path: string,
  method: Method,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> => {
  const url = ensureUrl(config.baseUrl, path);
  const headers = buildHeaders(method, config.apiKey);
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const signal = withTimeout(options?.signal, timeoutMs);

  const init: RequestInitWithTimeout = {
    method,
    headers,
    signal,
  };

  if (method === "POST" && body !== undefined) {
    init.body = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      throw new FirecrawlError("Request timed out", 408);
    }
    throw new FirecrawlError((error as Error).message, 0);
  }

  const data = await parseJson<T | FirecrawlErrorShape>(response);

  if (!response.ok) {
    const message =
      (data as FirecrawlErrorShape | undefined)?.message ??
      `Firecrawl request failed with status ${response.status}`;
    throw new FirecrawlError(message, response.status, data as JsonValue);
  }

  return (data ?? ({} as T)) as T;
};

export const createFirecrawlClient = (config: FirecrawlClientConfig) => {
  const safeConfig = {
    baseUrl: config.baseUrl.replace(/\/$/, ""),
    apiKey: config.apiKey?.trim() || undefined,
  } satisfies FirecrawlClientConfig;

  const getOptions = (options?: RequestOptions) => ({
    signal: options?.signal,
    timeoutMs: options?.timeoutMs,
  });

  return {
    health: (options?: RequestOptions) =>
      request<HealthResponse>(safeConfig, "/v2/health", "GET", undefined, getOptions(options)),
    scrape: (payload: ScrapePayload, options?: RequestOptions) =>
      request<ScrapeResponse>(
        safeConfig,
        "/v2/scrape",
        "POST",
        payload,
        getOptions(options),
      ),
    search: (payload: SearchPayload, options?: RequestOptions) =>
      request<SearchResponse>(
        safeConfig,
        "/v2/search",
        "POST",
        payload,
        getOptions(options),
      ),
    crawl: (payload: CrawlPayload, options?: RequestOptions) =>
      request<CrawlResponse>(
        safeConfig,
        "/v2/crawl",
        "POST",
        payload,
        getOptions(options),
      ),
    extract: (payload: ExtractPayload, options?: RequestOptions) =>
      request<ExtractResponse>(
        safeConfig,
        "/v2/extract",
        "POST",
        payload,
        getOptions(options),
      ),
    activity: (options?: RequestOptions) =>
      request<ActivityItem[]>(
        safeConfig,
        "/v2/activity",
        "GET",
        undefined,
        getOptions(options),
      ),
    usage: (options?: RequestOptions) =>
      request<UsageSummary>(
        safeConfig,
        "/v2/usage",
        "GET",
        undefined,
        getOptions(options),
      ),
    changelog: (options?: RequestOptions) =>
      request<ChangelogEntry[] | { entries?: string[] }>(
        safeConfig,
        "/v2/changelog",
        "GET",
        undefined,
        getOptions(options),
      ),
  };
};
