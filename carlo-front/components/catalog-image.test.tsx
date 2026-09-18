// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { CatalogImage } from "./catalog-image"

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
})

describe("catalogue images", () => {
  const first = "/catalog/owner-2026/owner-2026-001.webp"
  const second = "/catalog/owner-2026/owner-2026-002.webp"
  const publicBucket = "https://rquzpsjismymbyijwhgj.supabase.co/storage/v1/object/public/acutis-catalog"

  it("renders the public URL without requiring a session or credentials", () => {
    vi.stubEnv("NEXT_PUBLIC_CATALOG_STORAGE_PROVIDER", "supabase")
    render(<CatalogImage src={first} alt="San José" width={200} height={200} />)
    expect(screen.getByRole("img").getAttribute("src"))
      .toBe(`${publicBucket}/owner-2026/owner-2026-001.webp`)
  })

  it("falls back on a failed request and tries again when the source changes", () => {
    vi.stubEnv("NEXT_PUBLIC_CATALOG_STORAGE_PROVIDER", "supabase")
    const onError = vi.fn()
    const { rerender } = render(<CatalogImage src={first} alt="Santo" width={200} height={200} onError={onError} />)
    fireEvent.error(screen.getByRole("img"))
    expect(screen.getByRole("img").getAttribute("src")).toBe("/placeholder.svg")
    fireEvent.error(screen.getByRole("img"))
    expect(screen.getByRole("img").getAttribute("src")).toBe("/placeholder.svg")
    expect(onError).toHaveBeenCalledTimes(2)
    rerender(<CatalogImage src={second} alt="Santo" width={200} height={200} />)
    expect(screen.getByRole("img").getAttribute("src"))
      .toBe(`${publicBucket}/owner-2026/owner-2026-002.webp`)
  })

  it("keeps the local provider working", () => {
    vi.stubEnv("NEXT_PUBLIC_CATALOG_STORAGE_PROVIDER", "local")
    render(<CatalogImage src={first} alt="San José" width={200} height={200} />)
    expect(new URL(screen.getByRole("img").getAttribute("src")!, document.baseURI).href)
      .toBe(new URL(first, document.baseURI).href)
  })
})
