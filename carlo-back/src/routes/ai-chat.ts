import { clientAddress } from "../lib/client-address";
import type { Express } from "express";
import { objectBody, text } from "../lib/validation";
import { consumeQuota, privateHash, runAiCompletion } from "../lib/ai";
import { activeSession } from "../lib/session";
import { rateLimit } from "../lib/rate-limit";
import { HttpError } from "../lib/errors";
import { inputHash, withAiIdempotency } from "../lib/ai-idempotency";
import { ensureAiConfigured } from "../lib/ai-errors";
import { chatSystemInstruction, chatUserInput } from "../lib/chat-language";
import { createAiBudget } from "../lib/ai-budget";
export function registerAiChatRoute(app: Express) {
  const limiter = rateLimit(10, 60000);
  app.post(["/ai/chat", "/api/ai/chat"], limiter, async (req, res) => {
    const controller = new AbortController();
    const budget = createAiBudget(controller.signal);
    const closed = () => { if (!res.writableEnded) controller.abort(); };
    res.on("close", closed);
    try {
      const body = objectBody(req.body, ["message", "lang", "sessionId", "requestId", "recentMessages"]);
      const message = text(body.message, 4000, true)!;
      const lang = text(body.lang, 10) || "es";
      const system = chatSystemInstruction(lang);
      const user = chatUserInput(message, body.recentMessages);
      if (body.sessionId !== undefined) text(body.sessionId, 100, true);
      const requestId = body.requestId === undefined ? null : text(body.requestId, 100, true);
      res.locals.aiStage = "CONFIGURATION";
      ensureAiConfigured();
      res.locals.aiStage = "PERSISTENCE";
      const userId = (await budget.run(() => activeSession(req, "user")))?.uid;
      const scope = userId ? "user:" + userId : "ip:" + privateHash(clientAddress(req));
      const complete = async () => {
        // Completed/pending duplicates do not consume a second user quota unit.
        await budget.run(() => consumeQuota("chat:" + scope, 20, 86400000));
        return runAiCompletion({ system, user, maxTokens: 500, signal: budget.signal, budget, requestId: res.locals.requestId,
          onStage: stage => { res.locals.aiStage = stage; } });
      };
      const answer = requestId ? await withAiIdempotency(privateHash("chat:" + scope + ":" + requestId), inputHash(JSON.stringify({user,lang})), complete,
        { budget, onStage: () => { res.locals.aiStage = "PERSISTENCE"; } }) : await complete();
      res.locals.aiStage = "COMPLETE";
      res.json({ answer: answer.text, requestId: res.locals.requestId });
    } catch (error) {
      if (error instanceof HttpError) {
        if (error.code === "AI_PERSISTENCE_FAILED") res.locals.aiStage = "PERSISTENCE";
        throw error;
      }
      res.locals.aiStage = "PERSISTENCE";
      throw new HttpError(503, "AI_PERSISTENCE_FAILED");
    } finally { budget.dispose(); res.removeListener("close", closed); }
  });
}
