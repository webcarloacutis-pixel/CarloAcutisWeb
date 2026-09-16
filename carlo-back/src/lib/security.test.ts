import { afterEach, describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import { validateEnvironment } from "./config";
import { saintData, prayerData, miracleData } from "./content-validation";
import { readSession } from "./session";
const original = {...process.env};
afterEach(() => { process.env = {...original}; });
describe("validation of untrusted requests", () => {
  it("rejects mass assignment and nested Prisma writes", () => {
    expect(() => saintData({ name: "A", miracles: { create: [] } })).toThrow("UNKNOWN_FIELD");
    expect(() => prayerData({ title: "A", content: "B", createdAt: "2000-01-01" })).toThrow("UNKNOWN_FIELD");
    expect(() => miracleData({ title: "A", saintId: "other" })).toThrow("UNKNOWN_FIELD");
  });
  it("preserves complete prayer paragraphs", () => {
    const content = "Primer párrafo.\n\n" + "Oración completa. ".repeat(1000);
    expect(prayerData({title:"Oración",content}).content).toBe(content);
  });
  it("does not turn unknown death years into zero", () => {
    expect(saintData({name:"Santo",deathYear:null}).deathYear).toBeNull();
    expect(() => saintData({name:"Santo",deathYear:0})).toThrow("YEAR_ZERO_NOT_SUPPORTED");
    expect(() => saintData({name:"Santo",deathYear:"1900"})).toThrow("INVALID_NUMBER");
  });
  it("requires both coordinates, canonical continent and provenance", () => {
    expect(() => saintData({name:"Santo",birthLat:43})).toThrow("COORDINATE_PAIR_REQUIRED");
    expect(() => saintData({name:"Santo",birthLat:43,birthLng:12})).toThrow("BIRTH_PROVENANCE_REQUIRED");
    expect(() => saintData({name:"Santo",birthContinent:"Europa"})).toThrow("INVALID_CONTINENT");
  });
  it("rejects unsafe URLs and non-boolean approval", () => {
    expect(() => saintData({name:"Santo",imageUrl:"javascript:alert(1)"})).toThrow("INVALID_URL");
    expect(() => prayerData({title:"A",content:"B",approved:"true"})).toThrow("INVALID_BOOLEAN");
  });
});
describe("environment and sessions", () => {
  it("rejects absent or example JWT secrets", () => {
    delete process.env.JWT_SECRET;
    expect(validateEnvironment).toThrow("JWT_SECRET");
    process.env.JWT_SECRET = "dev_secret_change_me".repeat(3);
    expect(validateEnvironment).toThrow("JWT_SECRET");
  });
  it("rejects forged, expired and wrong-audience user tokens", () => {
    process.env.JWT_SECRET = "dedicated-unit-test-secret-longer-than-32-characters";
    const expired = jwt.sign({uid:"user-a",kind:"user"},process.env.JWT_SECRET,{expiresIn:-1,issuer:"carlo-acutis-api",audience:"carlo-web"});
    const wrongAudience = jwt.sign({uid:"user-a",kind:"user"},process.env.JWT_SECRET,{expiresIn:"1h",issuer:"carlo-acutis-api",audience:"other"});
    for (const token of ["fake-token",expired,wrongAudience]) expect(readSession({cookies:{carlo_token:token}} as never,"user")).toBeNull();
  });
});
