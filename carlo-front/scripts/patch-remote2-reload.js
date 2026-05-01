const fs = require("fs");

const file = "contexts/user-context.tsx";
let s = fs.readFileSync(file, "utf8");

if (s.includes("REMOTE2_RELOAD_PATCH")) {
  console.log("ℹ️ Ya está aplicado.");
  process.exit(0);
}

// busca el primer "const remote = await loadBackendConversations();"
const remoteIdx = s.indexOf("const remote = await loadBackendConversations()");
if (remoteIdx < 0) {
  console.error("❌ No encontré: const remote = await loadBackendConversations()");
  process.exit(1);
}

// busca el "} else {" después de eso
const elseIdx = s.indexOf("} else {", remoteIdx);
if (elseIdx < 0) {
  console.error('❌ No encontré el "} else {" del bloque de remote.');
  process.exit(1);
}

// desde el else, encontrar el cierre del bloque else por conteo de llaves
let i = elseIdx + "} else {".length;
let depth = 1; // ya estamos dentro del else {
while (i < s.length && depth > 0) {
  const ch = s[i];
  if (ch === "{") depth++;
  else if (ch === "}") depth--;
  i++;
}

if (depth !== 0) {
  console.error("❌ No pude balancear llaves del else block.");
  process.exit(1);
}

// i está justo DESPUÉS del '}' que cierra el else
const insertPos = i - 1; // antes del '}' final

const snippet = `
    // REMOTE2_RELOAD_PATCH
    // ✅ IMPORTANTE: vuelve a cargar del backend y pinta sidebar
    const remote2 = await loadBackendConversations();
    if (remote2) {
      setConversations(remote2);
      setCurrentConversation(remote2[0] || null);
      localStorage.setItem(LS_CURRENT, remote2[0]?.id || "");
    }
`;

s = s.slice(0, insertPos) + snippet + s.slice(insertPos);

fs.writeFileSync(file, s);
console.log("✅ Insertado remote2 reload al final del else.");
