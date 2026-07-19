const fs = require("fs");

const target = "app/page.tsx";
console.log("\n=== Patch : oeil mot de passe + confirmation ===\n");

if (!fs.existsSync(target)) {
  console.log("[ARRET] " + target + " introuvable. Previens Claude.");
  process.exit(1);
}

const original = fs.readFileSync(target, "utf8");

if (original.includes("authShowPassword")) {
  console.log("[ARRET] Le patch semble deja applique (marqueur 'authShowPassword' trouve). Rien touche. Previens Claude.");
  process.exit(1);
}

let patched = original;
let changes = 0;

// 1) Ajout des nouveaux etats, juste apres la declaration de authPassword
const stateAnchor = "  const [authPassword,setAuthPassword]=useState('');";
const stateCount = patched.split(stateAnchor).length - 1;
if (stateCount !== 1) {
  console.log("[ARRET] Ancre etats trouvee " + stateCount + " fois (attendu: 1). Previens Claude.");
  process.exit(1);
}
patched = patched.replace(
  stateAnchor,
  stateAnchor + "\n  const [authPasswordConfirm,setAuthPasswordConfirm]=useState('');\n  const [authShowPassword,setAuthShowPassword]=useState(false);"
);
changes++;

// 2) Verification cote client : mots de passe identiques en mode inscription, avant l'appel reseau
const submitAnchor = "  const submitAuth=async()=>{\n    setAuthError(''); setAuthLoading(true);";
const submitCount = patched.split(submitAnchor).length - 1;
if (submitCount !== 1) {
  console.log("[ARRET] Ancre submitAuth trouvee " + submitCount + " fois (attendu: 1). Previens Claude.");
  process.exit(1);
}
patched = patched.replace(
  submitAnchor,
  "  const submitAuth=async()=>{\n    if(authMode==='signup'&&authPassword!==authPasswordConfirm){ setAuthError('Les mots de passe ne correspondent pas.'); return; }\n    setAuthError(''); setAuthLoading(true);"
);
changes++;

// 3) Le champ mot de passe : type dynamique + icone oeil a droite (on enveloppe le input existant)
const pwdAnchor = "            <input value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder='Mot de passe' type='password' onKeyDown={e=>e.key==='Enter'&&submitAuth()} style={{width:'100%',boxSizing:'border-box' as const,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(64,232,255,0.3)',color:'#cfe4fb',padding:'0.5rem 0.6rem',fontSize:'0.8rem',marginBottom:authMode==='signup'?'0.3rem':'0.8rem',fontFamily:'Courier New,monospace',outline:'none'}}/>";
const pwdCount = patched.split(pwdAnchor).length - 1;
if (pwdCount !== 1) {
  console.log("[ARRET] Ancre champ mot de passe trouvee " + pwdCount + " fois (attendu: 1). Previens Claude.");
  process.exit(1);
}
const pwdReplacement = `            <div style={{position:'relative',marginBottom:authMode==='signup'?'0.3rem':'0.8rem'}}>
              <input value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder='Mot de passe' type={authShowPassword?'text':'password'} onKeyDown={e=>e.key==='Enter'&&submitAuth()} style={{width:'100%',boxSizing:'border-box' as const,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(64,232,255,0.3)',color:'#cfe4fb',padding:'0.5rem 2rem 0.5rem 0.6rem',fontSize:'0.8rem',fontFamily:'Courier New,monospace',outline:'none'}}/>
              <span onClick={()=>setAuthShowPassword(v=>!v)} style={{position:'absolute',right:'0.5rem',top:'50%',transform:'translateY(-50%)',cursor:'pointer',fontSize:'0.75rem',color:'rgba(207,228,251,0.5)',userSelect:'none' as const}}>{authShowPassword?'🙈':'👁️'}</span>
            </div>
            {authMode==='signup'&&<input value={authPasswordConfirm} onChange={e=>setAuthPasswordConfirm(e.target.value)} placeholder='Confirmer le mot de passe' type={authShowPassword?'text':'password'} onKeyDown={e=>e.key==='Enter'&&submitAuth()} style={{width:'100%',boxSizing:'border-box' as const,background:'rgba(255,255,255,0.05)',border:'1px solid '+(authPasswordConfirm&&authPassword!==authPasswordConfirm?'rgba(252,165,165,0.6)':'rgba(64,232,255,0.3)'),color:'#cfe4fb',padding:'0.5rem 0.6rem',fontSize:'0.8rem',marginBottom:'0.3rem',fontFamily:'Courier New,monospace',outline:'none'}}/>}`;
patched = patched.replace(pwdAnchor, pwdReplacement);
changes++;

fs.writeFileSync(target, patched);
console.log("[OK] " + changes + "/3 modifications appliquees dans " + target);
console.log("\nProchaine etape : npm run build pour tester la compilation (attends l'instruction de Claude).");
