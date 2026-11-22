// Ember Pact — bootstrap and screenshot states.
// One file, one job: start a duel, run the opponent's turn, and set up the four
// fixed states the screenshots show (?shot=title|table|win|loss, ?seed=N).
// A shot state is the real game with its state preset — never a mock picture.

import { CARDS, DECK_COUNTS, TUNE } from './config.js';
import { newGame, startDuel, applyCard, beginPlayerTurn, beginFoeTurn, checkEnd, pushLog } from './state.js';
import { choosePlays } from './ai.js';
import { render } from './render.js';
import { bindInput } from './input.js';
import { sfxPlay, sfxHit, sfxHeal, sfxWin, sfxLose, sfxClick, sfxDraw, setMuted, isMuted } from './audio.js';

const params = new URLSearchParams(location.search);
const SEED = Number(params.get('seed') || 7);
const SHOT = params.get('shot') || '';

let state = newGame(SEED, DECK_COUNTS);
let input = null;
let foeTimer = null;

function sfxFor(result) {
  if (!result.ok) return;
  const kind = result.def.kind;
  if (kind === 'strike') sfxHit();
  else if (kind === 'heal' || kind === 'guard') sfxHeal();
  else if (kind === 'draw') sfxDraw();
  else sfxPlay();
}

let lastPhase = '';
function draw() {
  render(state, hooks);
  if (state.phase !== lastPhase) {
    if (state.phase === 'won') sfxWin();
    if (state.phase === 'lost') sfxLose();
    lastPhase = state.phase;
  }
}

const hooks = {
  get muted() { return isMuted(); },
  start() {
    sfxClick();
    startDuel(state);
    draw();
  },
  restart() {
    sfxClick();
    clearTimeout(foeTimer);
    state = newGame(SEED + 1, DECK_COUNTS);
    startDuel(state);
    draw();
  },
  toggleMute() {
    setMuted(!isMuted());
    draw();
  },
  playCard(uid) {
    if (state.phase !== 'player') return;
    const result = applyCard(state, state.player, state.foe, uid, 'player');
    if (!result.ok) { state.message = result.why === 'not enough embers' ? 'Not enough embers for that card.' : result.why; draw(); return; }
    sfxFor(result);
    input?.clearSelection();
    draw();
    if (state.phase === 'won' || state.phase === 'lost') return;
  },
  endTurn() {
    if (state.phase !== 'player') return;
    sfxClick();
    input?.clearSelection();
    beginFoeTurn(state);
    draw();
    // The Warden plays one card at a time so each play is visible.
    const plays = choosePlaysPreview(state);
    let i = 0;
    const step = () => {
      if (i >= plays.length || state.phase === 'won' || state.phase === 'lost') {
        if (state.phase !== 'won' && state.phase !== 'lost') beginPlayerTurn(state);
        draw();
        return;
      }
      const planned = plays[i];
      i += 1;
      const result = planned.apply();
      sfxFor(result);
      draw();
      foeTimer = setTimeout(step, 650);
    };
    foeTimer = setTimeout(step, 500);
  },
};

// The AI decides its whole turn up front (so the log order is fixed), but the
// cards are applied one at a time by the timer above for visible pacing.
function choosePlaysPreview(state) {
  const clone = snapshotState(state);
  const planned = choosePlays(clone);
  // Re-apply the same decisions to the live state in order, one per timer tick.
  return planned.map((p) => ({ apply: () => applyCard(state, state.foe, state.player, p.uid, 'foe'), def: p.def }));
}

// Minimal deep copy used only to preview the AI's turn without touching live state.
function snapshotState(s) {
  const copy = JSON.parse(JSON.stringify({ ...s, rng: undefined }));
  copy.rng = s.rng;
  return copy;
}

function presetTable() {
  startDuel(state);
  // A mid-duel table: turn 5, both sides bloodied, full hands, a log to read.
  state.turn = 5;
  state.player.life = 24; state.player.shield = 4;
  state.foe.life = 17; state.foe.shield = 2;
  state.player.maxMana = 6; state.player.mana = 5;
  state.foe.maxMana = 6; state.foe.mana = 3;
  state.player.hand = [
    { uid: 'ember-slash#1', id: 'ember-slash' }, { uid: 'cinder-fan#1', id: 'cinder-fan' },
    { uid: 'tide-wall#1', id: 'tide-wall' }, { uid: 'thorn-whip#1', id: 'thorn-whip' },
    { uid: 'star-lance#1', id: 'star-lance' }, { uid: 'mend#1', id: 'mend' },
    { uid: 'insight#1', id: 'insight' },
  ];
  state.foe.hand = [
    { uid: 'x1', id: 'ember-slash' }, { uid: 'x2', id: 'tide-crash' },
    { uid: 'x3', id: 'thorn-whip' }, { uid: 'x4', id: 'star-ward' }, { uid: 'x5', id: 'mend' },
  ];
  state.playedThisTurn = ['flame'];
  state.lastElement = 'flame';
  state.resonance = 1;
  state.tableCards = [
    { uid: 'cinder-fan#1', id: 'cinder-fan', who: 'player' },
    { uid: 'tide-wall#1', id: 'tide-wall', who: 'player' },
    { uid: 'x3', id: 'thorn-whip', who: 'foe' },
  ];
  state.log = [
    'Cinder Fan hits for 9 (+2 resonance).',
    'Tide Wall raises 7 shield.',
    'The Warden plays Thorn Whip for 3.',
    'You draw a card.',
    'Turn 5: you draw a card.',
    'The pact is sealed. Your move, duelist.',
  ];
  state.message = 'Turn 5 — play cards, then end your turn. Chain Flame again for Resonance +2.';
  state.stats = { damageDealt: 13, damageTaken: 6, cardsPlayed: 9, healed: 5, shielded: 7 };
}

function presetWin() {
  presetTable();
  state.foe.life = 0;
  state.foe.shield = 0;
  state.player.life = 18;
  state.phase = 'won';
  state.message = 'The Warden kneels. The pact is yours.';
  state.log = ['Nova hits for 13. The Warden falls.', 'Victory! The Warden falls.'];
  state.tableCards = [
    { uid: 'star-lance#1', id: 'star-lance', who: 'player' },
    { uid: 'x4', id: 'star-ward', who: 'foe' },
    { uid: 'nova#1', id: 'nova', who: 'player' },
  ];
  state.stats = { damageDealt: 31, damageTaken: 12, cardsPlayed: 14, healed: 5, shielded: 15 };
}

function presetLoss() {
  presetTable();
  state.player.life = 0;
  state.player.shield = 0;
  state.foe.life = 11;
  state.phase = 'lost';
  state.message = 'Your embers fade. The Warden prevails.';
  state.log = ['The Warden plays Inferno for 12.', 'Defeat. The Warden stands.'];
  state.tableCards = [
    { uid: 'mend#1', id: 'mend', who: 'player' },
    { uid: 'x1', id: 'ember-slash', who: 'foe' },
    { uid: 'inferno#1', id: 'inferno', who: 'foe' },
  ];
  state.stats = { damageDealt: 19, damageTaken: 30, cardsPlayed: 11, healed: 7, shielded: 10 };
}

function boot() {
  if (SHOT) document.body.classList.add('shot');
  if (SHOT === 'table') presetTable();
  else if (SHOT === 'win') presetWin();
  else if (SHOT === 'loss') presetLoss();
  // 'title' (and no shot) show the title screen over a fresh duel.
  input = bindInput(hooks);
  draw();
  document.body.dataset.ready = '1';
}

boot();
