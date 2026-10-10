// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { translations } from '@/lib/translations'
import { SaintEditorialFields } from './saint-editorial-fields'
import type { Editorial } from '@/lib/editorial'

vi.mock('@/contexts/language-context',()=>({useLanguage:()=>({language:'fr',t:(key:string)=>translations.fr[key]||key})}))
afterEach(cleanup)
const value:Editorial={kind:'person',ecclesialStatus:'Authentic documented status',birthDate:{text:'Original date',status:'approximate'},deathDate:{text:null,status:'unknown'},birthplaceStatus:'traditional',notes:'Original notes',sources:[{url:'https://example.invalid/source',institution:'Original institution',title:'Original source',accessedAt:'2026-09-18',claims:['Original claim']}],image:{sourceUrl:'https://example.invalid/image',creator:'Original creator',license:'Original license',licenseUrl:'https://example.invalid/license',attribution:'Original attribution',alt:'Original alt',kind:'painting'}}

it('shows translated editorial controls and metadata while preserving the authentic values',()=>{
  render(<SaintEditorialFields value={value} onChange={vi.fn()} />)
  expect(screen.getByText('Sources et état des données')).toBeTruthy()
  expect(screen.getByLabelText('Type d’identité')).toBeTruthy()
  expect(screen.getByRole('option',{name:'Archange'})).toHaveProperty('value','archangel')
  expect(screen.getAllByRole('option',{name:'Approximatif'})).toHaveLength(3)
  expect(screen.getByRole('option',{name:'Peinture'})).toHaveProperty('value','painting')
  expect(screen.getByDisplayValue('Original notes')).toBeTruthy()
  expect(screen.getByDisplayValue('Original institution')).toBeTruthy()
  expect(screen.getByDisplayValue('Original license')).toBeTruthy()
})

it('keeps editorial keys and values unchanged when a translated control is edited',()=>{
  const changed=vi.fn()
  render(<SaintEditorialFields value={value} onChange={changed} />)
  fireEvent.change(screen.getByLabelText('Type d’identité'),{target:{value:'archangel'}})
  expect(changed).toHaveBeenLastCalledWith({...value,kind:'archangel'})
  fireEvent.change(screen.getByLabelText('Auteur de l’image'),{target:{value:'Documented creator'}})
  expect(changed).toHaveBeenLastCalledWith({...value,image:{...value.image!,creator:'Documented creator'}})
  fireEvent.click(screen.getByRole('button',{name:'Retirer la source 1'}))
  expect(changed).toHaveBeenLastCalledWith({...value,sources:[]})
})
