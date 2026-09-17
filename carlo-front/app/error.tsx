"use client"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/contexts/language-context"
import { useRouter } from "next/navigation"
import { startTransition } from "react"
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useLanguage(), router = useRouter()
  const digest = error.digest && /^[a-zA-Z0-9_-]{1,80}$/.test(error.digest) ? error.digest : null
  return <div className="min-h-screen bg-background"><Header /><main className="max-w-3xl mx-auto px-4 py-16 space-y-6">
    <h1 className="font-playfair text-3xl">{t("content.unavailable")}</h1>
    <p>{t("content.retryHint")}</p>{digest && <p className="text-sm">{t("content.reference")}: {digest}</p>}
    <Button onClick={() => startTransition(() => { router.refresh(); reset() })}>{t("content.retry")}</Button>
  </main><Footer /></div>
}
