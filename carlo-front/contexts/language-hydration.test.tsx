// @vitest-environment jsdom
import { Suspense } from 'react'
import { renderToString } from 'react-dom/server'
import { createRoot, hydrateRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { SiteProviders } from '@/components/site-providers'
import { LanguageProvider, useLanguage } from './language-context'
import { translations } from '@/lib/translations'

afterEach(()=>vi.unstubAllGlobals())
beforeEach(()=>{
  // Each case represents a separate visitor. URL/cookie preference now correctly wins over legacy storage.
  localStorage.clear()
  document.cookie='acutis_locale=; Path=/; Max-Age=0'
  window.history.replaceState(null,'','/')
})
const settle=()=>new Promise(resolve=>setTimeout(resolve,100))
function Localized({name}:{name:string}){
  const {language,t,setLanguage}=useLanguage()
  return <div data-probe={name}><p>{t('saints.title')}</p><span data-language={name}>{language}</span><button type="button" onClick={()=>setLanguage(language==='ar'?'en':'ar')}>Switch language</button></div>
}
it('uses the same normalized URL locale in request SSR and hydration, ahead of cookie/storage',async()=>{
  localStorage.setItem('language','en');document.cookie='acutis_locale=ar; Path=/'
  window.history.replaceState(null,'','/santos?q=Jos%C3%A9&lang=CN')
  const tree=<LanguageProvider initialLanguage="zh-CN"><Localized name="request"/></LanguageProvider>
  const host=document.createElement('div');host.innerHTML=renderToString(tree);document.body.append(host)
  expect(host.querySelector('[data-language="request"]')?.textContent).toBe('zh')
  const errors:unknown[]=[];const root=hydrateRoot(host,tree,{onRecoverableError:error=>errors.push(error)})
  try{await settle();expect(host.querySelector('[data-language="request"]')?.textContent).toBe('zh');expect(localStorage.getItem('language')).toBe('zh');expect(document.cookie).toContain('acutis_locale=zh');expect(window.location.search).toContain('q=Jos%C3%A9');expect(errors).toEqual([])}finally{root.unmount();host.remove()}
})

it.each(['en','ar'])('hydrates a deferred nested boundary with persisted %s without replacing server text',async(language)=>{
  localStorage.setItem('language',language)
  vi.stubGlobal('fetch',vi.fn(async()=>new Response('{}',{status:401})))
  let blocked=false,release:()=>void=()=>{}
  const pending=new Promise<void>(resolve=>{release=resolve})
  function Deferred(){if(blocked)throw pending;return <Localized name="deferred"/>}
  const tree=<SiteProviders><Localized name="shell"/><Suspense fallback={<p>Waiting for deferred hydration</p>}><Deferred/></Suspense></SiteProviders>
  const host=document.createElement('div')
  host.innerHTML=renderToString(tree)
  document.body.append(host)
  expect(host.querySelector('[data-probe="deferred"]')?.textContent).toContain(translations.es['saints.title'])
  blocked=true
  const errors:unknown[]=[]
  let root:Root|undefined
  try{
    root=hydrateRoot(host,tree,{onRecoverableError:error=>errors.push(error)})
    await settle()
    expect(host.querySelector('[data-language="shell"]')?.textContent).toBe(language)
    blocked=false;release();await settle()
    expect(host.querySelector('[data-language="deferred"]')?.textContent).toBe(language)
    expect(host.querySelector('[data-probe="deferred"]')?.textContent).toContain(translations[language]['saints.title'])
    expect(errors,'A saved locale must not race server-rendered text in a later hydrated Suspense boundary').toEqual([])
  }finally{blocked=false;release();root?.unmount();host.remove()}
})

it.each(['en','ar'])('preserves saved %s, explicit language changes and remounts after ordinary SSR hydration',async(language)=>{
  localStorage.setItem('language',language)
  const tree=<LanguageProvider><Localized name="ordinary"/></LanguageProvider>
  const host=document.createElement('div');host.innerHTML=renderToString(tree);document.body.append(host)
  const errors:unknown[]=[]
  let root:Root|undefined
  try{
    root=hydrateRoot(host,tree,{onRecoverableError:error=>errors.push(error)})
    await settle()
    expect(host.querySelector('[data-language="ordinary"]')?.textContent).toBe(language)
    host.querySelector('button')!.click();await settle()
    const selected=language==='ar'?'en':'ar'
    expect(localStorage.getItem('language')).toBe(selected)
    expect(host.querySelector('[data-probe="ordinary"]')?.textContent).toContain(translations[selected]['saints.title'])
    root.unmount();host.innerHTML=''
    root=createRoot(host);root.render(tree);await settle()
    expect(host.querySelector('[data-language="ordinary"]')?.textContent).toBe(selected)
    expect(errors).toEqual([])
  }finally{root?.unmount();host.remove()}
})
