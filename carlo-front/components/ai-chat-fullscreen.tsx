"use client"

import { postAiChat } from "@/lib/ai-client";
import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/contexts/language-context"
import { useUser, type ChatMessage } from "@/contexts/user-context"
import { ChatSidebar } from "@/components/chat-sidebar"
import { AuthModal } from "@/components/auth-modal"
import { Send, Sparkles, User, Cross, BookOpen, Heart, Compass, ArrowDown, Menu } from "lucide-react"

export function AIChatFullscreen() {
  const { t, language } = useLanguage()
  const { isAuthenticated, currentConversation, createConversation, updateConversation } = useUser()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Sincronizar mensajes con la conversación actual
  useEffect(() => {
    if (currentConversation) {
      setMessages((prev) => (prev.length ? prev : currentConversation.messages))
    } else {
      setMessages([])
    }
  }, [currentConversation])

  // Traducciones para las preguntas rápidas
  const quickQuestionsTranslations: Record<
    string,
    { saintMatch: string; psalm: string; miracle: string; prayer: string }
  > = {
    es: {
      saintMatch: "¿Qué santo se parece a mí?",
      psalm: "Salmo del día",
      miracle: "Cuéntame un milagro",
      prayer: "¿A qué santo le rezo?",
    },
    en: {
      saintMatch: "Which saint is like me?",
      psalm: "Psalm of the day",
      miracle: "Tell me a miracle",
      prayer: "Which saint should I pray to?",
    },
    zh: {
      saintMatch: "哪位圣人像我？",
      psalm: "今日圣咏",
      miracle: "告诉我一个奇迹",
      prayer: "我应该向哪位圣人祈祷？",
    },
    hi: {
      saintMatch: "कौन सा संत मेरे जैसा है?",
      psalm: "आज का भजन",
      miracle: "मुझे एक चमत्कार बताएं",
      prayer: "मैं किस संत से प्रार्थना करूं?",
    },
    ar: { saintMatch: "أي قديس يشبهني؟", psalm: "مزمور اليوم", miracle: "أخبرني عن معجزة", prayer: "لأي قديس أصلي؟" },
    pt: {
      saintMatch: "Qual santo se parece comigo?",
      psalm: "Salmo do dia",
      miracle: "Conte-me um milagre",
      prayer: "A qual santo devo rezar?",
    },
    ru: {
      saintMatch: "Какой святой похож на меня?",
      psalm: "Псалом дня",
      miracle: "Расскажи о чуде",
      prayer: "Какому святому молиться?",
    },
    fr: {
      saintMatch: "Quel saint me ressemble?",
      psalm: "Psaume du jour",
      miracle: "Raconte-moi un miracle",
      prayer: "À quel saint prier?",
    },
    ja: {
      saintMatch: "私に似た聖人は？",
      psalm: "今日の詩篇",
      miracle: "奇跡を教えて",
      prayer: "どの聖人に祈るべき？",
    },
    de: {
      saintMatch: "Welcher Heilige ist wie ich?",
      psalm: "Psalm des Tages",
      miracle: "Erzähl mir ein Wunder",
      prayer: "Zu welchem Heiligen beten?",
    },
    ko: {
      saintMatch: "나와 닮은 성인은?",
      psalm: "오늘의 시편",
      miracle: "기적을 알려주세요",
      prayer: "어떤 성인에게 기도해야 하나요?",
    },
    it: {
      saintMatch: "Quale santo mi assomiglia?",
      psalm: "Salmo del giorno",
      miracle: "Raccontami un miracolo",
      prayer: "A quale santo pregare?",
    },
    tr: {
      saintMatch: "Hangi aziz bana benziyor?",
      psalm: "Günün mezmuru",
      miracle: "Bana bir mucize anlat",
      prayer: "Hangi azize dua etmeliyim?",
    },
    vi: {
      saintMatch: "Vị thánh nào giống tôi?",
      psalm: "Thánh vịnh hôm nay",
      miracle: "Kể cho tôi một phép lạ",
      prayer: "Tôi nên cầu nguyện với thánh nào?",
    },
    pl: {
      saintMatch: "Który święty jest do mnie podobny?",
      psalm: "Psalm dnia",
      miracle: "Opowiedz mi o cudzie",
      prayer: "Do którego świętego się modlić?",
    },
  }

  // Traducciones para la dedicatoria
  const honorTranslations: Record<string, { inHonor: string; name: string }> = {
    es: { inHonor: "En Honor a", name: "Carlo Acutis" },
    en: { inHonor: "In Honor of", name: "Carlo Acutis" },
    fr: { inHonor: "En l'Honneur de", name: "Carlo Acutis" },
    pt: { inHonor: "Em Honra de", name: "Carlo Acutis" },
    it: { inHonor: "In Onore di", name: "Carlo Acutis" },
    de: { inHonor: "Zu Ehren von", name: "Carlo Acutis" },
    zh: { inHonor: "纪念", name: "卡洛·阿库蒂斯" },
    ja: { inHonor: "を記念して", name: "カルロ・アクティス" },
    ko: { inHonor: "기념", name: "카를로 아쿠티스" },
    ar: { inHonor: "تكريماً لـ", name: "كارلو أكوتيس" },
    hi: { inHonor: "के सम्मान में", name: "कार्लो एकुटिस" },
    ru: { inHonor: "В честь", name: "Карло Акутис" },
    tr: { inHonor: "Onuruna", name: "Carlo Acutis" },
    vi: { inHonor: "Để tưởng nhớ", name: "Carlo Acutis" },
    pl: { inHonor: "Na cześć", name: "Carlo Acutis" },
  }

  // Traducciones para el título de la IA
  const aiTitleTranslations: Record<string, { title: string; subtitle: string }> = {
    es: { title: "IA de la Fe Católica", subtitle: "Tu guía espiritual inteligente" },
    en: { title: "Catholic Faith AI", subtitle: "Your intelligent spiritual guide" },
    fr: { title: "IA de la Foi Catholique", subtitle: "Votre guide spirituel intelligent" },
    pt: { title: "IA da Fé Católica", subtitle: "Seu guia espiritual inteligente" },
    it: { title: "IA della Fede Cattolica", subtitle: "La tua guida spirituale intelligente" },
    de: { title: "KI des Katholischen Glaubens", subtitle: "Ihr intelligenter geistlicher Führer" },
    zh: { title: "天主教信仰人工智能", subtitle: "您的智能精神向导" },
    ja: { title: "カトリック信仰AI", subtitle: "あなたのインテリジェントな霊的ガイド" },
    ko: { title: "가톨릭 신앙 AI", subtitle: "당신의 지능형 영적 안내자" },
    ar: { title: "الذكاء الاصطناعي للإيمان الكاثوليكي", subtitle: "دليلك الروحي الذكي" },
    hi: { title: "कैथोलिक विश्वास AI", subtitle: "आपका बुद्धिमान आध्यात्मिक मार्गदर्शक" },
    ru: { title: "ИИ Католической Веры", subtitle: "Ваш интеллектуальный духовный наставник" },
    tr: { title: "Katolik İnanç Yapay Zekası", subtitle: "Akıllı ruhani rehberiniz" },
    vi: { title: "AI Đức Tin Công Giáo", subtitle: "Hướng dẫn tâm linh thông minh của bạn" },
    pl: { title: "AI Wiary Katolickiej", subtitle: "Twój inteligentny przewodnik duchowy" },
  }

  const currentQuestions = quickQuestionsTranslations[language] || quickQuestionsTranslations.es
  const currentHonor = honorTranslations[language] || honorTranslations.es
  const currentAiTitle = aiTitleTranslations[language] || aiTitleTranslations.es

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleQuickQuestion = (question: string) => {
    setInput(question)
    inputRef.current?.focus()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    let convId = currentConversation?.id
    if (!convId && isAuthenticated) {
      const newConv = createConversation()
      convId = newConv.id
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput("")
    setIsTyping(true)

    if (convId && isAuthenticated) {
      updateConversation(convId, newMessages)
    }

    try {
      const { answer } = await postAiChat({
        message: userMessage.content,
        lang: language || "es",
      })

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: answer,
        timestamp: new Date(),
      }

      const updatedMessages = [...newMessages, assistantMessage]
      setMessages(updatedMessages)

      if (convId && isAuthenticated) {
        updateConversation(convId, updatedMessages)
      }
    } catch (e: any) {
          console.error("AI UI error (fullscreen):", e);
const msg =
        e?.status === 429
          ? "Estoy recibiendo muchas solicitudes ahora mismo. Intenta de nuevo en unos segundos."
          : "Tuve un problema respondiendo. Intenta de nuevo."

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: msg,
        timestamp: new Date(),
      }

      const updatedMessages = [...newMessages, assistantMessage]
      setMessages(updatedMessages)

      if (convId && isAuthenticated) {
        updateConversation(convId, updatedMessages)
      }
    } finally {
      setIsTyping(false)
    }
}

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
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

      <section className="min-h-[calc(100vh-64px)] sm:min-h-[calc(100vh-80px)] flex bg-gradient-to-b from-background via-background to-muted/20 relative">
        <div
          className={`
          fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
          transform transition-transform duration-300 ease-in-out
          ${showMobileSidebar ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
        >
          <ChatSidebar onOpenAuth={() => setShowAuthModal(true)} />
        </div>

        {/* Área principal del chat */}
        <div className="flex-1 flex flex-col relative w-full">
          {/* Fondo decorativo - oculto en móvil para mejor rendimiento */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none hidden sm:block">
            <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
          </div>

          <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-3 sm:px-4 md:px-6 relative z-10">
            <div className="lg:hidden flex items-center pt-3">
              <Button variant="ghost" size="sm" onClick={() => setShowMobileSidebar(true)} className="p-2">
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
              {messages.length === 0 ? (
                /* Estado inicial - grid responsive mejorado */
                <div className="flex flex-col items-center justify-center flex-1 py-4 sm:py-8">
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
                <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 py-3 sm:py-4 max-h-[45vh] sm:max-h-[50vh]">
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
                        <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
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
                  <div ref={messagesEndRef} />
                </div>
              )}

              <div className="relative">
                <form onSubmit={handleSubmit} className="relative">
                  <div className="flex items-end gap-1.5 sm:gap-2 p-1.5 sm:p-2 bg-card border border-border rounded-xl sm:rounded-2xl shadow-lg focus-within:border-primary/50 focus-within:shadow-xl focus-within:shadow-primary/5 transition-all">
                    <textarea
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
                <span className="text-[10px] sm:text-xs">{t("common.exploreMore") || "Explorar más"}</span>
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
