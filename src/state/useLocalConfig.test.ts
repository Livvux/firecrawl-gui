import { describe, expect, it } from "vitest";
import { validateBaseUrl } from "./useLocalConfig";

describe("validateBaseUrl", () => {
  it("rejects empty values", () => {
    expect(validateBaseUrl("")).toEqual({
      valid: false,
      reason: "Base URL is required",
    });
  });

  it("rejects unsupported protocols", () => {
    expect(validateBaseUrl("ftp://example.com")).toEqual({
      valid: false,
      reason: "URL must use http or https",
    });
  });

  it("accepts valid http and https URLs", () => {
    expect(validateBaseUrl("https://example.com")).toEqual({ valid: true });
    expect(validateBaseUrl("http://localhost:3000")).toEqual({ valid: true });
  });
});
