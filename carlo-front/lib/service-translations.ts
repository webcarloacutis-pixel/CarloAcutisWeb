const keys = ["content.originalSpanish", "content.translate", "content.translationUnavailable", "content.unavailable", "content.retryHint", "content.retry", "content.reference", "chat.configuration", "chat.providerAuth", "chat.modelUnavailable"]
const rows: Record<string, string[]> = {
  es: ["Original en español", "Traducir esta biografía", "Traducción no disponible; se conserva el original.", "No se pudo cargar el contenido", "Inténtalo de nuevo en unos momentos.", "Volver a intentar", "Referencia", "La IA no tiene una clave configurada.", "El proveedor rechazó la credencial de IA del servicio.", "El modelo de IA configurado no está disponible."],
  en: ["Spanish original", "Translate this biography", "Translation unavailable; the original is preserved.", "Content could not be loaded", "Please try again in a moment.", "Try again", "Reference", "No AI key is configured.", "The provider rejected the service's AI credential.", "The configured AI model is unavailable."],
  fr: ["Original en espagnol", "Traduire cette biographie", "Traduction indisponible ; l’original est conservé.", "Impossible de charger le contenu", "Réessayez dans un instant.", "Réessayer", "Référence", "Aucune clé IA n’est configurée.", "Le fournisseur a refusé la clé IA du service.", "Le modèle IA configuré est indisponible."],
  pt: ["Original em espanhol", "Traduzir esta biografia", "Tradução indisponível; o original foi preservado.", "Não foi possível carregar o conteúdo", "Tente novamente em instantes.", "Tentar novamente", "Referência", "Nenhuma chave de IA foi configurada.", "O fornecedor rejeitou a credencial de IA do serviço.", "O modelo de IA configurado está indisponível."],
  it: ["Originale in spagnolo", "Traduci questa biografia", "Traduzione non disponibile; l’originale è conservato.", "Impossibile caricare il contenuto", "Riprova tra qualche istante.", "Riprova", "Riferimento", "Nessuna chiave IA configurata.", "Il fornitore ha rifiutato la credenziale IA del servizio.", "Il modello IA configurato non è disponibile."],
  de: ["Spanisches Original", "Diese Biografie übersetzen", "Übersetzung nicht verfügbar; das Original bleibt erhalten.", "Inhalt konnte nicht geladen werden", "Bitte versuche es gleich erneut.", "Erneut versuchen", "Referenz", "Es ist kein KI-Schlüssel eingerichtet.", "Der Anbieter hat den KI-Zugang des Dienstes abgelehnt.", "Das konfigurierte KI-Modell ist nicht verfügbar."],
  zh: ["西班牙语原文", "翻译此传记", "翻译不可用，保留原文。", "无法加载内容", "请稍后重试。", "重试", "参考编号", "尚未配置人工智能密钥。", "提供商拒绝了服务的人工智能凭据。", "配置的人工智能模型不可用。"],
  hi: ["स्पेनिश मूल पाठ", "इस जीवनी का अनुवाद करें", "अनुवाद उपलब्ध नहीं है; मूल पाठ सुरक्षित है।", "सामग्री लोड नहीं हो सकी", "कृपया कुछ देर बाद फिर कोशिश करें।", "फिर कोशिश करें", "संदर्भ", "एआई कुंजी कॉन्फ़िगर नहीं की गई है।", "प्रदाता ने सेवा के एआई क्रेडेंशियल को अस्वीकार कर दिया।", "कॉन्फ़िगर किया गया एआई मॉडल उपलब्ध नहीं है।"],
  ar: ["النص الأصلي بالإسبانية", "ترجمة هذه السيرة", "الترجمة غير متاحة؛ تم الاحتفاظ بالأصل.", "تعذر تحميل المحتوى", "يرجى المحاولة بعد قليل.", "إعادة المحاولة", "المرجع", "لم يتم إعداد مفتاح الذكاء الاصطناعي.", "رفض المزوّد بيانات اعتماد الذكاء الاصطناعي للخدمة.", "نموذج الذكاء الاصطناعي المُعدّ غير متاح."],
  ru: ["Оригинал на испанском", "Перевести биографию", "Перевод недоступен; оригинал сохранён.", "Не удалось загрузить содержимое", "Повторите попытку чуть позже.", "Повторить", "Код обращения", "Ключ ИИ не настроен.", "Провайдер отклонил учётные данные ИИ сервиса.", "Настроенная модель ИИ недоступна."],
  ja: ["スペイン語の原文", "この伝記を翻訳", "翻訳できません。原文を表示しています。", "コンテンツを読み込めませんでした", "しばらくしてから再試行してください。", "再試行", "参照番号", "AIキーが設定されていません。", "プロバイダーがサービスのAI認証情報を拒否しました。", "設定されたAIモデルは利用できません。"],
  ko: ["스페인어 원문", "이 전기 번역", "번역을 사용할 수 없어 원문을 유지합니다.", "콘텐츠를 불러올 수 없습니다", "잠시 후 다시 시도해 주세요.", "다시 시도", "참조 번호", "AI 키가 설정되지 않았습니다.", "공급자가 서비스의 AI 인증 정보를 거부했습니다.", "설정된 AI 모델을 사용할 수 없습니다."],
  tr: ["İspanyolca özgün metin", "Bu biyografiyi çevir", "Çeviri kullanılamıyor; özgün metin korunuyor.", "İçerik yüklenemedi", "Lütfen biraz sonra tekrar deneyin.", "Tekrar dene", "Referans", "Yapay zekâ anahtarı yapılandırılmamış.", "Sağlayıcı hizmetin yapay zekâ kimlik bilgisini reddetti.", "Yapılandırılmış yapay zekâ modeli kullanılamıyor."],
  vi: ["Bản gốc tiếng Tây Ban Nha", "Dịch tiểu sử này", "Không thể dịch; bản gốc được giữ nguyên.", "Không thể tải nội dung", "Vui lòng thử lại sau giây lát.", "Thử lại", "Mã tham chiếu", "Chưa cấu hình khóa AI.", "Nhà cung cấp từ chối thông tin xác thực AI của dịch vụ.", "Mô hình AI đã cấu hình không khả dụng."],
  pl: ["Oryginał po hiszpańsku", "Przetłumacz tę biografię", "Tłumaczenie niedostępne; zachowano oryginał.", "Nie udało się wczytać treści", "Spróbuj ponownie za chwilę.", "Spróbuj ponownie", "Numer odniesienia", "Nie skonfigurowano klucza AI.", "Dostawca odrzucił dane uwierzytelniające AI usługi.", "Skonfigurowany model AI jest niedostępny."],
}
export const serviceTranslations: Record<string, Record<string, string>> = Object.fromEntries(
  Object.entries(rows).map(([language, values]) => [language, Object.fromEntries(keys.map((key, index) => [key, values[index]]))]),
)

const prayerTranslationNotes: Record<string,string> = {
  "es": "Traducción propia del texto histórico; no es una traducción litúrgica oficial.",
  "en": "Our translation of the historical text; not an official liturgical translation.",
  "zh": "本网站对历史文本的译文，并非官方礼仪译文。",
  "fr": "Notre traduction du texte historique ; ce n’est pas une traduction liturgique officielle.",
  "pt": "Tradução própria do texto histórico; não é uma tradução litúrgica oficial.",
  "it": "Traduzione propria del testo storico; non è una traduzione liturgica ufficiale.",
  "de": "Eigene Übersetzung des historischen Textes; keine offizielle liturgische Übersetzung.",
  "hi": "ऐतिहासिक पाठ का हमारा अनुवाद; यह आधिकारिक धर्मविधिक अनुवाद नहीं है।",
  "ar": "ترجمتنا للنص التاريخي؛ ليست ترجمة طقسية رسمية.",
  "ru": "Наш перевод исторического текста; не официальный литургический перевод.",
  "ja": "歴史的本文の当サイトによる翻訳であり、公式の典礼翻訳ではありません。",
  "ko": "역사적 본문의 자체 번역이며 공식 전례 번역이 아닙니다.",
  "tr": "Tarihî metnin kendi çevirimizdir; resmî bir litürjik çeviri değildir.",
  "vi": "Bản dịch của chúng tôi từ văn bản lịch sử; không phải bản dịch phụng vụ chính thức.",
  "pl": "Nasz przekład tekstu historycznego; nie jest oficjalnym tłumaczeniem liturgicznym."
}
for(const [language,note] of Object.entries(prayerTranslationNotes)) serviceTranslations[language]["content.unofficialPrayerTranslation"]=note

const partialTranslationNotes: Record<string,string> = {
  "es": "Algunos textos siguen en español.",
  "en": "Some text remains in Spanish.",
  "zh": "部分内容仍为西班牙语。",
  "fr": "Certains textes restent en espagnol.",
  "pt": "Alguns textos continuam em espanhol.",
  "it": "Alcuni testi rimangono in spagnolo.",
  "de": "Einige Texte bleiben auf Spanisch.",
  "hi": "कुछ पाठ अभी स्पेनिश में हैं।",
  "ar": "بعض النصوص ما زالت بالإسبانية.",
  "ru": "Часть текста остаётся на испанском.",
  "ja": "一部の本文はまだスペイン語です。",
  "ko": "일부 내용은 아직 스페인어입니다.",
  "tr": "Bazı metinler hâlâ İspanyolcadır.",
  "vi": "Một số nội dung vẫn bằng tiếng Tây Ban Nha.",
  "pl": "Niektóre teksty pozostają po hiszpańsku."
}
for(const [language,note] of Object.entries(partialTranslationNotes)) serviceTranslations[language]["content.partialTranslation"]=note
