export interface Saint {
  id: string
  slug: string
  name: string
  title: string
  feastDay: string
  country: string
  continent: string
  coordinates: [number, number]
  birthYear?: number
  deathYear?: number
  canonizationYear?: number
  biography: string
  miracles: Miracle[]
  prayers: Prayer[]
  patronOf: string[]
  symbols: string[]
  image: string
}

export interface Miracle {
  id: string
  title: string
  description: string
  date?: string
  location?: string
  witnesses?: string[]
  verified: boolean
}

export interface Prayer {
  id: string
  title: string
  text: string
  occasion: string
}

export const saints: Saint[] = [
  {
    id: "1",
    slug: "san-francisco-de-asis",
    name: "San Francisco de Asís",
    title: "Fundador de la Orden Franciscana",
    feastDay: "4 de octubre",
    country: "Italia",
    continent: "Europa",
    coordinates: [43.0642, 12.6466],
    birthYear: 1181,
    deathYear: 1226,
    canonizationYear: 1228,
    biography:
      "Giovanni di Pietro di Bernardone, conocido como Francisco de Asís, nació en una familia adinerada de comerciantes. Su vida cambió radicalmente cuando escuchó la voz de Cristo desde un crucifijo en la iglesia de San Damián, pidiéndole que reparara su iglesia. Francisco interpretó esto literalmente al principio, pero luego comprendió que se refería a la renovación espiritual de la Iglesia. Renunció a su herencia familiar y abrazó una vida de pobreza extrema, predicando el Evangelio y cuidando de los leprosos. Fundó la Orden de los Hermanos Menores (Franciscanos) y, junto con Santa Clara, la Orden de las Hermanas Pobres (Clarisas). Recibió los estigmas de Cristo en el monte Alverna en 1224, siendo el primer santo en recibir estas marcas de la Pasión.",
    miracles: [
      {
        id: "1",
        title: "Los estigmas de Cristo",
        description:
          "En 1224, mientras oraba en el monte Alverna, Francisco recibió los estigmas - las cinco heridas de Cristo crucificado - en sus manos, pies y costado. Estas marcas permanecieron visibles hasta su muerte y fueron testimoniadas por numerosos hermanos franciscanos.",
        date: "14 de septiembre de 1224",
        location: "Monte Alverna, Italia",
        witnesses: ["Hermano León", "Hermano Ángel", "Hermano Rufino"],
        verified: true,
      },
      {
        id: "2",
        title: "La predicación a los pájaros",
        description:
          "Francisco predicó a una multitud de pájaros cerca de Bevagna. Los pájaros permanecieron inmóviles escuchando su sermón sobre la gratitud a Dios por sus dones, y solo se dispersaron cuando Francisco les dio su bendición.",
        location: "Bevagna, Italia",
        verified: true,
      },
      {
        id: "3",
        title: "El lobo de Gubbio",
        description:
          "Francisco domesticó a un lobo feroz que aterrorizaba la ciudad de Gubbio. Después de hablar con el animal, el lobo dejó de atacar a los habitantes y vivió pacíficamente en la ciudad hasta su muerte natural.",
        location: "Gubbio, Italia",
        verified: true,
      },
    ],
    prayers: [
      {
        id: "1",
        title: "Oración de San Francisco",
        text: "Señor, haz de mí un instrumento de tu paz. Donde haya odio, que yo lleve el amor. Donde haya ofensa, que yo lleve el perdón. Donde haya discordia, que yo lleve la unión. Donde haya duda, que yo lleve la fe. Donde haya error, que yo lleve la verdad. Donde haya desesperación, que yo lleve la esperanza. Donde haya tristeza, que yo lleve la alegría. Donde haya tinieblas, que yo lleve la luz. Oh Maestro, que yo no busque tanto ser consolado, sino consolar; ser comprendido, sino comprender; ser amado, sino amar. Porque es dando que se recibe; es perdonando que se es perdonado; es muriendo que se resucita a la vida eterna.",
        occasion: "Para la paz y la reconciliación",
      },
      {
        id: "2",
        title: "Cántico de las Criaturas",
        text: "Altísimo, omnipotente, buen Señor, tuyas son las alabanzas, la gloria y el honor y toda bendición. A ti solo, Altísimo, corresponden, y ningún hombre es digno de hacer de ti mención. Loado seas, mi Señor, con todas tus criaturas, especialmente el señor hermano sol, el cual es día y por el cual nos alumbras.",
        occasion: "Para alabar a Dios en la creación",
      },
    ],
    patronOf: ["Animales", "Ecología", "Italia", "Comerciantes", "Paz"],
    symbols: ["Lobo", "Pájaros", "Estigmas", "Cruz de San Damián", "Hábito franciscano"],
    image: "/san-francisco-de-as-s-con-h-bito-franciscano-y-est.jpg",
  },
  {
    id: "2",
    slug: "santa-teresa-de-calcuta",
    name: "Santa Teresa de Calcuta",
    title: "Madre de los Pobres",
    feastDay: "5 de septiembre",
    country: "India",
    continent: "Asia",
    coordinates: [22.5726, 88.3639],
    birthYear: 1910,
    deathYear: 1997,
    canonizationYear: 2016,
    biography:
      "Agnes Gonxha Bojaxhiu nació en Skopje, Macedonia del Norte, en una familia albanesa. A los 18 años se unió a las Hermanas de Loreto en Irlanda y fue enviada a India, donde enseñó en una escuela para niñas de familias acomodadas en Calcuta. En 1946, mientras viajaba en tren a Darjeeling, recibió lo que ella llamó 'la llamada dentro de la llamada' - una inspiración divina para servir a los más pobres entre los pobres. Dejó el convento y se fue a vivir a los barrios marginales de Calcuta, donde cuidó a los moribundos, huérfanos y enfermos. Fundó las Misioneras de la Caridad en 1950. Su trabajo se extendió por todo el mundo, estableciendo casas para moribundos, orfanatos, y centros para personas con VIH/SIDA. Recibió el Premio Nobel de la Paz en 1979.",
    miracles: [
      {
        id: "1",
        title: "Curación de Monica Besra",
        description:
          "Monica Besra, una mujer bengalí, fue curada de un tumor canceroso en el abdomen después de que se colocara una medalla milagrosa de la Madre Teresa sobre el tumor. La curación fue instantánea y completa, sin explicación médica.",
        date: "5 de septiembre de 1998",
        location: "Dangram, Bengala Occidental, India",
        witnesses: ["Médicos del hospital local", "Familia Besra"],
        verified: true,
      },
      {
        id: "2",
        title: "Curación de Marcilio Haddad Andrino",
        description:
          "Un ingeniero brasileño con múltiples tumores cerebrales fue curado después de que su esposa orara a la Madre Teresa y tocara su abdomen con una reliquia de la santa. Los tumores desaparecieron completamente.",
        date: "9 de diciembre de 2008",
        location: "Santos, Brasil",
        witnesses: ["Médicos del Hospital Beneficência Portuguesa", "Familia Andrino"],
        verified: true,
      },
    ],
    prayers: [
      {
        id: "1",
        title: "Oración de la Madre Teresa",
        text: "Señor, cuando tenga hambre, dame alguien que necesite comida; cuando tenga sed, dame alguien que precise agua; cuando sienta frío, dame alguien que necesite calor. Cuando sufra, dame alguien que necesite consuelo; cuando mi cruz parezca pesada, déjame compartir la cruz del otro; cuando me vea pobre, pon a mi lado algún necesitado. Cuando no tenga tiempo, dame alguien que precise de mis minutos; cuando sufra humillación, dame ocasión para elogiar a alguien; cuando esté desanimado, dame alguien para animar.",
        occasion: "Para el servicio a los necesitados",
      },
    ],
    patronOf: ["Pobres", "Misioneros", "Voluntarios", "Calcuta"],
    symbols: ["Sari blanco con borde azul", "Manos orando", "Corazón", "Paloma"],
    image: "/santa-teresa-de-calcuta-con-sari-blanco-y-azul-cui.jpg",
  },
  {
    id: "3",
    slug: "san-juan-pablo-ii",
    name: "San Juan Pablo II",
    title: "El Papa Peregrino",
    feastDay: "22 de octubre",
    country: "Polonia",
    continent: "Europa",
    coordinates: [50.0647, 19.945],
    birthYear: 1920,
    deathYear: 2005,
    canonizationYear: 2014,
    biography:
      "Karol Józef Wojtyła nació en Wadowice, Polonia. Durante la Segunda Guerra Mundial, trabajó en una cantera y en una fábrica química mientras estudiaba en secreto para el sacerdocio. Fue ordenado sacerdote en 1946 y se convirtió en obispo auxiliar de Cracovia en 1958. En 1978 fue elegido Papa, convirtiéndose en el primer Papa polaco y el más joven en 132 años. Su pontificado de 26 años fue uno de los más largos de la historia. Realizó 104 viajes apostólicos, visitó 129 países y fue fundamental en la caída del comunismo en Europa del Este. Sobrevivió a un intento de asesinato en 1981 y perdonó públicamente a su atacante. Beatificó a 1,340 personas y canonizó a 482 santos, más que todos sus predecesores juntos.",
    miracles: [
      {
        id: "1",
        title: "Curación de Marie Simon-Pierre",
        description:
          "La hermana Marie Simon-Pierre, una monja francesa que sufría de Parkinson, fue curada completamente después de orar a Juan Pablo II tras su muerte. La curación fue instantánea y permanente.",
        date: "2 de junio de 2005",
        location: "Aix-en-Provence, Francia",
        witnesses: ["Comunidad religiosa", "Médicos especialistas"],
        verified: true,
      },
      {
        id: "2",
        title: "Curación de Floribeth Mora Diaz",
        description:
          "Una mujer costarricense con un aneurisma cerebral inoperable fue curada después de orar a Juan Pablo II mientras veía su beatificación por televisión. Los médicos confirmaron la desaparición completa del aneurisma.",
        date: "1 de mayo de 2011",
        location: "Cartago, Costa Rica",
        witnesses: ["Hospital México", "Familia Mora"],
        verified: true,
      },
    ],
    prayers: [
      {
        id: "1",
        title: "Oración a San Juan Pablo II",
        text: "Oh San Juan Pablo II, desde la ventana del cielo, concédenos tu bendición. Bendice a la Iglesia que has amado, servido y guiado, animándola valientemente por los senderos del mundo hacia la verdad que libera. Bendice a los jóvenes, que fueron tu esperanza constante. Ayúdales a soñar de nuevo, ayúdales a mirar de nuevo hacia lo alto, ayúdales a creer de nuevo en el amor. Bendice a las familias, bendice a cada familia. Tú que fuiste hijo, ayuda a nuestros padres en su misión educativa, ayuda a nuestros hijos a crecer en edad, sabiduría y gracia, ayuda a redescubrir en la familia el santuario de la vida.",
        occasion: "Para la protección de la familia y los jóvenes",
      },
    ],
    patronOf: ["Jóvenes", "Familias", "Polonia", "Peregrinos", "Papas"],
    symbols: ["Báculo papal", "Mitra", "Rosario", "Montañas", "Libro"],
    image: "/san-juan-pablo-ii-papa-con-vestiduras-papales-y-b-.jpg",
  },
  {
    id: "4",
    slug: "san-martin-de-porres",
    name: "San Martín de Porres",
    title: "Santo de la Caridad",
    feastDay: "3 de noviembre",
    country: "Perú",
    continent: "América",
    coordinates: [-12.0464, -77.0428],
    birthYear: 1579,
    deathYear: 1639,
    canonizationYear: 1962,
    biography:
      "Martín de Porres nació en Lima, Perú, hijo de un español y una mujer afrodescendiente. A pesar de las barreras raciales de su época, se convirtió en hermano lego dominico y dedicó su vida al cuidado de los enfermos y pobres. Era conocido por sus poderes curativos milagrosos y su amor especial por los animales. Fundó un orfanato y un hospital, y se dice que podía estar en dos lugares al mismo tiempo (bilocación).",
    miracles: [
      {
        id: "1",
        title: "Bilocación milagrosa",
        description:
          "Numerosos testimonios afirman que San Martín podía aparecer simultáneamente en dos lugares diferentes, especialmente cuando había necesidad de ayudar a los enfermos.",
        verified: true,
      },
    ],
    prayers: [
      {
        id: "1",
        title: "Oración a San Martín de Porres",
        text: "San Martín de Porres, humilde hermano de la caridad, que dedicaste tu vida al servicio de los más necesitados, intercede por nosotros ante Dios. Ayúdanos a ver en cada persona, especialmente en los pobres y enfermos, el rostro de Cristo. Concédenos tu espíritu de servicio y tu amor por la justicia social.",
        occasion: "Para la caridad y justicia social",
      },
    ],
    patronOf: ["Justicia social", "Peluqueros", "Trabajadores de la salud", "Perú"],
    symbols: ["Escoba", "Cruz", "Animales", "Medicina"],
    image: "/san-martin-de-porres.jpg",
  },
  {
    id: "5",
    slug: "santa-juana-de-arco",
    name: "Santa Juana de Arco",
    title: "La Doncella de Orleans",
    feastDay: "30 de mayo",
    country: "Francia",
    continent: "Europa",
    coordinates: [48.8566, 2.3522],
    birthYear: 1412,
    deathYear: 1431,
    canonizationYear: 1920,
    biography:
      "Juana de Arco fue una campesina francesa que afirmó haber recibido visiones del arcángel Miguel, Santa Margarita y Santa Catalina, quienes le ordenaron coronar al Delfín Carlos VII y expulsar a los invasores ingleses de Francia. Convenció al rey para que le diera un ejército, con el cual levantó el sitio de Orleans en 1429. Fue capturada por los ingleses, juzgada por herejía y quemada en la hoguera a los 19 años. Fue rehabilitada póstumamente y se convirtió en símbolo de Francia.",
    miracles: [
      {
        id: "1",
        title: "Liberación de Orleans",
        description:
          "La victoria militar en Orleans fue considerada milagrosa, ya que cambió el curso de la Guerra de los Cien Años de manera inexplicable desde el punto de vista militar.",
        date: "8 de mayo de 1429",
        location: "Orleans, Francia",
        verified: true,
      },
    ],
    prayers: [
      {
        id: "1",
        title: "Oración a Santa Juana de Arco",
        text: "Santa Juana de Arco, valiente doncella que escuchaste la voz de Dios y seguiste su llamado con total entrega, intercede por nosotros. Concédenos el valor para defender la verdad y la justicia, y la fortaleza para perseverar en nuestra misión, aun en medio de las dificultades.",
        occasion: "Para el valor y la perseverancia",
      },
    ],
    patronOf: ["Francia", "Soldados", "Mártires", "Prisioneros"],
    symbols: ["Armadura", "Espada", "Estandarte", "Flor de lis"],
    image: "/santa-juana-de-arco.jpg",
  },
]
