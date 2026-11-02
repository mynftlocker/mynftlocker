// Sons du calendrier, synthetises avec Web Audio (aucun fichier). Courts, nets, discrets, dans l'esprit des reveals Sorare.
let ctx: AudioContext | null = null;
const KEY = 'mnfl_adv_mute';
export const isMuted = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
export const setMuted = (m: boolean) => { try { localStorage.setItem(KEY, m ? '1' : '0'); } catch {} };
const get = (): AudioContext | null => {
  if (isMuted()) return null;
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx!.state === 'suspended') ctx!.resume();
    return ctx!;
  } catch { return null; }
};
type Ctx = BaseAudioContext;
// Sortie commune : gain reduit + limiteur, pour que les pics ne saturent jamais
const masters = new WeakMap<Ctx, AudioNode>();
const dest = (c: Ctx): AudioNode => {
  let m = masters.get(c);
  if (!m) { const g = c.createGain(); g.gain.value = 0.62; const k = c.createDynamicsCompressor(); k.threshold.value = -10; k.ratio.value = 12; k.attack.value = 0.002; k.release.value = 0.15; g.connect(k); k.connect(c.destination); m = g; masters.set(c, m); }
  return m;
};
const tone = (c: Ctx, f: number, t0: number, dur: number, vol: number, type: OscillatorType = 'sine', f2?: number, dst?: AudioNode) => {
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(dst || dest(c)); o.start(t0); o.stop(t0 + dur + 0.05);
};
// Bruit filtre (clic metallique / balayage "shing")
const noise = (c: Ctx, t0: number, dur: number, vol: number, f1: number, f2: number, q = 6, type: BiquadFilterType = 'bandpass', dst?: AudioNode) => {
  const n = Math.max(1, Math.floor(c.sampleRate * dur)), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
  for (let k = 0; k < n; k++) d[k] = Math.random() * 2 - 1;
  const s = c.createBufferSource(); s.buffer = buf;
  const f = c.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f1, t0); f.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f); f.connect(g); g.connect(dst || dest(c)); s.start(t0);
};
// Cloche metallique : partiels inharmoniques, attaque nette, longue trainee
const bell = (c: Ctx, f: number, t0: number, vol: number, dec = 1.3, dst?: AudioNode) => {
  [1, 2.76, 5.4, 8.93].forEach((r, i) => tone(c, f * r, t0, dec / (1 + i * 0.7), vol / (1 + i * 1.3), 'sine', undefined, dst));
};
// Reverberation synthetique (reponse impulsionnelle : bruit a decroissance exponentielle)
const reverb = (c: Ctx, sec: number) => {
  const n = Math.floor(c.sampleRate * sec), buf = c.createBuffer(2, n, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let k = 0; k < n; k++) d[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / n, 3); }
  const cv = c.createConvolver(); cv.buffer = buf; return cv;
};
// 1) MONTEE (riser, 1,1 s) : souffle + synthe dont le niveau ET la hauteur montent jusqu'au bout, coupe net juste avant l'impact
export const SHAKE_MS = 1100;
export function riserSound(c: Ctx, t: number) {
  const D = SHAKE_MS / 1000 - 0.04;
  const n = Math.floor(c.sampleRate * D), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
  for (let k = 0; k < n; k++) d[k] = Math.random() * 2 - 1;
  const s = c.createBufferSource(); s.buffer = buf;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.4; f.frequency.setValueAtTime(250, t); f.frequency.exponentialRampToValueAtTime(9000, t + D);
  const g = c.createGain(); g.gain.setValueAtTime(0.004, t); g.gain.exponentialRampToValueAtTime(0.5, t + D); g.gain.setValueAtTime(0.0001, t + D + 0.001);
  s.connect(f); f.connect(g); g.connect(dest(c)); s.start(t);
  const o = c.createOscillator(), og = c.createGain(), of = c.createBiquadFilter();
  o.type = 'sawtooth'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(1800, t + D);
  of.type = 'lowpass'; of.frequency.setValueAtTime(400, t); of.frequency.exponentialRampToValueAtTime(7000, t + D);
  og.gain.setValueAtTime(0.002, t); og.gain.exponentialRampToValueAtTime(0.16, t + D); og.gain.setValueAtTime(0.0001, t + D + 0.001);
  o.connect(of); of.connect(og); og.connect(dest(c)); o.start(t); o.stop(t + D + 0.05);
}
// 2) IMPACT (a t) : choc grave (sub drop) + eclat metallique + 3) QUEUE : reverberation longue
export function hitSound(c: Ctx, t: number, high = false) {
  const wet = c.createGain(); wet.gain.value = 0.7; const rv = reverb(c, 2.2); wet.connect(rv); rv.connect(dest(c));
  const bus = c.createGain(); bus.gain.value = 1; bus.connect(dest(c)); bus.connect(wet);
  tone(c, 140, t, 0.7, 0.5, 'sine', 32, bus);
  tone(c, 70, t, 0.35, 0.3, 'sine', 30, bus);
  noise(c, t, 0.22, 0.45, 9000, 1200, 0.7, 'highpass', bus);
  noise(c, t, 0.9, 0.12, 4000, 12000, 1.5, 'highpass', bus);
  bell(c, 2093, t, 0.1, 1.8, bus);
  bell(c, 3136, t + 0.07, 0.07, 1.6, bus);
  if (high) { bell(c, 4186, t + 0.16, 0.06, 1.8, bus); bell(c, 6272, t + 0.26, 0.04, 1.6, bus); }
}
export function sfxShake() { const c = get(); if (!c) return; riserSound(c, c.currentTime); }
export function sfxReveal(high = false) { const c = get(); if (!c) return; hitSound(c, c.currentTime, high); }
// Ouverture du panneau
export function sfxOpen() {
  const c = get(); if (!c) return; const t = c.currentTime;
  tone(c, 420, t, 0.22, 0.05, 'sine', 1100);
}
