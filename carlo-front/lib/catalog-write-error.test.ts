import { expect, it } from 'vitest'
import { catalogWriteError } from './catalog-write-error'
import { translations } from './translations'

it.each([
  ['SAINT_LIMIT_REACHED','catalog.saintLimitReached'],
  ['MIRACLE_LIMIT_REACHED','catalog.miracleLimitReached'],
])('returns a translation key for %s rather than a fixed-language message',async(code,key)=>{
  expect(await catalogWriteError(Response.json({error:code,message:'private diagnostic'},{status:409}),'supplemental.writeFailed')).toBe(key)
})

it('uses the safe caller fallback for unknown or non-JSON responses',async()=>{
  expect(await catalogWriteError(Response.json({error:'UNKNOWN',message:'private diagnostic'},{status:500}),'supplemental.writeFailed')).toBe('supplemental.writeFailed')
  expect(await catalogWriteError(new Response('private ingress HTML',{status:503}),'supplemental.writeFailed')).toBe('supplemental.writeFailed')
})

it('preserves the catalog capacity of 3000 in every localized limit message',()=>{
  for(const entries of Object.values(translations))for(const key of ['catalog.saintLimitReached','catalog.miracleLimitReached']){
    expect(entries[key]).toContain('3000')
    expect(entries[key]).not.toBe(key)
  }
  expect(translations.es['catalog.saintLimitReached']).toBe('Se alcanzó el límite de 3000 santos. No se pueden crear más registros.')
})
