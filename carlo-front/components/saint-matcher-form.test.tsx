// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { SaintMatcherForm } from "./saint-matcher-form"
import { SaintMatcherResults } from './saint-matcher-results'
import { translations } from '@/lib/translations'
const locale=vi.hoisted(()=>({language:'es'}))
vi.mock('@/contexts/language-context',()=>({useLanguage:()=>({language:locale.language,t:(key:string)=>translations[locale.language]?.[key]??key})}))

afterEach(() => { cleanup(); vi.unstubAllGlobals(); locale.language='es' })

it("exposes every selectable quality and growth area as a native toggle button", () => {
  render(<SaintMatcherForm />)
  const quality = screen.getByRole("button", { name: "Compasivo" })
  const challenge = screen.getByRole("button", { name: "Impaciencia" })
  const submit = screen.getByRole("button", { name: "Descubrir mis santos afines" })
  expect(quality.tagName).toBe("BUTTON")
  expect(quality.getAttribute("type")).toBe("button")
  expect(quality.getAttribute("aria-pressed")).toBe("false")
  expect((submit as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(quality)
  expect(quality.getAttribute("aria-pressed")).toBe("true")
  expect((submit as HTMLButtonElement).disabled).toBe(false)
  fireEvent.click(quality)
  expect((submit as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(challenge)
  expect(challenge.getAttribute("aria-pressed")).toBe("true")
  expect((submit as HTMLButtonElement).disabled).toBe(false)
})

it("submits selected traits without duplicates and translates rate limit feedback", async () => {
  const fetcher = vi.fn(async () => Response.json({ error: "RATE_LIMITED" }, { status: 429 }))
  vi.stubGlobal("fetch", fetcher)
  render(<SaintMatcherForm />)
  const quality = screen.getByRole("button", { name: "Compasivo" })
  fireEvent.click(quality); fireEvent.click(quality); fireEvent.click(quality)
  fireEvent.click(screen.getByRole("button", { name: "Impaciencia" }))
  fireEvent.click(screen.getByRole("button", { name: "Descubrir mis santos afines" }))
  expect(await screen.findByText(translations.es['catalog.rateLimited'])).toBeTruthy()
  expect(screen.queryByText('RATE_LIMITED')).toBeNull()
  expect(fetcher).toHaveBeenCalledTimes(1)
  const call = fetcher.mock.calls[0] as unknown as [string, RequestInit]
  expect(call[0]).toBe('/api/discover-saint')
  expect(call[1].credentials).toBe('include')
  expect(call[1].signal).toBeInstanceOf(AbortSignal)
  expect(JSON.parse(String(call[1].body))).toEqual({ about: "", qualities: ["Compasivo"], growthAreas: ["Impaciencia"] })
})

it.each([[401,'catalog.accessDenied'],[503,'catalog.temporarilyUnavailable']])('localizes HTTP %i without exposing backend bodies',async(status,key)=>{
  locale.language='fr'
  vi.stubGlobal('fetch',vi.fn(async()=>Response.json({error:'PRIVATE_DETAIL',detail:'private diagnostic'},{status:Number(status)})))
  render(<SaintMatcherForm />)
  fireEvent.click(screen.getByRole('button',{name:translations.fr['supplemental.trait0']}))
  fireEvent.click(screen.getByRole('button',{name:translations.fr['supplemental.discover']}))
  expect((await screen.findByRole('alert')).textContent).toBe(translations.fr[String(key)])
  expect(screen.queryByText(/PRIVATE_DETAIL|private diagnostic/)).toBeNull()
})

it('keeps the existing compatibility values while translating all selectable labels',async()=>{
  locale.language='ja'
  const fetcher=vi.fn(async()=>Response.json({error:'RATE_LIMITED'},{status:429}))
  vi.stubGlobal('fetch',fetcher)
  render(<SaintMatcherForm />)
  fireEvent.click(screen.getByRole('button',{name:translations.ja['supplemental.trait0']}))
  fireEvent.click(screen.getByRole('button',{name:translations.ja['supplemental.challenge14']}))
  fireEvent.click(screen.getByRole('button',{name:translations.ja['supplemental.discover']}))
  await screen.findByRole('alert')
  const request=fetcher.mock.calls[0] as unknown as [string,RequestInit]
  expect(JSON.parse(String(request[1].body))).toEqual({about:'',qualities:['Compasivo'],growthAreas:['DesorganizaciÃ³n']})
})

it('distinguishes reserved and prudent qualities in Korean',()=>{
  locale.language='ko'
  render(<SaintMatcherForm />)
  const reserved=screen.getByRole('button',{name:'과묵한'})
  const prudent=screen.getByRole('button',{name:'신중한'})
  expect(reserved).not.toBe(prudent)
  expect(reserved.getAttribute('aria-pressed')).toBe('false')
  expect(prudent.getAttribute('aria-pressed')).toBe('false')
})

it('translates result controls while preserving authentic names, returned text and encoded routes',()=>{
  locale.language='fr'
  const reset=vi.fn()
  render(<SaintMatcherResults result={{summary:'Resumen recibido sin alterar',matches:[{slug:'carlo /acutis',name:'Carlo Acutis',score:0.75}]}} onReset={reset} />)
  expect(screen.getByText('Resumen recibido sin alterar')).toBeTruthy()
  expect(screen.getByText('Carlo Acutis')).toBeTruthy()
  expect(screen.getByRole('link',{name:translations.fr['supplemental.viewSaint']}).getAttribute('href')).toBe('/santos/'+encodeURIComponent('carlo /acutis'))
  fireEvent.click(screen.getByRole('button',{name:translations.fr['supplemental.resetAffinity']}))
  expect(reset).toHaveBeenCalledTimes(1)
})
