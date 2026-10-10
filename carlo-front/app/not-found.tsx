import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { T } from "@/components/t"
export default function NotFound() {
  return <div className="min-h-screen bg-background"><Header /><main className="max-w-3xl mx-auto px-4 py-16 space-y-6">
    <h1 className="font-playfair text-3xl"><T k="chrome.notFound" /></h1><p><T k="chrome.notFoundHelp" /></p>
    <Button asChild><Link prefetch={false} href="/santos"><T k="chrome.backCatalog" /></Link></Button>
  </main><Footer /></div>
}
