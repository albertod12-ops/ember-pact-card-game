// Ember Pact — the Warden, the AI opponent.
// One file, one job: decide which cards the opponent plays and in what order.
// Readable and counterable: it finishes you when it can, heals when it is dying,
// guards when you threaten lethal, and otherwise spends its embers on damage.

import { cardById } from './config.js';
import { applyCard } from './state.js';

// Score one candidate play from the foe's point of view. Higher is better.
export function scorePlay(foe, player, def) {
  const lethal = def.kind === 'strike' && def.power >= player.life + player.shield;
  if (lethal) return 1000 + def.power;
  if (def.kind === 'strike') {
    // Damage is worth more when the player is low, less when shielded.
    const throughShield = Math.max(0, def.power - player.shield);
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

// Pick the foe's plays one at a time until it passes. Returns the list of
// { def, power, detail } results in the order they were played.
export function choosePlays(state) {
  const plays = [];
  const foe = state.foe;
  const player = state.player;
  for (let guard = 0; guard < 12; guard += 1) {
    let best = null;
    let bestScore = 12; // below this, the Warden holds its embers and passes
    for (const card of foe.hand) {
      const def = cardById(card.id);
      if (def.cost > foe.mana) continue;
      const s = scorePlay(foe, player, def);
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
