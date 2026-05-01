import { afterEach, describe, expect, it, vi } from "vitest";
import { apiUrl } from "./api-url";
import { getSiteUrl } from "./site-url";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.unstubAllGlobals();
});

describe("apiUrl", () => {
  it("uses NEXT_PUBLIC_API_URL and normalizes slashes", () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com/";

    expect(apiUrl("saints")).toBe("https://api.example.com/saints");
    expect(apiUrl("/prayers")).toBe("https://api.example.com/prayers");
  });

  it("falls back to the browser origin when no API URL is configured", () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    vi.stubGlobal("window", {
      location: { origin: "https://front.example.com/" },
    });

    expect(apiUrl("/health")).toBe("https://front.example.com/health");
  });
});

describe("getSiteUrl", () => {
  it("prefers NEXT_PUBLIC_SITE_URL", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://carlo.example.com";
    process.env.VERCEL_URL = "ignored.vercel.app";

    expect(getSiteUrl()).toBe("https://carlo.example.com");
  });

  it("uses VERCEL_URL when explicit site URL is missing", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.VERCEL_URL = "carlo.vercel.app";

    expect(getSiteUrl()).toBe("https://carlo.vercel.app");
  });
});
