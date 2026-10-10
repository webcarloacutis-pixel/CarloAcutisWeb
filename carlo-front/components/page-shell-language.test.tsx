// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/contexts/language-context'
import SaintsPage from '@/app/santos/page'
import VersiculosPage from '@/app/versiculos/page'
import EucaristiaPage from '@/app/eucaristia/page'
import SimbolosPage from '@/app/simbolos/page'

vi.mock('@/components/header',()=>({Header:()=>null}))
vi.mock('@/components/footer',()=>({Footer:()=>null}))
vi.mock('@/components/saints-catalog',()=>({SaintsCatalog:()=>null}))
vi.mock('@/components/scripture-search-advanced',()=>({ScriptureSearchAdvanced:()=>null}))
vi.mock('@/components/featured-verses',()=>({FeaturedVerses:()=>null}))
vi.mock('@/components/emotional-categories',()=>({EmotionalCategories:()=>null}))
vi.mock('@/lib/popularity-read',()=>({getPopularityEstimates:async()=>({})}))

beforeEach(()=>localStorage.setItem('language','en'))
afterEach(cleanup)
const pages=[
  {Page:SaintsPage,title:'Catholic Saints',description:'Discover the extraordinary stories of men and women who devoted their lives to God and became examples of holiness for all humanity.',spanishTitle:'Santos Católicos',spanishDescription:'Descubre las historias extraordinarias de hombres y mujeres que dedicaron sus vidas a Dios y se convirtieron en ejemplos de santidad para toda la humanidad.'},
  {Page:VersiculosPage,title:'Verses for the Soul',description:'Find comfort, hope and guidance in the Holy Scriptures. Describe how you feel and discover verses that speak directly to your heart.',spanishTitle:'Versículos para el Alma',spanishDescription:'Encuentra consuelo, esperanza y guía en las Sagradas Escrituras. Describe cómo te sientes y descubre versículos que hablen directamente a tu corazón.'},
  {Page:EucaristiaPage,title:'The Holy Eucharist',description:'Discover the Catholic Church’s most sacred sacrament: its meaning, celebration and the profound mystery of the Body and Blood of Christ.',spanishTitle:'La Sagrada Eucaristía',spanishDescription:'Descubre el sacramento más sagrado de la Iglesia Católica: su significado, celebración y el profundo misterio del Cuerpo y Sangre de Cristo.'},
  {Page:SimbolosPage,title:'Catholic Symbols',description:'Explore the rich symbolism of the Catholic faith and discover the profound spiritual meaning behind each sacred symbol.',spanishTitle:'Símbolos Católicos',spanishDescription:'Explora el rico simbolismo de la fe católica y descubre el profundo significado espiritual detrás de cada símbolo sagrado.'},
] as const

it.each(pages)('uses the selected language for the $title page shell',async({Page,title,description})=>{
  render(<LanguageProvider>{await Page()}</LanguageProvider>)
  expect(screen.getByRole('heading',{level:1,name:title})).toBeTruthy()
  expect(screen.getByText(description,{exact:true})).toBeTruthy()
  if(Page===EucaristiaPage){
    expect(screen.getByText('La Eucaristía es el sacramento central de la fe católica, instituido por Jesucristo en la Última Cena. En este sacramento, el pan y el vino se convierten verdaderamente en el Cuerpo y la Sangre de Cristo a través del misterio de la transubstanciación.',{exact:true})).toBeTruthy()
  }
})

it('retains the original Spanish page headings and descriptions exactly',async()=>{
  localStorage.setItem('language','es')
  for(const {Page,spanishTitle,spanishDescription} of pages){
    render(<LanguageProvider>{await Page()}</LanguageProvider>)
    expect(screen.getByRole('heading',{level:1,name:spanishTitle})).toBeTruthy()
    expect(screen.getByText(spanishDescription,{exact:true})).toBeTruthy()
    cleanup()
  }
})
