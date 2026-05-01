export interface ScriptureVerse {
  id: string
  text: string
  reference: string
  book: string
  chapter: number
  verse: string
  emotions: string[]
  keywords: string[]
  reflection?: string
  prayer?: string
  category: string
}

export const scriptureData: ScriptureVerse[] = [
  {
    id: "1",
    text: "No temas, porque yo estoy contigo; no desmayes, porque yo soy tu Dios que te esfuerzo; siempre te ayudaré, siempre te sustentaré con la diestra de mi justicia.",
    reference: "Isaías 41:10",
    book: "Isaías",
    chapter: 41,
    verse: "10",
    emotions: ["miedo", "ansiedad", "fortaleza", "confianza"],
    keywords: ["temor", "ayuda", "sostén", "justicia", "Dios"],
    reflection:
      "Este versículo nos recuerda que Dios está siempre presente en nuestros momentos de temor. Su promesa de fortalecernos y sostenernos es inquebrantable.",
    prayer:
      "Señor, ayúdame a recordar que Tú estás conmigo en todo momento. Dame la fortaleza para enfrentar mis miedos con fe.",
    category: "Miedo y Ansiedad",
  },
  {
    id: "2",
    text: "Venid a mí todos los que estáis trabajados y cargados, y yo os haré descansar.",
    reference: "Mateo 11:28",
    book: "Mateo",
    chapter: 11,
    verse: "28",
    emotions: ["cansancio", "estrés", "paz", "descanso"],
    keywords: ["descanso", "carga", "trabajo", "alivio"],
    reflection:
      "Jesús nos invita a llevar nuestras cargas a Él. No tenemos que enfrentar solos el peso de nuestras preocupaciones y responsabilidades.",
    prayer: "Jesús, vengo a Ti con todas mis cargas. Dame el descanso que mi alma necesita.",
    category: "Paz y Tranquilidad",
  },
  {
    id: "3",
    text: "La paz os dejo, mi paz os doy; yo no os la doy como el mundo la da. No se turbe vuestro corazón, ni tenga miedo.",
    reference: "Juan 14:27",
    book: "Juan",
    chapter: 14,
    verse: "27",
    emotions: ["paz", "tranquilidad", "miedo", "ansiedad"],
    keywords: ["paz", "corazón", "temor", "mundo"],
    reflection:
      "La paz que Cristo ofrece es diferente a cualquier paz temporal. Es una paz profunda que trasciende las circunstancias externas.",
    prayer: "Príncipe de Paz, llena mi corazón con Tu paz que sobrepasa todo entendimiento.",
    category: "Paz y Tranquilidad",
  },
  {
    id: "4",
    text: "Todo lo puedo en Cristo que me fortalece.",
    reference: "Filipenses 4:13",
    book: "Filipenses",
    chapter: 4,
    verse: "13",
    emotions: ["fortaleza", "valor", "confianza", "perseverancia"],
    keywords: ["poder", "fortaleza", "Cristo", "capacidad"],
    reflection:
      "Nuestra fortaleza no viene de nosotros mismos, sino de Cristo que vive en nosotros. Con Él, podemos enfrentar cualquier desafío.",
    prayer: "Cristo Jesús, recuérdame que mi fortaleza viene de Ti. Ayúdame a confiar en Tu poder en mí.",
    category: "Fortaleza y Valor",
  },
  {
    id: "5",
    text: "Jehová es mi pastor; nada me faltará. En lugares de delicados pastos me hará descansar; junto a aguas de reposo me pastoreará.",
    reference: "Salmo 23:1-2",
    book: "Salmos",
    chapter: 23,
    verse: "1-2",
    emotions: ["paz", "confianza", "seguridad", "provisión"],
    keywords: ["pastor", "descanso", "provisión", "cuidado"],
    reflection:
      "Dios es nuestro pastor amoroso que cuida de cada una de nuestras necesidades. Podemos descansar en Su cuidado constante.",
    prayer: "Buen Pastor, gracias por cuidar de mí. Ayúdame a descansar en Tu provisión y cuidado.",
    category: "Fe y Confianza",
  },
  {
    id: "6",
    text: "Por nada estéis afanosos, sino sean conocidas vuestras peticiones delante de Dios en toda oración y ruego, con acción de gracias.",
    reference: "Filipenses 4:6",
    book: "Filipenses",
    chapter: 4,
    verse: "6",
    emotions: ["ansiedad", "preocupación", "paz", "gratitud"],
    keywords: ["afán", "oración", "peticiones", "gratitud"],
    reflection:
      "En lugar de preocuparnos, Dios nos invita a orar. La oración con gratitud transforma nuestra ansiedad en paz.",
    prayer: "Padre celestial, ayúdame a llevar todas mis preocupaciones a Ti en oración, con un corazón agradecido.",
    category: "Miedo y Ansiedad",
  },
  {
    id: "7",
    text: "Bienaventurados los que lloran, porque ellos recibirán consolación.",
    reference: "Mateo 5:4",
    book: "Mateo",
    chapter: 5,
    verse: "4",
    emotions: ["tristeza", "dolor", "duelo", "consolación"],
    keywords: ["llanto", "consolación", "bienaventurados", "consuelo"],
    reflection:
      "Jesús reconoce nuestro dolor y promete consolación. Nuestras lágrimas no pasan desapercibidas ante Dios.",
    prayer: "Consolador divino, abraza mi dolor y llena mi corazón con Tu consuelo.",
    category: "Tristeza y Dolor",
  },
  {
    id: "8",
    text: "Porque yo sé los pensamientos que tengo acerca de vosotros, dice Jehová, pensamientos de paz, y no de mal, para daros el fin que esperáis.",
    reference: "Jeremías 29:11",
    book: "Jeremías",
    chapter: 29,
    verse: "11",
    emotions: ["esperanza", "futuro", "confianza", "paz"],
    keywords: ["pensamientos", "paz", "esperanza", "futuro", "planes"],
    reflection:
      "Dios tiene planes buenos para nosotros, planes de esperanza y futuro. Podemos confiar en Su perfecta voluntad para nuestras vidas.",
    prayer: "Señor, ayúdame a confiar en Tus planes para mi vida, sabiendo que son para mi bien.",
    category: "Esperanza y Alegría",
  },
  {
    id: "9",
    text: "El Señor tu Dios está en medio de ti como guerrero victorioso. Se deleitará en ti con gozo, te renovará con su amor, se alegrará por ti con cantos.",
    reference: "Sofonías 3:17",
    book: "Sofonías",
    chapter: 3,
    verse: "17",
    emotions: ["amor", "alegría", "renovación", "celebración"],
    keywords: ["guerrero", "gozo", "amor", "cantos", "renovación"],
    reflection:
      "Dios no solo nos ama, sino que se deleita en nosotros. Su amor tiene el poder de renovarnos completamente.",
    prayer: "Padre amoroso, gracias por deleitarte en mí. Renuévame con Tu amor cada día.",
    category: "Esperanza y Alegría",
  },
  {
    id: "10",
    text: "Esfuérzate y sé valiente; no temas ni desmayes, porque Jehová tu Dios estará contigo en dondequiera que vayas.",
    reference: "Josué 1:9",
    book: "Josué",
    chapter: 1,
    verse: "9",
    emotions: ["valor", "fortaleza", "miedo", "confianza"],
    keywords: ["esfuerzo", "valentía", "presencia", "acompañamiento"],
    reflection:
      "Dios nos llama a ser valientes porque Él está con nosotros. Su presencia constante es la fuente de nuestro valor.",
    prayer: "Dios todopoderoso, dame valor para enfrentar cada día sabiendo que Tú estás conmigo.",
    category: "Fortaleza y Valor",
  },
  {
    id: "11",
    text: "Cercano está Jehová a los quebrantados de corazón; y salva a los contritos de espíritu.",
    reference: "Salmo 34:18",
    book: "Salmos",
    chapter: 34,
    verse: "18",
    emotions: ["tristeza", "dolor", "quebrantamiento", "salvación"],
    keywords: ["cercano", "quebrantados", "corazón", "contritos", "salvación"],
    reflection:
      "En nuestros momentos más oscuros, Dios está más cerca que nunca. Él se acerca especialmente a los que sufren.",
    prayer: "Señor, en mi dolor, recuérdame que Tú estás cerca y que me salvarás.",
    category: "Tristeza y Dolor",
  },
  {
    id: "12",
    text: "Mas el fruto del Espíritu es amor, gozo, paz, paciencia, benignidad, bondad, fe, mansedumbre, templanza.",
    reference: "Gálatas 5:22-23",
    book: "Gálatas",
    chapter: 5,
    verse: "22-23",
    emotions: ["amor", "gozo", "paz", "paciencia"],
    keywords: ["fruto", "Espíritu", "virtudes", "carácter"],
    reflection:
      "El Espíritu Santo produce en nosotros cualidades divinas que transforman nuestro carácter y nuestras relaciones.",
    prayer: "Espíritu Santo, produce en mí Tu fruto para que pueda reflejar el carácter de Cristo.",
    category: "Fe y Confianza",
  },
]
