#!/usr/bin/env bash
set -euo pipefail
EXCL=(--exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git)

echo "=== 1) Archivos de DATA en lib/ (probable contenido fijo) ==="
ls -la lib/*data*.ts lib/*utils*.ts 2>/dev/null || true
echo

echo "=== 2) ¿Quién importa saints-data / prayers-data / scripture-data? ==="
grep -RIn "${EXCL[@]}" -E 'from "@/lib/(saints-data|prayers-data|scripture-data)"|from "\.\/(saints-data|prayers-data|scripture-data)"' app components lib 2>/dev/null | head -n 200 || true
echo

echo "=== 3) ¿Dónde hay textos largos hardcodeados en páginas? (sin t()) ==="
keywords='(Señor|Dios|Amén|Santo|Santa|Oración|Milagro|Eucarist|Versícul|Evangelio|Bienvenido|Descubre|Haz clic|Selecciona)'
while IFS= read -r f; do
  grep -qE '\bt\(' "$f" && continue
  if grep -qE "$keywords" "$f" 2>/dev/null; then
    echo "---- $f ----"
    grep -nE "$keywords" "$f" 2>/dev/null | head -n 25 || true
    echo
  fi
done < <(find app components -type f \( -name "*.tsx" -o -name "*.ts" \) 2>/dev/null)
echo

echo "=== 4) Páginas async (server) que NO reaccionan al state del idioma ==="
grep -RIn "${EXCL[@]}" -E 'export default async function' app 2>/dev/null | head -n 220 || true
echo

echo "=== FIN ==="
