const fs = require("fs");

const file = "contexts/user-context.tsx";
let s = fs.readFileSync(file, "utf8");

// 1) asegúrate de que exista const API =
if (!/const\s+API\s*=/.test(s)) {
  // intenta insertarlo después de imports
  s = s.replace(
    /("use client"\s*\n[\s\S]*?import[\s\S]*?\n)\n/,
    `$1\nconst API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";\n\n`
  );
}

// 2) reemplazos de rutas conversations para que usen API
s = s.replace(/fetchJSON\(\s*"\/*conversations/g, 'fetchJSON(API + "/conversations');
s = s.replace(/fetchJSON\(\s*`\/conversations/g, 'fetchJSON(`${API}/conversations');

// 3) (opcional pero útil) marca que ya fue parchado
if (!s.includes("CONVERSATIONS_API_PATCH")) {
  s = s.replace(/const\s+API\s*=\s*.*\n/, (m)=> m + `// CONVERSATIONS_API_PATCH\n`);
}

fs.writeFileSync(file, s);
console.log("✅ Parcheado: conversations ahora usa API (backend).");
