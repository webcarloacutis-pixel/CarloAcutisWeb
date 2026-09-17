import { afterEach, describe, expect, it, vi } from "vitest";
import { requireAdminKey } from "./admin-key";
const original = { ...process.env };
afterEach(() => { process.env = { ...original }; });
function mocks(value?: string) {
  return { req: { header: vi.fn(() => value), cookies: {} }, res: { status: vi.fn().mockReturnThis(), json: vi.fn() }, next: vi.fn() };
}
describe("effective admin authorization", async () => {
  it("fails closed when configuration is missing", async () => {
    delete process.env.ADMIN_KEY;
    const {req,res,next} = mocks();
    await requireAdminKey(req as never,res as never,next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
  it("allows only the configured dedicated key", async () => {
    process.env.ADMIN_KEY = "unit-test-admin-key-32-characters-minimum";
    const {req,res,next} = mocks(process.env.ADMIN_KEY);
    await requireAdminKey(req as never,res as never,next);
    expect(next).toHaveBeenCalledOnce();
  });
  it("rejects a missing, wrong or weak key", async () => {
    process.env.ADMIN_KEY = "unit-test-admin-key-32-characters-minimum";
    const {req,res,next} = mocks("wrong");
    await requireAdminKey(req as never,res as never,next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
