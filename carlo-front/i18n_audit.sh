#!/usr/bin/env bash
set -euo pipefail

OUT="i18n_audit_$(date +%Y%m%d_%H%M%S).txt"
EXCL=(--exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git)

is_client() { head -n 5 "$1" 2>/dev/null | grep -q '"use client"'; }

keywords='(Oración|Oraciones|Milagros|Santos|Eucarist|Versícul|Explora|Buscar|Administr|Biograf|Mapa|Simbol|Cargando|Haz clic|Selecciona|Panel|Gestión|Acceso restringido|Bienvenido|Descubre)'

{
  echo "============================="
  echo "I18N AUDIT - $(date)"
  echo "ROOT: $(pwd)"
  echo "============================="
  echo

  echo "A) Dónde se monta LanguageProvider"
  grep -RIn "${EXCL[@]}" -E "LanguageProvider|<LanguageProvider" app 2>/dev/null || true
  echo

  echo "B) Contexto / hooks: useLanguage, setLanguage, t()"
  grep -RIn "${EXCL[@]}" -E "useLanguage\(|setLanguage\(|\bt\(" contexts components app lib 2>/dev/null | head -n 400 || true
  echo

  echo "C) Definición de idiomas: languages[], defaultLanguage"
  grep -RIn "${EXCL[@]}" -E "export const languages|defaultLanguage|LanguageCode" lib contexts components 2>/dev/null | head -n 250 || true
  echo

  echo "D) Páginas SERVER/ASYNC (probable razón de que el contenido no cambie)"
  grep -RIn "${EXCL[@]}" -E "export default async function" app 2>/dev/null | head -n 350 || true
  echo

  echo "E) Texto HARDcodeado ES (archivos SIN t() pero con texto en español)"
  while IFS= read -r f; do
    grep -qE '\bt\(' "$f" && continue
    hits="$(grep -nE "$keywords" "$f" 2>/dev/null | head -n 12 || true)"
    if [ -n "${hits:-}" ]; then
      echo "---- $f ----"
      echo "$hits"
      echo
    fi
  done < <(find app components lib contexts -type f \( -name "*.tsx" -o -name "*.ts" \) 2>/dev/null)
  echo

  echo "F) Client vs Server en app/**/page.tsx"
  while IFS= read -r p; do
    if is_client "$p"; then
      echo "client  $p"
    else
      echo "server  $p"
    fi
  done < <(find app -type f -name "page.tsx" 2>/dev/null | sort)
  echo

  echo "G) Requests y si se manda lang"
  grep -RIn "${EXCL[@]}" -E "fetch\(|axios\(|NEXT_PUBLIC_BACKEND_URL|/saints|/prayers|/miracles" app components lib 2>/dev/null | head -n 260 || true
  echo
  grep -RIn "${EXCL[@]}" -E "lang:|Accept-Language|locale|language" app components lib 2>/dev/null | head -n 260 || true
  echo

  echo "FIN"
} > "$OUT"

echo "✅ Reporte generado: $OUT"
echo "Ábrelo con: notepad $OUT"
