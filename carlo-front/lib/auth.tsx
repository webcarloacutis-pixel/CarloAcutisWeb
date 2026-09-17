"use client"
import React, { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { apiUrl } from './api-url'
interface AuthState { isAuthenticated:boolean; loading:boolean; error:string; login:(password:string,email?:string)=>Promise<boolean>; logout:()=>Promise<boolean> }
const AuthContext=createContext<AuthState|null>(null)
export function AuthProvider({children}:{children:ReactNode}) {
  const [isAuthenticated,setAuthenticated]=useState(false)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const epoch=useRef(0)
  const active=useRef<AbortController|null>(null)
  const busy=useRef(false)
  useEffect(()=>{
    const version=++epoch.current
    const controller=new AbortController();active.current=controller
    try { localStorage.removeItem('catholic_admin_auth');localStorage.removeItem('catholic_admin_time') } catch { /* Storage is optional. */ }
    void fetch(apiUrl('/auth/admin/me'),{credentials:'include',cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])})
      .then(response=>{if(version===epoch.current)setAuthenticated(response.ok)})
      .catch(()=>{if(version===epoch.current && !controller.signal.aborted)setError('No se pudo comprobar el acceso administrativo.')})
      .finally(()=>{if(version===epoch.current)setLoading(false)})
    // Cancel the latest operation, including one started after this initial probe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return ()=>{epoch.current++;active.current?.abort()}
  },[])
  async function mutate(path:string,password?:string,email?:string) {
    // Cookie-changing operations run one at a time; stale session probes cannot win.
    if(busy.current)return false
    busy.current=true
    const version=++epoch.current
    active.current?.abort()
    const controller=new AbortController();active.current=controller
    setLoading(true);setError('')
    try {
      const response=await fetch(apiUrl(path),{method:'POST',credentials:'include',cache:'no-store',
        ...(password===undefined?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify({password,...(email===undefined?{}:{email})})}),
        signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])})
      if(version!==epoch.current)return false
      if(!response.ok){setError(response.status===429?'Demasiados intentos. Espera antes de reintentar.':'No se pudo completar el acceso administrativo.');return false}
      setAuthenticated(password!==undefined);return true
    } catch {if(version===epoch.current)setError(password===undefined?'No se pudo cerrar la sesión. Reintenta.':'No se pudo conectar con el servicio.');return false}
    finally {busy.current=false;if(version===epoch.current)setLoading(false)}
  }
  return <AuthContext.Provider value={{isAuthenticated,loading,error,login:(password,email)=>mutate('/auth/admin/login',password,email),logout:()=>mutate('/auth/admin/logout')}}>{children}</AuthContext.Provider>
}
export function useAuth(){const state=useContext(AuthContext);if(!state)throw new Error('AuthProvider required');return state}
