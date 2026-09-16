import { describe, expect, it } from "vitest";
import { editorialData } from "./editorial-validation";
import { saintData } from "./content-validation";
const base={kind:"person",ecclesialStatus:"Santo",birthDate:{text:null,status:"unknown"},deathDate:{text:"c. 67",status:"traditional"},birthplaceStatus:"unknown",notes:null,sources:[{url:"https://www.vatican.va/",institution:"Santa Sede",title:"Referencia de prueba",accessedAt:"2026-09-15",claims:["Fecha tradicional"]}],image:null};
describe("editorial integrity",()=>{
 it("keeps unknown dates null and traditions labeled",()=>{const value=editorialData(base);expect(value.birthDate.text).toBeNull();expect(value.deathDate.status).toBe("traditional");});
 it("rejects invented human dates on an archangel",()=>expect(()=>editorialData({...base,kind:"archangel"})).toThrow("NON_PERSON_DATES_NOT_APPLICABLE"));
 it.each(["javascript:alert(1)","http://example.org/","https://user:password@example.org/"])("rejects unsafe source %s",url=>expect(()=>editorialData({...base,sources:[{...base.sources[0],url}]})).toThrow("INVALID_SOURCE"));
 it("rejects missing support for a verified date",()=>expect(()=>editorialData({...base,birthDate:{text:null,status:"verified"}})).toThrow("FACT_TEXT_REQUIRED"));
 it("rejects hidden metadata fields",()=>expect(()=>editorialData({...base,approvedByChurch:true})).toThrow("UNKNOWN_FIELD"));
 it("accepts BCE but rejects year zero",()=>{expect(saintData({name:"Test",deathYear:-4}).deathYear).toBe(-4);expect(()=>saintData({name:"Test",deathYear:0})).toThrow("YEAR_ZERO_NOT_SUPPORTED");});
 it("rejects forged import provenance in admin payload",()=>expect(()=>saintData({name:"Test",catalogImport:{identityKey:"forged"}})).toThrow("UNKNOWN_FIELD"));
 it("rejects coordinates lacking a source",()=>expect(()=>saintData({name:"Test",birthLat:43,birthLng:12})).toThrow("BIRTH_PROVENANCE_REQUIRED"));
});
