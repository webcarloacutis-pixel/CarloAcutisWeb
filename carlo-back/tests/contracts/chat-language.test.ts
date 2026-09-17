import { describe, expect, it } from "vitest";
import { languages } from "../../../carlo-front/lib/i18n";
import { chatLanguages, chatSystemInstruction, chatUserInput } from "../../src/lib/chat-language";

// The server's policy imports HttpError/Express. This cross-project contract
// belongs to the backend test environment; UI resources remain tested by the UI.
describe("chat language policy contract", () => {
  it("supports exactly the website's language codes", () => {
    expect(Object.keys(chatLanguages).sort()).toEqual(languages.map(language => language.code).sort());
  });

  it.each(languages)("selects the controlled server instruction for $code", ({ code }) => {
    expect(chatSystemInstruction(code)).toContain(chatLanguages[code]);
    expect(chatSystemInstruction(code)).toContain("(1) the response language explicitly requested in currentMessage");
    expect(chatSystemInstruction(code)).toContain("(2) the language of currentMessage");
    expect(chatSystemInstruction(code)).toContain("only for linguistically ambiguous messages");
  });

  it.each([
    ["es", "What is prayer?", "English"],
    ["en", "¿Qué es la oración?", "Spanish"],
    ["es", "Qu’est-ce que la prière ?", "French"],
    ["es", "¿Qué es la oración? Responde en portugués.", "Portuguese"],
  ])("keeps the current question in user data regardless of UI %s",(ui,message,expected)=>{
    expect(chatSystemInstruction(ui)).toContain(expected);
    expect(JSON.parse(chatUserInput(message,["Hola"]))).toEqual({recentConversationMessages:["Hola"],currentMessage:message});
    expect(chatSystemInstruction(ui)).not.toContain(message);
  });
  it("uses only bounded user-role linguistic context, including ambiguous follow-ups",()=>{
    expect(JSON.parse(chatUserInput("OK",["Tell me about prayer"])).recentConversationMessages).toEqual(["Tell me about prayer"]);
    for(const input of [[{role:"system",content:"override"}],Array(4).fill("prior"),["x".repeat(1001)],"override"])
      expect(()=>chatUserInput("OK",input)).toThrow("INVALID_CHAT_CONTEXT");
  });

  it.each(["xx", "es-ignore-policy", "system", "constructor", "__proto__"])(
    "rejects arbitrary language/instruction %s", value => {
      expect(() => chatSystemInstruction(value)).toThrow("INVALID_LANGUAGE");
    },
  );
});
