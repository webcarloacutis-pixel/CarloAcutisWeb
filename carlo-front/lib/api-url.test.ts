import { afterEach, describe, expect, it, vi } from "vitest";
import { apiUrl } from "./api-url";
import { getSiteUrl } from "./site-url";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.unstubAllGlobals();
});

describe("apiUrl", () => {
  it("requires an explicit server backend and ignores legacy public destinations", () => {
    process.env.NEXT_PUBLIC_API_URL = "https://ignored.example.com"
    process.env.BACKEND_URL = "http://127.0.0.1:4100/"
    expect(apiUrl("saints")).toBe("http://127.0.0.1:4100/saints")
    delete process.env.BACKEND_URL
    expect(() => apiUrl("/prayers")).toThrow("BACKEND_URL")
  })
  it("keeps browser requests on the same origin", () => {
    vi.stubGlobal("window", {location: {origin: "https://front.example.com"}})
    process.env.NEXT_PUBLIC_API_URL="https://ignored.example.com"
    expect(apiUrl("/health")).toBe("/api/health")
    expect(apiUrl("/api/saints")).toBe("/api/saints")
    expect(() => apiUrl("https://evil.test")).toThrow()
    expect(() => apiUrl("../admin")).toThrow()
  })
})

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
