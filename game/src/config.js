// Ember Pact — card definitions and tuning constants.
// One file, one job: every card, element and number the game uses lives here.

export const ELEMENTS = {
  flame: { key: 'flame', name: 'Flame', glyph: '▲', color: '#ff5a3c', dark: '#8f1d0b', text: '#ffd9cf' },
  tide: { key: 'tide', name: 'Tide', glyph: '●', color: '#2fa8ff', dark: '#0b3d66', text: '#d3ecff' },
  thorn: { key: 'thorn', name: 'Thorn', glyph: '◆', color: '#4ecb5d', dark: '#0e4d1c', text: '#d8f7dc' },
  star: { key: 'star', name: 'Star', glyph: '★', color: '#ffc93c', dark: '#6b4a00', text: '#fff3c9' },
};

export const ELEMENT_ORDER = ['flame', 'tide', 'thorn', 'star'];

// kind: strike = damage, guard = shield, heal = restore life,
// draw = draw cards, surge = gain mana this turn.
export const CARDS = [
  { id: 'ember-slash', name: 'Ember Slash', element: 'flame', cost: 1, kind: 'strike', power: 4, text: 'Deal 4 damage.' },
  { id: 'cinder-fan', name: 'Cinder Fan', element: 'flame', cost: 2, kind: 'strike', power: 7, text: 'Deal 7 damage.' },
  { id: 'inferno', name: 'Inferno', element: 'flame', cost: 4, kind: 'strike', power: 12, text: 'Deal 12 damage.' },
  { id: 'ember-surge', name: 'Ember Surge', element: 'flame', cost: 2, kind: 'surge', power: 3, text: 'Gain +3 embers this turn.' },
  { id: 'pyre-pact', name: 'Pyre Pact', element: 'flame', cost: 2, kind: 'strike', power: 5, text: 'Deal 5 damage.' },
  { id: 'tide-crash', name: 'Tide Crash', element: 'tide', cost: 2, kind: 'strike', power: 6, text: 'Deal 6 damage.' },
  { id: 'undertow', name: 'Undertow', element: 'tide', cost: 3, kind: 'strike', power: 9, text: 'Deal 9 damage. Draw 1 card.' },
  { id: 'tide-wall', name: 'Tide Wall', element: 'tide', cost: 2, kind: 'guard', power: 7, text: 'Gain 7 shield.' },
  { id: 'still-water', name: 'Still Water', element: 'tide', cost: 1, kind: 'heal', power: 5, text: 'Restore 5 life.' },
  { id: 'deep-current', name: 'Deep Current', element: 'tide', cost: 3, kind: 'draw', power: 3, text: 'Draw 3 cards.' },
  { id: 'thorn-whip', name: 'Thorn Whip', element: 'thorn', cost: 1, kind: 'strike', power: 3, text: 'Deal 3 damage. Draw 1 card.' },
  { id: 'briar-snare', name: 'Briar Snare', element: 'thorn', cost: 2, kind: 'strike', power: 5, text: 'Deal 5 damage.' },
  { id: 'mend', name: 'Mend', element: 'thorn', cost: 2, kind: 'heal', power: 7, text: 'Restore 7 life.' },
  { id: 'overgrowth', name: 'Overgrowth', element: 'thorn', cost: 3, kind: 'guard', power: 10, text: 'Gain 10 shield.' },
  { id: 'thorn-vigil', name: 'Thorn Vigil', element: 'thorn', cost: 3, kind: 'guard', power: 9, text: 'Gain 9 shield.' },
  { id: 'star-lance', name: 'Star Lance', element: 'star', cost: 3, kind: 'strike', power: 10, text: 'Deal 10 damage.' },
  { id: 'star-ward', name: 'Star Ward', element: 'star', cost: 2, kind: 'guard', power: 8, text: 'Gain 8 shield.' },
  { id: 'insight', name: 'Insight', element: 'star', cost: 1, kind: 'draw', power: 2, text: 'Draw 2 cards.' },
  { id: 'nova', name: 'Nova', element: 'star', cost: 4, kind: 'strike', power: 13, text: 'Deal 13 damage.' },
  { id: 'starfall', name: 'Starfall', element: 'star', cost: 4, kind: 'strike', power: 12, text: 'Deal 12 damage.' },
];

// Deck composition: how many copies of each card id go into a 30-card deck.
export const DECK_COUNTS = {
  'ember-slash': 2, 'cinder-fan': 1, 'inferno': 1, 'ember-surge': 2, 'pyre-pact': 1,
  'tide-crash': 2, 'undertow': 1, 'tide-wall': 2, 'still-water': 2, 'deep-current': 1,
  'thorn-whip': 2, 'briar-snare': 2, 'mend': 2, 'overgrowth': 1, 'thorn-vigil': 1,
  'star-lance': 2, 'star-ward': 2, 'insight': 1, 'nova': 1, 'starfall': 1,
};

export const TUNE = {
  startLife: 30,
  startMana: 3,
  maxMana: 10,
  startHand: 4,
  handLimit: 7,
  drawPerTurn: 1,
  resonanceBonus: 2,
  deckSize: 30,
};

export function cardById(id) {
  return CARDS.find((c) => c.id === id);
}

export function kindLabel(kind) {
  return { strike: 'STRIKE', guard: 'GUARD', heal: 'HEAL', draw: 'DRAW', surge: 'SURGE' }[kind] ?? kind.toUpperCase();
}
