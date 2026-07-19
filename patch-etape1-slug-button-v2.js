const fs = require("fs");

const target = "app/page.tsx";
console.log("\n=== Etape 1 (v2) : bouton slug separe, desktop + mobile ===\n");

if (!fs.existsSync(target)) {
  console.log("[ARRET] " + target + " introuvable. Previens Claude.");
  process.exit(1);
}

const original = fs.readFileSync(target, "utf8");

if (original.includes("slugPanelOpen")) {
  console.log("[ARRET] Le patch semble deja applique (marqueur 'slugPanelOpen' trouve). Rien touche. Previens Claude.");
  process.exit(1);
}

let patched = original;
let changes = 0;

// 1) Nouvel etat pour le panneau slug independant, ajoute juste apres la ligne useState acctOpen (peu importe l'espacement)
const stateRegex = /const \[acctOpen,\s*setAcctOpen\]\s*=\s*useState\(false\);/;
const stateMatches = original.match(new RegExp(stateRegex.source, "g"));
if (!stateMatches || stateMatches.length !== 1) {
  console.log("[ARRET] Etat acctOpen trouve " + (stateMatches ? stateMatches.length : 0) + " fois (attendu: 1). Previens Claude.");
  process.exit(1);
}
patched = patched.replace(stateRegex, stateMatches[0] + "\n  const [slugPanelOpen, setSlugPanelOpen] = useState(false);");
changes++;

// 2) Bloc DESKTOP : chevron -> fleche independante, panneau utilise slugPanelOpen
const desktopAnchor = `            <span style={{fontSize:'0.6rem',color:'#6fc3e8',opacity:0.8}}>{(acctOpen||cards.length===0)?'▲':'▼'}</span>
          </div>
          {(acctOpen||cards.length===0)&&(
            <input style={{background:'rgba(255,255,255,0.05)',color:'#cfe4fb',padding:'0.28rem 0.55rem',borderRadius:'0.15rem',border:'1px solid rgba(255,255,255,0.1)',outline:'none',fontSize:'0.76rem',boxSizing:'border-box'}} placeholder='ton-slug-sorare' value={slug} onChange={e=>setSlug(e.target.value)} onKeyDown={e=>e.key==='Enter'&&fetchCards()}/>
          )}`;
const desktopCount = patched.split(desktopAnchor).length - 1;
if (desktopCount !== 1) {
  console.log("[ARRET] Ancre desktop trouvee " + desktopCount + " fois (attendu: 1). Previens Claude.");
  process.exit(1);
}
const desktopReplacement = `            <span onClick={e=>{e.stopPropagation();setSlugPanelOpen(o=>!o);}} title='Changer de galerie consultee' style={{fontSize:'0.85rem',color:slugPanelOpen?'#f5d76e':'#6fc3e8',opacity:0.85,padding:'0.1rem 0.3rem',cursor:'pointer'}}>⇄</span>
          </div>
          {(slugPanelOpen||cards.length===0)&&(
            <input style={{background:'rgba(255,255,255,0.05)',color:'#cfe4fb',padding:'0.28rem 0.55rem',borderRadius:'0.15rem',border:'1px solid rgba(255,255,255,0.1)',outline:'none',fontSize:'0.76rem',boxSizing:'border-box'}} placeholder='ton-slug-sorare' value={slug} onChange={e=>setSlug(e.target.value)} onKeyDown={e=>e.key==='Enter'&&fetchCards()}/>
          )}`;
patched = patched.replace(desktopAnchor, desktopReplacement);
changes++;

// 3) Bloc MOBILE : meme logique
const mobileAnchor = `              <span style={{fontSize:'0.65rem',color:'#6fc3e8',opacity:0.8}}>{(acctOpen||cards.length===0)?'▲':'▼'}</span>
              </div>
            </div>
            {(acctOpen||cards.length===0)&&(
              <input style={{background:'rgba(255,255,255,0.05)',color:'#cfe4fb',padding:'0.4rem 0.6rem',borderRadius:'0.2rem',border:'1px solid rgba(255,255,255,0.1)',outline:'none',fontSize:'0.85rem',boxSizing:'border-box' as const}} placeholder='ton-slug-sorare' value={slug} onChange={e=>setSlug(e.target.value)} onKeyDown={e=>e.key==='Enter'&&fetchCards()}/>
            )}`;
const mobileCount = patched.split(mobileAnchor).length - 1;
if (mobileCount !== 1) {
  console.log("[ARRET] Ancre mobile trouvee " + mobileCount + " fois (attendu: 1). Previens Claude.");
  process.exit(1);
}
const mobileReplacement = `              <span onClick={e=>{e.stopPropagation();setSlugPanelOpen(o=>!o);}} title='Changer de galerie consultee' style={{fontSize:'0.9rem',color:slugPanelOpen?'#f5d76e':'#6fc3e8',opacity:0.85,padding:'0.1rem 0.3rem',cursor:'pointer'}}>⇄</span>
              </div>
            </div>
            {(slugPanelOpen||cards.length===0)&&(
              <input style={{background:'rgba(255,255,255,0.05)',color:'#cfe4fb',padding:'0.4rem 0.6rem',borderRadius:'0.2rem',border:'1px solid rgba(255,255,255,0.1)',outline:'none',fontSize:'0.85rem',boxSizing:'border-box' as const}} placeholder='ton-slug-sorare' value={slug} onChange={e=>setSlug(e.target.value)} onKeyDown={e=>e.key==='Enter'&&fetchCards()}/>
            )}`;
patched = patched.replace(mobileAnchor, mobileReplacement);
changes++;

fs.writeFileSync(target, patched);
console.log("[OK] " + changes + "/3 modifications appliquees dans " + target);
console.log("\nProchaine etape : npm run build pour tester la compilation (attends l'instruction de Claude).");
