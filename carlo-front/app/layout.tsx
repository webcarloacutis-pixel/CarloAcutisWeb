import type React from "react"
import type { Metadata } from "next"
import { Playfair_Display, Inter } from "next/font/google"
import { VisitAnalytics } from "@/components/visit-analytics"
import { SiteProviders } from "@/components/site-providers"
import { DynamicMetadata } from "@/components/dynamic-metadata"
import "./globals.css"
import { cookies, headers } from "next/headers"
import { normalizeContentLocale, htmlContentLocale } from "@/lib/content-locale"

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
})

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Catholic Website - Faith, Saints and Tradition",
  description: "Discover the richness of Catholic faith through saints, miracles, prayers and sacred traditions.",
  generator: "v0.app",
  keywords: "catholic, saints, miracles, prayers, faith, tradition, eucharist",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const requestHeaders = await headers()
  const preferences = await cookies()
  const locale = normalizeContentLocale(requestHeaders.get("x-acutis-locale") || preferences.get("acutis_locale")?.value)
  return (
    <html lang={htmlContentLocale(locale)} dir={locale === "ar" ? "rtl" : "ltr"}>
      <body className={`font-sans ${playfair.variable} ${inter.variable} antialiased`}>
        <SiteProviders initialLanguage={locale}>
          <DynamicMetadata />
          {children}
          <VisitAnalytics />
        </SiteProviders>
      </body>
    </html>
  )
}
