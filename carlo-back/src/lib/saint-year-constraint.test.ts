import { Prisma } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSaint, updateSaint } from "./saint-service";
import { errorHandler } from "./errors";

const query = vi.hoisted(() => ({ findUnique: vi.fn(), create: vi.fn(), update: vi.fn() }));
vi.mock("./prisma", () => ({ prisma: {
  $transaction: async (work: (tx: object) => Promise<unknown>) => work({ saint: query }),
} }));
vi.mock("./catalog-capacity", () => ({ reserveCatalogCapacity: vi.fn() }));

// Synthetic connector text models the exact format confirmed by the guarded SQL test.
function checkFailure(constraint = "Saint_deathYear_check", sqlState = "23514") {
  return new Prisma.PrismaClientUnknownRequestError(
    `Error querying the database: ConnectorError { kind: QueryError(PostgresError { code: "${sqlState}", message: "new row for relation \\"Saint\\" violates check constraint \\"${constraint}\\"" }) }`,
    { clientVersion: "6.19.3" },
  );
}
function classify(error: unknown) {
  const response = { headersSent: false, locals: {}, status: vi.fn(), json: vi.fn(), set: vi.fn() };
  response.status.mockReturnValue(response); response.set.mockReturnValue(response);
  errorHandler(error, {} as Parameters<typeof errorHandler>[1], response as unknown as Parameters<typeof errorHandler>[2], vi.fn());
  return { status: response.status.mock.calls[0]?.[0], body: response.json.mock.calls[0]?.[0], headers: response.set.mock.calls };
}
async function caught(work: Promise<unknown>) {
  try { await work; throw new Error("EXPECTED_FAILURE"); } catch (error) { return error; }
}
beforeEach(() => {
  query.findUnique.mockResolvedValue({ id: "synthetic-existing", name: "Synthetic fixture", slug: "synthetic-fixture", deathYear: 1900, editorial: null });
  query.create.mockReset(); query.update.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("saint-only handling of the observed death-year database CHECK", () => {
  it.each(["create", "update"])("maps only an explicit validated BCE %s write to safe HTTP400", async operation => {
    const failure = checkFailure(); query.create.mockRejectedValue(failure); query.update.mockRejectedValue(failure);
    const result = await caught(operation === "create" ? createSaint({ name: "Synthetic fixture", deathYear: -4 }) : updateSaint("synthetic-existing", { deathYear: -4 }));
    expect(classify(result)).toMatchObject({ status: 400, body: { error: "INVALID_NUMBER" } });
  });
  it.each([{ deathYear: 1900 }, { deathYear: null }, { biography: "Unrelated edit" }])("leaves the CHECK internal when no BCE year is explicitly written: %j", async patch => {
    const failure = checkFailure(); query.update.mockRejectedValue(failure);
    const result = await caught(updateSaint("synthetic-existing", patch));
    expect(result).toBe(failure); expect(classify(result)).toMatchObject({ status: 500, body: { error: "INTERNAL_ERROR" } });
  });
  it("does not classify an omitted negative year copied only into the validation candidate as submitted input", async () => {
    query.findUnique.mockResolvedValue({ id: "synthetic-existing", name: "Synthetic fixture", slug: "synthetic-fixture", deathYear: -4, editorial: null });
    const failure = checkFailure(); query.update.mockRejectedValue(failure);
    const result = await caught(updateSaint("synthetic-existing", { biography: "Unrelated edit" }));
    expect(result).toBe(failure); expect(classify(result)).toMatchObject({ status: 500, body: { error: "INTERNAL_ERROR" } });
  });
  it.each([checkFailure("Saint_other_check"), checkFailure("Saint_deathYear_check", "23505"),
    new Prisma.PrismaClientUnknownRequestError('Unstructured reference to "Saint_deathYear_check"', { clientVersion: "6.19.3" }),
    new Prisma.PrismaClientKnownRequestError("Synthetic unrelated schema error", { code: "P2004", clientVersion: "6.19.3", meta: { database_error: '"Saint_deathYear_check"' } }),
  ])("preserves unrelated connector or P2004 failures as HTTP500", async failure => {
    query.update.mockRejectedValue(failure);
    const result = await caught(updateSaint("synthetic-existing", { deathYear: -4 }));
    expect(result).toBe(failure); expect(classify(result)).toMatchObject({ status: 500, body: { error: "INTERNAL_ERROR" } });
  });
  it("preserves a real database-connectivity classification as HTTP503 with retry advice", async () => {
    const failure = new Prisma.PrismaClientKnownRequestError("Synthetic database unreachable", { code: "P1001", clientVersion: "6.19.3" });
    query.update.mockRejectedValue(failure);
    const result = await caught(updateSaint("synthetic-existing", { deathYear: -4 }));
    expect(result).toBe(failure);
    expect(classify(result)).toMatchObject({ status: 503, body: { error: "DATABASE_UNAVAILABLE" }, headers: [["Retry-After", "5"]] });
  });
});
