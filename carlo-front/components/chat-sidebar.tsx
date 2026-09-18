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
  const { t: translate } = useLanguage()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [saving, setSaving] = useState(false)

  const t = {
    newChat: translate("chat.sidebar.newChat"), history: translate("chat.sidebar.history"), login: translate("chat.sidebar.login"), loginPrompt: translate("chat.sidebar.loginPrompt"), noConversations: translate("chat.sidebar.noConversations"), logout: translate("chat.sidebar.logout"),
  }

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
    <div className="h-full min-h-0 bg-card/95 backdrop-blur-sm border-r border-border flex flex-col w-64 max-w-[90vw]">
      <div className="p-2 sm:p-3 border-b border-border flex items-center gap-2">
        <Button disabled={loading || saving} onClick={async () => {
          if (isAuthenticated) {
            setSaving(true)
            try { if (await createConversation()) onClose?.() } finally { setSaving(false) }
          } else { onClose?.(); onOpenAuth() }
        }} className="flex-1 min-w-0 whitespace-normal bg-gradient-to-r from-primary to-amber-600 text-sm min-h-11 h-auto leading-tight">
          <Plus className="w-4 h-4 mr-2" aria-hidden="true" />{t.newChat}
        </Button>
        {onClose && <Button type="button" variant="ghost" size="icon" className="lg:hidden h-11 w-11 shrink-0" data-chat-close aria-label={translate("chat.closeHistory")} onClick={onClose}><X className="h-5 w-5" aria-hidden="true" /></Button>}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto" aria-busy={loading}>
        {loading && <p role="status" className="px-4 py-6 text-sm text-muted-foreground">{translate("common.loading")}</p>}
        {error && <p className="px-4 py-3 text-sm text-destructive">{error}</p>}
        {isAuthenticated ? <div className="p-2">
          <h2 className="text-xs text-muted-foreground px-2 py-1 uppercase tracking-wider">{t.history}</h2>
          {!loading && !error && conversations.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">{t.noConversations}</p>}
          <ul className="space-y-1 mt-2">{conversations.map((conv) => <li key={conv.id} className={`group relative flex items-center gap-2 p-2 rounded-lg ${currentConversation?.id === conv.id ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}>
            <MessageSquare className="w-4 h-4 shrink-0" aria-hidden="true" />
            {editingId === conv.id ? <form className="flex-1 flex items-center gap-1 min-w-0" onSubmit={(event) => { event.preventDefault(); void handleSaveEdit(conv.id) }}>
              <input aria-label={translate("chat.sidebar.newChat")} type="text" value={editTitle} maxLength={150} onChange={(event) => setEditTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") handleCancelEdit() }} className="flex-1 min-w-0 bg-transparent border-b border-primary text-sm" autoFocus />
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
          <Button onClick={() => { onClose?.(); onOpenAuth() }} variant="outline" className="w-full min-h-11">{t.login}</Button>
        </div>}
      </div>
      {isAuthenticated && user && <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center text-white text-sm shrink-0">{(user.name?.trim() || user.email || "?").charAt(0).toUpperCase()}</div>
          <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{user.name?.trim() || user.email}</p><p className="text-xs text-muted-foreground truncate">{user.email}</p></div>
          <Button variant="ghost" size="icon" onClick={() => { void logout() }} aria-label={t.logout}><LogOut className="w-4 h-4" aria-hidden="true" /></Button>
        </div>
      </div>}
    </div>
  )
}
