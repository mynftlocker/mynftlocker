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
// Pack qui tremble : montee de tension
export function sfxShake() {
  const c = get(); if (!c) return; const t = c.currentTime;
  tone(c, 140, t, 0.65, 0.05, 'sawtooth', 520);
  tone(c, 70, t, 0.65, 0.06, 'sine', 160);
}
// Revelation : impact grave + arpege cristallin (plus riche si le score est tres haut)
export function sfxReveal(high = false) {
  const c = get(); if (!c) return; const t = c.currentTime;
  tone(c, 110, t, 0.45, 0.14, 'sine', 42);
  const notes = high ? [1568, 1976, 2349, 2637, 3136, 3951] : [1319, 1760, 2093, 2637];
  notes.forEach((f, i) => { tone(c, f, t + 0.04 + i * 0.07, 0.5, 0.05, 'triangle'); tone(c, f * 2, t + 0.04 + i * 0.07, 0.3, 0.018, 'sine'); });
}
// Ouverture du panneau
export function sfxOpen() {
  const c = get(); if (!c) return; const t = c.currentTime;
  tone(c, 420, t, 0.22, 0.05, 'sine', 1100);
}
