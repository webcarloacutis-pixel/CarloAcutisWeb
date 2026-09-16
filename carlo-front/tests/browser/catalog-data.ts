import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import type {Editorial} from '../../lib/editorial';
export type CatalogEntry=Record<string,unknown>&{identityKey:string;slug:string;name:string;biography:string;imageUrl:string;editorial:Editorial;prayers:Array<{title:string;content:string}>};
const folder=resolve(__dirname,'../../../.audit/acutis-closure/catalog-prepared');
export const catalogEntries:CatalogEntry[]=process.env.ACUTIS_CATALOG_SNAPSHOT ? JSON.parse(readFileSync(process.env.ACUTIS_CATALOG_SNAPSHOT,'utf8').replace(/^\uFEFF/,'')) : readdirSync(folder).filter(name=>/^batch\d{2}\.json$/.test(name)&&(!process.env.ACUTIS_CATALOG_BATCH||process.env.ACUTIS_CATALOG_BATCH.split(',').includes(name))).sort().flatMap(name=>JSON.parse(readFileSync(resolve(folder,name),'utf8').replace(/^\uFEFF/,'')));
if(!catalogEntries.length)throw new Error('NO_IMPORTED_CATALOG_BATCHES');
if(new Set(catalogEntries.map(entry=>entry.identityKey)).size!==catalogEntries.length)throw new Error('DUPLICATE_CATALOG_IDENTITY');
