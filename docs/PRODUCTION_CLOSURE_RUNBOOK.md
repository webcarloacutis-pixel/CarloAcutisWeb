# Operación y verificación de la reparación

Los recursos existentes son `acutis-api-staging.onrender.com`,
`acutis-front-staging.onrender.com` y el proyecto Supabase
`rquzpsjismymbyijwhgj`. El nombre «staging» no autoriza sustituirlos. El blueprint
histórico `render.yaml` describe una propuesta distinta y **no debe aplicarse**
para esta reparación.

## Control de publicación

1. Comprobar en Render los dos IDs, revisión, deploy anterior recuperable,
   rama, root directory (`carlo-back` / `carlo-front`), Node24, build/start,
   puerto y variables efectivas, incluidos grupos y duplicados. Comprobar
   autodeploy desactivado antes de push conectado. No imprimir valores secretos.
2. Ejecutar `npm ci` en ambos proyectos con Node24.21.0. El frontend aplica
   automáticamente el backport revisado de `braces`; `npm run
   test:dependency-security` verifica todas las copias seleccionadas y las
   regresiones. Si se usó `--ignore-scripts`, ejecutar explícitamente el
   postinstall inspeccionado antes de los checks. El build rechaza una copia sin
   parche o bytes desconocidos.
3. Ejecutar lint, tipos, unitarias, integración SQL, capacidad aislada y build.
   La suite backend requiere dos destinos distintos: reparación y capacidad
   vacía. Ejecutar el conjunto general excluyendo únicamente
   `saint-service.integration.test.ts` y `catalog-scale.integration.test.ts`
   en `acutis_repair_test`; ejecutar esos dos archivos en
   `acutis_catalog_capacity_test`. Ambos destinos deben ser loopback:55439,
   TLS verificado y `ACUTIS_INTEGRATION_TEST=1`. La copia auténtica para navegador
   usa otra BD local. Nunca ajustar una aserción de identidad para aceptar
   producción ni ejecutar fixtures allí.
4. Revisar y registrar la revisión final, sin archivos privados, credenciales,
   copias de base, logs o conversaciones. Si la integración cambia el árbol,
   repetir los checks afectados sobre ese árbol.
5. Desplegar manualmente backend; comprobar readiness y contratos antiguos y
   nuevos. Después desplegar frontend y comprobar el conjunto. Las comprobaciones
   locales y el build no sustituyen esta aceptación remota.

En backend, `npm run build` genera Prisma y empaqueta el servidor; no ejecuta
migraciones. Esta entrega no aplica migraciones ni cambia roles/RLS de producción.
En frontend, configurar el destino público HTTPS del backend existente y
`CATALOG_STORAGE_PROVIDER=supabase`; los caminos lógicos `/catalog/...` de la BD
se conservan. Una compilación con proveedor local no acredita el bucket remoto.

## Aceptación remota

Comprobar `X-App-Revision` y `X-Backend-Revision` emitidos desde el commit real
de Render. No fijar cabeceras para simular una revisión. `/health` es liveness;
`/ready` comprueba conexión, consulta y esquema. Ante fallo, conserva stage/código
seguro y devuelve 503 con Retry-After 5. El diagnóstico tiene un presupuesto global
de 15 s; no es una garantía de disponibilidad.

Comparar IDs, relaciones, aprobaciones y hashes completos del catálogo con el
inventario inmediatamente anterior. Al reactivar Supabase el 10 oct 2026 UTC se
verificaron 179 Saint (175 personas, 3 arcángeles, 1 colectivo), 7 milagros aprobados y
1 oración aprobada. Es una observación fechada, no una meta a imponer mediante
creación, borrado o importación. Recorre páginas, filtros, fichas e imágenes en
navegador; comprobar200 de la portada no basta.

Verificar el 401 anónimo esperado, login/logout, sesión al recargar, propiedad de
conversaciones y acceso administrativo con sesiones ya autorizadas. No crear
cuentas ficticias ni contenido en producción. Para IA real obtener antes un
presupuesto explícito de chat, máximo de solicitudes/tokens y cuenta de prueba
autorizada. Las simulaciones locales prueban protocolo/seguridad; no acreditan
credencial, modelo, respuesta real ni gasto del proveedor.

Observa logs nuevos durante una ventana acotada y registra duración/tráfico.
No hacer carga en producción ni confundir negativas intencionales con incidentes.
Un 429 histórico no tiene causa probada sólo porque cambió un limiter. Los GET,
HEAD y OPTIONS del catálogo quedan fuera del limiter de escrituras.

## Límites, cuotas y recuperación

El modelo predeterminado del código sigue siendo `gpt-4o-mini`; el modelo y los
límites efectivos de Render deben comprobarse antes de generar una respuesta real.
El timeout de proveedor configurable es, por defecto, 25 s,
presupuesto total 30 s incluyendo SQL, y como máximo dos operaciones concurrentes
por defecto. El presupuesto total deja margen frente a los 35 s del proxy. Las
cuotas SQL predeterminadas son 20 chats/día por identidad y 100 intentos de proveedor
al día, compartidas entre réplicas. El limiter HTTP de chat es 10 POST/minuto;
los duplicados completados no consumen una segunda unidad de cuota diaria de
chat. Los límites en Map son por proceso y no equivalen a un limiter distribuido.
No desactivar cuotas ni habilitar reintentos automáticos para conseguir una
respuesta.

Una consulta PostgreSQL ya enviada no se cancela con Promise.race. Si una toma
de lease confirma tarde tras cancelación, puede retener conservadoramente el
slot hasta su expiración acotada; la operación cancelada no inicia el proveedor.
Los errores de liberación se registran y no reemplazan la causa principal. No
prometer entrega exactamente una vez ante caída de persistencia tras cobro.

Los planes efectivos, memoria, límites, retención, suspensión y artefactos de
rollback deben comprobarse en las cuentas existentes. [Supabase documenta la
pausa de proyectos gratuitos](https://supabase.com/docs/guides/platform/free-project-pausing)
y [Render describe el arranque tras inactividad](https://render.com/docs/free).
No instalar pings para eludir restricciones ni contratar upgrades implícitos.
Las medidas de capacidad local no prueban miles de usuarios concurrentes.

Si la base está pausada, inspeccionar su estado y pedir una sola reactivación
normal del mismo proyecto dentro de la autorización; esperar con checks
acotados. Nunca restaurar una copia antigua, resetear ni sembrar para arreglar
readiness. Si la reactivación exige pago o cambio de infraestructura, detener esa
operación y continuar tareas independientes.

## Reversión y respaldos

Registrar deploy IDs y confirmar artefactos recuperables antes de publicar.
Los nuevos contratos `view=cards` no funcionan con la antigua revisión 9dc6b576:
si hay que volver ambos servicios, restaurar primero un frontend compatible,
después el backend anterior y verificar el conjunto. Un backend nuevo compatible
puede mantener las lecturas del frontend anterior mientras se investiga un fallo.
Confirmar el SHA real del frontend en Render: la comparación estática con 9dc6b576
es histórica. Su modal antiguo reenvía todos los campos, incluso valores
normalizados; la preservación por omisión del nuevo PATCH no puede inferir su
intención. No ejecutar escrituras administrativas durante la transición ni
atribuir esa protección a un cliente antiguo. Antes de editar, cargar el frontend
nuevo y comprobar su revisión.
No avanzar de etapa cuando el deploy previo falla.

[El rollback de Render](https://render.com/docs/rollbacks) recupera código y su
artefacto disponible; no restaura PostgreSQL ni Storage. Conservar separadas la
reversión de código, variables y datos. Verificar respaldos y probar restauración
sólo en un destino aislado, nunca sobre la BD actual. No añadir alertas/canales
externos ni comunicaciones sin autorización; si faltan herramientas disponibles,
registrar el pendiente operativo.

## Riesgos y decisiones explícitas

El backport local de `braces@3.0.3` mantiene el nombre/version y la alerta npm
GHSA-vfj7-8cjw-p6xm visible. Procedencia, MIT, diff y límites están en
`carlo-front/vendor/braces/SECURITY.md`; sustituirlo por una versión oficial
corregida cuando exista y pase las mismas regresiones. Los plugins de lint de
Next declaran peers hasta ESLint9; se conserva ESLint10 mantenido con el wrapper
de compatibilidad ya existente y comprobación real de lint. Conservar las
advertencias y revisar una actualización oficial compatible cuando aparezca.

La revalidación halló permiso DML de `acutis_app` sobre `_prisma_migrations`.
Existe un candidato mínimo de REVOKE probado localmente; requiere aprobación
específica antes de producción. El CHECK positivo de `deathYear` también difiere
de la capacidad BCE del validador y requiere decisión de esquema explícita.
No modificar estos controles como efecto lateral de un despliegue de código.

Sin cambiar el esquema, una escritura de santo con un año de fallecimiento BCE
explícito que encuentra el rechazo exacto `Saint_deathYear_check` devuelve ahora
400 `INVALID_NUMBER`. La aplicación conserva la fila y muestra un error localizado;
no ofrece soporte de persistencia BCE. Otros errores de restricciones continúan
siendo 500 y los fallos de conexión, 503. Mantener esa clasificación precisa y sus
regresiones SQL; no convertir todos los errores Prisma en entradas inválidas.
