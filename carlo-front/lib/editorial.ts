export const factStatuses = ["verified", "approximate", "traditional", "unknown", "not-applicable"] as const;
export type FactStatus = typeof factStatuses[number];
export type EditorialSource = { url: string; institution: string; title: string; accessedAt: string; claims: string[] };
export type EditorialDate = { text: string | null; status: FactStatus };
export type EditorialImage = { sourceUrl: string; creator: string; license: string; licenseUrl: string; attribution: string; alt: string; kind: "painting" | "sculpture" | "photograph" | "illustration" | "mosaic" };
export type Editorial = { kind: "person" | "archangel" | "collective"; ecclesialStatus: string; birthDate: EditorialDate; deathDate: EditorialDate; birthplaceStatus: FactStatus; notes: string | null; sources: EditorialSource[]; image: EditorialImage | null };

export const factStatusLabels: Record<FactStatus, string> = { verified: "Verificado", approximate: "Aproximado", traditional: "Tradicional o atribuido", unknown: "Desconocido", "not-applicable": "No aplicable" };
export const imageKindLabels: Record<EditorialImage["kind"], string> = {painting: "Pintura", sculpture: "Escultura", photograph: "Fotografía", illustration: "Ilustración", mosaic: "Mosaico"};
export function blankEditorial(): Editorial { return {kind:"person", ecclesialStatus:"Sin documentar", birthDate:{text:null,status:"unknown"},deathDate:{text:null,status:"unknown"},birthplaceStatus:"unknown",notes:null,sources:[],image:null}; }
export function historicalYear(year: number): string { return year < 0 ? `${Math.abs(year)} a. C.` : String(year); }
