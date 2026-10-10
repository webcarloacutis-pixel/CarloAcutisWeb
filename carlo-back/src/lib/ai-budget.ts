import { HttpError } from "./errors";

// Includes session/quota/lease SQL and provider work, leaving room for the 35s proxy.
export const AI_OPERATION_BUDGET_MS = 30000;
export interface AiBudget {
  signal: AbortSignal;
  remaining(): number;
  run<T>(work: () => Promise<T>): Promise<T>;
  dispose(): void;
}
export function createAiBudget(parent?: AbortSignal): AiBudget {
  const controller = new AbortController();
  const deadline = Date.now() + AI_OPERATION_BUDGET_MS;
  const abort = () => controller.abort();
  parent?.addEventListener("abort", abort, { once: true });
  if (parent?.aborted) abort();
  const timer = setTimeout(abort, AI_OPERATION_BUDGET_MS);
  function remaining() {
    const value = deadline - Date.now();
    if (controller.signal.aborted || value <= 0) throw new HttpError(504, "AI_TIMEOUT");
    return value;
  }
  return {
    signal: controller.signal, remaining,
    async run<T>(work: () => Promise<T>): Promise<T> {
      remaining();
      let interrupted: (() => void) | undefined;
      try {
        const value = await Promise.race([work(), new Promise<never>((_resolve, reject) => {
          interrupted = () => reject(new HttpError(504, "AI_TIMEOUT"));
          controller.signal.addEventListener("abort", interrupted, { once: true });
          if (controller.signal.aborted) interrupted();
        })]);
        remaining();
        return value;
      } finally { if (interrupted) controller.signal.removeEventListener("abort", interrupted); }
    },
    dispose() { clearTimeout(timer); parent?.removeEventListener("abort", abort); },
  };
}
