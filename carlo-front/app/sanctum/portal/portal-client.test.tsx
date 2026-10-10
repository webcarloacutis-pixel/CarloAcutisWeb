// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { translations } from '@/lib/translations'
import AdminLoginPage from './portal-client'
const state=vi.hoisted(()=>({language:'fr',login:vi.fn(),push:vi.fn(),error:''}))
vi.mock('@/contexts/language-context',()=>({useLanguage:()=>({language:state.language,t:(key:string)=>translations[state.language]?.[key]??key})}))
vi.mock('@/lib/auth',()=>({useAuth:()=>({login:state.login,error:state.error})}))
vi.mock('next/navigation',()=>({useRouter:()=>({push:state.push})}))
afterEach(()=>{cleanup();vi.clearAllMocks();state.language='fr';state.error=''})
it('localizes the portal and password actions in all supported languages',()=>{
  for(const language of Object.keys(translations)){
    state.language=language
    const view=render(<AdminLoginPage />)
    expect(screen.getByText(translations[language]['supplemental.portalTitle'])).toBeTruthy()
    const password=screen.getByLabelText(translations[language]['supplemental.password']) as HTMLInputElement
    expect(password.maxLength).toBe(256)
    expect(password.autocomplete).toBe('current-password')
    fireEvent.click(screen.getByRole('button',{name:translations[language]['supplemental.showPassword']}))
    expect(password.type).toBe('text')
    fireEvent.click(screen.getByRole('button',{name:translations[language]['supplemental.hidePassword']}))
    expect(password.type).toBe('password')
    view.unmount()
  }
})
it('passes credentials unchanged to authentication and never navigates after rejected login',async()=>{
  state.login.mockResolvedValue(false)
  render(<AdminLoginPage />)
  fireEvent.change(screen.getByLabelText(translations.fr['supplemental.email']),{target:{value:'synthetic@example.invalid'}})
  const password=screen.getByLabelText(translations.fr['supplemental.password']) as HTMLInputElement
  fireEvent.change(password,{target:{value:'Synthetic-password-123'}})
  fireEvent.submit(password.closest('form')!)
  await waitFor(()=>expect(state.login).toHaveBeenCalledWith('Synthetic-password-123','synthetic@example.invalid'))
  expect((await screen.findByRole('alert')).textContent).toBe(translations.fr['catalog.accessDenied'])
  expect(password.value).toBe('')
  expect(state.push).not.toHaveBeenCalled()
})
it('retains the differentiated authentication outage message',()=>{
  state.error=translations.fr['catalog.temporarilyUnavailable']
  render(<AdminLoginPage />)
  expect(screen.getByRole('alert').textContent).toBe(state.error)
})
