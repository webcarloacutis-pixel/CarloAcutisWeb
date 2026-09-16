import {test,expect,type Page} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {appendFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {catalogEntries as entries} from './catalog-data';
// Authentication artifacts are disabled; editorial evidence never contains credentials.
test.use({trace:'off',screenshot:'off',video:'off',actionTimeout:15000,navigationTimeout:20000});
test.describe.configure({timeout:240000,retries:0});
const origin=process.env.ACUTIS_BROWSER_ORIGIN || 'https://localhost:3443';
async function login(page:Page){
 await page.route('**/*',route=>['localhost','127.0.0.1'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
 const bootstrap=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/auth/admin/me');
 await page.goto('/sanctum/portal');await bootstrap;
 await page.getByLabel('Clave de Acceso',{exact:true}).fill(process.env.ADMIN_KEY!);
 const response=page.waitForResponse(r=>r.url().endsWith('/api/auth/admin/login')&&r.request().method()==='POST');
 await page.getByRole('button',{name:'Acceder al Sanctum',exact:true}).click();expect((await response).status()).toBe(200);
 await expect(page).toHaveURL(/\/admin$/);await page.getByRole('button',{name:'Santos',exact:true}).click();
}
async function editor(page:Page,slug:string,name:string){
 await page.getByPlaceholder('Buscar santos...',{exact:true}).fill(slug);
 const card=page.locator('div.rounded-xl.border.bg-card').filter({has:page.getByRole('heading',{name,exact:true})});
 await expect(card).toHaveCount(1);await card.getByRole('button',{name:'Editar',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Editar santo',exact:true});await expect(dialog).toBeVisible();return dialog;
}
test('all imported records are readable and editable in the existing administration',async({page},info)=>{
 await login(page);const checked:string[]=[];
 for(const entry of entries){
  const dialog=await editor(page,entry.slug,entry.name);
  for(const key of ['slug','name','title','feastDay','country','continent','imageUrl','birthYear','deathYear','canonizationYear','birthPlace','birthCountryCode','birthContinent','birthLat','birthLng','birthPrecision','lat','lng','biography']){
   const input=dialog.locator('#'+key);if(['birthLat','birthLng','lat','lng'].includes(key)&&entry[key]!=null)expect(Number(await input.inputValue())).toBeCloseTo(Number(entry[key]),10);else await expect(input).toHaveValue(String(entry[key]??''));await expect(input).toBeEditable();
  }
  for(const key of ['patronOf','symbols','birthSources']){const expected=Array.isArray(entry[key])?(entry[key] as string[]).join('\n'):'';await expect(dialog.locator('#'+key)).toHaveValue(expected);await expect(dialog.locator('#'+key)).toBeEditable();}
  await expect(dialog.locator('#entity-kind')).toHaveValue(entry.editorial.kind);await expect(dialog.locator('#entity-kind')).toBeEnabled();
  for(const [key,value] of Object.entries({'ecclesial-status':entry.editorial.ecclesialStatus,'birthDate-text':entry.editorial.birthDate.text??'','deathDate-text':entry.editorial.deathDate.text??'','birthDate-status':entry.editorial.birthDate.status,'deathDate-status':entry.editorial.deathDate.status,'birthplace-status':entry.editorial.birthplaceStatus}))await expect(dialog.locator('#'+key)).toHaveValue(value);
  for(const [key,value] of Object.entries(entry.editorial.image!))await expect(dialog.locator('#image-'+key)).toHaveValue(value);
  await expect(dialog.locator('#image-alt')).toHaveValue(entry.editorial.image!.alt);
  await expect(dialog.locator('#image-license')).toHaveValue(entry.editorial.image!.license);
  await expect(dialog.locator('#editorial-notes')).toHaveValue(entry.editorial.notes??'');
  for(const [index,source] of entry.editorial.sources.entries())for(const [key,value] of Object.entries(source))await expect(dialog.locator('#source-'+index+'-'+key)).toHaveValue(Array.isArray(value)?value.join('\n'):value);
  await expect(dialog.locator('#biography')).toHaveValue(entry.biography);
  await dialog.getByRole('button',{name:'Cancelar',exact:true}).click();checked.push(entry.identityKey);
 }
 await info.attach('admin-catalog-identities',{body:JSON.stringify({checked,count:checked.length}),contentType:'application/json'});
});
test('a controlled copy can be edited, reloaded and deleted; anonymous writes are denied',async({page,request},info)=>{
 test.setTimeout(60000);
 const browserTarget=new URL(origin);
 if(browserTarget.origin !== 'http://127.0.0.1:3150') throw new Error('EXACT_ISOLATED_BROWSER_ORIGIN_REQUIRED');
 const target=new URL(process.env.DATABASE_URL || 'http://invalid');
 if(process.env.ACUTIS_CATALOG_MUTATION_TEST !== 'isolated' || !['127.0.0.1','localhost'].includes(target.hostname) || target.port !== '55439' || !target.pathname.startsWith('/acutis_migration_transfer_')) throw new Error('EXACT_ISOLATED_CATALOG_DATABASE_REQUIRED');
 let id:string|null=null,adminCookie='';
 const mark=(phase:string)=>{const path=info.outputPath('controlled-copy-phases.jsonl');mkdirSync(dirname(path),{recursive:true});appendFileSync(path,JSON.stringify({phase,id,at:new Date().toISOString()})+'\n');};
 mark('start');
 const original=entries[0],suffix=randomUUID().slice(0,12),name='Copia controlada '+suffix,slug='catalog-check-'+suffix;
 const allowed=['name','slug','country','title','feastDay','imageUrl','biography','continent','lat','lng','deathYear','birthCountryCode','birthContinent','birthPlace','birthLat','birthLng','birthPrecision','birthSources','birthYear','canonizationYear','patronOf','symbols','editorial'];
 const body={...Object.fromEntries(allowed.filter(k=>original[k]!==undefined).map(k=>[k,original[k]])),name,slug};
 const anonymous=await request.post('/api/saints',{data:body,headers:{Origin:origin}});expect([401,403]).toContain(anonymous.status());
 mark('login');await login(page);const credential=(await page.context().cookies(origin)).find(cookie=>cookie.name==='carlo_admin');expect(Boolean(credential)).toBe(true);adminCookie='carlo_admin='+credential!.value;mark('logged-in');
 try{
  mark('create-copy');const created=await page.request.post('/api/saints',{data:body,headers:{Origin:origin}});expect(created.status()).toBe(201);id=(await created.json()).id;mark('created-copy');
  mark('reload-after-create');await page.reload();await page.getByRole('button',{name:'Santos',exact:true}).click();
  mark('open-copy-editor');const dialog=await editor(page,slug,name),editedBiography=original.biography+'\n\nNota temporal de verificación '+suffix;
  await dialog.locator('#biography').fill(editedBiography);await dialog.locator('#editorial-notes').fill('Copia de prueba reversible '+suffix);
  const saved=page.waitForResponse(r=>r.url().endsWith('/api/saints/'+id)&&r.request().method()==='PATCH');
  mark('save-copy');await dialog.getByRole('button',{name:'Guardar cambios',exact:true}).click();expect((await saved).status()).toBe(200);await expect(dialog).toHaveCount(0);
  mark('verify-api-persistence');const persisted=await page.request.get('/api/saints/'+slug,{timeout:10000});expect(persisted.status()).toBe(200);expect((await persisted.json()).biography).toBe(editedBiography);
  mark('reload-saved-copy');await page.reload();await page.getByRole('button',{name:'Santos',exact:true}).click();
  mark('verify-reloaded-copy');const reopened=await editor(page,slug,name);await expect(reopened.locator('#biography')).toHaveValue(editedBiography);await expect(reopened.locator('#editorial-notes')).toHaveValue('Copia de prueba reversible '+suffix);await reopened.getByRole('button',{name:'Cancelar',exact:true}).click();
  mark('open-public-copy');const publicPage=await page.context().newPage();await publicPage.goto('/santos/'+slug);await expect(publicPage.locator('main').getByText('Copia de prueba reversible '+suffix,{exact:true})).toBeVisible();expect(await publicPage.locator('main').innerText()).toContain('Nota temporal de verificación '+suffix);mark('close-public-copy');await publicPage.close();
  mark('anonymous-write-denied');const denied=await request.patch('/api/saints/'+id,{data:{biography:'Unauthorized change'},headers:{Origin:origin}});expect([401,403]).toContain(denied.status());
  mark('delete-copy-ui');await page.getByPlaceholder('Buscar santos...',{exact:true}).fill(slug);page.once('dialog',dialog=>dialog.accept());
  const deleted=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/saints/'+id)&&r.request().method()==='DELETE');
  await page.getByRole('button',{name:'Eliminar '+name,exact:true}).click();mark('await-delete-response');expect((await deleted).status()).toBe(200);
  expect((await request.get('/api/saints/'+slug)).status()).toBe(404);id=null;mark('completed');
  await info.attach('reversible-admin-check',{body:JSON.stringify({originalIdentity:original.identityKey,readEditReloadPublic:true,anonymousDenied:true,copyDeleted:true}),contentType:'application/json'});
 }finally{if(id){mark('independent-cleanup');const cleanup=await fetch(origin+'/api/saints/'+id,{method:'DELETE',headers:{Origin:origin,Cookie:adminCookie},signal:AbortSignal.timeout(10000)});expect([200,404]).toContain(cleanup.status);mark('cleanup-completed');}}
});
