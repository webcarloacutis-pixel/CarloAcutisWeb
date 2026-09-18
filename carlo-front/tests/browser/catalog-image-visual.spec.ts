import { test, expect } from '@playwright/test'

test.skip(process.env.ACUTIS_SCALE_BROWSER !== '1', 'Requires the local disposable scale fixture')
for (const [width,height] of [[1440,900],[390,844]]) test(`public image frame and basic text contrast at ${width}x${height}`, async ({page,baseURL}) => {
  expect(baseURL).toBe('http://127.0.0.1:3197')
  await page.setViewportSize({width,height})
  await page.goto('/santos/scale-saint-0000',{waitUntil:'domcontentloaded'})
  const image=page.locator('main img').first()
  await expect.poll(()=>image.evaluate(node=>(node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  const frame=await image.evaluate(node=>({image:getComputedStyle(node).backgroundColor,parent:getComputedStyle(node.parentElement!).backgroundColor,fit:getComputedStyle(node).objectFit}))
  expect(frame.parent).not.toBe('rgba(0, 0, 0, 0)')
  expect(frame.image).toBe(frame.parent)
  expect(frame.fit).toBe('contain')
  const contrast=await page.evaluate(()=>{
    const luminance=(color:string)=>{
      const rgb=(color.match(/[\d.]+/g)||[]).slice(0,3).map(Number).map(v=>{const n=v/255;return n<=0.04045?n/12.92:((n+0.055)/1.055)**2.4})
      return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722
    }
    const ratio=(text:string,bg:string)=>{const a=luminance(text),b=luminance(bg);return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)}
    const samples=[document.body,document.querySelector('main .text-muted-foreground')!]
    return samples.map(node=>{
      let parent:Element|null=node;let background='rgb(255, 255, 255)'
      while(parent){const value=getComputedStyle(parent).backgroundColor;if(value!=='rgba(0, 0, 0, 0)'&&value!=='transparent'){background=value;break}parent=parent.parentElement}
      const foreground=getComputedStyle(node).color
      return {foreground,background,ratio:ratio(foreground,background)}
    })
  })
  for (const sample of contrast) expect(sample.ratio).toBeGreaterThanOrEqual(4.5)
  await test.info().attach('frame-and-text-contrast',{body:JSON.stringify({frame,contrast,scope:'Body and muted detail text samples, not a complete WCAG certification'}),contentType:'application/json'})
  await page.screenshot({path:test.info().outputPath(`catalogue-detail-${width}.png`)})
})
