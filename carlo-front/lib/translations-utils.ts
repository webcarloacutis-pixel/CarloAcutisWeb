export function getTranslatedSaintData(saint: any, t: (_key: string) => string) {
  return {
    ...saint,
    patronOf: saint.patronOf?.map((patron: string) => {
      const key = patron
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[^a-zA-Z]/g, "")
      return t(`saints.patronOf.${key}`) || patron
    }),
    symbols: saint.symbols?.map((symbol: string) => {
      const key = symbol
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[^a-zA-Z]/g, "")
      return t(`saints.symbols.${key}`) || symbol
    }),
  }
}

// Utility function to get translated prayer data
export function getTranslatedPrayerData(prayer: any, t: (_key: string) => string) {
  return {
    ...prayer,
    category: t(`prayers.categories.${prayer.category.toLowerCase()}`) || prayer.category,
    occasion: t(`prayers.occasions.${prayer.occasion.toLowerCase().replace(/\s+/g, "")}`) || prayer.occasion,
  }
}

// Utility function to get translated miracle data
export function getTranslatedMiracleData(miracle: any, t: (_key: string) => string) {
  return {
    ...miracle,
    status: miracle.verified ? t("miracles.status.verified") : t("miracles.status.investigating"),
  }
}
