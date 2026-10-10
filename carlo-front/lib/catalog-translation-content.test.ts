import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { expect,it } from 'vitest'
import manifest from '../content/catalog-translation-manifest.json'
import { validateTranslationPack } from './catalog-localization'
async function pack(kind:'saint'|'miracle'|'prayer',id:string,locale:string){return validateTranslationPack(JSON.parse(await readFile(new URL(`../public/catalog-translations/${manifest.version}/${kind}/${id}/${locale}.json`,import.meta.url),'utf8')),kind,id,locale)}
it('packages full authentic biographies for the twelve editorial identities, preserving paragraphs and source revisions',async()=>{
 const identities=Object.keys(manifest.entities.saint)
 expect(identities).toHaveLength(12)
 for(const id of identities)for(const locale of ['en','zh']){
  const resource=await pack('saint',id,locale),body=resource.fields.biography
  expect(body.sourceHash).toBe(createHash('md5').update(body.source).digest('hex'))
  expect(body.text).not.toBe(body.source)
  expect(body.text.split('\n\n')).toHaveLength(body.source.split('\n\n').length)
  expect(body.review).toBe('assistant')
  const months=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  // Chinese calendar notation adds a numeric month for the Spanish month name. Validate that date before comparing all remaining numbers.
  const normalized=body.text.replace(/(\d{1,2})月(\d{1,2})日/g,(_date,month:string,day:string)=>{
   expect(body.source).toContain(`${day} de ${months[Number(month)-1]}`)
   return day
  })
  // Year-month-day and month-day-year reorder the same facts; keep the complete numeric multiset after validating named months.
  expect((normalized.match(/\d+/g)||[]).sort()).toEqual((body.source.match(/\d+/g)||[]).sort())
 }
})
it('Chinese retains the actual Eucharistic devotion, canonization, all Joseph paragraphs and historical uncertainty',async()=>{
 const carlo=(await pack('saint','catalog-expansion-2026-200','zh')).fields
 expect(carlo.biography.text).toContain('对圣体怀有深厚的敬礼')
 expect(carlo.biography.text).toContain('2025年被册封为圣人')
 expect(carlo['patronOf.0'].text).toBe('青年')
 const jose=(await pack('saint','catalog-owner-2026-001','zh')).fields.biography.text
 for(const detail of ['十二岁','耶路撒冷','庇护九世','1870','3月19日','不指定他的出生或去世日期'])expect(jose).toContain(detail)
 expect(jose).not.toContain('彼得九世')
 const magdalene=(await pack('saint','catalog-owner-2026-018','zh')).fields.biography.text
 expect(magdalene).toContain('不应与玛尔大和拉匝禄的姐妹')
 expect(magdalene).toContain('并非现代意义上的册封圣人')
})
it('preserves religious/recognition qualifications in miracles and the complete historical prayer source',async()=>{
 for(const id of Object.keys(manifest.entities.miracle)){
  const resource=await pack('miracle',id,'en');expect(resource.fields.details.text).toMatch(/rather than|does not|without/)
  expect(resource.fields.details.text).toContain('https://')
 }
 const prayer=await pack('prayer','catalog-owner-2026-005-p1','zh')
 expect(prayer.fields.content.text).toContain('宽恕我们的债')
 expect(prayer.fields.content.text).toContain('1836')
 expect(prayer.fields.content.text).toContain('https://es.wikisource.org/wiki/La_Sagrada_Biblia_(XIII)/Mateo')
})
