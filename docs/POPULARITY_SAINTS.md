# Estimaciones de popularidad y catálogo paginado

## Qué representa una puntuación

`saint-cultural-recognition-v1` estima familiaridad cultural internacional con una identidad de la tradición católica. Es una escala editorial ordinal de 0–100; no son visitas, votos, búsquedas, porcentajes de devoción ni medidas de eficacia religiosa. Las franjas del prompt son 0–20 limitado, 21–40 especializado/local, 41–60 moderado, 61–80 amplio y 81–100 internacional muy extendido.

Las entradas son los campos públicos de identidad: nombre, slug, título, biografía, país, patronazgos y años disponibles. No se envían usuarios, conversaciones ni credenciales. El prompt prohíbe obedecer instrucciones dentro de esos datos e inventar estadísticas o fuentes. Su incertidumbre no está calibrada: tiene sesgos culturales/lingüísticos y las limitaciones temporales del modelo. El tamaño de una biografía no es un indicador de popularidad.

El modelo debe devolver únicamente ID, tipo y un entero 0–100. Si no puede identificar suficientemente la ficha, devuelve `null`; el servidor rechaza esa estimación y conserva el último resultado válido. Cada resultado guardado incluye `generatedAt`, modelo/snapshot, versión de método y hash de entradas/configuración. Los resultados son estimaciones históricas fechadas; no se inventa una fecha de caducidad. El mantenimiento detecta cambios en el hash antes y después de generar. Una lectura pública nunca regenera.

El almacenamiento reutiliza `PopularityEstimate` con `contentType=saint`. Oraciones y versículos conservan `editorial-recognition-v1` y sus hashes anteriores. No se genera un ranking independiente de milagros.

## Lectura de tarjetas y mapa

- `/saints?view=cards`: 12 elementos por defecto, 100 máximo.
- `/saints?view=map`: proyección de nombre, coordenadas, procedencia de nacimiento y metadatos, sin biografía/editorial; 100 por defecto y máximo. El mapa puede recorrer explícitamente sus páginas.
- Parámetros de filtros: `q`, `continent`, `country`, `century`. Se conservan alias en español, búsqueda sin acentos en nombre/título/biografía/país/slug, continente `america`, desconocidos y siglos `bce`, `unknown` o rangos. Longitud máxima 200 por filtro; no se aceptan parámetros repetidos.
- Respuesta: `items`, `total`, `nextCursor`, `hasMore`, `revision`, `offset`, `previousCursor`, `hasPrevious`, `rankingMode`, `metadata.facets.countries`.
- `previousCursor=null` y `hasPrevious=true` significa volver a la primera página quitando el cursor.
- `rankingMode=ai-estimate` indica que existe al menos una puntuación válida en el catálogo; los elementos sin estimación permanecen al final. `alphabetical-unrated` indica que no hay ninguna estimación válida y no debe presentarse como ranking de popularidad.
- Orden global: puntuación válida descendente, cero antes de nulos, nombre normalizado e ID. El resultado se ordena antes de cortar la página. Las tarjetas contienen biographyExcerpt de hasta 600 caracteres y no incluyen la biografía completa; el detalle y el editor conservan la lectura singular íntegra. El extracto y la búsqueda de biografía se realizan en PostgreSQL.
- El cursor incluye revisión de datos y estimaciones y una huella de los filtros/vista. Cambios entre páginas devuelven `409 CATALOG_CHANGED`; debe reiniciarse la consulta. Un cursor de otros filtros/vista devuelve `400 INVALID_CURSOR`.
- Los modos históricos `full`, `listing` y `names` conservan el contrato y orden por ID, permitiendo despliegue escalonado con consumidores anteriores.

## Mantenimiento interno y presupuesto

El comando es `npm run popularity -- --kind saint --dry-run --limit 100`. El modo predeterminado siempre es de inspección; no hay endpoint anónimo de generación. Un lote tiene como máximo 100 entradas. `--after ID` permite continuar por ID.

Antes de cualquier ejecución real deben existir autorización monetaria específica, presupuesto disponible, respaldo previo de `PopularityEstimate`, destino SQL verificado y una clave privada exclusiva del servidor. El permiso de una prueba antigua o una cuota diaria de solicitudes no autoriza una nueva campaña. No elevar cuotas o cambiar planes para completar un lote.

Variables de ejecución, sin incluir secretos en argumentos ni logs:

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Conexión privada existente con TLS estricto. |
| `POPULARITY_DATABASE_HOST` / `POPULARITY_DATABASE_NAME` | Coincidencia explícita del destino esperado. |
| `AI_ENABLED` / `POPULARITY_ALLOW_PAID_REQUESTS` | Deben ser exactamente `true` además de la autorización del propietario. |
| `OPENAI_API_KEY` | Clave privada; nunca en frontend, Git ni informes. |
| `POPULARITY_MODEL` | Modelo autorizado; preferir snapshot fijo para reproducibilidad. |
| `POPULARITY_MAX_SPEND_USD` | Presupuesto total aprobado para el ledger, máximo permitido por código US$100. |
| `POPULARITY_INPUT_USD_PER_MILLION` / `POPULARITY_OUTPUT_USD_PER_MILLION` | Precios actuales verificados para ese modelo. |
| `POPULARITY_SPEND_LEDGER_FILE` | Ruta absoluta local, privada/excluida de Git, usada en todas las reanudaciones del mismo presupuesto. |
| `POPULARITY_RETRIES` | `0` por defecto; debe permanecer `0` si no se autorizaron reintentos. |
| `POPULARITY_TIMEOUT_MS` | 25000 por defecto, máximo 60000; el timeout del proveedor puede ser menor. |

El ledger reserva una cota conservadora antes de cada intento y la persiste con escritura atómica. No devuelve reservas ante fallos de facturación incierta. Reanudar no reinicia el acumulado; cambiar precios/modelo/presupuesto con el mismo ledger se rechaza. Una exclusión mutua impide dos comandos con el mismo ledger. Si el proceso termina abruptamente, deja el lock para revisar que no haya otro proceso vivo y conservar el coste reservado; no borrar el ledger para continuar.

Los leases de PostgreSQL impiden solicitudes duplicadas para la misma ficha. El hash y la versión del método evitan regenerar entradas sin cambios. Si una edición llega durante la solicitud, se descarta el resultado. `resumeAfter` nunca salta el primer elemento fallido/no ejecutado; `retryRequired=true` exige resolver la causa. Si es `null`, reiniciar sin `--after` es deliberado y los éxitos anteriores se omiten por idempotencia.

Cuota, autenticación o configuración bloqueada detienen el lote inmediatamente. Dos fallos equivalentes desconocidos consecutivos también lo detienen. No se hacen llamadas por visitas, SSR o cambios de página. La cuota diaria compartida puede obligar a continuar otro día.

## Validación

Las pruebas de `src/popularity` cubren parseo, tipos, nulos, hashes, cambios concurrentes, timeout, leases, presupuesto duradero y reanudación con proveedor simulado. `src/routes/saint-catalog.integration.test.ts` usa únicamente PostgreSQL desechable para comprobar ranking global de más de 100 elementos, empates, cero/nulos, filtros, cursores, navegación previa y compatibilidad. No prueba calidad de estimaciones reales ni acredita la versión desplegada.

## Milagros: paginación equivalente sin ranking inventado

`/miracles?view=cards`, `/miracles/all?view=cards` (administrador) y `/saints/:id/miracles[/all]?view=cards` devuelven 12 detalles por defecto, máximo 100, con `total`, `nextCursor`, `previousCursor`, `offset`, `hasPrevious`, `hasMore` y `revision`. Filtros: `q` en título/detalles/nombre del santo, `saintId`, `type`, `approved=true|false` (alias `verified`). Los registros pendientes y sus tipos nunca se incluyen en respuestas públicas. Cada item incluye `saint={id,name,slug}` y nombres auxiliares `saintName`/`saintSlug`; `metadata.approvedTotal` es el total aprobado del filtro y `metadata.facets.types` contiene tipos del alcance permitido. El selector completo de santos usa por separado la proyección paginada `names`.

Se mantiene orden de aprobación descendente, creación descendente e ID como desempate; no se añade una puntuación de popularidad de milagros. Las vistas históricas mantienen su orden por ID. La revisión cambia con ediciones de milagros o de la identidad relacionada.
