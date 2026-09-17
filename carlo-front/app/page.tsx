import { Header } from "@/components/header"
import { AIChatFullscreen } from "@/components/ai-chat-fullscreen"
import { FeaturedSections } from "@/components/featured-sections"
import { ScriptureSearch } from "@/components/scripture-search"
import { InteractiveInvitations } from "@/components/interactive-invitations"
import { Footer } from "@/components/footer"

export default function HomePage() {
  return (
    // Translations can resize sections below the chat. Keep the browser from
    // moving the document to preserve one of those automatic scroll anchors.
    <div className="min-h-screen bg-background" style={{ overflowAnchor: "none" }}>
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
