import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFirecrawlClient, FirecrawlError } from "./firecrawl-client";

const mockFetch = vi.fn();

describe("firecrawlClient", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    globalThis.fetch = mockFetch as unknown as typeof fetch;
  });

  it("calls the health endpoint with normalized base URLs and auth", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = createFirecrawlClient({
      baseUrl: "https://example.dev/",
      apiKey: "test-key",
    });

    const result = await client.health();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://example.dev/v2/health");
    expect(init?.method).toBe("GET");
    const headers = init?.headers instanceof Headers ? init.headers : new Headers(init?.headers);
    expect(headers.get("Authorization")).toBe("Bearer test-key");

    const info = result.info as Record<string, unknown> | undefined;
    expect(info?.checkedEndpoint).toBe("/v2/health");
    expect(info?.fallback).toBe(false);
  });

  it("falls back to /is-production when /v2/health is missing", async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ isProduction: false }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    const client = createFirecrawlClient({ baseUrl: "https://self.hosted" });
    const result = await client.health();

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const firstCall = mockFetch.mock.calls[0]![0] as string;
    const secondCall = mockFetch.mock.calls[1]![0] as string;
    expect(firstCall).toBe("https://self.hosted/v2/health");
    expect(secondCall).toBe("https://self.hosted/is-production");

    const info = result.info as Record<string, unknown> | undefined;
    expect(info?.checkedEndpoint).toBe("/is-production");
    expect(info?.fallback).toBe(true);
    expect(info?.isProduction).toBe(false);
  });

  it("falls back to /test when both /v2/health and /is-production fail", async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(new Response("Hello", { status: 200 }));

    const client = createFirecrawlClient({ baseUrl: "https://self.hosted" });
    const result = await client.health();

    expect(mockFetch).toHaveBeenCalledTimes(3);
    const paths = mockFetch.mock.calls.map((call) => call[0]) as string[];
    expect(paths).toEqual([
      "https://self.hosted/v2/health",
      "https://self.hosted/is-production",
      "https://self.hosted/test",
    ]);

    const info = result.info as Record<string, unknown> | undefined;
    expect(info?.checkedEndpoint).toBe("/test");
    expect(info?.fallback).toBe(true);
  });

  it("stringifies POST payloads for scrape requests", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ data: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = createFirecrawlClient({ baseUrl: "https://api.local" });
    await client.scrape({ url: "https://example.com" });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ url: "https://example.com" }));
    const headers = init?.headers instanceof Headers ? init.headers : new Headers(init?.headers);
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("targets the map endpoint for map requests", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = createFirecrawlClient({ baseUrl: "https://api.local" });
    await client.map({ url: "https://example.com", sitemap: "include", limit: 10 });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.local/v2/map");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(
      JSON.stringify({ url: "https://example.com", sitemap: "include", limit: 10 }),
    );
  });

  it("posts search payloads to /v2/search", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ data: {} }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = createFirecrawlClient({ baseUrl: "https://api.local" });
    await client.search({ query: "firecrawl", limit: 5, lang: "en" });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.local/v2/search");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ query: "firecrawl", limit: 5, lang: "en" }));
  });

  it("posts crawl payloads to /v2/crawl", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ jobId: "crawl-1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = createFirecrawlClient({ baseUrl: "https://api.local" });
    await client.crawl({ url: "https://example.com", limit: 10 });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.local/v2/crawl");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ url: "https://example.com", limit: 10 }));
  });

  it("posts extract payloads to /v2/extract", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ jobId: "extract-1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = createFirecrawlClient({ baseUrl: "https://api.local" });
    await client.extract({ urls: ["https://example.com"], prompt: "Summarise" });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.local/v2/extract");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(
      JSON.stringify({ urls: ["https://example.com"], prompt: "Summarise" }),
    );
  });

  it("throws when every health probe fails", async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }),
      );

    const client = createFirecrawlClient({ baseUrl: "https://api.local" });

    await expect(client.health()).rejects.toMatchObject({
      status: 404,
      message: "Not found",
    });
  });

  it("wraps network errors in FirecrawlError", async () => {
    mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));

    const client = createFirecrawlClient({ baseUrl: "https://api.local" });

    await expect(client.health()).rejects.toBeInstanceOf(FirecrawlError);
  });

  it("rethrows abort errors so callers can ignore cancellations", async () => {
    const abortError = new DOMException("Aborted", "AbortError");
    mockFetch.mockRejectedValue(abortError);

    const client = createFirecrawlClient({ baseUrl: "https://api.local" });

    await expect(client.health()).rejects.toBe(abortError);
  });

  it("maps timeout errors to FirecrawlError with status 408", async () => {
    mockFetch.mockRejectedValue(new DOMException("Timed out", "TimeoutError"));

    const client = createFirecrawlClient({ baseUrl: "https://api.local" });

    await expect(client.health()).rejects.toMatchObject({
      status: 408,
      message: "Request timed out",
    });
  });

  it("falls back to v1 endpoints for activity polling when /v2/activity is missing", async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            crawls: [
              {
                id: "crawl-1",
                url: "https://example.com",
                created_at: "2024-01-01T00:00:00.000Z",
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            activeJobsInQueue: 1,
            waitingJobsInQueue: 0,
            mostRecentSuccess: "2024-01-01T00:00:05.000Z",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );

    const client = createFirecrawlClient({ baseUrl: "https://self.hosted" });
    const activity = await client.activity();

    expect(mockFetch).toHaveBeenCalledTimes(3);
    const calledUrls = mockFetch.mock.calls.map((call) => call[0]) as string[];
    expect(calledUrls).toEqual([
      "https://self.hosted/v2/activity",
      "https://self.hosted/v1/crawl/active",
      "https://self.hosted/v1/team/queue-status",
    ]);

    expect(activity).toEqual([
      expect.objectContaining({
        id: "crawl-1",
        type: "crawl",
        status: "active",
        url: "https://example.com",
        source: "v1/crawl/active",
      }),
      expect.objectContaining({
        id: "queue-status",
        type: "queue",
        source: "v1/team/queue-status",
      }),
    ]);
  });

  it("falls back to v1 usage endpoints when /v2/usage is missing", async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              remaining_credits: 500,
              plan_credits: 1000,
              billing_period_start: "2024-01-01T00:00:00.000Z",
              billing_period_end: "2024-02-01T00:00:00.000Z",
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              remaining_tokens: 750,
              plan_tokens: 1500,
              billing_period_start: "2024-01-01T00:00:00.000Z",
              billing_period_end: "2024-02-01T00:00:00.000Z",
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );

    const client = createFirecrawlClient({ baseUrl: "https://self.hosted" });
    const usage = await client.usage();

    expect(mockFetch).toHaveBeenCalledTimes(3);
    const calledUrls = mockFetch.mock.calls.map((call) => call[0]) as string[];
    expect(calledUrls).toEqual([
      "https://self.hosted/v2/usage",
      "https://self.hosted/v1/team/credit-usage",
      "https://self.hosted/v1/team/token-usage",
    ]);

    expect(usage).toMatchObject({
      plan: "self-hosted",
      source: "v1/team/usage",
      creditsRemaining: 500,
      creditsPlan: 1000,
      tokensRemaining: 750,
      tokensPlan: 1500,
    });
  });
});
