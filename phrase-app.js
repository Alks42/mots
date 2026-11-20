'use strict';
/* ---------- Конструктор фраз: собери фразу из слов ---------- */

const PROPER = new Set(['Paris', 'Lyon', 'Marie', 'Anna']);
const BRAVO = ['Bravo !', 'Super !', 'Parfait !', 'Génial !', 'Très bien !'];
const phraseOff = new Set(store.get('phrOff', []));   // 'cat:present', 'lesson:3'
const phraseDeck = store.get('deck.phrase', { done: [], again: [], tick: 0 });
let currentPhrase = null;
let phraseLocked = false;

// Слова фразы без знаков препинания: «Hier, j’ai mangé une pizza.» → [hier, j’ai, mangé, une, pizza]
function tokens(sentence) {
  const parts = sentence.replace(/[.,!?]/g, ' ').split(/\s+/).filter(Boolean);
  return parts.map((t, i) => (i === 0 && !PROPER.has(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t));
}
const norm = arr => arr.join(' ').toLowerCase();
const phraseEnabled = p => !phraseOff.has('cat:' + p.cat) && !phraseOff.has('lesson:' + p.lesson);
const phrasePool = () => PHRASES.filter(phraseEnabled);

function phraseProgress() {
  const list = phrasePool();
  const ids = new Set(list.map(p => p.id));
  return { done: phraseDeck.done.filter(id => ids.has(id)).length, total: list.length };
}
function savePhraseDeck() { store.set('deck.phrase', phraseDeck); }
function resetPhraseDeck() {
  phraseDeck.done = []; phraseDeck.again = []; phraseDeck.tick = 0;
  savePhraseDeck();
}

function drawPhrase(list) {
  const d = phraseDeck;
  d.tick++;
  const ids = new Set(list.map(p => p.id));
  const i = d.again.findIndex(a => a.due <= d.tick && ids.has(a.id) && a.id !== (currentPhrase && currentPhrase.id));
  if (i >= 0) { const p = PHRASES[d.again.splice(i, 1)[0].id]; savePhraseDeck(); return p; }
  const done = new Set(d.done);
  let rest = list.filter(p => !done.has(p.id));
  if (!rest.length) { d.done = []; rest = list.slice(); }
  const fresh = rest.filter(p => p !== currentPhrase);
  const src = fresh.length ? fresh : rest;
  const p = src[Math.floor(Math.random() * src.length)];
  d.done.push(p.id);
  savePhraseDeck();
  return p;
}

/* Фразы: фильтры (в настройках) и список (в библиотеке) */
function savePhraseFilters() {
  store.set('phrOff', [...phraseOff]);
  renderPhraseFilters();
}
function renderPhraseFilters() {
  const box = $('phrFilters');
  box.innerHTML = '';
  const n = (k, v) => PHRASES.filter(p => p[k] === v).length;
  $('phrCount').innerHTML = `В тренировке <b>${phrasePool().length}</b> из ${PHRASES.length} фраз`;
  filterGroup(box, 'Уроки', Object.entries(PHRASE_LESSONS).map(([k, l]) => ['lesson:' + k, l, n('lesson', +k)]), phraseOff, savePhraseFilters);
  filterGroup(box, 'Грамматика', Object.entries(PHRASE_CATS).map(([k, l]) => ['cat:' + k, l, n('cat', k)]), phraseOff, savePhraseFilters);
}
function renderPhraseList() {
  const ul = $('phraseList');
  ul.innerHTML = '';
  for (const p of PHRASES.slice().sort((a, b) => a.lesson - b.lesson)) {
    const li = document.createElement('li');
    if (!phraseEnabled(p)) li.className = 'off';
    const fr = document.createElement('span'); fr.className = 'fr'; fr.textContent = nobr(p.fr);
    const tags = document.createElement('span'); tags.className = 'tags';
    tags.textContent = PHRASE_LESSONS[p.lesson] + ' · ' + PHRASE_CATS[p.cat];
    const ru = document.createElement('span'); ru.className = 'ru'; ru.textContent = nobr(p.ru);
    li.append(fr, tags, ru);
    ul.append(li);
  }
}

function makeTile(text, onTap) {
  const t = document.createElement('button');
  t.className = 'tile';
  t.textContent = text;
  t.onclick = () => onTap(t);
  return t;
}

function nextPhrase() {
  const list = phrasePool();
  phraseLocked = false;
  if (!list.length) {
    currentPhrase = null;
    $('phrAnswer').innerHTML = ''; $('phrBank').innerHTML = ''; $('phrResult').innerHTML = '';
    $('phrHint').textContent = 'Все фразы выключены — включи уроки или грамматику в библиотеке';
    $('phrHint').classList.add('show');
    updateScore();
    return;
  }
  currentPhrase = drawPhrase(list);
  updateScore();
  const p = currentPhrase;
  $('phrHint').textContent = p.ru;
  $('phrHint').classList.remove('show');
  $('phrResult').innerHTML = '';
  $('phrResult').className = 'phr-result';
  const answer = $('phrAnswer');
  const bank = $('phrBank');
  answer.innerHTML = '';
  answer.className = 'phr-answer';
  bank.innerHTML = '';
  let words = shuffle(tokens(p.fr));
  // не показываем слова сразу в правильном порядке
  for (let k = 0; k < 5 && norm(words) === norm(tokens(p.fr)) && words.length > 1; k++) words = shuffle(words);
  for (const w of words) bank.append(makeTile(w, moveTile));
}

function moveTile(t) {
  if (phraseLocked) return;
  const to = t.parentElement.id === 'phrBank' ? $('phrAnswer') : $('phrBank');
  t.classList.remove('land');
  to.append(t);
  void t.offsetWidth;
  t.classList.add('land');
  if (!$('phrBank').children.length) checkPhrase();
}

function checkPhrase() {
  const p = currentPhrase;
  const built = norm([...$('phrAnswer').children].map(t => t.textContent));
  const variants = [p.fr, ...(p.alt || [])];
  const match = variants.find(v => norm(tokens(v)) === built);
  phraseLocked = true;
  const res = $('phrResult');
  res.innerHTML = '';
  const tiles = [...$('phrAnswer').children];
  if (match) {
    state.score.ok++;
    tiles.forEach((t, i) => { t.style.animationDelay = (i * 45) + 'ms'; t.classList.add('ok'); });
    const big = document.createElement('div');
    big.className = 'bravo';
    big.textContent = BRAVO[Math.floor(Math.random() * BRAVO.length)];
    const fr = document.createElement('div');
    fr.className = 'phr-full';
    fr.textContent = nobr(match);
    res.append(big, fr);
    res.className = 'phr-result show ok';
  } else {
    state.score.bad++;
    const d = phraseDeck;
    if (!d.again.some(a => a.id === p.id)) d.again.push({ id: p.id, due: d.tick + 4 + Math.floor(Math.random() * 4) });
    savePhraseDeck();
    $('phrAnswer').classList.add('bad');
    tiles.forEach(t => t.classList.add('bad'));
    const fr = document.createElement('div');
    fr.className = 'phr-full';
    fr.textContent = nobr(p.fr);
    res.append(fr);
    res.className = 'phr-result show bad';
  }
  $('phrHint').classList.add('show');
  updateScore();
  afterAnswer('phrase', !!match);
}

$('phrHelp').onclick = () => { if (currentPhrase) $('phrHint').classList.toggle('show'); };
$('phrUndo').onclick = () => {
  if (phraseLocked) return;
  [...$('phrAnswer').children].forEach(t => $('phrBank').append(t));
};
