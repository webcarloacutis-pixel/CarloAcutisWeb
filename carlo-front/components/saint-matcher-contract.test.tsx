// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { SaintMatcherForm } from './saint-matcher-form'
import { translations } from '@/lib/translations'
vi.mock('@/contexts/language-context',()=>({useLanguage:()=>({language:'fr',t:(key:string)=>translations.fr[key]??key})}))
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks()})
class RenderBoundary extends React.Component<{children:React.ReactNode},{failed:boolean}> {
  state={failed:false}
  static getDerivedStateFromError(){return {failed:true}}
  render(){return this.state.failed?<p role="alert">RENDER_ERROR</p>:this.props.children}
}
function submit(){
  render(<RenderBoundary><SaintMatcherForm /></RenderBoundary>)
  fireEvent.click(screen.getByRole('button',{name:translations.fr['supplemental.trait0']}))
  fireEvent.click(screen.getByRole('button',{name:translations.fr['supplemental.discover']}))
}
it.each([
  ['HTML200',()=>new Response('<h1>private proxy diagnostic</h1>',{status:200,headers:{'Content-Type':'text/html'}})],
  ['malformed matches',()=>Response.json({summary:'private response text',matches:'not-an-array'})],
  ['malformed name',()=>Response.json({summary:'private response text',matches:[{slug:'saint',name:{invalid:true}}]})],
] as const)('rejects %s safely instead of showing empty results or crashing React',async(_name,response)=>{
  vi.spyOn(console,'error').mockImplementation(()=>{})
  const fetcher=vi.fn(async()=>response())
  vi.stubGlobal('fetch',fetcher)
  submit()
  expect((await screen.findByRole('alert')).textContent).toBe(translations.fr['chat.invalid'])
  expect(screen.queryByText(/private proxy diagnostic|private response text|RENDER_ERROR/)).toBeNull()
  expect(screen.queryByText(translations.fr['supplemental.resultsHeading'])).toBeNull()
  expect(screen.getByRole('button',{name:translations.fr['supplemental.discover']})).toBeTruthy()
  expect(fetcher).toHaveBeenCalledTimes(1)
})
it('preserves a valid success response and the documented name without automatic translation',async()=>{
  const payload={summary:'Resumen auténtico recibido',matches:[{id:'fixture',slug:'carlo-acutis',name:'Carlo Acutis',score:0.75}],termsUsed:['Compasivo']}
  vi.stubGlobal('fetch',vi.fn(async()=>Response.json(payload)))
  submit()
  expect(await screen.findByText(payload.summary)).toBeTruthy()
  expect(screen.getByText(payload.matches[0].name)).toBeTruthy()
  expect(screen.getByRole('link',{name:translations.fr['supplemental.viewSaint']}).getAttribute('href')).toBe('/santos/carlo-acutis')
  expect(screen.queryByRole('alert')).toBeNull()
})
