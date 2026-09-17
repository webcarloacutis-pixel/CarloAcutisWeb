import { createReadinessCheck } from "./lib/readiness-diagnostics";
import express, { type RequestHandler } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth";
import saintsRouter from "./routes/saints";
import prayersRouter from "./routes/prayers";
import miraclesRouter from "./routes/miracles";
import discoverSaintRouter from "./routes/discover-saint";
import { registerConversationsRoute } from "./routes/conversations";
import { registerAiChatRoute } from "./routes/ai-chat";
import { registerAiTranslateRoute } from "./routes/ai-translate";
import { errorHandler } from "./lib/errors";
import { rateLimit } from "./lib/rate-limit";
import { proxyTrust } from "./lib/client-address";
import { prisma, runtimeDatabaseUrl } from "./lib/prisma";
import { registerPopularityRoute } from "./routes/popularity";
import { aiObservation } from "./lib/ai-observation";
const csrf: RequestHandler = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) { next(); return; }
  const origin = req.get("origin");
  // CLI calls without cookies are allowed; browser cookie mutations require an exact origin.
  if ((origin && origin !== process.env.FRONTEND_ORIGIN) || (!origin && (req.headers.cookie || req.get("sec-fetch-site")))) {
    res.status(403).json({ error: "ORIGIN_REJECTED" }); return;
  }
  if (req.is("application/json") === false && Number(req.get("content-length") || 0) > 0) {
    res.status(415).json({ error: "JSON_REQUIRED" }); return;
  }
  next();
};
export function createApp() {
  const app = express();
  const checkReadiness = createReadinessCheck(() => ({
    connect: () => prisma.$connect(),
    readyQuery: () => prisma.$queryRaw`SELECT 1`,
    schemaQuery: () => prisma.$queryRaw`SELECT 1 FROM "acutis"."Saint" LIMIT 1`,
  }), { env: { ...process.env, DATABASE_URL: runtimeDatabaseUrl } });
  app.disable("x-powered-by");
  app.set("trust proxy", proxyTrust());
  app.use(helmet());
  app.use(cors({
    origin: process.env.FRONTEND_ORIGIN || false, credentials: true,
    exposedHeaders: ["X-Total-Count", "X-Next-Cursor"],
  }));
  app.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    const revision = process.env.RENDER_GIT_COMMIT;
    if (revision && /^[a-f0-9]{40}$/i.test(revision)) res.set("X-Backend-Revision", revision);
    next();
  });
  app.use(cookieParser());
  app.use(aiObservation);
  app.use(csrf);
  app.use(express.json({ limit: "128kb", strict: true }));
  const authAbuse = rateLimit(20, 15 * 60 * 1000);
  const writeAbuse = rateLimit(120, 60 * 1000);
  const discoveryAbuse = rateLimit(20, 60 * 1000);
  app.use((req, res, next) => { if (!["GET","HEAD","OPTIONS"].includes(req.method)) writeAbuse(req,res,next); else next(); });
  app.use(["/auth", "/api/auth"], (req,res,next) => { if (req.method === "POST" && /\/(login|register)$/.test(req.path)) authAbuse(req,res,next); else next(); }, authRoutes);
  app.use(["/saints", "/api/saints"], saintsRouter);
  app.use(["/prayers", "/api/prayers"], prayersRouter);
  app.use(["/miracles", "/api/miracles"], miraclesRouter);
  app.use(["/discover-saint","/descubrir-saint","/api/discover-saint","/api/descubrir-saint"], discoveryAbuse, discoverSaintRouter);
  registerConversationsRoute(app);
  registerAiChatRoute(app);
  registerAiTranslateRoute(app);
  registerPopularityRoute(app);
  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.get("/ready", async (_req, res) => {
    const diagnostic = await checkReadiness();
    if (diagnostic.ready) { res.json({ ok: true }); return; }
    res.status(503).json({ error: "DATABASE_NOT_READY", failureStage: diagnostic.failureStage, safeCode: diagnostic.safeCode });
  });
  app.get("/", (_req, res) => res.json({ service: "Acutis API", health: "/health" }));
  app.use((_req, res) => { res.status(404).json({ error: "NOT_FOUND" }); });
  app.use(errorHandler);
  return app;
}
