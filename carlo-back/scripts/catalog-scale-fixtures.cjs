// Synthetic credentials and content exclusively for an isolated disposable database.
const {PrismaClient}=require('@prisma/client')
const bcrypt=require('bcryptjs')
const url=new URL(process.env.DATABASE_URL||'')
if(url.hostname!=='127.0.0.1'||url.port!=='55439'||url.pathname!=='/acutis_catalog_capacity_test')throw Error('EXACT_DISPOSABLE_DATABASE_REQUIRED')
const prisma=new PrismaClient({log:[]})
const sid=i=>'scale-browser-saint-'+String(i).padStart(4,'0')
;(async()=>{
 const [{database}]=await prisma.$queryRaw`SELECT current_database() AS database`
 if(database!=='acutis_catalog_capacity_test')throw Error('WRONG_DATABASE')
 if(process.argv.includes('--cleanup')) {
  await prisma.saint.deleteMany({where:{id:{startsWith:'scale-browser-saint-'}}})
  await prisma.user.deleteMany({where:{email:'scale-admin@example.invalid'}})
  console.log('Only owned browser fixtures removed from disposable database.')
  return
 }
 if(await prisma.saint.count()||await prisma.miracle.count())throw Error('EMPTY_DISPOSABLE_DATABASE_REQUIRED')
 for(let start=0;start<3000;start+=100) {
  await prisma.saint.createMany({data:Array.from({length:100},(_,offset)=>{
   const i=start+offset
   return {id:sid(i),slug:'scale-saint-'+String(i).padStart(4,'0'),name:'Santo sintético '+String(i).padStart(4,'0'),
    title:'Ficha sintética para pruebas',biography:'Biografía sintética, sin valor editorial. '.repeat(50)+(i===2999?' Marcador final completo.':''),
    imageUrl:'/catalog/owner-2026/owner-2026-'+String(i%5+1).padStart(3,'0')+'.webp',
    birthCountryCode:i%2?'CO':'IT',birthContinent:i%2?'south-america':'europe',birthPlace:'Ciudad sintética '+i,
    birthLat:-60+Math.floor(i/100)*4,birthLng:-150+(i%100)*3,birthPrecision:'city',birthSources:['https://example.invalid/synthetic'],deathYear:i%2?1950:1750}
  })})
  await prisma.miracle.createMany({data:Array.from({length:100},(_,offset)=>{
   const i=start+offset
   return {id:'scale-browser-miracle-'+String(i).padStart(4,'0'),saintId:sid(0),title:'Milagro sintético '+String(i).padStart(4,'0'),details:'Relato sintético, sin valor editorial. '.repeat(50),approved:true,type:i%2?'Curación':'Eucarístico'}
  })})
 }
 await prisma.user.create({data:{email:'scale-admin@example.invalid',passwordHash:await bcrypt.hash('Synthetic-scale-password-2026!',12),isAdmin:true,name:'Synthetic scale administrator'}})
 console.log(JSON.stringify({disposable:true,saints:await prisma.saint.count(),miracles:await prisma.miracle.count(),syntheticAdmin:true}))
})().catch(()=>{console.error('DISPOSABLE_FIXTURE_OPERATION_FAILED (details withheld)');process.exitCode=1}).finally(()=>prisma.$disconnect())
