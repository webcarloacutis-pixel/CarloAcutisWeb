import {test, expect, type Page, type Locator} from "@playwright/test"

// Isolate UI interactions from production, credentials and billable AI calls.
async function openChat(page: Page) {
  await page.context().route(url => !["127.0.0.1", "localhost"].includes(url.hostname), route => route.abort())
  await page.route("**/api/auth/me", route => route.fulfill({status:401,json:{error:"NOT_AUTHENTICATED"}}))
  await page.route("**/api/analytics-config", route => route.fulfill({json:{enabled:false}}))
  await page.goto("/", {waitUntil:"networkidle"})
  await expect(page.getByLabel("Mensaje para la IA", {exact:true})).toBeVisible()
  await expect(page.getByLabel("Mensaje para la IA", {exact:true})).toBeEnabled()
  await page.evaluate(() => document.fonts.ready)
}
async function fullyVisible(locator: Locator, page: Page, bottom?: number) {
  await expect(locator).toBeInViewport({ratio:1})
  const box = await locator.boundingBox()
  expect(box).not.toBeNull()
  const size = page.viewportSize()!
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.y).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(size.width + 1)
  expect(box!.y + box!.height).toBeLessThanOrEqual((bottom ?? size.height) + 1)
}
async function composer(page: Page, bottom?: number) {
  const input=page.getByTestId("chat-section").locator("textarea")
  const send=page.getByTestId("chat-section").locator('button[type="submit"]')
  await fullyVisible(input,page,bottom);await fullyVisible(send,page,bottom)
  expect((await send.boundingBox())!.width).toBeGreaterThanOrEqual(44)
  expect((await send.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  expect(await input.evaluate(element=>parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width+1)
  return {input,send}
}
for (const [width,height] of [[1440,900],[1366,768],[768,1024],[430,932],[390,844],[360,800]]) {
  test(`initial layout ${width}x${height}: composer, suggestions and Santos are visible`,async({page},info)=>{
    await page.setViewportSize({width,height});await openChat(page)
    expect(await page.evaluate(()=>scrollY)).toBe(0)
    await composer(page)
    const header=page.getByRole("banner")
    await fullyVisible(header.getByRole("link",{name:"Santos",exact:true}).filter({visible:true}),page)
    for(const label of ["¿Qué santo se parece a mí?","Salmo del día","Cuéntame un milagro","¿A qué santo le rezo?"]) {
      const suggestion=page.getByTestId("chat-section").getByRole("button",{name:label,exact:true})
      await fullyVisible(suggestion,page)
      expect(await suggestion.evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true)
    }
    if(width>=1024){await expect(page.locator("#chat-history")).toBeVisible();expect((await page.locator("#chat-history").boundingBox())!.width).toBeLessThanOrEqual(256)}
    else await expect(page.locator("#chat-history")).toBeHidden()
    await page.screenshot({path:info.outputPath(`after-${width}x${height}.png`),animations:"disabled"})
    await info.attach("initial-layout",{body:JSON.stringify(await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollY,scrollWidth:document.documentElement.scrollWidth,input:document.querySelector("textarea")!.getBoundingClientRect().toJSON()}))),contentType:"application/json"})
  })
}
test("mobile navigation and history remain keyboard accessible",async({page})=>{
  await page.setViewportSize({width:360,height:800});await openChat(page)
  const menu=page.getByRole("banner").locator('button[aria-controls="mobile-navigation"]')
  await menu.focus();await page.keyboard.press("Enter")
  await expect(menu).toHaveAttribute("aria-expanded","true")
  for(const name of ["Santos","Milagros","Oraciones","Mapa","Eucaristía","Versículos","Símbolos"]) {
    await fullyVisible(page.getByRole("navigation",{name:"Navegación móvil"}).getByRole("link",{name,exact:true}),page)
  }
  await page.keyboard.press("Escape");await expect(menu).toBeFocused();await composer(page)
  const history=page.getByRole("button",{name:"Abrir historial",exact:true})
  if(test.info().project.use.hasTouch)await history.tap();else await history.click()
  await expect(page.getByRole("dialog")).toBeVisible()
  await fullyVisible(page.getByRole("button",{name:"Cerrar historial"}),page)
  await expect(page.getByRole("button",{name:"Nueva conversación",exact:true})).toBeVisible()
  await expect(page.getByRole("button",{name:"Iniciar sesión",exact:true})).toBeVisible()
  await page.keyboard.press("Escape");await expect(history).toBeFocused()
  expect(await page.evaluate(()=>scrollY)).toBe(0)
  await page.getByRole("banner").getByRole("link",{name:"Santos",exact:true}).filter({visible:true}).click()
  await expect(page).toHaveURL(/\/santos$/)
})
test("anonymous suggestion, multiline input and delayed answer leave the document stationary",async({page})=>{
  await page.setViewportSize({width:390,height:844})
  let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve});let calls=0
  await page.route("**/api/ai/chat",async route=>{calls++;await gate;await route.fulfill({json:{answer:"Synthetic answer. ".repeat(200)}})})
  await openChat(page)
  const {input,send}=await composer(page)
  const suggestion=page.getByRole("button",{name:"Cuéntame un milagro",exact:true})
  if(test.info().project.use.hasTouch)await suggestion.tap();else await suggestion.click()
  await expect(input).toBeFocused();await expect(input).toHaveValue("Cuéntame un milagro")
  await input.press("Shift+Enter");await expect(input).toHaveValue("Cuéntame un milagro\n");expect(calls).toBe(0)
  await input.fill(Array.from({length:20},()=>"Synthetic multiline input").join("\n"))
  expect((await input.boundingBox())!.height).toBeLessThanOrEqual(128)
  expect(await input.evaluate(element=>element.scrollHeight>element.clientHeight)).toBe(true)
  await composer(page);expect(await page.evaluate(()=>scrollY)).toBe(0)
  await send.click();await expect.poll(()=>calls).toBe(1)
  expect(await page.evaluate(()=>scrollY)).toBe(0);await composer(page)
  release();await expect(page.getByTestId("chat-messages")).toContainText("Synthetic answer.")
  await composer(page);expect(await page.evaluate(()=>scrollY)).toBe(0)
  await expect(page.getByRole("dialog")).toHaveCount(0)
})
test("visual viewport keyboard resize keeps input and send above the keyboard without document scrolling",async({page},info)=>{
  await page.route("**/api/ai/chat",route=>route.fulfill({json:{answer:"Synthetic short conversation response"}}))
  await page.setViewportSize({width:390,height:844});await openChat(page)
  const {input}=await composer(page)
  await input.fill("Synthetic first question");await input.press("Enter")
  await expect(page.getByTestId("chat-messages")).toContainText("Synthetic short conversation response")
  await input.fill("Text remains accessible with the keyboard open")
  // Browser automation has no native mobile OS keyboard. Model its visual-only
  // resize (Safari/Chrome default), separately from layout viewport resizing.
  await page.evaluate(()=>{Object.defineProperty(window.visualViewport!,"height",{configurable:true,get:()=>480});window.visualViewport!.dispatchEvent(new Event("resize"))})
  await expect.poll(()=>page.getByTestId("chat-section").evaluate(element=>element.getBoundingClientRect().bottom)).toBeLessThanOrEqual(481)
  await composer(page,480)
  expect((await page.getByTestId("chat-messages").boundingBox())!.height).toBeGreaterThanOrEqual(100)
  await expect(page.getByText("Synthetic short conversation response",{exact:true})).toBeInViewport()
  expect(await page.evaluate(()=>scrollY)).toBe(0)
  await expect(input).toHaveValue("Text remains accessible with the keyboard open")
  await page.screenshot({path:info.outputPath("keyboard-visual-viewport.png"),animations:"disabled"})
  await page.evaluate(()=>{Reflect.deleteProperty(window.visualViewport!,"height");window.visualViewport!.dispatchEvent(new Event("resize"))})
  await composer(page);await page.setViewportSize({width:390,height:480});await composer(page)
})
test("200 percent desktop reflow and translated UI retain all controls",async({page},info)=>{
  // 1366x768 at 200% browser zoom has 683x384 CSS pixels available.
  await page.setViewportSize({width:683,height:384});await openChat(page);await composer(page)
  for(const language of [{code:"en",label:"English"},{code:"fr",label:"Français"},{code:"ar",label:"العربية"}]) {
    const selector=page.getByTestId("site-language-selector").filter({visible:true})
    await selector.click()
    await page.getByRole("button",{name:language.label,exact:false}).click()
    await expect(page.getByTestId("chat-section")).toHaveAttribute("dir",language.code==="ar"?"rtl":"ltr")
    await composer(page)
    const region=page.getByTestId("chat-messages")
    const suggestions=region.locator('button[data-chat-suggestion]')
    await expect(suggestions).toHaveCount(4)
    for(const suggestion of await suggestions.all()) {
      await suggestion.focus();await page.keyboard.press("Enter")
      await expect(page.getByTestId("chat-section").locator("textarea")).not.toHaveValue("")
      await composer(page)
    }
    expect(await page.evaluate(()=>scrollY)).toBe(0)
  }
  await page.screenshot({path:info.outputPath("zoom-200-reflow-ar.png"),animations:"disabled"})
})
