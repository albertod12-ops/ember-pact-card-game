// Ember Pact — the Warden, the AI opponent.
// One file, one job: decide which cards the opponent plays and in what order.
// Readable and counterable: it finishes you when it can, heals when it is dying,
// guards when you threaten lethal, and otherwise spends its embers on damage.

import { ELEMENTS, TUNE, cardById } from './config.js';
import { applyCard, beginFoeTurn, distinctElements } from './state.js';

// Score one candidate play from the foe's point of view. Higher is better.
// `bonus` is the Resonance +2 the play earns by matching the last element.
export function scorePlay(foe, player, def, bonus = 0) {
  const power = def.power + bonus;
  const lethal = def.kind === 'strike' && power >= player.life + player.shield;
  if (lethal) return 1000 + power;
  if (def.kind === 'strike') {
    // Damage is worth more when the player is low, less when shielded.
    const throughShield = Math.max(0, power - player.shield);
    return 40 + throughShield * 3 - def.cost * 4;
  }
  if (def.kind === 'heal') {
    if (foe.life >= foe.maxLife - 2) return -50; // full health: healing is wasted
    const missing = foe.maxLife - foe.life;
    return 30 + Math.min(def.power, missing) * 2 - def.cost * 3;
  }
  if (def.kind === 'guard') {
    if (foe.shield >= 12) return -20;
    // Guard matters most when the player's hand looks dangerous.
    return 25 + def.power * 2 - def.cost * 3;
  }
  if (def.kind === 'draw') return foe.hand.length <= 3 ? 45 : 5;
  if (def.kind === 'surge') return foe.mana >= 6 ? -10 : 35;
  return 0;
}

// Minimal deep copy used only to preview the AI's turn without touching live state.
function cloneState(s) {
  const copy = JSON.parse(JSON.stringify({ ...s, rng: undefined }));
  copy.rng = s.rng;
  return copy;
}

// Read the Warden's telegraphed plan: what it would play first on its next
// turn, from its current hand and embers. The player sees this during their
// own turn and can counter it — guard or heal before ending the turn —
// instead of learning the opponent's choices only after they land.
// The preview runs the foe's real turn start (draw + mana) on a clone, so
// the plan matches the turn the Warden actually takes.
export function readIntent(state) {
  const clone = cloneState(state);
  beginFoeTurn(clone);
  const plays = choosePlays(clone);
  if (plays.length === 0) {
    return { kind: 'pass', element: null, power: 0, text: 'Hold its embers — it passes.' };
  }
  const first = plays[0];
  const def = first.def;
  const e = ELEMENTS[def.element];
  const kindWord = { strike: 'Strike', guard: 'Guard', heal: 'Heal', draw: 'Draw', surge: 'Surge' }[def.kind] ?? def.kind;
  const detail = def.kind === 'strike' ? `about ${first.power} damage`
    : def.kind === 'guard' ? `${first.power} shield`
    : def.kind === 'heal' ? `${first.power} life`
    : def.kind === 'draw' ? `${first.power} cards`
    : `+${first.power} embers`;
  return {
    kind: def.kind, element: def.element, power: first.power,
    text: `${kindWord} ${e.glyph} ${e.name} — ${detail}`,
  };
}

export function choosePlays(state) {
  const plays = [];
  const foe = state.foe;
  const player = state.player;
  for (let guard = 0; guard < 12; guard += 1) {
    let best = null;
    let bestScore = 20; // below this, the Warden holds its embers and passes
    for (const card of foe.hand) {
      const def = cardById(card.id);
      if (def.cost > foe.mana) continue;
      // The Warden chases its own combos: Resonance on a matching element,
      // and a third distinct element to seal a Pact Chain draw.
      const bonus = state.foeLastElement === def.element && state.foePlayedThisTurn.length > 0
        ? TUNE.resonanceBonus : 0;
      let s = scorePlay(foe, player, def, bonus);
      if (!state.foePactChain && !distinctElements(state, 'foe').includes(def.element)
        && distinctElements(state, 'foe').length === 2) s += 12;
      if (s > bestScore) { bestScore = s; best = card; }
    }
    if (!best) break;
    const result = applyCard(state, foe, player, best.uid, 'foe');
    if (!result.ok) break;
    plays.push(result);
    if (state.phase === 'won' || state.phase === 'lost') break;
  }
  return plays;
}
