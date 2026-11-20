// Converts words.txt (fr|ru|pos|topic|star|gender|group) into app/words.js
const fs = require('fs');
const [, , src, out] = process.argv;
const lines = fs.readFileSync(src, 'utf8').split(/\r?\n/);

// Nouns used only in plural: no un/une drill for them
const PLURAL = new Set(['pâtes', 'espèces', 'fruits de mer', 'crudités', 'félicitations', 'chaussures',
  'baskets', 'bottes', 'lunettes de soleil', 'gants', 'talons', 'sandales', 'sandales à talons',
  'chaussettes', 'écouteurs', 'jeunes', 'gens', 'yeux', 'cheveux', 'collants', 'charges', 'frais']);

// Урок Édito по странице тетради (тетрадь идёт по порядку курса)
const LESSON_BY_PAGE = [[4, 1], [8, 2], [16, 3], [21, 4], [28, 5], [36, 6], [44, 7]];
const lessonOf = page => LESSON_BY_PAGE.find(([last]) => page <= last)[1];

const map = new Map();
let lesson = 1;
for (const raw of lines) {
  const line = raw.trim();
  const page = line.match(/^#\s*p(\d+)/);
  if (page) { lesson = lessonOf(+page[1]); continue; }
  if (!line || line.startsWith('#')) continue;
  const [fr, ru, pos, topic, star, gender, group] = line.split('|').map(s => (s || '').trim());
  const key = fr.toLowerCase() + '|' + pos;
  const prev = map.get(key);
  if (!prev) {
    map.set(key, { fr, ru, pos, topic, lesson, star: star === '1', gender: gender || '', group: group || '' });
    continue;
  }
  prev.star = prev.star || star === '1';
  if (!prev.gender && gender) prev.gender = gender;
  if (!prev.group && group) prev.group = group;
  // merge translations without repeating parts
  const parts = prev.ru.split(/[,;]\s*/).map(s => s.trim());
  for (const p of ru.split(/[,;]\s*/).map(s => s.trim())) {
    if (p && !parts.some(x => x.toLowerCase() === p.toLowerCase())) prev.ru += ', ' + p;
  }
}

const words = [...map.values()].map((w, i) => {
  const o = { id: i, fr: w.fr, ru: w.ru, pos: w.pos, topic: w.topic, l: w.lesson };
  if (w.star) o.star = 1;
  if (w.pos === 'noun') {
    if (PLURAL.has(w.fr)) o.pl = 1;
    o.g = w.gender || 'mf';
  }
  if (w.group) o.grp = +w.group;
  return o;
});

fs.writeFileSync(out, '// Словарь из тетради (оцифровано с 44 фото)\nconst WORDS = ' +
  JSON.stringify(words).replace(/\},\{/g, '},\n{') + ';\n');
const count = k => words.filter(k).length;
console.log('total', words.length, 'star', count(w => w.star), 'nouns m/f', count(w => w.g === 'm' || w.g === 'f'));
