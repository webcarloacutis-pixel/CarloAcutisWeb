import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
const root=fileURLToPath(new URL('../',import.meta.url))
const manifest=JSON.parse(await readFile(resolve(root,'content/catalog-translation-manifest.json'),'utf8'))
const locales=['en','zh','hi','ar','pt','ru','fr','ja','de','ko','it','tr','vi','pl']
const md5=value=>createHash('md5').update(value).digest('hex') // public revision compatibility, never a password/security primitive
const allowed=path=>/^(name|title|biography|country|feastDay|birthPlace|type|date|location|witnesses|details|content|category|saintName|occasion)$/.test(path)||/^(patronOf|symbols)\.\d+$/.test(path)||/^editorial\.(notes|ecclesialStatus|birthDate\.text|deathDate\.text|image\.(alt|attribution))$/.test(path)||/^editorial\.sources\.\d+\.(title|claims\.\d+)$/.test(path)
const packs=[]
for(const[kind,entities]of Object.entries(manifest.entities))for(const[id,languages]of Object.entries(entities))for(const locale of languages){
 if(!['saint','miracle','prayer'].includes(kind)||!locales.includes(locale)||!/^[-a-zA-Z0-9_]+$/.test(id)||!/^[a-f0-9]{64}$/.test(manifest.version))throw Error('INVALID_MANIFEST_IDENTITY')
 const pack=JSON.parse(await readFile(resolve(root,'public/catalog-translations',manifest.version,kind,id,locale+'.json'),'utf8'))
 if(pack.version!==1||pack.kind!==kind||pack.id!==id||pack.locale!==locale)throw Error('INVALID_PACK_SCOPE')
 for(const[path,field]of Object.entries(pack.fields)){
  if(!allowed(path)||typeof field.source!=='string'||!field.source||field.sourceHash!==md5(field.source)||typeof field.text!=='string'||!field.text.trim()||!['assistant','automatic','human'].includes(field.review))throw Error('INVALID_TRANSLATION_FIELD')
  if(['biography','details','content'].includes(path)&&field.source===field.text)throw Error('UNTRANSLATED_BODY')
  const urls=value=>value.match(/https?:\/\/[^\s。]+/g)?.map(url=>url.replace(/[.,;]+$/,''))||[]
  if(JSON.stringify(urls(field.source))!==JSON.stringify(urls(field.text)))throw Error('SOURCE_URL_CHANGED')
  if(field.source.split(/\n\s*\n/).length!==field.text.split(/\n\s*\n/).length)throw Error('PARAGRAPH_COUNT_CHANGED')
 }
 packs.push(pack)
}
packs.sort((a,b)=>(a.kind+'/'+a.id+'/'+a.locale).localeCompare(b.kind+'/'+b.id+'/'+b.locale))
if(createHash('sha256').update(JSON.stringify(packs)).digest('hex')!==manifest.version)throw Error('RESOURCE_VERSION_CHANGED_REPACK_REQUIRED')
const result={resourceConsistency:'PASS',version:manifest.version,packs:packs.length,fields:packs.reduce((sum,p)=>sum+Object.keys(p.fields).length,0),humanReviewed:packs.reduce((sum,p)=>sum+Object.values(p.fields).filter(f=>f.review==='human').length,0),coverage:'NOT_CHECKED_WITH_CURRENT_SOURCE',locales:{}}
const args=process.argv.slice(2),sourceIndex=args.indexOf('--source'),reportIndex=args.indexOf('--report')
if(sourceIndex!==-1){
 const source=JSON.parse(await readFile(resolve(args[sourceIndex+1]),'utf8'))
 if(!Array.isArray(source.saints)||!Array.isArray(source.miracles)||!Array.isArray(source.prayers)||Object.keys(source).some(key=>!['saints','miracles','prayers'].includes(key)))throw Error('PUBLIC_SOURCE_ONLY')
 const collect=(value,path='',out={})=>{if(typeof value==='string'&&value&&allowed(path))out[path]=value;else if(value&&typeof value==='object')for(const[key,item]of Object.entries(value))collect(item,path?path+'.'+key:key,out);return out}
 const sources=Object.entries({saint:source.saints,miracle:source.miracles,prayer:source.prayers}).flatMap(([kind,rows])=>rows.map(row=>({kind,id:row.id,fields:collect(row)})))
 let complete=true
 for(const locale of locales){
  const entries=sources.map(entity=>{const pack=packs.find(p=>p.kind===entity.kind&&p.id===entity.id&&p.locale===locale);const fields=Object.entries(entity.fields).map(([path,original])=>{const candidate=pack?.fields[path];return{field:path,sourceHash:md5(original),status:!candidate?'MISSING':candidate.source!==original||candidate.sourceHash!==md5(original)?'STALE':'COMPLETE',review:candidate?.review||'not-translated'}});return{kind:entity.kind,id:entity.id,fields}})
  const fields=entries.flatMap(row=>row.fields),missing=fields.filter(f=>f.status==='MISSING').length,stale=fields.filter(f=>f.status==='STALE').length
  if(missing||stale)complete=false
  result.locales[locale]={complete:fields.length-missing-stale,missing,stale,errors:0,humanReviewed:fields.filter(f=>f.review==='human').length,entries}
 }
 result.sourceCounts={saints:source.saints.length,miracles:source.miracles.length,prayers:source.prayers.length}
 result.coverage=complete?'COMPLETE':'INCOMPLETE'
}
if(reportIndex!==-1)await writeFile(resolve(args[reportIndex+1]),JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify({...result,locales:Object.fromEntries(Object.entries(result.locales).map(([locale,{entries,...counts}])=>[locale,counts]))},null,2))
if(args.includes('--require-complete')&&result.coverage!=='COMPLETE')process.exitCode=2
