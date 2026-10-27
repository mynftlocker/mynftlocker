"use client";
import { useState } from 'react';
import { t as tr, useLang, addEn } from '../i18n';

// Sections du menu "Mon compte" : Authentification, Abonnement, Confidentialite & donnees, Aide / Contact.
addEn({
  'Connexion': 'Sign-in', 'E-mail + mot de passe': 'Email + password', 'Compte Sorare lié': 'Linked Sorare account',
  'Changer le mot de passe': 'Change password', 'Mot de passe actuel': 'Current password', 'Nouveau mot de passe': 'New password', 'Confirmer le nouveau mot de passe': 'Confirm new password',
  'Mettre à jour': 'Update', 'Mot de passe mis à jour.': 'Password updated.', 'Mot de passe actuel incorrect.': 'Current password is incorrect.',
  '8 caractères minimum, avec une majuscule, un chiffre et un caractère spécial.': 'At least 8 characters, with an uppercase letter, a number and a special character.',
  'Les deux mots de passe ne correspondent pas.': 'The two passwords do not match.', 'Erreur, réessaie dans un instant.': 'Something went wrong, please try again in a moment.',
  'La connexion avec ton compte Sorare officiel arrive prochainement.': 'Signing in with your official Sorare account is coming soon.',
  'Connecte-toi pour gérer ton compte.': 'Sign in to manage your account.',
  'Formule actuelle': 'Current plan', 'Gratuite': 'Free', 'myNFTlocker est gratuit pendant la phase de lancement. Si des options premium voient le jour, elles seront annoncées ici et sur X avant tout changement.': 'myNFTlocker is free during the launch phase. If premium options are introduced, they will be announced here and on X before anything changes.',
  'Ce que nous conservons': 'What we store', 'Pseudo, adresse e-mail et slug Sorare, pour ton compte.': 'Username, email address and Sorare slug, for your account.',
  'Ton mot de passe, chiffré (jamais lisible).': 'Your password, encrypted (never readable).',
  'Tes cartes sont lues en direct depuis l’API publique de Sorare : nous ne les stockons pas sur nos serveurs.': 'Your cards are read live from Sorare’s public API: we do not store them on our servers.',
  'Un cache de tes cartes et tes préférences sont gardés dans ton navigateur uniquement.': 'A cache of your cards and your preferences are kept in your browser only.',
  'L’e-mail de confirmation est envoyé via un prestataire d’envoi (Resend).': 'The confirmation email is sent through an email provider (Resend).',
  'Vider le cache de ce navigateur': 'Clear this browser’s cache', 'Cache vidé. Recharge la page pour récupérer tes cartes.': 'Cache cleared. Reload the page to fetch your cards again.',
  'Supprimer mon compte': 'Delete my account', 'Cette action est définitive. Entre ton mot de passe pour confirmer.': 'This cannot be undone. Enter your password to confirm.',
  'Confirmer la suppression': 'Confirm deletion', 'Annuler': 'Cancel', 'Mot de passe incorrect.': 'Incorrect password.',
  'Questions fréquentes': 'FAQ', 'Mes cartes ne s’affichent pas, que faire ?': 'My cards do not show up, what should I do?',
  'Vérifie ton slug Sorare (en minuscules) et recharge la page. Si besoin, vide le cache depuis « Confidentialité & données ».': 'Check your Sorare slug (lowercase) and reload the page. If needed, clear the cache from “Privacy & data”.',
  'D’où viennent les données ?': 'Where does the data come from?', 'De l’API publique de Sorare, en direct. myNFTlocker n’est pas affilié à Sorare.': 'From Sorare’s public API, live. myNFTlocker is not affiliated with Sorare.',
  'Une valeur te semble fausse ?': 'A value looks wrong?', 'Écris-nous avec le nom de la carte : nous vérifions à la source et corrigeons.': 'Write to us with the card name: we check at the source and fix it.',
  'Nous contacter': 'Contact us', 'Nous écrire par e-mail': 'Email us', 'Nous suivre sur X': 'Follow us on X',
  'Confidentialité & données': 'Privacy & data', 'Authentification': 'Authentication', 'Abonnement': 'Subscription', 'Aide / Contact': 'Help / Contact',
});

const box:React.CSSProperties={background:'rgba(255,255,255,0.03)',border:'1px solid rgba(111,195,232,0.18)',borderRadius:'0.4rem',padding:'0.85rem 1rem',marginBottom:'0.6rem'};
const h2:React.CSSProperties={margin:'1.4rem 0 0.6rem',fontSize:'0.72rem',fontWeight:800,letterSpacing:'0.14em',textTransform:'uppercase',color:'#eaf2ff'};
const label:React.CSSProperties={fontSize:'0.72rem',color:'#7a8898',letterSpacing:'0.04em',textTransform:'uppercase'};
const val:React.CSSProperties={fontSize:'0.9rem',color:'#eaf2ff',fontWeight:600};
const txt:React.CSSProperties={fontSize:'0.8rem',color:'#b9c7d9',lineHeight:1.65,margin:'0 0 0.4rem'};
const input:React.CSSProperties={width:'100%',boxSizing:'border-box',background:'rgba(255,255,255,0.05)',color:'#e8eefc',padding:'0.5rem 0.7rem',borderRadius:'0.2rem',border:'1px solid rgba(255,255,255,0.14)',outline:'none',fontSize:'0.85rem',marginBottom:'0.5rem'};
const btn=(danger?:boolean):React.CSSProperties=>({background:danger?'rgba(255,107,107,0.12)':'rgba(64,232,255,0.12)',border:'1px solid '+(danger?'rgba(255,107,107,0.55)':'rgba(64,232,255,0.5)'),color:danger?'#ff8a8a':'#40e8ff',padding:'0.55rem 1.4rem',fontSize:'0.74rem',fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',cursor:'pointer',borderRadius:'3px'});

const pwdOk=(p:string)=>p.length>=8&&/[A-Z]/.test(p)&&/[0-9]/.test(p)&&/[^A-Za-z0-9]/.test(p);

function ChangePassword(){
  useLang();
  const [cur,setCur]=useState('');const [nw,setNw]=useState('');const [cf,setCf]=useState('');
  const [msg,setMsg]=useState<{ok:boolean;text:string}|null>(null);const [busy,setBusy]=useState(false);
  const submit=async()=>{
    if(!pwdOk(nw)){setMsg({ok:false,text:tr('8 caractères minimum, avec une majuscule, un chiffre et un caractère spécial.')});return;}
    if(nw!==cf){setMsg({ok:false,text:tr('Les deux mots de passe ne correspondent pas.')});return;}
    setBusy(true);setMsg(null);
    try{
      const r=await fetch('/api/auth/password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({current:cur,next:nw})});
      const d=await r.json().catch(()=>({}));
      if(r.ok){setMsg({ok:true,text:tr('Mot de passe mis à jour.')});setCur('');setNw('');setCf('');}
      else setMsg({ok:false,text:d.error==='mot_de_passe_actuel_invalide'?tr('Mot de passe actuel incorrect.'):tr('Erreur, réessaie dans un instant.')});
    }catch{setMsg({ok:false,text:tr('Erreur, réessaie dans un instant.')});}
    setBusy(false);
  };
  return(<div style={box}>
    <p style={{...val,marginBottom:'0.7rem'}}>{tr('Changer le mot de passe')}</p>
    <input type='password' autoComplete='current-password' style={input} placeholder={tr('Mot de passe actuel')} value={cur} onChange={e=>setCur(e.target.value)}/>
    <input type='password' autoComplete='new-password' style={input} placeholder={tr('Nouveau mot de passe')} value={nw} onChange={e=>setNw(e.target.value)}/>
    <input type='password' autoComplete='new-password' style={input} placeholder={tr('Confirmer le nouveau mot de passe')} value={cf} onChange={e=>setCf(e.target.value)}/>
    <button disabled={busy||!cur||!nw||!cf} onClick={submit} style={{...btn(),opacity:(busy||!cur||!nw||!cf)?0.5:1}}>{tr('Mettre à jour')}</button>
    {msg&&<p style={{fontSize:'0.76rem',marginTop:'0.6rem',color:msg.ok?'#35e6a0':'#ff8a8a'}}>{msg.text}</p>}
  </div>);
}

function Privacy({user,onDeleted}:{user:any;onDeleted:()=>void}){
  useLang();
  const [cleared,setCleared]=useState(false);
  const [confirm,setConfirm]=useState(false);const [pw,setPw]=useState('');const [err,setErr]=useState('');const [busy,setBusy]=useState(false);
  const clearCache=()=>{try{Object.keys(localStorage).filter(k=>k.startsWith('mnfl_v')).forEach(k=>localStorage.removeItem(k));}catch{}setCleared(true);};
  const del=async()=>{
    setBusy(true);setErr('');
    try{
      const r=await fetch('/api/auth/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw})});
      if(r.ok){onDeleted();return;}
      const d=await r.json().catch(()=>({}));
      setErr(d.error==='mot_de_passe_invalide'?tr('Mot de passe incorrect.'):tr('Erreur, réessaie dans un instant.'));
    }catch{setErr(tr('Erreur, réessaie dans un instant.'));}
    setBusy(false);
  };
  return(<div>
    <p style={h2}>{tr('Ce que nous conservons')}</p>
    <div style={box}>
      {['Pseudo, adresse e-mail et slug Sorare, pour ton compte.','Ton mot de passe, chiffré (jamais lisible).','Tes cartes sont lues en direct depuis l’API publique de Sorare : nous ne les stockons pas sur nos serveurs.','Un cache de tes cartes et tes préférences sont gardés dans ton navigateur uniquement.','L’e-mail de confirmation est envoyé via un prestataire d’envoi (Resend).'].map(s=>(<p key={s} style={txt}>• {tr(s)}</p>))}
    </div>
    <div style={{marginTop:'0.8rem'}}>
      <button onClick={clearCache} style={btn()}>{tr('Vider le cache de ce navigateur')}</button>
      {cleared&&<p style={{fontSize:'0.76rem',marginTop:'0.6rem',color:'#35e6a0'}}>{tr('Cache vidé. Recharge la page pour récupérer tes cartes.')}</p>}
    </div>
    {user&&(<div style={{marginTop:'1.6rem',paddingTop:'1rem',borderTop:'1px solid rgba(255,255,255,0.08)'}}>
      {!confirm?(<button onClick={()=>setConfirm(true)} style={btn(true)}>{tr('Supprimer mon compte')}</button>):(
        <div style={box}>
          <p style={txt}>{tr('Cette action est définitive. Entre ton mot de passe pour confirmer.')}</p>
          <input type='password' autoComplete='current-password' style={input} placeholder={tr('Mot de passe')} value={pw} onChange={e=>setPw(e.target.value)}/>
          <div style={{display:'flex',gap:'0.6rem',flexWrap:'wrap'}}>
            <button disabled={busy||!pw} onClick={del} style={{...btn(true),opacity:(busy||!pw)?0.5:1}}>{tr('Confirmer la suppression')}</button>
            <button onClick={()=>{setConfirm(false);setPw('');setErr('');}} style={btn()}>{tr('Annuler')}</button>
          </div>
          {err&&<p style={{fontSize:'0.76rem',marginTop:'0.6rem',color:'#ff8a8a'}}>{err}</p>}
        </div>
      )}
    </div>)}
  </div>);
}

export default function AccountSection({section,user,onLogin,onDeleted}:{section:string;user:any;onLogin:()=>void;onDeleted:()=>void}){
  useLang();
  if(section==='auth'){
    if(!user)return(<div style={{textAlign:'center',padding:'2.5rem 1rem'}}><p style={{color:'#cfe4fb',fontSize:'0.95rem',marginBottom:'1.4rem'}}>{tr('Connecte-toi pour gérer ton compte.')}</p><button onClick={onLogin} style={btn()}>{tr('Se connecter')}</button></div>);
    return(<div>
      <div style={{...box,display:'flex',justifyContent:'space-between',gap:'1rem'}}><span style={label}>{tr('Connexion')}</span><span style={val}>{tr('E-mail + mot de passe')}</span></div>
      <div style={{...box,display:'flex',justifyContent:'space-between',gap:'1rem'}}><span style={label}>{tr('Compte Sorare lié')}</span><span style={val}>{user.sorareSlug||'—'}</span></div>
      <ChangePassword/>
      <p style={{fontSize:'0.74rem',color:'#7a8898',lineHeight:1.6}}>{tr('La connexion avec ton compte Sorare officiel arrive prochainement.')}</p>
    </div>);
  }
  if(section==='abo'){
    return(<div>
      <div style={{...box,display:'flex',justifyContent:'space-between',gap:'1rem'}}><span style={label}>{tr('Formule actuelle')}</span><span style={{...val,color:'#f5d76e'}}>{tr('Gratuite')}</span></div>
      <p style={{...txt,marginTop:'0.8rem'}}>{tr('myNFTlocker est gratuit pendant la phase de lancement. Si des options premium voient le jour, elles seront annoncées ici et sur X avant tout changement.')}</p>
    </div>);
  }
  if(section==='confidentialite')return <Privacy user={user} onDeleted={onDeleted}/>;
  // aide
  return(<div>
    <p style={h2}>{tr('Questions fréquentes')}</p>
    {[['Mes cartes ne s’affichent pas, que faire ?','Vérifie ton slug Sorare (en minuscules) et recharge la page. Si besoin, vide le cache depuis « Confidentialité & données ».'],['D’où viennent les données ?','De l’API publique de Sorare, en direct. myNFTlocker n’est pas affilié à Sorare.'],['Une valeur te semble fausse ?','Écris-nous avec le nom de la carte : nous vérifions à la source et corrigeons.']].map(([q,a])=>(
      <div key={q} style={box}><p style={{...val,fontSize:'0.82rem',marginBottom:'0.3rem'}}>{tr(q)}</p><p style={{...txt,margin:0}}>{tr(a)}</p></div>
    ))}
    <p style={h2}>{tr('Nous contacter')}</p>
    <div style={{display:'flex',gap:'0.6rem',flexWrap:'wrap'}}>
      <a href='https://x.com/myNFTlocker' target='_blank' rel='noopener noreferrer' style={{...btn(),textDecoration:'none',display:'inline-block'}}>{tr('Nous suivre sur X')}</a>
      <a href='mailto:contact@mynftlocker.com' style={{...btn(),textDecoration:'none',display:'inline-block'}}>{tr('Nous écrire par e-mail')}</a>
    </div>
  </div>);
}
