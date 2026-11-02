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
// Pack qui tremble : cliquetis metalliques qui s'accelerent + souffle montant
export function sfxShake() {
  const c = get(); if (!c) return; const t = c.currentTime;
  let at = 0, gap = 0.14, k = 0;
  while (at < 0.8) { noise(c, t + at, 0.05, 0.05 + k * 0.004, 3200 + k * 260, 6500, 9); at += gap; gap = Math.max(0.04, gap * 0.84); k++; }
  noise(c, t, 0.85, 0.035, 500, 7000, 1.2);
}
// Revelation : choc sec, "shing" metallique aiguise, cloche cristalline (plus riche si le score est tres haut)
export function sfxReveal(high = false) {
  const c = get(); if (!c) return; const t = c.currentTime;
  tone(c, 95, t, 0.35, 0.1, 'sine', 40);
  noise(c, t, 0.4, 0.09, 2500, 14000, 1.5, 'highpass');
  bell(c, 1480, t + 0.02, 0.07, 1.4);
  bell(c, 2217, t + 0.13, 0.05, 1.2);
  if (high) { bell(c, 2960, t + 0.26, 0.045, 1.5); bell(c, 4435, t + 0.38, 0.03, 1.4); }
}
// Ouverture du panneau
export function sfxOpen() {
  const c = get(); if (!c) return; const t = c.currentTime;
  tone(c, 420, t, 0.22, 0.05, 'sine', 1100);
}
