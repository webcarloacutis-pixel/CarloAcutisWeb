import { afterEach, expect, it, vi } from "vitest";
import { rateLimit } from "./rate-limit";
afterEach(()=>vi.useRealTimers());
function call(limiter:ReturnType<typeof rateLimit>,ip:string) {
  const response={locals:{} as Record<string,unknown>,set:vi.fn(),status:vi.fn(),json:vi.fn()};response.status.mockReturnValue(response);
  const next=vi.fn();limiter({ip,socket:{remoteAddress:ip}} as never,response as never,next);return {response,next};
}
it("identifies the local limiter and reports its reset",()=>{
  vi.useFakeTimers();vi.setSystemTime(1000);const limiter=rateLimit(1,60000);call(limiter,"192.0.2.1");
  const {response,next}=call(limiter,"192.0.2.1");expect(next).not.toHaveBeenCalled();expect(response.status).toHaveBeenCalledWith(429);
  expect(response.locals.aiCode).toBe("RATE_LIMITED");expect(response.set).toHaveBeenCalledWith("Retry-After","60");
});
it("returns a bounded Retry-After when the identity map is full and recovers",()=>{
  vi.useFakeTimers();vi.setSystemTime(1000);const limiter=rateLimit(1,60000);
  for(let i=0;i<10000;i++)call(limiter,`198.${i>>16}.${(i>>8)&255}.${i&255}`);
  const {response}=call(limiter,"203.0.113.1");expect(response.status).toHaveBeenCalledWith(429);expect(response.set).toHaveBeenCalledWith("Retry-After","60");
  vi.advanceTimersByTime(60000);expect(call(limiter,"203.0.113.1").next).toHaveBeenCalledOnce();
});
