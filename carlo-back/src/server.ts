import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import "dotenv/config";
import cookieParser from "cookie-parser";
import { PrismaClient } from "@prisma/client";

import authRoutes from "./routes/auth";
import { registerConversationsRoute } from "./routes/conversations";
import discoverSaintRouter from "./routes/discover-saint";
import saintsRouter from "./routes/saints";
import prayersRouter from "./routes/prayers";
import miraclesRouter from "./routes/miracles";
import { registerAiChatRoute } from "./routes/ai-chat";
import { registerAiTranslateRoute } from "./routes/ai-translate";

// -------------------------
// ADMIN KEY (mínimo para escrituras)
// -------------------------
export function requireAdminKey(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const expected = process.env.ADMIN_KEY;

  // Si no está configurada, NO bloquea (modo dev)
  if (!expected) return next();

  const provided = req.header("x-admin-key");
  if (provided && provided === expected) return next();

  return res.status(401).json({ error: "UNAUTHORIZED" });
}

const app = express();
const prisma = new PrismaClient();

app.use(cookieParser());

// CORS
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3000";
app.use(
  cors({
    // Mantengo tu lista para no romper nada.
    // Si quieres luego, la hacemos más estricta usando FRONTEND_ORIGIN.
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      "http://localhost:3003",
      FRONTEND_ORIGIN,
    ],
    credentials: true,
  })
);

// JSON
app.use(express.json({ limit: "1mb" }));

// -------------------------
// ROUTES (API)
// -------------------------
// Routes
app.use("/api/auth", authRoutes);

// Saints (nuevo + legacy)
app.use("/api/saints", saintsRouter);
app.use("/saints", saintsRouter);

// Prayers (nuevo + legacy)
app.use("/api/prayers", prayersRouter);
app.use("/prayers", prayersRouter);

// Miracles (nuevo + legacy)
app.use("/api/miracles", miraclesRouter);
app.use("/miracles", miraclesRouter);

// Discover Saint (nuevo + legacy, dos idiomas)
app.use("/api/discover-saint", discoverSaintRouter);
app.use("/api/descubrir-saint", discoverSaintRouter);
app.use("/discover-saint", discoverSaintRouter);
app.use("/descubrir-saint", discoverSaintRouter);

// Conversations
registerConversationsRoute(app);

// AI
registerAiChatRoute(app);
registerAiTranslateRoute(app);


  registerDebugEgressRoute(app);
// Discover Saint (montado en 2 paths por compatibilidad)
app.use("/api/discover-saint", discoverSaintRouter);
app.use("/api/descubrir-saint", discoverSaintRouter);

// -------------------------
// ROUTES (LEGACY SIN /api)
// Esto arregla el "Cannot GET /saints" del front viejo.
// -------------------------
app.use("/auth", authRoutes);
app.use("/saints", saintsRouter);
app.use("/prayers", prayersRouter);
app.use("/miracles", miraclesRouter);
app.use("/discover-saint", discoverSaintRouter);
app.use("/descubrir-saint", discoverSaintRouter);

// Health / root
app.get("/health", (_req: Request, res: Response) => res.json({ ok: true }));

app.get("/", (_req: Request, res: Response) => {
  res.send(
    "Acutis API OK ✅ Usa /health, /api/saints (o /saints), /api/prayers (o /prayers), /api/miracles (o /miracles), /api/discover-saint (o /discover-saint)"
  );
});

// Graceful shutdown
process.on("SIGINT", async () => {
  try {
    await prisma.$disconnect();
  } finally {
    process.exit(0);
  }
});

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Backend Acutis corriendo en puerto ${PORT}`);
});
import { registerDebugEgressRoute } from "./routes/debug-egress";
