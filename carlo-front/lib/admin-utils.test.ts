import { describe, expect, it } from "vitest";
import {
  generateSlug,
  mapApiToFormMiracle,
  mapFormToApiMiracle,
  validateSaintData,
  type MiracleApi,
} from "./admin-utils";

describe("generateSlug", () => {
  it("normalizes accents, spaces, and symbols", () => {
    expect(generateSlug("San Carlo Acutis!")).toBe("san-carlo-acutis");
    expect(generateSlug("Santa María de Guadalupe")).toBe(
      "santa-maria-de-guadalupe"
    );
  });
});

describe("validateSaintData", () => {
  it("rejects empty saint data", () => {
    const result = validateSaintData({ name: "   " });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("El nombre es requerido.");
    expect(result.errors).toContain("El slug es requerido.");
  });

  it("accepts a saint with a name because slug can be generated", () => {
    expect(validateSaintData({ name: "Carlo Acutis" })).toEqual({
      isValid: true,
      errors: [],
    });
  });
});

describe("miracle mappers", () => {
  it("maps form data into the backend shape", () => {
    expect(
      mapFormToApiMiracle({
        title: " Milagro ",
        description: " Detalles ",
        witnesses: ["Ana", "", "Luis"],
        verified: true,
      })
    ).toEqual({
      title: "Milagro",
      details: "Detalles",
      type: null,
      date: null,
      location: null,
      witnesses: "Ana, Luis",
      approved: true,
    });
  });

  it("maps backend data into the form shape", () => {
    const apiMiracle: MiracleApi = {
      id: "m1",
      saintId: "s1",
      title: "Curacion",
      details: "Detalle",
      type: "Curacion",
      date: "2024",
      location: "Italia",
      witnesses: "Ana, Luis",
      approved: true,
      createdAt: "2024-01-01",
      updatedAt: "2024-01-02",
    };

    expect(mapApiToFormMiracle(apiMiracle)).toEqual({
      id: "m1",
      saintId: "s1",
      title: "Curacion",
      description: "Detalle",
      verified: true,
      type: "Curacion",
      date: "2024",
      location: "Italia",
      witnesses: ["Ana", "Luis"],
    });
  });
});
