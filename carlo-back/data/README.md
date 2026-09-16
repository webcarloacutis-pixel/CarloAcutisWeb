# Correcciones verificadas de nacimiento

El comando interno `maintenance:birthplaces` aplica como máximo tres correcciones documentadas a santos que ya existen. No crea santos ni carga el dataset de pruebas. La aplicación no lo ejecuta durante el arranque, la migración ni el despliegue.

## Datos y fuentes

`verified-birthplaces.json` contiene Francisco de Asís, Clara de Asís y Teresa de Jesús. Conserva URLs del Vaticano para identidad y fallecimiento y de UNESCO para la referencia urbana de Asís o Ávila. Las coordenadas identifican la ciudad; `birthPrecision: city` no indica una casa exacta. Los otros santos permanecen sin una ubicación inventada.

Los identificadores `test-san-francisco`, `test-santa-clara` y `test-santa-teresa` son claves del artefacto de fuentes original. Se vinculan explícitamente a registros existentes mediante `sourceSlug`, `targetSlug` y `expectedName`; no son una orden de insertar registros de prueba.

## Preparación y simulación

Ejecutar desde `carlo-back` con Node 24 y las dependencias completas instaladas. `DATABASE_URL` debe estar configurada en el entorno seguro del operador. No pegarla en informes o comandos compartidos.

1. Copiar `birthplace-mapping.example.json` a un archivo de operación y revisar sus tres correspondencias contra los registros de la base elegida. Los slugs y nombres de la plantilla son ejemplos, no una inspección de la base remota. Se permiten entre una y tres correspondencias.
2. Comprobar que el nombre real de la base coincida con `--expected-database`. El comando imprime solo host y nombre, sin contraseña.
3. Simular y revisar cada cambio propuesto. La simulación es el modo predeterminado.

```sh
npm run maintenance:birthplaces -- --mapping ./data/birthplace-mapping.reviewed.json --expected-database NOMBRE_REAL_DE_LA_BASE --dry-run
```

## Ejecución explícita futura

Después de revisar la simulación y contar con respaldo restaurable, ejecutar la misma correspondencia revisada. Estos comandos describen una operación futura: no se han ejecutado contra una base remota.

En una shell Linux, la habilitación queda limitada a ese proceso:

```sh
ALLOW_BIRTHPLACE_MAINTENANCE=true npm run maintenance:birthplaces -- --mapping ./data/birthplace-mapping.reviewed.json --expected-database NOMBRE_REAL_DE_LA_BASE --execute
```

En PowerShell:

```powershell
$env:ALLOW_BIRTHPLACE_MAINTENANCE = 'true'
try {
  npm run maintenance:birthplaces -- --mapping ./data/birthplace-mapping.reviewed.json --expected-database NOMBRE_REAL_DE_LA_BASE --execute
} finally {
  Remove-Item Env:ALLOW_BIRTHPLACE_MAINTENANCE -ErrorAction SilentlyContinue
}
```

Se necesitan tanto `--execute` como `ALLOW_BIRTHPLACE_MAINTENANCE=true`. El comando no cambia la base seleccionada por `DATABASE_URL`; `--expected-database` es una comprobación adicional de identidad.

## Protección de datos manuales

| Resultado | Significado |
|---|---|
| `planned` | Simulación: muestra exactamente los campos propuestos. |
| `updated` | Se rellenaron campos de nacimiento que estaban todos en null. |
| `preserved-existing-birth-data` | Ya existe al menos un campo de nacimiento; no se toca ninguno. |
| `name-mismatch` | El nombre del registro no coincide exactamente con la revisión. |
| `missing` | No existe el slug; no se crea un registro. |
| `changed-concurrently` | Alguien cambió el registro después de la lectura; la escritura condicional lo preservó. |

Un año de fallecimiento existente se conserva. Solo se rellena cuando está en null y el bloque de nacimiento también está vacío. Los campos legacy `country`, `continent`, `lat` y `lng` permanecen intactos. Los casos parciales o contradictorios requieren revisión editorial; no existe una opción para forzar su sobrescritura. Repetir la ejecución conserva la corrección ya aplicada.

## Validación realizada

Cinco pruebas pasan: dos de validación y tres con PostgreSQL real aislado. Cubren simulación sin cambios, aplicación a un registro vacío, preservación de año manual y nacimiento parcial, identidad, ausencia, repetición y una edición manual concurrente. Evidencia: `.audit/acutis-production/evidence/birth-maintenance-tests.json` y `birth-maintenance-types.json`.

Comando exacto de la simulación CLI realizada desde la raíz del clon, mediante el entorno local aislado del auditor:

```sh
python .audit/acutis-production/audit_exec.py birth-maintenance-dry-run carlo-back npm.cmd run maintenance:birthplaces -- --mapping ../.audit/acutis-production/local/birthplace-test-mapping.json --expected-database acutis_repair_test --dry-run
```

Resultado: tres registros de prueba ya corregidos, todos `preserved-existing-birth-data`, sin escrituras. El archivo de correspondencia local es evidencia ignorada por Git y no debe usarse como correspondencia de producción.