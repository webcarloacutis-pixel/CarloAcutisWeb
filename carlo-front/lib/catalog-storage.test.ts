import {describe,expect,it} from "vitest";
import {catalogStorageRewrites} from "./catalog-storage.mjs";
describe("catalog Storage routing",()=>{
  it("uses only the authorized project and bucket, preserving stored source paths",()=>{
    expect(catalogStorageRewrites({CATALOG_STORAGE_PROVIDER:"supabase"})).toEqual([{source:"/catalog/:path*",destination:"https://rquzpsjismymbyijwhgj.supabase.co/storage/v1/object/public/acutis-catalog/:path*"}]);
  });
  it("requires an explicit valid provider and retains local development",()=>{
    expect(catalogStorageRewrites({CATALOG_STORAGE_PROVIDER:"local"})).toEqual([]);
    expect(()=>catalogStorageRewrites({CATALOG_STORAGE_PROVIDER:"other"})).toThrow();
  });
});
