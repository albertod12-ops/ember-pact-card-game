// Ember Pact — game state and turn rules.
// One file, one job: the numbers of a duel (life, shield, mana, hands) and what a
// played card does to them. No DOM here; render.js shows this state.

import { TUNE, cardById } from './config.js';
import { buildDeck, drawFrom, makeRng } from './deck.js';

export function newSide(deck) {
  return { life: TUNE.startLife, maxLife: TUNE.startLife, shield: 0, mana: 0, maxMana: 0, deck, hand: [], discard: [] };
}

export function newGame(seed, deckCounts) {
  const rng = { seed };
  const state = {
    seed,
    rng,
    phase: 'title', // title | player | opponent | won | lost
    turn: 1,
    player: newSide(buildDeck(deckCounts, makeSeeded(seed, 11))),
    foe: newSide(buildDeck(deckCounts, makeSeeded(seed, 77))),
    playedThisTurn: [], // element keys played by the player this turn
    resonance: 0, // consecutive same-element plays this turn
    lastElement: null,
    tableCards: [], // last 3 cards played, newest first: {uid, id, who}
    log: [],
    stats: { damageDealt: 0, damageTaken: 0, cardsPlayed: 0, healed: 0, shielded: 0 },
    message: '',
  };
  return state;
}

// Seeded RNG factory kept local so state.js owns its own randomness.
function makeSeeded(seed, salt) {
  return makeRng((seed * 31 + salt) >>> 0);
}

export function startDuel(state) {
  state.phase = 'player';
  state.turn = 1;
  state.player.maxMana = TUNE.startMana;
  state.player.mana = TUNE.startMana;
  state.foe.maxMana = TUNE.startMana;
  state.foe.mana = TUNE.startMana;
  drawFrom(state.player.deck, state.player.hand, TUNE.startHand, TUNE.handLimit);
  drawFrom(state.foe.deck, state.foe.hand, TUNE.startHand, TUNE.handLimit);
  pushLog(state, 'The pact is sealed. Your move, duelist.');
  state.message = 'Play cards, then end your turn.';
}

export function pushLog(state, text) {
  state.log.unshift(text);
  if (state.log.length > 6) state.log.length = 6;
}

// Resonance: playing a card whose element matches the last element played this
// turn adds +2 to its power. Returns the bonus applied.
export function resonanceBonus(state, element) {
  if (state.lastElement === element && state.playedThisTurn.length > 0) return TUNE.resonanceBonus;
  return 0;
}

export function dealDamage(state, target, amount) {
  let left = amount;
  if (target.shield > 0) {
    const absorbed = Math.min(target.shield, left);
    target.shield -= absorbed;
    left -= absorbed;
  }
  target.life = Math.max(0, target.life - left);
  return left;
}

export function applyCard(state, side, foeSide, cardUid, who) {
  const hand = side.hand;
  const idx = hand.findIndex((c) => c.uid === cardUid);
  if (idx === -1) return { ok: false, why: 'not in hand' };
  const def = cardById(hand[idx].id);
  if (side.mana < def.cost) return { ok: false, why: 'not enough embers' };
  const bonus = who === 'player' ? resonanceBonus(state, def.element) : 0;
  const power = def.power + bonus;
  side.mana -= def.cost;
  const [played] = hand.splice(idx, 1);
  side.discard.push(played);
  state.tableCards.unshift({ uid: played.uid, id: played.id, who });
  if (state.tableCards.length > 3) state.tableCards.length = 3;
  state.stats.cardsPlayed += 1;
  if (who === 'player') {
    state.playedThisTurn.push(def.element);
    state.lastElement = def.element;
    if (bonus > 0) state.resonance += 1;
  }
  let detail = '';
  if (def.kind === 'strike') {
    const dealt = dealDamage(state, foeSide, power);
    detail = `${def.name} hits for ${dealt}${bonus ? ` (+${bonus} resonance)` : ''}.`;
    if (who === 'player') state.stats.damageDealt += dealt;
    else state.stats.damageTaken += dealt;
    if (def.id === 'undertow' || def.id === 'thorn-whip') drawFrom(side.deck, side.hand, 1, TUNE.handLimit);
  } else if (def.kind === 'guard') {
    side.shield += power;
    detail = `${def.name} raises ${power} shield${bonus ? ` (+${bonus} resonance)` : ''}.`;
    if (who === 'player') state.stats.shielded += power;
  } else if (def.kind === 'heal') {
    const healed = Math.min(power, side.maxLife - side.life);
    side.life += healed;
    detail = `${def.name} restores ${healed} life${bonus ? ` (+${bonus} resonance)` : ''}.`;
    if (who === 'player') state.stats.healed += healed;
  } else if (def.kind === 'draw') {
    const drawn = drawFrom(side.deck, side.hand, power, TUNE.handLimit);
    detail = `${def.name} draws ${drawn.length} card${drawn.length === 1 ? '' : 's'}.`;
  } else if (def.kind === 'surge') {
    side.mana += power;
    detail = `${def.name} kindles +${power} embers.`;
  }
  pushLog(state, detail);
  checkEnd(state);
  return { ok: true, def, power, detail };
}

export function checkEnd(state) {
  if (state.foe.life <= 0 && state.phase !== 'won') {
    state.phase = 'won';
    state.message = 'The Warden kneels. The pact is yours.';
    pushLog(state, 'Victory! The Warden falls.');
  } else if (state.player.life <= 0 && state.phase !== 'lost') {
    state.phase = 'lost';
    state.message = 'Your embers fade. The Warden prevails.';
    pushLog(state, 'Defeat. The Warden stands.');
  }
}

export function beginPlayerTurn(state) {
  state.turn += 1;
  state.playedThisTurn = [];
  state.lastElement = null;
  state.resonance = 0;
  const p = state.player;
  p.maxMana = Math.min(TUNE.maxMana, p.maxMana + 1);
  p.mana = p.maxMana;
  drawFrom(p.deck, p.hand, TUNE.drawPerTurn, TUNE.handLimit);
  state.phase = 'player';
  state.message = `Turn ${state.turn} — play cards, then end your turn.`;
  pushLog(state, `Turn ${state.turn}: you draw a card.`);
}

export function beginFoeTurn(state) {
  const f = state.foe;
  f.maxMana = Math.min(TUNE.maxMana, f.maxMana + 1);
  f.mana = f.maxMana;
  drawFrom(f.deck, f.hand, TUNE.drawPerTurn, TUNE.handLimit);
  state.phase = 'opponent';
  state.message = 'The Warden is thinking…';
}

export function canPlay(state, cardUid) {
  if (state.phase !== 'player') return false;
  const card = state.player.hand.find((c) => c.uid === cardUid);
  if (!card) return false;
  return state.player.mana >= cardById(card.id).cost;
}
