import { Application, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const COOKIE_NAME = "carlo_token";

function getUserId(req: any): string | null {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    return payload?.uid ? String(payload.uid) : null;
  } catch {
    return null;
  }
}

function requireAuth(req: any, res: Response): string | null {
  const uid = getUserId(req);
  if (!uid) {
    res.status(401).json({ error: "not authenticated" });
    return null;
  }
  return uid;
}

export function registerConversationsRoute(app: Application) {
  // LIST conversations (sin mensajes)
  app.get("/conversations", async (req: Request, res: Response) => {
    const userId = requireAuth(req, res);
    if (!userId) return;

    const conversations = await prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    });

    res.json({ conversations });
  });

  // CREATE/UPSERT conversation
  // body: { id?: string, title?: string }
  app.post("/conversations", async (req: Request, res: Response) => {
    const userId = requireAuth(req, res);
    if (!userId) return;

    const { id, title } = (req.body ?? {}) as { id?: string; title?: string };
    const safeTitle = (title && String(title).trim()) || "Nueva conversación";

    if (id) {
      const conversation = await prisma.conversation.upsert({
        where: { id: String(id) },
        create: { id: String(id), title: safeTitle, userId },
        update: { title: safeTitle },
        select: { id: true, title: true, createdAt: true, updatedAt: true },
      });
      return res.json({ conversation });
    }

    const conversation = await prisma.conversation.create({
      data: { title: safeTitle, userId },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    });

    res.json({ conversation });
  });

  // RENAME
  app.patch("/conversations/:id", async (req: Request, res: Response) => {
    const userId = requireAuth(req, res);
    if (!userId) return;

    const id = String(req.params.id);
    const { title } = (req.body ?? {}) as { title?: string };
    const safeTitle = (title && String(title).trim()) || "Nueva conversación";

    const owned = await prisma.conversation.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!owned) return res.status(404).json({ error: "not found" });

    const conversation = await prisma.conversation.update({
      where: { id },
      data: { title: safeTitle },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    });

    res.json({ conversation });
  });

  // DELETE conversation (y sus mensajes)
  app.delete("/conversations/:id", async (req: Request, res: Response) => {
    const userId = requireAuth(req, res);
    if (!userId) return;

    const id = String(req.params.id);
    const owned = await prisma.conversation.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!owned) return res.status(404).json({ error: "not found" });

    await prisma.message.deleteMany({ where: { conversationId: id } });
    await prisma.conversation.delete({ where: { id } });

    res.json({ ok: true });
  });

  // LIST messages
  app.get("/conversations/:id/messages", async (req: Request, res: Response) => {
    const userId = requireAuth(req, res);
    if (!userId) return;

    const id = String(req.params.id);
    const owned = await prisma.conversation.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!owned) return res.status(404).json({ error: "not found" });

    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "asc" },
      select: { id: true, role: true, content: true, createdAt: true },
    });

    res.json({ messages });
  });

  // CREATE message (auto-crea conversación si no existe)
  app.post("/conversations/:id/messages", async (req: Request, res: Response) => {
    const userId = requireAuth(req, res);
    if (!userId) return;

    const conversationId = String(req.params.id);
    const { role, content, title } = (req.body ?? {}) as {
      role?: "user" | "assistant";
      content?: string;
      title?: string;
    };

    if (!role || !content) {
      return res.status(400).json({ error: "role and content required" });
    }

    // asegura que la conversación exista y sea del user
    const conv = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      select: { id: true },
    });

    if (!conv) {
      await prisma.conversation.create({
        data: {
          id: conversationId,
          userId,
          title: (title && String(title).trim()) || "Nueva conversación",
        },
      });
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        role: role === "assistant" ? "assistant" : "user",
        content: String(content),
      },
      select: { id: true, role: true, content: true, createdAt: true },
    });

    // toca updatedAt de la conversación
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    res.json({ message });
  });
}
