#!/usr/bin/env bash
set -euo pipefail

OUT="i18n_deep_trace_$(date +%Y%m%d_%H%M%S).txt"
EXCL=(--exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git)

is_client () { head -n 3 "$1" 2>/dev/null | grep -q '"use client"'; }

{
  echo "============================="
  echo "I18N DEEP TRACE - $(date)"
  echo "ROOT: $(pwd)"
  echo "============================="
  echo

  echo "A) DÓNDE ESTÁN LAS TRADUCCIONES (keys)"
  grep -RIn "${EXCL[@]}" \
    -E 'export const translations|TranslationKey|LanguageCode|selectLanguage|defaultLanguage|export const languages' \
    lib 2>/dev/null | head -n 260 || true
  echo

  echo "B) CONTEXTO: LanguageProvider / useLanguage / t()"
  grep -RIn "${EXCL[@]}" \
    -E 'LanguageProvider|useLanguage\(|\bt\(|setLanguage\(' \
    app components contexts lib 2>/dev/null | head -n 320 || true
  echo

  echo "C) PÁGINAS SERVER/ASYNC (NO reaccionan al state del idioma)"
  grep -RIn "${EXCL[@]}" \
    -E 'export default async function' app 2>/dev/null | head -n 260 || true
  echo

  echo "D) HARD-CODED ES sin t() (culpables del contenido que no cambia)"
  keywords='(Oración|Oraciones|Milagros|Santos|Eucarist|Versícul|Explora|Buscar|Administr|Biograf|Mapa|Simbol|Cargando|Haz clic|Selecciona|Bienvenido|Descubre)'
  while IFS= read -r f; do
    grep -qE '\bt\(' "$f" && continue
    hits="$(grep -nE "$keywords" "$f" 2>/dev/null | head -n 10 || true)"
    if [ -n "${hits:-}" ]; then
      echo "---- $f ----"
      echo "$hits"
      echo
    fi
  done < <(find app components lib contexts -type f \( -name "*.tsx" -o -name "*.ts" \) 2>/dev/null)
  echo

  echo "E) ¿Estas páginas son client o server?"
  for f in app/mapa/page.tsx app/eucaristia/page.tsx app/milagros/page.tsx app/simbolos/page.tsx app/versiculos/page.tsx app/oraciones/page.tsx app/santos/page.tsx; do
    [ -f "$f" ] || continue
    if is_client "$f"; then
      echo "CLIENT - $f"
    else
      echo "SERVER - $f"
    fi
  done
  echo

  echo "F) Fuentes de contenido (fetch/axios/data files)"
  grep -RIn "${EXCL[@]}" \
    -E 'fetch\(|axios\(|/saints|/miracles|/prayers|lib/.*data|prayers-data|saints-data|scripture-data|NEXT_PUBLIC_BACKEND_URL' \
    app components lib contexts 2>/dev/null | head -n 320 || true
  echo

} > "$OUT"

echo "✅ Listo: $OUT"
echo "Ábrelo con: notepad $OUT"
