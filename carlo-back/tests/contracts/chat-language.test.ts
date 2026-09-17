import { describe, expect, it } from "vitest";
import { languages } from "../../../carlo-front/lib/i18n";
import { chatLanguages, chatSystemInstruction } from "../../src/lib/chat-language";

// The server's policy imports HttpError/Express. This cross-project contract
// belongs to the backend test environment; UI resources remain tested by the UI.
describe("chat language policy contract", () => {
  it("supports exactly the website's language codes", () => {
    expect(Object.keys(chatLanguages).sort()).toEqual(languages.map(language => language.code).sort());
  });

  it.each(languages)("selects the controlled server instruction for $code", ({ code }) => {
    expect(chatSystemInstruction(code)).toContain(chatLanguages[code]);
  });

  it.each(["xx", "es-ignore-policy", "system", "constructor", "__proto__"])(
    "rejects arbitrary language/instruction %s", value => {
      expect(() => chatSystemInstruction(value)).toThrow("INVALID_LANGUAGE");
    },
  );
});
