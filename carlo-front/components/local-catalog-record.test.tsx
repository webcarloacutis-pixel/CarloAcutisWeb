// @vitest-environment jsdom
import React from 'react'
import { cleanup,fireEvent,render,screen } from '@testing-library/react'
import { afterEach,expect,it,vi } from 'vitest'
const state=vi.hoisted(()=>({failed:true,canRetry:true,retry:vi.fn()}))
vi.mock('@/lib/use-catalog-localization',()=>({useCatalogLocalization:(_kind:string,source:unknown)=>({...state,content:source,language:'zh',translated:[],stale:[]})}))
vi.mock('@/contexts/language-context',()=>({useLanguage:()=>({t:(key:string)=>key})}))
import { LocalCatalogRecord } from './local-catalog-record'
afterEach(()=>{cleanup();vi.clearAllMocks();state.failed=true;state.canRetry=true})
it('keeps the authentic body while exposing the failed translation and explicit retry',()=>{
 render(<LocalCatalogRecord kind="prayer" source={{id:'existing',content:'Texto auténtico completo'}}>{row=><p>{row.content}</p>}</LocalCatalogRecord>)
 expect(screen.getByText('Texto auténtico completo')).toBeTruthy()
 expect(screen.getByRole('alert').textContent).toContain('content.translationUnavailable')
 fireEvent.click(screen.getByRole('button',{name:'content.retry'}));expect(state.retry).toHaveBeenCalledTimes(1)
})
it('keeps the failure visible after the retry limit without offering further requests',()=>{
 state.canRetry=false
 render(<LocalCatalogRecord kind="miracle" source={{id:'existing',details:'Relato completo'}}>{row=><p>{row.details}</p>}</LocalCatalogRecord>)
 expect(screen.getByText('Relato completo')).toBeTruthy();expect(screen.getByRole('alert')).toBeTruthy();expect(screen.queryByRole('button')).toBeNull()
})
it('does not claim a failure or offer retry for a successful resource',()=>{
 state.failed=false
 render(<LocalCatalogRecord kind="miracle" source={{id:'existing',details:'Relato'}}>{row=><p>{row.details}</p>}</LocalCatalogRecord>)
 expect(screen.queryByRole('alert')).toBeNull();expect(screen.queryByRole('button')).toBeNull()
})
