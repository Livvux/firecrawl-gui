import {
  ActivityItem,
  ChangelogEntry,
  CrawlPayload,
  CrawlResponse,
  ExtractPayload,
  ExtractResponse,
  FirecrawlErrorShape,
  HealthResponse,
  JsonObject,
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

const createAbortReason = (message: string, name: string) => {
  if (typeof DOMException === "function") {
    return new DOMException(message, name);
  }
  const error = new Error(message);
  error.name = name;
  return error;
};

const withTimeout = (signal: AbortSignal | undefined, timeoutMs: number) => {
  if (!timeoutMs) {
    return signal;
  }

  const controller = new AbortController();
  const timeoutReason = createAbortReason(
    `Request timed out after ${timeoutMs}ms`,
    "TimeoutError",
  );
  const timeoutId = setTimeout(() => controller.abort(timeoutReason), timeoutMs);

  const forwardAbort = () => {
    const reason = signal?.reason ?? createAbortReason("Request aborted", "AbortError");
    controller.abort(reason);
  };

  if (signal) {
    if (signal.aborted) {
      forwardAbort();
    } else {
      signal.addEventListener("abort", forwardAbort, { once: true });
    }
  }

  controller.signal.addEventListener(
    "abort",
    () => {
      clearTimeout(timeoutId);
      if (signal) {
        signal.removeEventListener("abort", forwardAbort);
      }
    },
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
    if (error instanceof DOMException) {
      if (error.name === "TimeoutError") {
        throw new FirecrawlError("Request timed out", 408);
      }
      if (error.name === "AbortError") {
        throw error;
      }
    }

    if ((error as Error).name === "AbortError") {
      throw error as Error;
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

  const attachProbeMetadata = (
    response: HealthResponse,
    path: string,
    fallback: boolean,
    extraInfo?: JsonObject,
  ) => {
    const info: JsonObject = {
      ...(response.info ?? {}),
      ...(extraInfo ?? {}),
    };
    (info as Record<string, JsonValue>).checkedEndpoint = path;
    (info as Record<string, JsonValue>).fallback = fallback;
    return {
      ...response,
      info,
    } satisfies HealthResponse;
  };

  type LegacyActivityCrawl = JsonObject & {
    id?: string | null;
    jobId?: string | null;
    url?: string | null;
    created_at?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    updated_at?: string | null;
  };

  const fetchLegacyActivity = async (options?: RequestOptions) => {
    const requestOptions = getOptions(options);

    let crawls: LegacyActivityCrawl[] = [];
    try {
      const response = await request<
        JsonObject & {
          success?: boolean;
          crawls?: LegacyActivityCrawl[];
        }
      >(safeConfig, "/v1/crawl/active", "GET", undefined, requestOptions);

      if (response?.success !== false && Array.isArray(response?.crawls)) {
        crawls = response.crawls;
      }
    } catch (error) {
      if (!(error instanceof FirecrawlError && error.status === 404)) {
        throw error;
      }
    }

    let queueSnapshot:
      | (JsonObject & {
          success?: boolean;
          jobsInQueue?: number | null;
          activeJobsInQueue?: number | null;
          waitingJobsInQueue?: number | null;
          mostRecentSuccess?: string | null;
        })
      | undefined;
    try {
      const response = await request<
        JsonObject & {
          success?: boolean;
          jobsInQueue?: number | null;
          activeJobsInQueue?: number | null;
          waitingJobsInQueue?: number | null;
          mostRecentSuccess?: string | null;
        }
      >(safeConfig, "/v1/team/queue-status", "GET", undefined, requestOptions);

      if (response?.success !== false) {
        queueSnapshot = response;
      }
    } catch (error) {
      if (!(error instanceof FirecrawlError && error.status === 404)) {
        throw error;
      }
    }

    if (!crawls.length && !queueSnapshot) {
      throw new FirecrawlError("Legacy activity endpoints unavailable", 404);
    }

    const items: ActivityItem[] = [];

    for (const crawl of crawls) {
      const created = crawl.createdAt ?? crawl.created_at ?? null;
      const updated = crawl.updatedAt ?? crawl.updated_at ?? null;
      const identifier = crawl.id ?? crawl.jobId ?? null;
      items.push({
        id: identifier,
        jobId: identifier,
        type: "crawl",
        status: "active",
        url: crawl.url ?? null,
        createdAt: created,
        updatedAt: updated ?? created,
        source: "v1/crawl/active",
      });
    }

    if (queueSnapshot) {
      const valueOrNull = (value: unknown) =>
        typeof value === "number" ? value : null;

      const active = valueOrNull(queueSnapshot.activeJobsInQueue);
      const waiting = valueOrNull(queueSnapshot.waitingJobsInQueue);
      const statusParts: string[] = [];
      if (active !== null) {
        statusParts.push(`${active} active`);
      }
      if (waiting !== null) {
        statusParts.push(`${waiting} waiting`);
      }

      items.push({
        id: "queue-status",
        jobId: null,
        type: "queue",
        status: statusParts.length ? statusParts.join(" / ") : "snapshot",
        url: "team queue status",
        createdAt: queueSnapshot.mostRecentSuccess ?? null,
        updatedAt: queueSnapshot.mostRecentSuccess ?? null,
        source: "v1/team/queue-status",
      });
    }

    return items;
  };

  const fetchLegacyUsage = async (options?: RequestOptions): Promise<UsageSummary> => {
    const requestOptions = getOptions(options);

    type LegacyUsageResponse = JsonObject & {
      success?: boolean;
      data?:
        | JsonObject
        | {
            remaining_credits?: number | null;
            remaining_tokens?: number | null;
            plan_credits?: number | null;
            plan_tokens?: number | null;
            billing_period_start?: string | null;
            billing_period_end?: string | null;
          };
    };

    const creditResult = await (async () => {
      try {
        return await request<LegacyUsageResponse>(
          safeConfig,
          "/v1/team/credit-usage",
          "GET",
          undefined,
          requestOptions,
        );
      } catch (error) {
        if (error instanceof FirecrawlError && error.status === 404) {
          return null;
        }
        throw error;
      }
    })();

    const tokenResult = await (async () => {
      try {
        return await request<LegacyUsageResponse>(
          safeConfig,
          "/v1/team/token-usage",
          "GET",
          undefined,
          requestOptions,
        );
      } catch (error) {
        if (error instanceof FirecrawlError && error.status === 404) {
          return null;
        }
        throw error;
      }
    })();

    if (!creditResult && !tokenResult) {
      throw new FirecrawlError("Legacy usage endpoints unavailable", 404);
    }

    const summary: UsageSummary = {
      plan: "self-hosted",
      source: "v1/team/usage",
    } as UsageSummary;

    const assignValue = (key: string, value: JsonValue) => {
      (summary as Record<string, JsonValue>)[key] = value;
    };

    if (creditResult?.success !== false) {
      const data = creditResult?.data as
        | {
            remaining_credits?: number | null;
            plan_credits?: number | null;
            billing_period_start?: string | null;
            billing_period_end?: string | null;
          }
        | undefined;

      if (data) {
        assignValue("creditsRemaining", data.remaining_credits ?? null);
        assignValue("creditsPlan", data.plan_credits ?? null);
        assignValue("creditsPeriodStart", data.billing_period_start ?? null);
        assignValue("creditsPeriodEnd", data.billing_period_end ?? null);
      }
    }

    if (tokenResult?.success !== false) {
      const data = tokenResult?.data as
        | {
            remaining_tokens?: number | null;
            plan_tokens?: number | null;
            billing_period_start?: string | null;
            billing_period_end?: string | null;
          }
        | undefined;

      if (data) {
        assignValue("tokensRemaining", data.remaining_tokens ?? null);
        assignValue("tokensPlan", data.plan_tokens ?? null);
        assignValue("tokensPeriodStart", data.billing_period_start ?? null);
        assignValue("tokensPeriodEnd", data.billing_period_end ?? null);
      }
    }

    return summary;
  };

  const buildOkResponse = (
    path: string,
    note: string,
    extraInfo?: JsonObject,
  ) =>
    attachProbeMetadata(
      { status: "ok" },
      path,
      path !== "/v2/health",
      {
        note,
        ...(extraInfo ?? {}),
      },
    );

  return {
    health: async (options?: RequestOptions) => {
      const requestOptions = getOptions(options);

      try {
        const response = await request<HealthResponse>(
          safeConfig,
          "/v2/health",
          "GET",
          undefined,
          requestOptions,
        );
        return attachProbeMetadata(response, "/v2/health", false);
      } catch (error) {
        const firecrawlError = error instanceof FirecrawlError ? error : undefined;
        const shouldFallback =
          !firecrawlError || firecrawlError.status === 404 || firecrawlError.status === 405;

        if (!shouldFallback) {
          throw error;
        }

        const probes: Array<() => Promise<HealthResponse>> = [
          async () => {
            const data = await request<{ isProduction?: boolean }>(
              safeConfig,
              "/is-production",
              "GET",
              undefined,
              requestOptions,
            );

            const isProduction =
              typeof data?.isProduction === "boolean" ? data.isProduction : undefined;

            const extraInfo: JsonObject = {};
            if (isProduction !== undefined) {
              (extraInfo as Record<string, JsonValue>).isProduction = isProduction;
            }

            return buildOkResponse(
              "/is-production",
              "GET /is-production responded; inferring health from self-host endpoint.",
              extraInfo,
            );
          },
          async () => {
            await request<Record<string, never>>(
              safeConfig,
              "/test",
              "GET",
              undefined,
              requestOptions,
            );

            return buildOkResponse(
              "/test",
              "GET /test succeeded; server lacks /v2/health but is reachable.",
            );
          },
          async () => {
            await request<Record<string, never>>(
              safeConfig,
              "/",
              "GET",
              undefined,
              requestOptions,
            );

            return buildOkResponse(
              "/",
              "Root endpoint responded; consider enabling /v2/health for detailed status.",
            );
          },
        ];

        let lastError: unknown = error;
        for (const probe of probes) {
          try {
            const response = await probe();
            return response;
          } catch (probeError) {
            lastError = probeError;
          }
        }

        throw lastError;
      }
    },
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
      (async () => {
        try {
          return await request<ActivityItem[]>(
            safeConfig,
            "/v2/activity",
            "GET",
            undefined,
            getOptions(options),
          );
        } catch (error) {
          if (error instanceof FirecrawlError && error.status === 404) {
            return fetchLegacyActivity(options);
          }
          throw error;
        }
      })(),
    usage: (options?: RequestOptions) =>
      (async () => {
        try {
          return await request<UsageSummary>(
            safeConfig,
            "/v2/usage",
            "GET",
            undefined,
            getOptions(options),
          );
        } catch (error) {
          if (error instanceof FirecrawlError && error.status === 404) {
            return fetchLegacyUsage(options);
          }
          throw error;
        }
      })(),
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
