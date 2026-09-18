import { test, expect } from '@playwright/test'

test.skip(process.env.ACUTIS_RELEASE_BROWSER !== '1', 'Requires the isolated restored public snapshot')
test.use({trace:'off'})
test.beforeEach(async ({baseURL}) => { expect(new URL(baseURL!).hostname).toBe('127.0.0.1') })

// Bounded batches preserve evidence/progress and avoid retaining 179 pages in a single trace.
test.describe('all existing detail batches', () => {
  let records: {id:string;slug:string;name:string}[]=[]
  test.beforeAll(async({request,browserName})=>{
    if(browserName!=='chromium')return
    records=[];let cursor:string|null=null
    do {
      const response=await request.get('/api/saints?view=names&limit=100'+(cursor?'&cursor='+encodeURIComponent(cursor):''))
      expect(response.ok()).toBe(true)
      const body=await response.json();records.push(...body.items);cursor=body.nextCursor
    } while(cursor)
    expect(records).toHaveLength(179);expect(new Set(records.map(row=>row.id)).size).toBe(179)
  })
  for(let batch=0;batch<18;batch++)test(`batch ${batch+1} opens existing details with their decoded public image`,async({page,browserName})=>{
    test.skip(browserName!=='chromium','Complete sweep in Chromium; representative layouts/failures use all engines')
    test.setTimeout(180_000);page.setDefaultNavigationTimeout(30_000)
    const results:Record<string,unknown>[]=[]
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.name))
    for(const row of records.slice(batch*10,batch*10+10)){
      const started=Date.now()
      const response=await page.goto('/santos/'+row.slug,{waitUntil:'domcontentloaded'})
      expect(response?.status(),row.slug).toBe(200)
      await expect(page.getByRole('heading',{level:1,name:row.name,exact:true})).toBeVisible()
      await expect(page.getByRole('heading',{name:'No se pudo cargar el contenido',exact:true})).toHaveCount(0)
      const picture=page.locator('main img').first()
      await expect.poll(()=>picture.evaluate(image=>(image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
      expect(await picture.getAttribute('src')).toContain('/storage/v1/object/public/acutis-catalog/')
      expect(await picture.evaluate(image=>getComputedStyle(image).objectFit)).toBe('contain')
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),row.slug).toBe(true)
      expect(errors,row.slug).toEqual([])
      results.push({id:row.id,slug:row.slug,decoded:true,durationMs:Date.now()-started})
    }
    expect(results).toHaveLength(batch===17?9:10)
    await test.info().attach('existing-detail-batch',{body:JSON.stringify(results),contentType:'application/json'})
  })
})

for(const [width,height] of [[1366,768],[1440,900],[768,1024],[360,800],[390,844],[430,932]]) {
  test(`legacy detail and complete portrait fit ${width}x${height}`,async({page})=>{
    await page.setViewportSize({width,height})
    await page.goto('/santos/santa-felicidad',{waitUntil:'networkidle'})
    await expect(page.getByRole('heading',{level:1,name:'Santa Felicidad',exact:true})).toBeVisible()
    const image=page.locator('main img').first()
    await expect.poll(()=>image.evaluate(node=>(node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
    expect(await image.evaluate(node=>getComputedStyle(node).objectFit)).toBe('contain')
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
    await expect(page.getByRole('link',{name:'Procedencia',exact:true})).toHaveAttribute('href',/^https:\/\/commons\.wikimedia\.org\//)
    await page.screenshot({path:test.info().outputPath(`felicidad-${width}.png`),fullPage:true})
    await page.getByRole('link',{name:'Volver a Santos',exact:true}).focus()
    await expect(page.getByRole('link',{name:'Volver a Santos',exact:true})).toBeFocused()
  })
}

for(const failure of ['404','corrupt'] as const) {
  test(`failed image ${failure} has one stable fallback and does not break detail`,async({page})=>{
    let attempts=0
    await page.route('https://rquzpsjismymbyijwhgj.supabase.co/storage/v1/object/public/acutis-catalog/**',route=>{
      attempts++;return route.fulfill({status:failure==='404'?404:200,contentType:'image/webp',body:failure==='404'?'':'not-an-image'})
    })
    await page.goto('/santos/santa-felicidad',{waitUntil:'networkidle'})
    await expect(page.getByRole('heading',{level:1,name:'Santa Felicidad'})).toBeVisible()
    const picture=page.locator('main img').first()
    await expect(picture).toHaveAttribute('src','/placeholder.svg')
    await expect.poll(()=>picture.evaluate(node=>(node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
    // Next16 ImageElement reassigns img.src once on hydration to replay a lost
    // native error (next/dist/client/image-component.js). Chromium can therefore
    // make two original requests; Firefox may reuse the first failure.
    expect(attempts).toBeGreaterThanOrEqual(1)
    expect(attempts).toBeLessThanOrEqual(2)
    const settled = attempts
    await page.waitForTimeout(300)
    expect(attempts).toBe(settled)
    await expect(picture).toHaveAttribute('src','/placeholder.svg')
    await test.info().attach('bounded-image-fallback',{body:JSON.stringify({originalRequests:attempts,stableFallback:true,nextHydrationReplayMaximum:1}),contentType:'application/json'})
  })
}

test('slow image keeps a reserved frame and becomes a decoded portrait',async({page})=>{
  let release:()=>void=()=>{}
  const gate=new Promise<void>(resolve=>{release=resolve})
  await page.route('https://rquzpsjismymbyijwhgj.supabase.co/storage/v1/object/public/acutis-catalog/**',async route=>{await gate;await route.continue()})
  await page.goto('/santos/san-jose',{waitUntil:'domcontentloaded'})
  const image=page.locator('main img').first()
  const before=await image.boundingBox();expect(before?.height).toBeGreaterThan(200)
  release()
  await expect.poll(()=>image.evaluate(node=>(node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  const after=await image.boundingBox();expect(after?.height).toBe(before?.height);expect(after?.width).toBe(before?.width)
})
