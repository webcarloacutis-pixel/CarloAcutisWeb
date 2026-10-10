import { afterEach, expect, it, vi } from "vitest";
import { createAiBudget } from "./ai-budget";
afterEach(()=>vi.useRealTimers());
it("rejects blocked SQL when the total deadline expires",async()=>{
  vi.useFakeTimers();const budget=createAiBudget();
  try {const pending=budget.run(()=>new Promise(()=>{}));const check=expect(pending).rejects.toThrow("AI_TIMEOUT");await vi.advanceTimersByTimeAsync(30000);await check;expect(()=>budget.remaining()).toThrow("AI_TIMEOUT");}
  finally {budget.dispose();}
});
it("uses one remaining budget across sequential SQL and provider operations",async()=>{
  vi.useFakeTimers();const budget=createAiBudget();
  try {const first=budget.run(()=>new Promise(resolve=>setTimeout(resolve,12000)));await vi.advanceTimersByTimeAsync(12000);await first;expect(budget.remaining()).toBe(18000);}
  finally {budget.dispose();}
});
it("does not begin new work after cancellation",async()=>{
  const controller=new AbortController();controller.abort();const budget=createAiBudget(controller.signal);const work=vi.fn().mockResolvedValue("unexpected");
  try {await expect(budget.run(work)).rejects.toThrow("AI_TIMEOUT");expect(work).not.toHaveBeenCalled();}
  finally {budget.dispose();}
});
it("cancels a pending operation and never starts the next provider call",async()=>{
  const controller=new AbortController();const budget=createAiBudget(controller.signal);let settle!:(value:string)=>void;const provider=vi.fn();
  try {const pending=budget.run(()=>new Promise<string>(resolve=>{settle=resolve}));const check=expect(pending).rejects.toThrow("AI_TIMEOUT");controller.abort();await check;settle("late SQL");await expect(budget.run(provider)).rejects.toThrow("AI_TIMEOUT");expect(provider).not.toHaveBeenCalled();}
  finally {budget.dispose();}
});
