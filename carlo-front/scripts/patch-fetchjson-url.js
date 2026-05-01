const fs = require("fs");

const file = "contexts/user-context.tsx";
let s = fs.readFileSync(file, "utf8");

// Si ya está parchado, salimos
if (s.includes("const url = /^https?:\\/\\//.test(path) ? path : API + path;")) {
  console.log("ℹ️ fetchJSON ya está parchado.");
  process.exit(0);
}

// 1) Insertar la línea const url... justo después de la firma de fetchJSON
const sigRe = /async function\s+fetchJSON\s*\(\s*path:\s*string\s*,\s*init\??:\s*RequestInit\s*\)\s*\{\s*\n/;
if (!sigRe.test(s)) {
  console.error("❌ No encontré la firma de fetchJSON(path: string, init?: RequestInit)");
  process.exit(1);
}

s = s.replace(sigRe, (m) => {
  return m + `    const url = /^https?:\\/\\//.test(path) ? path : API + path;\n`;
});

// 2) Cambiar SOLO el primer fetch(API + path, ...) por fetch(url, ...)
const before = s;
s = s.replace(/fetch\s*\(\s*API\s*\+\s*path\s*,/m, "fetch(url,");
if (s === before) {
  console.error("❌ No pude reemplazar fetch(API + path, ...) dentro de fetchJSON");
  process.exit(1);
}

fs.writeFileSync(file, s, "utf8");
console.log("✅ fetchJSON parchado: ahora soporta URL completa o path relativo.");
