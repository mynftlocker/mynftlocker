'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import StarCanvas from '../components/StarCanvas';
import { useLang, initLang, LangSwitch, t, addEn } from '../i18n';

addEn({
  'CALENDRIER DE L’AVENT': 'ADVENT CALENDAR',
  'Chaque matin de décembre, le meilleur score TTFL de la nuit NBA, sur sa carte Arcade gratuite de Sorare.': 'Every morning in December, the best TTFL score of the NBA night, on its free Sorare Arcade card.',
  'Ouverture le 1er décembre': 'Opens on December 1st',
  'Reviens chaque matin : une nouvelle case s’ouvre avec la nuit NBA de la veille.': 'Come back every morning: a new door opens with last night’s NBA action.',
  'Aperçu avec les vraies dernières nuits NBA': 'Preview with the real latest NBA nights',
  'Jour': 'Day',
  'OUVRIR': 'OPEN',
  'Résultats disponibles vers 8 h (heure de Paris).': 'Results available around 8 AM (Paris time).',
  'Cette case n’est pas encore ouverte.': 'This door isn’t open yet.',
  'Impossible de charger cette case, réessaie dans un instant.': 'Could not load this door, please try again in a moment.',
  'Meilleur score TTFL de la nuit': 'Best TTFL score of the night',
  'Le top de la nuit': 'Top of the night',
  'Partager sur X': 'Share on X',
  'Découvrir myNFTlocker': 'Discover myNFTlocker',
  'Fermer': 'Close',
  'Ta galerie Sorare, ton vestiaire, tes stats : gratuit sur myNFTlocker.': 'Your Sorare gallery, your locker room, your stats: free on myNFTlocker.',
  'Carte Arcade': 'Arcade card',
  'Carte classique': 'Classic card',
  'PTS': 'PTS', 'REB': 'REB', 'PD': 'AST', 'INT': 'STL', 'CT': 'BLK',
  'Les scores TTFL sont calculés à partir des box scores NBA (points + rebonds + passes + interceptions + contres + tirs, 3 points et lancers francs réussis − tirs, 3 points et lancers francs ratés − balles perdues). Projet indépendant, non affilié à Sorare, à la NBA ni à la TTFL.': 'TTFL scores are computed from NBA box scores (points + rebounds + assists + steals + blocks + made field goals, threes and free throws − missed field goals, threes and free throws − turnovers). Independent project, not affiliated with Sorare, the NBA or TTFL.',
  'Retour au site': 'Back to the site',
  'jours': 'days', 'h': 'h', 'min': 'min',
});

type Card = { slug: string; playerSlug: string; name: string; pictureUrl: string; kind: 'arcade' | 'classic' };
type Row = { id: string; name: string; team: string; score: number; pts: number; reb: number; ast: number; stl: number; blk: number; to: number; card: Card | null };
type DayData = { open: boolean; pending?: boolean; day: number; date?: string; games?: number; top?: Row[] };

const YEAR = 2026;
const GOLD = '#f0c96e';
const CYAN = '#40e8ff';
const parisNow = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
const unlockedDays = (demo: number) => {
  if (demo > 0) return Math.min(24, demo);
  const p = parisNow();
  if (p.getFullYear() > YEAR) return 24;
  if (p.getFullYear() < YEAR || p.getMonth() < 11) return 0;
  return Math.min(24, p.getDate());
};
// Code couleur des scores, dans l'esprit de Sorare
const tier = (s: number) => (s >= 80 ? '#c084fc' : s >= 60 ? '#38bdf8' : s >= 45 ? '#4ade80' : s >= 30 ? '#fbbf24' : '#fb923c');

function useCountUp(target: number, active: boolean, ms = 1100) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!active) { setV(0); return; }
    let raf = 0; const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, active, ms]);
  return v;
}

// Gerbe de particules (dorees et cyan) quand une case s'ouvre
function Burst({ color }: { color: string }) {
  const parts = useRef(Array.from({ length: 22 }, (_, i) => {
    const a = (i / 22) * Math.PI * 2 + Math.random() * 0.4; const d = 60 + Math.random() * 90;
    return { dx: Math.cos(a) * d, dy: Math.sin(a) * d, s: 3 + Math.random() * 5, c: i % 3 === 0 ? CYAN : i % 3 === 1 ? GOLD : color, dl: Math.random() * 0.12 };
  })).current;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5 }}>
      {parts.map((p, i) => (
        <span key={i} className='adv-p' style={{ ['--dx' as any]: p.dx + 'px', ['--dy' as any]: p.dy + 'px', width: p.s, height: p.s, background: p.c, boxShadow: '0 0 8px ' + p.c, animationDelay: p.dl + 's' }} />
      ))}
    </div>
  );
}

function Door({ n, openDay, d, flipped, loading, burst, onClick }: { n: number; openDay: number; d?: DayData; flipped: boolean; loading: boolean; burst: boolean; onClick: () => void }) {
  const avail = n <= openDay;
  const w = d?.top?.[0];
  const col = w ? tier(w.score) : GOLD;
  const score = useCountUp(w?.score || 0, flipped && !!w);
  return (
    <div className='adv-door' style={{ perspective: '900px' }} onClick={onClick} role='button' aria-label={t('Jour') + ' ' + n}>
      <div className={'adv-inner' + (flipped ? ' flipped' : '')}>
        {/* Face avant : la case */}
        <div className={'adv-face adv-front' + (avail ? ' avail' : ' locked')}>
          <div className='adv-arch'>
            <span className='adv-num'>{n}</span>
            {avail ? (
              <span className='adv-open'>{loading ? '…' : t('OUVRIR')}</span>
            ) : (
              <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='rgba(240,201,110,0.55)' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><rect x='4' y='11' width='16' height='10' rx='2' /><path d='M8 11V7a4 4 0 0 1 8 0v4' /></svg>
            )}
          </div>
        </div>
        {/* Face arriere : la carte */}
        <div className='adv-face adv-back' style={{ borderColor: col, boxShadow: '0 0 26px ' + col + '55, inset 0 0 30px ' + col + '22' }}>
          {w?.card && <img src={w.card.pictureUrl} alt={w.name} className='adv-img' draggable={false} />}
          <div className='adv-shine' />
          <div className='adv-score' style={{ background: col }}>{score}</div>
          <div className='adv-cap'><b>{w?.name}</b></div>
          {burst && <Burst color={col} />}
        </div>
      </div>
    </div>
  );
}

function Stage({ n, d, onClose, onPrev, onNext, hasPrev, hasNext, demo }: { n: number; d: DayData; onClose: () => void; onPrev: () => void; onNext: () => void; hasPrev: boolean; hasNext: boolean; demo: boolean }) {
  const w = d.top![0]; const col = tier(w.score);
  const score = useCountUp(w.score, true, 1400);
  const share = () => {
    const txt = `🏀 TTFL × @Sorare Arcade — ${t('CALENDRIER DE L’AVENT')} · ${t('Jour')} ${n}: ${w.name} (${w.score} TTFL)`;
    window.open('https://x.com/intent/tweet?text=' + encodeURIComponent(txt) + '&url=' + encodeURIComponent('https://mynftlocker.com/calendrier'), '_blank', 'noopener');
  };
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowLeft' && hasPrev) onPrev(); if (e.key === 'ArrowRight' && hasNext) onNext(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose, onPrev, onNext, hasPrev, hasNext]);
  const stat = (l: string, v: number) => (<div className='adv-stat'><b>{v}</b><span>{t(l)}</span></div>);
  return (
    <div className='adv-stage' onClick={onClose}>
      <div className='adv-stagebox' onClick={e => e.stopPropagation()} style={{ ['--tc' as any]: col }}>
        <button className='adv-x' onClick={onClose} aria-label={t('Fermer')}>✕</button>
        <div className='adv-stagecard'>
          {w.card && <img src={w.card.pictureUrl} alt={w.name} draggable={false} />}
          <div className='adv-shine' />
        </div>
        <div className='adv-stageinfo'>
          <div className='adv-kicker'>{t('Jour')} {n} · {d.date} {demo ? '· DEMO' : ''}</div>
          <div className='adv-sub'>{t('Meilleur score TTFL de la nuit')}</div>
          <h2 className='adv-name'>{w.name}</h2>
          <div className='adv-team'>{w.team}</div>
          <div className='adv-bigscore' style={{ color: col, textShadow: '0 0 28px ' + col + '99' }}>{score}<small>TTFL</small></div>
          <div className='adv-stats'>{stat('PTS', w.pts)}{stat('REB', w.reb)}{stat('PD', w.ast)}{stat('INT', w.stl)}{stat('CT', w.blk)}</div>
          <div className='adv-sub' style={{ marginTop: '1rem' }}>{t('Le top de la nuit')}</div>
          <div className='adv-top'>
            {d.top!.slice(1, 5).map((r, i) => (
              <div key={r.id} className='adv-toprow'>
                <span>{i + 2}</span>
                {r.card ? <img src={r.card.pictureUrl} alt='' /> : <i />}
                <em>{r.name}<small>{r.team}</small></em>
                <b style={{ color: tier(r.score) }}>{r.score}</b>
              </div>
            ))}
          </div>
          <div className='adv-cta'>
            <button className='adv-btn gold' onClick={share}>{t('Partager sur X')}</button>
            <a className='adv-btn' href='/'>{t('Découvrir myNFTlocker')}</a>
          </div>
          <div className='adv-nav'>
            <button disabled={!hasPrev} onClick={onPrev}>←</button>
            <button disabled={!hasNext} onClick={onNext}>→</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Calendar() {
  const lang = useLang();
  const [demo, setDemo] = useState(0);
  const [ready, setReady] = useState(false);
  const [openDay, setOpenDay] = useState(0);
  const [data, setData] = useState<Record<number, DayData>>({});
  const [loading, setLoading] = useState<Record<number, boolean>>({});
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const [burst, setBurst] = useState(0);
  const [stage, setStage] = useState(0);
  const [msg, setMsg] = useState('');
  const [left, setLeft] = useState('');
  const fetching = useRef<Record<number, Promise<DayData | null>>>({});

  useEffect(() => {
    initLang();
    const dm = Math.floor(Number(new URLSearchParams(window.location.search).get('demo') || 0)) || 0;
    setDemo(dm); setOpenDay(unlockedDays(dm));
    try { const f = JSON.parse(localStorage.getItem('mnfl_adv_flipped_' + (dm ? 'demo' : 'real')) || '{}'); setFlipped(f); } catch {}
    setReady(true);
  }, []);
  useEffect(() => { // compte a rebours avant le 1er decembre
    if (!ready || openDay > 0) return;
    const tick = () => { const diff = new Date(YEAR, 11, 1).getTime() - parisNow().getTime(); if (diff <= 0) { setOpenDay(unlockedDays(0)); return; } const d = Math.floor(diff / 864e5), h = Math.floor(diff / 36e5) % 24, m = Math.floor(diff / 6e4) % 60; setLeft(`${d} ${t('jours')} ${h} ${t('h')} ${m} ${t('min')}`); };
    tick(); const i = setInterval(tick, 30000); return () => clearInterval(i);
  }, [ready, openDay, lang]);

  const load = useCallback((n: number): Promise<DayData | null> => {
    if (n in fetching.current) return fetching.current[n];
    const p = fetch('/api/calendrier?day=' + n + (demo ? '&demo=' + demo : '')).then(r => r.json()).then((j: any) => {
      if (!j?.ok) return null;
      const dd: DayData = j; if (dd.open) dd.top?.forEach(r => { if (r.card) { const im = new Image(); im.src = r.card.pictureUrl; } });
      setData(s => ({ ...s, [n]: dd })); return dd;
    }).catch(() => null).finally(() => { delete fetching.current[n]; });
    fetching.current[n] = p; return p;
  }, [demo]);
  useEffect(() => { // prechargement des dernieres cases ouvertes pour que le retournement soit instantane
    if (!ready || openDay === 0) return;
    let cancel = false;
    (async () => { for (let n = openDay; n >= Math.max(1, openDay - 3) && !cancel; n--) await load(n); })();
    return () => { cancel = true; };
  }, [ready, openDay, load]);

  const saveFlipped = (f: Record<number, boolean>) => { try { localStorage.setItem('mnfl_adv_flipped_' + (demo ? 'demo' : 'real'), JSON.stringify(f)); } catch {} };
  const click = async (n: number) => {
    setMsg('');
    if (n > openDay) { setMsg(t('Cette case n’est pas encore ouverte.')); return; }
    if (flipped[n] && data[n]?.open) { setStage(n); return; }
    setLoading(s => ({ ...s, [n]: true }));
    const d = data[n] || await load(n);
    setLoading(s => ({ ...s, [n]: false }));
    if (!d) { setMsg(t('Impossible de charger cette case, réessaie dans un instant.')); return; }
    if (!d.open) { setMsg(t('Résultats disponibles vers 8 h (heure de Paris).')); return; }
    const f = { ...flipped, [n]: true }; setFlipped(f); saveFlipped(f); setBurst(n); setTimeout(() => setBurst(0), 1600);
  };
  const days = Array.from({ length: 24 }, (_, i) => i + 1);
  const stageData = stage ? data[stage] : undefined;
  const openedList = days.filter(n => flipped[n] && data[n]?.open);
  const idx = openedList.indexOf(stage);

  return (
    <main className='adv-root'>
      <style>{css}</style>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}><StarCanvas phase={0} burst={false} /></div>
      <div className='adv-wrap'>
        <header className='adv-head'>
          <a href='/' className='adv-home'>← {t('Retour au site')}</a>
          <LangSwitch />
        </header>
        <section className='adv-hero'>
          <div className='adv-eyebrow'>TTFL × SORARE ARCADE</div>
          <h1>{t('CALENDRIER DE L’AVENT')}</h1>
          <p>{t('Chaque matin de décembre, le meilleur score TTFL de la nuit NBA, sur sa carte Arcade gratuite de Sorare.')}</p>
          {ready && openDay === 0 && (<div className='adv-launch'><b>{t('Ouverture le 1er décembre')}</b>{left && <span>{left}</span>}<small>{t('Reviens chaque matin : une nouvelle case s’ouvre avec la nuit NBA de la veille.')}</small></div>)}
          {demo > 0 && <div className='adv-demo'>{t('Aperçu avec les vraies dernières nuits NBA')}</div>}
        </section>
        {msg && <div className='adv-msg'>{msg}</div>}
        <section className='adv-grid'>
          {days.map(n => (
            <Door key={n} n={n} openDay={openDay} d={data[n]} flipped={!!flipped[n] && !!data[n]?.open} loading={!!loading[n]} burst={burst === n} onClick={() => click(n)} />
          ))}
        </section>
        <section className='adv-promo'>
          <p>{t('Ta galerie Sorare, ton vestiaire, tes stats : gratuit sur myNFTlocker.')}</p>
          <a className='adv-btn gold' href='/'>{t('Découvrir myNFTlocker')}</a>
        </section>
        <footer className='adv-foot'>{t('Les scores TTFL sont calculés à partir des box scores NBA (points + rebonds + passes + interceptions + contres + tirs, 3 points et lancers francs réussis − tirs, 3 points et lancers francs ratés − balles perdues). Projet indépendant, non affilié à Sorare, à la NBA ni à la TTFL.')}</footer>
      </div>
      {stage > 0 && stageData?.open && stageData.top && (
        <Stage n={stage} d={stageData} demo={demo > 0} onClose={() => setStage(0)}
          hasPrev={idx > 0} hasNext={idx >= 0 && idx < openedList.length - 1}
          onPrev={() => setStage(openedList[idx - 1])} onNext={() => setStage(openedList[idx + 1])} />
      )}
    </main>
  );
}

const css = `
.adv-root{min-height:100vh;background:radial-gradient(ellipse 120% 80% at 50% -10%,#0b1426 0%,#050912 55%,#030510 100%);color:#cfe4fb;position:relative;overflow-x:hidden}
.adv-wrap{position:relative;z-index:1;max-width:1100px;margin:0 auto;padding:1.1rem 1.1rem 3rem}
.adv-head{display:flex;justify-content:space-between;align-items:center}
.adv-home{color:rgba(207,228,251,.65);font:600 .68rem 'Courier New',monospace;letter-spacing:.12em;text-decoration:none;text-transform:uppercase}
.adv-hero{text-align:center;padding:1.6rem 0 1.4rem}
.adv-eyebrow{font:700 .72rem 'Courier New',monospace;letter-spacing:.32em;color:${CYAN};text-shadow:0 0 12px ${CYAN}88}
.adv-hero h1{margin:.5rem 0 .6rem;font-size:clamp(1.8rem,6vw,3.4rem);font-weight:900;letter-spacing:.06em;line-height:1.05;background:linear-gradient(180deg,#fff2c4 0%,${GOLD} 45%,#b98a2e 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 18px rgba(240,201,110,.35))}
.adv-hero p{margin:0 auto;max-width:560px;font-size:.95rem;line-height:1.55;color:#aebfd6}
.adv-launch{margin:1.3rem auto 0;display:inline-flex;flex-direction:column;gap:.3rem;padding:.9rem 1.4rem;border:1px solid rgba(240,201,110,.45);border-radius:14px;background:rgba(240,201,110,.06)}
.adv-launch b{color:${GOLD};letter-spacing:.08em}.adv-launch span{font:700 1.1rem 'Courier New',monospace;color:${CYAN}}.adv-launch small{color:#8fa3bd;font-size:.74rem}
.adv-demo{margin-top:1rem;display:inline-block;padding:.3rem .8rem;border-radius:999px;border:1px dashed rgba(64,232,255,.5);color:${CYAN};font:600 .66rem 'Courier New',monospace;letter-spacing:.12em;text-transform:uppercase}
.adv-msg{text-align:center;margin:0 auto .8rem;padding:.55rem 1rem;max-width:520px;border-radius:10px;background:rgba(251,146,60,.12);border:1px solid rgba(251,146,60,.4);color:#fdba74;font-size:.82rem}
.adv-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:18px;margin-top:.6rem}
.adv-door{aspect-ratio:3/4.3;cursor:pointer;position:relative;-webkit-tap-highlight-color:transparent}
.adv-inner{position:absolute;inset:0;transform-style:preserve-3d;transition:transform .95s cubic-bezier(.3,.7,.2,1)}
.adv-inner.flipped{transform:rotateY(180deg)}
.adv-face{position:absolute;inset:0;border-radius:16px;backface-visibility:hidden;-webkit-backface-visibility:hidden;overflow:hidden}
.adv-front{background:linear-gradient(160deg,#0f1b2e 0%,#09101e 55%,#060a15 100%);border:1.5px solid rgba(240,201,110,.5);display:flex;align-items:center;justify-content:center;transition:transform .25s,box-shadow .25s}
.adv-front.avail{box-shadow:0 0 22px rgba(64,232,255,.28),inset 0 0 24px rgba(64,232,255,.08);border-color:rgba(240,201,110,.85);animation:advPulse 2.6s ease-in-out infinite}
.adv-front.avail:hover{transform:translateY(-4px) scale(1.03)}
.adv-front.locked{opacity:.62}
.adv-front:after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(45deg,rgba(255,255,255,.018) 0 2px,transparent 2px 6px);pointer-events:none}
.adv-arch{width:74%;height:82%;border:1.5px solid rgba(240,201,110,.45);border-radius:999px 999px 10px 10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.5rem;background:radial-gradient(ellipse at 50% 30%,rgba(64,232,255,.10),transparent 70%)}
.adv-num{font-size:clamp(2rem,5.2vw,3.1rem);font-weight:900;line-height:1;background:linear-gradient(180deg,#fff2c4,${GOLD} 55%,#b98a2e);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 10px rgba(240,201,110,.4))}
.adv-open{font:700 .55rem 'Courier New',monospace;letter-spacing:.2em;color:${CYAN}}
.adv-face.adv-back{transform:rotateY(180deg);background:#060a15;border:2px solid ${GOLD};display:block}
.adv-img{position:absolute;inset:6% 6% 16% 6%;width:88%;height:78%;object-fit:contain;filter:drop-shadow(0 6px 14px rgba(0,0,0,.6))}
.adv-shine{position:absolute;inset:0;background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.22) 50%,transparent 65%);transform:translateX(-120%);animation:advShine 3.4s ease-in-out infinite;pointer-events:none}
.adv-score{position:absolute;top:7px;right:7px;min-width:2.1rem;padding:.12rem .45rem;border-radius:999px;color:#04101a;font:900 clamp(.78rem,2.2vw,1.05rem) system-ui;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,.5)}
.adv-cap{position:absolute;left:0;right:0;bottom:0;padding:1.4rem .4rem .45rem;background:linear-gradient(0deg,rgba(3,5,12,.95),transparent);text-align:center;font-size:clamp(.55rem,1.6vw,.78rem);line-height:1.15;color:#fff}
.adv-p{position:absolute;left:50%;top:50%;border-radius:50%;opacity:0;animation:advBurst 1.2s ease-out forwards}
.adv-promo{margin:2.6rem auto 0;text-align:center}.adv-promo p{margin:0 0 .9rem;color:#aebfd6;font-size:.95rem}
.adv-btn{display:inline-block;cursor:pointer;padding:.7rem 1.4rem;border-radius:999px;border:1px solid rgba(64,232,255,.6);background:rgba(64,232,255,.08);color:${CYAN};font:700 .74rem 'Courier New',monospace;letter-spacing:.14em;text-transform:uppercase;text-decoration:none}
.adv-btn.gold{border-color:${GOLD};background:linear-gradient(180deg,rgba(240,201,110,.25),rgba(240,201,110,.08));color:#ffe9a8}
.adv-foot{margin:2.2rem auto 0;max-width:760px;text-align:center;color:#6f8099;font-size:.68rem;line-height:1.6}
.adv-stage{position:fixed;inset:0;z-index:50;background:rgba(2,4,10,.86);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:1rem;animation:advFade .3s}
.adv-stagebox{position:relative;display:flex;gap:2rem;align-items:center;max-width:900px;width:100%;max-height:94vh;overflow:auto;padding:1.6rem;border-radius:20px;border:1px solid var(--tc);background:radial-gradient(ellipse at 30% 20%,color-mix(in srgb,var(--tc) 22%,#0a1020),#060a15 70%);box-shadow:0 0 60px color-mix(in srgb,var(--tc) 45%,transparent)}
.adv-x{position:absolute;top:.6rem;right:.8rem;background:none;border:none;color:#9fb3cc;font-size:1.1rem;cursor:pointer;z-index:3}
.adv-stagecard{position:relative;flex:none;width:min(40%,calc(62vh * .714));aspect-ratio:3/4.2;animation:advRise 1s cubic-bezier(.2,.8,.2,1),advFloat 4s 1s ease-in-out infinite;overflow:hidden;border-radius:14px}
.adv-stagecard img{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 12px 26px rgba(0,0,0,.7))}
.adv-stageinfo{flex:1;min-width:0}
.adv-kicker{font:700 .66rem 'Courier New',monospace;letter-spacing:.2em;color:${CYAN};text-transform:uppercase}
.adv-sub{font:600 .64rem 'Courier New',monospace;letter-spacing:.16em;color:#8fa3bd;text-transform:uppercase;margin-top:.35rem}
.adv-name{margin:.3rem 0 0;font-size:clamp(1.4rem,4vw,2.1rem);color:#fff;line-height:1.1}
.adv-team{color:#9fb3cc;font-size:.85rem;margin-top:.15rem}
.adv-bigscore{font-size:clamp(3rem,9vw,5rem);font-weight:900;line-height:1;margin:.5rem 0}.adv-bigscore small{font-size:.9rem;margin-left:.4rem;letter-spacing:.2em;opacity:.8}
.adv-stats{display:flex;gap:.5rem;flex-wrap:wrap}.adv-stat{min-width:3.1rem;padding:.4rem .55rem;border-radius:10px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);text-align:center}
.adv-stat b{display:block;font-size:1.05rem;color:#fff}.adv-stat span{font:600 .55rem 'Courier New',monospace;letter-spacing:.14em;color:#8fa3bd}
.adv-top{display:flex;flex-direction:column;gap:.35rem;margin-top:.4rem}
.adv-toprow{display:flex;align-items:center;gap:.6rem;padding:.3rem .5rem;border-radius:10px;background:rgba(255,255,255,.04)}
.adv-toprow span{width:1rem;color:#8fa3bd;font-size:.75rem}.adv-toprow img,.adv-toprow i{width:26px;height:34px;object-fit:contain;flex:0 0 auto}
.adv-toprow em{flex:1;min-width:0;font-style:normal;color:#e6efff;font-size:.82rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.adv-toprow em small{display:block;color:#7a8da8;font-size:.64rem}
.adv-toprow b{font-size:1rem}
.adv-cta{display:flex;gap:.6rem;flex-wrap:wrap;margin-top:1rem}
.adv-nav{display:flex;gap:.5rem;margin-top:.8rem}.adv-nav button{width:2.2rem;height:2.2rem;border-radius:50%;border:1px solid rgba(255,255,255,.18);background:transparent;color:#cfe4fb;cursor:pointer}.adv-nav button:disabled{opacity:.25;cursor:default}
@keyframes advPulse{0%,100%{box-shadow:0 0 18px rgba(64,232,255,.22),inset 0 0 20px rgba(64,232,255,.06)}50%{box-shadow:0 0 34px rgba(64,232,255,.5),inset 0 0 28px rgba(64,232,255,.14)}}
@keyframes advShine{0%,55%{transform:translateX(-120%)}100%{transform:translateX(120%)}}
@keyframes advBurst{0%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(.2)}}
@keyframes advFade{from{opacity:0}to{opacity:1}}
@keyframes advRise{from{opacity:0;transform:translateY(40px) rotateY(90deg) scale(.7)}to{opacity:1;transform:none}}
@keyframes advFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@media(max-width:900px){.adv-grid{grid-template-columns:repeat(4,1fr);gap:14px}}
@media(max-width:640px){.adv-grid{grid-template-columns:repeat(3,1fr);gap:10px}.adv-stagebox{flex-direction:column;padding:1.1rem}.adv-stagecard{width:min(46%,calc(38vh * .714))}.adv-wrap{padding:.9rem .8rem 2.5rem}}
@media(prefers-reduced-motion:reduce){.adv-inner{transition-duration:.01s}.adv-shine,.adv-front.avail,.adv-stagecard{animation:none}.adv-p{display:none}}
`;
