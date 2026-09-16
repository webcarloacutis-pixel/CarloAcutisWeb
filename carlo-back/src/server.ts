import "dotenv/config";
import { createApp } from "./app";
import { validateEnvironment, intSetting } from "./lib/config";
import { prisma } from "./lib/prisma";
validateEnvironment();
const port = intSetting("PORT", 3001, 1, 65535);
const server = createApp().listen(port, process.env.HOST || "0.0.0.0", () => {
  console.log("API_LISTENING", { port });
});
server.requestTimeout = 35000;
server.headersTimeout = 10000;
server.keepAliveTimeout = 5000;
let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  const deadline = setTimeout(() => { server.closeAllConnections(); process.exit(1); }, 35000);
  deadline.unref();
  server.close(async () => {
    try { await prisma.$disconnect(); clearTimeout(deadline); process.exit(0); }
    catch { process.exit(1); }
  });
  server.closeIdleConnections();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
