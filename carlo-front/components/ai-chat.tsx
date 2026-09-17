"use client"

import { T } from "@/components/t";
import { postAiChat, chatErrorKey } from "@/lib/ai-client";
import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/contexts/language-context"
import { Send, Sparkles, User, Cross, BookOpen, Heart, Compass } from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface QuickQuestion {
  icon: React.ReactNode
  labelKey: string
  question: string
}

export function AIChat() {
  const { t, language } = useLanguage()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const pending = useRef<AbortController | null>(null)
  const [notice, setNotice] = useState("")
  useEffect(() => () => pending.current?.abort("LANGUAGE_CHANGED"), [language])
  const inputRef = useRef<HTMLInputElement>(null)

  const quickQuestions: QuickQuestion[] = [
    {
      icon: <Compass className="w-4 h-4" />,
      labelKey: "ai.quickSaintMatch",
      question: t("chat.quick.saintMatch"),
    },
    {
      icon: <BookOpen className="w-4 h-4" />,
      labelKey: "ai.quickPsalm",
      question: t("chat.quick.psalm"),
    },
    {
      icon: <Sparkles className="w-4 h-4" />,
      labelKey: "ai.quickMiracle",
      question: t("chat.quick.miracle"),
    },
    {
      icon: <Heart className="w-4 h-4" />,
      labelKey: "ai.quickPrayer",
      question: t("chat.quick.prayer"),
    },
  ]

  const handleQuickQuestion = (question: string) => {
    setInput(question)
    inputRef.current?.focus({ preventScroll: true })
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!input.trim() || (pending.current && !pending.current.signal.aborted)) return
    const controller = new AbortController();pending.current = controller
    const userMessage: Message = { id: crypto.randomUUID(), role: "user", content: input.trim(), timestamp: new Date() }
    setMessages(previous => [...previous, userMessage]);setInput("");setIsTyping(true);setNotice("")
    try {
      const {answer} = await postAiChat({message:userMessage.content,lang:language},controller.signal)
      if(!controller.signal.aborted)setMessages(previous=>[...previous,{id:crypto.randomUUID(),role:"assistant",content:answer,timestamp:new Date()}])
    } catch(error) {if(!controller.signal.aborted)setNotice(chatErrorKey(error))}
    finally {if(pending.current===controller){if(controller.signal.reason==="LANGUAGE_CHANGED")setNotice("chat.languageChanged");setIsTyping(false);pending.current=null}}
  }

  return (
    <section dir={language === "ar" ? "rtl" : "ltr"} style={{ overflowAnchor: "none" }} className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-4xl mx-auto">
        {/* Header del Chat */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-primary"><T k="ai.poweredBy" /></span>
          </div>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-3"><T k="ai.title" /></h2>
          <p className="text-muted-foreground max-w-2xl mx-auto"><T k="ai.subtitle" /></p>
        </div>

        {/* Preguntas Rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {quickQuestions.map((q, index) => (
            <button
              key={index}
              onClick={() => handleQuickQuestion(q.question)}
              className="flex flex-col items-center gap-2 p-4 bg-card border border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all duration-300 group"
            >
              <div className="p-3 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors">{q.icon}</div>
              <span className="text-xs md:text-sm text-center font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                {t(q.labelKey)}
              </span>
            </button>
          ))}
        </div>

        {/* Área de Chat */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg">
          {/* Mensajes */}
          <div data-testid="compact-chat-messages" style={{ overflowAnchor: "none" }} className="h-[300px] overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
                <Cross className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-lg font-medium"><T k="ai.welcomeTitle" /></p>
                <p className="text-sm mt-1"><T k="ai.welcomeSubtitle" /></p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Cross className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] p-4 rounded-2xl ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  </div>
                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))
            )}
            {isTyping && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Cross className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-muted p-4 rounded-2xl rounded-bl-md">
                  <div className="flex gap-1">
                    <span
                      className="w-2 h-2 bg-primary/50 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    ></span>
                    <span
                      className="w-2 h-2 bg-primary/50 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    ></span>
                    <span
                      className="w-2 h-2 bg-primary/50 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    ></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div role="status" className="h-16 overflow-y-auto px-4 py-2">{notice ? t(notice) : isTyping ? t("chat.loading") : ""}</div>
          {/* Input */}
          <form onSubmit={handleSubmit} className="border-t border-border p-4 bg-muted/30">
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                aria-label={t("chat.messageLabel")}
                maxLength={4000}
                onKeyDown={event => { if(event.key === "Enter" && (event.nativeEvent.isComposing || event.keyCode === 229)) event.preventDefault() }}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t("ai.placeholder")}
                className="flex-1 px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              />
              <Button aria-label={t("chat.send")} type="submit" size="lg" disabled={!input.trim() || isTyping} className="px-6 rounded-xl">
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </form>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-center text-muted-foreground mt-4"><T k="ai.disclaimer" /></p>
      </div>
    </section>
  )
}
