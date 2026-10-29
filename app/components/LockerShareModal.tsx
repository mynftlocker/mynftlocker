'use client';
import { useState, useEffect, useRef } from 'react';
import { t as tr, useLang } from '../i18n';
import { getManager, getManagerSlug, galleryLink } from '../lib-share';
import { exportLockerImage, type LockerShareOpts, type LockerFormat } from '../lib/lockerShare';

type Res = { blob: Blob; file: File; fname: string; url: string };

// Fenetre "Partager le vestiaire" : choix Paysage / Instagram 4:5, apercu, puis Partager / Telecharger / Copier.
export default function LockerShareModal({ opts, onClose }: { opts: LockerShareOpts; onClose: () => void }) {
  useLang();
  const [format, setFormat] = useState<LockerFormat>('wide');
  const [state, setState] = useState<'prep' | 'ready' | 'error'>('prep');
  const [res, setRes] = useState<Res | null>(null);
  const [msg, setMsg] = useState('');
  const [canShare, setCanShare] = useState(false);
  const [canCopy, setCanCopy] = useState(false);
  const cache = useRef<Partial<Record<LockerFormat, Res>>>({});

  useEffect(() => {
    try {
      const n: any = navigator;
      setCanCopy(!!(n.clipboard && n.clipboard.write && typeof (window as any).ClipboardItem !== 'undefined'));
      setCanShare(typeof n.share === 'function' && typeof n.canShare === 'function' && n.canShare({ files: [new File([''], 'v.png', { type: 'image/png' })] }));
    } catch (e) { /* ignore */ }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    const urls = cache.current;
    return () => { window.removeEventListener('keydown', esc); Object.values(urls).forEach(r => r && URL.revokeObjectURL(r.url)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Memorise ce vestiaire cote serveur : c'est lui qui illustre l'apercu du lien /u/<slug> (compte connecte uniquement, sinon ignore)
  useEffect(() => {
    const slug = getManagerSlug();
    if (!slug) return;
    fetch('/api/share-snapshot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, manager: getManager(), title: opts.showTeamTitle ? (opts.title[0] + ' ' + opts.title[1]).trim() : opts.caption, cards: opts.cards.map((c: any) => ({ name: c.name, pictureUrl: c.pictureUrl })) }) }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let dead = false;
    const hit = cache.current[format];
    if (hit) { setRes(hit); setState('ready'); return; }
    setState('prep'); setRes(null);
    (async () => {
      try {
        await new Promise(r => setTimeout(r, 60)); // laisse l'ecran afficher "Preparation..." avant le calcul
        const r = await exportLockerImage(opts, format);
        const full: Res = { ...r, url: URL.createObjectURL(r.blob) };
        cache.current[format] = full;
        if (!dead) { setRes(full); setState('ready'); }
      } catch (e) { console.error('locker share failed', e); if (!dead) setState('error'); }
    })();
    return () => { dead = true; };
  }, [format, opts]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 2500); };
  const title = opts.showTeamTitle ? (opts.title[0] + ' ' + opts.title[1]).trim() : opts.caption;
  const doShare = async () => {
    if (!res) return;
    try { const lk = galleryLink(); await (navigator as any).share({ files: [res.file], title, text: (getManager() ? getManager() + ' · ' : '') + title + (lk ? ' — ' + lk : '') }); }
    catch (e: any) { if (!e || e.name !== 'AbortError') flash(tr('Partage impossible')); }
  };
  const doDownload = () => { if (!res) return; const a = document.createElement('a'); a.href = res.url; a.download = res.fname; document.body.appendChild(a); a.click(); a.remove(); flash(tr('Image téléchargée')); };
  const doCopy = async () => { if (!res) return; try { await (navigator as any).clipboard.write([new (window as any).ClipboardItem({ 'image/png': res.blob })]); flash(tr('Image copiée')); } catch (e) { flash(tr('Copie impossible')); } };

  const link = galleryLink();
  const doCopyLink = async () => {
    if (!link) return;
    try { await navigator.clipboard.writeText(link); flash(tr('Lien copié')); }
    catch (e) { try { const t = document.createElement('textarea'); t.value = link; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); flash(tr('Lien copié')); } catch (e2) { flash(tr('Copie impossible')); } }
  };
  const ready = state === 'ready';
  const seg = (f: LockerFormat, label: string) => (
    <button type='button' onClick={() => setFormat(f)} style={{ flex: 1, padding: '0.55rem 0.4rem', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em', cursor: 'pointer', fontFamily: 'inherit', border: '1px solid rgba(64,232,255,0.5)', background: format === f ? 'rgba(64,232,255,0.22)' : 'rgba(64,232,255,0.05)', color: format === f ? '#fff' : '#9fb4c8' }}>{label}</button>
  );
  const btn: React.CSSProperties = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.65rem 0.3rem', border: '1px solid rgba(64,232,255,0.5)', background: 'rgba(64,232,255,0.08)', color: '#fff', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em', cursor: ready ? 'pointer' : 'wait', opacity: ready ? 1 : 0.45, fontFamily: 'inherit', whiteSpace: 'nowrap' };
  const ico = (d: React.ReactNode) => (<svg viewBox='0 0 24 24' style={{ width: '1.2em', height: '1.2em', flexShrink: 0 }} fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>{d}</svg>);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9600, background: 'rgba(2,6,14,0.9)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(560px,100%)', maxHeight: '100%', display: 'flex', flexDirection: 'column', gap: '0.8rem', padding: '1rem', background: 'rgba(10,14,22,0.96)', border: '1px solid rgba(64,232,255,0.4)', boxShadow: '0 0 40px rgba(64,232,255,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 900, letterSpacing: '0.12em', color: '#f5d76e' }}>{tr('PARTAGER LE VESTIAIRE')}</span>
          <button type='button' onClick={onClose} aria-label='Fermer' style={{ background: 'transparent', border: 'none', color: '#9fb4c8', fontSize: '1.3rem', cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>{seg('wide', tr('PAYSAGE'))}{seg('ig', 'INSTAGRAM 4:5')}</div>
        <div style={{ position: 'relative', minHeight: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {res && ready && <img src={res.url} alt='' style={{ maxWidth: '100%', maxHeight: '52vh', display: 'block', objectFit: 'contain' }} />}
          {state === 'prep' && <span style={{ fontSize: '0.75rem', letterSpacing: '0.08em', color: 'rgba(64,232,255,0.8)' }}>{tr('Préparation de l’image…')}</span>}
          {state === 'error' && <span style={{ fontSize: '0.75rem', color: '#fca5a5', padding: '1rem', textAlign: 'center' }}>{tr('Image indisponible')}</span>}
        </div>
        <div style={{ minHeight: '1.1em', textAlign: 'center', fontSize: '0.72rem', color: 'rgba(64,232,255,0.85)' }}>{msg}</div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {canShare && <button type='button' disabled={!ready} onClick={doShare} style={btn}>{ico(<><circle cx='18' cy='5' r='3' /><circle cx='6' cy='12' r='3' /><circle cx='18' cy='19' r='3' /><path d='M8.6 13.5l6.8 4M15.4 6.5l-6.8 4' /></>)}{tr('PARTAGER')}</button>}
          <button type='button' disabled={!ready} onClick={doDownload} style={btn}>{ico(<><path d='M12 3v12' /><path d='M8 11l4 4 4-4' /><path d='M5 21h14' /></>)}{tr('TÉLÉCHARGER')}</button>
          {canCopy && <button type='button' disabled={!ready} onClick={doCopy} style={btn}>{ico(<><rect x='9' y='9' width='12' height='12' rx='2' /><path d='M5 15V5a2 2 0 012-2h10' /></>)}{tr('COPIER')}</button>}
        </div>
        {link && (
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'stretch' }}>
            <input readOnly value={link.replace(/^https?:\/\//, '')} onFocus={e => e.currentTarget.select()} aria-label={tr('Lien du vestiaire')} style={{ flex: 1, minWidth: 0, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#cfe4fb', padding: '0.55rem 0.6rem', fontSize: '0.78rem', fontFamily: 'inherit', outline: 'none' }} />
            <button type='button' onClick={doCopyLink} style={{ ...btn, flex: '0 0 auto', padding: '0.55rem 0.9rem', cursor: 'pointer', opacity: 1 }}>{ico(<><path d='M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1' /><path d='M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1' /></>)}{tr('COPIER LE LIEN')}</button>
          </div>
        )}
      </div>
    </div>
  );
}
