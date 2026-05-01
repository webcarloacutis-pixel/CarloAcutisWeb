import { afterEach, describe, expect, it, vi } from "vitest";
import { requireAdminKey } from "./admin-key";

const originalEnv = { ...process.env };

function createMocks(provided?: string) {
  return {
    req: {
      header: vi.fn((name: string) =>
        name.toLowerCase() === "x-admin-key" ? provided : undefined
      ),
    },
    res: {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    },
    next: vi.fn(),
  };
}

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("requireAdminKey", () => {
  it("allows requests when ADMIN_KEY is not configured", () => {
    delete process.env.ADMIN_KEY;
    const { req, res, next } = createMocks();

    requireAdminKey(req as any, res as any, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("allows requests with the configured admin key", () => {
    process.env.ADMIN_KEY = "secret";
    const { req, res, next } = createMocks("secret");

    requireAdminKey(req as any, res as any, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("rejects requests with a missing or invalid admin key", () => {
    process.env.ADMIN_KEY = "secret";
    const { req, res, next } = createMocks("wrong");

    requireAdminKey(req as any, res as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "UNAUTHORIZED" });
  });
});
