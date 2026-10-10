import type { LanguageCode } from './i18n'

export const prayerHelpKeys = ['search', 'categories', 'read', 'adapt', 'regular'] as const
type Help = readonly [string, string, string, string, string]
const rows: Record<LanguageCode, Help> = {
  es: ['Busca por santo, ocasión o necesidad', 'Explora las categorías temáticas', 'Lee con devoción y recogimiento', 'Adapta las oraciones a tu situación', 'Practica la oración regularmente'],
  en: ['Search by saint, occasion or need', 'Explore thematic categories', 'Read with devotion and recollection', 'Adapt the prayers to your situation', 'Pray regularly'],
  fr: ['Recherchez par saint, occasion ou besoin', 'Explorez les catégories thématiques', 'Lisez avec dévotion et recueillement', 'Adaptez les prières à votre situation', 'Priez régulièrement'],
  pt: ['Procure por santo, ocasião ou necessidade', 'Explore as categorias temáticas', 'Leia com devoção e recolhimento', 'Adapte as orações à sua situação', 'Pratique a oração regularmente'],
  it: ['Cerca per santo, occasione o necessità', 'Esplora le categorie tematiche', 'Leggi con devozione e raccoglimento', 'Adatta le preghiere alla tua situazione', 'Prega regolarmente'],
  de: ['Suche nach Heiligem, Anlass oder Anliegen', 'Erkunde die thematischen Kategorien', 'Lies mit Andacht und innerer Sammlung', 'Passe die Gebete an deine Situation an', 'Bete regelmäßig'],
  zh: ['按圣人、场合或需要搜索', '浏览主题分类', '怀着虔诚与静心阅读', '根据自己的处境调整祈祷', '坚持定期祈祷'],
  hi: ['संत, अवसर या आवश्यकता के अनुसार खोजें', 'विषयगत श्रेणियाँ देखें', 'भक्ति और एकाग्रता से पढ़ें', 'प्रार्थनाओं को अपनी परिस्थिति के अनुसार ढालें', 'नियमित रूप से प्रार्थना करें'],
  ar: ['ابحث حسب القديس أو المناسبة أو الحاجة', 'استكشف الفئات الموضوعية', 'اقرأ بخشوع وسكينة', 'كيّف الصلوات مع ظروفك', 'واظب على الصلاة'],
  ru: ['Ищите по святому, случаю или потребности', 'Изучайте тематические категории', 'Читайте с благоговением и сосредоточенностью', 'Приспосабливайте молитвы к своей ситуации', 'Молитесь регулярно'],
  ja: ['聖人、機会、必要に応じて検索する', 'テーマ別のカテゴリーを探す', '信心深く心を静めて読む', '自分の状況に合わせて祈りを調整する', '定期的に祈る'],
  ko: ['성인, 상황 또는 필요에 따라 검색하세요', '주제별 분류를 살펴보세요', '경건하고 차분한 마음으로 읽으세요', '자신의 상황에 맞게 기도문을 조정하세요', '규칙적으로 기도하세요'],
  tr: ['Aziz, durum veya ihtiyaca göre arayın', 'Tematik kategorileri keşfedin', 'İçtenlikle ve tefekkürle okuyun', 'Duaları kendi durumunuza uyarlayın', 'Düzenli dua edin'],
  vi: ['Tìm theo vị thánh, dịp hoặc nhu cầu', 'Khám phá các danh mục theo chủ đề', 'Đọc với lòng sốt sắng và tâm tình tĩnh lặng', 'Điều chỉnh lời cầu nguyện theo hoàn cảnh của bạn', 'Thường xuyên cầu nguyện'],
  pl: ['Szukaj według świętego, okazji lub potrzeby', 'Przeglądaj kategorie tematyczne', 'Czytaj z pobożnością i skupieniem', 'Dostosuj modlitwy do swojej sytuacji', 'Módl się regularnie'],
}

/** Existing library instructions only; authored prayer and devotional texts stay unchanged. */
export const prayerLibraryHelpTranslations: Record<LanguageCode, Record<string, string>> = Object.fromEntries(
  Object.entries(rows).map(([language, values]) => [language, Object.fromEntries(prayerHelpKeys.map((key, index) => ['prayerHelp.' + key, values[index]]))]),
) as Record<LanguageCode, Record<string, string>>
