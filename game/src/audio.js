// Ember Pact — tiny sound effects, synthesized, no audio files.
// One file, one job: short WebAudio blips for play, hit, heal, win and loss.

let ctx = null;
let muted = false;

export function setMuted(m) { muted = m; }
export function isMuted() { return muted; }

function ensure() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function blip(freq, dur, type, gain, when = 0) {
  if (muted) return;
  const ac = ensure();
  if (!ac) return;
  const t = ac.currentTime + when;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export function sfxPlay() { blip(520, 0.09, 'triangle', 0.12); blip(780, 0.12, 'triangle', 0.1, 0.05); }
export function sfxHit() { blip(160, 0.16, 'sawtooth', 0.14); blip(90, 0.2, 'square', 0.1, 0.03); }
export function sfxHeal() { blip(660, 0.14, 'sine', 0.12); blip(880, 0.2, 'sine', 0.1, 0.08); }
export function sfxDraw() { blip(440, 0.06, 'triangle', 0.08); }
export function sfxWin() { [523, 659, 784, 1047].forEach((f, i) => blip(f, 0.22, 'triangle', 0.12, i * 0.11)); }
export function sfxLose() { [392, 330, 262, 196].forEach((f, i) => blip(f, 0.26, 'sine', 0.12, i * 0.13)); }
export function sfxClick() { blip(700, 0.05, 'square', 0.06); }
