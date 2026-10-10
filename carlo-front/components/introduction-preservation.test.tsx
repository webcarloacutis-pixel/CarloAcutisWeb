// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { translations } from '@/lib/translations'
import { PrayersIntroduction } from './prayers-introduction'
import { SaintMatcherIntroduction } from './saint-matcher-introduction'
const locale=vi.hoisted(()=>({language:'fr'}))
vi.mock('@/contexts/language-context',()=>({useLanguage:()=>({language:locale.language,t:(key:string)=>translations[locale.language]?.[key]??key})}))
afterEach(()=>{cleanup();locale.language='fr'})
it('retains both original devotional paragraphs, all ten bullets and the two-card layout',()=>{
  const view=render(<PrayersIntroduction />)
  const paragraphs=[
    'Las oraciones de los santos son tesoros espirituales forjados en la experiencia de hombres y mujeres que vivieron en íntima unión con Dios. Estas oraciones han sido probadas por el tiempo y han llevado consuelo, fortaleza y esperanza a millones de fieles a lo largo de los siglos.',
    'Cada oración refleja la sabiduría espiritual y la profunda relación con Dios de quien la compuso, ofreciendo palabras perfectas para expresar nuestros sentimientos más profundos ante el Altísimo.',
  ]
  for(const text of paragraphs){
    const element=screen.getByText(text)
    expect(element.closest('[lang="es"]')).toBeTruthy()
  }
  const bullets=['Busca por santo, ocasión o necesidad','Explora las categorías temáticas','Lee con devoción y recogimiento','Adapta las oraciones a tu situación','Practica la oración regularmente','Fortalecimiento de la fe','Consuelo en momentos difíciles','Guía espiritual y sabiduría','Intercesión de los santos','Crecimiento en la vida interior']
  expect(screen.getAllByRole('listitem')).toHaveLength(10)
  for(const text of bullets)expect(screen.getByText('• '+text).closest('[lang="es"]')).toBeTruthy()
  expect(screen.getByText(translations.fr['supplemental.powerPrayer'])).toBeTruthy()
  expect(screen.getByText(translations.fr['supplemental.spiritualBenefits'])).toBeTruthy()
  expect(view.container.querySelector('.grid')?.className).toBe('grid grid-cols-1 md:grid-cols-2 gap-6')
})
it('retains the original affinity introduction meaning and three-card layout in Spanish',()=>{
  locale.language='es'
  const view=render(<SaintMatcherIntroduction />)
  for(const text of ['Descubre Qué Santo Se Parece a Ti','Comparte tus cualidades, desafíos y forma de ser. Nuestra inteligencia artificial analizará tu personalidad y te conectará con santos que compartieron características similares.','Describe tu Corazón','Comparte tus virtudes, pasiones y lo que más valoras en la vida','Reconoce tus Desafíos','Identifica áreas donde buscas crecimiento y superación personal','Encuentra tu Guía','Conecta con santos que vivieron experiencias similares a las tuyas'])expect(screen.getByText(text)).toBeTruthy()
  expect(view.container.querySelector('.grid')?.className).toBe('grid md:grid-cols-3 gap-6 mb-8')
})
