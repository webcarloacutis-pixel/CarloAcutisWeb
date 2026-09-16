import { Router, type Application } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../lib/session";
import { HttpError } from "../lib/errors";
import { id, objectBody, text } from "../lib/validation";
import { pageArgs, sendPage } from "../lib/pagination";
const summary = { id: true, title: true, createdAt: true, updatedAt: true } as const;
const messageFields = { id: true, role: true, content: true, createdAt: true } as const;
export function conversationsRouter() {
  const router = Router();
  router.use(requireAuth);
  router.get("/", async (req, res) => {
    const { limit, query } = pageArgs(req);
    const where = { userId: res.locals.userId as string };
    const [rows, total] = await prisma.$transaction([
      prisma.conversation.findMany({ where, ...query, select: summary }),
      prisma.conversation.count({ where }),
    ]);
    res.json({ conversations: sendPage(res, rows, total, limit) });
  });
  router.post("/", async (req, res) => {
    const body = objectBody(req.body, ["id", "title"]);
    const userId = res.locals.userId as string;
    const conversationId = body.id === undefined ? undefined : id(body.id);
    const title = text(body.title, 150) || "Nueva conversación";
    const conversation = await prisma.$transaction(async (tx) => {
      if (conversationId) {
        const existing = await tx.conversation.findUnique({ where: { id: conversationId }, select: { userId: true } });
        if (existing && existing.userId !== userId) throw new HttpError(404, "NOT_FOUND");
        if (existing) return tx.conversation.update({ where: { id: conversationId, userId }, data: { title }, select: summary });
      }
      return tx.conversation.create({ data: { ...(conversationId ? { id: conversationId } : {}), userId, title }, select: summary });
    });
    res.json({ conversation });
  });
  router.patch("/:id", async (req, res) => {
    const body = objectBody(req.body, ["title"]);
    const title = text(body.title, 150, true)!;
    const conversation = await prisma.conversation.update({
      where: { id: id(req.params.id), userId: res.locals.userId as string }, data: { title }, select: summary,
    });
    res.json({ conversation });
  });
  router.delete("/:id", async (req, res) => {
    // Ownership is part of the write predicate; DB cascade removes messages atomically.
    const result = await prisma.conversation.deleteMany({ where: { id: id(req.params.id), userId: res.locals.userId as string } });
    if (result.count !== 1) throw new HttpError(404, "NOT_FOUND");
    res.json({ ok: true });
  });
  router.get("/:id/messages", async (req, res) => {
    const conversationId = id(req.params.id);
    const userId = res.locals.userId as string;
    const owned = await prisma.conversation.findFirst({ where: { id: conversationId, userId }, select: { id: true } });
    if (!owned) throw new HttpError(404, "NOT_FOUND");
    const { limit, query } = pageArgs(req);
    const [rows, total] = await prisma.$transaction([
      prisma.message.findMany({ where: { conversationId, conversation: { userId } }, ...query, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: messageFields }),
      prisma.message.count({ where: { conversationId, conversation: { userId } } }),
    ]);
    res.json({ messages: sendPage(res, rows, total, limit) });
  });
  router.post("/:id/messages", async (req, res) => {
    const body = objectBody(req.body, ["id", "role", "content", "title"]);
    const conversationId = id(req.params.id);
    const userId = res.locals.userId as string;
    const messageId = body.id === undefined ? undefined : id(body.id);
    if (body.role !== "user" && body.role !== "assistant") throw new HttpError(400, "INVALID_ROLE");
    const role = body.role;
    const content = text(body.content, 16000, true, true)!;
    const title = text(body.title, 150) || "Nueva conversación";
    const message = await prisma.$transaction(async (tx) => {
      const existing = await tx.conversation.findUnique({ where: { id: conversationId }, select: { id: true, userId: true } });
      if (existing && existing.userId !== userId) throw new HttpError(404, "NOT_FOUND");
      if (!existing) await tx.conversation.create({ data: { id: conversationId, userId, title } });
      if (messageId) {
        const previous = await tx.message.findUnique({ where: { id: messageId } });
        if (previous) {
          if (previous.conversationId !== conversationId || previous.role !== role || previous.content !== content) throw new HttpError(409, "MESSAGE_CONFLICT");
          return { id: previous.id, role: previous.role, content: previous.content, createdAt: previous.createdAt };
        }
      }
      const created = await tx.message.create({
        data: { ...(messageId ? { id: messageId } : {}), conversationId, role, content }, select: messageFields,
      });
      await tx.conversation.update({ where: { id: conversationId, userId }, data: { updatedAt: new Date() } });
      return created;
    });
    res.status(201).json({ message });
  });
  return router;
}
export function registerConversationsRoute(app: Application) {
  const router = conversationsRouter();
  app.use("/conversations", router);
  app.use("/api/conversations", router);
}
