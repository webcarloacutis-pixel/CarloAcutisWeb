// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { translations } from '@/lib/translations'
import { PrayersIntroduction } from './prayers-introduction'
import { SaintMatcherIntroduction } from './saint-matcher-introduction'
const locale=vi.hoisted(()=>({language:'fr'}))
vi.mock('@/contexts/language-context',()=>({useLanguage:()=>({language:locale.language,t:(key:string)=>translations[locale.language]?.[key]??key})}))
afterEach(()=>{cleanup();locale.language='fr'})
it('retains both original devotional paragraphs, all ten exact Spanish bullets and the two-card layout',()=>{
  locale.language='es'
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
  expect(screen.getAllByRole('listitem').map(item=>item.textContent)).toEqual(bullets.map(text=>'• '+text))
  for(const text of bullets.slice(5))expect(screen.getByText('• '+text).closest('[lang="es"]')).toBeTruthy()
  expect(screen.getByText(translations.es['supplemental.powerPrayer'])).toBeTruthy()
  expect(screen.getByText(translations.es['supplemental.spiritualBenefits'])).toBeTruthy()
  expect(view.container.querySelector('.grid')?.className).toBe('grid grid-cols-1 md:grid-cols-2 gap-6')
})
it.each([
  ['en',['Search by saint, occasion or need','Explore thematic categories','Read with devotion and recollection','Adapt the prayers to your situation','Pray regularly']],
  ['fr',['Recherchez par saint, occasion ou besoin','Explorez les catégories thématiques','Lisez avec dévotion et recueillement','Adaptez les prières à votre situation','Priez régulièrement']],
] as const)('localizes all five library instructions in %s while preserving devotional text and layout', (language, instructions)=>{
  locale.language=language
  const view=render(<PrayersIntroduction />)
  const bullets=screen.getAllByRole('listitem')
  expect(bullets).toHaveLength(10)
  for(const [index,text] of instructions.entries()){
    expect(bullets[index].textContent).toBe('• '+text)
    expect(bullets[index].closest('[lang="es"]')).toBeNull()
  }
  for(const text of ['Fortalecimiento de la fe','Consuelo en momentos difíciles','Guía espiritual y sabiduría','Intercesión de los santos','Crecimiento en la vida interior'])expect(screen.getByText('• '+text).closest('[lang="es"]')).toBeTruthy()
  const paragraphs=view.container.querySelectorAll('p')
  expect(paragraphs).toHaveLength(2)
  expect(paragraphs[0].textContent?.replace(/\s+/g,' ').trim()).toBe('Las oraciones de los santos son tesoros espirituales forjados en la experiencia de hombres y mujeres que vivieron en íntima unión con Dios. Estas oraciones han sido probadas por el tiempo y han llevado consuelo, fortaleza y esperanza a millones de fieles a lo largo de los siglos.')
  expect(paragraphs[1].textContent?.replace(/\s+/g,' ').trim()).toBe('Cada oración refleja la sabiduría espiritual y la profunda relación con Dios de quien la compuso, ofreciendo palabras perfectas para expresar nuestros sentimientos más profundos ante el Altísimo.')
  for(const paragraph of paragraphs)expect(paragraph.closest('[lang="es"]')).toBeTruthy()
  expect(view.container.querySelector('.grid')?.className).toBe('grid grid-cols-1 md:grid-cols-2 gap-6')
})
it('retains the original affinity introduction meaning and three-card layout in Spanish',()=>{
  locale.language='es'
  const view=render(<SaintMatcherIntroduction />)
  for(const text of ['Descubre Qué Santo Se Parece a Ti','Comparte tus cualidades, desafíos y forma de ser. Nuestra inteligencia artificial analizará tu personalidad y te conectará con santos que compartieron características similares.','Describe tu Corazón','Comparte tus virtudes, pasiones y lo que más valoras en la vida','Reconoce tus Desafíos','Identifica áreas donde buscas crecimiento y superación personal','Encuentra tu Guía','Conecta con santos que vivieron experiencias similares a las tuyas'])expect(screen.getByText(text)).toBeTruthy()
  expect(view.container.querySelector('.grid')?.className).toBe('grid md:grid-cols-3 gap-6 mb-8')
})
