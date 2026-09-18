// @vitest-environment jsdom
import { renderToString } from 'react-dom/server'
import { hydrateRoot, type Root } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { SiteProviders } from './site-providers'
import { useUser } from '@/contexts/user-context'

afterEach(()=>vi.unstubAllGlobals())
it('waits for the suspended public tree to hydrate before bootstrapping the session',async()=>{
  const fetcher=vi.fn().mockResolvedValue(new Response('{}',{status:401}))
  vi.stubGlobal('fetch',fetcher)
  let blocked=false,release:()=>void=()=>{}
  const pending=new Promise<void>(resolve=>{release=resolve})
  function Sidebar(){
    const {loading}=useUser()
    if(blocked)throw pending
    return <p>{loading?'Loading session':'Anonymous visitor'}</p>
  }
  const tree=<SiteProviders><Sidebar/></SiteProviders>
  const element=document.createElement('div');element.innerHTML=renderToString(tree);document.body.append(element)
  blocked=true
  let root:Root|undefined
  const errors:unknown[]=[]
  try {
    root=hydrateRoot(element,tree,{onRecoverableError:error=>errors.push(error)})
    await new Promise(resolve=>setTimeout(resolve,100))
    expect(fetcher,'Session effects must not race a deferred server-rendered subtree').toHaveBeenCalledTimes(0)
    blocked=false;release();await new Promise(resolve=>setTimeout(resolve,100))
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(element.textContent).toContain('Anonymous visitor')
    expect(errors).toEqual([])
  } finally {blocked=false;release();root?.unmount();element.remove()}
})
