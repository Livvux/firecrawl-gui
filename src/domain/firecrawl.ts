export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export type FirecrawlFormat = "markdown" | "html" | "json" | "raw";

export interface ScrapePayload {
  url: string;
  formats?: FirecrawlFormat[];
  onlyMainContent?: boolean;
  waitFor?: number;
  timeout?: number;
  mobile?: boolean;
  includeTags?: string[];
  excludeTags?: string[];
  skipTlsVerification?: boolean;
}

export interface ScrapeResponse {
  data?: JsonValue;
  jobId?: string;
  message?: string;
}

export interface SearchPayload {
  query: string;
  limit?: number;
  lang?: string;
  country?: string;
  scrapeOptions?: Pick<ScrapePayload, "formats" | "onlyMainContent">;
}

export interface SearchResult {
  title?: string;
  url: string;
  snippet?: string;
  content?: JsonValue;
  score?: number;
}

export interface SearchResponse {
  results?: SearchResult[];
  data?: JsonValue;
  message?: string;
}

export interface CrawlPayload {
  url: string;
  maxDepth?: number;
  limit?: number;
  allowExternalLinks?: boolean;
  deduplicateSimilarURLs?: boolean;
  includeSubdomains?: boolean;
}

export interface CrawlResponse {
  jobId?: string;
  status?: string;
  message?: string;
  data?: JsonValue;
}

export interface ExtractPayload {
  urls: string[];
  prompt?: string;
  systemPrompt?: string;
  schema?: JsonObject;
  allowExternalLinks?: boolean;
  enableWebSearch?: boolean;
  includeSubdomains?: boolean;
}

export interface ExtractResponse {
  data?: JsonValue;
  message?: string;
  jobId?: string;
}

export interface HealthResponse {
  status: string;
  version?: string;
  uptime?: number;
  info?: JsonObject;
}

export type ActivityItem = JsonObject & {
  id?: string | null;
  jobId?: string | null;
  type?: string | null;
  status?: string | null;
  url?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type UsageSummary = JsonObject & {
  plan?: string | null;
  creditsRemaining?: number | null;
  creditsUsed?: number | null;
  period?: string | null;
};

export type ChangelogEntry = JsonObject & {
  version?: string | null;
  date?: string | null;
  entries?: string[] | null;
};

export type FirecrawlErrorShape = JsonObject & {
  status: number;
  message: string;
  details?: JsonValue | null;
};
