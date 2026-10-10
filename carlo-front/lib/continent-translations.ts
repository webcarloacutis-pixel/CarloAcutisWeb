import type { LanguageCode } from './i18n'

export const continentCodes = ['europe', 'asia', 'africa', 'north-america', 'south-america', 'oceania', 'antarctica', 'america'] as const
export type ContinentCode = (typeof continentCodes)[number]
type Labels = readonly [string, string, string, string, string, string, string, string]

// Numeric UN region display names vary between browser and server Intl data.
// These fixed interface labels keep SSR and initial client text identical.
const labels: Record<LanguageCode, Labels> = {
  es: ['Europa', 'Asia', 'África', 'América del Norte', 'América del Sur', 'Oceanía', 'Antártida', 'América (Norte y Sur)'],
  en: ['Europe', 'Asia', 'Africa', 'North America', 'South America', 'Oceania', 'Antarctica', 'Americas (North and South)'],
  zh: ['欧洲', '亚洲', '非洲', '北美洲', '南美洲', '大洋洲', '南极洲', '美洲（北美洲和南美洲）'],
  hi: ['यूरोप', 'एशिया', 'अफ़्रीका', 'उत्तरी अमेरिका', 'दक्षिणी अमेरिका', 'ओशिनिया', 'अंटार्कटिका', 'अमेरिका (उत्तर और दक्षिण)'],
  ar: ['أوروبا', 'آسيا', 'أفريقيا', 'أمريكا الشمالية', 'أمريكا الجنوبية', 'أوقيانوسيا', 'القارة القطبية الجنوبية', 'الأمريكتان (الشمالية والجنوبية)'],
  pt: ['Europa', 'Ásia', 'África', 'América do Norte', 'América do Sul', 'Oceania', 'Antártida', 'Américas (Norte e Sul)'],
  ru: ['Европа', 'Азия', 'Африка', 'Северная Америка', 'Южная Америка', 'Океания', 'Антарктида', 'Америка (Северная и Южная)'],
  fr: ['Europe', 'Asie', 'Afrique', 'Amérique du Nord', 'Amérique du Sud', 'Océanie', 'Antarctique', 'Amériques (Nord et Sud)'],
  ja: ['ヨーロッパ', 'アジア', 'アフリカ', '北アメリカ', '南アメリカ', 'オセアニア', '南極大陸', 'アメリカ大陸（北米・南米）'],
  de: ['Europa', 'Asien', 'Afrika', 'Nordamerika', 'Südamerika', 'Ozeanien', 'Antarktika', 'Amerika (Nord und Süd)'],
  ko: ['유럽', '아시아', '아프리카', '북아메리카', '남아메리카', '오세아니아', '남극', '아메리카 (북미와 남미)'],
  it: ['Europa', 'Asia', 'Africa', 'America settentrionale', 'America meridionale', 'Oceania', 'Antartide', 'Americhe (Nord e Sud)'],
  tr: ['Avrupa', 'Asya', 'Afrika', 'Kuzey Amerika', 'Güney Amerika', 'Okyanusya', 'Antarktika', 'Amerika (Kuzey ve Güney)'],
  vi: ['Châu Âu', 'Châu Á', 'Châu Phi', 'Bắc Mỹ', 'Nam Mỹ', 'Châu Đại Dương', 'Châu Nam Cực', 'Châu Mỹ (Bắc và Nam)'],
  pl: ['Europa', 'Azja', 'Afryka', 'Ameryka Północna', 'Ameryka Południowa', 'Oceania', 'Antarktyda', 'Ameryki (Północna i Południowa)'],
}

export const continentTranslations = Object.fromEntries(Object.entries(labels).map(([language, values]) =>
  [language, Object.fromEntries(continentCodes.map((code, index) => [code, values[index]]))],
)) as Record<LanguageCode, Record<ContinentCode, string>>
