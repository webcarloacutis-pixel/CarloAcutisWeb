"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiUrl } from "@/lib/api-url";
import { blankEditorial, type Editorial } from "@/lib/editorial";
import { SaintEditorialFields } from "./saint-editorial-fields";
export type Saint = {
 id:string;slug:string;name:string;country?:string|null;title?:string|null;feastDay?:string|null;imageUrl?:string|null;biography?:string|null;createdAt:string;updatedAt:string;
 continent?:string|null;lat?:number|null;lng?:number|null;birthYear?:number|null;deathYear?:number|null;canonizationYear?:number|null;patronOf?:string[];symbols?:string[];
 birthCountryCode?:string|null;birthContinent?:string|null;birthPlace?:string|null;birthLat?:number|null;birthLng?:number|null;birthPrecision?:string|null;birthSources?:string[];editorial?:Editorial|null;
};
type Props={open:boolean;onClose:()=>void;saint?:Partial<Saint>};
const fields=[['slug','Slug'],['name','Nombre'],['title','Título'],['feastDay','Día festivo'],['country','País de referencia histórica'],['continent','Continente de referencia histórica'],['imageUrl','URL de imagen'],['birthYear','Año de nacimiento'],['deathYear','Año de fallecimiento'],['canonizationYear','Año de canonización'],['birthPlace','Lugar de nacimiento'],['birthCountryCode','País actual de nacimiento (código ISO)'],['birthContinent','Continente de nacimiento (código)'],['birthLat','Latitud de nacimiento'],['birthLng','Longitud de nacimiento'],['birthPrecision','Precisión de ubicación'],['lat','Latitud antigua de referencia'],['lng','Longitud antigua de referencia']] as const;
const numeric=new Set(['birthYear','deathYear','canonizationYear','birthLat','birthLng','lat','lng']);
const slugify=(input:string)=>input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
export function AdminSaintsModal(props:Props) { return props.open?<SaintEditor key={props.saint?.id??'new'} {...props}/>:null; }
function SaintEditor({onClose,saint}:Props) {
 const router=useRouter(), dialog=useRef<HTMLDialogElement>(null), editing=Boolean(saint?.id);
 const [values,setValues]=useState<Record<string,string>>(()=>Object.fromEntries([...fields.map(([key])=>[key,String(saint?.[key]??'')]),['biography',saint?.biography??''],['patronOf',(saint?.patronOf??[]).join('\n')],['symbols',(saint?.symbols??[]).join('\n')],['birthSources',(saint?.birthSources??[]).join('\n')]]));
 const [editorial,setEditorial]=useState<Editorial|null>(saint?.editorial??null), [loading,setLoading]=useState(false), [error,setError]=useState('');
 useEffect(()=>{dialog.current?.showModal();return()=>dialog.current?.close();},[]);
 const change=(key:string,value:string)=>setValues(previous=>({...previous,[key]:value,...(key==='name'&&!editing?{slug:slugify(value)}:{})}));
 async function save(event:React.FormEvent) {
  event.preventDefault();setError('');
  if(!values.name.trim()){setError('Nombre es obligatorio.');return;}
  const payload:Record<string,unknown>={};
  for(const [key] of fields){const value=values[key].trim();payload[key]=numeric.has(key)?(value===''?null:Number(value)):(value||null);if(numeric.has(key)&&value!==''&&!Number.isFinite(payload[key])){setError('Los años y coordenadas deben ser números válidos.');return;}}
  payload.slug=values.slug.trim()||slugify(values.name);payload.biography=values.biography.trim()||null;
  for(const key of ['patronOf','symbols','birthSources'])payload[key]=values[key].split('\n').map(v=>v.trim()).filter(Boolean);
  if(editorial)payload.editorial=editorial;
  setLoading(true);
  try{const response=await fetch(apiUrl('/saints'+(editing?'/'+saint!.id:'')),{method:editing?'PATCH':'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(!response.ok){const body=await response.json().catch(()=>null);throw new Error(`No se pudo guardar (${response.status}${body?.error?': '+body.error:''}).`);}router.refresh();onClose();}catch(e){setError(e instanceof Error?e.message:'Error al guardar.');}finally{setLoading(false);}
 }
 return <dialog ref={dialog} onCancel={event=>{event.preventDefault();if(!loading)onClose();}} aria-labelledby="saint-editor-title" className="w-[calc(100%-2rem)] max-w-3xl max-h-[90dvh] rounded-xl border bg-background p-0 text-foreground backdrop:bg-black/50">
 <form onSubmit={save} className="space-y-5 p-5"><div className="flex items-center justify-between gap-3"><h2 id="saint-editor-title" className="text-xl font-semibold">{editing?'Editar santo':'Crear santo'}</h2><Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cerrar</Button></div>
 <p className="text-sm text-muted-foreground">Deja vacíos los datos desconocidos. Los años anteriores a nuestra era usan números negativos; no existe el año cero. Solo las coordenadas de nacimiento documentadas se muestran en el mapa.</p>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{fields.map(([key,label])=><div key={key} className="space-y-1"><Label htmlFor={key}>{label}</Label><Input id={key} value={values[key]} type={numeric.has(key)?'number':'text'} step={key.includes('Lat')||key.includes('Lng')||key==='lat'||key==='lng'?'any':'1'} onChange={e=>change(key,e.target.value)}/></div>)}</div>
 {([['biography','Biografía'],['patronOf','Patronazgos documentados (uno por línea)'],['symbols','Símbolos documentados (uno por línea)'],['birthSources','Fuentes de nacimiento y coordenadas (una URL por línea)']] as const).map(([key,label])=><div key={key}><Label htmlFor={key}>{label}</Label><textarea id={key} className="min-h-28 w-full rounded-md border bg-background p-3 text-sm" value={values[key]} onChange={e=>change(key,e.target.value)}/></div>)}
 {editorial?<SaintEditorialFields value={editorial} onChange={setEditorial}/>:<Button type="button" variant="outline" onClick={()=>setEditorial(blankEditorial())}>Documentar fuentes y licencia</Button>}
 {error&&<p role="alert" className="text-destructive">{error}</p>}<div className="flex gap-3"><Button type="submit" disabled={loading}>{loading?'Guardando…':editing?'Guardar cambios':'Crear'}</Button><Button type="button" variant="outline" disabled={loading} onClick={onClose}>Cancelar</Button></div></form></dialog>;
}
