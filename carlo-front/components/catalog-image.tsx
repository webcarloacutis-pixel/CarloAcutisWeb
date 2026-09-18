"use client"

import Image, { type ImageProps } from "next/image"
import { useState } from "react"
import { catalogImageFallback, catalogStorageProvider, resolveCatalogImageUrl } from "@/lib/catalog-storage.mjs"

export function CatalogImage({ src, alt, onError, ...props }: ImageProps) {
  const provider = catalogStorageProvider({
    CATALOG_STORAGE_PROVIDER: process.env.NEXT_PUBLIC_CATALOG_STORAGE_PROVIDER,
  })
  const resolved = typeof src === "string" ? resolveCatalogImageUrl(src, provider) : src
  const [failedSource, setFailedSource] = useState<ImageProps["src"]>()

  return (
    <Image
      {...props}
      alt={alt}
      unoptimized
      src={failedSource === resolved ? catalogImageFallback : resolved}
      onError={(event) => {
        if (resolved !== catalogImageFallback && failedSource !== resolved) setFailedSource(resolved)
        onError?.(event)
      }}
    />
  )
}
