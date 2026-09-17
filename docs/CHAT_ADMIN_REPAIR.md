# Chat y acceso administrativo: cierre técnico

> Actualización: este informe es histórico. Véase [la verificación integral posterior](SYSTEM_REPAIR_20260917.md). La cuenta administradora ya existe y se comprobó su login en Render; la respuesta IA sigue la pregunta y la petición explícita de idioma. No repetir el aprovisionamiento.

## Alcance verificado el 17 de septiembre de 2026

Cambios de código preparados para publicación manual, sin desplegar Render ni modificar sus variables. Se conservan el catálogo, las contraseñas de PostgreSQL, la conexión de runtime, la CA versionada y `render.yaml`.

| Comprobación | Resultado | Entorno |
| --- | --- | --- |
| Backend: 205 pruebas, tipos, lint y build | PASS | PostgreSQL desechable local cuando procede |
| Frontend: 107 pruebas, tipos, lint y build | PASS | Copia aislada; lint conserva una advertencia previa en `admin-saints-modal.tsx` |
| Navegador: 18 casos de chat | PASS | Chromium escritorio y Android emulado; proveedor simulado |
| Login administrativo por formulario, recarga, cookie HttpOnly, logout y revocación | PASS | Frontend y API reales locales, cuenta sintética temporal en base desechable |
| Petición correlacionada navegador → proxy Next → Express | PASS | Respuesta real local `AI_DISABLED`, sin llamada al proveedor |
| `/health`, `/ready`, `/saints` | 200; 79 registros | Render actualmente desplegado, versión anterior |
| Catálogo y relaciones | Sin cambios en sus resúmenes de filas | Supabase, lectura con TLS estricto |
| 79 imágenes WebP existentes | 79 respuestas válidas | Storage público existente, solo lectura |
| Cuenta administrativa solicitada en Supabase | BLOCKED | No creada; autorización directa de escritura pendiente tras rechazo de revisión automática |
| Prueba real de OpenAI | BLOCKED | Presupuesto único de US$0,01 autorizado; archivo privado de clave todavía vacío |
| Login y chat nuevos en Render | BLOCKED | Esta versión no se ha desplegado |

Total automatizado: **330 PASS, 0 FAIL**. Las verificaciones bloqueadas no se cuentan como pruebas aprobadas. No se ha gastado crédito de OpenAI en esta intervención.

## Desplazamiento e idiomas

El efecto asociado a los mensajes llamaba a `scrollIntoView({behavior: "smooth"})`. La reproducción midió un desplazamiento del documento de 200 a 836 píxeles tanto con Enter como con el botón. Se eliminó ese efecto en ambos componentes de chat. El historial mantiene su contenedor y altura al pasar de la bienvenida a los mensajes; el área de estado también conserva su espacio.

El navegador añadía otro ajuste de 15 píxeles en móvil al cambiar a árabe: la traducción modificaba la altura de la página y su anclaje automático compensaba el cambio. La portada y los historiales excluyen ese anclaje mediante `overflow-anchor: none`. No hay restauración de posiciones, temporizadores de scroll ni bloqueo permanente del desplazamiento. El botón explícito para explorar contenido conserva su desplazamiento solicitado por el usuario.

Las pruebas preparan el control dentro del viewport antes de medir, empiezan con desplazamiento documental no nulo, registran cada cuadro y los eventos de scroll, y comparan documento, ventana e historial. Cubren Enter, botón, historial largo, respuesta larga, espera, error, movimiento manual durante la espera, cambio de idioma, IME y Shift+Enter. El máximo desplazamiento no solicitado de la versión corregida es **0 píxeles** en los 18 casos.

El chat usa el `LanguageProvider` y selector existentes. Las 15 lenguas son `es`, `en`, `zh`, `hi`, `ar`, `pt`, `ru`, `fr`, `ja`, `de`, `ko`, `it`, `tr`, `vi`, `pl`. La API valida una lista cerrada y construye la instrucción de idioma en el servidor. Al cambiar de idioma cancela/invalida la respuesta pendiente, mantiene la pregunta y el historial, muestra el aviso traducido y no reenvía automáticamente. Se verificaron ES, EN, FR y árabe RTL. No se traduce silenciosamente el historial ni se acepta un mensaje de sistema del navegador.

## OpenAI: diagnóstico y configuración

Se conserva el SDK instalado y Chat Completions con `gpt-4o-mini`, compatible con esa API según la [documentación oficial del modelo](https://developers.openai.com/api/docs/models/gpt-4o-mini). No se cambia a otro modelo ni API sin necesidad comprobada.

La configuración privada local inspeccionada tenía `AI_ENABLED=false` y ninguna clave OpenAI. Eso permite reproducir localmente `AI_DISABLED`; no demuestra cuál es la variable efectiva en Render. No se inspeccionó su Dashboard ni se atribuye a producción un resultado obtenido con un proveedor simulado.

Cada operación del chat admite un UUID de correlación. El proxy lo propaga a Express y a la respuesta. El log seguro `AI_REQUEST` contiene únicamente `requestId`, `stage`, `code`, `httpStatus`, `durationMs`. Las etapas separan validación, configuración, persistencia y proveedor. No registra el mensaje, la respuesta, cabeceras, claves, URL de base de datos ni mensajes crudos del SDK.

Los códigos públicos distinguen `AI_DISABLED`, `AI_CONFIGURATION_MISSING`, `AI_PROVIDER_AUTH`, `AI_MODEL_UNAVAILABLE`, `AI_RATE_LIMIT`, `AI_QUOTA_EXCEEDED`, `AI_TIMEOUT`, `AI_UPSTREAM_UNAVAILABLE`, `AI_RESPONSE_INVALID` y `AI_PERSISTENCE_FAILED`. Un 401/403 del proveedor se devuelve como 502 `AI_PROVIDER_AUTH`, nunca como sesión expirada del usuario. No se reintentan automáticamente errores de cuota o facturación. Se verifican respuestas vacías, incompletas y malformadas. Véase la [referencia oficial de errores](https://developers.openai.com/api/docs/guides/error-codes).

Para una activación futura, abrir **Render → acutis-api-staging → Environment → Environment Variables**. Solo ese backend necesita:

| Nombre | Valor/configuración |
| --- | --- |
| `AI_ENABLED` | `true` al activar expresamente el proveedor |
| `OPENAI_API_KEY` | Clave dedicada introducida privadamente |
| `OPENAI_MODEL` | `gpt-4o-mini` |
| `OPENAI_TIMEOUT_MS` | `25000` |
| `AI_MAX_CONCURRENCY` | `2` |
| `AI_DAILY_REQUEST_LIMIT` | `100` por defecto existente; ajustar el límite operativo antes de abrir al público |

No colocar la clave en el frontend, en `NEXT_PUBLIC_*`, en Git ni en un Secret File: el código lee la variable `OPENAI_API_KEY`. Revisar también **Linked Environment Groups** para localizar definiciones repetidas sin modificar grupos compartidos de otros proyectos. Una variable del servicio prevalece sobre la de sus grupos; entre varios grupos con la misma variable Render no garantiza precedencia. **Save only** guarda sin desplegar y no cambia el proceso actual; las otras opciones pueden desplegar. Referencia: [variables de Render](https://render.com/docs/configure-environment-variables).

El chat limita la entrada a 4.000 caracteres, la salida a 500 tokens y las solicitudes por usuario/IP a 20 diarias; mantiene el límite global y los permisos existentes. El SDK y el cliente del chat no hacen reintentos automáticos de operaciones de pago. Estos límites no sustituyen un presupuesto monetario de la cuenta. El presupuesto de prueba autorizado no autoriza activar tráfico público ilimitado.

## Cuenta administrativa y mantenimiento

La cuenta pertenece a `acutis."User"` en PostgreSQL, no a Supabase Auth. La única migración nueva, `202609170001_admin_account`, añade `User.isAdmin BOOLEAN NOT NULL DEFAULT false`. Usa el hash bcrypt existente (coste 12); el registro público no admite `isAdmin` ni roles.

El formulario `/sanctum/portal` acepta email y contraseña. Las sesiones administrativas son cookies HttpOnly firmadas con registro revocable en `AuthSession`. En cada petición protegida se verifica también el permiso actual en la base de datos. Se conservan las rutas `/auth/...` y `/api/auth/...`, y el mecanismo operativo `ADMIN_KEY` por API. No hay lista de emails privilegiados ni contraseña en el código. Cambiar la clave operativa no invalida una sesión de cuenta independiente; quitar `isAdmin` sí impide su siguiente petición administrativa.

La migración y el aprovisionamiento solo se ejecutaron con cuentas sintéticas en la base local desechable. **En Supabase no existe todavía la columna ni la cuenta solicitada.** No desplegar esta versión de la API hasta completar de forma autorizada ese cambio aditivo y su verificación. El arranque/build no ejecuta el aprovisionamiento, importaciones ni migraciones.

El comando interno genérico es `node --import tsx src/scripts/provision-admin.ts`, ejecutado desde `carlo-back` con dependencias de mantenimiento instaladas. Recibe JSON exclusivamente por stdin. Preparar la entrada en un archivo privado excluido de Git: `email`, `password` y `execute: false` para obtener la vista previa. No poner la contraseña en argumentos ni en el historial del shell. En PowerShell puede pasarse con `Get-Content -Raw -LiteralPath $archivoPrivado | node --import tsx src/scripts/provision-admin.ts`.

El proceso requiere `DIRECT_URL` de mantenimiento, separada de las credenciales limitadas de runtime. Solo acepta la base desechable exacta o el proyecto Supabase autorizado con TLS estricto y CA. Antes de escribir en Supabase, respaldar el esquema y comprobar los checksums de las migraciones anteriores, aplicando únicamente la adición pendiente. Para ejecutar, incorporar `execute: true`, el `expectedUserId` de la vista previa (o `null` si no existe) y `backupDirectory` privado. El comando respalda cuenta y sesiones antes de actualizar, rechaza emails duplicados, preserva el ID, verifica el hash y revoca sesiones previas cuando corresponde. Repetirlo sin cambios produce `UNCHANGED`, sin duplicar la cuenta.

La contraseña inicial fue compartida en la conversación: debe rotarse antes de exposición pública. Las pruebas destructivas siguen restringidas a `127.0.0.1:55439/acutis_repair_test`; nunca usar esas pruebas contra Supabase.

## Publicación y pendientes

La publicación autorizada va a `main` mediante avance normal y mensaje `[skip render]`. Debe comprobarse el SHA remoto; un commit local no acredita publicación. Se conserva fuera de la publicación la historia local antigua y los archivos privados. No se llama a hooks, no se crean previews, recursos ni Blueprints.

Auto-Deploy Off, previews manuales y ausencia de Blueprint provienen de la confirmación previa del propietario. No son una inspección técnica del Dashboard durante esta tarea. No se ha solicitado ningún despliegue. `render.yaml` permanece preparado para recursos de producción con coste: no aplicarlo al staging gratuito ni crearlos como parte de esta reparación.

Siguen abiertos el aprovisionamiento remoto bloqueado, la prueba real del proveedor, el despliegue manual futuro y sus pruebas de sesión segura en Render. Los pendientes de seguridad y producción documentados anteriormente, incluida la rotación de credenciales expuestas y la revisión de dependencias, no quedan resueltos por estos cambios.
