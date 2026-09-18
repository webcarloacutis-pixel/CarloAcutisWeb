# Catálogo: 3000 santos y 3000 milagros

## Contrato y límites

- Capacidad independiente: 3000 `Saint` y 3000 `Miracle`, incluidos milagros pendientes. Una lectura no trunca registros preexistentes.
- Todas las consultas de catálogo mantienen `limit` entre 1 y 100. Las vistas de colección existentes conservan su contrato y orden por ID; el límite predeterminado de esas vistas es 100.
- Las vistas nuevas `?view=cards` de `/saints`, `/miracles`, `/miracles/all` y las relaciones `/saints/:id/miracles[/all]` devuelven **12 registros por defecto**, con máximo de 100. La interfaz pide explícitamente 12.
- Contrato de tarjetas: `{items,total,nextCursor,hasMore,previousCursor,hasPrevious,offset,revision,metadata}`. `offset` describe la posición de los elementos; la navegación envía el **cursor opaco**, no un offset calculado por el navegador. `hasPrevious:true` y `previousCursor:null` significan volver a la primera página quitando `cursor`.
- La revisión y el ámbito de cada cursor detectan cambios de contenido, puntuaciones, filtros, relación y permisos. `409 CATALOG_CHANGED` exige reiniciar la lectura. Un cursor de otro ámbito se rechaza. La interfaz muestra error/reintento y permite volver a la primera página, sin bucles ni colección parcial presentada como completa.
- Santos: los filtros `q`, `continent`, `country` y `century` se aplican globalmente en el servidor antes de cortar la página. La búsqueda incluye el texto completo persistido, aunque la respuesta de tarjetas lleve únicamente `biographyExcerpt`, de hasta 600 caracteres. El detalle y el editor individual conservan la biografía completa.
- La respuesta de tarjetas de santos incluye `rankingMode` y los países globales en `metadata.facets.countries`. `ai-estimate` indica puntuaciones válidas descendentes, sin puntuación al final y desempate estable por nombre normalizado/ID. `alphabetical-unrated` se presenta expresamente como orden alfabético sin estimaciones disponibles. No se generan estimaciones durante una lectura.
- Milagros: `q`, `saintId`, `type` y `approved` (alias `verified`) se aplican globalmente. Se preserva el orden de aprobados primero, luego fecha de creación descendente e ID como desempate. No se inventa un ranking IA de milagros. `metadata.facets.types` y `metadata.approvedTotal` permiten filtros y contadores completos sin descargar todas las descripciones.
- `view=names` en santos devuelve solo ID, nombre y slug para selectores. `view=map` devuelve los campos mínimos de identidad/imagen/ubicación documentada, sin biografía ni objeto editorial completo. Conserva el orden global de santos y admite filtros del servidor. Las vistas antiguas `full` y `listing` siguen disponibles para consumidores anteriores; no son la carga inicial del listado nuevo.
- Creación número 3001: HTTP 409 `SAINT_LIMIT_REACHED` o `MIRACLE_LIMIT_REACHED`, con `limit:3000` y mensaje claro. Se permiten lecturas y ediciones a capacidad; nunca hay borrado automático.
- Comprobación e inserción comparten transacción y bloqueo consultivo PostgreSQL por entidad. Los creadores de la aplicación y el importador usan la misma reserva entre instancias. No se añade un trigger: una escritura SQL directa fuera de la aplicación debe respetar el límite por separado.

## Cliente y renderizado

`/santos`, `/milagros`, el administrador y las relaciones de una ficha recuperan **una página de 12 registros** para mostrar 12 tarjetas. Cambiar página o filtros solicita únicamente la página necesaria; no se descargan 30 páginas completas para abrir una vista de 12 fichas. El navegador respeta el orden recibido del servidor; no reordena únicamente las tarjetas visibles como si fuera un ranking global.

Los lectores mantienen una solicitud activa por vista, cancelan la anterior al cambiar filtros/desmontar, agrupan cambios rápidos de búsqueda y conservan una caché acotada de 24 páginas durante 20 segundos. Validan forma, totales, cursores, progreso e IDs repetidos. Un error se presenta como error, no como cero resultados. Las estadísticas administrativas piden una fila y leen el total; los totales de oraciones incluyen pendientes mediante el endpoint privado.

El URL de `/santos` conserva búsqueda, filtros y cursor. Atrás/adelante y recarga vuelven al ámbito indicado; la navegación usa historial nativo sin ordenar desplazamientos del documento. `ScrollToResults` tampoco fuerza scroll al cambiar búsquedas de oraciones o versículos. El editor administrativo sigue solicitando la ficha singular completa antes de editar.

El mapa necesita todas las coordenadas y los selectores todos los nombres. Solo estas colecciones mínimas se recuperan secuencialmente en páginas de 100, con deduplicación por ID. Los selectores reutilizan un resultado reciente durante 30 segundos y no repiten la descarga de nombres al filtrar milagros. La carga de una página y la del selector pueden coincidir, con una petición activa por cada flujo.

El mapa muestra 20 enlaces por página y usa Canvas cuando supera 200 ubicaciones; sus popups se crean al abrirlos y contienen 20 enlaces por página. Los selectores nativos admiten 3000 nombres, sin montar 3000 tarjetas ni un menú personalizado con 3000 opciones. No se insertan 3000 fichas completas en HTML inicial. Las tarjetas reservan un marco uniforme 4:5 con `object-fit:contain`, fondo neutro y tamaños responsive; el detalle conserva el contenido completo de la imagen.

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

Solo crea contenido y una cuenta **sintéticos** en la base desechable; no importa el catálogo real. Iniciar el backend en `127.0.0.1:4196`, con `FRONTEND_ORIGIN=http://127.0.0.1:3197`. Iniciar el frontend compilado en `127.0.0.1:3197`, con `BACKEND_URL=http://127.0.0.1:4196`, `NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3197`, `CATALOG_STORAGE_PROVIDER=supabase` y analítica desactivada. Las imágenes son lecturas de objetos públicos existentes, sin cargas ni claves.

En `carlo-front`:

```sh
npm ci --include=dev
npm run typecheck
npm run lint
NODE_ENV=test npm test -- --pool=threads --maxWorkers=1
npm run build
# En otra terminal: npm run start -- -H 127.0.0.1 -p 3197
ACUTIS_SCALE_BROWSER=1 ACUTIS_BROWSER_ORIGIN=http://127.0.0.1:3197 npm run test:browser -- catalog-scale.spec.ts --project=chromium-desktop --project=iphone-emulated
```

En PowerShell definir cada variable mediante `$env:NOMBRE='valor'` antes de ejecutar su comando. Configurar Playwright con sus navegadores instalados. El suite de escala se omite por defecto y rechaza cualquier origen distinto del puerto local 3197. Requiere los IDs sintéticos y total 3000 antes de operar. Comprueba filtros, mapa, imágenes, relaciones, edición, creación rechazada, límites de DOM, concurrencia y escritorio/móvil. Adjunta tiempos y memoria JavaScript donde Chromium permite medirla.

Al finalizar, detener los servidores y ejecutar `node scripts/catalog-scale-fixtures.cjs --cleanup` en `carlo-back` con la misma conexión desechable. Borra únicamente los fixtures identificados y su cuenta sintética. No ejecutar este cargador junto con las pruebas de integración, que esperan la base vacía.

## Publicación y producción

Se necesitan **frontend y backend**. Para esta revisión, desplegar primero el backend: añade `view=cards`/`view=map` y conserva las vistas antiguas usadas por el frontend activo. Después desplegar el frontend que consume esas vistas nuevas. No invertir este orden sin verificar que el backend ya ofrece el contrato nuevo. No se requiere migrar, modificar el catálogo, imágenes, secretos, certificados ni variables de Render. Esta entrega no ejecuta ningún despliegue.

Los tiempos locales con datos sintéticos no garantizan latencia de Render gratuito ni de Supabase remoto. Repetir una comprobación de lectura tras el despliegue autorizado. El límite API de 100 acota cada respuesta por registros, no por bytes. Las tarjetas de santos limitan además el extracto de biografía; las descripciones completas de milagros siguen disponibles en las 12 fichas solicitadas.

## Evidencia histórica de la entrega de capacidad anterior

Los resultados siguientes pertenecen al commit `9dc6b5769c6801adf171aa9b3fe0f3db09d8892f`, del 18 de septiembre de 2026. **No acreditan los cambios actuales de páginas del servidor, popularidad ni imágenes.** El cierre actual debe ejecutar sus pruebas integrales y navegador sobre el mismo manifiesto final y registrar sus resultados por separado; mientras tanto el navegador de esta revisión permanece NOT_TESTED.

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
