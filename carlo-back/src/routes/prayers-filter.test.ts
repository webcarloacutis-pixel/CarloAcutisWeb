import express from 'express'
import type { Server } from 'node:http'
import { afterAll,beforeAll,expect,it,vi } from 'vitest'
const calls=vi.hoisted(()=>({findMany:vi.fn().mockResolvedValue([]),count:vi.fn().mockResolvedValue(0)}))
vi.mock('../lib/prisma',()=>({prisma:{prayer:calls,$transaction:(operations:Promise<unknown>[])=>Promise.all(operations)}}))
import prayers from './prayers'
import { errorHandler } from '../lib/errors'
let server:Server,base:string
beforeAll(async()=>{server=express().use('/prayers',prayers).use(errorHandler).listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));base='http://127.0.0.1:'+(server.address() as {port:number}).port})
afterAll(async()=>{await new Promise<void>(resolve=>server.close(()=>resolve()))})
it('applies the same literal name and approved-only predicate to rows and count',async()=>{
 const name="San José'; SELECT 1 --"
 const response=await fetch(base+'/prayers/approved?saintName='+encodeURIComponent(name))
 expect(response.status).toBe(200)
 const where={approved:true,saintName:{equals:name,mode:'insensitive'}}
 expect(calls.findMany).toHaveBeenLastCalledWith(expect.objectContaining({where}))
 expect(calls.count).toHaveBeenLastCalledWith({where})
})
it.each(['','a'.repeat(201),'a&saintName=b'])('rejects an invalid name filter %s without a collection success',async(value)=>{
 const query=value.includes('&')?value:encodeURIComponent(value)
 const response=await fetch(base+'/prayers/approved?saintName='+query)
 expect(response.status).toBe(400);expect(await response.json()).toEqual({error:'INVALID_FILTER'})
})
