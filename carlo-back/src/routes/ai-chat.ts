import { clientAddress } from "../lib/client-address";
import type { Express } from "express";
import { objectBody, text } from "../lib/validation";
import { consumeQuota, privateHash, runAiCompletion } from "../lib/ai";
import { activeSession } from "../lib/session";
import { rateLimit } from "../lib/rate-limit";
import { HttpError } from "../lib/errors";
import { inputHash, withAiIdempotency } from "../lib/ai-idempotency";
import { ensureAiConfigured } from "../lib/ai-errors";
import { chatSystemInstruction } from "../lib/chat-language";
export function registerAiChatRoute(app: Express) {
  const limiter = rateLimit(10, 60000);
  app.post(["/ai/chat", "/api/ai/chat"], limiter, async (req, res) => {
    const controller = new AbortController();
    const closed = () => { if (!res.writableEnded) controller.abort(); };
    res.on("close", closed);
    try {
      const body = objectBody(req.body, ["message", "lang", "sessionId", "requestId"]);
      const message = text(body.message, 4000, true)!;
      const lang = text(body.lang, 10) || "es";
      const system = chatSystemInstruction(lang);
      if (body.sessionId !== undefined) text(body.sessionId, 100, true);
      const requestId = body.requestId === undefined ? null : text(body.requestId, 100, true);
      res.locals.aiStage = "CONFIGURATION";
      ensureAiConfigured();
      res.locals.aiStage = "PERSISTENCE";
      const userId = (await activeSession(req, "user"))?.uid;
      const scope = userId ? "user:" + userId : "ip:" + privateHash(clientAddress(req));
      await consumeQuota("chat:" + scope, 20, 86400000);
      const complete = () => { res.locals.aiStage = "PROVIDER"; return runAiCompletion({ system, user: message, maxTokens: 500, signal: controller.signal }); };
      const answer = requestId ? await withAiIdempotency(privateHash("chat:" + scope + ":" + requestId), inputHash(JSON.stringify({message,lang})), complete) : await complete();
      res.locals.aiStage = "COMPLETE";
      res.json({ answer: answer.text, requestId: res.locals.requestId });
    } catch (error) {
      if (error instanceof HttpError) {
        if (error.code === "AI_PERSISTENCE_FAILED") res.locals.aiStage = "PERSISTENCE";
        throw error;
      }
      res.locals.aiStage = "PERSISTENCE";
      throw new HttpError(503, "AI_PERSISTENCE_FAILED");
    } finally { res.removeListener("close", closed); }
  });
}
