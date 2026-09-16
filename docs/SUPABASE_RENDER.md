# Migración del contenido existente y preparación de Render

Destino autorizado: `rquzpsjismymbyijwhgj`. La ampliación editorial a 200 entradas está cancelada. Este procedimiento copia contenido existente; no ejecuta semillas, generación de texto, popularidad ni trabajos de IA.

La arquitectura conserva navegador → Next.js → Express privado → PostgreSQL de Supabase. Prisma 6.19.3 sigue siendo la autoridad del esquema; las tablas de aplicación se alojan en el esquema `acutis`. Los esquemas gestionados por Supabase quedan fuera de la transferencia. La autenticación y las sesiones siguen perteneciendo al portal, no a Supabase Auth.

## Estado y origen verificados

La fuente está en PostgreSQL local `127.0.0.1:55439/acutis_editorial_local`, en la copia reparada. El recuento SQL inicial contiene 80 filas Saint: 76 personas, 3 arcángeles y una copia de prueba explícitamente documentada. El manifiesto autorizado para la transferencia contiene 79 fichas, 7 milagros, 1 oración y 79 registros CatalogImport. Hay 79 imágenes públicas existentes. No hay usuarios ni conversaciones en esa fuente. Las 12 sesiones locales no son credenciales de producción y se excluyen conservándolas en el respaldo.

La base `acutis_repair_test` es desechable y no es fuente editorial. Los lotes preparados que nunca fueron incorporados no amplían el catálogo migrado; se conservan como historial privado. La configuración Compose antigua de OneDrive no prueba que exista contenido en Docker.

Se verificaron un dump consistente y su restauración en una base nueva, con igualdad de huellas de las 17 tablas y checksums de las 11 migraciones. Los bytes de las imágenes se respaldaron por separado. Los resultados remotos solo pueden declararse completos después de conectar y verificar Supabase; un ensayo local no demuestra la migración remota ni un despliegue Render.

## Credenciales y conexión

Use Connect del proyecto exacto para obtener la conexión directa o Session Pooler. No construya un hostname de pooler a partir de una región. La conexión directa de este proyecto resuelve a IPv6; Session Pooler es la alternativa si el equipo no alcanza IPv6. No contrate el complemento IPv4 para el ensayo.

La configuración del operador se guarda en `.audit/acutis-migration-existing/local/destination-connection.json`, ignorada por Git. Contiene `projectRef`, `host`, `port` (5432), `dbname` (postgres), `user`, `password`, `sslrootcert` si es necesario y `storageSecret` si las operaciones de Storage la requieren. Los valores se introducen en ese archivo privado o en un gestor de secretos. No se ponen en comandos, chat, Git ni variables públicas del navegador.

El operador Python exige `verify-full`; Prisma 6 exige `sslmode=require&sslaccept=strict` y `sslcert` cuando el endpoint necesita una CA explícita. Nunca se acepta un certificado inválido. La CA se obtiene del panel autorizado y se configura por su ruta real.

`DATABASE_URL` pertenece al runtime y utiliza el rol limitado `acutis_app`, el esquema `acutis` y el proyecto exacto. Su contraseña es distinta de mantenimiento. El pool queda acotado a cinco conexiones por proceso, con espera y conexión de diez segundos. Multiplique el límite por el número real de procesos/réplicas antes de dimensionar. `DIRECT_URL` solo se carga en el proceso separado de mantenimiento; el API rechaza cargarlo junto con sus credenciales runtime.

El rol runtime tiene USAGE del esquema y CRUD de las tablas de aplicación; carece de CREATE, privilegios de roles y acceso a `_prisma_migrations`. Las cuentas anon/authenticated no reciben acceso al esquema. No exponga `acutis` en Data API. Si alguna otra aplicación requiere Data API, conserve su configuración y compruebe que las tablas de esta aplicación siguen inaccesibles. Verifique esos permisos y peticiones con la clave pública en el proyecto real antes de producción.

## Operación de transferencia

El dump, los exports, el manifiesto inmutable y todos los resultados con datos pertenecen exclusivamente a la carpeta privada ignorada. Instale las dependencias del operador con `python -m pip install -r scripts/requirements-migration.txt` en su entorno de mantenimiento, si faltan. La aplicación no necesita esta dependencia Python.

El importador recibe explícitamente `--snapshot`, `--manifest`, `--config` y `--output`, todos apuntando a archivos privados. Sin `--execute` hace una vista previa. `--prepare` crea únicamente el esquema de aplicación e invoca `prisma migrate deploy`; se niega a preparar sobre un destino poblado hasta resolver su respaldo y reconciliación. No use reset, restores con clean ni db push con pérdida de datos.

```powershell
python scripts/migrate-existing.py --snapshot <carpeta-snapshot-privada> --manifest <MIGRATION_MANIFEST.json-privado> --config <conexion-privada.json> --output <evidencia-privada>
```

Antes de `--prepare --execute`, revise la vista previa, la identidad y estado del destino, el respaldo restaurable del origen y, si hay tablas destino, su respaldo con herramientas compatibles con la versión del servidor. Un destino existente requiere revisión específica, no sobrescritura automática.

El script conserva IDs, slugs, texto y marcas de tiempo; bloquea filas divergentes y preserva filas ajenas al lote. Procesa transacciones de veinte filas, registra checkpoints y repite el lote para demostrar idempotencia. Las migraciones se aplican por Prisma; `_prisma_migrations` no se copia como datos ni se alteran sus checksums. Compare nuevamente el origen con el snapshot al final para detectar escrituras posteriores.

Storage usa la API oficial y el bucket público `acutis-catalog` exclusivamente para las imágenes que ya eran públicas. Cada objeto conserva la clave relativa bajo `/catalog/`, MIME, tamaño y SHA-256. Las colisiones con bytes distintos bloquean la transferencia; no se usa upsert ni se eliminan objetos para compensar fallos. Solo se leen los bytes respaldados: no hay búsqueda, descarga de imágenes nuevas ni sustitución editorial. Un archivo privado exige una estrategia privada separada; esta transferencia no modifica su visibilidad.

`CATALOG_STORAGE_PROVIDER=supabase`, fijado al compilar Next, dirige `/catalog/*` al proyecto y bucket exactos mediante `beforeFiles`. Conserva las rutas guardadas en SQL y las atribuciones. Si Storage falla, no sirve en silencio la copia del disco. En desarrollo local se usa explícitamente `local`. Cambiar este valor exige reconstruir el frontend.

## Render: preparar, no desplegar

`render.yaml` define Next dinámico público y Express privado en la misma región, con comunicación same-origin por el proxy de Next. No define una base Render ni `fromDatabase`, ni migraciones en build/start/preDeploy. Ambos servicios tienen `autoDeployTrigger: off`. Crear esos servicios o seleccionar planes genera recursos y requiere la aprobación posterior del propietario.

El plan propuesto `1c-2g` por servicio se conserva para revisión; no se ha contratado ni validado su capacidad o costo total. Los resultados locales no certifican estabilidad de memoria o capacidad en Render. No configure autoscaling ni add-ons durante esta fase.

| Servicio | Configuración privada/manual | Configuración incluida |
|---|---|---|
| Express | `DATABASE_URL` del rol acutis_app; `FRONTEND_ORIGIN` HTTPS exacto; secretos JWT/admin nuevos | Node 24, HOST 0.0.0.0, PORT 10000, pool 5, IA desactivada, TRUST_PROXY_HOPS=0 |
| Next | `NEXT_PUBLIC_SITE_URL` HTTPS del sitio | BACKEND_HOSTPORT desde el servicio privado, Storage supabase, analítica desactivada, FORWARD_TRUSTED_IP=false |
| Mantenimiento separado | `DIRECT_URL` y CA; credencial Storage del operador si hace falta | Prisma migrate deploy e importación manual controlada |

Los comandos de instalación, compilación y arranque están en el Blueprint y en package.json. La readiness pública es `/api/ready`; Express ofrece `/ready` y `/health`. El cierre de la API espera solicitudes en curso y desconecta Prisma dentro del plazo de apagado configurado. Las cookies en producción usan Secure, HttpOnly y SameSite=Lax; las escrituras comprueban Origin.

El ingreso real de Render y sus direcciones proxy siguen pendientes de verificación. No habilite confianza de IP hasta conocer los saltos y pares efectivos; no confíe en cabeceras arbitrarias de Internet.

Modificar el YAML no desactiva Auto-Deploy de servicios que ya existen. Antes del push a una rama conectada, abra Render → servicio → Settings → Build & Deploy → Auto-Deploy y compruebe Off. Revise también previews y cualquier automatización vinculada a ramas/PR.

## Pruebas y reversión

Ejecute build, typecheck, lint y test de ambos paquetes. Las integraciones de escritura están limitadas por código a bases desechables locales. Los casos de navegador aceptan `ACUTIS_BROWSER_ORIGIN` y `ACUTIS_CATALOG_SNAPSHOT` con un snapshot privado de las fichas ya incorporadas. La mutación de una copia en el test de catálogo exige explícitamente una base `acutis_migration_transfer_*` local y `ACUTIS_CATALOG_MUTATION_TEST=isolated`. No apunte una suite de fixtures a Supabase.

En Supabase, compruebe conteos y huellas de todas las entidades del lote, sus relaciones, descargas de todas las imágenes, lectura por API y presentación de cada ficha, permisos públicos denegados y reinicio de la aplicación. Pruebe edición administrativa en una copia aislada con el mismo esquema. Las pruebas de HTTP local no prueban cookies HTTPS ni el ingreso Render.

Ante una incidencia, detenga el siguiente lote y preserve checkpoints. Restaure a una base nueva si necesita ensayar recuperación. No borre el origen ni los objetos del destino. Para revertir una aplicación desplegada posteriormente, recupere la versión anterior y su configuración conocida; reconcilie primero cualquier escritura posterior al corte. No active un fallback automático a datos locales.

## Publicación segura

Los commits locales anteriores contenían secretos de ensayo y no deben empujarse. Conserve su bundle privado y publique el estado final revisado desde una rama saneada basada en el remoto autorizado. Excluya todos los dumps, auditorías privadas, credenciales, cookies y catálogos exportados. No haga force-push ni modifique protecciones. Verifique permisos de escritura, efectos de despliegue, todos los commits nuevos y el SHA remoto después del push. Si hay secretos ya expuestos en la historia remota, deben rotarse; este procedimiento no reescribe esa historia.

Referencias: [conexiones Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres), [Prisma](https://supabase.com/docs/guides/database/prisma), [seguridad de Data API](https://supabase.com/docs/guides/api/securing-your-api), [Storage](https://supabase.com/docs/guides/storage/security/access-control), [Blueprint Render](https://render.com/docs/blueprint-spec), [despliegues Render](https://render.com/docs/deploys).

## Incidencia de dependencias pendiente

La auditoría npm del estado preparado registra cero vulnerabilidades de producción en frontend y tres entradas altas en backend, correspondientes a una sola cadena: prisma → @prisma/config → deepmerge-ts. El aviso [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx) afecta a deepmerge-ts anterior a 8.0.0 y requiere objetos JavaScript con referencias cíclicas; JSON ordinario no representa esas referencias. La reproducción local confirmó el fallo de la biblioteca. Instanciar PrismaClient no cargó @prisma/config; esto acota la evidencia y no demuestra por sí solo la ausencia de toda vía de explotación HTTP.

La incidencia histórica ACUTIS-013 permanece abierta. npm propone retroceder Prisma a 6.12.0; no se aplica automáticamente una regresión de la herramienta de esquema ni un override de versión mayor sin validar compatibilidad. Antes del despliegue deben revisarse una actualización compatible y las pruebas de configuración, generación, migraciones y runtime. Las comprobaciones locales satisfactorias de esta migración no equivalen a un cierre de seguridad ni a una certificación de producción.

La preparación del esquema se bloquea también si encuentra objetos desconocidos existentes. Las restricciones de PUBLIC, anon y authenticated se aplican antes de insertar contenido. La prueba administrativa que crea una copia temporal exige además el origen local explícito http://127.0.0.1:3150.

La revisión del historial remoto detectó una contraseña administrativa literal antigua en carlo-front/lib/auth.tsx. El estado reparado elimina esa autenticación del navegador, pero la historia pública conserva el valor. No reutilice esa contraseña: rote cualquier credencial que la hubiera usado antes de producción. La publicación saneada no pretende limpiar ni reescribir la historia remota.

## Migración real verificada — 16 de septiembre de 2026

Se ejecutó la transferencia al proyecto autorizado: 79 Saint (76 personas y 3 arcángeles), 7 Miracle, 1 Prayer y 79 CatalogImport. La segunda pasada reutilizó las 166 filas sin inserciones, duplicaciones ni diferencias. Se conservaron las exclusiones de la copia de prueba y las sesiones locales. No se generó contenido editorial nuevo.

Las 79 imágenes WebP existentes se copiaron al bucket público acutis-catalog. Se verificaron MIME, tamaño y SHA-256 de cada objeto tanto mediante descarga pública sin claves como a través de la web. La identidad del destino y la conexión cliente–Session Pooler se comprobaron con TLS 1.3 y verify-full; la CA se obtuvo por HTTPS desde la URL utilizada por el panel oficial de Supabase. La observación pg_stat_ssl corresponde al enlace interno pooler–PostgreSQL y no debe confundirse con el TLS del cliente.

Antes de escribir se inventarió y respaldó el destino PostgreSQL 17.6 con pg_dump 17.11, snapshot consistente y comprobación completa del archivo. No existían tablas de aplicación, usuarios de Auth ni objetos de Storage. El dump remoto se decodificó íntegramente a SQL; no se ensayó su restauración de extensiones gestionadas por Supabase. El respaldo del origen sí fue restaurado y verificado previamente, y sus 17 tablas continúan intactas.

Las comparaciones de filas fijan extra_float_digits=3: la configuración inicial del destino redondeaba la salida JSON aunque los bits almacenados de las coordenadas fueran exactos. Se confirmó la igualdad binaria y se verificó la corrección en una base local desechable. No se introdujeron tolerancias ni cambios de coordenadas. Los MIME ausentes se completaron a partir de la firma RIFF/WEBP y los hashes respaldados; los bytes no cambiaron.

El rol acutis_app tiene lectura/escritura de aplicación, sin CREATE, privilegios administrativos ni acceso a _prisma_migrations. anon y authenticated no pueden leer acutis; Data API rechaza el esquema con PGRST106. El archivo privado generado para el runtime excluye la clave privilegiada de Storage.

La web servida desde el worktree saneado, conectada al Supabase real, pasó 85 pruebas de navegador: todas las fichas e imágenes, campos administrativos, paginación, búsqueda, filtros, mapa, milagros, oraciones y versículos. Las verificaciones administrativas cierran su propia sesión. Un reinicio de Next y Express conservó los datos y el funcionamiento de login/logout. Se usó HTTP exclusivamente en loopback para la prueba local; esto no prueba cookies HTTPS, ingreso, memoria ni capacidad en Render.

Las pruebas que crean/editar/eliminan copias se mantuvieron en la base local desechable. Las nuevas pruebas catalog-live-readonly.spec.ts solo leen el contenido del snapshot existente. Los resultados privados, credenciales, dumps y manifiestos permanecen fuera de Git.

La migración no cierra ACUTIS-013 ni la revisión de credenciales históricas. Render continúa preparado, sin despliegue ni contratación. La publicación requiere comprobar Auto-Deploy y previews de los servicios conectados; el YAML no acredita su estado remoto.
