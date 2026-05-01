const fs = require("fs");
const file = "contexts/user-context.tsx";
let s = fs.readFileSync(file, "utf8");

function ensureUseRefImport() {
  // agrega useRef al import react si falta
  if (s.includes("useRef")) return;
  s = s.replace(
    /import\s+\{\s*([^}]+)\s*\}\s+from\s+"react"\s*/m,
    (m, inside) => {
      if (inside.includes("useRef")) return m;
      return m.replace(inside, inside.trim().replace(/\s*$/, ", useRef "));
    }
  );
}

function replaceBetween(startRe, endRe, replacement, name) {
  const start = s.search(startRe);
  if (start < 0) throw new Error(`No encontré inicio: ${name}`);
  const rest = s.slice(start);
  const endMatch = rest.match(endRe);
  if (!endMatch || typeof endMatch.index !== "number") throw new Error(`No encontré fin: ${name}`);
  const end = start + endMatch.index;
  s = s.slice(0, start) + replacement + s.slice(end);
  console.log("✅", name);
}

function insertAfter(anchorRe, insertion, name) {
  if (s.includes(insertion.trim())) {
    console.log("ℹ️ Ya estaba:", name);
    return;
  }
  if (!anchorRe.test(s)) throw new Error(`No encontré anchor: ${name}`);
  s = s.replace(anchorRe, (m) => m + insertion);
  console.log("✅ Inserté:", name);
}

// 0) importa useRef si falta
ensureUseRefImport();

// 1) Inserta helpers remotos después de los states de conversations/currentConversation
insertAfter(
  /const\s+\[currentConversation,\s*setCurrentConversation\]\s*=\s*useState<Conversation\s*\|\s*null>\(null\)\s*\n/,
  `
  // -------- Remote Conversations (Postgres) --------
  const loadedConvRef = useRef<Record<string, boolean>>({});
  const persistedCountRef = useRef<Record<string, number>>({});

  const isAuthed = !!user;

  const loadRemoteConversations = async () => {
    try {
      const r = await fetch(API + "/conversations", { credentials: "include" });
      if (!r.ok) return;
      const data = await r.json();
      const list = (data?.conversations || []).map((c: any) => ({ ...c, messages: [] })) as any[];
      setConversations(list as any);
      // no fijamos current aquí (lo maneja UI); marcamos que aún no cargamos mensajes
      loadedConvRef.current = {};
      persistedCountRef.current = {};
    } catch {}
  };

  // cuando el usuario existe, trae conversaciones reales
  useEffect(() => {
    if (!isAuthed) return;
    loadRemoteConversations();
  }, [isAuthed]);

  // cuando cambias de conversación, carga sus mensajes desde backend UNA vez
  useEffect(() => {
    if (!isAuthed) return;
    const id = (currentConversation as any)?.id as string | undefined;
    if (!id) return;
    if (id.startsWith("temp_")) return;
    if (loadedConvRef.current[id]) return;

    (async () => {
      try {
        const r = await fetch(API + "/conversations/" + id, { credentials: "include" });
        if (!r.ok) return;
        const data = await r.json();
        const conv = data?.conversation;
        if (!conv) return;

        loadedConvRef.current[id] = true;
        persistedCountRef.current[id] = (conv.messages?.length || 0);

        setCurrentConversation(conv as any);
        setConversations((prev) =>
          prev.map((c: any) => (c.id === id ? { ...c, ...conv } : c))
        );
      } catch {}
    })();
  }, [isAuthed, (currentConversation as any)?.id]);

  // persiste mensajes nuevos hacia backend (solo cuando ya conocemos persistedCountRef[id])
  useEffect(() => {
    if (!isAuthed) return;
    const conv: any = currentConversation as any;
    if (!conv?.id || conv.id.startsWith("temp_")) return;
    const id = String(conv.id);
    const msgs: any[] = Array.isArray(conv.messages) ? conv.messages : [];
    if (persistedCountRef.current[id] === undefined) return;

    const prevCount = persistedCountRef.current[id] || 0;
    if (msgs.length <= prevCount) return;

    const toSend = msgs.slice(prevCount);
    (async () => {
      for (const m of toSend) {
        const role = String(m.role || "");
        const content = String(m.content || "");
        if (!role || !content) continue;
        try {
          const r = await fetch(API + "/conversations/" + id + "/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ role, content }),
          });
          if (r.ok) {
            persistedCountRef.current[id] = (persistedCountRef.current[id] || 0) + 1;
          }
        } catch {}
      }
    })();
  }, [isAuthed, (currentConversation as any)?.id, (currentConversation as any)?.messages?.length]);
`,
  "remote conv helpers"
);

// 2) Evita que localStorage “pise” cuando hay usuario (solo guarda local si NO hay user)
s = s.replace(
  /useEffect\(\(\)\s*=>\s*\{\s*\n\s*localStorage\.setItem\("catholic_conversations"/m,
  'useEffect(() => {\n    if (user) return;\n    localStorage.setItem("catholic_conversations"'
);

// 3) Reemplaza createConversation() completo por versión optimista + backend
replaceBetween(
  /const\s+createConversation\s*=\s*\(\)\s*:\s*Conversation\s*=>\s*\{\s*\n/m,
  /\n\s*const\s+deleteConversation\s*=\s*\(/m,
`const createConversation = (): Conversation => {
    const tempId = "temp_" + Date.now();
    const now = new Date();

    const newConversation: any = {
      id: tempId,
      title: "Nuevo chat",
      messages: [],
      createdAt: now,
      updatedAt: now,
    };

    setConversations((prev) => [newConversation, ...prev] as any);
    setCurrentConversation(newConversation);

    // si hay usuario, crea en backend y reemplaza tempId -> realId
    if (user) {
      fetch(API + "/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: newConversation.title }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          const real = data?.conversation;
          if (!real?.id) return;

          // marca como cargada y lista para persistir mensajes
          loadedConvRef.current[real.id] = true;
          persistedCountRef.current[real.id] = 0;

          setConversations((prev: any) =>
            prev.map((c: any) => (c.id === tempId ? { ...c, ...real } : c))
          );
          setCurrentConversation((prev: any) => (prev?.id === tempId ? { ...prev, ...real } : prev));

          // limpia refs del temp
          delete loadedConvRef.current[tempId];
          delete persistedCountRef.current[tempId];
        })
        .catch(() => {});
    }

    return newConversation as Conversation;
  }

`,
  "createConversation() remote"
);

// 4) Reemplaza deleteConversation() para borrar en backend si hay user
replaceBetween(
  /const\s+deleteConversation\s*=\s*\(\s*id:\s*string\s*\)\s*=>\s*\{\s*\n/m,
  /\n\s*const\s+/m,
`const deleteConversation = (id: string) => {
    if (user && id && !id.startsWith("temp_")) {
      fetch(API + "/conversations/" + id, {
        method: "DELETE",
        credentials: "include",
      }).catch(() => {});
    }

    setConversations((prev) => prev.filter((c) => (c as any).id !== id) as any);

    if ((currentConversation as any)?.id === id) {
      setCurrentConversation(null);
    }

    // limpia refs
    delete loadedConvRef.current[id];
    delete persistedCountRef.current[id];
  }

`,
  "deleteConversation() remote"
);

fs.writeFileSync(file, s);
console.log("��� Patch remote conversaciones listo:", file);
