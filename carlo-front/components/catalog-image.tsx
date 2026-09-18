"use client"

import Image, { type ImageProps } from "next/image"
import { useState } from "react"
import { catalogImageFallback, catalogStorageProvider, resolveCatalogImageUrl } from "@/lib/catalog-storage.mjs"

export function CatalogImage({ src, alt, onError, style, sizes, ...props }: ImageProps) {
  const provider = catalogStorageProvider({
    CATALOG_STORAGE_PROVIDER: process.env.NEXT_PUBLIC_CATALOG_STORAGE_PROVIDER,
  })
  const resolved = typeof src === "string" ? resolveCatalogImageUrl(src, provider) : src
  const [failedSource, setFailedSource] = useState<ImageProps["src"]>()

  return (
    <Image
      {...props}
      alt={alt}
      sizes={sizes ?? (props.fill ? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" : undefined)}
      style={{ objectFit: "contain", objectPosition: "center", backgroundColor: "hsl(var(--muted))", ...style }}
      unoptimized
      src={failedSource === resolved ? catalogImageFallback : resolved}
      onError={(event) => {
        if (resolved !== catalogImageFallback && failedSource !== resolved) setFailedSource(resolved)
        onError?.(event)
      }}
    />
  )
}
