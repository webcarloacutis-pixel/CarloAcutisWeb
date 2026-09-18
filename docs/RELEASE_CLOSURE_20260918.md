# Reparación del catálogo: 18 de septiembre de 2026

## Correcciones

Santa Felicidad y Carlo Acutis tenían JSON editorial parcial, pero la ficha accedía directamente a `birthDate.text` y a listas ausentes. La lectura ahora admite esos datos incompletos sin inventar fechas ni fuentes. Editar otro campo administrativo conserva el JSON existente; cambiar el contenido editorial exige validación estricta.

Las tarjetas reservan espacio y muestran la imagen completa con `contain`. Se corrigió el color HSL del fondo tras reproducir el fallo visual. La sesión y el idioma comparten una frontera de Suspense con el contenido para evitar actualizaciones durante la hidratación. Un slug inexistente devuelve HTTP 404 real: Next Proxy comprueba su existencia mediante un HEAD público antes del streaming. Un fallo de conexión no se convierte en un falso 404.

Las nuevas vistas `cards` devuelven 12 elementos por defecto y un máximo de 100 por petición. Búsqueda y filtros se aplican globalmente en SQL. Los cursores están ligados a una revisión del catálogo para no mezclar páginas de versiones distintas. Mapa y selectores usan metadatos ligeros, páginas secuenciales y deduplicación por ID. Se conservan los contratos anteriores. El límite sigue siendo 3000 santos y 3000 milagros; consultar los existentes funciona y crear el registro 3001 se rechaza con un error claro.

Readiness admite PostgreSQL local exclusivamente en loopback para las pruebas desechables. La rama Supabase conserva los controles estrictos de proyecto, rol, CA y TLS. No se cambió la conexión de producción.

## Imágenes: resultados reales en Supabase

- Se completaron las 100 imágenes que faltaban en las 179 fichas existentes, con respaldo, procedencia, licencia y comparación independiente.
- Las 179 imágenes respondieron anónimamente HTTP 200, MIME `image/webp` y se pudieron decodificar. Los 100 archivos nuevos coinciden con los hashes del manifiesto.
- La repetición del plan detectó 100 imágenes reutilizables y cero escrituras, subidas o cambios SQL.
- Se conservaron las 79 fichas ya completas, los demás campos y las tablas relacionadas. Permanecen 179 Saint, 7 Miracle y 1 Prayer. No se creó contenido editorial nuevo ni se repitió la migración.

## Validación

| Comprobación | Resultado |
|---|---|
| Frontend | 236/236 pruebas aprobadas; typecheck, lint y build aprobados |
| Backend | 342/342 pruebas aprobadas, incluida integración con PostgreSQL desechable; typecheck, lint y build aprobados |
| Instalaciones independientes | Ambos proyectos compilan con sus propias dependencias; instalación inicial con caché vacío y locks finales idénticos |
| Navegador | 193 casos únicos aprobados; Chromium, Firefox, WebKit y perfil móvil |
| Fichas | Barrido de las 179 con nombre, imagen decodificada y sin error ni desbordamiento; José, Felicidad y Carlo también con sesión y navegación interna |
| Sesiones | Registro, login correcto e incorrecto, recarga, logout y rechazo de cinco operaciones sobre historial de otra cuenta local |
| Responsive | 1366×768, 1440×900, 768×1024, 360×800, 390×844 y 430×932; comprobaciones de teclado, foco y reflow al 200 % |
| Chat e idiomas | 15 idiomas, acceso público, sugerencias, cancelación, IME/Shift+Enter y conservación del scroll; proveedor IA simulado |
| Escala | Límites 0, 79/7, 100, 101, 179, 1000, 2999, 3000 y 3001 según entidad; altas concurrentes, edición, relaciones y selector completo |
| Operación | SQL caído: health 200 y ready 503; recuperado: ready 200. Limpieza real de expirados e idempotencia en DB desechable |

La suite completa no omite pruebas. La ejecución independiente del backend omite 88 integraciones porque no conecta a SQL; las 342 pruebas completas anteriores sí las ejecutan. En navegador se omiten 36 repeticiones del barrido de 179 fichas en los motores secundarios; sus recorridos representativos sí pasan. La IA simulada, el teclado móvil simulado y el evento Node SIGTERM no se presentan como pruebas de proveedores, dispositivos físicos o señales Linux.

Cobertura de líneas: frontend 48.96 %, backend 86.1 %. La cobertura instrumentada no incluye el navegador y no equivale a corrección total. No se certifica accesibilidad completa: se comprobaron muestras de contraste, foco, teclado y encuadre.

## Rendimiento local

Con 3000 santos y 3000 milagros sintéticos, 40 solicitudes secuenciales después del calentamiento dieron p95 de 258.4 ms, un máximo de 30 357 bytes por página de 12 tarjetas y una conexión estable. CPU: 4,844 s de usuario y 0,734 s de sistema; RSS máximo del proceso de prueba: 340 705 280 bytes. El heap no creció monótonamente en los últimos ciclos; no se forzó GC. Pasan los cinco objetivos previamente definidos. Estas mediciones no acreditan capacidad de Render Free ni carga sostenida de visitantes.

## Pendientes

- Popularidad: cero estimaciones reales y cero llamadas pagadas. El generador tiene metodología, procedencia, persistencia y presupuesto acumulado. Falta autorización específica de hasta US$0,20 y una clave privada disponible. El permiso anterior de US$0,01 era para una única prueba. Mientras no haya puntuaciones, la interfaz identifica el orden alfabético y no lo presenta como popularidad.
- Sigue instalado un aviso alto indirecto de `deepmerge-ts` a través de Prisma 6.19.3: tres entradas de auditoría de la misma cadena. No se observó una entrada HTTP que lo use, pero no se declara resuelto. No se aplicaron downgrades ni `audit fix --force`.
- El CHECK de `deathYear` rechaza valores negativos que el validador contempla. La compatibilidad BCE requiere una decisión y migración autorizada; no se cambió el esquema remoto.
- Faltan señales Linux reales, drenaje de solicitudes activas, dispositivos físicos, carga remota sostenida y comprobación de la lista efectiva de esquemas expuestos en el Dashboard. Los grants revisados no dan a anon/authenticated acceso al esquema `acutis`.
- La versión nueva no está desplegada. Las pruebas locales no constituyen aceptación de producción.

## Despliegue futuro, pendiente de autorización

Se deben actualizar los servicios existentes: **primero backend y después frontend**. El backend conserva los contratos antiguos; el frontend nuevo necesita las vistas `cards`.

| Servicio existente | Root Directory | Build Command | Start Command |
|---|---|---|---|
| Backend | `carlo-back` | `npm ci --include=dev && npm run build && npm run typecheck && npm run lint` | `npm start` |
| Frontend | `carlo-front` | `npm ci --include=dev && npm run typecheck && npm run lint && NODE_ENV=test npm test && npm run build` | `npm start -- --hostname 0.0.0.0` |

No hay predeploy de migración ni nuevas variables obligatorias. No se requiere cambiar credenciales, CA, planes ni recursos. El `render.yaml` histórico prepara servicios de pago: no crear un Blueprint ni aplicarlo a los servicios gratuitos existentes. Tras el despliegue autorizado, comprobar `X-App-Revision` del frontend y `X-Backend-Revision` del backend y repetir el recorrido remoto.

Procedencia y licencias: [registro de imágenes](CATALOG_IMAGE_LICENSES.csv). Metodología: [popularidad](POPULARITY_SAINTS.md).
