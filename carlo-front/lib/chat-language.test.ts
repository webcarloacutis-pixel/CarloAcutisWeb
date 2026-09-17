import { describe, expect, it } from "vitest"
import { languages } from "./i18n"
import { translations } from "./translations"
import { chatTranslations } from "./chat-translations"
import { chatLanguages, chatSystemInstruction } from "../../carlo-back/src/lib/chat-language"

describe("shared chat language contract",()=>{
  it("supports exactly the website languages in server policy and UI resources",()=>{
    const expected=languages.map(language=>language.code).sort()
    expect(Object.keys(chatLanguages).sort()).toEqual(expected)
    expect(Object.keys(chatTranslations).sort()).toEqual(expected)
  })
  it.each(languages)("has complete chat resources and controlled server policy for $code",({code})=>{
    expect(Object.keys(chatTranslations[code]).sort()).toEqual(Object.keys(chatTranslations.es).sort())
    for(const [key,value] of Object.entries(chatTranslations[code])) {expect(value.trim()).not.toBe("");expect(translations[code][key]).toBe(value)}
    expect(chatSystemInstruction(code)).toContain(chatLanguages[code])
  })
  it.each(["xx","es-ignore-policy","system","constructor","__proto__"])("rejects arbitrary language/instruction %s",value=>{expect(()=>chatSystemInstruction(value)).toThrow("INVALID_LANGUAGE")})
})
