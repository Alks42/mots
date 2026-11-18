'use strict';

/* ---------- Категории ---------- */
const POS = {
  noun: 'Существительные', verb: 'Глаголы', adj: 'Прилагательные', adv: 'Наречия',
  prep: 'Предлоги', conj: 'Союзы', pron: 'Местоимения', phrase: 'Выражения'
};
const POS_SHORT = {
  noun: 'сущ.', verb: 'глаг.', adj: 'прил.', adv: 'нареч.', prep: 'предлог',
  conj: 'союз', pron: 'местоим.', phrase: 'выраж.'
};
const TOPICS = {
  time: 'Время и даты', people: 'Люди и семья', city: 'Город и транспорт', food: 'Еда',
  home: 'Дом и быт', clothes: 'Одежда и цвета', body: 'Внешность и характер',
  leisure: 'Досуг', routine: 'Распорядок дня', nature: 'Природа и погода',
  docs: 'Деньги, техника, документы', general: 'Общее'
};

/* ---------- Хранилище (только на этом устройстве) ---------- */
const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem('mots.' + key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('mots.' + key, JSON.stringify(value)); } catch { /* приватный режим */ }
  }
};

const state = {
  off: new Set(store.get('off', [])),   // выключенные категории: 'pos:verb', 'topic:food', 'star'
  ruToFr: store.get('ruToFr', false),
  auto: store.get('auto', true),       // true — слова сменяются сами, false — свайп
  miss: store.get('miss', {}),         // id -> сколько раз ошибся
  score: { ok: 0, bad: 0 },
  recent: [],
  locked: false
};

/* ---------- Помощники ---------- */
const $ = id => document.getElementById(id);
const H_ASPIRE = /^(haricot|haut|hibou|honte|héros|hasard)/i;

function article(w) {
  if (w.pos !== 'noun') return '';
  if (w.pl) return 'les ';
  if (/^[aeiouyàâéèêëîïôûœh]/i.test(w.fr) && !H_ASPIRE.test(w.fr)) return 'l’';
  if (/^[A-Z]{2,}/.test(w.fr)) return w.g === 'f' ? 'la ' : 'le ';
  return w.g === 'f' ? 'la ' : 'le ';
}
// Неразрывные пробелы: короткие слова (в, к, с, le, la…) не остаются в конце строки,
// тире и скобки не отрываются от соседнего слова.
const NB = ' ';
function nobr(text) {
  return text
    .replace(/(^|[\s(])([A-Za-zА-Яа-яЁёàâçéèêëîïôûùœ’']{1,2}) /g, '$1$2' + NB)
    .replace(/ (—|–)/g, NB + '$1')
    .replace(/\(([^)]{1,16})\)/g, (m, inner) => '(' + inner.replace(/ /g, NB) + ')');  // короткая скобка — целиком на одной строке
}
const withArticle = w => article(w) + w.fr;
const indefinite = w => (w.g === 'f' ? 'une ' : 'un ') + w.fr;

function isEnabled(w) {
  if (state.off.has('pos:' + w.pos)) return false;
  if (state.off.has('topic:' + w.topic)) return false;
  if (w.star && state.off.has('star')) return false;
  return true;
}
const pool = () => WORDS.filter(isEnabled);

/* ---------- Колода: каждый круг — все включённые слова по одному разу ---------- */
// Для перевода и для рода — отдельные круги. Хранятся на телефоне.
const decks = {
  train: store.get('deck.train', { done: [], again: [], tick: 0 }),
  gender: store.get('deck.gender', { done: [], again: [], tick: 0 })
};
let mode = 'train';
const saveDeck = m => store.set('deck.' + m, decks[m]);

function drawCard(m, list) {
  const d = decks[m];
  d.tick++;
  const ids = new Set(list.map(w => w.id));
  const byId = id => WORDS[id];
  // 1) слово с ошибкой, которому пора вернуться (через 5–10 карточек)
  const i = d.again.findIndex(a => a.due <= d.tick && ids.has(a.id) && !state.recent.includes(a.id));
  if (i >= 0) {
    const w = byId(d.again.splice(i, 1)[0].id);
    saveDeck(m); remember(w.id);
    return w;
  }
  // 2) следующее слово круга, которого ещё не было
  const done = new Set(d.done);
  let rest = list.filter(w => !done.has(w.id));
  if (!rest.length) { d.done = []; rest = list.slice(); }      // круг пройден — новый круг
  const fresh = rest.filter(w => !state.recent.includes(w.id));
  const src = fresh.length ? fresh : rest;
  const w = src[Math.floor(Math.random() * src.length)];
  d.done.push(w.id);
  saveDeck(m); remember(w.id);
  return w;
}
function requeue(m, w) {
  const d = decks[m];
  if (!d.again.some(a => a.id === w.id)) d.again.push({ id: w.id, due: d.tick + 5 + Math.floor(Math.random() * 6) });
  saveDeck(m);
}
function roundProgress(m, list) {
  const ids = new Set(list.map(w => w.id));
  return { done: decks[m].done.filter(id => ids.has(id)).length, total: list.length };
}
function resetRounds() {
  for (const m of ['train', 'gender']) { decks[m] = { done: [], again: [], tick: 0 }; saveDeck(m); }
  state.recent = [];
}
function remember(id) {
  state.recent.push(id);
  if (state.recent.length > 8) state.recent.shift();
}
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const sizeClass = (text, s, xs) => text.length > xs ? 'xs' : text.length > s ? 's' : '';
const promptClass = (text) => text.length > 22 ? 'xlong' : text.length > 11 ? 'long' : '';

function updateScore() {
  const list = mode === 'gender' ? genderPool() : pool();
  const { done, total } = roundProgress(mode, list);
  const { ok, bad } = state.score;
  $('score').textContent = `${done} / ${total}` + (ok + bad ? `   ✓ ${ok}  ✗ ${bad}` : '');
}
function registerAnswer(w, right) {
  if (right) {
    state.score.ok++;
    if (state.miss[w.id]) state.miss[w.id] = Math.max(0, state.miss[w.id] - 1);
  } else {
    state.score.bad++;
    state.miss[w.id] = (state.miss[w.id] || 0) + 1;
    requeue(mode, w);
  }
  store.set('miss', state.miss);
  updateScore();
}

/* ---------- Похожие неправильные варианты ---------- */
// Сравниваем французские слова без артикля, скобок и акцентов
const bare = s => s.toLowerCase().replace(/\(.*?\)/g, '').replace(/^(se |s'|l')/, '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
function levenshtein(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]; row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}
// 0…1: насколько слова похожи по написанию/звучанию
function soundAlike(a, b) {
  if (!a || !b) return 0;
  let s = 1 - levenshtein(a, b) / Math.max(a.length, b.length);
  if (a.slice(0, 3) === b.slice(0, 3)) s += 0.25;       // одинаковое начало: chaise / chaîne
  if (a.slice(-3) === b.slice(-3)) s += 0.25;           // одинаковый конец: bateau / gâteau
  return Math.min(1, s);
}

// 5 неправильных вариантов: та же часть речи, и либо та же тема, либо созвучные слова.
// Для существительных — тот же род, чтобы артикль не подсказывал ответ.
function pickDistractors(w, label) {
  const wb = bare(w.fr);
  const scored = WORDS
    .filter(x => x.id !== w.id && x.pos === w.pos)
    .map(x => {
      const sound = soundAlike(wb, bare(x.fr));
      const topic = x.topic === w.topic ? 1 : 0;
      const gender = w.pos === 'noun' && x.g === w.g && !!x.pl === !!w.pl ? 1 : 0;
      return { x, sound, score: 3 * sound + 2 * topic + gender + Math.random() * 0.8 };
    });

  const seen = new Set([label(w).toLowerCase(), w.ru.toLowerCase()]);
  const out = [];
  const take = x => {
    const l = label(x).toLowerCase(), r = x.ru.toLowerCase();
    if (out.length >= 5 || seen.has(l) || seen.has(r)) return;
    seen.add(l); seen.add(r); out.push(x);
  };
  // 2 самых созвучных (если они правда похожи) + остальные по общему баллу
  scored.slice().sort((a, b) => b.sound - a.sound).filter(s => s.sound >= 0.45).slice(0, 2).forEach(s => take(s.x));
  scored.sort((a, b) => b.score - a.score).forEach(s => take(s.x));
  shuffle(WORDS.slice()).forEach(take);   // на всякий случай
  return out;
}

/* ---------- Следующее слово: само или свайпом ---------- */
let autoTimer = null;
function advance(kind) {
  clearTimeout(autoTimer);
  const area = document.querySelector('#screen-' + kind + ' .card-area');
  area.classList.remove('enter');
  area.classList.add('leave');
  setTimeout(() => {
    area.classList.remove('leave');
    kind === 'train' ? nextTranslation() : nextGender();
    void area.offsetWidth;            // перезапуск анимации
    area.classList.add('enter');
  }, 180);
}
function afterAnswer(kind, right) {
  if (state.auto) {
    autoTimer = setTimeout(() => advance(kind), right ? 400 : 1200);
  }
}
// Свайп влево по экрану тренировки — следующее слово (можно и пропустить слово, не отвечая)
['train', 'gender'].forEach(kind => {
  const el = $('screen-' + kind);
  let x0 = null, y0 = 0;
  el.addEventListener('pointerdown', e => { x0 = e.clientX; y0 = e.clientY; });
  el.addEventListener('pointerup', e => {
    if (x0 === null) return;
    const dx = e.clientX - x0, dy = e.clientY - y0;
    x0 = null;
    if (dx < -60 && Math.abs(dx) > Math.abs(dy) * 1.5) advance(kind);
  });
  el.addEventListener('pointercancel', () => { x0 = null; });
});
document.addEventListener('keydown', e => {
  if (e.key !== 'ArrowRight') return;
  if ($('screen-train').classList.contains('active')) advance('train');
  if ($('screen-gender').classList.contains('active')) advance('gender');
});

/* ---------- Тренировка: перевод ---------- */
function nextTranslation() {
  const list = pool();
  const opts = $('trainOptions');
  state.locked = false;
  $('trainSub').textContent = '';
  if (list.length < 6) {
    $('trainWord').className = 'prompt ru xlong';
    $('trainWord').textContent = 'Включи больше категорий в библиотеке';
    opts.innerHTML = '';
    return;
  }
  const w = drawCard('train', list);
  updateScore();
  const ruToFr = state.ruToFr;
  const label = x => ruToFr ? withArticle(x) : x.ru;

  const distractors = pickDistractors(w, label);
  const choices = shuffle([w, ...distractors]);

  const promptText = ruToFr ? w.ru : withArticle(w);
  const p = $('trainWord');
  p.textContent = nobr(promptText);
  p.className = 'prompt ' + (ruToFr ? 'ru ' : '') + promptClass(promptText);

  opts.innerHTML = '';
  for (const c of choices) {
    const b = document.createElement('button');
    const text = label(c);
    b.textContent = nobr(text);
    b.className = 'opt ' + (ruToFr ? 'fr ' : '') + sizeClass(text, ruToFr ? 14 : 12, ruToFr ? 24 : 22);
    b._word = c;
    b.onclick = () => answerTranslation(b, c, w);
    opts.appendChild(b);
  }
}

function answerTranslation(btn, chosen, w) {
  if (state.locked) return;
  state.locked = true;
  const right = chosen.id === w.id;
  registerAnswer(w, right);
  const buttons = [...$('trainOptions').children];
  buttons.forEach(b => { b.disabled = true; });
    const correctBtn = buttons.find(b => b._word.id === w.id);
  if (correctBtn) correctBtn.classList.add('ok');
  if (!right) {
    btn.classList.add('bad');
    if (state.auto) buttons.forEach(b => { if (b !== btn && b !== correctBtn) b.classList.add('dim'); });
    const sub = $('trainSub');
    sub.innerHTML = '';
    const span = document.createElement('span');
    span.className = 'answer' + (state.ruToFr ? '' : ' ru');
    span.textContent = nobr(state.ruToFr ? withArticle(w) : w.ru);
    sub.append(span);
  }
  // В режиме свайпа подписываем перевод под каждым вариантом
  if (!state.auto) {
    buttons.forEach(b => {
      const t = document.createElement('small');
      t.className = 'tr ' + (state.ruToFr ? 'ru' : 'fr');
      t.textContent = nobr(state.ruToFr ? b._word.ru : withArticle(b._word));
      b.append(t);
    });
  }
  afterAnswer('train', right);
}

/* ---------- Тренировка: род ---------- */
const genderPool = () => pool().filter(w => w.pos === 'noun' && !w.pl && (w.g === 'm' || w.g === 'f'));
let currentGender = null;

function nextGender() {
  const list = genderPool();
  state.locked = false;
  document.querySelectorAll('.gender-options .opt').forEach(b => { b.className = 'opt big'; b.disabled = false; });
  if (!list.length) {
    $('genderWord').className = 'prompt ru xlong';
    $('genderWord').textContent = 'Нет существительных — включи категории в библиотеке';
    $('genderSub').textContent = '';
    currentGender = null;
    return;
  }
  const w = drawCard('gender', list);
  updateScore();
  currentGender = w;
  $('genderWord').textContent = w.fr;
  $('genderWord').className = 'prompt ' + promptClass(w.fr);
  $('genderSub').textContent = nobr(w.ru);
}

function answerGender(btn) {
  const w = currentGender;
  if (state.locked || !w) return;
  state.locked = true;
  const right = btn.dataset.g === w.g;
  registerAnswer(w, right);
  document.querySelectorAll('.gender-options .opt').forEach(b => {
    b.disabled = true;
    if (b.dataset.g === w.g) b.classList.add('ok');
    else if (b === btn) b.classList.add('bad');
  });
  const sub = $('genderSub');
  sub.innerHTML = '';
  const span = document.createElement('span');
  span.className = 'answer';
  span.textContent = indefinite(w);
  sub.append(span, document.createTextNode(' — ' + w.ru));
  afterAnswer('gender', right);
}
document.querySelectorAll('.gender-options .opt').forEach(b => { b.onclick = () => answerGender(b); });

/* ---------- Библиотека ---------- */
function countBy(key, value) {
  return WORDS.filter(w => (key === 'star' ? w.star : w[key] === value)).length;
}

function renderFilters() {
  const box = $('filters');
  box.innerHTML = '';
  const group = (title, items) => {
    const g = document.createElement('div');
    g.className = 'fgroup';
    const h = document.createElement('h2');
    h.textContent = title;
    if (items.length > 1) {
      const all = document.createElement('button');
      const allOn = items.every(([k]) => !state.off.has(k));
      all.textContent = allOn ? 'выключить все' : 'включить все';
      all.onclick = () => {
        items.forEach(([k]) => allOn ? state.off.add(k) : state.off.delete(k));
        saveFilters();
      };
      h.append(all);
    }
    const chips = document.createElement('div');
    chips.className = 'chips';
    for (const [key, label, n, extra] of items) {
      const c = document.createElement('button');
      c.className = 'chip' + (state.off.has(key) ? ' off' : '') + (extra ? ' ' + extra : '');
      c.innerHTML = (extra === 'star' ? '<span class="s">★</span>' : '') + `<span></span><span class="n">${n}</span>`;
      c.children[extra === 'star' ? 1 : 0].textContent = label;
      c.setAttribute('aria-pressed', String(!state.off.has(key)));
      c.onclick = () => {
        state.off.has(key) ? state.off.delete(key) : state.off.add(key);
        saveFilters();
      };
      chips.append(c);
    }
    g.append(h, chips);
    box.append(g);
  };
  group('Особые', [['star', 'Частые слова', countBy('star'), 'star']]);
  group('Часть речи', Object.entries(POS).map(([k, l]) => ['pos:' + k, l, countBy('pos', k)]));
  group('Темы', Object.entries(TOPICS).map(([k, l]) => ['topic:' + k, l, countBy('topic', k)]));
}

function saveFilters() {
  store.set('off', [...state.off]);
  renderFilters();
  renderList();
}

let listLimit = 150;
function renderList() {
  const q = $('search').value.trim().toLowerCase();
  const active = pool().length;
  $('libCount').innerHTML = `В тренировке <b>${active}</b> из ${WORDS.length} слов`;
  const items = WORDS
    .filter(w => !q || w.fr.toLowerCase().includes(q) || w.ru.toLowerCase().includes(q))
    .sort((a, b) => a.fr.localeCompare(b.fr, 'fr'));
  const ul = $('wordList');
  ul.innerHTML = '';
  const frag = document.createDocumentFragment();
  for (const w of items.slice(0, listLimit)) {
    const li = document.createElement('li');
    if (!isEnabled(w)) li.className = 'off';
    const fr = document.createElement('span');
    fr.className = 'fr';
    const art = article(w);
    if (art) { const a = document.createElement('span'); a.className = 'art'; a.textContent = art; fr.append(a); }
    fr.append(w.fr);
    const tags = document.createElement('span');
    tags.className = 'tags';
    tags.textContent = POS_SHORT[w.pos] + (w.grp ? ` ${w.grp} гр.` : '') + ' · ' + TOPICS[w.topic] + ' ';
    if (w.star) { const s = document.createElement('span'); s.className = 'st'; s.textContent = '★'; tags.append(s); }
    const ru = document.createElement('span');
    ru.className = 'ru';
    ru.textContent = nobr(w.ru);
    li.append(fr, tags, ru);
    frag.append(li);
  }
  if (items.length > listLimit) {
    const more = document.createElement('li');
    const b = document.createElement('button');
    b.className = 'opt';
    b.style.width = '100%';
    b.textContent = `Показать ещё (${items.length - listLimit})`;
    b.onclick = () => { listLimit += 300; renderList(); };
    more.className = 'more';
    more.append(b);
    frag.append(more);
  }
  ul.append(frag);
}
$('search').addEventListener('input', () => { listLimit = 150; renderList(); });

/* ---------- Правила ---------- */
function markup(text) {
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return esc(text).replace(/\[(m|f|x|p)\|([^\]]+)\]/g, '<mark class="$1">$2</mark>');
}
function renderRules() {
  const box = $('rules');
  box.innerHTML = RULES.map(r => {
    const legend = r.legend
      ? `<div class="legend">${r.legend.map(([c, l]) => `<span><mark class="${c}">${l}</mark></span>`).join('')}</div>` : '';
    const body = r.pairs
      ? `<div class="pairs">${r.pairs.map(([m, f, ru]) => `<div class="pair"><span class="pm">${m}</span><span class="arrow">→</span><span class="pf">${markup(f)}</span><span class="pru">${ru}</span></div>`).join('')}</div>`
      : r.stanzas
      ? r.stanzas.map(s => `<div class="stanza"><div class="label">${s.label}</div>
          <div class="fr-line">${markup(s.fr)}</div><div class="ru-line">${s.ru}</div></div>`).join('')
      : r.verses.map(v => `<div class="stanza"><div class="verse">${v.map(markup).join('<br>')}</div></div>`).join('');
    return `<article class="rule"><h2>${r.title}</h2><p class="rule-sub">${markup(r.sub)}</p>${legend}${body}</article>`;
  }).join('');
}

/* ---------- Навигация ---------- */
const SCREENS = ['train', 'gender', 'library', 'rules'];
function show(name) {
  clearTimeout(autoTimer);
  if (!SCREENS.includes(name)) name = 'train';
  if (name === 'train' || name === 'gender') mode = name;
  SCREENS.forEach(s => $('screen-' + s).classList.toggle('active', s === name));
  document.querySelectorAll('.drawer a').forEach(a => a.classList.toggle('current', a.dataset.screen === name));
  document.body.classList.toggle('hide-toggle', name !== 'train');
  $('score').style.visibility = (name === 'train' || name === 'gender') ? 'visible' : 'hidden';
  closeMenu();
  if (name === 'train') nextTranslation();
  if (name === 'gender') nextGender();
  if (name === 'library') { renderFilters(); renderList(); }
  if (name === 'rules') renderRules();
}
function openMenu() { document.body.classList.add('menu-open'); $('drawer').setAttribute('aria-hidden', 'false'); }
function closeMenu() { document.body.classList.remove('menu-open'); $('drawer').setAttribute('aria-hidden', 'true'); }
$('menuBtn').onclick = openMenu;
$('closeBtn').onclick = closeMenu;
$('scrim').onclick = closeMenu;
window.addEventListener('hashchange', () => show(location.hash.slice(1)));

const toggle = $('dirToggle');
function syncToggle() { toggle.setAttribute('aria-checked', String(state.ruToFr)); }
toggle.onclick = () => {
  state.ruToFr = !state.ruToFr;
  store.set('ruToFr', state.ruToFr);
  syncToggle();
  nextTranslation();
};

syncToggle();
const autoToggle = $('autoToggle');
autoToggle.setAttribute('aria-checked', String(state.auto));
autoToggle.onclick = () => {
  state.auto = !state.auto;
  store.set('auto', state.auto);
  autoToggle.setAttribute('aria-checked', String(state.auto));
};
$('resetBtn').onclick = () => {
  resetRounds();
  closeMenu();
  if (mode === 'gender') nextGender(); else nextTranslation();
};
updateScore();
show(location.hash.slice(1));

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
