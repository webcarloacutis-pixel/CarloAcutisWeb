import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import crypto from "crypto";

type Cache = Record<string, string>;

function loadCache(filePath: string): Cache {
  try {
    if (!fs.existsSync(filePath)) return {};
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as Cache;
  } catch {
    return {};
  }
}

function saveCache(filePath: string, cache: Cache) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(cache, null, 2), "utf8");
}

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

export function registerAiTranslateRoute(app: Express) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const cacheFile = path.join(process.cwd(), "data", "translation-cache.json");
  let cache = loadCache(cacheFile);

  app.post("/ai/translate", async (req: Request, res: Response) => {
    try {
      const text = String(req.body?.text || "").trim();
      const targetLang = String(req.body?.targetLang || "es").trim();

      if (!text) return res.status(400).json({ error: "TEXT_REQUIRED" });
      if (!targetLang) return res.status(400).json({ error: "TARGET_LANG_REQUIRED" });
      if (targetLang === "es") return res.json({ translated: text, cached: true });

      const hash = crypto.createHash("sha256").update(text).digest("hex").slice(0, 24);
      const key = `${targetLang}:${hash}`;

      if (cache[key]) return res.json({ translated: cache[key], cached: true });

      const system = `You are a professional translator for a Catholic web app.
Translate the user text to target language: ${targetLang}.
Rules: preserve names/proper nouns; respectful tone; output ONLY the translation.`;

      const translated = await withBackoff(async () => {
        const r = await client.chat.completions.create({
          model,
          temperature: 0.2,
          messages: [
            { role: "system", content: system },
            { role: "user", content: text },
          ],
        });
        return (r.choices?.[0]?.message?.content || "").trim();
      });

      if (!translated) return res.status(500).json({ error: "EMPTY_TRANSLATION" });

      cache[key] = translated;
      saveCache(cacheFile, cache);
      return res.json({ translated, cached: false });
    } catch (e: any) {
      const status = e?.status === 429 ? 429 : 500;
      return res.status(status).json({ error: "AI_TRANSLATE_FAILED", detail: e?.message || "unknown" });
    }
  });
}
