// Ember Pact — keyboard and mouse input.
// One file, one job: translate keys and clicks into game actions.
// 1–7 select a card, Enter/Space plays it, E ends the turn, R restarts, M mutes.

export function bindInput(hooks) {
  let selected = null;

  function select(index) {
    const cards = document.querySelectorAll('.player-hand .card');
    if (index < 0 || index >= cards.length) return;
    document.querySelectorAll('.player-hand .card.selected').forEach((n) => n.classList.remove('selected'));
    const node = cards[index];
    node.classList.add('selected');
    selected = node.dataset.uid;
  }

  function playSelected() {
    if (selected) hooks.playCard(selected);
    selected = null;
  }

  document.addEventListener('keydown', (ev) => {
    if (ev.repeat) return;
    const k = ev.key;
    if (k >= '1' && k <= '7') { select(Number(k) - 1); return; }
    if (k === 'Enter' || k === ' ') {
      const start = document.getElementById('btn-start');
      if (start) { start.click(); return; }
      const again = document.getElementById('btn-again');
      if (again) { again.click(); return; }
      playSelected();
      return;
    }
    if (k === 'e' || k === 'E') { document.getElementById('btn-end')?.click(); return; }
    if (k === 'r' || k === 'R') { hooks.restart(); return; }
    if (k === 'm' || k === 'M') { hooks.toggleMute(); return; }
    if (k === 'Escape') {
      document.querySelectorAll('.player-hand .card.selected').forEach((n) => n.classList.remove('selected'));
      selected = null;
    }
  });

  return {
    clearSelection() { selected = null; },
  };
}
