"use client";
import { useLanguage } from "@/contexts/language-context"
import { useEffect, useRef, useState } from "react";
import { catalogWriteError } from "@/lib/catalog-write-error";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiUrl } from "@/lib/api-url";
import { editorialForDisplay } from "@/lib/editorial-read";
import { blankEditorial, type Editorial } from "@/lib/editorial";
import { SaintEditorialFields } from "./saint-editorial-fields";
export type Saint = {
 id:string;slug:string;name:string;country?:string|null;title?:string|null;feastDay?:string|null;imageUrl?:string|null;biography?:string|null;createdAt:string;updatedAt:string;
 continent?:string|null;lat?:number|null;lng?:number|null;birthYear?:number|null;deathYear?:number|null;canonizationYear?:number|null;patronOf?:string[];symbols?:string[];
 birthCountryCode?:string|null;birthContinent?:string|null;birthPlace?:string|null;birthLat?:number|null;birthLng?:number|null;birthPrecision?:string|null;birthSources?:string[]|null;editorial?:Editorial|null;
};
type Props={open:boolean;onClose:()=>void;saint?:Partial<Saint>};
const fields=[['slug','supplemental.field.slug'],['name','supplemental.field.name'],['title','supplemental.field.title'],['feastDay','supplemental.field.feastDay'],['country','supplemental.field.country'],['continent','supplemental.field.continent'],['imageUrl','supplemental.field.imageUrl'],['birthYear','supplemental.field.birthYear'],['deathYear','supplemental.field.deathYear'],['canonizationYear','supplemental.field.canonizationYear'],['birthPlace','supplemental.field.birthPlace'],['birthCountryCode','supplemental.field.birthCountryCode'],['birthContinent','supplemental.field.birthContinent'],['birthLat','supplemental.field.birthLat'],['birthLng','supplemental.field.birthLng'],['birthPrecision','supplemental.field.birthPrecision'],['lat','supplemental.field.lat'],['lng','supplemental.field.lng']] as const;
const numeric=new Set(['birthYear','deathYear','canonizationYear','birthLat','birthLng','lat','lng']);
const slugify=(input:string)=>input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
const editorialSnapshot=(value:Editorial|null)=>JSON.stringify(value,(_key,item)=>item && typeof item==='object' && !Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);
export function AdminSaintsModal(props:Props) {
 return props.open?<SaintEditor key={props.saint?.id??'new'} {...props}/>:null; }
function SaintEditor({onClose,saint}:Props) {
 const { t } = useLanguage()
 const router=useRouter(), dialog=useRef<HTMLDialogElement>(null), editing=Boolean(saint?.id);
 const [values,setValues]=useState<Record<string,string>>(()=>Object.fromEntries([...fields.map(([key])=>[key,String(saint?.[key]??'')]),['biography',saint?.biography??''],['patronOf',(saint?.patronOf??[]).join('\n')],['symbols',(saint?.symbols??[]).join('\n')],['birthSources',(saint?.birthSources??[]).join('\n')]]));
 const initialValues=useRef(values);
 const [editorial,setEditorial]=useState<Editorial|null>(()=>editorialForDisplay(saint?.editorial)), [loading,setLoading]=useState(false), [error,setError]=useState('');
 const initialEditorial=useRef(editorial);
 useEffect(()=>{const element=dialog.current;element?.showModal();return()=>element?.close();},[]);
 const change=(key:string,value:string)=>setValues(previous=>({...previous,[key]:value,...(key==='name'&&!editing?{slug:slugify(value)}:{})}));
 async function save(event:React.FormEvent) {
  event.preventDefault();setError('');
  if(!values.name.trim()){setError("supplemental.nameRequired");return;}
  const payload:Record<string,unknown>={};
  const changed=(key:string)=>!editing || values[key]!==initialValues.current[key];
  for(const [key] of fields){if(!changed(key))continue;const value=values[key].trim();payload[key]=numeric.has(key)?(value===''?null:Number(value)):(value||null);if(numeric.has(key)&&value!==''&&!Number.isFinite(payload[key])){setError("supplemental.validNumbers");return;}}
  if(changed('slug'))payload.slug=values.slug.trim()||slugify(values.name);
  if(changed('biography'))payload.biography=values.biography.trim()||null;
  for(const key of ['patronOf','symbols','birthSources'])if(changed(key))payload[key]=values[key].split('\n').map(v=>v.trim()).filter(Boolean);
  if(editorial && (!editing || editorialSnapshot(editorial)!==editorialSnapshot(initialEditorial.current)))payload.editorial=editorial;
  if(editing && Object.keys(payload).length===0){onClose();return;}
  setLoading(true);
  try{const response=await fetch(apiUrl('/saints'+(editing?'/'+saint!.id:'')),{method:editing?'PATCH':'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(!response.ok)throw new Error(await catalogWriteError(response, 'supplemental.writeFailed'));window.dispatchEvent(new Event("catalog:saints-changed"));router.refresh();onClose();}catch(e){setError(e instanceof Error && e.message.startsWith('catalog.') ? e.message : 'supplemental.writeFailed');}finally{setLoading(false);}
 }
 return <dialog ref={dialog} onCancel={event=>{event.preventDefault();if(!loading)onClose();}} aria-labelledby="saint-editor-title" className="w-[calc(100%-2rem)] max-w-3xl max-h-[90dvh] rounded-xl border bg-background p-0 text-foreground backdrop:bg-black/50">
 <form onSubmit={save} className="space-y-5 p-5"><div className="flex items-center justify-between gap-3"><h2 id="saint-editor-title" className="text-xl font-semibold">{editing?t("supplemental.editSaint"):t("supplemental.createSaint")}</h2><Button type="button" variant="outline" onClick={onClose} disabled={loading}>{t("common.close")}</Button></div>
 <p className="text-sm text-muted-foreground">{t("supplemental.editorHelp")}</p>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{fields.map(([key,label])=><div key={key} className="space-y-1"><Label htmlFor={key}>{t(label)}</Label><Input id={key} value={values[key]} type={numeric.has(key)?'number':'text'} step={key.includes('Lat')||key.includes('Lng')||key==='lat'||key==='lng'?'any':'1'} onChange={e=>change(key,e.target.value)}/></div>)}</div>
 {([['biography','supplemental.field.biography'],['patronOf','supplemental.field.patronOf'],['symbols','supplemental.field.symbols'],['birthSources','supplemental.field.birthSources']] as const).map(([key,label])=><div key={key}><Label htmlFor={key}>{t(label)}</Label><textarea id={key} className="min-h-28 w-full rounded-md border bg-background p-3 text-sm" value={values[key]} onChange={e=>change(key,e.target.value)}/></div>)}
 {editorial?<SaintEditorialFields value={editorial} onChange={setEditorial}/>:<Button type="button" variant="outline" onClick={()=>setEditorial(blankEditorial())}>{t("supplemental.sourceLicense")}</Button>}
 {error&&<p role="alert" className="text-destructive">{t(error)}</p>}<div className="flex gap-3"><Button type="submit" disabled={loading}>{loading?t("supplemental.saving"):editing?t("supplemental.saveChanges"):t("supplemental.create")}</Button><Button type="button" variant="outline" disabled={loading} onClick={onClose}>{t("common.cancel")}</Button></div></form></dialog>;
}
