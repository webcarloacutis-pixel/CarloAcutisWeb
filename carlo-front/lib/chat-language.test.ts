import { describe, expect, it } from "vitest"
import { languages } from "./i18n"
import { translations } from "./translations"
import { chatTranslations } from "./chat-translations"

describe("chat language resources", () => {
  it("supports exactly the existing website languages", () => {
    expect(Object.keys(chatTranslations).sort()).toEqual(languages.map(language => language.code).sort())
  })

  it.each(languages)("has complete shared UI resources for $code", ({ code }) => {
    expect(Object.keys(chatTranslations[code]).sort()).toEqual(Object.keys(chatTranslations.es).sort())
    for (const [key, value] of Object.entries(chatTranslations[code])) {
      expect(value.trim()).not.toBe("")
      expect(translations[code][key]).toBe(value)
    }
  })
})
