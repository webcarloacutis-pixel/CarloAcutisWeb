import { Header } from "@/components/header"
import { AIChatFullscreen } from "@/components/ai-chat-fullscreen"
import { FeaturedSections } from "@/components/featured-sections"
import { ScriptureSearch } from "@/components/scripture-search"
import { InteractiveInvitations } from "@/components/interactive-invitations"
import { Footer } from "@/components/footer"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <AIChatFullscreen />

        <div id="content-section">
          <InteractiveInvitations />
          <ScriptureSearch />
          <FeaturedSections />
        </div>
      </main>
      <Footer />
    </div>
  )
}
