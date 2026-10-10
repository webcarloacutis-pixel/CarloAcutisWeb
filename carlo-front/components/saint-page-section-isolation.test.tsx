import { expect, it, vi } from "vitest"
import SaintPage from "@/app/santos/[slug]/page"
vi.mock("@/components/header",()=>({Header:()=>null}))
vi.mock("@/components/footer",()=>({Footer:()=>null}))
vi.mock("@/components/saint-detail",()=>({SaintDetail:()=>null}))
vi.mock("@/lib/api-url",()=>({apiUrl:(path:string)=>"https://synthetic.invalid"+path}))
vi.mock("@/lib/public-request",()=>({publicRequest:async()=>Response.json({id:"synthetic",name:"San José",slug:"san-jose",biography:"Biography remains readable."}),publicJson:async(response:Response)=>response.json(),publicContractError:()=>{throw Error("INVALID_PUBLIC_CONTENT")}}))
vi.mock("@/lib/public-collection",()=>({fetchPublicCollection:async()=>{throw Error("SYNTHETIC_PRAYER_TIMEOUT")}}))
it("does not fail the saint Server Component because an independent prayer collection is unavailable",async()=>{
  await expect(SaintPage({params:Promise.resolve({slug:"san-jose"})})).resolves.toBeTruthy()
})
