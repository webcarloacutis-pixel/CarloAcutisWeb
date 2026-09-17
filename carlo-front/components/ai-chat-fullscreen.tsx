"use client"

import { postAiChat, chatErrorKey } from "@/lib/ai-client";
import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/contexts/language-context"
import { useUser, type ChatMessage } from "@/contexts/user-context"
import { ChatSidebar } from "@/components/chat-sidebar"
import { AuthModal } from "@/components/auth-modal"
import { Send, Sparkles, User, Cross, BookOpen, Heart, Compass, ArrowDown, Menu } from "lucide-react"

const EMPTY_MESSAGES: ChatMessage[] = []
const conversationKey = (account?: string, conversation?: string) => (account || "anonymous") + ":" + (conversation || "draft")

export function AIChatFullscreen() {
  const { t, language } = useLanguage()
  const { user, isAuthenticated, currentConversation, createConversation, updateConversation, error: historyError } = useUser()
  const viewKey = conversationKey(user?.id, currentConversation?.id)
  const [localMessages, setLocalMessages] = useState<{ key: string; messages: ChatMessage[] } | null>(null)
  const messages = localMessages?.key === viewKey ? localMessages.messages : currentConversation?.messages || EMPTY_MESSAGES
  const [inputState, setInputState] = useState({ key: viewKey, value: "" })
  const input = inputState.key === viewKey ? inputState.value : ""
  const setInput = (value: string) => setInputState({ key: viewKey, value })
  const [typingKey, setTypingKey] = useState<string | null>(null)
  const isTyping = typingKey === viewKey
  const [notice, setNotice] = useState<{ key: string; code: string } | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const historyButtonRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!showMobileSidebar) return
    const historyButton = historyButtonRef.current
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    sidebarRef.current?.querySelector<HTMLElement>('[data-chat-close]')?.focus({ preventScroll: true })
    const closeOrTrap = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setShowMobileSidebar(false); return }
      if (event.key !== "Tab") return
      const focusable = Array.from(sidebarRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href], [tabindex="0"]') || []).filter((element) => element.getClientRects().length)
      const first = focusable[0], last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus({ preventScroll: true }) }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus({ preventScroll: true }) }
    }
    document.addEventListener("keydown", closeOrTrap)
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", closeOrTrap); historyButton?.focus({ preventScroll: true }) }
  }, [showMobileSidebar])

  const activeRequest = useRef<{ key: string; language: string; controller: AbortController } | null>(null)
  useEffect(() => {
    return () => { if (activeRequest.current?.key === viewKey) activeRequest.current.controller.abort() }
  }, [viewKey])
  useEffect(() => () => activeRequest.current?.controller.abort(), [])
  useEffect(() => () => activeRequest.current?.controller.abort("LANGUAGE_CHANGED"), [language])

  const currentQuestions = { saintMatch: t("chat.quick.saintMatch"), psalm: t("chat.quick.psalm"), miracle: t("chat.quick.miracle"), prayer: t("chat.quick.prayer") }
  const currentHonor = { inHonor: t("chat.honor.inHonor"), name: t("chat.honor.name") }
  const currentAiTitle = { title: t("chat.title"), subtitle: t("chat.subtitle") }

  const quickQuestions = [
    {
      icon: <Compass className="w-4 h-4 sm:w-5 sm:h-5" />,
      label: currentQuestions.saintMatch,
      gradient: "from-amber-500 to-orange-600",
    },
    {
      icon: <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />,
      label: currentQuestions.psalm,
      gradient: "from-blue-500 to-indigo-600",
    },
    {
      icon: <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />,
      label: currentQuestions.miracle,
      gradient: "from-purple-500 to-pink-600",
    },
    {
      icon: <Heart className="w-4 h-4 sm:w-5 sm:h-5" />,
      label: currentQuestions.prayer,
      gradient: "from-rose-500 to-red-600",
    },
  ]

  const handleQuickQuestion = (question: string) => {
    setInput(question)
    inputRef.current?.focus({ preventScroll: true })
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!input.trim() || (activeRequest.current && !activeRequest.current.controller.signal.aborted)) return
    const submitted = input.trim()
    const controller = new AbortController()
    const requestId = crypto.randomUUID()
    activeRequest.current = { key: viewKey, language, controller }
    setNotice(null)
    setTypingKey(viewKey)
    let targetKey = viewKey
    let convId = currentConversation?.id
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: submitted, timestamp: new Date() }
    const newMessages = [...messages, userMessage]
    setLocalMessages({ key: targetKey, messages: newMessages })
    setInputState({ key: targetKey, value: "" })
    try {
      if (!convId && isAuthenticated) {
        const conversation = await createConversation()
        if (!conversation) { setNotice({ key: targetKey, code: "chat.persistence" }); return }
        convId = conversation.id
        targetKey = conversationKey(user?.id, convId)
        if (activeRequest.current?.controller === controller) activeRequest.current.key = targetKey
        setLocalMessages({ key: targetKey, messages: newMessages })
        setInputState({ key: targetKey, value: "" })
        setTypingKey(targetKey)
      }
      if (controller.signal.aborted) return
      if (convId && isAuthenticated) {
        const saved = await updateConversation(convId, newMessages)
        if (controller.signal.aborted) return
        if (!saved) { setNotice({ key: targetKey, code: "chat.persistence" }); return }
      }
      const { answer } = await postAiChat({ message: submitted, lang: language, requestId }, controller.signal)
      if (controller.signal.aborted) return
      const updated = [...newMessages, { id: crypto.randomUUID(), role: "assistant" as const, content: answer, timestamp: new Date() }]
      setLocalMessages({ key: targetKey, messages: updated })
      if (convId && isAuthenticated) {
        const saved = await updateConversation(convId, updated)
        if (!saved && !controller.signal.aborted) setNotice({ key: targetKey, code: "chat.persistence" })
      }
    } catch (error: unknown) {
      if (!controller.signal.aborted) setNotice({ key: targetKey, code: chatErrorKey(error) })
    } finally {
      if (activeRequest.current?.controller === controller) {
        if (controller.signal.reason === "LANGUAGE_CHANGED") setNotice({ key: targetKey, code: "chat.languageChanged" })
        setTypingKey(null)
        activeRequest.current = null
      }
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
  }

  const scrollToContent = () => {
    const contentSection = document.getElementById("content-section")
    contentSection?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <>
      {showMobileSidebar && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setShowMobileSidebar(false)} />
      )}

      <section data-testid="chat-section" dir={language === "ar" ? "rtl" : "ltr"} style={{ overflowAnchor: "none" }} className="min-h-[calc(100vh-64px)] sm:min-h-[calc(100vh-80px)] flex bg-gradient-to-b from-background via-background to-muted/20 relative">
        <div ref={sidebarRef} id="chat-history" role={showMobileSidebar ? "dialog" : undefined} aria-modal={showMobileSidebar || undefined} aria-label={t("chat.sidebar.history")}
          className={`
          fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
          transform transition-transform duration-300 ease-in-out
          ${showMobileSidebar ? "block translate-x-0" : "hidden lg:block"}
        `}
        >
          <ChatSidebar onOpenAuth={() => setShowAuthModal(true)} onClose={() => setShowMobileSidebar(false)} />
        </div>

        {/* Área principal del chat */}
        <div className="flex-1 flex flex-col relative w-full min-w-0">
          {/* Fondo decorativo - oculto en móvil para mejor rendimiento */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none hidden sm:block">
            <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
          </div>

          <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-3 sm:px-4 md:px-6 relative z-10">
            <div className="lg:hidden flex items-center pt-3">
              <Button variant="ghost" size="sm" ref={historyButtonRef} aria-controls="chat-history" aria-label={t("chat.openHistory")} aria-expanded={showMobileSidebar} onClick={() => setShowMobileSidebar(true)} className="p-2">
                <Menu className="w-5 h-5" />
              </Button>
            </div>

            <div className="text-center pt-4 sm:pt-8 pb-3 sm:pb-4">
              <div className="mb-4 sm:mb-8">
                <div className="inline-flex flex-col items-center">
                  {/* Línea decorativa superior - más pequeña en móvil */}
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-4">
                    <div className="h-px w-8 sm:w-12 bg-gradient-to-r from-transparent via-primary/40 to-primary/60" />
                    <Cross className="w-3 h-3 sm:w-4 sm:h-4 text-primary/60" />
                    <div className="h-px w-8 sm:w-12 bg-gradient-to-l from-transparent via-primary/40 to-primary/60" />
                  </div>

                  {/* Contenido de la dedicatoria - texto responsive */}
                  <div className="relative px-4 sm:px-8 py-2 sm:py-4">
                    <p className="text-[8px] sm:text-[10px] tracking-[0.3em] sm:tracking-[0.4em] text-primary/60 uppercase font-light mb-1 sm:mb-2">
                      {currentHonor.inHonor}
                    </p>
                    <h2 className="font-serif text-lg sm:text-2xl md:text-3xl font-semibold text-foreground/90 tracking-wide mb-1 sm:mb-2 italic">
                      {currentHonor.name}
                    </h2>
                    <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                      <span className="text-[10px] sm:text-xs text-muted-foreground/70 font-light">03/05/1991</span>
                      <span className="text-primary/40 text-xs sm:text-sm">✝</span>
                      <span className="text-[10px] sm:text-xs text-muted-foreground/70 font-light">12/10/2006</span>
                    </div>
                  </div>

                  {/* Línea decorativa inferior */}
                  <div className="flex items-center gap-2 sm:gap-3 mt-2 sm:mt-4">
                    <div className="h-px w-12 sm:w-20 bg-gradient-to-r from-transparent to-primary/30" />
                    <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-primary/40" />
                    <div className="h-px w-12 sm:w-20 bg-gradient-to-l from-transparent to-primary/30" />
                  </div>
                </div>
              </div>

              <div className="space-y-2 sm:space-y-3">
                <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 sm:py-1.5 bg-primary/10 rounded-full">
                  <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                  <span className="text-[10px] sm:text-xs font-medium text-primary uppercase tracking-wider">
                    {t("ai.poweredBy") || "Inteligencia Artificial"}
                  </span>
                </div>
                <h1 className="font-serif text-xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
                  {currentAiTitle.title}
                </h1>
                <p className="text-muted-foreground text-xs sm:text-sm md:text-base max-w-xl mx-auto px-4">
                  {currentAiTitle.subtitle}
                </p>
              </div>
            </div>

            {/* Área de chat */}
            <div className="flex-1 flex flex-col justify-end pb-3 sm:pb-4">
              <div data-testid="chat-messages" className="h-[320px] sm:h-[400px] overflow-y-auto" style={{ overflowAnchor: "none" }}>
              {messages.length === 0 ? (
                /* Estado inicial - grid responsive mejorado */
                <div className="h-full flex flex-col items-center justify-center py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 w-full max-w-2xl mb-4 sm:mb-8 px-1">
                    {quickQuestions.map((q, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuickQuestion(q.label)}
                        className="group relative flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-card border border-border rounded-xl sm:rounded-2xl hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 text-left overflow-hidden"
                      >
                        <div
                          className={`p-2 sm:p-2.5 bg-gradient-to-br ${q.gradient} rounded-lg sm:rounded-xl text-white shadow-lg flex-shrink-0`}
                        >
                          {q.icon}
                        </div>
                        <span className="text-xs sm:text-sm font-medium text-foreground group-hover:text-primary transition-colors pr-2 line-clamp-2">
                          {q.label}
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Mensajes del chat - responsive mejorado */
                <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-2 sm:gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {message.role === "assistant" && (
                        <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                          <Cross className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] sm:max-w-[80%] p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-sm sm:rounded-br-md"
                            : "bg-card border border-border rounded-bl-sm sm:rounded-bl-md"
                        }`}
                      >
                        <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                      </div>
                      {message.role === "user" && (
                        <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center flex-shrink-0 shadow-lg">
                          <User className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex gap-2 sm:gap-3 justify-start">
                      <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center shadow-lg">
                        <Cross className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                      </div>
                      <div className="bg-card border border-border p-3 sm:p-4 rounded-xl sm:rounded-2xl rounded-bl-sm sm:rounded-bl-md shadow-sm">
                        <div className="flex gap-1 sm:gap-1.5">
                          <span
                            className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full animate-bounce"
                            style={{ animationDelay: "0ms" }}
                          />
                          <span
                            className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full animate-bounce"
                            style={{ animationDelay: "150ms" }}
                          />
                          <span
                            className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full animate-bounce"
                            style={{ animationDelay: "300ms" }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              </div>
              <div data-testid="chat-status" role="status" aria-live="polite" className="h-16 overflow-y-auto text-sm py-2">{historyError || (notice?.key === viewKey ? t(notice.code) : isTyping ? t("chat.loading") : "")}</div>
              <div className="relative">
                <form onSubmit={handleSubmit} className="relative">
                  <div className="flex items-end gap-1.5 sm:gap-2 p-1.5 sm:p-2 bg-card border border-border rounded-xl sm:rounded-2xl shadow-lg focus-within:border-primary/50 focus-within:shadow-xl focus-within:shadow-primary/5 transition-all">
                    <textarea
                      aria-label={t("chat.messageLabel")}
                      maxLength={4000}
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={t("ai.placeholder") || "Pregúntame sobre santos, oraciones, milagros..."}
                      rows={1}
                      className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-transparent border-0 focus:outline-none focus:ring-0 text-xs sm:text-sm resize-none max-h-24 sm:max-h-32 placeholder:text-muted-foreground/60"
                      style={{ minHeight: "40px" }}
                    />
                    <Button
                      aria-label={t("chat.send")}
                      type="submit"
                      size="icon"
                      disabled={!input.trim() || isTyping}
                      className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-30 transition-all flex-shrink-0"
                    >
                      <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </Button>
                  </div>
                </form>
                <p className="text-[10px] sm:text-xs text-center text-muted-foreground/60 mt-2 sm:mt-3 px-4">
                  {t("ai.disclaimer") || "La IA puede cometer errores. Verifica la información importante."}
                </p>
              </div>
            </div>

            {/* Botón para ver más contenido */}
            <div className="flex justify-center pb-4 sm:pb-6">
              <button
                onClick={scrollToContent}
                className="flex flex-col items-center gap-0.5 sm:gap-1 text-muted-foreground/60 hover:text-primary transition-colors group"
              >
                <span className="text-[10px] sm:text-xs">{t("featured.explore")}</span>
                <ArrowDown className="w-4 h-4 sm:w-5 sm:h-5 animate-bounce" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  )
}
