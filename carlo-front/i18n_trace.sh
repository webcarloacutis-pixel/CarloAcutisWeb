#!/usr/bin/env bash
set -euo pipefail

OUT="i18n_trace_$(date +%Y%m%d_%H%M%S).txt"
EXCL=(--exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git)

{
  echo "============================="
  echo "I18N TRACE - $(date)"
  echo "ROOT: $(pwd)"
  echo "============================="
  echo

  echo "0) Archivos base i18n"
  ls -la lib/i18n.ts lib/translations.ts contexts/language-context.tsx components/language-selector.tsx app/layout.tsx 2>/dev/null || true
  echo

  echo "1) Dónde se monta LanguageProvider"
  grep -RIn "${EXCL[@]}" -E "<LanguageProvider|LanguageProvider\(" app 2>/dev/null || true
  echo

  echo "2) Componentes/páginas que SÍ usan i18n (useLanguage / t())"
  grep -RIn "${EXCL[@]}" -E "useLanguage\(|\bt\(" app components contexts lib 2>/dev/null | head -n 300 || true
  echo

  echo "3) Páginas server (async) (si tienen texto fijo, no cambia con selector)"
  grep -RIn "${EXCL[@]}" -E "export default async function" app 2>/dev/null | head -n 200 || true
  echo

  echo "4) Texto HARDcodeado (archivos SIN t() pero con palabras ES típicas)"
  keywords='(Oración|Oraciones|Milagros|Santos|Eucarist|Versícul|Explora|Buscar|Administr|Biograf|Mapa|Simbol|Cargando|Haz clic|Selecciona)'
  while IFS= read -r f; do
    grep -qE '\bt\(' "$f" && continue
    hits="$(grep -nE "$keywords" "$f" 2>/dev/null | head -n 8 || true)"
    if [ -n "${hits:-}" ]; then
      echo "---- $f ----"
      echo "$hits"
      echo
    fi
  done < <(find app components lib contexts -type f \( -name "*.tsx" -o -name "*.ts" \) 2>/dev/null)
  echo

  echo "5) Páginas candidatas (primeras 120 líneas)"
  for p in app/mapa/page.tsx app/milagros/page.tsx app/simbolos/page.tsx app/descubre-tu-santo/page.tsx; do
    if [ -f "$p" ]; then
      echo "----- $p -----"
      nl -ba "$p" | sed -n '1,120p'
      echo
    fi
  done

} > "$OUT"

echo "✅ Listo: $OUT"
echo "Ábrelo con: notepad $OUT"
