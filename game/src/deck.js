// Ember Pact — deck building, shuffling and drawing.
// One file, one job: everything about the pile of cards, nothing about the table.

// mulberry32: a tiny seeded RNG so screenshot states render identically every time.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(deck, rng) {
  const d = deck.slice();
  for (let i = d.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

export function buildDeck(counts, rng) {
  const deck = [];
  for (const [id, n] of Object.entries(counts)) {
    for (let i = 0; i < n; i += 1) deck.push({ uid: `${id}#${i + 1}`, id });
  }
  return shuffle(deck, rng);
}

export function drawFrom(deck, hand, n, handLimit) {
  const drawn = [];
  while (n > 0 && deck.length > 0 && hand.length < handLimit) {
    const card = deck.shift();
    hand.push(card);
    drawn.push(card);
    n -= 1;
  }
  return drawn;
}
