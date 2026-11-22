// Ember Pact — everything the player sees.
// One file, one job: turn state into DOM (table, hands, HUD, log, overlays).
// No game rules here; render.js only shows what state.js decided.

import { ELEMENTS, cardById, kindLabel, TUNE } from './config.js';

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function lifeBar(side, label) {
  const pct = Math.max(0, Math.round((side.life / side.maxLife) * 100));
  const low = side.life <= 10 ? ' low' : '';
  const shield = side.shield > 0 ? `<span class="shield-badge">🛡 ${side.shield}</span>` : '';
  return `<div class="life-wrap">
    <div class="life-label">${label}</div>
    <div class="life-bar${low}"><div class="life-fill" style="width:${pct}%"></div>
    <span class="life-text">${side.life} / ${side.maxLife}</span></div>${shield}</div>`;
}

function manaPips(side) {
  let pips = '';
  for (let i = 0; i < side.maxMana; i += 1) {
    pips += `<span class="ember${i < side.mana ? ' on' : ''}">●</span>`;
  }
  return `<div class="mana" title="Embers">${pips}<span class="mana-num">${side.mana}/${side.maxMana}</span></div>`;
}

function cardHtml(card, opts = {}) {
  const def = cardById(card.id);
  const e = ELEMENTS[def.element];
  const bonus = opts.bonus || 0;
  const power = def.power + bonus;
  const cls = ['card', `el-${def.element}`];
  if (opts.playable) cls.push('playable');
  if (opts.dim) cls.push('dim');
  if (opts.selected) cls.push('selected');
  if (opts.justPlayed) cls.push('just-played');
  const key = opts.keyHint ? `<span class="key-hint">${opts.keyHint}</span>` : '';
  return `<div class="${cls.join(' ')}" data-uid="${card.uid}" style="--el:${e.color};--eld:${e.dark};--elt:${e.text}">
    <div class="card-cost">${def.cost}</div>${key}
    <div class="card-name">${esc(def.name)}</div>
    <div class="card-art"><span class="glyph">${e.glyph}</span><span class="el-name">${e.name}</span></div>
    <div class="card-kind">${kindLabel(def.kind)} <b>${power}</b>${bonus ? ` <span class="bonus">+${bonus}</span>` : ''}</div>
    <div class="card-text">${esc(def.text)}</div>
  </div>`;
}

function backHtml(i) {
  return `<div class="card back" style="--rot:${(i - 2) * 4}deg"><div class="back-glyph">✦</div><div class="back-name">PACT</div></div>`;
}

function trayHtml(state) {
  if (state.tableCards.length === 0) return '<div class="tray-empty">No cards played yet — the table is waiting.</div>';
  return `<div class="tray">${state.tableCards.slice().reverse().map((t) => {
    const def = cardById(t.id);
    const e = ELEMENTS[def.element];
    return `<div class="tray-chip" style="--el:${e.color};--eld:${e.dark}">
      <span class="tray-who">${t.who === 'player' ? 'YOU' : 'WARDEN'}</span>
      <span class="tray-glyph">${e.glyph}</span>
      <span class="tray-name">${esc(def.name)}</span>
      <span class="tray-power">${kindLabel(def.kind)} ${def.power}</span>
    </div>`;
  }).join('<div class="tray-arrow">→</div>')}</div>`;
}

function legendHtml() {
  const items = Object.values(ELEMENTS).map((e) =>
    `<div class="legend-item"><span class="legend-glyph" style="color:${e.color}">${e.glyph}</span> ${e.name}</div>`).join('');
  return `<div class="legend">
    <div class="legend-title">ELEMENTS</div>${items}
    <div class="legend-rule">Same element twice in a turn:<br><b>RESONANCE +2 power</b></div>
    <div class="legend-rule">Keys: <b>1–7</b> select · <b>Enter</b> play<br><b>E</b> end turn · <b>R</b> restart</div>
  </div>`;
}

export function render(state, hooks) {
  const app = document.getElementById('app');
  const p = state.player;
  const f = state.foe;
  const inDuel = state.phase !== 'title';
  const over = state.phase === 'won' || state.phase === 'lost';

  const foeHand = f.hand.map((_, i) => backHtml(i)).join('');
  const handN = p.hand.length;
  const cardW = handN <= 5 ? 132 : handN === 6 ? 122 : 112; // narrow the fan so 7 cards fit
  const playerHand = p.hand.map((card, i) => {
    const def = cardById(card.id);
    const playable = state.phase === 'player' && p.mana >= def.cost;
    const bonus = state.phase === 'player' && state.lastElement === def.element ? TUNE.resonanceBonus : 0;
    return cardHtml(card, { playable, dim: state.phase === 'player' && !playable, keyHint: i + 1, bonus });
  }).join('');

  const logHtml = state.log.map((line) => `<div class="log-line">${esc(line)}</div>`).join('');
  const lastPlay = state.log[0] ? esc(state.log[0]) : '—';

  app.innerHTML = `
  <header class="topbar">
    <div class="brand">EMBER <span>PACT</span></div>
    <div class="top-mid">
      <span class="turn-pill">TURN ${state.turn}</span>
      <span class="score-pill">SCORE ${state.stats.damageDealt} dmg · ${state.stats.cardsPlayed} cards</span>
    </div>
    <div class="top-right">
      <span class="deck-pill">DECK ${p.deck.length}</span>
      <button id="btn-mute" class="icon-btn" title="Mute (M)">${hooks.muted ? '🔇' : '🔊'}</button>
      <button id="btn-restart" class="icon-btn" title="Restart (R)">↻</button>
    </div>
  </header>

  <section class="foe-row">
    <div class="portrait foe-portrait">W</div>
    <div class="side-info">
      <div class="side-name">THE WARDEN <span class="ai-tag">AI OPPONENT</span></div>
      ${lifeBar(f, 'LIFE')}
      ${manaPips(f)}
    </div>
    <div class="foe-hand"><div class="hand-label">OPPONENT HAND · ${f.hand.length} cards</div><div class="mini-hand">${foeHand}</div></div>
  </section>

  <section class="table">
    <div class="table-center">
      <div class="table-title">THE TABLE</div>
      <div class="last-play">LAST PLAY — ${lastPlay}</div>
      ${trayHtml(state)}
      <div class="resonance-meter">RESONANCE ${state.resonance > 0 ? `×${state.resonance + 1} · +${TUNE.resonanceBonus} next ${state.lastElement ? ELEMENTS[state.lastElement].name : ''} card` : '— play two of one element'}</div>
    </div>
    <div class="table-side">${legendHtml()}</div>
    <div class="table-log"><div class="log-title">BATTLE LOG</div>${logHtml}</div>
  </section>

  <section class="player-row">
    <div class="portrait you-portrait">Y</div>
    <div class="side-info">
      <div class="side-name">YOU <span class="ai-tag">DUELIST</span></div>
      ${lifeBar(p, 'LIFE')}
      ${manaPips(p)}
    </div>
    <div class="player-hand-wrap">
      <div class="hand-label">YOUR HAND · ${p.hand.length} cards — click a card or press 1–7, Enter to play</div>
      <div class="player-hand${handN >= 6 ? ' compact' : ''}" style="--cw:${cardW}px">${playerHand || '<div class="empty-hand">No cards in hand</div>'}</div>
    </div>
    <button id="btn-end" class="end-btn" ${state.phase === 'player' ? '' : 'disabled'}>END TURN ⏎</button>
  </section>

  <footer class="statusbar">${esc(state.message || '')}</footer>

  ${state.phase === 'title' ? `
  <div class="overlay title-overlay">
    <div class="title-card">
      <div class="title-kicker">A DUEL OF EMBERS AND ELEMENTS</div>
      <h1>EMBER<br>PACT</h1>
      <p class="title-sub">Outplay the Warden. Chain one element twice a turn for <b>Resonance +2</b>.<br>
      Reduce the Warden to 0 life before yours runs out.</p>
      <div class="title-elements">${Object.values(ELEMENTS).map((e) =>
        `<span class="title-el" style="color:${e.color}">${e.glyph} ${e.name}</span>`).join('')}</div>
      <button id="btn-start" class="big-btn">BEGIN THE DUEL</button>
      <div class="title-hint">Click Begin, or press Enter · Mouse + keyboard · No account, no network</div>
    </div>
  </div>` : ''}

  ${over ? `
  <div class="overlay ${state.phase === 'won' ? 'win-overlay' : 'loss-overlay'}">
    <div class="end-card">
      <div class="end-kicker">${state.phase === 'won' ? 'THE PACT IS SEALED' : 'THE EMBERS FADE'}</div>
      <h1>${state.phase === 'won' ? 'YOU WIN' : 'YOU LOSE'}</h1>
      <p class="end-sub">${esc(state.message)}</p>
      <div class="end-stats">
        <div><b>${state.stats.damageDealt}</b><span>damage dealt</span></div>
        <div><b>${state.stats.damageTaken}</b><span>damage taken</span></div>
        <div><b>${state.stats.cardsPlayed}</b><span>cards played</span></div>
        <div><b>${state.turn}</b><span>turns</span></div>
        <div><b>${p.life} / ${p.maxLife}</b><span>your life left</span></div>
        <div><b>${f.life} / ${f.maxLife}</b><span>Warden life left</span></div>
      </div>
      <button id="btn-again" class="big-btn">PLAY AGAIN</button>
      <div class="title-hint">Press R to restart</div>
    </div>
  </div>` : ''}`;

  // Wire the buttons and the cards.
  const start = document.getElementById('btn-start');
  if (start) start.addEventListener('click', hooks.start);
  const again = document.getElementById('btn-again');
  if (again) again.addEventListener('click', hooks.restart);
  document.getElementById('btn-end').addEventListener('click', hooks.endTurn);
  document.getElementById('btn-restart').addEventListener('click', hooks.restart);
  document.getElementById('btn-mute').addEventListener('click', hooks.toggleMute);
  app.querySelectorAll('.player-hand .card').forEach((node) => {
    node.addEventListener('click', () => hooks.playCard(node.dataset.uid));
  });
}
