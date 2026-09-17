# Compilación independiente del frontend

## Causa de TS2307 en el commit 20e60d9

La cadena exacta era:

```text
carlo-front/package.json: typecheck → next typegen && tsc --noEmit
carlo-front/tsconfig.json: include **/*.ts
└─ carlo-front/lib/chat-language.test.ts:5
   └─ ../../carlo-back/src/lib/chat-language.ts:1
      └─ ./errors.ts:2
         └─ import type { ErrorRequestHandler } from "express"
```

Aunque el import de Express es de tipos, TypeScript debe resolverlo. La instalación previa que tenía dependencias en ambos proyectos ocultó el problema. Render instala solo `carlo-front`, por lo que `carlo-back/src/lib/errors.ts` no encuentra Express ni sus tipos.

El fallo se reprodujo exportando ese commit a una carpeta temporal, usando Node **24.21.0**, caché npm vacía y únicamente `npm ci --include=dev` dentro de `carlo-front`. La instalación pasó y el typecheck devolvió exactamente `../carlo-back/src/lib/errors.ts(2,42): error TS2307`.

## Corrección

- `carlo-front/lib/chat-language.test.ts` comprueba los 15 idiomas de la interfaz y la integridad de sus traducciones, sin importar código del servidor.
- `carlo-back/tests/contracts/chat-language.test.ts` conserva la comparación de códigos entre proyectos, las 15 instrucciones del servidor y los cinco rechazos de entradas inválidas. Vitest las descubre en el entorno del backend.
- `carlo-back/tsconfig.contracts.json` comprueba los tipos del contrato entre proyectos. Es una configuración explícita para esas pruebas; no modifica la configuración de producción ni oculta archivos del frontend.
- `carlo-front/scripts/check-independent.mjs` y el script npm `check:independent` reproducen la instalación y compilación aisladas y comprueban que ningún archivo de `carlo-back` aparece en el grafo de dependencias TypeScript del frontend.

No cambian dependencias, lockfiles, comportamiento de la aplicación, variables de Render, base de datos ni certificados. Express sigue perteneciendo al backend.

## Comprobación reproducible

Requisitos: Node 24.21.0, npm y Git. Desde `carlo-front`:

```sh
npm run check:independent
```

El comando copia únicamente los archivos versionados del checkout actual (incluidas modificaciones de trabajo; los archivos nuevos deben estar añadidos a Git) a una carpeta temporal, sin `.next`, `node_modules` ni archivos privados ignorados. Usa una caché npm vacía y ejecuta, secuencialmente desde el frontend copiado:

```sh
npm ci --include=dev
npm run typecheck
npm run lint
NODE_ENV=test npm test
npm run build
```

En Windows, el script configura `NODE_ENV=test` directamente en el entorno del proceso de pruebas; no usa sintaxis de shell de Unix. Inspecciona el grafo real de TypeScript después del typecheck y falla si incorpora fuentes del backend. Conserva la carpeta temporal y `result.json` para inspección; no modifica la instalación original. El build utiliza una URL de backend local sin servicio y no necesita credenciales ni conectar a Supabase.

Para las pruebas del contrato, en una instalación separada con **solo dependencias del backend**, desde `carlo-back`:

```sh
npm ci --include=dev
npm exec -- tsc --project tsconfig.contracts.json
npm exec -- eslint tests/contracts/chat-language.test.ts
npm exec -- vitest run tests/contracts/chat-language.test.ts src/routes/ai-chat.test.ts
```

El código fuente del frontend debe estar presente para comparar el contrato; sus dependencias no son necesarias. La suite normal `npm test` del backend también descubre las nuevas pruebas. Esta comprobación específica no conecta a bases de datos.

## Resultado de la verificación

Verificado el 17 de septiembre de 2026 en Windows con Node 24.21.0:

- Cadena completa de instalación, typecheck, lint, pruebas y build independiente: **PASS**. No se instalaron dependencias del backend ni quedaron fuentes suyas en el grafo TypeScript del frontend.
- Frontend: **102 pruebas PASS**. Lint conserva una advertencia preexistente en `admin-saints-modal.tsx`, sin errores.
- Contrato de idiomas y ruta de chat en otra instalación con solo dependencias del backend: **31 pruebas PASS**, además de typecheck y lint del contrato.
- Navegador sobre la compilación independiente: **18 casos PASS** de chat/idiomas en Chromium escritorio y Android emulado; **1 caso PASS** del formulario administrativo, recarga y logout con API sintética local. No se usa Supabase ni se crean cuentas.

Los rechazos de idioma y las instrucciones del servidor ahora se ejecutan en el backend; no se eliminó su cobertura para reducir el total del frontend.

## Despliegue posterior

Para corregir **este fallo de compilación basta con redesplegar el frontend** desde el nuevo `main`, manteniendo Root Directory `carlo-front` y el Build Command existente. No requiere cambios de backend, base de datos ni variables. El funcionamiento del login administrativo depende además de que el backend ya ejecute la versión con acceso por cuenta publicada previamente. Esta reparación no invoca despliegues.
