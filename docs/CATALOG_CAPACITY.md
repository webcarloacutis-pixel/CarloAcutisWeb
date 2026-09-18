# Catálogo: 3000 santos y 3000 milagros

## Contrato y límites

- Capacidad independiente: 3000 `Saint` y 3000 `Miracle`, incluidos milagros pendientes.
- `GET /saints`, `/miracles`, `/miracles/all`, `/saints/:id/miracles` y `/saints/:id/miracles/all`: `limit` entre 1 y 100, predeterminado 100.
- Respuesta: `{ items, total, nextCursor, hasMore, revision }`. También se mantienen `X-Total-Count` y `X-Next-Cursor`.
- Enviar el cursor opaco recibido en `cursor`. Orden estable por ID, consulta por ID mayor que el último recibido, sin offset. Cada página usa una transacción con snapshot consistente.
- La revisión detecta altas, bajas y ediciones entre páginas. HTTP 409 `CATALOG_CHANGED` exige reiniciar la lectura; el cliente muestra error/reintento y nunca entrega una colección parcial como completa. Un cursor no se puede reutilizar entre vistas, relaciones o permisos.
- `/saints?view=listing` excluye los campos editoriales grandes que no usa el listado, pero conserva toda la biografía para búsqueda. `view=names` contiene solo ID, nombre y slug para los selectores. El detalle individual conserva todos los campos.
- Creación número 3001: HTTP 409 `SAINT_LIMIT_REACHED` o `MIRACLE_LIMIT_REACHED`, con `limit: 3000` y mensaje claro. Se permiten lecturas, ediciones y borrados a capacidad. Los GET no truncan una colección preexistente superior al límite.
- Comprobación e inserción comparten una transacción y un bloqueo consultivo de PostgreSQL por entidad. Todos los creadores de la aplicación y el importador usan esta misma reserva; varias instancias del backend comparten el bloqueo. No se añade un trigger: escrituras SQL directas fuera de la aplicación deben respetar el límite por separado.

## Cliente y renderizado

El recolector central hace peticiones secuenciales de 100; los milagros pueden cargar simultáneamente dos colecciones, cada una secuencial. Valida totales, revisión, cursores y progreso, cancela al desmontar y deduplica por ID. Acepta además el formato antiguo de arrays con cabeceras para facilitar el despliegue escalonado.

Listados públicos, administrador y relaciones muestran 12 fichas por página. El mapa muestra 20 enlaces por página y usa Canvas cuando hay más de 200 ubicaciones, con popups creados al abrirse y paginados a 20. Los filtros trabajan sobre la colección completa y no descargan otra vez al cambiar de filtro. El administrador carga la ficha completa al abrir su editor; las estadísticas consultan únicamente una fila y el total.

Las páginas de santos, mapa y administrador envían una estructura inicial pequeña y el navegador recupera las páginas API. No se insertan 3000 fichas en HTML ni en el DOM. Los selectores nativos de santos contienen los 3000 nombres; no montan 3000 tarjetas ni opciones de un menú personalizado.

## Verificación reproducible, exclusivamente local

Node 24, PostgreSQL local en `127.0.0.1:55439`. Crear una base **vacía y desechable** llamada exactamente `acutis_catalog_capacity_test`; suministrar su conexión por una variable de entorno privada `DATABASE_URL`. No usar una conexión a Supabase ni al catálogo editorial. Las pruebas y fixtures validan host, puerto y nombre antes de escribir.

En `carlo-back`, con `DATABASE_PROVIDER=local`, `NODE_ENV=test`, `ACUTIS_INTEGRATION_TEST=1`, `AI_ENABLED=false` y secretos de autenticación sintéticos:

```sh
npm ci --include=dev
npx prisma generate
npx prisma migrate deploy
npm run typecheck
npm run lint
npm test -- --pool=threads --maxWorkers=1
npm run build
```

**El comando de migración anterior solo prepara la base desechable vacía. Esta ampliación no requiere ninguna migración del esquema de producción.** La prueba `catalog-scale.integration.test.ts` exige la base específica, comprueba que está vacía y limpia sus propios registros. Cubre los tamaños Saint 0/79/100/101/179/1000/2999/3000 y Miracle 0/7/100/101/1000/2999/3000, intento 3001, concurrencia, lectura completa, deduplicación, autorización, relaciones y cambio de revisión. `ACUTIS_SCALE_REPORT_DIR` opcional guarda métricas HTTP sin credenciales.

Para navegador, después de terminar las pruebas backend y con la base vacía:

```sh
node scripts/catalog-scale-fixtures.cjs
```

Solo crea contenido y una cuenta **sintéticos** en la base desechable; no importa el catálogo real. Iniciar el backend en `127.0.0.1:4196`, con `FRONTEND_ORIGIN=http://127.0.0.1:3196`. Iniciar el frontend compilado en `127.0.0.1:3196`, con `BACKEND_URL=http://127.0.0.1:4196`, `NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3196`, `CATALOG_STORAGE_PROVIDER=supabase` y analítica desactivada. Las imágenes son lecturas de objetos públicos existentes, sin cargas ni claves.

En `carlo-front`:

```sh
npm ci --include=dev
npm run typecheck
npm run lint
NODE_ENV=test npm test -- --pool=threads --maxWorkers=1
npm run build
# En otra terminal: npm run start -- -H 127.0.0.1 -p 3196
ACUTIS_SCALE_BROWSER=1 ACUTIS_BROWSER_ORIGIN=http://127.0.0.1:3196 npm run test:browser -- catalog-scale.spec.ts --project=chromium-desktop --project=iphone-emulated
```

En PowerShell definir cada variable mediante `$env:NOMBRE='valor'` antes de ejecutar su comando. Configurar Playwright con sus navegadores instalados. El suite de escala se omite por defecto y rechaza cualquier origen distinto del puerto local 3196. Requiere los IDs sintéticos y total 3000 antes de operar. Comprueba filtros, mapa, imágenes, relaciones, edición, creación rechazada, límites de DOM, concurrencia y escritorio/móvil. Adjunta tiempos y memoria JavaScript donde Chromium permite medirla.

Al finalizar, detener los servidores y ejecutar `node scripts/catalog-scale-fixtures.cjs --cleanup` en `carlo-back` con la misma conexión desechable. Borra únicamente los fixtures identificados y su cuenta sintética. No ejecutar este cargador junto con las pruebas de integración, que esperan la base vacía.

## Publicación y producción

Se necesitan **frontend y backend**. Primero publicar el frontend compatible con ambos contratos; después el backend que añade envelopes y el límite transaccional. No se requiere migrar, modificar el catálogo, imágenes, secretos, certificados ni variables de Render. Esta entrega no ejecuta ningún despliegue.

Los tiempos locales con datos sintéticos no garantizan latencia de Render gratuito ni de Supabase remoto. Repetir una comprobación de lectura tras el despliegue autorizado. El tamaño total descargado depende de la longitud del contenido; el límite de 100 acota cada respuesta por registros, no por bytes.

## Resultados comprobados el 18 de septiembre de 2026

- Backend: 255 pruebas / 27 archivos; frontend: 181 pruebas / 26 archivos. Typecheck, lint y build de ambos aprobados. Lint frontend conserva una advertencia previa sobre limpieza de una referencia del diálogo; ningún error.
- Navegador: 10 escenarios aprobados, cero fallos/omitidos, Chromium escritorio y WebKit móvil de 390×844. Se verificó además que editar un milagro al límite conserva su aprobación y que el borrado de santos usa el proxy autenticado.
- Todos los tamaños solicitados se verificaron en PostgreSQL desechable, incluidas cinco altas concurrentes al quedar una plaza, competencia entre API/importador y rollback de la importación si no queda capacidad de milagros. Ninguna lectura presenta IDs duplicados.
- No se consultaron ni modificaron las 179 fichas de Supabase para estas pruebas. Se retiraron los fixtures de navegador y las pruebas limpian sus propios registros. Ninguna imagen fue subida.

### HTTP local con 3000 registros sintéticos de aproximadamente 2 KB de texto

| Consulta | Páginas | Máximo por página | Total ms | p95 página ms | Máximo bytes/página |
|---|---:|---:|---:|---:|---:|
| `/saints` | 30 | 100 | 852 | 40 | 271277 |
| `/miracles` | 30 | 100 | 951 | 65 | 227883 |
| `/miracles/all` | 30 | 100 | 792 | 34 | 227883 |
| `/saints/capacity-fixture-saint-0000/miracles` | 30 | 100 | 771 | 29 | 227919 |
| `/saints/capacity-fixture-saint-0000/miracles/all` | 30 | 100 | 823 | 37 | 227919 |

### Navegador con las API reales locales, sin mocks de catálogo

| Navegador | Vista | Carga completa ms | Nodos DOM | Heap JS bytes |
|---|---|---:|---:|---:|
| chromium | saints-load | 2487 | 404 | 13279880 |
| chromium | saints-last-biography-filter | 270 | 169 | 15326484 |
| chromium | map-load | 2096 | 313 | 19466420 |
| chromium | miracles-load | 2677 | 3367 | 46364860 |
| mobile-webkit | saints-load | 2904 | 404 | No disponible |
| mobile-webkit | saints-last-biography-filter | 443 | 169 | No disponible |
| mobile-webkit | map-load | 4060 | 313 | No disponible |
| mobile-webkit | miracles-load | 8727 | 3367 | No disponible |

Los tiempos incluyen navegación y esperas del navegador, sin simular una conexión móvil lenta. El heap es una observación puntual de Chromium, no una prueba de ausencia de fugas. WebKit no expone esa métrica en este runner. En milagros, 3000 nodos son opciones del selector nativo; solo hay 12 fichas. La carga inicial más lenta observada fue 8,7 s en WebKit móvil para milagros; no se ha medido Render con 3000 registros reales ni carga de múltiples usuarios simultáneos.

Los archivos afectados abarcan las rutas y servicios de catálogo backend, el importador y sus guardas de pruebas, el recolector frontend, las vistas de santos/mapa/milagros/detalle/admin, la paginación reutilizable y sus suites. El diff del commit publicado ofrece el inventario completo; los esquemas Prisma, migraciones, certificados, configuraciones Render y archivos de datos del catálogo no se modificaron.
