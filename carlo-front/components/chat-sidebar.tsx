"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useUser } from "@/contexts/user-context"
import { useLanguage } from "@/contexts/language-context"
import { Plus, MessageSquare, Trash2, Edit3, Check, X, LogOut, User } from "lucide-react"

interface ChatSidebarProps {
  onOpenAuth: () => void
}

export function ChatSidebar({ onOpenAuth }: ChatSidebarProps) {
  const {
    user,
    isAuthenticated,
    conversations,
    currentConversation,
    createConversation,
    selectConversation,
    deleteConversation,
    renameConversation,
    logout,
  } = useUser()
  const { language } = useLanguage()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")

  const translations: Record<
    string,
    {
      newChat: string
      history: string
      login: string
      loginPrompt: string
      noConversations: string
      deleteConfirm: string
      logout: string
    }
  > = {
    es: {
      newChat: "Nueva conversación",
      history: "Historial",
      login: "Iniciar sesión",
      loginPrompt: "Inicia sesión para guardar tu historial",
      noConversations: "No hay conversaciones",
      deleteConfirm: "¿Eliminar?",
      logout: "Cerrar sesión",
    },
    en: {
      newChat: "New chat",
      history: "History",
      login: "Sign in",
      loginPrompt: "Sign in to save your history",
      noConversations: "No conversations",
      deleteConfirm: "Delete?",
      logout: "Sign out",
    },
    fr: {
      newChat: "Nouvelle conversation",
      history: "Historique",
      login: "Connexion",
      loginPrompt: "Connectez-vous pour sauvegarder",
      noConversations: "Aucune conversation",
      deleteConfirm: "Supprimer?",
      logout: "Déconnexion",
    },
    pt: {
      newChat: "Nova conversa",
      history: "Histórico",
      login: "Entrar",
      loginPrompt: "Entre para salvar seu histórico",
      noConversations: "Sem conversas",
      deleteConfirm: "Excluir?",
      logout: "Sair",
    },
    de: {
      newChat: "Neuer Chat",
      history: "Verlauf",
      login: "Anmelden",
      loginPrompt: "Melden Sie sich an, um zu speichern",
      noConversations: "Keine Gespräche",
      deleteConfirm: "Löschen?",
      logout: "Abmelden",
    },
    it: {
      newChat: "Nuova chat",
      history: "Cronologia",
      login: "Accedi",
      loginPrompt: "Accedi per salvare la cronologia",
      noConversations: "Nessuna conversazione",
      deleteConfirm: "Eliminare?",
      logout: "Esci",
    },
    zh: {
      newChat: "新对话",
      history: "历史记录",
      login: "登录",
      loginPrompt: "登录以保存历史记录",
      noConversations: "没有对话",
      deleteConfirm: "删除？",
      logout: "退出",
    },
    ja: {
      newChat: "新しいチャット",
      history: "履歴",
      login: "ログイン",
      loginPrompt: "履歴を保存するにはログイン",
      noConversations: "会話がありません",
      deleteConfirm: "削除？",
      logout: "ログアウト",
    },
    ko: {
      newChat: "새 대화",
      history: "기록",
      login: "로그인",
      loginPrompt: "기록을 저장하려면 로그인",
      noConversations: "대화 없음",
      deleteConfirm: "삭제?",
      logout: "로그아웃",
    },
    ar: {
      newChat: "محادثة جديدة",
      history: "السجل",
      login: "تسجيل الدخول",
      loginPrompt: "سجل لحفظ السجل",
      noConversations: "لا توجد محادثات",
      deleteConfirm: "حذف؟",
      logout: "تسجيل الخروج",
    },
    hi: {
      newChat: "नई बातचीत",
      history: "इतिहास",
      login: "लॉग इन",
      loginPrompt: "इतिहास सहेजने के लिए लॉग इन करें",
      noConversations: "कोई बातचीत नहीं",
      deleteConfirm: "हटाएं?",
      logout: "लॉग आउट",
    },
    ru: {
      newChat: "Новый чат",
      history: "История",
      login: "Войти",
      loginPrompt: "Войдите, чтобы сохранить историю",
      noConversations: "Нет разговоров",
      deleteConfirm: "Удалить?",
      logout: "Выйти",
    },
    tr: {
      newChat: "Yeni sohbet",
      history: "Geçmiş",
      login: "Giriş yap",
      loginPrompt: "Geçmişi kaydetmek için giriş yapın",
      noConversations: "Sohbet yok",
      deleteConfirm: "Sil?",
      logout: "Çıkış",
    },
    vi: {
      newChat: "Cuộc trò chuyện mới",
      history: "Lịch sử",
      login: "Đăng nhập",
      loginPrompt: "Đăng nhập để lưu lịch sử",
      noConversations: "Không có cuộc trò chuyện",
      deleteConfirm: "Xóa?",
      logout: "Đăng xuất",
    },
    pl: {
      newChat: "Nowa rozmowa",
      history: "Historia",
      login: "Zaloguj się",
      loginPrompt: "Zaloguj się, aby zapisać historię",
      noConversations: "Brak rozmów",
      deleteConfirm: "Usunąć?",
      logout: "Wyloguj",
    },
  }

  const t = translations[language] || translations.es

  const handleStartEdit = (id: string, title: string) => {
    setEditingId(id)
    setEditTitle(title)
  }

  const handleSaveEdit = (id: string) => {
    if (editTitle.trim()) {
      renameConversation(id, editTitle.trim())
    }
    setEditingId(null)
    setEditTitle("")
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditTitle("")
  }

  return (
    <div className="h-full bg-card/95 backdrop-blur-sm border-r border-border flex flex-col w-[280px] sm:w-72">
      {/* Header */}
      <div className="p-2 sm:p-3 border-b border-border flex items-center gap-2">
        <Button
          onClick={() => {
            if (isAuthenticated) {
              createConversation()
            } else {
              onOpenAuth()
            }
          }}
          className="flex-1 bg-gradient-to-r from-primary to-amber-600 hover:from-primary/90 hover:to-amber-600/90 text-xs sm:text-sm h-9 sm:h-10"
        >
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
          {t.newChat}
        </Button>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto">
        {isAuthenticated ? (
          <div className="p-2">
            <p className="text-[10px] sm:text-xs text-muted-foreground px-2 py-1 uppercase tracking-wider">
              {t.history}
            </p>
            {conversations.length === 0 ? (
              <p className="text-xs sm:text-sm text-muted-foreground text-center py-6 sm:py-8">{t.noConversations}</p>
            ) : (
              <div className="space-y-1 mt-2">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`group relative flex items-center gap-2 p-2 sm:p-2.5 rounded-lg cursor-pointer transition-colors ${
                      currentConversation?.id === conv.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                    }`}
                    onClick={() => selectConversation(conv.id)}
                  >
                    <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    {editingId === conv.id ? (
                      <div className="flex-1 flex items-center gap-1">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="flex-1 bg-transparent border-b border-primary text-xs sm:text-sm focus:outline-none"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSaveEdit(conv.id)
                          }}
                          className="p-1 hover:text-green-500"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCancelEdit()
                          }}
                          className="p-1 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 text-xs sm:text-sm truncate">{conv.title}</span>
                        <div className="hidden group-hover:flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleStartEdit(conv.id, conv.title)
                            }}
                            className="p-1 hover:text-primary"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteConversation(conv.id)
                            }}
                            className="p-1 hover:text-destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 sm:p-4 text-center">
            <User className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground/50 mb-2 sm:mb-3" />
            <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">{t.loginPrompt}</p>
            <Button
              onClick={onOpenAuth}
              variant="outline"
              className="w-full bg-transparent text-xs sm:text-sm h-9 sm:h-10"
            >
              {t.login}
            </Button>
          </div>
        )}
      </div>

      {/* User footer */}
      {isAuthenticated && user && (
        <div className="p-2 sm:p-3 border-t border-border">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center text-white font-medium text-xs sm:text-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium truncate">{user.name}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} title={t.logout} className="h-8 w-8 sm:h-9 sm:w-9">
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
