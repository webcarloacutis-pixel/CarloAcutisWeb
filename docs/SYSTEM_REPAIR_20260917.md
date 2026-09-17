# Verificación integral — 17 de septiembre de 2026

Este informe sustituye el estado pendiente de administrador de `CHAT_ADMIN_REPAIR.md` y su antigua regla de idioma. Distingue el software revisado de los servicios desplegados. No certifica producción.

## Evidencia remota anterior a esta publicación

Base de trabajo y main comprobados: `40ba873894b486c2abddd38fef5d1a1b56f91ee3`. Se conservó el worktree saneado. No se publicó el historial local de reparación que contiene secretos.

| Comprobación real | Resultado |
| --- | --- |
| API `/health`, `/ready` | 200, `ok: true` |
| API `/saints`, frontend `/api/saints` | 200; 79 registros; respuestas iguales |
| Frontend `/api/ready`, `/santos` | Correctos en la comprobación |
| Visitante `/api/auth/me` | 401 `NOT_AUTHENTICATED`, esperado |
| Oraciones y milagros por el proxy | 1 oración aprobada, 7 milagros |
| Storage existente | 79/79 objetos WebP: HEAD 200, tamaño mayor que cero |
| Navegador remoto anónimo | Portada, catálogo, ficha, mapa y oraciones visibles; seis imágenes iniciales cargadas |
| Administrador existente en Render | Login real 200, acceso a `/admin`; logout y posterior `/admin/me` 401 |
| React #441 durante las visitas | No apareció en esta ventana de comprobación |
| Configuración efectiva, eventos, memoria/reinicios y SHA desplegado de Render | BLOCKED: no acceso al dashboard/API de Render; solicitada evidencia no secreta al propietario |
| OpenAI real | BLOCKED: archivo privado de prueba vacío y configuración remota sin confirmar. Cero llamadas y US$0 gastados en esta tarea |

El login utilizó la cuenta existente, sin recrearla, cambiar permisos ni contraseña. Solo creó y revocó su sesión de comprobación. No se modificaron catálogo, imágenes, esquema, CA ni conexión SQL. No se invocó ningún despliegue.

## Causas confirmadas y límites del diagnóstico

**Traducciones repetidas:** `components/t.tsx` enviaba a IA los textos de interfaz de trece idiomas, aunque ya estaban en `translations.ts`. `TranslatedText` solicitaba otra traducción al montar cada biografía. No había coordinación entre componentes. Navegar, paginar o cambiar idioma multiplicaba esas solicitudes. No se atribuye por ello cada 502 histórico a OpenAI: también se informó un 502 de sesión, que no utiliza el proveedor.

Reproducción en el navegador de la web desplegada: seleccionar francés en portada y navegar a milagros generó **41 intentos de `/api/ai/translate`**. Se interceptaron y abortaron antes de enviarlos, sin gasto. La interfaz francesa sí se mostró y se verificaron los siete milagros, incluyendo un título real. En el nuevo build la navegación y el cambio de idioma de catálogo/ficha generan cero traducciones automáticas.

**Fallo de renderizado reproducido:** el catálogo y las fichas imponían 15 segundos al backend. Con el build original (Next 16.3.5, React 19.2.8) y un backend local que devolvía el catálogo válido tras 18 segundos, `/santos` cortó a los 15,2 segundos, emitió el digest `4101894172` y no renderizó las fichas. El HTML podía tener estado 200 por el renderizado progresivo; eso no acredita contenido correcto. La primera ronda remota midió varias peticiones entre 22 y 24 segundos, pero no permite separar tiempo de ingreso, arranque o procesamiento interno.

[React #441](https://react.dev/errors/441) es la envoltura de una excepción de Server Components. La reproducción demuestra una causa real del código; **sin el digest y logs de la incidencia original no prueba que todos los #441 o 502 históricos tengan esa misma causa**. En las consultas remotas actuales no se reprodujo el 502. No se concluye que falte una clave, que el servicio estuviera suspendido ni que hubiera agotamiento de memoria.

## Correcciones

- Interfaz: `T` usa exclusivamente los recursos locales de los 15 idiomas. Nuevos errores y controles también tienen recursos locales.
- Contenido editorial: la lista conserva siempre el original; la ficha permite traducir la biografía mediante una acción explícita. Se indica el español como idioma del original. Una traducción fallida conserva el texto. El cliente deduplica solicitudes simultáneas, admite como máximo dos, no mantiene cola ni reintenta automáticamente; cachea éxitos con límite de 100 entradas y fallos durante un minuto. Volver al idioma anterior no reenvía una petición cancelada.
- Chat: prioridad controlada por el servidor: idioma solicitado expresamente, idioma del mensaje actual, contexto reciente para mensajes ambiguos y, al final, idioma de interfaz. El contexto son como máximo tres mensajes recientes de 1000 caracteres, incluyendo la respuesta anterior para interpretar continuaciones ambiguas, dentro del rol no privilegiado. No se admiten roles ni instrucciones de sistema enviados por el navegador. Todo usa la misma llamada de generación. La idempotencia incluye el contexto.
- Se mantienen límites por identidad, cuotas globales persistidas, concurrencia, tokens, cancelación, propiedad del historial y ausencia de scroll automático. Un error de sesión no impide mostrar por separado el error del chat ni crea una sesión ficticia.
- Lecturas públicas: espera máxima de 35 segundos, sin reintentos automáticos ni catálogo vacío de sustitución. Error visible con digest y reintento manual tras recuperación. El detalle conserva los 404 reales.
- Proxy: conserva estados HTTP; distingue indisponibilidad (503), timeout (504), cancelación (499) y rechazo del upstream. Un HTML de error del ingreso no se presenta como JSON del proveedor. Correlación segura para catálogo, sesión y chat, no solo IA.
- Backend y Next: `requestId`, etapa, código, estado y duración sin URLs, cookies, credenciales ni conversaciones; el digest de Server Components queda asociado al identificador del error. Se conservan los diagnósticos de CA/TLS y se filtra el código PostgreSQL/Prisma.
- Cabeceras de revisión `X-App-Revision` y `X-Backend-Revision` si Render proporciona un SHA válido. Solo podrán acreditar esta versión después de desplegarla.

## OpenAI

El código espera `AI_ENABLED=true` exactamente, `OPENAI_API_KEY` no vacía **solo en el backend**, y `OPENAI_MODEL=gpt-4o-mini` (también es el valor predeterminado si se omite). No hay clave `NEXT_PUBLIC`. La dependencia instalada por el lockfile es `openai` **6.16.0**, con Chat Completions, `max_completion_tokens`, timeout y reintentos automáticos del SDK desactivados.

Se contrastaron [el modelo](https://developers.openai.com/api/docs/models/gpt-4o-mini), [el SDK oficial](https://github.com/openai/openai-node) y [los errores del proveedor](https://developers.openai.com/api/docs/guides/error-codes). El soporte documentado del modelo no demuestra acceso desde una cuenta concreta. Desactivación, clave ausente, rechazo de credencial, modelo no disponible, cuota, rate limit y timeout mantienen códigos distintos y mensajes localizados.

Valores predeterminados conservados: `OPENAI_TIMEOUT_MS=25000`, `AI_MAX_CONCURRENCY=2`, `AI_DAILY_REQUEST_LIMIT=100`; chat 20 solicitudes por identidad/día y 500 tokens máximos de salida. Las otras operaciones comparten la cuota global. Estos límites de solicitudes no son un límite monetario del proveedor. El presupuesto autorizado para la prueba real sigue siendo US$0,01 total; no se amplió ni consumió. Las respuestas de los tests son simuladas y **no acreditan aún el idioma de una respuesta real**.

## Configuración de los servicios existentes

El propietario informa dos **Web Services públicos Free**, Auto-Deploy Off, previews manuales y ningún Blueprint. Son confirmaciones manuales. No se crearon recursos, modificaron planes o variables, ni se activaron hooks. El `render.yaml` histórico describe otro escenario propuesto con API privada/plan de pago: **no aplicarlo a estos servicios existentes**.

| Servicio | Root Directory | Build Command | Start Command |
| --- | --- | --- | --- |
| `acutis-api-staging` | `carlo-back` | `npm ci --include=dev && npm run build && npm run typecheck && npm run lint` | `npm start` |
| `acutis-front-staging` | `carlo-front` | `npm ci --include=dev && npm run typecheck && npm run lint && NODE_ENV=test npm test && npm run build` | `npm start -- --hostname 0.0.0.0` |

Node 24.21.0. Ningún predeploy ni migración requeridos para estos cambios. Ambos servicios necesitarán redeploy manual para incorporar la corrección, no solo frontend. No se ha hecho.

El frontend público debe dirigirse a `BACKEND_URL=https://acutis-api-staging.onrender.com`. El código da prioridad a `BACKEND_URL` sobre `BACKEND_HOSTPORT`; los hostports públicos `.onrender.com` usan HTTPS y se rechaza un `BACKEND_URL` público HTTP. No se asume una API Private Service. Se solicita comprobar el valor efectivo, duplicados y grupos del servicio existente: según [Render](https://render.com/docs/configure-environment-variables), el valor definido en el servicio prevalece sobre el grupo; la prioridad entre grupos con claves duplicadas no está garantizada. No se han cambiado estas variables.

Las credenciales SQL, el rol limitado, `schema=acutis`, el Session Pooler, la CA versionada y TLS estricto permanecen intactos. No deben tocarse para esta reparación. Un archivo privado local no configura OpenAI ni ninguna variable en Render.

## Pendientes de seguridad y producción

- Correlacionar los 502 y digest históricos con logs/eventos de Render y confirmar las revisiones desplegadas, variables efectivas y recursos del intervalo afectado.
- Ejecutar una prueba real de IA bajo el presupuesto restante una vez disponible la configuración verificable; probar la versión nueva en Render después de que el propietario la despliegue.
- Continúan la revisión/rotación de credenciales históricamente expuestas y la incidencia ACUTIS-013 de dependencias documentada previamente. Esta reparación no las cierra.
- No habilitar confianza de IP con cabeceras arbitrarias: se conserva el modo conservador sin confianza de proxies no acreditados. Puede agrupar visitantes en una misma cuota; requiere verificar el ingreso antes de mejorar esa precisión.
- Free no constituye garantía de latencia ni disponibilidad. No se añadieron pings para mantener servicios despiertos, ni planes de pago.
- El estado local aprobado y una lectura remota puntual no son una certificación de producción.

## Pruebas y loop

| Prueba final | Estado | Alcance |
| --- | --- | --- |
| Frontend: `npm ci --include=dev`, typecheck, lint, `NODE_ENV=test npm test`, build | PASS | Instalación propia, caché inicialmente vacía, sin dependencias del backend; 130 tests en 22 archivos |
| Backend: instalación propia, Prisma generate, typecheck de contratos, typecheck, lint, test, build | PASS | Sin dependencias del frontend; 233 tests en 26 archivos; integración SQL solo en base desechable |
| Navegador del sistema local | PASS | 10 recorridos: catálogo/paginación/filtro, original y traducción fallida, visitante, 4 ejemplos lingüísticos simulados, usuario/historial, otro propietario, roles, logout, demora y recuperación |
| Regresiones de navegador | PASS | 18 casos en Chromium escritorio y Android emulado: scroll del documento y del chat, Enter/clic/IME, historial largo, errores lentos, cambios EN/FR/AR y rechazo de respuestas tardías |
| Respuesta del backend tras 18 segundos | PASS | Nuevo build muestra las 79 fichas en 18,3 segundos; el anterior fallaba a los 15,2 |
| Backend no disponible y recuperación | PASS | Error visible con referencia; el botón de reintento recupera las 79 fichas sin datos vacíos de sustitución |
| OpenAI real y cambio aplicado en Render | BLOCKED | No se dispone de configuración verificable del proveedor ni se ha autorizado ejecutar el despliegue |

Comprobación de instalación reproducible: `cd carlo-front` y `npm run check:independent`. El script crea una copia temporal desde los archivos versionados, instala solo frontend, comprueba el grafo real de TypeScript y ejecuta la cadena completa. No instala Express ni fuentes de servidor como solución al build.

Registro de iteraciones: el timeout del catálogo se reprodujo primero como FAIL y después pasó con la espera acotada. Dos expectativas antiguas de tests de logs tuvieron que adaptarse a la correlación añadida, manteniendo sus aserciones de no filtración. En el arnés del navegador se corrigieron una espera de imágenes/portal insuficiente, un selector de idioma ambiguo y el arranque prematuro antes de terminar el build; no se atribuyeron esos fallos de pruebas al servicio. Todos los recorridos se repitieron. El lint del frontend conserva una advertencia anterior sobre el cleanup de un ref en `admin-saints-modal.tsx`, sin errores. No se eliminaron tests para aprobar.

La publicación y el SHA remoto se registran después del push en el cierre de la ejecución. La publicación del código no acredita su despliegue en Render.
