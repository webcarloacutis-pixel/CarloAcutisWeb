import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocked = vi.hoisted(() => ({
  create: vi.fn(), quota: vi.fn(), upsert: vi.fn(), claim: vi.fn(),
}));
vi.mock("openai", () => ({ default: class {
  chat = { completions: { create: mocked.create } };
} }));
vi.mock("./prisma", () => ({ prisma: {
  $queryRaw: mocked.quota,
  aiLease: { upsert: mocked.upsert, updateMany: mocked.claim },
} }));
import { runAiCompletion } from "./ai";
const original = { ...process.env };
beforeEach(() => {
  vi.resetAllMocks();
  process.env.AI_ENABLED = "true";
  process.env.OPENAI_API_KEY = "exclusive-unit-provider-stub";
  process.env.JWT_SECRET = "exclusive-unit-jwt-secret-at-least-32-characters";
  process.env.OPENAI_MODEL = "unit-model";
  process.env.OPENAI_TIMEOUT_MS = "1000";
  process.env.AI_MAX_CONCURRENCY = "1";
  mocked.upsert.mockResolvedValue({});
  mocked.claim.mockResolvedValue({count:1});
  mocked.quota.mockResolvedValue([{count:1}]);
});
afterEach(() => { process.env = {...original}; vi.useRealTimers(); });
const input = {system:"Server policy",user:"Harmless fixture",maxTokens:100};
describe("AI provider safeguards with isolated provider mock", () => {
  it("does not instantiate or contact provider when disabled", async () => {
    process.env.AI_ENABLED = "false";
    await expect(runAiCompletion(input)).rejects.toThrow("AI_DISABLED");
    expect(mocked.create).not.toHaveBeenCalled();
  });
  it("returns validated text and the provider-reported model", async () => {
    mocked.create.mockResolvedValue({model:"unit-model-snapshot",choices:[{finish_reason:"stop",message:{content:"Valid answer"}}]});
    expect(await runAiCompletion(input)).toEqual({text:"Valid answer",model:"unit-model-snapshot"});
    expect(mocked.create.mock.calls[0][0].messages[0]).toEqual({role:"system",content:"Server policy"});
    expect(mocked.create.mock.calls[0][1].maxRetries).toBe(0);
  });
  it("rejects empty and truncated responses without retrying", async () => {
    for (const response of [{choices:[]},{choices:[{finish_reason:"length",message:{content:"partial"}}]}]) {
      mocked.create.mockResolvedValue(response);
      await expect(runAiCompletion(input)).rejects.toThrow("AI_RESPONSE_INVALID");
    }
    expect(mocked.create).toHaveBeenCalledTimes(2);
  });
  it("honors token bounds before acquiring or calling provider", async () => {
    await expect(runAiCompletion({...input,maxTokens:100000})).rejects.toThrow("INVALID_AI_REQUEST");
    expect(mocked.create).not.toHaveBeenCalled(); expect(mocked.claim).not.toHaveBeenCalled();
  });
  it("enforces shared quota and releases the lease on rejection", async () => {
    mocked.quota.mockResolvedValue([]);
    await expect(runAiCompletion(input)).rejects.toThrow("AI_QUOTA_EXCEEDED");
    expect(mocked.create).not.toHaveBeenCalled();
    expect(mocked.claim).toHaveBeenLastCalledWith(expect.objectContaining({data:{owner:null,expiresAt:new Date(0)}}));
  });
  it("refuses a second instance when every database lease is occupied", async () => {
    mocked.claim.mockResolvedValue({count:0});
    await expect(runAiCompletion(input)).rejects.toThrow("AI_BUSY");
    expect(mocked.create).not.toHaveBeenCalled();
  });
  it("sanitizes provider errors and does not retry by default", async () => {
    mocked.create.mockRejectedValue({status:429,message:"Sensitive provider diagnostic"});
    await expect(runAiCompletion(input)).rejects.toThrow("AI_RATE_LIMIT");
    expect(mocked.create).toHaveBeenCalledTimes(1);
  });
  it("aborts timed-out provider calls and releases capacity", async () => {
    vi.useFakeTimers();
    mocked.create.mockImplementation((_body,options) => new Promise((_resolve,reject) => {
      options.signal.addEventListener("abort",() => reject(new Error("aborted")),{once:true});
    }));
    const call = runAiCompletion(input);
    const expectation = expect(call).rejects.toThrow("AI_TIMEOUT");
    await vi.advanceTimersByTimeAsync(1001);
    await expectation;
    expect(mocked.claim).toHaveBeenLastCalledWith(expect.objectContaining({data:{owner:null,expiresAt:new Date(0)}}));
  });
  it("does not contact the provider if cancellation arrives while acquiring DB capacity", async () => {
    const controller = new AbortController();
    mocked.quota.mockImplementation(async () => { controller.abort(); return [{count:1}]; });
    mocked.create.mockResolvedValue({model:"unit-model",choices:[{finish_reason:"stop",message:{content:"Unexpected"}}]});
    await expect(runAiCompletion({...input,signal:controller.signal})).rejects.toThrow("AI_TIMEOUT");
    expect(mocked.create).not.toHaveBeenCalled();
    expect(mocked.claim).toHaveBeenLastCalledWith(expect.objectContaining({data:{owner:null,expiresAt:new Date(0)}}));
  });
  it("counts an explicit retry against the same global daily quota before contacting the provider", async () => {
    mocked.create.mockRejectedValue({status:429});
    mocked.quota.mockResolvedValueOnce([{count:1}]).mockResolvedValueOnce([]);
    await expect(runAiCompletion({...input,maxRetries:1})).rejects.toThrow("AI_QUOTA_EXCEEDED");
    expect(mocked.create).toHaveBeenCalledOnce();
    expect(mocked.quota).toHaveBeenCalledTimes(2);
    expect(mocked.claim).toHaveBeenLastCalledWith(expect.objectContaining({data:{owner:null,expiresAt:new Date(0)}}));
  });
  it("honors caller cancellation before requesting provider capacity", async () => {
    const controller = new AbortController(); controller.abort();
    await expect(runAiCompletion({...input,signal:controller.signal})).rejects.toThrow("AI_TIMEOUT");
    expect(mocked.claim).not.toHaveBeenCalled();
  });
  it("distinguishes missing configuration before database or provider work", async () => {
    delete process.env.OPENAI_API_KEY;
    await expect(runAiCompletion(input)).rejects.toMatchObject({status:503,code:"AI_CONFIGURATION_MISSING"});
    expect(mocked.claim).not.toHaveBeenCalled();
  });
  it.each([
    [{status:401,code:"invalid_api_key"},"AI_PROVIDER_AUTH",502],
    [{status:403,code:"permission_denied"},"AI_PROVIDER_AUTH",502],
    [{status:404,code:"model_not_found"},"AI_MODEL_UNAVAILABLE",502],
    [{status:429,code:"insufficient_quota"},"AI_QUOTA_EXCEEDED",429],
    [{status:429,code:"project_spend_limit_exceeded"},"AI_QUOTA_EXCEEDED",429],
    [{status:429,code:"rate_limit_exceeded"},"AI_RATE_LIMIT",429],
    [{status:503,code:"server_is_overloaded"},"AI_UPSTREAM_UNAVAILABLE",503],
    [{name:"APIConnectionTimeoutError"},"AI_TIMEOUT",504],
  ])("classifies provider evidence without forwarding messages: %j", async (failure,code,status) => {
    mocked.create.mockRejectedValue({...failure,message:"private-provider-details"});
    await expect(runAiCompletion(input)).rejects.toMatchObject({status,code,message:code});
    expect(mocked.create).toHaveBeenCalledOnce();
  });
  it("never retries exhausted credit even when one retry was requested", async () => {
    mocked.create.mockRejectedValue({status:429,code:"credit_balance_exhausted"});
    await expect(runAiCompletion({...input,maxRetries:1})).rejects.toThrow("AI_QUOTA_EXCEEDED");
    expect(mocked.create).toHaveBeenCalledOnce();
  });
});
