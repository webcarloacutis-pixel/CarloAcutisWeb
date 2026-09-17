import { test, expect, type Page } from "@playwright/test"

type Sample={document:number;window:number;chat:number}
async function sample(page:Page):Promise<Sample>{return page.evaluate(()=>({document:document.scrollingElement!.scrollTop,window:window.scrollY,chat:document.querySelector<HTMLElement>('[data-testid="chat-messages"]')!.scrollTop}))}
async function startRecording(page:Page){
  await page.evaluate(()=>{
    const state=window as typeof window & {chatScrollSamples:Sample[];chatScrollRecording:boolean;chatScrollCleanup?:()=>void}
    state.chatScrollCleanup?.();state.chatScrollSamples=[];state.chatScrollRecording=true
    const record=()=>{if(state.chatScrollRecording)state.chatScrollSamples.push({document:document.scrollingElement!.scrollTop,window:window.scrollY,chat:document.querySelector<HTMLElement>('[data-testid="chat-messages"]')!.scrollTop})}
    const frame=()=>{record();if(state.chatScrollRecording)requestAnimationFrame(frame)}
    window.addEventListener('scroll',record,true);state.chatScrollCleanup=()=>{state.chatScrollRecording=false;window.removeEventListener('scroll',record,true)};frame()
  })
  return sample(page)
}
async function assertUnmoved(page:Page,initial:Sample,label:string){
  // Allow smooth scroll/layout effects to expose transient movement, not only an end position.
  await page.waitForTimeout(250)
  const samples=await page.evaluate(()=>{const state=window as typeof window & {chatScrollSamples:Sample[];chatScrollCleanup:()=>void};state.chatScrollCleanup();return state.chatScrollSamples})
  const deltas={document:Math.max(0,...samples.map(s=>Math.abs(s.document-initial.document))),window:Math.max(0,...samples.map(s=>Math.abs(s.window-initial.window))),chat:Math.max(0,...samples.map(s=>Math.abs(s.chat-initial.chat)))}
  await test.info().attach(label,{body:JSON.stringify({initial,deltas,observations:samples.length}),contentType:'application/json'})
  expect(samples.length).toBeGreaterThan(1)
  expect(deltas).toEqual({document:0,window:0,chat:0})
}
async function prepare(page:Page){
  const input=page.getByTestId('chat-section').locator('textarea')
  await input.fill('Synthetic browser question')
  await input.scrollIntoViewIfNeeded();await input.focus()
  await page.evaluate(()=>{const rect=document.querySelector('[data-testid="chat-section"] textarea')!.getBoundingClientRect();window.scrollTo({top:Math.max(100,scrollY+rect.bottom-innerHeight+90),behavior:'instant'})})
  await expect(input).toBeInViewport()
  const button=page.getByTestId('chat-section').locator('button[type="submit"]')
  await expect(button).toBeInViewport();await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(0)
  await page.waitForTimeout(100) // Finish preparation before sampling.
  return {input,button}
}
async function send(page:Page,method:'button'|'Enter'){
  if(method==='Enter')await page.keyboard.press('Enter')
  else {const box=await page.getByTestId('chat-section').locator('button[type="submit"]').boundingBox();expect(box).toBeTruthy();await page.mouse.click(box!.x+box!.width/2,box!.y+box!.height/2)}
}
async function navigate(page:Page,many=false){
  // Only the browser contract is simulated here; separate tests cover HTTP/SQL and the paid provider.
  if(many){
    await page.route('**/api/auth/me',route=>route.fulfill({json:{user:{id:'synthetic-user',email:'synthetic@example.invalid',name:'Synthetic'}}}))
    await page.route('**/api/conversations?*',route=>route.fulfill({json:{conversations:[{id:'synthetic-conversation',title:'Synthetic long history',createdAt:new Date(0),updatedAt:new Date(0)}]}}))
    await page.route('**/api/conversations/synthetic-conversation/messages*',route=>route.fulfill({json:route.request().method()==='GET'?{messages:Array.from({length:50},(_,i)=>({id:'synthetic-'+i,role:i%2?'assistant':'user',content:'Synthetic history '+i+' '.repeat(1)+'message '.repeat(15),createdAt:new Date(i*1000)}))}:{message:{}}}))
    await page.route('**/api/conversations/synthetic-conversation',route=>route.fulfill({json:{conversation:{}}}))
  }else await page.route('**/api/auth/me',route=>route.fulfill({status:401,json:{error:'NOT_AUTHENTICATED'}}))
  await page.goto('/',{waitUntil:'networkidle'})
  await expect(page.getByTestId('chat-section')).toBeVisible()
}

for(const method of ['button','Enter'] as const)for(const many of [false,true]){
  test(`manual scroll: ${method}, ${many?'long history':'short chat'}, long response`,async({page})=>{
    let calls=0
    await page.route('**/api/ai/chat',async route=>{calls++;await new Promise(resolve=>setTimeout(resolve,350));await route.fulfill({json:{answer:'Synthetic long answer. '.repeat(500)}})})
    await navigate(page,many);await prepare(page)
    if(many)await page.getByTestId('chat-messages').evaluate(element=>{element.scrollTop=150})
    const before=await startRecording(page);await send(page,method)
    await expect(page.getByTestId('chat-messages')).toContainText('Synthetic long answer.')
    await assertUnmoved(page,before,'send-and-receive');expect(calls).toBe(1)
  })
}
test('slow error preserves manual document and chat movement during the wait',async({page})=>{
  let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve})
  await page.route('**/api/ai/chat',async route=>{await gate;await route.fulfill({status:504,json:{error:'AI_TIMEOUT'}})})
  await navigate(page,true);await prepare(page)
  const before=await startRecording(page);await send(page,'Enter');await expect(page.getByTestId('chat-status')).toContainText('Preparando')
  await assertUnmoved(page,before,'spinner-and-wait')
  // Deliberate manual actions are outside the stationary sampling interval.
  await page.mouse.move(5,500);await page.mouse.wheel(0,120);await page.waitForTimeout(150)
  await page.getByTestId('chat-messages').evaluate(element=>{element.scrollTop=220})
  const moved=await startRecording(page);expect(moved.document).not.toBe(before.document);expect(moved.chat).toBe(220)
  release();await expect(page.getByTestId('chat-status')).toContainText('tardó demasiado');await assertUnmoved(page,moved,'error-after-manual-scroll')
})
for(const locale of [{code:'en',label:'English',input:'Message for the AI'},{code:'fr',label:'Français',input:'Message pour l’IA'},{code:'ar',label:'العربية',input:'رسالة إلى الذكاء الاصطناعي'}]){
 test(`language ${locale.code}: shared selector cancels pending reply without another request`,async({page})=>{
  let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve});const sent:string[]=[]
  await page.route('**/api/ai/chat',async route=>{sent.push(route.request().postDataJSON().lang);if(sent.length===1)await gate;await route.fulfill({json:{answer:sent.length===1?'LATE OLD LANGUAGE':'Synthetic current language answer'}}).catch(()=>{})})
  await navigate(page);await prepare(page);await send(page,'Enter');await expect.poll(()=>sent.length).toBe(1)
  // Ensure the existing site selector is visible before starting the position measurement.
  const selector=page.getByTestId('site-language-selector').filter({visible:true});await selector.scrollIntoViewIfNeeded()
  await page.evaluate(()=>window.scrollTo({top:100,behavior:'instant'}));await page.waitForTimeout(100)
  const before=await startRecording(page);await selector.click();await page.getByRole('button',{name:locale.label,exact:false}).click()
  await expect(page.getByLabel(locale.input,{exact:true})).toHaveCount(1)
  release();await expect(page.getByTestId('chat-status')).not.toHaveText('');await page.waitForTimeout(200)
  expect(sent).toEqual(['es']);await expect(page.getByTestId('chat-messages')).not.toContainText('LATE OLD LANGUAGE')
  await expect(page.getByTestId('chat-messages')).toContainText('Synthetic browser question');await assertUnmoved(page,before,'language-change')
  expect(await page.getByTestId('chat-section').getAttribute('dir')).toBe(locale.code==='ar'?'rtl':'ltr')
  await prepare(page);await send(page,'Enter');await expect.poll(()=>sent.length).toBe(2);expect(sent[1]).toBe(locale.code)
 })
}
test('IME Enter and Shift+Enter never cause a submit',async({page})=>{
  let requests=0;await page.route('**/api/ai/chat',route=>{requests++;return route.fulfill({json:{answer:'Unexpected'}})})
  await navigate(page);const {input}=await prepare(page);const before=await startRecording(page)
  await input.dispatchEvent('keydown',{key:'Enter',code:'Enter',isComposing:true,keyCode:229,bubbles:true})
  await page.keyboard.press('Shift+Enter');await assertUnmoved(page,before,'composition-and-newline');expect(requests).toBe(0)
  expect(await input.inputValue()).toContain('\n')
})
