"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import { t as tr, useLang, addEn } from '../i18n';

// Messagerie entre managers : courte, liee a une carte, comptes verifies Sorare uniquement. Les echanges (paiement, remise des cartes) restent sur Sorare.
addEn({
  'Messages': 'Messages', 'Contacter le manager': 'Contact the manager', 'CONTACTER LE MANAGER': 'CONTACT THE MANAGER',
  'Écrire à': 'Write to', 'Ton message': 'Your message', 'Envoyer': 'Send', 'Envoi…': 'Sending…', 'Fermer': 'Close',
  'Les échanges se font uniquement sur Sorare : pas de lien, d’e-mail, de téléphone ni de paiement ailleurs. Reste courtois.': 'All deals happen on Sorare only: no links, emails, phone numbers or payments elsewhere. Stay polite.',
  'Message envoyé.': 'Message sent.', 'Voir mes messages': 'See my messages',
  'Connecte-toi pour écrire à un manager.': 'Log in to write to a manager.', 'Se connecter': 'Log in',
  'Pour écrire à un manager, lie d’abord ton compte Sorare (compte vérifié).': 'To write to a manager, link your Sorare account first (verified account).',
  'Lier mon compte Sorare': 'Link my Sorare account',
  'Aucune conversation pour l’instant. Ouvre la galerie d’un manager, retourne une de ses cartes et clique sur « Contacter le manager ».': 'No conversations yet. Open a manager’s gallery, flip one of their cards and click “Contact the manager”.',
  '← Conversations': '← Conversations', 'Répondre': 'Reply', 'Bloquer': 'Block', 'Débloquer': 'Unblock', 'Signaler': 'Report',
  'Motif du signalement (optionnel)': 'Reason for the report (optional)', 'Envoyer le signalement': 'Send report', 'Annuler': 'Cancel',
  'Signalement envoyé. Ce manager est bloqué pour toi.': 'Report sent. This manager is now blocked for you.',
  'Tu as bloqué ce manager.': 'You blocked this manager.', 'Ce manager ne peut plus recevoir tes messages.': 'This manager can no longer receive your messages.',
  'Toi': 'You', 'Nouveau': 'New',
  'Les liens ne sont pas autorisés.': 'Links are not allowed.',
  'Les e-mails, numéros de téléphone et adresses de portefeuille ne sont pas autorisés.': 'Emails, phone numbers and wallet addresses are not allowed.',
  'Les paiements hors de la plateforme (virement, PayPal, crypto…) ne sont pas autorisés. Tout se passe sur Sorare.': 'Payments outside the platform (bank transfer, PayPal, crypto…) are not allowed. Everything happens on Sorare.',
  'Les échanges via d’autres plateformes ou messageries sont interdits. Tout se passe sur Sorare.': 'Deals through other platforms or messengers are forbidden. Everything happens on Sorare.',
  'Les insultes ne sont pas autorisées.': 'Insults are not allowed.', 'Les menaces ne sont pas autorisées.': 'Threats are not allowed.',
  'Écris un message.': 'Write a message.', '500 caractères maximum.': '500 characters maximum.',
  'Ce manager n’a pas (encore) de compte vérifié sur myNFTlocker : tu ne peux pas lui écrire ici.': 'This manager has no verified myNFTlocker account (yet): you cannot write to them here.',
  'Limite atteinte pour aujourd’hui. Réessaie demain.': 'Daily limit reached. Try again tomorrow.',
  'Impossible d’envoyer à ce manager.': 'Cannot send to this manager.', 'Ton envoi de messages est suspendu suite à des signalements.': 'Your messaging is suspended following reports.',
  'Cette conversation est pleine.': 'This conversation is full.', 'Carte introuvable ou qui n’appartient pas à ce manager.': 'Card not found or not owned by this manager.',
  'Erreur, réessaie dans un instant.': 'Something went wrong, please try again in a moment.',
});

const FILTER_TXT: Record<string, string> = {
  link: 'Les liens ne sont pas autorisés.',
  contact: 'Les e-mails, numéros de téléphone et adresses de portefeuille ne sont pas autorisés.',
  payment: 'Les paiements hors de la plateforme (virement, PayPal, crypto…) ne sont pas autorisés. Tout se passe sur Sorare.',
  platform: 'Les échanges via d’autres plateformes ou messageries sont interdits. Tout se passe sur Sorare.',
  insult: 'Les insultes ne sont pas autorisées.', threat: 'Les menaces ne sont pas autorisées.',
  empty: 'Écris un message.', long: '500 caractères maximum.',
};
const ERR_TXT: Record<string, string> = {
  recipient_unavailable: 'Ce manager n’a pas (encore) de compte vérifié sur myNFTlocker : tu ne peux pas lui écrire ici.',
  limit_new: 'Limite atteinte pour aujourd’hui. Réessaie demain.', limit_msg: 'Limite atteinte pour aujourd’hui. Réessaie demain.',
  cannot_send: 'Impossible d’envoyer à ce manager.', suspended: 'Ton envoi de messages est suspendu suite à des signalements.',
  thread_full: 'Cette conversation est pleine.', card_not_owned: 'Carte introuvable ou qui n’appartient pas à ce manager.', card_unavailable: 'Carte introuvable ou qui n’appartient pas à ce manager.',
};
const errText = (d: any) => tr(d?.code && FILTER_TXT[d.code] ? FILTER_TXT[d.code] : (ERR_TXT[d?.error] || 'Erreur, réessaie dans un instant.'));
const changed = () => { try { window.dispatchEvent(new Event('mnfl:msg-changed')); } catch {} };

const CY = '#40e8ff', GOLD = '#f5d76e', MUTED = '#7a8898';
const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(64,232,255,0.35)', borderRadius: '0.4rem', color: '#eaf2ff', padding: '0.6rem 0.7rem', fontSize: '0.85rem', fontFamily: 'inherit', resize: 'vertical' };
const primary: React.CSSProperties = { background: 'rgba(64,232,255,0.14)', border: '1px solid rgba(64,232,255,0.6)', color: CY, padding: '0.5rem 1.1rem', fontSize: '0.74rem', fontWeight: 800, letterSpacing: '0.08em', borderRadius: '0.35rem', cursor: 'pointer', textTransform: 'uppercase' };
const ghost: React.CSSProperties = { background: 'transparent', border: 'none', color: MUTED, fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline', padding: '0.3rem 0.4rem' };
const rule: React.CSSProperties = { fontSize: '0.72rem', lineHeight: 1.55, color: GOLD, border: '1px solid rgba(245,215,110,0.35)', background: 'rgba(245,215,110,0.06)', borderRadius: '0.4rem', padding: '0.6rem 0.8rem', margin: '0 0 0.9rem' };

// Compteur de messages non lus (interroge le serveur toutes les 60 s tant que le compte est verifie Sorare)
export function useUnread(active: boolean): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) { setN(0); return; }
    let stop = false;
    const tick = () => { fetch('/api/messages?view=unread').then(r => (r.ok ? r.json() : null)).then(d => { if (!stop && d) setN(d.unread || 0); }).catch(() => {}); };
    tick();
    const id = setInterval(tick, 60000);
    window.addEventListener('mnfl:msg-changed', tick);
    return () => { stop = true; clearInterval(id); window.removeEventListener('mnfl:msg-changed', tick); };
  }, [active]);
  return n;
}

// Fenetre "Contacter le manager" (premier message, lie a la carte)
export function ComposeModal({ card, to, user, onClose, onLogin, onVerify, onInbox }: { card: any; to: string; user: any; onClose: () => void; onLogin: () => void; onVerify: () => void; onInbox: () => void }) {
  useLang();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);
  const send = async () => {
    if (busy || !text.trim()) return;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'send', to, card: card.slug, text }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) { setSent(true); changed(); } else setMsg(errText(d));
    } catch { setMsg(tr('Erreur, réessaie dans un instant.')); }
    setBusy(false);
  };
  const box: React.CSSProperties = { width: 'min(460px,92vw)', background: '#0a0d12', border: '1px solid rgba(111,195,232,0.4)', borderRadius: '0.6rem', padding: '1.2rem 1.2rem 1rem', boxShadow: '0 20px 60px rgba(0,0,0,0.7)' };
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(2,4,8,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()} style={box}>
        {!user ? (<>
          <p style={{ color: '#cfe4fb', fontSize: '0.9rem', margin: '0 0 1rem' }}>{tr('Connecte-toi pour écrire à un manager.')}</p>
          <div style={{ display: 'flex', gap: '0.6rem' }}><button style={primary} onClick={onLogin}>{tr('Se connecter')}</button><button style={ghost} onClick={onClose}>{tr('Fermer')}</button></div>
        </>) : !user.msgSlug ? (<>
          <p style={{ color: '#cfe4fb', fontSize: '0.9rem', margin: '0 0 1rem' }}>{tr('Pour écrire à un manager, lie d’abord ton compte Sorare (compte vérifié).')}</p>
          <div style={{ display: 'flex', gap: '0.6rem' }}><button style={primary} onClick={onVerify}>{tr('Lier mon compte Sorare')}</button><button style={ghost} onClick={onClose}>{tr('Fermer')}</button></div>
        </>) : sent ? (<>
          <p style={{ color: CY, fontSize: '0.95rem', fontWeight: 700, margin: '0 0 1rem' }}>{tr('Message envoyé.')}</p>
          <div style={{ display: 'flex', gap: '0.6rem' }}><button style={primary} onClick={onInbox}>{tr('Voir mes messages')}</button><button style={ghost} onClick={onClose}>{tr('Fermer')}</button></div>
        </>) : (<>
          <p style={{ margin: '0 0 0.2rem', fontSize: '0.7rem', color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{tr('Écrire à')} {to}</p>
          <p style={{ margin: '0 0 0.8rem', fontSize: '0.88rem', color: '#eaf2ff', fontWeight: 700 }}>{card.name}</p>
          <p style={rule}>{tr('Les échanges se font uniquement sur Sorare : pas de lien, d’e-mail, de téléphone ni de paiement ailleurs. Reste courtois.')}</p>
          <textarea value={text} onChange={e => { setText(e.target.value); setMsg(null); }} maxLength={500} rows={4} placeholder={tr('Ton message')} style={field} autoFocus />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.3rem 0 0.7rem' }}>
            <span style={{ fontSize: '0.68rem', color: MUTED }}>{text.length}/500</span>
            {msg && <span style={{ fontSize: '0.72rem', color: '#fca5a5', textAlign: 'right', marginLeft: '0.8rem' }}>{msg}</span>}
          </div>
          <div style={{ display: 'flex', gap: '0.6rem' }}><button style={{ ...primary, opacity: busy || !text.trim() ? 0.5 : 1 }} disabled={busy || !text.trim()} onClick={send}>{busy ? tr('Envoi…') : tr('Envoyer')}</button><button style={ghost} onClick={onClose}>{tr('Fermer')}</button></div>
        </>)}
      </div>
    </div>
  );
}

// Section "Messages" de Mon compte : liste des conversations puis fil d'une conversation
export function MessagesSection({ user, onLogin, onVerify }: { user: any; onLogin: () => void; onVerify: () => void }) {
  useLang();
  const [convs, setConvs] = useState<any[] | null>(null);
  const [thread, setThread] = useState<any | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const cidRef = useRef<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const loadList = useCallback(() => { fetch('/api/messages?view=list').then(r => r.json()).then(d => setConvs(d.convs || [])).catch(() => setConvs([])); }, []);
  const loadThread = useCallback((cid: string) => {
    fetch('/api/messages?view=thread&cid=' + encodeURIComponent(cid)).then(r => r.json()).then(d => { if (d && d.messages && cidRef.current === cid) { setThread(d); changed(); } }).catch(() => {});
  }, []);
  useEffect(() => { if (user?.msgSlug) loadList(); }, [user?.msgSlug, loadList]);
  useEffect(() => {
    if (!thread?.cid) return;
    const id = setInterval(() => { if (cidRef.current) loadThread(cidRef.current); }, 20000);
    return () => clearInterval(id);
  }, [thread?.cid, loadThread]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [thread?.messages?.length]);

  if (!user) return (<div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}><p style={{ color: '#cfe4fb', fontSize: '0.95rem', marginBottom: '1.4rem' }}>{tr('Connecte-toi pour écrire à un manager.')}</p><button style={primary} onClick={onLogin}>{tr('Se connecter')}</button></div>);
  if (!user.msgSlug) return (<div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}><p style={{ color: '#cfe4fb', fontSize: '0.95rem', marginBottom: '1.4rem' }}>{tr('Pour écrire à un manager, lie d’abord ton compte Sorare (compte vérifié).')}</p><button style={primary} onClick={onVerify}>{tr('Lier mon compte Sorare')}</button></div>);

  const open = (cid: string) => { cidRef.current = cid; setNote(null); setReporting(false); setMsg(null); loadThread(cid); };
  const back = () => { cidRef.current = null; setThread(null); setNote(null); loadList(); changed(); };
  const reply = async () => {
    if (busy || !text.trim() || !thread) return;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reply', cid: thread.cid, text }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) { setText(''); loadThread(thread.cid); } else setMsg(errText(d));
    } catch { setMsg(tr('Erreur, réessaie dans un instant.')); }
    setBusy(false);
  };
  const block = async (on: boolean) => {
    if (!thread) return;
    await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'block', slug: thread.other, on }) }).catch(() => {});
    loadThread(thread.cid);
  };
  const report = async () => {
    if (!thread) return;
    await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'report', cid: thread.cid, reason }) }).catch(() => {});
    setReporting(false); setReason(''); setNote(tr('Signalement envoyé. Ce manager est bloqué pour toi.')); loadThread(thread.cid);
  };
  const fmt = (at: number) => new Date(at).toLocaleString(undefined, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  if (thread) {
    const locked = thread.blockedByMe || thread.blockedByThem;
    return (
      <div>
        <button style={{ ...ghost, textDecoration: 'none', color: CY, padding: 0, marginBottom: '0.8rem', fontSize: '0.74rem', letterSpacing: '0.06em' }} onClick={back}>{tr('← Conversations')}</button>
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', marginBottom: '0.9rem' }}>
          {thread.card?.pictureUrl && <img src={thread.card.pictureUrl} alt='' style={{ width: '44px', borderRadius: '0.3rem' }} />}
          <div style={{ minWidth: 0 }}><p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#eaf2ff' }}>{thread.otherPseudo}</p><p style={{ margin: 0, fontSize: '0.72rem', color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{thread.card?.name}</p></div>
        </div>
        <p style={rule}>{tr('Les échanges se font uniquement sur Sorare : pas de lien, d’e-mail, de téléphone ni de paiement ailleurs. Reste courtois.')}</p>
        <div className='thin-sb' style={{ maxHeight: '42vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.45rem', padding: '0.2rem 0.1rem', marginBottom: '0.8rem' }}>
          {thread.messages.map((m: any, i: number) => { const mine = m.f === thread.me; return (
            <div key={i} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '82%', background: mine ? 'rgba(64,232,255,0.14)' : 'rgba(255,255,255,0.06)', border: '1px solid ' + (mine ? 'rgba(64,232,255,0.35)' : 'rgba(255,255,255,0.1)'), borderRadius: '0.5rem', padding: '0.45rem 0.65rem' }}>
              <p style={{ margin: 0, fontSize: '0.84rem', color: '#eaf2ff', lineHeight: 1.45, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{m.t}</p>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.62rem', color: MUTED, textAlign: 'right' }}>{mine ? tr('Toi') : thread.otherPseudo} · {fmt(m.at)}</p>
            </div>); })}
          <div ref={endRef} />
        </div>
        {note && <p style={{ fontSize: '0.74rem', color: CY, margin: '0 0 0.6rem' }}>{note}</p>}
        {locked ? (
          <p style={{ fontSize: '0.78rem', color: MUTED, margin: '0 0 0.6rem' }}>{thread.blockedByMe ? tr('Tu as bloqué ce manager.') : tr('Ce manager ne peut plus recevoir tes messages.')}</p>
        ) : (<>
          <textarea value={text} onChange={e => { setText(e.target.value); setMsg(null); }} maxLength={500} rows={3} placeholder={tr('Ton message')} style={field} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.3rem 0 0.7rem' }}>
            <span style={{ fontSize: '0.68rem', color: MUTED }}>{text.length}/500</span>
            {msg && <span style={{ fontSize: '0.72rem', color: '#fca5a5', textAlign: 'right', marginLeft: '0.8rem' }}>{msg}</span>}
          </div>
          <button style={{ ...primary, opacity: busy || !text.trim() ? 0.5 : 1 }} disabled={busy || !text.trim()} onClick={reply}>{busy ? tr('Envoi…') : tr('Répondre')}</button>
        </>)}
        <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          {thread.blockedByMe ? <button style={ghost} onClick={() => block(false)}>{tr('Débloquer')}</button> : <button style={ghost} onClick={() => block(true)}>{tr('Bloquer')}</button>}
          {!reporting && <button style={ghost} onClick={() => setReporting(true)}>{tr('Signaler')}</button>}
        </div>
        {reporting && (<div style={{ marginTop: '0.6rem' }}>
          <input value={reason} onChange={e => setReason(e.target.value)} maxLength={300} placeholder={tr('Motif du signalement (optionnel)')} style={{ ...field, resize: 'none' }} />
          <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.5rem' }}><button style={primary} onClick={report}>{tr('Envoyer le signalement')}</button><button style={ghost} onClick={() => setReporting(false)}>{tr('Annuler')}</button></div>
        </div>)}
      </div>
    );
  }

  if (convs === null) return <p style={{ color: MUTED, fontSize: '0.85rem' }}>…</p>;
  if (!convs.length) return <p style={{ color: '#9fb4cc', fontSize: '0.88rem', lineHeight: 1.6 }}>{tr('Aucune conversation pour l’instant. Ouvre la galerie d’un manager, retourne une de ses cartes et clique sur « Contacter le manager ».')}</p>;
  return (
    <div>
      <p style={rule}>{tr('Les échanges se font uniquement sur Sorare : pas de lien, d’e-mail, de téléphone ni de paiement ailleurs. Reste courtois.')}</p>
      {convs.map(c => (
        <div key={c.cid} onClick={() => open(c.cid)} style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', padding: '0.7rem 0.8rem', marginBottom: '0.5rem', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', border: '1px solid ' + (c.unread ? 'rgba(64,232,255,0.55)' : 'rgba(111,195,232,0.18)'), borderRadius: '0.4rem' }}>
          {c.card?.pictureUrl && <img src={c.card.pictureUrl} alt='' style={{ width: '36px', borderRadius: '0.25rem', flexShrink: 0 }} />}
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ margin: 0, fontSize: '0.86rem', fontWeight: 800, color: '#eaf2ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.otherPseudo} <span style={{ color: MUTED, fontWeight: 500 }}>· {c.card?.name}</span></p>
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.76rem', color: '#9fb4cc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.last}</p>
          </div>
          {c.unread > 0 && <span style={{ background: CY, color: '#041018', borderRadius: '999px', fontSize: '0.66rem', fontWeight: 900, padding: '0.15rem 0.5rem', flexShrink: 0 }}>{c.unread}</span>}
        </div>
      ))}
    </div>
  );
}
