# Diagnóstico de readiness de PostgreSQL

`GET /ready` devuelve `{"ok":true}` cuando todas las comprobaciones pasan. Si falla, devuelve HTTP 503 con `error: DATABASE_NOT_READY`, `failureStage` y `safeCode`. El servidor emite un único objeto `DB_READINESS_DIAGNOSTIC`; no imprime mensajes originales, URL, credenciales, hostname, direcciones ni contenido de certificados. `/health` sigue comprobando únicamente el proceso HTTP.

Las etapas son ENV_CONFIGURATION, CERTIFICATE_FILE, X509_PARSE, DNS_RESOLUTION, TCP_CONNECTION, TLS_HANDSHAKE, TLS_HOSTNAME_VERIFICATION, PRISMA_INITIALIZATION, DATABASE_AUTHENTICATION, DATABASE_CONNECTION, READY_QUERY y SCHEMA_ACCESS. Se registra la primera etapa que falla. Una autenticación rechazada puede reconocerse por P1000, SQLSTATE de clase 28 o un patrón interno; nunca se registra el mensaje original. Si Node TLS pasa pero el motor Prisma rechaza TLS, la etapa es PRISMA_INITIALIZATION, con P1011 o PRISMA_TLS_ERROR cuando estén disponibles.

La comprobación de identidad de la CA usa `crypto.X509Certificate.fingerprint256`, no el hash del archivo PEM. LF/CRLF o espacios pueden cambiar el hash del archivo sin cambiar el certificado. La huella DER esperada es:

`80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA`

La CA pública completa está versionada en `carlo-back/certs/supabase-prod-ca-2021.crt`; no requiere Secret Files. Con Root Directory `carlo-back`, el backend resuelve `certs/supabase-prod-ca-2021.crt` desde su directorio de trabajo. En Render la ruta absoluta es `/opt/render/project/src/carlo-back/certs/supabase-prod-ca-2021.crt`. Para `DATABASE_PROVIDER=supabase`, Prisma fija `sslcert` a esa ruta local del paquete y readiness comprueba la misma URL efectiva; se conservan sslmode=require, sslaccept=strict, schema=acutis, el rol limitado, el proyecto autorizado y Session Pooler en 5432. La prueba TCP/TLS usa únicamente el destino configurado. Envía PostgreSQL SSLRequest, exige la respuesta S y solo entonces inicia TLS con CA, SNI y rejectUnauthorized=true. No hay fallback sin cifrado. Los sockets de diagnóstico siempre se cierran, incluso si fallan o agotan el tiempo.

DNS dispone de 3 segundos, TCP de 5 y TLS de 7. La conexión Prisma dispone de 10 segundos y cada consulta de 2. Las solicitudes concurrentes comparten una comprobación y el resultado se conserva 5 segundos. No se crean clientes Prisma adicionales en el endpoint. Las únicas consultas de aplicación son SELECT 1 y SELECT 1 FROM acutis."Saint" LIMIT 1; la segunda prueba acceso real al esquema sin leer ni publicar fichas.

## Causa reproducida del certificado cargado

La evidencia proporcionada del servicio mostraba 1312 bytes y SHA-256 `63a54d43edcd6446f9e9b11917890cc736c0f53cde06e897da7ce51fc0ff9370`. Ese tamaño y hash coinciden exactamente con el cuerpo Base64 del certificado local después de quitar las líneas delimitadoras PEM. `X509Certificate` rechaza ese contenido: X509_PARSE / CA_PARSE_ERROR.

El PEM completo local tiene 1367 bytes y SHA-256 `700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7`. Conservando URL, credencial, cliente y consultas, sustituir únicamente los bytes de la copia local de prueba por el PEM completo permitió completar DNS/TCP/TLS estricto, Prisma, SELECT 1 y acceso al esquema real. No hubo escrituras, cambios de contraseña, migraciones ni despliegue Render.

**Corrección versionada:** el certificado completo se distribuye con el código y su fingerprint se verifica en tests con `X509Certificate`. La URL preparada para Render apunta al archivo del repositorio. El Secret File antiguo deja de intervenir en la conexión. Esta publicación no modifica Render, no elimina recursos y no inicia un despliegue.

Un fingerprint diferente requiere revisar el archivo cargado; un fingerprint coincidente permite avanzar a la siguiente etapa aunque el hash del archivo cambie. Una etapa identifica la operación fallida, no siempre un único motivo externo: no se infiere una contraseña incorrecta o una CA distinta sin evidencia.

Las pruebas generan certificados y claves efímeros solo en un directorio temporal local; no utilizan secretos reales ni escriben en Supabase. Cubren PEM sin delimitadores, archivos ausentes o inválidos, CRLF/LF, expiración, DNS, TCP, handshake PostgreSQL, hostname incorrecto con validación real, rechazo de contraseña simulado, acceso denegado al esquema y consultas correctas.
