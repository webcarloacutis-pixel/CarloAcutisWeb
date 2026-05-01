import { describe, expect, it } from "vitest";
import { slugify } from "../lib/slugify";

describe("slugify", () => {
  it("normalizes names for URL-safe saint slugs", () => {
    expect(slugify("San Carlo Acutis")).toBe("san-carlo-acutis");
    expect(slugify("Santa María de Guadalupe")).toBe(
      "santa-maria-de-guadalupe"
    );
  });

  it("uses a fallback when the input has no slug-safe characters", () => {
    expect(slugify("!!!")).toBe("saint");
    expect(slugify("")).toBe("saint");
  });
});
