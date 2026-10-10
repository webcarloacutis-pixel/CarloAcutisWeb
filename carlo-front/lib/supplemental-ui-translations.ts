/** Interface labels only; authentic catalogue fields retain their documented wording. */
import { supplementalLanguages, supplementalRows } from "./supplemental-ui-rows"
import { supplementalMapRows } from "./supplemental-map-translations"
import { supplementalAdminHints } from "./supplemental-admin-hints"
import { supplementalAffinityRows } from "./supplemental-affinity-translations"
import { supplementalAffinityUi } from "./supplemental-affinity-ui"
import { supplementalPreservedRows } from "./supplemental-preserved-translations"
import { supplementalFieldTranslations } from "./supplemental-field-translations"
import { supplementalPrayerTranslations } from "./supplemental-prayer-translations"
const rows = { ...supplementalRows, ...supplementalMapRows, ...supplementalAdminHints, ...supplementalAffinityRows, ...supplementalAffinityUi, ...supplementalPreservedRows }
export const supplementalUiTranslations: Record<string, Record<string, string>> = Object.fromEntries(
  supplementalLanguages.map((language, index) => [language, {
    ...Object.fromEntries(Object.entries(rows).map(([key, values]) => ["supplemental." + key, values[index]])),
    ...supplementalFieldTranslations[language],
    ...supplementalPrayerTranslations[language],
  }]),
)
