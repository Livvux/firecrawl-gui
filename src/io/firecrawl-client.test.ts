import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFirecrawlClient, FirecrawlError } from "./firecrawl-client";

const mockFetch = vi.fn();

describe("firecrawlClient", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    globalThis.fetch = mockFetch as unknown as typeof fetch;
  });

  it("calls the health endpoint with normalized base URLs and auth", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = createFirecrawlClient({
      baseUrl: "https://example.dev/",
      apiKey: "test-key",
    });

    await client.health();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://example.dev/v2/health");
    expect(init?.method).toBe("GET");
    const headers = init?.headers instanceof Headers ? init.headers : new Headers(init?.headers);
    expect(headers.get("Authorization")).toBe("Bearer test-key");
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

  it("throws FirecrawlError with response message when available", async () => {
    mockFetch.mockResolvedValue(
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
});
