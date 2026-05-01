"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

// En el browser SIEMPRE relativo (evita CORS). Vercel rewrites lo manda al backend.
const API = "";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

const LS_USER = "catholic_user";
const LS_CONVS = "catholic_conversations";
const LS_CURRENT = "catholic_current_conversation";

const RETENTION_DAYS = 90;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

function pruneConversations(convs: Conversation[]): Conversation[] {
  const cutoff = Date.now() - RETENTION_MS;
  return convs.filter((c) => new Date(c.updatedAt).getTime() >= cutoff);
}

function genId() {
  const c: any = typeof crypto !== "undefined" ? crypto : null;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function reviveConversation(raw: any): Conversation {
  return {
    id: String(raw.id),
    title: String(raw.title || "Nueva conversación"),
    messages: Array.isArray(raw.messages)
      ? raw.messages.map((m: any) => ({
          id: String(m.id || genId()),
          role: m.role === "assistant" ? "assistant" : "user",
          content: String(m.content || ""),
          timestamp: new Date(m.timestamp || m.createdAt || Date.now()),
        }))
      : [],
    createdAt: new Date(raw.createdAt || Date.now()),
    updatedAt: new Date(raw.updatedAt || Date.now()),
  };
}

interface UserContextType {
  user: User | null;
  isAuthenticated: boolean;
  conversations: Conversation[];
  currentConversation: Conversation | null;

  login: (email: string, password: string, _name?: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;

  createConversation: () => Conversation;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  updateConversation: (id: string, messages: ChatMessage[]) => void;
  renameConversation: (id: string, title: string) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);

  const isAuthenticated = !!user;

  // --- helpers backend ---
  async function fetchJSON(path: string, init?: RequestInit) {
    const url = /^https?:\/\//.test(path) ? path : API + (path.startsWith("/") ? path : `/${path}`);

    const r = await fetch(url, {
      ...init,
      credentials: "include",
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers || {}),
      },
    });

    const json = await r.json().catch(() => ({} as any));
    return { r, json };
  }

  async function loadBackendConversations() {
    const { r, json } = await fetchJSON("/conversations", { method: "GET" });
    if (!r.ok) return null;

    const list = (json?.conversations || []).map((c: any) => ({
      ...reviveConversation({ ...c, messages: [] }),
      messages: [],
    })) as Conversation[];

    return list;
  }

  async function loadBackendMessages(convId: string) {
    const { r, json } = await fetchJSON(`/conversations/${convId}/messages`, { method: "GET" });
    if (!r.ok) return null;

    const msgs = (json?.messages || []).map((m: any) => ({
      id: String(m.id || genId()),
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content || ""),
      timestamp: new Date(m.createdAt || Date.now()),
    })) as ChatMessage[];

    return msgs;
  }

  async function ensureBackendConversation(conv: Conversation) {
    if (!isAuthenticated) return;
    await fetchJSON("/conversations", {
      method: "POST",
      body: JSON.stringify({ id: conv.id, title: conv.title }),
    });
  }

  async function persistNewMessagesToBackend(conv: Conversation, prevLen: number, nextMsgs: ChatMessage[]) {
    if (!isAuthenticated) return;

    await ensureBackendConversation(conv);

    const appended = nextMsgs.slice(prevLen);
    for (const m of appended) {
      await fetchJSON(`/conversations/${conv.id}/messages`, {
        method: "POST",
        body: JSON.stringify({
          role: m.role,
          content: m.content,
          title: conv.title,
        }),
      });
    }
  }

  // --- hydrate local + backend session ---
  useEffect(() => {
    // local first
    try {
      const savedUser = localStorage.getItem(LS_USER);
      const savedConversations = localStorage.getItem(LS_CONVS);
      const savedCurrentId = localStorage.getItem(LS_CURRENT);

      if (savedUser) setUser(JSON.parse(savedUser));
      if (savedConversations) {
        const convs = pruneConversations(JSON.parse(savedConversations).map(reviveConversation));
        setConversations(convs);

        const current = convs.find((c) => c.id === savedCurrentId) || convs[0] || null;
        setCurrentConversation(current);
      }
    } catch {
      // ignore
    }

    // backend session (cookie)
    (async () => {
      const { r, json } = await fetchJSON("/auth/me", { method: "GET" });

      // ✅ 401 = normal (no logueado). No rompas la app.
      if (r.status === 401) {
        setUser(null);
        return;
      }

      if (!r.ok) {
        // fallo raro, pero no tumbar UI
        return;
      }

      if (json?.user) {
        setUser(json.user);

        const remote = await loadBackendConversations();
        if (remote && remote.length > 0) {
          setConversations(remote);
          setCurrentConversation(remote[0] || null);
          localStorage.setItem(LS_CURRENT, remote[0]?.id || "");
          return;
        }

        // si no hay convs remotas, subimos locales best-effort
        const local = (() => {
          try {
            const raw = localStorage.getItem(LS_CONVS);
            if (!raw) return [];
            return pruneConversations(JSON.parse(raw).map(reviveConversation));
          } catch {
            return [];
          }
        })();

        for (const c of local) {
          await ensureBackendConversation(c);
          for (const m of c.messages) {
            await fetchJSON(`/conversations/${c.id}/messages`, {
              method: "POST",
              body: JSON.stringify({ role: m.role, content: m.content, title: c.title }),
            });
          }
        }

        // recarga para pintar sidebar
        const remote2 = await loadBackendConversations();
        if (remote2) {
          setConversations(remote2);
          setCurrentConversation(remote2[0] || null);
          localStorage.setItem(LS_CURRENT, remote2[0]?.id || "");
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // persist local
  useEffect(() => {
    try {
      if (user) localStorage.setItem(LS_USER, JSON.stringify(user));
      else localStorage.removeItem(LS_USER);
    } catch {}
  }, [user]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_CONVS, JSON.stringify(conversations));
    } catch {}
  }, [conversations]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_CURRENT, currentConversation?.id || "");
    } catch {}
  }, [currentConversation?.id]);

  // --- auth actions ---
  const login = async (email: string, password: string): Promise<boolean> => {
    const { r, json } = await fetchJSON("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (!r.ok) return false;

    setUser(json?.user || null);

    const remote = await loadBackendConversations();
    if (remote) {
      setConversations(remote);
      setCurrentConversation(remote[0] || null);
    }

    return true;
  };

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    const { r, json } = await fetchJSON("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });

    if (!r.ok) return false;

    setUser(json?.user || null);

    const remote = await loadBackendConversations();
    if (remote) {
      setConversations(remote);
      setCurrentConversation(remote[0] || null);
    }

    return true;
  };

  const logout = () => {
    fetch("/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
    setUser(null);
    setConversations([]);
    setCurrentConversation(null);
    try {
      localStorage.removeItem(LS_USER);
      localStorage.removeItem(LS_CONVS);
      localStorage.removeItem(LS_CURRENT);
    } catch {}
  };

  // --- conversations actions ---
  const createConversation = (): Conversation => {
    const now = new Date();
    const newConversation: Conversation = {
      id: genId(),
      title: "Nueva conversación",
      messages: [],
      createdAt: now,
      updatedAt: now,
    };

    setConversations((prev) => [newConversation, ...prev]);
    setCurrentConversation(newConversation);

    if (isAuthenticated) void ensureBackendConversation(newConversation);

    return newConversation;
  };

  const selectConversation = (id: string) => {
    const conv = conversations.find((c) => c.id === id);
    if (!conv) return;

    setCurrentConversation(conv);

    if (isAuthenticated) {
      void (async () => {
        const msgs = await loadBackendMessages(id);
        if (!msgs) return;

        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, messages: msgs, updatedAt: new Date() } : c))
        );

        setCurrentConversation((prev) => (prev?.id === id ? { ...prev, messages: msgs } : prev));
      })();
    }
  };

  const deleteConversation = (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (currentConversation?.id === id) setCurrentConversation(null);

    if (isAuthenticated) {
      void fetchJSON(`/conversations/${id}`, { method: "DELETE" });
    }
  };

  const updateConversation = (id: string, messages: ChatMessage[]) => {
    let prevLen = 0;
    const convSnapshot = conversations.find((c) => c.id === id);
    if (convSnapshot) prevLen = convSnapshot.messages.length;

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const title = (messages[0]?.content?.slice(0, 30) + "…") || c.title || "Nueva conversación";
        return { ...c, messages, title, updatedAt: new Date() };
      })
    );

    if (currentConversation?.id === id) {
      setCurrentConversation((prev) => (prev ? { ...prev, messages, updatedAt: new Date() } : null));
    }

    if (isAuthenticated) {
      const conv = convSnapshot || currentConversation;
      if (conv) {
        const nextConv: Conversation = {
          ...conv,
          messages,
          title: (messages[0]?.content?.slice(0, 30) + "…") || conv.title,
          updatedAt: new Date(),
        };
        void persistNewMessagesToBackend(nextConv, prevLen, messages);
      }
    }
  };

  const renameConversation = (id: string, title: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title, updatedAt: new Date() } : c))
    );

    if (currentConversation?.id === id) {
      setCurrentConversation((prev) => (prev ? { ...prev, title } : null));
    }

    if (isAuthenticated) {
      void fetchJSON(`/conversations/${id}`, { method: "PATCH", body: JSON.stringify({ title }) });
    }
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      conversations,
      currentConversation,
      login,
      register,
      logout,
      createConversation,
      selectConversation,
      deleteConversation,
      updateConversation,
      renameConversation,
    }),
    [user, isAuthenticated, conversations, currentConversation]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used within a UserProvider");
  return context;
}
