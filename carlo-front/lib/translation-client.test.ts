import { expect, it, vi } from 'vitest'
import { acquireTranslation } from './translation-client'
import { postAiTranslate } from './ai-client'
vi.mock('./ai-client',()=>({postAiTranslate:vi.fn()}))
it('deduplicates identical explicit requests, caps concurrency and reuses successful results',async()=>{
  let resolve!:(value:{translated:string})=>void
  vi.mocked(postAiTranslate).mockReturnValue(new Promise(done=>{resolve=done}))
  const a=acquireTranslation('dedup source','fr'),b=acquireTranslation('dedup source','fr'),c=acquireTranslation('second source','fr')
  expect(postAiTranslate).toHaveBeenCalledTimes(2)
  await expect(acquireTranslation('third source','fr').promise).rejects.toThrow('TRANSLATION_BUSY')
  a.release();expect(vi.mocked(postAiTranslate).mock.calls[0][1]?.aborted).toBe(false)
  resolve({translated:'résultat'})
  expect(await b.promise).toBe('résultat');expect(await c.promise).toBe('résultat')
  b.release();c.release()
  expect(await acquireTranslation('dedup source','fr').promise).toBe('résultat');expect(postAiTranslate).toHaveBeenCalledTimes(2)
})
it('caches a failed attempt briefly and never retries automatically',async()=>{
  vi.mocked(postAiTranslate).mockReset().mockRejectedValue(new Error('Unavailable'))
  const a=acquireTranslation('failure source','it');await expect(a.promise).rejects.toThrow();a.release()
  await expect(acquireTranslation('failure source','it').promise).rejects.toThrow();expect(postAiTranslate).toHaveBeenCalledOnce()
})
