// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { SaintsList } from "./saints-list"
import { translations } from "@/lib/translations"
vi.mock("@/components/catalog-image", () => ({ CatalogImage: ({alt}: {alt:string}) => <span role="img" aria-label={alt}/> }))
vi.mock("@/components/translated-text", () => ({ TranslatedText: ({text}: {text:string}) => <span>{text}</span> }))
vi.mock("@/contexts/language-context", () => ({ useLanguage: () => ({language:"es",t:(key:string)=>translations.es[key]||key}) }))
afterEach(cleanup)
const saint={id:"synthetic-card",name:"San José",slug:"san-jose",biographyExcerpt:"Contenido visible de la tarjeta.",patronOf:["Iglesia universal"]}
it("uses one semantic canonical link covering portrait, title, biography and card whitespace",()=>{
  render(<SaintsList saints={[saint]} remoteTotal={1}/> )
  const link=screen.getByRole("link",{name:"Ver biografía de San José"})
  expect(link.getAttribute("href")).toBe("/santos/san-jose")
  for(const zone of [screen.getByRole("img"),screen.getByRole("heading",{name:"San José"}),screen.getByText(saint.biographyExcerpt),screen.getByText("Iglesia universal")]) expect(zone.closest("a")).toBe(link)
  expect(link.querySelector(".overflow-hidden")).toBeTruthy()
  expect(link.querySelector("a,button,[role=button]")).toBeNull()
  expect(screen.getAllByRole("link")).toHaveLength(1)
})
