// Правила-стишки. Разметка: [m|…] мужской род, [f|…] женский, [x|…] исключение, [p|…] предлог.
const RULES = [
  {
    title: 'Le genre',
    sub: 'Род по окончанию слова',
    legend: [['m', 'мужской'], ['f', 'женский'], ['x', 'исключения']],
    stanzas: [
      {
        label: 'Мужской род',
        fr: 'Le from[m|age] du bur[m|eau] du gouverne[m|ment] a mangé le télé[m|scope], le télé[m|phone] et le social[m|isme].',
        ru: 'Сыр из кабинета правительства съел телескоп, телефон и социализм.'
      },
      {
        label: 'Женский род',
        fr: 'La na[f|tion] de la boulang[f|erie] a pris la ceint[f|ure], la liber[f|té] et la fourch[f|ette].',
        ru: 'Нация булочной взяла ремень, свободу и вилку.'
      },
      {
        label: 'Исключения',
        fr: 'À la pl[x|age], sur la p[x|age], l’im[x|age] de la c[x|age] dans l’[x|eau] et la p[x|eau].',
        ru: 'На пляже, на странице, картинка клетки в воде, и кожа.'
      }
    ]
  },
  {
    title: 'Les prépositions',
    sub: 'Какой предлог когда',
    verses: [
      ['Чей? Чего? Откуда? — [p|de],', 'Книга [p|de] Marie — её!'],
      ['Где? Куда? Кому? — то [p|à],', 'Едем [p|à] Paris — ура!'],
      ['Что внутри чего? — то [p|dans],', '[p|Dans] le sac лежит роман!'],
      ['Страны, месяц, транспорт — [p|en],', 'Там [p|en] France, [p|en] mai — туман!'],
      ['Для кого? Зачем? — то [p|pour],', 'Thé [p|pour] toi — bonjour!'],
      ['У кого? К кому? — то [p|chez],', '[p|Chez] maman — тепло душе!'],
      ['À и le сольются в [p|au],', '[p|Au] ciné иду в кино!'],
      ['De и le сольются в [p|du],', 'Книгу [p|du] papa люблю!']
    ]
  },
  {
    title: 'B.A.G.S.',
    sub: 'Прилагательные, которые стоят перед существительным',
    stanzas: [
      { label: 'B — Beauté (красота)', fr: 'beau, joli → un [p|joli] visage', ru: 'красивое лицо' },
      { label: 'A — Age (возраст)', fr: 'jeune, vieux, nouveau → une [p|nouvelle] robe', ru: 'новое платье' },
      { label: 'G — Goodness (хорошо / плохо)', fr: 'bon, mauvais → un [p|bon] film', ru: 'хороший фильм' },
      { label: 'S — Size (размер)', fr: 'grand, petit, gros, haut, long → un [p|petit] sac', ru: 'маленькая сумка' },
      { label: '+ ещё', fr: 'autre, premier, deuxième… → un [p|autre] jour, le [p|premier] jour', ru: 'другой день, первый день (порядковые числительные)' }
    ]
  }
];
