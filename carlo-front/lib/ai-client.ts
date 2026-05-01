type ApiError = Error & { status?: number; detail?: any };

export async function withBackoff<T>(fn: () => Promise<T>, max = 5) {
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

async function readJsonSafe(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text };
  }
}

function makeErr(status: number, detail: any, fallback: string): ApiError {
  const e = new Error(detail?.error || fallback) as ApiError;
  e.status = status;
  e.detail = detail;
  return e;
}

export async function postAiChat(params: { message: string; lang?: string; sessionId?: string }) {
  return await withBackoff(async () => {
    const res = await fetch("/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify(params),
    });

    if (!res.ok) throw makeErr(res.status, await readJsonSafe(res), "AI_CHAT_FAILED");
    return (await res.json()) as any;
  });
}

export async function postAiTranslate(params: { text: string; targetLang: string }) {
  return await withBackoff(async () => {
    const res = await fetch("/ai/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify(params),
    });

    if (!res.ok) throw makeErr(res.status, await readJsonSafe(res), "AI_TRANSLATE_FAILED");
    return (await res.json()) as any;
  });
}
