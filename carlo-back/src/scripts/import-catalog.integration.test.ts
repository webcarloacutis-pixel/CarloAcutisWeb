import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {integrationDatabaseEnabled} from '../lib/test-database';
import {prisma} from '../lib/prisma';
import {importEntry} from './import-catalog';
import {updateSaint} from '../lib/saint-service';
type Entry=Parameters<typeof importEntry>[0];
describe.skipIf(!integrationDatabaseEnabled())('catalog import with isolated real PostgreSQL',()=>{
 const keys:string[]=[];
 function entry(kind:'person'|'archangel'='person'):Entry{
  const key='audit-import-'+randomUUID().replace(/-/g,'');keys.push(key);
  return {identityKey:key,originalNumber:1,name:'Controlled '+key,slug:key,biography:'Controlled disposable integration fixture. '.repeat(12),birthYear:null,deathYear:null,birthCountryCode:null,birthPlace:null,birthLat:null,birthLng:null,editorial:{kind,ecclesialStatus:'Controlled test',birthDate:{text:null,status:kind==='person'?'unknown':'not-applicable'},deathDate:{text:null,status:kind==='person'?'unknown':'not-applicable'},birthplaceStatus:kind==='person'?'unknown':'not-applicable',notes:null,image:null,sources:[{url:'https://example.invalid/controlled-fixture',institution:'Local test',title:'Controlled fixture',accessedAt:'2026-09-15',claims:['Not editorial content']}]},miracles:[{title:'Controlled relation',approved:false,details:'Not editorial content'}],prayers:[{title:'Controlled relation',content:'Not editorial content',approved:false}]};
 }
 beforeAll(async()=>{const result=await prisma.$queryRaw<Array<{name:string}>>`SELECT current_database() AS name`;expect(result[0].name).toBe(new URL(process.env.DATABASE_URL!).pathname.slice(1));});
 afterAll(async()=>{
  await prisma.catalogImport.deleteMany({where:{identityKey:{in:keys}}});
  await prisma.prayer.deleteMany({where:{id:{in:keys.map(key=>'catalog-'+key+'-p1')}}});
  await prisma.saint.deleteMany({where:{id:{in:keys.map(key=>'catalog-'+key)}}});
  await prisma.$disconnect();
 });
 it('previews without writes and creates stable related records exactly once',async()=>{
  const e=entry();expect((await importEntry(e,false)).action).toBe('create');expect(await prisma.catalogImport.findUnique({where:{identityKey:e.identityKey}})).toBeNull();
  expect((await importEntry(e,true)).action).toBe('create');expect((await importEntry(e,true)).action).toBe('unchanged');
  const saintId='catalog-'+e.identityKey;expect(await prisma.saint.count({where:{id:saintId}})).toBe(1);expect(await prisma.miracle.count({where:{saintId}})).toBe(1);expect(await prisma.prayer.count({where:{id:saintId+'-p1',saintName:String(e.name)}})).toBe(1);
 });
 it('preserves manual edits and reports conflict when incoming content also changed',async()=>{
  const e=entry();await importEntry(e,true);const id='catalog-'+e.identityKey;
  await updateSaint(id,{biography:'Manually edited controlled fixture'});
  expect((await importEntry(e,true)).action).toBe('manual-edit-preserved');expect((await importEntry({...e,biography:String(e.biography)+' New research'},true)).action).toBe('conflict');
  expect((await prisma.saint.findUniqueOrThrow({where:{id}})).biography).toBe('Manually edited controlled fixture');
 });
 it('updates managed content while retaining existing translations',async()=>{
  const e=entry();await importEntry(e,true);const id='catalog-'+e.identityKey;
  await prisma.saintTranslation.create({data:{saintId:id,lang:'en',biography:'Existing reviewed translation'}});
  expect((await importEntry({...e,title:'Reviewed update'},true)).action).toBe('update');
  expect((await prisma.saintTranslation.findFirstOrThrow({where:{saintId:id,lang:'en'}})).biography).toBe('Existing reviewed translation');
 });
 it('rejects partial human birth fields for an existing archangel',async()=>{
  const e=entry('archangel');await importEntry(e,true);const id='catalog-'+e.identityKey;
  await expect(updateSaint(id,{birthYear:100})).rejects.toMatchObject({code:'NON_PERSON_BIRTH_NOT_APPLICABLE'});
  expect((await prisma.saint.findUniqueOrThrow({where:{id}})).birthYear).toBeNull();
 });
 it('preserves admin deletion as a tombstone and never silently recreates it',async()=>{
  const e=entry();await importEntry(e,true);const id='catalog-'+e.identityKey;
  await prisma.saint.delete({where:{id}});expect((await prisma.catalogImport.findUniqueOrThrow({where:{identityKey:e.identityKey}})).saintId).toBeNull();
  expect(await importEntry(e,true)).toMatchObject({action:'conflict',reason:'ADMIN_DELETION_PRESERVED_REIMPORT_REQUIRES_REVIEW'});expect(await prisma.saint.findUnique({where:{id}})).toBeNull();
 });
 it('refuses removal of an existing managed relation without destroying it',async()=>{
  const e=entry();await importEntry(e,true);expect((await importEntry({...e,miracles:[]},true)).action).toBe('conflict');
  expect(await prisma.miracle.count({where:{saintId:'catalog-'+e.identityKey}})).toBe(1);
 });
});
