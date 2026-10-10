import { expect, it } from "vitest"
import { catalogReturn } from "./catalog-return"
it("preserves catalogue filters, cursor, explicit order and locale",()=>{
  const route="/santos?q=Jos%C3%A9&continent=EU&country=IT&sort=alphabetical&cursor=abc&lang=zh-CN"
  expect(catalogReturn(route)).toBe(route)
})
it.each([undefined,[],"https://evil.invalid/santos","//evil.invalid/santos","/santos/../admin","/santos\\evil","/santos?token=private","/santos#fragment","/santos\n"])('rejects an unsafe return location %j', value=>expect(catalogReturn(value)).toBe('/santos'))
