import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { normalize, objectBody, strings, text } from "../lib/validation";
const router = Router();
router.post("/", async (req, res) => {
  const body = objectBody(req.body, ["about", "qualities", "growthAreas"]);
  const about = text(body.about, 2000) || "";
  const qualities = strings(body.qualities, 20, 100);
  const growthAreas = strings(body.growthAreas, 20, 100);
  const terms = Array.from(new Set([...qualities,...growthAreas,...about.split(/\s+/)].map(normalize).filter((value) => value.length >= 3))).slice(0,40);
  const fields = [{column:'"name"',weight:4},{column:'"title"',weight:3},{column:'"country"',weight:2},{column:'"biography"',weight:1}];
  const parts = terms.flatMap((term) => fields.map(({column,weight}) => Prisma.sql`CASE WHEN POSITION(${term} IN translate(lower(COALESCE(${Prisma.raw(column)},'')), 'áéíóúñü', 'aeiounu')) > 0 THEN ${weight} ELSE 0 END`));
  // Score the complete catalog in one parameterized query, returning only five matches.
  // Column names above are server constants, never client input.
  const matches = parts.length === 0 ? [] : await prisma.$queryRaw<Array<{id:string;slug:string;name:string;score:number}>>(Prisma.sql`
    SELECT "id","slug","name","score" FROM (
      SELECT "id","slug","name", (${Prisma.join(parts," + ")})::integer AS "score"
      FROM "Saint" WHERE "slug" NOT LIKE 'test-%'
    ) AS ranked WHERE "score" > 0 ORDER BY "score" DESC, "name" ASC LIMIT 5
  `);
  const summary = matches.length
    ? "Elegimos estos santos por afinidad textual con tus cualidades y áreas de crecimiento. Lee su historia y elige el que más resuene contigo hoy."
    : "No encontramos coincidencias claras. Intenta escribir más sobre ti o seleccionar algunas cualidades y áreas de crecimiento.";
  res.json({summary,matches});
});
export default router;
