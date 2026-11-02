'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import StarCanvas from '../components/StarCanvas';
import { useLang, initLang, LangSwitch, t, addEn, getLang } from '../i18n';
import { openDayNow, launchMoment, parisNow, tier, tierBg } from '../../lib/advent';
import { sfxShake, sfxReveal, sfxOpen, isMuted, setMuted, SHAKE_MS } from '../../lib/advSound';

addEn({
  'CALENDRIER DE L’AVENT': 'ADVENT CALENDAR',
  'Chaque matin de décembre, le meilleur score TTFL de la nuit NBA, sur sa carte Arcade gratuite de Sorare.': 'Every morning in December, the best TTFL score of the NBA night, on its free Sorare Arcade card.',
  'Ouverture le 1er décembre à 9 h': 'Opens on December 1st at 9 AM',
  'Reviens chaque matin à 9 h : une nouvelle case s’ouvre avec la nuit NBA de la veille.': 'Come back every morning at 9 AM: a new door opens with last night’s NBA action.',
  'Aperçu avec les vraies dernières nuits NBA': 'Preview with the real latest NBA nights',
  'Jour': 'Day',
  'OUVRIR': 'OPEN',
  'Résultats disponibles à 9 h (heure de Paris).': 'Results available at 9 AM (Paris time).',
  'Cette case n’est pas encore ouverte.': 'This door isn’t open yet.',
  'Impossible de charger cette case, réessaie dans un instant.': 'Could not load this door, please try again in a moment.',
  'Meilleur score TTFL de la nuit': 'Best TTFL score of the night',
  'Le top de la nuit': 'Top of the night',
  'Partager sur X': 'Share on X',
  'Partager': 'Share', 'Télécharger': 'Download', 'Copier l’image': 'Copy image', 'Copier le lien': 'Copy link',
  'Image téléchargée': 'Image downloaded', 'Image copiée': 'Image copied', 'Lien copié': 'Link copied', 'Partage impossible': 'Sharing failed', 'Copie impossible': 'Copy failed',
  'Préparation de l’image…': 'Preparing the image…',
  'Découvrir myNFTlocker': 'Discover myNFTlocker',
  'Fermer': 'Close',
  'Ta galerie Sorare, ton vestiaire, tes stats : gratuit sur myNFTlocker.': 'Your Sorare gallery, your locker room, your stats: free on myNFTlocker.',
  'Carte Arcade': 'Arcade card',
  'Carte classique': 'Classic card',
  'PTS': 'PTS', 'REB': 'REB', 'PD': 'AST', 'INT': 'STL', 'CT': 'BLK',
  'Les scores TTFL sont calculés à partir des box scores NBA (points + rebonds + passes + interceptions + contres + tirs, 3 points et lancers francs réussis − tirs, 3 points et lancers francs ratés − balles perdues). Projet indépendant, non affilié à Sorare, à la NBA ni à la TTFL. Le lien Sorare est un lien de parrainage.': 'TTFL scores are computed from NBA box scores (points + rebounds + assists + steals + blocks + made field goals, threes and free throws − missed field goals, threes and free throws − turnovers). Independent project, not affiliated with Sorare, the NBA or TTFL. The Sorare link is a referral link.',
  'Retour au site': 'Back to the site',
  'Présenté par': 'Presented by',
  'jours': 'days', 'h': 'h', 'min': 'min',
  'Clique sur une carte retournée pour voir le détail du joueur': 'Tap a flipped card to see the player details',
  'Score Sorare': 'Sorare score',
  'Rejoindre Sorare': 'Join Sorare',
  'Jouer à la TTFL': 'Play TTFL',
  'Le lien Sorare est un lien de parrainage.': 'The Sorare link is a referral link.',
  'heures': 'hours', 'minutes': 'minutes', 'secondes': 'seconds',
  'Voir un aperçu': 'See a preview',
  'Aperçu · dernière nuit NBA': 'Preview · last NBA night',
  'Série': 'Streak', 'jour d’affilée': 'day in a row', 'jours d’affilée': 'days in a row',
  'cases ouvertes': 'doors opened',
  'NOUVEAU': 'NEW',
  'Comment ça marche': 'How it works',
  'Chaque matin à 9 h': 'Every morning at 9 AM',
  'Une nouvelle case s’ouvre avec la nuit NBA de la veille : le joueur au meilleur score TTFL.': 'A new door opens with last night’s NBA action: the player with the best TTFL score.',
  'Ouvre le pack': 'Open the pack',
  'Clique sur la case : le pack s’ouvre et révèle la carte Arcade du joueur, avec son score TTFL et son score Sorare.': 'Click the door: the pack opens and reveals the player’s Arcade card, with their TTFL score and their Sorare score.',
  'Joue gratuitement': 'Play for free',
  'Les cartes Arcade sont gratuites : crée ton équipe sur Sorare et défie la TTFL avec les mêmes joueurs.': 'Arcade cards are free: build your team on Sorare and take on TTFL with the same players.',
  'Questions fréquentes': 'FAQ',
  'C’est quoi le score TTFL ?': 'What is the TTFL score?',
  'Un score de fantasy NBA : points + rebonds + passes + interceptions + contres + tirs réussis, moins les tirs ratés et les balles perdues. Chaque nuit, les meilleurs scores font la une.': 'An NBA fantasy score: points + rebounds + assists + steals + blocks + made shots, minus missed shots and turnovers. Every night, the top scores make the headlines.',
  'C’est quoi Sorare Arcade ?': 'What is Sorare Arcade?',
  'Le mode gratuit de Sorare : des cartes communes, un pack offert chaque jour, pour jouer sans rien payer.': 'The free mode of Sorare: common cards, a free pack every day, to play without paying anything.',
  'Pourquoi 9 h ?': 'Why 9 AM?',
  'Pour que tous les matchs de la nuit NBA soient terminés et leurs statistiques publiées. Chaque case s’ouvre ensuite à 9 h, heure de Paris.': 'So that every game of the NBA night is over and its stats are published. Each door then opens at 9 AM Paris time.',
  'Pourquoi des éditions différentes ?': 'Why different editions?',
  'Les cartes Arcade existent en 3 versions. On les fait tourner tous les 3 jours, et le jour 24 s’ouvre une carte Limited.': 'Arcade cards come in 3 versions. We rotate them every 3 days, and on day 24 a Limited card opens.',
  'Tu aimes ? Crée ta galerie gratuite.': 'Enjoying it? Create your free gallery.',
  'Son': 'Sound',
  'Verrouillé': 'Locked',
});

type Card = { slug: string; playerSlug: string; name: string; pictureUrl: string; kind: 'arcade' | 'classic' };
type Row = { id: string; name: string; team: string; score: number; pts: number; reb: number; ast: number; stl: number; blk: number; to: number; card: Card | null; sorare?: number | null };
type DayData = { edition?: string; open: boolean; pending?: boolean; day: number; date?: string; games?: number; top?: Row[] };

const GOLD = '#f0c96e';
const CYAN = '#40e8ff';
const unlockedDays = (demo: number) => (demo > 0 ? Math.min(24, demo) : openDayNow());
const rowCol = (r: { sorare?: number | null }) => (r.sorare != null ? tier(r.sorare) : GOLD); // couleur = score Sorare
const rowBg = (r: { sorare?: number | null }) => (r.sorare != null ? tierBg(r.sorare) : GOLD);

const EDN: Record<string, string> = { standard: 'Standard', shiny: 'Shiny', shiny_variant_1: 'Shiny', holo: 'Holo', limited: 'Limited' };
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

// Compte a rebours "flip clock" jusqu'a l'ouverture de la premiere case
function Countdown({ onDone }: { onDone: () => void }) {
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => { const diff = launchMoment().getTime() - parisNow().getTime(); if (diff <= 0) { onDone(); return; } setMs(diff); };
    tick(); const i = setInterval(tick, 1000); return () => clearInterval(i);
  }, [onDone]);
  if (ms == null) return null;
  const v = [Math.floor(ms / 864e5), Math.floor(ms / 36e5) % 24, Math.floor(ms / 6e4) % 60, Math.floor(ms / 1e3) % 60];
  const lab = ['jours', 'heures', 'minutes', 'secondes'];
  return (
    <div className='adv-clock'>
      {v.map((x, i) => (
        <div key={i} className='adv-unit'><div className='adv-digits'>{String(x).padStart(2, '0')}</div><span>{t(lab[i])}</span></div>
      ))}
    </div>
  );
}

function Door({ n, openDay, d, flipped, loading, shaking, burst, isNew, onClick }: { n: number; openDay: number; d?: DayData; flipped: boolean; loading: boolean; shaking: boolean; burst: boolean; isNew: boolean; onClick: () => void }) {
  const avail = n <= openDay;
  const w = d?.top?.[0];
  const col = w ? rowCol(w) : GOLD;
  const score = useCountUp(w?.sorare ?? w?.score ?? 0, flipped && !!w);
  return (
    <div className={'adv-door' + (flipped ? ' opened' : '') + (n === 24 ? ' finale' : '')} style={{ perspective: '900px', ['--fd' as any]: (n % 7) * 0.35 + 's' }} onClick={onClick} role='button' tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }} aria-label={t('Jour') + ' ' + n + ' — ' + (flipped && w ? w.name : avail ? t('OUVRIR') : t('Verrouillé'))}>
      <div className={'adv-inner' + (flipped ? ' flipped' : '')}>
        {/* Face avant : le pack, avec le numero du jour a la place du bouclier */}
        <div className={'adv-face adv-front' + (avail ? ' avail' : ' locked') + (shaking ? ' shaking' : '')}>
          <div className='adv-packbox'>
            <img src='/logo-pack-blank.png' alt='' className='adv-pack' draggable={false} />
            <span className='adv-medal'><b>{n}</b></span>
          </div>
          {isNew && <span className='adv-new'>{t('NOUVEAU')}</span>}
          {avail && <span className='adv-open'>{loading ? '…' : t('OUVRIR')}</span>}
          {!avail && (
            <svg className='adv-lock' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='rgba(240,201,110,0.8)' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><rect x='4' y='11' width='16' height='10' rx='2' /><path d='M8 11V7a4 4 0 0 1 8 0v4' /></svg>
          )}
          {shaking && <div className='adv-flash' />}
        </div>
        {/* Face arriere : la carte, plein format */}
        <div className='adv-face adv-back'>
          {w?.card && <img src={w.card.pictureUrl} alt={w.name} className='adv-img' draggable={false} style={{ filter: 'drop-shadow(0 0 2px ' + col + ') drop-shadow(0 0 12px ' + col + '99)' }} />}
          <div className='adv-shinewrap'><div className='adv-shine' /></div>
          <div className='adv-score' style={{ background: w ? rowBg(w) : col }}>{score}</div>
          <div className='adv-daybadge'>{n}</div>
          <div className='adv-detail' aria-hidden='true'>⌕</div>
          {burst && <Burst color={col} />}
        </div>
      </div>
    </div>
  );
}

function Stage({ n, d, onClose, onPrev, onNext, hasPrev, hasNext, demo, preview, ogQ }: { n: number; d: DayData; onClose: () => void; onPrev: () => void; onNext: () => void; hasPrev: boolean; hasNext: boolean; demo: boolean; preview?: boolean; ogQ: string }) {
  const w = d.top![0]; const col = rowCol(w);
  const score = useCountUp(w.score, true, 1400);
  const sScore = useCountUp(w.sorare ?? 0, w.sorare != null, 1400);
  const LQ = getLang() === 'en' ? '&lang=en' : ''; // la langue suit le lien partage (apercu et page)
  const link = 'https://mynftlocker.com/calendrier?day=' + n + LQ;
  const txt = `🎁 ${t('Jour')} ${n} — ${t('CALENDRIER DE L’AVENT')} TTFL × @Sorare Arcade\n🏀 ${w.name} : ${w.score} TTFL${w.sorare != null ? ' · ' + w.sorare + ' Sorare' : ''}`;
  // Image de partage (meme visuel que l'apercu sur X), preparee a l'avance pour partager / telecharger / copier
  const [img, setImg] = useState<{ blob: Blob; file: File } | null>(null);
  const [imgFail, setImgFail] = useState(false);
  const [msg, setMsg] = useState('');
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 2500); };
  useEffect(() => {
    let dead = false; setImg(null); setImgFail(false);
    fetch('/api/calendrier/og?day=' + n + ogQ + LQ).then(r => r.ok ? r.blob() : Promise.reject()).then(b => { if (!dead) setImg({ blob: b, file: new File([b], 'calendrier-avent-jour-' + n + '.png', { type: 'image/png' }) }); }).catch(() => { if (!dead) setImgFail(true); });
    return () => { dead = true; };
  }, [n, ogQ, LQ]);
  const canShare = !!img && typeof navigator !== 'undefined' && !!(navigator as any).canShare && (navigator as any).canShare({ files: [img.file] });
  const canCopy = typeof window !== 'undefined' && !!(window as any).ClipboardItem && !!navigator.clipboard?.write;
  const doShare = async () => { if (!img) return; try { await (navigator as any).share({ files: [img.file], title: w.name, text: txt + '\n' + link }); } catch (e: any) { if (!e || e.name !== 'AbortError') flash(t('Partage impossible')); } };
  const doDownload = () => { if (!img) return; const a = document.createElement('a'); a.href = URL.createObjectURL(img.blob); a.download = img.file.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); flash(t('Image téléchargée')); };
  const doCopy = async () => { if (!img) return; try { await (navigator.clipboard as any).write([new (window as any).ClipboardItem({ 'image/png': img.blob })]); flash(t('Image copiée')); } catch { flash(t('Copie impossible')); } };
  const doCopyLink = async () => { try { await navigator.clipboard.writeText(link); flash(t('Lien copié')); } catch { flash(t('Copie impossible')); } };
  const ico = (d: React.ReactNode) => (<svg viewBox='0 0 24 24' width='14' height='14' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>{d}</svg>);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowLeft' && hasPrev) onPrev(); if (e.key === 'ArrowRight' && hasNext) onNext(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose, onPrev, onNext, hasPrev, hasNext]);
  const stat = (l: string, v: number) => (<div className='adv-stat'><b>{v}</b><span>{t(l)}</span></div>);
  return (
    <div className='adv-stage' onClick={onClose} role='dialog' aria-modal='true' aria-label={w.name}>
      <div className='adv-stagebox' onClick={e => e.stopPropagation()} style={{ ['--tc' as any]: col }}>
        <button className='adv-x' onClick={onClose} aria-label={t('Fermer')}>✕</button>
        <div className='adv-stagecard'>
          {w.card && <img src={w.card.pictureUrl} alt={w.name} draggable={false} />}
          <div className='adv-shine' />
        </div>
        <div className='adv-stageinfo'>
          <div className='adv-kicker'>{preview ? t('Aperçu · dernière nuit NBA') + ' · ' + d.date : <>{t('Jour')} {n} · {d.date} {demo ? '· DEMO' : ''}</>}{d.edition && <span className='adv-ed'>{EDN[d.edition] || d.edition}</span>}</div>
          <div className='adv-sub adv-subttfl'><img src='/logo-ttfl.png' alt='TTFL' />{t('Meilleur score TTFL de la nuit')}</div>
          <h2 className='adv-name'>{w.name}</h2>
          <div className='adv-team'>{w.team}</div>
          <div className='adv-scores'>
            <div className='adv-bigscore' style={{ color: '#fff' }}><img src='/logo-ttfl-text.png' alt='TTFL' className='adv-ttflword' />{score}</div>
          </div>
          <div className='adv-stats'>{stat('PTS', w.pts)}{stat('REB', w.reb)}{stat('PD', w.ast)}{stat('INT', w.stl)}{stat('CT', w.blk)}{w.sorare != null && <div className='adv-stat adv-stat-s' title={t('Score Sorare')} aria-label={t('Score Sorare') + ' ' + sScore} style={{ borderColor: col, boxShadow: '0 0 16px ' + col + '66' }}><b style={{ color: col }}>{sScore}</b><img src='/sorare-logo.png' alt='' /></div>}</div>
          <div className='adv-sub' style={{ marginTop: '1rem' }}>{t('Le top de la nuit')}</div>
          <div className='adv-top'>
            {d.top!.slice(1, 5).map((r, i) => (
              <div key={r.id} className='adv-toprow'>
                <span>{i + 2}</span>
                {r.card ? <img src={r.card.pictureUrl} alt='' /> : <i />}
                <em>{r.name}<small>{r.team}</small></em>
                <b>{r.score}</b>{r.sorare != null && <u style={{ background: rowBg(r) }}>{r.sorare}</u>}
              </div>
            ))}
          </div>
          <div className='adv-sharerow'>
            {canShare && <button className='adv-btn' onClick={doShare}>{ico(<><circle cx='18' cy='5' r='3' /><circle cx='6' cy='12' r='3' /><circle cx='18' cy='19' r='3' /><path d='M8.6 13.5l6.8 4M15.4 6.5l-6.8 4' /></>)}{t('Partager')}</button>}
            {!imgFail && <button className='adv-btn' disabled={!img} onClick={doDownload}>{ico(<><path d='M12 3v12' /><path d='M8 11l4 4 4-4' /><path d='M5 21h14' /></>)}{t('Télécharger')}</button>}
            {canCopy && !imgFail && <button className='adv-btn' disabled={!img} onClick={doCopy}>{ico(<><rect x='9' y='9' width='12' height='12' rx='2' /><path d='M5 15V5a2 2 0 012-2h10' /></>)}{t('Copier l’image')}</button>}
          </div>
          <div className='adv-cta' style={{ marginTop: '.5rem' }}>
            <button className='adv-btn' onClick={doCopyLink}>{ico(<><path d='M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1' /><path d='M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1' /></>)}{t('Copier le lien')}</button>
            <a className='adv-btn' href='/'>{t('Découvrir myNFTlocker')}</a>
          </div>
          <div className='adv-cta' style={{ marginTop: '.6rem' }}>
            <a className='adv-btn' href={'/api/go?to=sorare&day=' + n} target='_blank' rel='noopener nofollow sponsored'>{t('Rejoindre Sorare')}</a>
            <a className='adv-btn' href={'/api/go?to=ttfl&day=' + n} target='_blank' rel='noopener nofollow'>{t('Jouer à la TTFL')}</a>
          </div>
          <div className='adv-ref'>{msg || (!img && !imgFail ? t('Préparation de l’image…') : t('Le lien Sorare est un lien de parrainage.'))}</div>
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
  const [shaking, setShaking] = useState(0);
  const [hintSeen, setHintSeen] = useState(true);
  const [msg, setMsg] = useState('');
  const [muted, setMutedS] = useState(false);
  const [streak, setStreak] = useState(0);
  const [preview, setPreview] = useState<DayData | null>(null);
  const [ctaOpen, setCtaOpen] = useState(false);
  const stageSeen = useRef(false);
  const fetching = useRef<Record<number, Promise<DayData | null>>>({});

  useEffect(() => {
    initLang();
    const dm = Math.floor(Number(new URLSearchParams(window.location.search).get('demo') || 0)) || 0;
    setDemo(dm); setOpenDay(unlockedDays(dm));
    // En demo, rien n'est memorise : chaque visite repart avec toutes les cases fermees (les anciennes ouvertures de test ne reviennent pas)
    if (!dm) { try { const f = JSON.parse(localStorage.getItem('mnfl_adv_flipped_real') || '{}'); setFlipped(f); } catch {} }
    try { setHintSeen(localStorage.getItem('mnfl_adv_hint') === '1'); } catch {}
    setMutedS(isMuted());
    setReady(true);
  }, []);
  useEffect(() => { // serie de jours consecutifs (mode reel uniquement, stockee dans le navigateur)
    if (!ready || demo || openDay === 0) return;
    try {
      const v: number[] = JSON.parse(localStorage.getItem('mnfl_adv_visits') || '[]');
      if (!v.includes(openDay)) v.push(openDay);
      localStorage.setItem('mnfl_adv_visits', JSON.stringify(v));
      let k = 0; for (let d = openDay; v.includes(d); d--) k++;
      setStreak(k);
    } catch {}
  }, [ready, demo, openDay]);

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

  const saveFlipped = (f: Record<number, boolean>) => { if (demo) return; try { localStorage.setItem('mnfl_adv_flipped_real', JSON.stringify(f)); } catch {} };
  const click = async (n: number) => {
    setMsg('');
    if (n > openDay) { setMsg(t('Cette case n’est pas encore ouverte.')); return; }
    if (flipped[n] && data[n]?.open) { stageSeen.current = true; sfxOpen(); setStage(n); if (!hintSeen) { setHintSeen(true); try { localStorage.setItem('mnfl_adv_hint', '1'); } catch {} } return; }
    setLoading(s => ({ ...s, [n]: true }));
    const d = data[n] || await load(n);
    setLoading(s => ({ ...s, [n]: false }));
    if (!d) { setMsg(t('Impossible de charger cette case, réessaie dans un instant.')); return; }
    if (!d.open) { setMsg(t('Résultats disponibles à 9 h (heure de Paris).')); return; }
    // ouverture du pack : il tremble et s'illumine, puis la carte se retourne
    setShaking(n); sfxShake(); await new Promise(r => setTimeout(r, SHAKE_MS)); setShaking(0);
    sfxReveal((d.top?.[0]?.sorare ?? 0) >= 75);
    const f = { ...flipped, [n]: true }; setFlipped(f); saveFlipped(f); setBurst(n); setTimeout(() => setBurst(0), 1600);
  };
  const closeStage = () => { setStage(0); let seen = false; try { seen = localStorage.getItem('mnfl_adv_cta') === '1'; } catch {} if (!seen && stageSeen.current && !demo) setCtaOpen(true); };
  const closeCta = () => { setCtaOpen(false); try { localStorage.setItem('mnfl_adv_cta', '1'); } catch {} };
  const showPreview = async () => { const r = await fetch('/api/calendrier?day=1&demo=1').then(x => x.json()).catch(() => null); if (r?.ok && r.open) { r.top?.forEach((x: Row) => { if (x.card) { const im = new Image(); im.src = x.card.pictureUrl; } }); sfxOpen(); setPreview(r); } };
  const toggleMute = () => { const m = !muted; setMuted(m); setMutedS(m); };
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
          <div className='adv-headr'>
            <button className='adv-mute' onClick={toggleMute} aria-label={t('Son')} title={t('Son')}>{muted ? '🔇' : '🔊'}</button>
            <LangSwitch />
          </div>
        </header>
        <section className='adv-hero'>
          <div className='adv-logos'>
            <img src='/logo-ttfl.png' alt='TTFL' className='adv-ttfl' /><i>×</i>
            <span className='adv-sorare'><img src='/sorare-logo.png' alt='' />SORARE <em>ARCADE</em></span>
          </div>
          <a href='/' className='adv-by'><span>{t('Présenté par')}</span><img src='/logo-rond.png' alt='' />myNFTlocker</a>
          <h1>{t('CALENDRIER DE L’AVENT')}</h1>
          <p>{t('Chaque matin de décembre, le meilleur score TTFL de la nuit NBA, sur sa carte Arcade gratuite de Sorare.')}</p>
          {ready && openDay === 0 && (
            <div className='adv-launch'>
              <b>{t('Ouverture le 1er décembre à 9 h')}</b>
              <Countdown onDone={() => setOpenDay(unlockedDays(0))} />
              <small>{t('Reviens chaque matin à 9 h : une nouvelle case s’ouvre avec la nuit NBA de la veille.')}</small>
              <button className='adv-btn' onClick={showPreview}>{t('Voir un aperçu')}</button>
            </div>
          )}
          {ready && openDay > 0 && (
            <div className='adv-ritual'>
              {streak > 0 && <span className='adv-streak'>🔥 {t('Série')} : {streak} {t(streak > 1 ? 'jours d’affilée' : 'jour d’affilée')}</span>}
              <span className='adv-prog'><i style={{ width: (openedList.length / openDay * 100) + '%' }} /><b>{openedList.length}/{openDay} {t('cases ouvertes')}</b></span>
            </div>
          )}
          {demo > 0 && <div className='adv-demo'>{t('Aperçu avec les vraies dernières nuits NBA')}</div>}
        </section>
        {msg && <div className='adv-msg'>{msg}</div>}
        {!msg && !hintSeen && openedList.length > 0 && <div className='adv-hint'>{t('Clique sur une carte retournée pour voir le détail du joueur')}</div>}
        <section className='adv-grid'>
          {days.map(n => (
            <Door key={n} n={n} openDay={openDay} d={data[n]} flipped={!!flipped[n] && !!data[n]?.open} loading={!!loading[n]} shaking={shaking === n} burst={burst === n} isNew={n === openDay && !flipped[n]} onClick={() => click(n)} />
          ))}
        </section>
        <section className='adv-how'>
          <h2>{t('Comment ça marche')}</h2>
          <div className='adv-steps'>
            {[['1', 'Chaque matin à 9 h', 'Une nouvelle case s’ouvre avec la nuit NBA de la veille : le joueur au meilleur score TTFL.'], ['2', 'Ouvre le pack', 'Clique sur la case : le pack s’ouvre et révèle la carte Arcade du joueur, avec son score TTFL et son score Sorare.'], ['3', 'Joue gratuitement', 'Les cartes Arcade sont gratuites : crée ton équipe sur Sorare et défie la TTFL avec les mêmes joueurs.']].map(([k, a, b]) => (
              <div key={k} className='adv-step'><span>{k}</span><b>{t(a)}</b><p>{t(b)}</p></div>
            ))}
          </div>
          <h2 style={{ marginTop: '2rem' }}>{t('Questions fréquentes')}</h2>
          <div className='adv-faq'>
            {[['C’est quoi le score TTFL ?', 'Un score de fantasy NBA : points + rebonds + passes + interceptions + contres + tirs réussis, moins les tirs ratés et les balles perdues. Chaque nuit, les meilleurs scores font la une.'], ['C’est quoi Sorare Arcade ?', 'Le mode gratuit de Sorare : des cartes communes, un pack offert chaque jour, pour jouer sans rien payer.'], ['Pourquoi 9 h ?', 'Pour que tous les matchs de la nuit NBA soient terminés et leurs statistiques publiées. Chaque case s’ouvre ensuite à 9 h, heure de Paris.'], ['Pourquoi des éditions différentes ?', 'Les cartes Arcade existent en 3 versions. On les fait tourner tous les 3 jours, et le jour 24 s’ouvre une carte Limited.']].map(([q, a]) => (
              <details key={q}><summary>{t(q)}</summary><p>{t(a)}</p></details>
            ))}
          </div>
        </section>
        <section className='adv-promo'>
          <p>{t('Ta galerie Sorare, ton vestiaire, tes stats : gratuit sur myNFTlocker.')}</p>
          <a className='adv-btn' href='/'>{t('Découvrir myNFTlocker')}</a>
        </section>
        <footer className='adv-foot'>{t('Les scores TTFL sont calculés à partir des box scores NBA (points + rebonds + passes + interceptions + contres + tirs, 3 points et lancers francs réussis − tirs, 3 points et lancers francs ratés − balles perdues). Projet indépendant, non affilié à Sorare, à la NBA ni à la TTFL. Le lien Sorare est un lien de parrainage.')}</footer>
      </div>
      {stage > 0 && stageData?.open && stageData.top && (
        <Stage n={stage} d={stageData} demo={demo > 0} ogQ={demo > 0 ? '&demo=' + demo : ''} onClose={closeStage}
          hasPrev={idx > 0} hasNext={idx >= 0 && idx < openedList.length - 1}
          onPrev={() => setStage(openedList[idx - 1])} onNext={() => setStage(openedList[idx + 1])} />
      )}
      {preview && preview.top && (
        <Stage n={1} d={preview} demo preview ogQ='&demo=1' onClose={() => setPreview(null)} hasPrev={false} hasNext={false} onPrev={() => {}} onNext={() => {}} />
      )}
      {ctaOpen && (
        <div className='adv-toast'>
          <p>{t('Tu aimes ? Crée ta galerie gratuite.')}</p>
          <a className='adv-btn' href='/'>{t('Découvrir myNFTlocker')}</a>
          <button onClick={closeCta} aria-label={t('Fermer')}>✕</button>
        </div>
      )}
    </main>
  );
}

const css = `
@font-face{font-family:'AdvGraduate';src:url('/fonts/graduate.woff2') format('woff2');font-display:swap}
.adv-root{min-height:100vh;background:radial-gradient(ellipse 120% 80% at 50% -10%,#0b1426 0%,#050912 55%,#030510 100%);color:#cfe4fb;position:relative;overflow-x:hidden}
.adv-wrap{position:relative;z-index:1;max-width:1100px;margin:0 auto;padding:1.1rem 1.1rem 3rem}
.adv-head{display:flex;justify-content:space-between;align-items:center}
.adv-home{color:rgba(207,228,251,.65);font:600 .68rem 'Courier New',monospace;letter-spacing:.12em;text-decoration:none;text-transform:uppercase}
.adv-hero{text-align:center;padding:1.6rem 0 1.4rem}
.adv-hero h1{margin:.5rem 0 .6rem;font-size:clamp(1.8rem,6vw,3.4rem);font-weight:900;letter-spacing:.06em;line-height:1.05;background:linear-gradient(180deg,#fff2c4 0%,${GOLD} 45%,#b98a2e 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 18px rgba(240,201,110,.35))}
.adv-hero p{margin:0 auto;max-width:560px;font-size:.95rem;line-height:1.55;color:#aebfd6}
.adv-launch{margin:1.3rem auto 0;display:inline-flex;flex-direction:column;gap:.3rem;padding:.9rem 1.4rem;border:1px solid rgba(240,201,110,.45);border-radius:14px;background:rgba(240,201,110,.06)}
.adv-launch b{color:${GOLD};letter-spacing:.08em}.adv-launch span{font:700 1.1rem 'Courier New',monospace;color:${CYAN}}.adv-launch small{color:#8fa3bd;font-size:.74rem}
.adv-demo{margin-top:1rem;display:inline-block;padding:.3rem .8rem;border-radius:999px;border:1px dashed rgba(64,232,255,.5);color:${CYAN};font:600 .66rem 'Courier New',monospace;letter-spacing:.12em;text-transform:uppercase}
.adv-msg{text-align:center;margin:0 auto .8rem;padding:.55rem 1rem;max-width:520px;border-radius:10px;background:rgba(251,146,60,.12);border:1px solid rgba(251,146,60,.4);color:#fdba74;font-size:.82rem}
.adv-door:focus-visible{outline:2px solid #40e8ff;outline-offset:4px;border-radius:16px}
.adv-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:24px 18px;margin-top:.6rem}
.adv-inner{position:absolute;inset:0;transform-style:preserve-3d;transition:transform .95s cubic-bezier(.3,.7,.2,1)}
.adv-inner.flipped{transform:rotateY(180deg)}
.adv-face{position:absolute;inset:0;border-radius:16px;backface-visibility:hidden;-webkit-backface-visibility:hidden;overflow:hidden}
.adv-ttfl{height:46px;width:auto;display:block}
.adv-sorare img{width:40px;height:40px}
.adv-medal{position:absolute;left:50%;top:27.2%;transform:translate(-50%,-50%);line-height:1}
.adv-medal b{display:block;font-weight:400;font-family:'AdvGraduate','Arial Black',Impact,sans-serif;font-size:clamp(1.9rem,6vw,3.5rem);line-height:1;letter-spacing:.01em;background:linear-gradient(180deg,#fff7cf 0%,#f6d77f 26%,#d9a23a 50%,#8d5c12 52%,#e8bd55 76%,#fff0b0 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 1px 0 #3d2604) drop-shadow(0 -1px 0 #3d2604) drop-shadow(1px 0 0 #3d2604) drop-shadow(-1px 0 0 #3d2604) drop-shadow(0 4px 5px rgba(0,0,0,.65))}
.adv-cta{display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin-top:1rem}.adv-cta .adv-btn{text-align:center;padding:.7rem .6rem}
.adv-promo .adv-btn{display:inline-block}
@media(max-width:640px){.adv-ttfl{height:36px}.adv-sorare img{width:32px;height:32px}.adv-sorare{font-size:.9rem}}
.adv-logos{display:flex;align-items:center;justify-content:center;gap:.8rem;flex-wrap:wrap}
.adv-by{display:inline-flex;align-items:center;gap:.45rem;margin-top:.7rem;color:#cfe4fb;font:700 .72rem 'Courier New',monospace;letter-spacing:.1em;text-decoration:none;opacity:.9}.adv-by span{color:#8fa3bd;font-weight:400;text-transform:uppercase}.adv-by img{width:20px;height:20px;border-radius:50%}.adv-by:hover{color:#00ffff}.adv-subttfl{display:flex;align-items:center;gap:.5rem}.adv-subttfl img{height:22px;width:auto}
.adv-logos i{font-style:normal;color:#8fa3bd;font-size:1.1rem}
.adv-sorare{display:inline-flex;align-items:center;gap:.5rem;font:800 1.05rem system-ui;letter-spacing:.16em;color:#fff}.adv-sorare img{width:34px;height:34px;object-fit:contain}.adv-sorare em{font-style:normal;color:${CYAN};letter-spacing:.2em;font-size:.8rem}
.adv-door{aspect-ratio:5/8;cursor:pointer;position:relative;-webkit-tap-highlight-color:transparent}
.adv-door.opened{animation:advFloat 4.2s ease-in-out infinite;animation-delay:var(--fd)}
.adv-door.opened:hover{animation-play-state:paused}
.adv-front{display:flex;align-items:center;justify-content:center;border-radius:0;overflow:visible;transition:transform .25s,filter .25s}
.adv-front.avail{filter:drop-shadow(0 0 14px rgba(64,232,255,.45));animation:advPack 3s ease-in-out infinite;animation-delay:var(--fd)}
.adv-front.avail:hover{transform:translateY(-4px) scale(1.04);filter:drop-shadow(0 0 24px rgba(64,232,255,.8))}
.adv-front.locked{filter:grayscale(.75) brightness(.55)}
.adv-front.shaking{animation:advShake 1.1s linear both;filter:drop-shadow(0 0 30px #fff)}
.adv-packbox{position:absolute;left:50%;top:50%;height:119%;aspect-ratio:896/1200;transform:translate(-50%,-50%);pointer-events:none}
.adv-pack{width:100%;height:100%;display:block}
.adv-open{position:absolute;left:50%;bottom:3%;transform:translateX(-50%);padding:.15rem .6rem;border-radius:999px;background:rgba(3,10,22,.82);border:1px solid ${CYAN};font:700 .52rem 'Courier New',monospace;letter-spacing:.2em;color:${CYAN};white-space:nowrap}
.adv-lock{position:absolute;left:50%;bottom:6%;transform:translateX(-50%)}
.adv-flash{position:absolute;inset:-20%;background:radial-gradient(circle,rgba(255,255,255,.95),rgba(64,232,255,.4) 40%,transparent 70%);animation:advFlash .65s ease-in both;pointer-events:none}
.adv-face.adv-back{transform:rotateY(180deg);background:transparent;display:block;overflow:visible}
.adv-img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}
.adv-daybadge{position:absolute;top:7px;left:7px;width:1.6rem;height:1.6rem;border-radius:50%;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 35% 30%,#fff2c4,${GOLD} 50%,#8a6418);color:#2a1c04;font:900 .8rem system-ui;box-shadow:0 2px 8px rgba(0,0,0,.6)}
.adv-detail{position:absolute;right:7px;bottom:7px;width:1.7rem;height:1.7rem;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(3,10,22,.8);border:1.5px solid ${CYAN};color:${CYAN};font-size:1.05rem;line-height:1;animation:advTap 1.8s ease-in-out infinite}
.adv-hint{text-align:center;margin:0 auto .9rem;padding:.5rem 1rem;max-width:520px;border-radius:999px;border:1px dashed rgba(64,232,255,.55);color:${CYAN};font-size:.8rem;animation:advBlink 1.8s ease-in-out infinite}
.adv-scores{display:flex;align-items:center;gap:1rem;flex-wrap:wrap}
.adv-sbadge{padding:.4rem .9rem;border:2px solid;border-radius:14px;background:rgba(0,0,0,.35);text-align:center}.adv-sbadge b{display:block;font-size:1.9rem;line-height:1.1;font-weight:900}.adv-sbadge small{font:600 .55rem 'Courier New',monospace;letter-spacing:.14em;color:#9fb3cc;text-transform:uppercase}
.adv-toprow u{min-width:1.7rem;padding:.05rem .4rem;border-radius:999px;color:#04101a;font:800 .72rem system-ui;text-align:center;text-decoration:none}
.adv-sharerow{display:flex;gap:.4rem;flex-wrap:wrap;margin-top:1rem}
.adv-sharerow .adv-btn{flex:1 1 auto;display:inline-flex;align-items:center;justify-content:center;gap:.35rem;padding:.5rem .5rem;font-size:.6rem;white-space:nowrap}
.adv-cta .adv-btn{display:inline-flex;align-items:center;justify-content:center;gap:.35rem}
.adv-btn:disabled{opacity:.45;cursor:wait}
.adv-ref{margin-top:.5rem;font-size:.62rem;color:#6f8099}
.adv-headr{display:flex;align-items:center;gap:.9rem}.adv-mute{background:none;border:1px solid rgba(255,255,255,.18);border-radius:999px;width:2rem;height:2rem;cursor:pointer;font-size:.95rem;line-height:1}
.adv-clock{display:flex;gap:.7rem;justify-content:center;margin:.4rem 0 .2rem}
.adv-unit{display:flex;flex-direction:column;align-items:center;gap:.3rem}
.adv-digits{position:relative;min-width:3.4rem;padding:.55rem .5rem;border-radius:10px;background:linear-gradient(180deg,#141f33 0%,#141f33 49%,#0a111e 50%,#0e1626 100%);border:1px solid rgba(240,201,110,.45);box-shadow:0 0 18px rgba(240,201,110,.15),inset 0 0 12px rgba(0,0,0,.5);font:400 clamp(1.7rem,6vw,2.6rem)/1 'AdvGraduate','Arial Black',sans-serif;color:${GOLD};text-align:center;letter-spacing:.04em}
.adv-unit span{font:600 .55rem 'Courier New',monospace;letter-spacing:.16em;color:#8fa3bd;text-transform:uppercase}
.adv-launch .adv-btn{margin-top:.6rem;align-self:center}
.adv-new{position:absolute;top:2%;left:50%;transform:translateX(-50%);padding:.1rem .5rem;border-radius:999px;background:linear-gradient(180deg,#fff2c4,${GOLD});color:#2a1c04;font:900 .5rem system-ui;letter-spacing:.14em;white-space:nowrap;animation:advTap 1.6s ease-in-out infinite;z-index:3}
.adv-ritual{margin-top:1.1rem;display:flex;gap:.8rem;justify-content:center;align-items:center;flex-wrap:wrap}
.adv-streak{padding:.3rem .8rem;border-radius:999px;border:1px solid rgba(255,126,52,.6);background:rgba(255,126,52,.1);color:#ffb37a;font:700 .7rem 'Courier New',monospace;letter-spacing:.08em}
.adv-prog{position:relative;display:inline-block;min-width:200px;height:1.5rem;border-radius:999px;border:1px solid rgba(64,232,255,.5);background:rgba(64,232,255,.06);overflow:hidden}
.adv-prog i{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,rgba(64,232,255,.35),rgba(240,201,110,.45));transition:width .6s}
.adv-prog b{position:relative;display:block;text-align:center;line-height:1.5rem;font:700 .64rem 'Courier New',monospace;letter-spacing:.12em;color:#e6efff}
.adv-how{margin:3rem auto 0;max-width:900px}.adv-how h2{text-align:center;font-size:1.15rem;letter-spacing:.2em;text-transform:uppercase;color:${GOLD};margin:0 0 1.1rem}
.adv-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.adv-step{position:relative;padding:1.2rem 1rem 1rem;border-radius:16px;border:1px solid rgba(240,201,110,.3);background:linear-gradient(160deg,rgba(15,27,46,.8),rgba(6,10,21,.8));text-align:center}
.adv-step span{display:inline-flex;width:2.2rem;height:2.2rem;border-radius:50%;align-items:center;justify-content:center;background:radial-gradient(circle at 35% 30%,#fff2c4,${GOLD} 50%,#8a6418);color:#2a1c04;font:400 1.1rem 'AdvGraduate','Arial Black',sans-serif}
.adv-step b{display:block;margin:.6rem 0 .3rem;color:#fff;font-size:.95rem}.adv-step p{margin:0;color:#9fb3cc;font-size:.8rem;line-height:1.5}
.adv-faq{display:flex;flex-direction:column;gap:.5rem}
.adv-faq details{border:1px solid rgba(255,255,255,.1);border-radius:12px;background:rgba(255,255,255,.03);padding:.7rem 1rem}
.adv-faq summary{cursor:pointer;color:#e6efff;font-size:.88rem}.adv-faq p{margin:.6rem 0 0;color:#9fb3cc;font-size:.8rem;line-height:1.55}
.adv-toast{position:fixed;left:50%;bottom:1.2rem;transform:translateX(-50%);z-index:40;display:flex;align-items:center;gap:1rem;flex-wrap:wrap;justify-content:center;padding:.8rem 1.2rem;border-radius:16px;border:1px solid ${GOLD};background:rgba(6,10,21,.94);backdrop-filter:blur(8px);box-shadow:0 0 30px rgba(240,201,110,.25);max-width:92vw;animation:advFade .4s}
.adv-toast p{margin:0;color:#e6efff;font-size:.85rem}.adv-toast .adv-btn{padding:.5rem 1rem;font-size:.66rem}.adv-toast button:not(.adv-btn){background:none;border:none;color:#9fb3cc;cursor:pointer;font-size:1rem}
@media(max-width:640px){.adv-steps{grid-template-columns:1fr}.adv-digits{min-width:2.8rem}}
.adv-ed{margin-left:.6rem;padding:.1rem .5rem;border-radius:999px;border:1px solid ${GOLD};color:${GOLD};font-size:.58rem;letter-spacing:.14em}
.adv-door.finale .adv-front.avail{filter:drop-shadow(0 0 20px ${GOLD}) drop-shadow(0 0 8px rgba(255,214,120,.8))}
.adv-door.finale .adv-open{border-color:${GOLD};color:${GOLD}}
.adv-shinewrap{position:absolute;inset:0;overflow:hidden;border-radius:7%/4.5%;pointer-events:none}
.adv-shine{position:absolute;inset:0;background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.22) 50%,transparent 65%);transform:translateX(-120%);animation:advShine 3.4s ease-in-out infinite;pointer-events:none}
.adv-score{position:absolute;top:7px;right:7px;min-width:2.1rem;padding:.12rem .45rem;border-radius:999px;color:#04101a;font:900 clamp(.78rem,2.2vw,1.05rem) system-ui;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,.5)}
.adv-p{position:absolute;left:50%;top:50%;border-radius:50%;opacity:0;animation:advBurst 1.2s ease-out forwards}
.adv-promo{margin:2.6rem auto 0;text-align:center}.adv-promo p{margin:0 0 .9rem;color:#aebfd6;font-size:.95rem}
.adv-btn{display:inline-block;cursor:pointer;padding:.7rem 1.4rem;border-radius:999px;border:1px solid rgba(64,232,255,.6);background:rgba(64,232,255,.08);color:${CYAN};font:700 .74rem 'Courier New',monospace;letter-spacing:.14em;text-transform:uppercase;text-decoration:none}
.adv-btn.gold{border-color:${GOLD};background:linear-gradient(180deg,rgba(240,201,110,.25),rgba(240,201,110,.08));color:#ffe9a8}
.adv-foot{margin:2.2rem auto 0;max-width:760px;text-align:center;color:#6f8099;font-size:.68rem;line-height:1.6}
.adv-stage{position:fixed;inset:0;z-index:50;background:rgba(2,4,10,.86);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:1rem;animation:advFade .3s}
.adv-stagebox{position:relative;display:flex;gap:2rem;align-items:center;max-width:900px;width:100%;max-height:94vh;overflow:auto;padding:1.6rem;border-radius:20px;border:1px solid var(--tc);background:radial-gradient(ellipse at 30% 20%,color-mix(in srgb,var(--tc) 22%,#0a1020),#060a15 70%);box-shadow:0 0 60px color-mix(in srgb,var(--tc) 45%,transparent)}
.adv-x{position:absolute;top:.6rem;right:.8rem;background:none;border:none;color:#9fb3cc;font-size:1.1rem;cursor:pointer;z-index:3}
.adv-stagecard{position:relative;flex:none;width:min(40%,calc(62vh * .625));aspect-ratio:5/8;animation:advRise 1s cubic-bezier(.2,.8,.2,1),advFloat 4s 1s ease-in-out infinite;overflow:hidden;border-radius:14px}
.adv-stagecard img{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 12px 26px rgba(0,0,0,.7))}
.adv-stageinfo{flex:1;min-width:0}
.adv-kicker{font:700 .66rem 'Courier New',monospace;letter-spacing:.2em;color:${CYAN};text-transform:uppercase}
.adv-sub{font:600 .64rem 'Courier New',monospace;letter-spacing:.16em;color:#8fa3bd;text-transform:uppercase;margin-top:.35rem}
.adv-name{margin:.3rem 0 0;font-size:clamp(1.4rem,4vw,2.1rem);color:#fff;line-height:1.1}
.adv-team{color:#9fb3cc;font-size:.85rem;margin-top:.15rem}
.adv-bigscore{font-size:clamp(3rem,9vw,5rem);font-weight:900;line-height:1;margin:.5rem 0}.adv-bigscore small{font-size:.9rem;margin-left:.4rem;letter-spacing:.2em;opacity:.8}
.adv-stats{display:flex;gap:.5rem;flex-wrap:wrap}.adv-stat{min-width:3.1rem;padding:.4rem .55rem;border-radius:10px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);text-align:center}
.adv-stat-s{margin-left:auto;display:flex;align-items:center;justify-content:center;gap:.35rem;border:2px solid;background:rgba(0,0,0,.35)}.adv-stat-s b{display:inline!important;font-size:1.15rem!important}.adv-stat-s img{width:16px;height:16px}.adv-bigscore:has(.adv-ttflword){display:flex;align-items:center;gap:.7rem;flex-wrap:nowrap}.adv-ttflword{height:clamp(1.6rem,5vh,2.4rem);width:auto;flex:0 0 auto;margin:0}
.adv-stat b{display:block;font-size:1.05rem;color:#fff}.adv-stat span{font:600 .55rem 'Courier New',monospace;letter-spacing:.14em;color:#8fa3bd}
.adv-top{display:flex;flex-direction:column;gap:.35rem;margin-top:.4rem}
.adv-toprow{display:flex;align-items:center;gap:.6rem;padding:.3rem .5rem;border-radius:10px;background:rgba(255,255,255,.04)}
.adv-toprow span{width:1rem;color:#8fa3bd;font-size:.75rem}.adv-toprow img,.adv-toprow i{width:26px;height:34px;object-fit:contain;flex:0 0 auto}
.adv-toprow em{flex:1;min-width:0;font-style:normal;color:#e6efff;font-size:.82rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.adv-toprow em small{display:block;color:#7a8da8;font-size:.64rem}
.adv-toprow b{font-size:1rem}
.adv-nav{display:flex;gap:.5rem;margin-top:.8rem}.adv-nav button{width:2.2rem;height:2.2rem;border-radius:50%;border:1px solid rgba(255,255,255,.18);background:transparent;color:#cfe4fb;cursor:pointer}.adv-nav button:disabled{opacity:.25;cursor:default}
@keyframes advPulse{0%,100%{box-shadow:0 0 18px rgba(64,232,255,.22),inset 0 0 20px rgba(64,232,255,.06)}50%{box-shadow:0 0 34px rgba(64,232,255,.5),inset 0 0 28px rgba(64,232,255,.14)}}
@keyframes advShine{0%,55%{transform:translateX(-120%)}100%{transform:translateX(120%)}}
@keyframes advBurst{0%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(.2)}}
@keyframes advPack{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@keyframes advShake{0%{transform:rotate(0)}10%{transform:rotate(-4deg) scale(1.03)}20%{transform:rotate(4deg) scale(1.05)}30%{transform:rotate(-5deg) scale(1.07)}40%{transform:rotate(5deg) scale(1.09)}50%{transform:rotate(-6deg) scale(1.1)}60%{transform:rotate(6deg) scale(1.12)}80%{transform:rotate(-3deg) scale(1.14)}100%{transform:rotate(0) scale(1.16)}}
@keyframes advFlash{0%{opacity:0}60%{opacity:.5}100%{opacity:1}}
@keyframes advBlink{0%,100%{opacity:1}50%{opacity:.55}}
@keyframes advTap{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(1.1)}}
@keyframes advFade{from{opacity:0}to{opacity:1}}
@keyframes advRise{from{opacity:0;transform:translateY(40px) rotateY(90deg) scale(.7)}to{opacity:1;transform:none}}
@keyframes advFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
.adv-top{gap:min(.35rem,.6vh)}
@media(min-width:641px){.adv-stagebox{overflow:hidden;max-height:96vh}.adv-name{font-size:min(2.1rem,4.4vh)}.adv-bigscore{font-size:min(5rem,10vh);margin:min(.5rem,.8vh) 0}.adv-sbadge b{font-size:min(1.9rem,3.6vh)}.adv-stagecard{width:min(40%,calc(66vh * .625))}}
@media(min-width:641px) and (max-height:700px){.adv-sharerow{margin-top:.5rem}.adv-sharerow .adv-btn,.adv-cta .adv-btn{padding:.32rem .4rem}.adv-top{gap:0}.adv-toprow{padding:.04rem .5rem}.adv-toprow img,.adv-toprow i{width:16px;height:21px}.adv-stats{margin-top:.3rem}.adv-ref{display:none}.adv-nav{margin-top:.3rem}}
@media(min-width:641px) and (max-height:800px){.adv-stagebox{padding:.9rem 1.4rem;gap:1.4rem}.adv-stat{padding:.2rem .5rem}.adv-stat b{font-size:.95rem}.adv-toprow{padding:.12rem .5rem}.adv-toprow img,.adv-toprow i{width:20px;height:26px}.adv-cta{margin-top:.55rem}.adv-btn{padding:.45rem .6rem;font-size:.66rem}.adv-nav{margin-top:.5rem}.adv-nav button{width:1.9rem;height:1.9rem}.adv-ref{margin-top:.3rem}.adv-sub{margin-top:.2rem}.adv-team{font-size:.78rem}}
@media(max-width:900px){.adv-grid{grid-template-columns:repeat(4,1fr);gap:14px}}
@media(max-width:640px){.adv-grid{grid-template-columns:repeat(3,1fr);gap:20px 10px}.adv-stagebox{flex-direction:column;padding:1.1rem}.adv-stagecard{width:min(46%,calc(38vh * .625))}.adv-wrap{padding:.9rem .8rem 2.5rem}}
@media(prefers-reduced-motion:reduce){.adv-inner{transition-duration:.01s}.adv-shine,.adv-front.avail,.adv-door.opened,.adv-detail,.adv-hint,.adv-stagecard,.adv-front.shaking{animation:none}.adv-p{display:none}}
`;
