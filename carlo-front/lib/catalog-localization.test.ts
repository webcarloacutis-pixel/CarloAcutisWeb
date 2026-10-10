import { createHash } from 'node:crypto'
import { expect,it } from 'vitest'
import { localizeCatalogRecord,validateTranslationPack,type CatalogTranslationPack } from './catalog-localization'
const source={id:'public-fixture',name:'San José',slug:'san-jose',biography:'Primero.\n\nTexto completo.',patronOf:['Iglesia universal']}
const hash=(text:string)=>createHash('md5').update(text).digest('hex')
const pack:CatalogTranslationPack={version:1,kind:'saint',id:source.id,locale:'zh',fields:{
 biography:{source:source.biography,sourceHash:hash(source.biography),text:'第一段。\n\n完整内容。',review:'assistant'},
 name:{source:source.name,sourceHash:hash(source.name),text:'圣若瑟',review:'assistant'},
 'patronOf.0':{source:source.patronOf[0],sourceHash:hash(source.patronOf[0]),text:'普世教会',review:'assistant'},
}}
it('reuses faithful per-field resources without changing originals, identity or route',()=>{
 const result=localizeCatalogRecord(source,validateTranslationPack(pack,'saint',source.id,'zh'))
 expect(result.content).toEqual({...source,name:'圣若瑟',biography:'第一段。\n\n完整内容。',patronOf:['普世教会']})
 expect(source.name).toBe('San José');expect(source.patronOf).toEqual(['Iglesia universal'])
})
it('invalidates only the edited field, including biography edits after the excerpt',()=>{
 const result=localizeCatalogRecord({...source,biography:'Nuevo original completo.'},pack)
 expect(result.content.biography).toBe('Nuevo original completo.');expect(result.content.name).toBe('圣若瑟');expect(result.stale).toContain('biography')
 const long='A'.repeat(600)+'primera versión'
 const excerptPack={...pack,fields:{biography:{...pack.fields.biography,source:long,sourceHash:hash(long)}}}
 const card={id:source.id,biographyExcerpt:'A'.repeat(600),biographySourceHash:hash(long+' editado')}
 expect(localizeCatalogRecord(card,excerptPack).content.biographyExcerpt).toBe(card.biographyExcerpt)
 expect(localizeCatalogRecord({...card,biographySourceHash:hash(long)},excerptPack).content.biographyExcerpt).toBe('第一段。\n\n完整内容。')
})
it.each(['slug','id','imageUrl','editorial.image.sourceUrl','__proto__.polluted'])('rejects mutable identity/private/unsafe field %s',path=>{
 expect(()=>validateTranslationPack({...pack,fields:{[path]:pack.fields.name}},'saint',source.id,'zh')).toThrow('INVALID_LOCAL_TRANSLATION')
})
it('rejects wrong locale/entity/kind rather than showing a cache entry from another scope',()=>{
 for(const changed of [{locale:'en'},{id:'other'},{kind:'prayer'}])expect(()=>validateTranslationPack({...pack,...changed},'saint',source.id,'zh')).toThrow()
})
