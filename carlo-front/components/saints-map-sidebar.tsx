"use client"
import Link from "next/link"
import { CatalogPagination, useCatalogPage } from "./catalog-pagination"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CONTINENTS, countryName, hasBirthCoordinates, type PublicSaint } from "@/lib/content-filters"
export function SaintsMapSidebar({ saints, allSaints }: { saints: PublicSaint[]; allSaints: PublicSaint[] }) {
  const page = useCatalogPage(saints, 20)
  const located = saints.filter(hasBirthCoordinates).length
  return <div className="space-y-6">
    <Card><CardHeader><CardTitle className="font-playfair text-lg">Santos por nacimiento</CardTitle>
      <p role="status" aria-live="polite" className="text-sm text-muted-foreground">{saints.length} santos encontrados; {located} con ubicación documentada.</p>
    </CardHeader><CardContent>
      {!saints.length && <p className="text-sm">No hay santos registrados con estos filtros.</p>}
      <ul className="space-y-4 max-h-[36rem] overflow-y-auto">
        {page.items.map((saint) => <li key={saint.id} className="p-3 rounded-lg border space-y-2">
          <h3 className="font-medium text-sm">{saint.name}</h3>
          <p className="text-xs text-muted-foreground">{saint.birthPlace || "Lugar sin documentar"} · {countryName(saint.birthCountryCode)}</p>
          <p className="text-xs text-muted-foreground">{hasBirthCoordinates(saint) ? (saint.birthPrecision === "exact" ? "Lugar documentado" : "Ubicación aproximada de la ciudad") : "Sin coordenadas de nacimiento documentadas"}</p>
          <Button asChild size="sm" variant="outline" className="w-full"><Link prefetch={false} href={"/santos/" + encodeURIComponent(saint.slug)} aria-label={"Ver detalles de " + saint.name}>Ver detalles</Link></Button>
        </li>)}
      </ul>
      <CatalogPagination {...page} label="santos del mapa" />
    </CardContent></Card>
    <Card><CardHeader><CardTitle className="font-playfair text-lg">Catálogo por continente</CardTitle></CardHeader><CardContent>
      <dl className="space-y-2 text-sm">{CONTINENTS.map((continent) => <div key={continent.code} className="flex justify-between gap-2"><dt>{continent.label}</dt><dd>{allSaints.filter((saint) => saint.birthContinent === continent.code).length}</dd></div>)}
        <div className="flex justify-between gap-2"><dt>Sin documentar</dt><dd>{allSaints.filter((saint) => !CONTINENTS.some((continent) => continent.code === saint.birthContinent)).length}</dd></div>
      </dl>
    </CardContent></Card>
  </div>
}
