import type { Express, Request, Response } from "express";
import OpenAI from "openai";

async function withBackoff<T>(fn: () => Promise<T>, max = 5) {
  let delay = 500;
  for (let i = 0; i < max; i++) {
    try {
      return await fn();
    } catch (e: any) {
      if (e?.status !== 429) throw e;
      const jitter = Math.floor(Math.random() * 200);
      await new Promise((r) => setTimeout(r, delay + jitter));
      delay *= 2;
    }
  }
  return await fn();
}

function parseTimeoutMs(v: any, fallback: number) {
  const n = Number(String(v || "").trim());
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function registerAiChatRoute(app: Express) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const timeoutMs = parseTimeoutMs(process.env.OPENAI_TIMEOUT_MS, 25000);

  app.post("/ai/chat", async (req: Request, res: Response) => {
    const started = Date.now();
    try {
      const message = String(req.body?.message || "").trim();
      const lang = String(req.body?.lang || "es").trim();
      if (!message) return res.status(400).json({ error: "MESSAGE_REQUIRED" });

      const system = lang.startsWith("en")
        ? "You are a Catholic assistant. Answer with a short, warm, respectful response. If asked for a prayer, provide one. Add a short disclaimer: this is general guidance and does not replace a priest or spiritual director."
        : "Eres un asistente católico. Responde de forma breve, cálida y respetuosa. Si te piden una oración, dásela. Agrega un descargo corto: es orientación general y no reemplaza a un sacerdote o director espiritual.";

      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const result = await withBackoff(() =>
          client.chat.completions.create(
            {
              model,
              messages: [
                { role: "system", content: system },
                { role: "user", content: message },
              ],
              temperature: 0.7,
              max_tokens: 350,
            },
            { signal: controller.signal } as any
          )
        );

        const answer = result.choices?.[0]?.message?.content?.trim() || "";
        return res.json({ answer });
      } finally {
        clearTimeout(t);
      }
    } catch (e: any) {
      const ms = Date.now() - started;

      // Log MUY útil para ver si es red (ENOTFOUND/ETIMEDOUT/etc)
      console.error("AI_CHAT_FAILED", {
        ms,
        name: e?.name,
        message: e?.message,
        code: e?.code,
        status: e?.status,
        stack: e?.stack,
      });

      const isAbort =
        e?.name === "AbortError" ||
        String(e?.message || "").toLowerCase().includes("aborted") ||
        String(e?.message || "").toLowerCase().includes("timeout");

      if (isAbort) {
        return res.status(504).json({ error: "AI_CHAT_TIMEOUT", detail: `timeout after ${ms}ms` });
      }

      const status = e?.status === 429 ? 429 : 500;
      return res.status(status).json({ error: "AI_CHAT_FAILED", detail: e?.message || "unknown" });
    }
  });
}
