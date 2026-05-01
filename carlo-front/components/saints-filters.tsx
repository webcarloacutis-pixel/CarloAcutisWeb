"use client"

import { T } from "@/components/t";
import { useState } from "react"
import { useLanguage } from "@/contexts/language-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter } from "lucide-react"

export function SaintsFilters() {
  
  const { t } = useLanguage()
const [searchTerm, setSearchTerm] = useState("")
  const [selectedContinent, setSelectedContinent] = useState("")
  const [selectedCentury, setSelectedCentury] = useState("")

  return (
    <div className="bg-card rounded-lg p-6 mb-8 border">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-5 w-5 text-primary" />
        <h2 className="font-playfair text-lg font-semibold"><T k="saints.filters.title" /></h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder={t("saints.filters.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={selectedContinent} onValueChange={setSelectedContinent}>
          <SelectTrigger>
            <SelectValue placeholder={t("saints.filters.continentPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="europa">Europa</SelectItem>
            <SelectItem value="asia">Asia</SelectItem>
            <SelectItem value="africa">África</SelectItem>
            <SelectItem value="america">América</SelectItem>
            <SelectItem value="oceania">Oceanía</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedCentury} onValueChange={setSelectedCentury}>
          <SelectTrigger>
            <SelectValue placeholder={t("saints.filters.centuryPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1-5"><T k="saints.century" />s I-V</SelectItem>
            <SelectItem value="6-10"><T k="saints.century" />s VI-X</SelectItem>
            <SelectItem value="11-15"><T k="saints.century" />s XI-XV</SelectItem>
            <SelectItem value="16-20"><T k="saints.century" />s XVI-XX</SelectItem>
            <SelectItem value="21"><T k="saints.century" /> XXI</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          onClick={() => {
            setSearchTerm("")
            setSelectedContinent("")
            setSelectedCentury("")
          }}
        >
          <T k="saints.clearFilters" />
        </Button>
      </div>
    </div>
  )
}
