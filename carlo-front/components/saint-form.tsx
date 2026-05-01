"use client";
import { T } from "@/components/t";


import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Save, ArrowLeft, MapPin } from "lucide-react";
import { MiracleForm } from "./miracle-form";
import { PrayerForm } from "./prayer-form";
import { saveSaint, validateSaintData, type SaintFormData } from "@/lib/admin-utils";

type Coordinates = [number, number];

type MiracleData = {
  id: string;
  title: string;
  description: string;
};

type PrayerData = {
  id: string;
  title: string;
  occasion?: string;
};

type FormDataState = {
  name: string;
  title: string;
  feastDay: string;
  country: string;
  continent: string;
  coordinates: Coordinates;
  birthYear: string;
  deathYear: string;
  canonizationYear: string;
  biography: string;
  image: string;
  patronOf: string[];
  symbols: string[];
};

type ExistingSaint = Partial<FormDataState> & {
  miracles?: MiracleData[];
  prayers?: PrayerData[];
};

interface SaintFormProps {
  onClose: () => void;
  saint?: ExistingSaint; // edición
}

function normalizeCoords(input: unknown): Coordinates {
  if (Array.isArray(input) && input.length >= 2) {
    const lat = Number(input[0]);
    const lng = Number(input[1]);
    return [Number.isFinite(lat) ? lat : 0, Number.isFinite(lng) ? lng : 0];
  }
  return [0, 0];
}

function normalizeStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.map(String).filter((s) => s.trim().length > 0);
}

export function SaintForm({ onClose, saint }: SaintFormProps) {
  const [formData, setFormData] = useState<FormDataState>(() => ({
    name: saint?.name ?? "",
    title: saint?.title ?? "",
    feastDay: saint?.feastDay ?? "",
    country: saint?.country ?? "",
    continent: saint?.continent ?? "",
    coordinates: normalizeCoords(saint?.coordinates),
    birthYear: saint?.birthYear ?? "",
    deathYear: saint?.deathYear ?? "",
    canonizationYear: saint?.canonizationYear ?? "",
    biography: saint?.biography ?? "",
    image: saint?.image ?? "",
    patronOf: normalizeStringArray(saint?.patronOf),
    symbols: normalizeStringArray(saint?.symbols),
  }));

  const [newPatron, setNewPatron] = useState<string>("");
  const [newSymbol, setNewSymbol] = useState<string>("");

  const [miracles, setMiracles] = useState<MiracleData[]>(() =>
    Array.isArray(saint?.miracles) ? saint!.miracles! : [],
  );
  const [prayers, setPrayers] = useState<PrayerData[]>(() =>
    Array.isArray(saint?.prayers) ? saint!.prayers! : [],
  );

  const [showMiracleForm, setShowMiracleForm] = useState<boolean>(false);
  const [showPrayerForm, setShowPrayerForm] = useState<boolean>(false);

  const continents: string[] = ["Europa", "Asia", "África", "América", "Oceanía"];

  const handleInputChange = <K extends keyof FormDataState>(field: K, value: FormDataState[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addPatron = () => {
    const v = newPatron.trim();
    if (!v) return;

    setFormData((prev) => ({
      ...prev,
      patronOf: [...prev.patronOf, v],
    }));
    setNewPatron("");
  };

  const removePatron = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      patronOf: prev.patronOf.filter((_patron: string, i: number) => i !== index),
    }));
  };

  const addSymbol = () => {
    const v = newSymbol.trim();
    if (!v) return;

    setFormData((prev) => ({
      ...prev,
      symbols: [...prev.symbols, v],
    }));
    setNewSymbol("");
  };

  const removeSymbol = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      symbols: prev.symbols.filter((_symbol: string, i: number) => i !== index),
    }));
  };

  const handleCoordinateChange = (idx: 0 | 1, value: string) => {
    const current: Coordinates = formData.coordinates;
    const next: Coordinates = [...current] as Coordinates;
    next[idx] = Number.parseFloat(value) || 0;
    handleInputChange("coordinates", next);
  };

  const handleSave = async () => {
    const saintData = {
      ...formData,
      miracles,
      prayers,
    } as unknown as SaintFormData;

    const validation = validateSaintData(saintData);
    if (!validation.isValid) {
      alert(`Errores de validación:\n${validation.errors.join("\n")}`);
      return;
    }

    const result = await saveSaint(saintData);
    if (result.success) {
      alert(`Santo guardado exitosamente!\nID: ${result.id}`);
      onClose();
      return;
    }

    alert(`Error: ${result.message}`);
  };

  if (showMiracleForm) {
    return (
      <MiracleForm
        onClose={() => setShowMiracleForm(false)}
        onSave={(miracle: Omit<MiracleData, "id">) => {
          setMiracles((prev) => [...prev, { ...miracle, id: Date.now().toString() }]);
          setShowMiracleForm(false);
        }}
      />
    );
  }

  if (showPrayerForm) {
    return (
      <PrayerForm
        onClose={() => setShowPrayerForm(false)}
        onSave={(prayer: Omit<PrayerData, "id">) => {
          setPrayers((prev) => [...prev, { ...prayer, id: Date.now().toString() }]);
          setShowPrayerForm(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-playfair text-3xl font-bold">{saint ? "Editar Santo" : "Nuevo Santo"}</h2>
          <p className="text-muted-foreground">Complete toda la información del santo</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} className="bg-primary">
            <Save className="h-4 w-4 mr-2" />
            Guardar
          </Button>
          <Button variant="outline" onClick={onClose}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Información Básica */}
        <Card>
          <CardHeader>
            <CardTitle>Información Básica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nombre Completo *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="San Francisco de Asís"
                />
              </div>
              <div>
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="Fundador de la Orden Franciscana"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="feastDay">Día de Fiesta *</Label>
                <Input
                  id="feastDay"
                  value={formData.feastDay}
                  onChange={(e) => handleInputChange("feastDay", e.target.value)}
                  placeholder="4 de octubre"
                />
              </div>
              <div>
                <Label htmlFor="country">País *</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => handleInputChange("country", e.target.value)}
                  placeholder="Italia"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="continent"><T k="saints.continent" /> *</Label>
              <Select value={formData.continent} onValueChange={(value) => handleInputChange("continent", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar continente" />
                </SelectTrigger>
                <SelectContent>
                  {continents.map((continent: string) => (
                    <SelectItem key={continent} value={continent}>
                      {continent}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Coordenadas Geográficas</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="lat" className="text-sm">
                    Latitud
                  </Label>
                  <Input
                    id="lat"
                    type="number"
                    step="any"
                    value={formData.coordinates[0]}
                    onChange={(e) => handleCoordinateChange(0, e.target.value)}
                    placeholder="43.0642"
                  />
                </div>
                <div>
                  <Label htmlFor="lng" className="text-sm">
                    Longitud
                  </Label>
                  <Input
                    id="lng"
                    type="number"
                    step="any"
                    value={formData.coordinates[1]}
                    onChange={(e) => handleCoordinateChange(1, e.target.value)}
                    placeholder="12.6466"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                <MapPin className="h-3 w-3 inline mr-1" />
                Coordenadas para ubicar en el mapa mundial
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="birthYear">Año Nacimiento</Label>
                <Input
                  id="birthYear"
                  type="number"
                  value={formData.birthYear}
                  onChange={(e) => handleInputChange("birthYear", e.target.value)}
                  placeholder="1181"
                />
              </div>
              <div>
                <Label htmlFor="deathYear">Año Muerte</Label>
                <Input
                  id="deathYear"
                  type="number"
                  value={formData.deathYear}
                  onChange={(e) => handleInputChange("deathYear", e.target.value)}
                  placeholder="1226"
                />
              </div>
              <div>
                <Label htmlFor="canonizationYear">Año Canonización</Label>
                <Input
                  id="canonizationYear"
                  type="number"
                  value={formData.canonizationYear}
                  onChange={(e) => handleInputChange("canonizationYear", e.target.value)}
                  placeholder="1228"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="image">URL de Imagen</Label>
              <Input
                id="image"
                value={formData.image}
                onChange={(e) => handleInputChange("image", e.target.value)}
                placeholder="/san-francisco-de-asis.jpg"
              />
            </div>
          </CardContent>
        </Card>

        {/* Biografía */}
        <Card>
          <CardHeader>
            <CardTitle>Biografía</CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="biography">Historia Completa *</Label>
            <Textarea
              id="biography"
              value={formData.biography}
              onChange={(e) => handleInputChange("biography", e.target.value)}
              placeholder="Escriba la biografía completa del santo..."
              className="min-h-[300px] resize-none"
            />
            <p className="text-xs text-muted-foreground mt-2">Incluya detalles sobre su vida, conversión, obras y legado</p>
          </CardContent>
        </Card>
      </div>

      {/* Patronazgos */}
      <Card>
        <CardHeader>
          <CardTitle>Patronazgos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newPatron}
              onChange={(e) => setNewPatron(e.target.value)}
              placeholder="Ej: Animales, Ecología, Italia..."
              onKeyDown={(e) => e.key === "Enter" && addPatron()}
            />
            <Button onClick={addPatron} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.patronOf.map((patron: string, index: number) => (
              <Badge key={`${patron}-${index}`} variant="secondary" className="flex items-center gap-1">
                {patron}
                <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => removePatron(index)} />
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Símbolos */}
      <Card>
        <CardHeader>
          <CardTitle>Símbolos Asociados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
              placeholder="Ej: Lobo, Pájaros, Estigmas..."
              onKeyDown={(e) => e.key === "Enter" && addSymbol()}
            />
            <Button onClick={addSymbol} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.symbols.map((symbol: string, index: number) => (
              <Badge key={`${symbol}-${index}`} variant="outline" className="flex items-center gap-1">
                {symbol}
                <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => removeSymbol(index)} />
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Milagros y Oraciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Milagros ({miracles.length})</CardTitle>
            <Button onClick={() => setShowMiracleForm(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Agregar
            </Button>
          </CardHeader>
          <CardContent>
            {miracles.length === 0 ? (
              <p className="text-muted-foreground text-sm">No hay milagros registrados</p>
            ) : (
              <div className="space-y-3">
                {miracles.map((miracle: MiracleData) => (
                  <div key={miracle.id} className="p-3 border rounded-lg">
                    <h4 className="font-medium">{miracle.title}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2">{miracle.description}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Oraciones ({prayers.length})</CardTitle>
            <Button onClick={() => setShowPrayerForm(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Agregar
            </Button>
          </CardHeader>
          <CardContent>
            {prayers.length === 0 ? (
              <p className="text-muted-foreground text-sm">No hay oraciones registradas</p>
            ) : (
              <div className="space-y-3">
                {prayers.map((prayer: PrayerData) => (
                  <div key={prayer.id} className="p-3 border rounded-lg">
                    <h4 className="font-medium">{prayer.title}</h4>
                    {prayer.occasion ? (
                      <p className="text-sm text-muted-foreground">{prayer.occasion}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">—</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
