import {describe,expect,it} from "vitest";
import {contentHash,importDecision} from "./import-catalog";
describe("catalog import preserves manual changes",()=>{
 const before={saint:{name:"Santo",biography:"Versión investigada"},miracles:[]};
 const manual={...before,saint:{...before.saint,biography:"Edición administrativa"}};
 const incoming={...before,saint:{...before.saint,biography:"Nueva revisión editorial"}};
 it("is unchanged on exact replay",()=>expect(importDecision(contentHash(before),before,before)).toBe("unchanged"));
 it("ignores JSON object property order",()=>expect(contentHash(before)).toBe(contentHash({miracles:[],saint:{biography:"Versión investigada",name:"Santo"}})));
 it("updates only an untouched imported version",()=>expect(importDecision(contentHash(before),before,incoming)).toBe("update"));
 it("preserves manual edits on replay",()=>expect(importDecision(contentHash(before),manual,before)).toBe("manual-edit-preserved"));
 it("requires review when upstream and administrator both changed",()=>expect(importDecision(contentHash(before),manual,incoming)).toBe("conflict"));
});
