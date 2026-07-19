const fs = require("fs");

const target = "app/page.tsx";
console.log("\n=== Patch : pendingVerification + oeil maintenir-clic ===\n");

if (!fs.existsSync(target)) {
  console.log("[ARRET] " + target + " introuvable. Previens Claude.");
  process.exit(1);
}

const original = fs.readFileSync(target, "utf8");

if (original.includes("pendingVerification")) {
  console.log("[ARRET] Le patch semble deja applique (marqueur 'pendingVerification' trouve). Rien touche. Previens Claude.");
  process.exit(1);
}

let patched = original;
let changes = 0;

// 1) submitAuth : gerer le cas signup en attente de verification (ne pas connecter, ne pas fermer, afficher un message)
const submitAnchor = `      setCurrentUser({pseudo:d.pseudo,email:d.email,sorareSlug:d.sorareSlug});
      setAuthLoading(false);
      startAuthClose();
      if(d.sorareSlug){ setSlug(d.sorareSlug); setJustLoggedIn(true); }`;
const submitCount = patched.split(submitAnchor).length - 1;
if (submitCount !== 1) {
  console.log("[ARRET] Ancre submitAuth trouvee " + submitCount + " fois (attendu: 1). Previens Claude.");
  process.exit(1);
}
const submitReplacement = `      if(d.pendingVerification){
        setAuthLoading(false);
        setAuthError('');
        setAuthPseudo(''); setAuthSlugField(''); setAuthPassword(''); setAuthPasswordConfirm('');
        setAuthVerifyPending(true);
        return;
      }
      setCurrentUser({pseudo:d.pseudo,email:d.email,sorareSlug:d.sorareSlug});
      setAuthLoading(false);
      startAuthClose();
      if(d.sorareSlug){ setSlug(d.sorareSlug); setJustLoggedIn(true); }`;
patched = patched.replace(submitAnchor, submitReplacement);
changes++;

// 2) Nouvel etat authVerifyPending, a cote des autres etats auth
const stateAnchor = "  const [authShowPassword,setAuthShowPassword]=useState(false);";
const stateCount = patched.split(stateAnchor).length - 1;
if (stateCount !== 1) {
  console.log("[ARRET] Ancre etat authVerifyPending trouvee " + stateCount + " fois (attendu: 1). Previens Claude.");
  process.exit(1);
}
patched = patched.replace(stateAnchor, stateAnchor + "\n  const [authVerifyPending,setAuthVerifyPending]=useState(false);");
changes++;

// 3) Remise a zero de authVerifyPending a chaque ouverture/fermeture propre du panneau (dans startAuthClose)
const closeAnchor = "const startAuthClose=()=>{ setAuthClosing(true); setTimeout(()=>{ setAuthOpen(false); setAuthClosing(false); setAuthError(''); },450); };";
const closeCount = patched.split(closeAnchor).length - 1;
if (closeCount !== 1) {
  console.log("[ARRET] Ancre startAuthClose trouvee " + closeCount + " fois (attendu: 1). Previens Claude.");
  process.exit(1);
}
patched = patched.replace(closeAnchor, "const startAuthClose=()=>{ setAuthClosing(true); setTimeout(()=>{ setAuthOpen(false); setAuthClosing(false); setAuthError(''); setAuthVerifyPending(false); },450); };");
changes++;

// 4) JSX : champ mot de passe (oeil maintenir-clic, plus de singe) + champ confirmation (meme comportement, pas d'oeil propre)
const pwdAnchor = `            <div style={{position:'relative',marginBottom:authMode==='signup'?'0.3rem':'0.8rem'}}>
              <input value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder='Mot de passe' type={authShowPassword?'text':'password'} onKeyDown={e=>e.key==='Enter'&&submitAuth()} style={{width:'100%',boxSizing:'border-box' as const,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(64,232,255,0.3)',color:'#cfe4fb',padding:'0.5rem 2rem 0.5rem 0.6rem',fontSize:'0.8rem',fontFamily:'Courier New,monospace',outline:'none'}}/>
              <span onClick={()=>setAuthShowPassword(v=>!v)} style={{position:'absolute',right:'0.5rem',top:'50%',transform:'translateY(-50%)',cursor:'pointer',fontSize:'0.75rem',color:'rgba(207,228,251,0.5)',userSelect:'none' as const}}>{authShowPassword?'🙈':'👁️'}</span>
            </div>
            {authMode==='signup'&&<input value={authPasswordConfirm} onChange={e=>setAuthPasswordConfirm(e.target.value)} placeholder='Confirmer le mot de passe' type={authShowPassword?'text':'password'} onKeyDown={e=>e.key==='Enter'&&submitAuth()} style={{width:'100%',boxSizing:'border-box' as const,background:'rgba(255,255,255,0.05)',border:'1px solid '+(authPasswordConfirm&&authPassword!==authPasswordConfirm?'rgba(252,165,165,0.6)':'rgba(64,232,255,0.3)'),color:'#cfe4fb',padding:'0.5rem 0.6rem',fontSize:'0.8rem',marginBottom:'0.3rem',fontFamily:'Courier New,monospace',outline:'none'}}/>}`;
const pwdCount = patched.split(pwdAnchor).length - 1;
if (pwdCount !== 1) {
  console.log("[ARRET] Ancre bloc mot de passe trouvee " + pwdCount + " fois (attendu: 1). Previens Claude.");
  process.exit(1);
}
const pwdReplacement = `            <div style={{position:'relative',marginBottom:authMode==='signup'?'0.3rem':'0.8rem'}}>
              <input value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder='Mot de passe' type={authShowPassword?'text':'password'} onKeyDown={e=>e.key==='Enter'&&submitAuth()} style={{width:'100%',boxSizing:'border-box' as const,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(64,232,255,0.3)',color:'#cfe4fb',padding:'0.5rem 2rem 0.5rem 0.6rem',fontSize:'0.8rem',fontFamily:'Courier New,monospace',outline:'none'}}/>
              <span
                onMouseDown={()=>setAuthShowPassword(true)}
                onMouseUp={()=>setAuthShowPassword(false)}
                onMouseLeave={()=>setAuthShowPassword(false)}
                onTouchStart={()=>setAuthShowPassword(true)}
                onTouchEnd={()=>setAuthShowPassword(false)}
                style={{position:'absolute',right:'0.5rem',top:'50%',transform:'translateY(-50%)',cursor:'pointer',fontSize:'0.8rem',color:'rgba(207,228,251,0.5)',userSelect:'none' as const}}>👁</span>
            </div>
            {authMode==='signup'&&<input value={authPasswordConfirm} onChange={e=>setAuthPasswordConfirm(e.target.value)} placeholder='Confirmer le mot de passe' type={authShowPassword?'text':'password'} onKeyDown={e=>e.key==='Enter'&&submitAuth()} style={{width:'100%',boxSizing:'border-box' as const,background:'rgba(255,255,255,0.05)',border:'1px solid '+(authPasswordConfirm&&authPassword!==authPasswordConfirm?'rgba(252,165,165,0.6)':'rgba(64,232,255,0.3)'),color:'#cfe4fb',padding:'0.5rem 0.6rem',fontSize:'0.8rem',marginBottom:'0.3rem',fontFamily:'Courier New,monospace',outline:'none'}}/>}`;
patched = patched.replace(pwdAnchor, pwdReplacement);
changes++;

// 5) Message de succes en attente de verification, juste avant le bouton S'inscrire/Se connecter
const btnAnchor = "            {authError&&<p style={{color:'#fca5a5',fontSize:'0.66rem',marginBottom:'0.6rem'}}>{authError}</p>}\n            <button onClick={submitAuth} disabled={authLoading}";
const btnCount = patched.split(btnAnchor).length - 1;
if (btnCount !== 1) {
  console.log("[ARRET] Ancre message/bouton trouvee " + btnCount + " fois (attendu: 1). Previens Claude.");
  process.exit(1);
}
const btnReplacement = `            {authError&&<p style={{color:'#fca5a5',fontSize:'0.66rem',marginBottom:'0.6rem'}}>{authError}</p>}
            {authVerifyPending&&<p style={{color:'#7dd3fc',fontSize:'0.68rem',marginBottom:'0.7rem',lineHeight:1.5}}>Compte cree ! Verifie ta boite mail (et les spams) pour confirmer ton adresse avant de te connecter.</p>}
            <button onClick={submitAuth} disabled={authLoading||authVerifyPending}`;
patched = patched.replace(btnAnchor, btnReplacement);
changes++;

fs.writeFileSync(target, patched);
console.log("[OK] " + changes + "/5 modifications appliquees dans " + target);
console.log("\nProchaine etape : npm run build pour tester la compilation (attends l'instruction de Claude).");
