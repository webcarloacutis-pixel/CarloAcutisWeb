"use client"
import React, { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { apiUrl } from '../lib/api-url'
export interface ChatMessage { id:string; role:'user'|'assistant'; content:string; timestamp:Date }
export interface Conversation { id:string; title:string; messages:ChatMessage[]; createdAt:Date; updatedAt:Date }
export interface User { id:string; name:string; email:string }
interface UserContextType {
  user:User|null; isAuthenticated:boolean; loading:boolean; error:string
  conversations:Conversation[]; currentConversation:Conversation|null
  login:(email:string,password:string,name?:string)=>Promise<boolean>
  register:(name:string,email:string,password:string)=>Promise<boolean>
  logout:()=>Promise<boolean>
  createConversation:()=>Promise<Conversation|null>
  selectConversation:(id:string)=>Promise<void>
  deleteConversation:(id:string)=>Promise<boolean>
  updateConversation:(id:string,messages:ChatMessage[])=>Promise<boolean>
  renameConversation:(id:string,title:string)=>Promise<boolean>
}
const UserContext=createContext<UserContextType|undefined>(undefined)
type RawMessage={id:string;role:'user'|'assistant';content:string;createdAt:string}
type RawConversation={id:string;title:string;createdAt:string;updatedAt:string}
type Scope={version:number;signal:AbortSignal}
function revive(raw:RawConversation):Conversation { return {...raw,messages:[],createdAt:new Date(raw.createdAt),updatedAt:new Date(raw.updatedAt)} }
function fingerprint(message:Pick<ChatMessage,'role'|'content'>){return JSON.stringify([message.role,message.content])}
export function UserProvider({children}:{children:ReactNode}) {
  const [user,setUser]=useState<User|null>(null)
  const [conversations,setConversations]=useState<Conversation[]>([])
  const [currentId,setCurrentId]=useState<string|null>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const epoch=useRef(0),selection=useRef(0)
  const controller=useRef(new AbortController())
  const owner=useRef<User|null>(null)
  const authBusy=useRef(false)
  const queues=useRef(new Map<string,Promise<boolean>>())
  const revisions=useRef(new Map<string,number>())
  const persisted=useRef(new Map<string,Map<string,string>>())
  function invalidateWork() {
    epoch.current++;selection.current++;controller.current.abort();controller.current=new AbortController()
    queues.current.clear();revisions.current.clear();persisted.current.clear()
  }
  function clearSession() { invalidateWork();owner.current=null;setUser(null);setConversations([]);setCurrentId(null);setLoading(false) }
  function scope():Scope{return {version:epoch.current,signal:controller.current.signal}}
  function current(work:Scope){return work.version===epoch.current && !work.signal.aborted}
  function check(work:Scope){if(!current(work))throw new DOMException('Session changed','AbortError')}
  async function request(work:Scope,path:string,init:RequestInit={}) {
    check(work)
    const response=await fetch(apiUrl(path),{...init,credentials:'include',cache:'no-store',
      headers:{...(init.body?{'Content-Type':'application/json'}:{}),...init.headers},
      signal:AbortSignal.any([work.signal,AbortSignal.timeout(15000)])})
    check(work)
    if(!response.ok) {
      if(response.status===401 && owner.current){clearSession();setError('La sesión terminó. Inicia sesión de nuevo.')}
      throw new Error(response.status===429?'Demasiadas solicitudes. Espera y reintenta.':'No se pudo completar la operación.')
    }
    return response
  }
  async function json(work:Scope,response:Response) {const body=await response.json();check(work);return body}
  async function collection<T>(work:Scope,path:string,field:string) {
    const rows:T[]=[];let cursor='';const seen=new Set<string>()
    for(let page=0;page<100;page++){
      check(work)
      const response=await request(work,path+'?limit=100'+(cursor?'&cursor='+encodeURIComponent(cursor):''))
      const body=await json(work,response)
      if(!Array.isArray(body[field]))throw new Error('Respuesta incompleta del servicio.')
      rows.push(...body[field]);cursor=response.headers.get('x-next-cursor')||''
      if(!cursor)return rows
      if(seen.has(cursor))throw new Error('Paginación inválida del servicio.')
      seen.add(cursor)
    }
    throw new Error('El historial excede el límite de lectura. Contacta al administrador.')
  }
  async function loadMessages(id:string,work:Scope,selected:number) {
    const pending=queues.current.get(id)
    if(pending)await pending
    check(work)
    const revision=revisions.current.get(id)||0
    const messages=(await collection<RawMessage>(work,'/conversations/'+encodeURIComponent(id)+'/messages','messages')).map(m=>({...m,timestamp:new Date(m.createdAt)}))
    check(work)
    if(selected!==selection.current || revision!==(revisions.current.get(id)||0))return
    persisted.current.set(id,new Map(messages.map(m=>[m.id,fingerprint(m)])))
    setConversations(previous=>previous.map(c=>c.id===id?{...c,messages}:c))
  }
  async function hydrate(account:User,work:Scope) {
    check(work)
    const normalized={...account,name:typeof account.name==='string'?account.name:''}
    owner.current=normalized;setUser(normalized)
    try {
      const list=(await collection<RawConversation>(work,'/conversations','conversations')).map(revive)
      check(work)
      setConversations(list);setCurrentId(list[0]?.id||null)
      if(list[0])await loadMessages(list[0].id,work,++selection.current)
    } catch {if(current(work))setError('La sesión está abierta, pero no se pudo cargar el historial. Reintenta al abrir una conversación o recarga la página.')}
  }
  useEffect(()=>{
    // Legacy unscoped local history is neither read nor uploaded.
    invalidateWork();const work=scope()
    void fetch(apiUrl('/auth/me'),{credentials:'include',cache:'no-store',signal:AbortSignal.any([work.signal,AbortSignal.timeout(15000)])})
      .then(async response=>{
        check(work)
        if(response.ok)await hydrate((await json(work,response)).user,work)
        else if(response.status!==401)throw new Error()
      })
      .catch(()=>{if(current(work))setError('No se pudo comprobar la sesión. Recarga la página para reintentar.')})
      .finally(()=>{if(current(work))setLoading(false)})
    // Read the current generation intentionally: logout/login can advance it after mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return ()=>{epoch.current++;controller.current.abort()}
    // A fresh server session is checked once per mounted provider; helpers use only stable refs/setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])
  async function authenticate(path:string,payload:Record<string,string>) {
    if(authBusy.current)return false
    authBusy.current=true;clearSession();setLoading(true);setError('');const work=scope()
    try {
      const response=await request(work,path,{method:'POST',body:JSON.stringify(payload)})
      await hydrate((await json(work,response)).user,work)
      return current(work) && !!owner.current
    }catch(e){if(current(work))setError(e instanceof Error?e.message:'No se pudo iniciar sesión.');return false}
    finally {authBusy.current=false;if(current(work))setLoading(false)}
  }
  async function logout() {
    if(authBusy.current)return false
    authBusy.current=true;invalidateWork();const work=scope();setLoading(true)
    try {await request(work,'/auth/logout',{method:'POST'});check(work);clearSession();setError('');setLoading(false);return true}
    catch {if(current(work))setError('No se pudo cerrar la sesión en el servidor. Reintenta.');return false}
    finally {authBusy.current=false;if(current(work))setLoading(false)}
  }
  async function createConversation() {
    if(!owner.current || authBusy.current)return null
    const work=scope()
    try {
      const response=await request(work,'/conversations',{method:'POST',body:JSON.stringify({id:crypto.randomUUID(),title:'Nueva conversación'})})
      const conversation=revive((await json(work,response)).conversation)
      check(work);selection.current++;persisted.current.set(conversation.id,new Map())
      setConversations(previous=>[conversation,...previous]);setCurrentId(conversation.id);return conversation
    }catch{if(current(work))setError('No se pudo crear la conversación.');return null}
  }
  async function selectConversation(id:string) {
    if(!owner.current || authBusy.current)return
    const work=scope(),selected=++selection.current;setCurrentId(id);setError('')
    try{await loadMessages(id,work,selected)}catch{if(current(work) && selected===selection.current)setError('No se pudo cargar la conversación. Selecciónala de nuevo para reintentar.')}
  }
  function enqueue(id:string,work:Scope,operation:()=>Promise<void>) {
    if(!current(work) || !owner.current || authBusy.current)return Promise.resolve(false)
    // Invalidate older reads as soon as a write is requested, including queued writes.
    revisions.current.set(id,(revisions.current.get(id)||0)+1)
    const next=(queues.current.get(id)||Promise.resolve(true)).then(async()=>{
      if(!current(work) || !owner.current || authBusy.current)return false
      try{await operation();check(work);return true}catch{if(current(work))setError('No se pudo guardar el cambio. Reintenta antes de salir.');return false}
    })
    queues.current.set(id,next)
    void next.finally(()=>{if(queues.current.get(id)===next)queues.current.delete(id)})
    return next
  }
  async function updateConversation(id:string,messages:ChatMessage[]) {
    const work=scope()
    return enqueue(id,work,async()=>{
      const title=(messages.find(m=>m.role==='user')?.content||'Nueva conversación').slice(0,150)
      const saved=persisted.current.get(id)||new Map<string,string>()
      persisted.current.set(id,saved)
      // Only new IDs travel over the network; confirmed partial writes survive retries.
      for(const message of messages){
        check(work)
        const existing=saved.get(message.id),value=fingerprint(message)
        if(existing!==undefined){if(existing!==value)throw new Error('Saved messages are immutable');continue}
        await request(work,'/conversations/'+encodeURIComponent(id)+'/messages',{method:'POST',body:JSON.stringify({id:message.id,role:message.role,content:message.content,title})})
        check(work);saved.set(message.id,value)
      }
      await request(work,'/conversations/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({title})})
      check(work)
      setConversations(previous=>previous.map(c=>c.id===id?{...c,messages,title,updatedAt:new Date()}:c))
    })
  }
  async function renameConversation(id:string,title:string) {
    const work=scope(),normalized=title.trim().slice(0,150)
    return enqueue(id,work,async()=>{
      await request(work,'/conversations/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({title:normalized})})
      check(work);setConversations(previous=>previous.map(c=>c.id===id?{...c,title:normalized}:c))
    })
  }
  async function deleteConversation(id:string) {
    const work=scope()
    return enqueue(id,work,async()=>{
      await request(work,'/conversations/'+encodeURIComponent(id),{method:'DELETE'})
      check(work);selection.current++;persisted.current.delete(id)
      setConversations(previous=>previous.filter(c=>c.id!==id));setCurrentId(previous=>previous===id?null:previous)
    })
  }
  const currentConversation=useMemo(()=>conversations.find(c=>c.id===currentId)||null,[conversations,currentId])
  return <UserContext.Provider value={{user,isAuthenticated:!!user,loading,error,conversations,currentConversation,login:(email,password)=>authenticate('/auth/login',{email,password}),register:(name,email,password)=>authenticate('/auth/register',{name,email,password}),logout,createConversation,selectConversation,deleteConversation,updateConversation,renameConversation}}>{children}</UserContext.Provider>
}
export function useUser(){const context=useContext(UserContext);if(!context)throw new Error('UserProvider required');return context}
