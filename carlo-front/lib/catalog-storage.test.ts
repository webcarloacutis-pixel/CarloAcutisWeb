import { describe, expect, it } from "vitest";
import {
  catalogImageFallback, catalogStorageProvider, catalogStorageRewrites, resolveCatalogImageUrl,
} from "./catalog-storage.mjs";

const publicBucket = "https://rquzpsjismymbyijwhgj.supabase.co/storage/v1/object/public/acutis-catalog";

describe("catalog Storage routing", () => {
  it("uses only the authorized project and bucket, preserving stored source paths", () => {
    expect(catalogStorageRewrites({ CATALOG_STORAGE_PROVIDER: "supabase" })).toEqual([
      { source: "/catalog/:path*", destination: `${publicBucket}/:path*` },
    ]);
  });
  it("requires an explicit valid provider and retains local development", () => {
    expect(catalogStorageProvider({})).toBe("local");
    expect(catalogStorageProvider({ CATALOG_STORAGE_PROVIDER: "supabase" })).toBe("supabase");
    expect(catalogStorageRewrites({ CATALOG_STORAGE_PROVIDER: "local" })).toEqual([]);
    expect(() => catalogStorageRewrites({ CATALOG_STORAGE_PROVIDER: "other" })).toThrow();
  });
});

describe("catalogue image URLs", () => {
  it("resolves a stored path to an anonymous public URL without changing it", () => {
    const saint = { imageUrl: "/catalog/owner-2026/owner-2026-001.webp" };
    const resolved = resolveCatalogImageUrl(saint.imageUrl, "supabase");
    expect(resolved).toBe(`${publicBucket}/owner-2026/owner-2026-001.webp`);
    expect(saint.imageUrl).toBe("/catalog/owner-2026/owner-2026-001.webp");
    expect(resolveCatalogImageUrl(resolved, "supabase")).toBe(resolved);
    const url = new URL(resolved);
    expect([url.username, url.password, url.search, url.hash]).toEqual(["", "", "", ""]);
  });

  it("encodes object segments exactly once", () => {
    expect(resolveCatalogImageUrl("/catalog/José/imagen 1.webp", "supabase"))
      .toBe(`${publicBucket}/Jos%C3%A9/imagen%201.webp`);
    expect(resolveCatalogImageUrl("/catalog/Jos%C3%A9/imagen%201.webp", "supabase"))
      .toBe(`${publicBucket}/Jos%C3%A9/imagen%201.webp`);
  });

  it.each([
    "/catalog/../private.webp", "/catalog/%2e%2e/private.webp", "/catalog/%252e%252e/private.webp",
    "/catalog/owner//image.webp", "/catalog/owner%2Fprivate/image.webp",
    "/catalog/owner%5Cprivate/image.webp", "/catalog/image.webp?token=value",
    "/catalog/image.webp#fragment", "/catalog/%00.webp", "/catalog/%broken.webp", "/catalog/",
  ])("rejects ambiguous or unsafe object keys: %s", (source) => {
    expect(resolveCatalogImageUrl(source, "supabase")).toBe(catalogImageFallback);
  });

  it("preserves local images, external images and admin previews", () => {
    const logical = "/catalog/owner-2026/owner-2026-001.webp";
    expect(resolveCatalogImageUrl(logical, "local")).toBe(logical);
    expect(resolveCatalogImageUrl(logical)).toBe(logical);
    for (const source of ["/saint.jpg", "https://example.org/saint.webp", "data:image/webp;base64,UklGRg=="])
      expect(resolveCatalogImageUrl(source, "supabase")).toBe(source);
  });

  it.each([null, undefined, ""])("uses the placeholder for missing image data: %s", (source) => {
    expect(resolveCatalogImageUrl(source, "supabase")).toBe(catalogImageFallback);
  });
});
