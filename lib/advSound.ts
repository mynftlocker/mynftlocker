// Sons du calendrier, synthetises avec Web Audio (aucun fichier). Courts, nets, discrets, dans l'esprit des reveals Sorare.
let ctx: AudioContext | null = null;
const KEY = 'mnfl_adv_mute';
export const isMuted = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
export const setMuted = (m: boolean) => { try { localStorage.setItem(KEY, m ? '1' : '0'); } catch {} };
const get = () => {
  if (isMuted()) return null;
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx!.state === 'suspended') ctx!.resume();
    return ctx!;
  } catch { return null; }
};
const tone = (c: AudioContext, f: number, t0: number, dur: number, vol: number, type: OscillatorType = 'sine', f2?: number) => {
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.05);
};
// Bruit filtre (clic metallique / balayage "shing")
const noise = (c: AudioContext, t0: number, dur: number, vol: number, f1: number, f2: number, q = 6, type: BiquadFilterType = 'bandpass') => {
  const n = Math.max(1, Math.floor(c.sampleRate * dur)), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
  for (let k = 0; k < n; k++) d[k] = Math.random() * 2 - 1;
  const s = c.createBufferSource(); s.buffer = buf;
  const f = c.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f1, t0); f.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f); f.connect(g); g.connect(c.destination); s.start(t0);
};
// Cloche metallique : partiels inharmoniques, attaque nette, longue trainee
const bell = (c: AudioContext, f: number, t0: number, vol: number, dec = 1.3) => {
  [1, 2.76, 5.4, 8.93].forEach((r, i) => tone(c, f * r, t0, dec / (1 + i * 0.7), vol / (1 + i * 1.3), 'sine'));
};
// Pack qui tremble (1,1 s) : crescendo metallique (balayage de bruit + tonalite montante + cliquetis qui s'accelerent) qui prepare l'explosion
export const SHAKE_MS = 1100;
export function sfxShake() {
  const c = get(); if (!c) return; const t = c.currentTime, D = SHAKE_MS / 1000;
  // balayage de bruit qui monte et gonfle
  noise(c, t, D, 0.2, 400, 9000, 3);
  // tonalite metallique montante (gain exponentiel : de presque rien au maximum)
  const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
  o.type = 'sawtooth'; o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(2400, t + D);
  f.type = 'bandpass'; f.Q.value = 4; f.frequency.setValueAtTime(600, t); f.frequency.exponentialRampToValueAtTime(5200, t + D);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + D); g.gain.linearRampToValueAtTime(0.0001, t + D + 0.03);
  o.connect(f); f.connect(g); g.connect(c.destination); o.start(t); o.stop(t + D + 0.05);
  // cliquetis metalliques de plus en plus serres
  let at = 0, gap = 0.17, k = 0;
  while (at < D - 0.05) { noise(c, t + at, 0.04, 0.03 + k * 0.006, 4000 + k * 300, 8000, 10); at += gap; gap = Math.max(0.035, gap * 0.82); k++; }
}
// Revelation : explosion "impact flash" metallique (choc, eclat blanc, shing aigu a longue resonance) ; plus riche si le score est tres haut
export function sfxReveal(high = false) {
  const c = get(); if (!c) return; const t = c.currentTime;
  tone(c, 150, t, 0.4, 0.24, 'sine', 36);
  noise(c, t, 0.16, 0.3, 10000, 1500, 0.7, 'highpass');
  noise(c, t + 0.01, 0.7, 0.09, 5000, 14000, 1.5, 'highpass');
  [3136, 4186, 5274].forEach((f, i) => tone(c, f, t + i * 0.012, 1.7, 0.045 / (1 + i * 0.5), 'sine'));
  bell(c, 2093, t, 0.07, 1.9);
  bell(c, 3136, t + 0.09, 0.045, 1.7);
  if (high) { bell(c, 4186, t + 0.2, 0.04, 1.9); bell(c, 6272, t + 0.3, 0.025, 1.7); }
}
// Ouverture du panneau
export function sfxOpen() {
  const c = get(); if (!c) return; const t = c.currentTime;
  tone(c, 420, t, 0.22, 0.05, 'sine', 1100);
}
