# CarloAcutisWeb

Monorepo con el frontend y backend de Carlo Acutis.

- `carlo-front`: aplicacion web Next.js.
- `carlo-back`: API Node.js/Express con Prisma.

El estado de la reparación del chat, los idiomas y las cuentas administrativas se detalla en [docs/CHAT_ADMIN_REPAIR.md](docs/CHAT_ADMIN_REPAIR.md), incluidos los pasos remotos aún pendientes.

La configuración para Supabase y el procedimiento de mantenimiento están en [docs/SUPABASE_RENDER.md](docs/SUPABASE_RENDER.md). Render está preparado para un despliegue manual posterior; la transferencia remota debe verificarse antes de producción.

La reparación y su control de publicación manual en los servicios existentes se
describen en [el runbook de producción](docs/PRODUCTION_CLOSURE_RUNBOOK.md).
Las verificaciones locales no equivalen a una revisión publicada y comprobada.
