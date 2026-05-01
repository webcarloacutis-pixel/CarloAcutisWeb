import type React from "react"
import type { Metadata } from "next"
import { Playfair_Display, Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { LanguageProvider } from "@/contexts/language-context"
import { UserProvider } from "@/contexts/user-context"
import { DynamicMetadata } from "@/components/dynamic-metadata"
import "./globals.css"

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`font-sans ${playfair.variable} ${inter.variable} antialiased`}>
        <UserProvider>
          <LanguageProvider>
            <DynamicMetadata />
            <Suspense fallback={null}>
              {children}
              <Analytics />
            </Suspense>
          </LanguageProvider>
        </UserProvider>
      </body>
    </html>
  )
}
