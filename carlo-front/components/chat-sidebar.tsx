"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useUser } from "@/contexts/user-context"
import { useLanguage } from "@/contexts/language-context"
import { Plus, MessageSquare, Trash2, Edit3, Check, X, LogOut, User } from "lucide-react"

interface ChatSidebarProps {
  onOpenAuth: () => void
  onClose?: () => void
}

export function ChatSidebar({ onOpenAuth, onClose }: ChatSidebarProps) {
  const {
    user,
    isAuthenticated,
    loading,
    error,
    conversations,
    currentConversation,
    createConversation,
    selectConversation,
    deleteConversation,
    renameConversation,
    logout,

  } = useUser()
  const { language, t: translate } = useLanguage()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [saving, setSaving] = useState(false)

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

  const handleSaveEdit = async (id: string) => {
    if (!editTitle.trim() || saving) return
    setSaving(true)
    try {
      if (await renameConversation(id, editTitle.trim())) { setEditingId(null); setEditTitle("") }
    } finally { setSaving(false) }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditTitle("")
  }

  return (
    <div className="h-full bg-card/95 backdrop-blur-sm border-r border-border flex flex-col w-[280px] sm:w-72 max-w-[90vw]">
      <div className="p-2 sm:p-3 border-b border-border flex items-center gap-2">
        <Button disabled={loading || saving} onClick={async () => {
          if (isAuthenticated) {
            setSaving(true)
            try { if (await createConversation()) onClose?.() } finally { setSaving(false) }
          } else { onClose?.(); onOpenAuth() }
        }} className="flex-1 bg-gradient-to-r from-primary to-amber-600 text-xs sm:text-sm h-10">
          <Plus className="w-4 h-4 mr-2" aria-hidden="true" />{t.newChat}
        </Button>
        {onClose && <Button type="button" variant="ghost" size="icon" className="lg:hidden shrink-0" aria-label="Cerrar historial" onClick={onClose}><X className="h-5 w-5" aria-hidden="true" /></Button>}
      </div>
      <div className="flex-1 overflow-y-auto" aria-busy={loading}>
        {loading && <p role="status" className="px-4 py-6 text-sm text-muted-foreground">{translate("common.loading")}</p>}
        {error && <p className="px-4 py-3 text-sm text-destructive">{error}</p>}
        {isAuthenticated ? <div className="p-2">
          <h2 className="text-xs text-muted-foreground px-2 py-1 uppercase tracking-wider">{t.history}</h2>
          {!loading && !error && conversations.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">{t.noConversations}</p>}
          <ul className="space-y-1 mt-2">{conversations.map((conv) => <li key={conv.id} className={`group relative flex items-center gap-2 p-2 rounded-lg ${currentConversation?.id === conv.id ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}>
            <MessageSquare className="w-4 h-4 shrink-0" aria-hidden="true" />
            {editingId === conv.id ? <form className="flex-1 flex items-center gap-1 min-w-0" onSubmit={(event) => { event.preventDefault(); void handleSaveEdit(conv.id) }}>
              <input aria-label="Título de la conversación" type="text" value={editTitle} maxLength={150} onChange={(event) => setEditTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") handleCancelEdit() }} className="flex-1 min-w-0 bg-transparent border-b border-primary text-sm" autoFocus />
              <Button type="submit" variant="ghost" size="icon" aria-label={translate("common.save")} disabled={saving || !editTitle.trim()}><Check className="h-4 w-4" aria-hidden="true" /></Button>
              <Button type="button" variant="ghost" size="icon" aria-label={translate("common.cancel")} onClick={handleCancelEdit} disabled={saving}><X className="h-4 w-4" aria-hidden="true" /></Button>
            </form> : <>
              <button type="button" aria-current={currentConversation?.id === conv.id ? "true" : undefined} className="flex-1 min-w-0 text-left text-sm truncate py-2 focus-visible:outline focus-visible:outline-2" onClick={() => { void selectConversation(conv.id); onClose?.() }}>{conv.title || t.newChat}</button>
              <div className="flex items-center shrink-0">
                <Button type="button" size="icon" variant="ghost" className="h-9 w-9" aria-label={translate("common.edit") + ": " + conv.title} onClick={() => handleStartEdit(conv.id, conv.title)} disabled={loading || saving}><Edit3 className="h-4 w-4" aria-hidden="true" /></Button>
                <Button type="button" size="icon" variant="ghost" className="h-9 w-9" aria-label={translate("common.delete") + ": " + conv.title} onClick={async () => { setSaving(true); try { await deleteConversation(conv.id) } finally { setSaving(false) } }} disabled={loading || saving}><Trash2 className="h-4 w-4" aria-hidden="true" /></Button>
              </div>
            </>}
          </li>)}</ul>
        </div> : !loading && <div className="p-4 text-center">
          <User className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" aria-hidden="true" /><p className="text-sm text-muted-foreground mb-4">{t.loginPrompt}</p>
          <Button onClick={() => { onClose?.(); onOpenAuth() }} variant="outline" className="w-full">{t.login}</Button>
        </div>}
      </div>
      {isAuthenticated && user && <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center text-white text-sm shrink-0">{(user.name?.trim() || user.email || "?").charAt(0).toUpperCase()}</div>
          <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{user.name?.trim() || "Cuenta"}</p><p className="text-xs text-muted-foreground truncate">{user.email}</p></div>
          <Button variant="ghost" size="icon" onClick={() => { void logout() }} aria-label={t.logout}><LogOut className="w-4 h-4" aria-hidden="true" /></Button>
        </div>
      </div>}
    </div>
  )
}
