// @vitest-environment jsdom
import { cleanup,render,screen,waitFor } from '@testing-library/react'
import { afterEach,expect,it,vi } from 'vitest'
import { usePublicPopularity } from './use-public-popularity'
import { PublicReadError } from './public-request'
const reads=vi.hoisted(()=>({collection:vi.fn()}))
vi.mock('./public-collection',()=>({fetchPublicCollection:reads.collection}))
afterEach(()=>{cleanup();reads.collection.mockReset()})
function Probe(){const result=usePublicPopularity('prayer');return <div><p>Original full content remains readable.</p><span>{result.error||''}</span><button onClick={result.retry} disabled={!result.canRetry}>Retry</button></div>}
it('keeps content readable when optional estimates fail and uses only a public GET collection without credentials',async()=>{
 reads.collection.mockRejectedValue(new PublicReadError('CATALOG_HTTP_ERROR','fixture',503))
 render(<Probe/>);expect(screen.getByText('Original full content remains readable.')).toBeTruthy()
 await waitFor(()=>expect(screen.getByText('catalog.temporarilyUnavailable')).toBeTruthy())
 expect(reads.collection).toHaveBeenCalledTimes(1)
 expect(reads.collection).toHaveBeenCalledWith('/api/popularity?kind=prayer',expect.objectContaining({cache:'no-store',credentials:'omit',signal:expect.any(AbortSignal)}))
})
