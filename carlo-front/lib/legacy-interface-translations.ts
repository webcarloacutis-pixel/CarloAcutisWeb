/** Existing reachable interface keys completed without language fallback. */
const keys=['brand.title','saints.filters.title','saints.filters.searchPlaceholder','saints.filters.clear'] as const
const rows:Record<string,string[]>={
  es:['Santos y Milagros','Filtrar Santos','Buscar por nombre...','Limpiar Filtros'],
  en:['Saints and Miracles','Filter Saints','Search by name...','Clear Filters'],
  fr:['Saints et Miracles','Filtrer les saints','Rechercher par nom...','Effacer les filtres'],
  pt:['Santos e Milagres','Filtrar Santos','Buscar por nome...','Limpar Filtros'],
  it:['Santi e Miracoli','Filtra i santi','Cerca per nome...','Cancella i filtri'],
  de:['Heilige und Wunder','Heilige filtern','Nach Namen suchen...','Filter löschen'],
  zh:['圣人与奇迹','筛选圣人','按姓名搜索...','清除筛选'],
  hi:['संत और चमत्कार','संतों को फ़िल्टर करें','नाम से खोजें...','फ़िल्टर साफ़ करें'],
  ar:['القديسون والمعجزات','تصفية القديسين','البحث بالاسم...','مسح عوامل التصفية'],
  ru:['Святые и чудеса','Фильтр святых','Поиск по имени...','Очистить фильтры'],
  ja:['聖人と奇跡','聖人を絞り込む','名前で検索...','絞り込みを解除'],
  ko:['성인과 기적','성인 필터','이름으로 검색...','필터 초기화'],
  tr:['Azizler ve Mucizeler','Azizleri Filtrele','İsme göre ara...','Filtreleri Temizle'],
  vi:['Các thánh và phép lạ','Lọc các thánh','Tìm theo tên...','Xóa bộ lọc'],
  pl:['Święci i cuda','Filtruj świętych','Szukaj według imienia...','Wyczyść filtry'],
}
export const legacyInterfaceTranslations:Record<string,Record<string,string>>=Object.fromEntries(
  Object.entries(rows).map(([language,labels])=>[language,Object.fromEntries(keys.map((key,index)=>[key,labels[index]]))]),
)

const descriptionRows:Record<string,[string,string]>={
  es:['Explora el catálogo de milagros','Colección de oraciones de santos para cada momento'],
  en:['Explore the miracles catalogue','Collection of prayers from saints for every moment'],
  fr:['Explorez le catalogue de miracles','Recueil de prières des saints pour chaque moment'],
  pt:['Explore o catálogo de milagres','Coleção de orações de santos para cada momento'],
  it:['Esplora il catalogo dei miracoli','Raccolta di preghiere dei santi per ogni momento'],
  de:['Erkunde den Katalog der Wunder','Sammlung von Gebeten der Heiligen für jeden Moment'],
  zh:['浏览奇迹目录','圣人为每个时刻的祈祷集合'],
  hi:['चमत्कारों की सूची देखें','हर क्षण के लिए संतों की प्रार्थनाओं का संग्रह'],
  ar:['استكشف دليل المعجزات','مجموعة من صلوات القديسين لكل لحظة'],
  ru:['Откройте каталог чудес','Собрание молитв святых для каждого мгновения'],
  ja:['奇跡の一覧を見る','あらゆる時に捧げる聖人たちの祈りの集成'],
  ko:['기적 목록을 살펴보세요','모든 순간을 위한 성인들의 기도 모음'],
  tr:['Mucizeler kataloğunu keşfedin','Her an için azizlerin dualarından derleme'],
  vi:['Khám phá danh mục phép lạ','Tuyển tập lời cầu nguyện của các thánh cho mọi lúc'],
  pl:['Poznaj katalog cudów','Zbiór modlitw świętych na każdą chwilę'],
}
for(const [language,[miracles,prayers]] of Object.entries(descriptionRows)) Object.assign(legacyInterfaceTranslations[language],{'featured.miracles.description':miracles,'featured.prayers.description':prayers})
