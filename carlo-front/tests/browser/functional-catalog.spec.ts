import { test,expect,type Page } from '@playwright/test'
import order from '../../../carlo-back/src/catalog/santos_orden_popularidad_editorial.json'
import { languages } from '../../lib/i18n'
import { observeReleaseNetwork,assertReleaseNetwork } from './release-network'
test.skip(process.env.ACUTIS_RELEASE_BROWSER!=='1','Requires the guarded local public catalogue copy')
test.use({trace:'off'})
test.beforeEach(async({baseURL})=>{
 expect(baseURL).toBe('http://127.0.0.1:3197')
 expect(process.env.BACKEND_URL).toBe('http://127.0.0.1:3198')
 const database=new URL(process.env.DATABASE_URL||'')
 expect([database.hostname,database.port,database.pathname,database.searchParams.get('sslaccept')]).toEqual(['127.0.0.1','55439','/acutis_catalog_browser_test','strict'])
})
const cards=(page:Page)=>page.locator('main a[href^="/santos/"]')
async function choose(page:Page,code:string){
 const language=languages.find(item=>item.code===code)!
 const selector=page.getByTestId('site-language-selector').filter({visible:true}).first()
 await selector.click()
 const menuId=await selector.getAttribute('aria-controls')
 await page.locator(`[id="${menuId}"]`).getByRole('button').filter({hasText:language.name}).click()
 await expect(page.locator('html')).toHaveAttribute('lang',code==='zh'?'zh-CN':code)
}
test('all179 authentic identities paginate in editorial order; anonymous401 and all15 UI locales preserve the first page',async({page,request})=>{
 test.setTimeout(120000)
 const seen:{id:string;name:string;slug:string}[]=[];let cursor:string|null=null
 do{
  const response=await request.get('/api/saints?view=cards&limit=12'+(cursor?'&cursor='+encodeURIComponent(cursor):''))
  expect(response.status()).toBe(200)
  const body=await response.json();expect(body.rankingMode).toBe('editorial');seen.push(...body.items.map((row:{id:string;name:string;slug:string})=>({id:row.id,name:row.name,slug:row.slug})));cursor=body.nextCursor
 }while(cursor)
 expect(seen).toEqual(order.santos.map(({id,name,slug})=>({id,name,slug})))
 expect(new Set(seen.map(row=>row.id)).size).toBe(179)
 const network=observeReleaseNetwork(page),errors:string[]=[],detailReads:string[]=[],aiReads:string[]=[]
 page.on('pageerror',error=>errors.push(error.name))
 page.on('request',req=>{const path=new URL(req.url()).pathname;if(/^\/santos\/[^/]+$/.test(path))detailReads.push(path);if(/\/ai\//.test(path))aiReads.push(path)})
 await page.goto('/santos?lang=es')
 await expect(cards(page)).toHaveCount(12)
 expect((await request.get('/api/auth/me')).status()).toBe(401)
 for(const language of languages){
  await choose(page,language.code)
  const slugs=await cards(page).evaluateAll(nodes=>nodes.map(node=>new URL((node as HTMLAnchorElement).href).pathname.split('/').pop()))
  expect(slugs).toEqual(order.santos.slice(0,12).map(row=>row.slug))
  expect(await page.locator('html').getAttribute('dir')).toBe(language.code==='ar'?'rtl':'ltr')
 }
 expect(detailReads).toEqual([]);expect(aiReads).toEqual([]);expect(errors).toEqual([])
 await assertReleaseNetwork(network,test.info())
})
test('image, heading, biography and free card space open one canonical detail and preserve filters and return scroll',async({page})=>{
 test.setTimeout(120000)
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.name))
 for(const zone of ['image','heading','biography','space']){
  await page.goto('/santos?q=Jos%C3%A9&sort=alphabetical&lang=es')
  const link=cards(page).filter({has:page.getByRole('heading',{name:'San José',exact:true})}).first()
  await expect(link).toBeVisible()
  const href=await link.getAttribute('href');expect(new URL(href!,'http://localhost').pathname).toBe('/santos/san-jose')
  const target=zone==='image'?link.locator('img'):zone==='heading'?link.locator('h3'):zone==='biography'?link.locator('p').filter({hasText:'José aparece'}):link
  await target.scrollIntoViewIfNeeded();const box=await target.boundingBox();expect(box).toBeTruthy()
  const before=await page.evaluate(()=>scrollY)
  const point=zone==='space'?{x:box!.x+box!.width-5,y:box!.y+box!.height-5}:{x:box!.x+box!.width/2,y:box!.y+Math.min(box!.height/2,30)}
  if(test.info().project.use.hasTouch)await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y)
  await expect(page.getByRole('heading',{level:1,name:'San José',exact:true})).toBeVisible()
  const back=page.getByRole('link',{name:'Volver a Santos',exact:true})
  const restored=new URL((await back.getAttribute('href'))!,'http://localhost')
  expect(restored.searchParams.get('q')).toBe('José');expect(restored.searchParams.get('sort')).toBe('alphabetical')
  await page.goBack();await expect(link).toBeVisible();expect(new URL(page.url()).searchParams.get('q')).toBe('José')
  await expect.poll(async()=>Math.abs(await page.evaluate(()=>scrollY)-before)).toBeLessThan(100)
 }
 expect(errors).toEqual([])
})
test('keyboard focus and native modified/middle links retain canonical new-tab navigation',async({page,context})=>{
 test.skip(Boolean(test.info().project.use.hasTouch),'Touch opening is exercised in the card-zone journey')
 await page.goto('/santos?q=Carlo&lang=es');const link=cards(page).first();await expect(link).toBeVisible()
 let focused=false
 for(let index=0;index<50;index++){await page.keyboard.press('Tab');focused=await link.evaluate(node=>node===document.activeElement);if(focused)break}
 expect(focused).toBe(true);expect(await link.evaluate(node=>getComputedStyle(node).boxShadow)).not.toBe('none')
 await page.keyboard.press('Enter');await expect(page.getByRole('heading',{level:1,name:'San Carlo Acutis',exact:true})).toBeVisible();await page.goBack()
 for(const action of ['Control','middle'] as const){
  const opened=context.waitForEvent('page')
  await link.click(action==='middle'?{button:'middle'}:{modifiers:[action]})
  const tab=await opened;await tab.waitForLoadState('domcontentloaded');expect(new URL(tab.url()).pathname).toBe('/santos/san-carlo-acutis');await tab.close()
 }
})
test('ES→Chinese→English→ES changes full real biography and patronage, survives reload/history and makes no AI call',async({page})=>{
 const network=observeReleaseNetwork(page),errors:string[]=[],ai:string[]=[],timings:{locale:string;ms:number}[]=[]
 page.on('pageerror',error=>errors.push(error.name));page.on('request',request=>{if(new URL(request.url()).pathname.includes('/ai/'))ai.push(request.method())})
 await page.goto('/santos/san-carlo-acutis?lang=es')
 const biography=page.getByTestId('saint-biography')
 await expect(biography).toContainText('Carlo Acutis nació en Londres en 1991')
 for(const [locale,expected,patron]of [['zh','对圣体怀有深厚的敬礼','青年'],['en','deep devotion to the Eucharist','Young people'],['es','intensa devoción eucarística','Jóvenes']] as const){
  const started=Date.now();await choose(page,locale);await expect(biography).toContainText(expected);await expect(page.getByText(patron,{exact:true}).first()).toBeVisible();timings.push({locale,ms:Date.now()-started})
 }
 await choose(page,'zh');await expect(biography).toContainText('2025年被册封为圣人');await page.reload();await expect(biography).toContainText('2025年被册封为圣人')
 await page.locator('main a[href^="/santos"]').first().click()
  await expect(page).toHaveURL(/\/santos(?:\?|$)/);await expect(cards(page)).toHaveCount(12)
 await page.goBack();await expect(biography).toContainText('2025年被册封为圣人')
 expect(errors).toEqual([]);expect(ai).toEqual([]);await assertReleaseNetwork(network,test.info())
 await test.info().attach('local-language-switch-samples',{body:JSON.stringify({samples:timings,network:'loopback, normal selected-locale reads',paidCalls:0,coverage:'partial resources; no acceptance of all14 languages'}),contentType:'application/json'})
})
test('a503 prayer section remains recoverable without a global Server Component failure or missing biography',async({page})=>{
 let blocked=true,calls=0
 await page.route('**/api/prayers/approved?**',route=>{calls++;return blocked?route.fulfill({status:503,contentType:'application/json',body:'{"error":"SYNTHETIC_LOCAL_FAILURE"}'}):route.continue()})
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.name))
 await page.goto('/santos/san-jose?lang=es');await expect(page.getByTestId('saint-biography')).toContainText('Pío IX')
 await expect(page.getByRole('heading',{name:'No se pudo cargar el contenido',exact:true})).toHaveCount(0)
 const section=page.getByRole('alert').filter({has:page.getByRole('button',{name:'Volver a intentar',exact:true})});await expect(section).toBeVisible();expect(calls).toBe(1)
 blocked=false;await section.getByRole('button',{name:'Volver a intentar',exact:true}).click();await expect(section).toHaveCount(0);expect(calls).toBe(2);expect(errors).toEqual([])
})
