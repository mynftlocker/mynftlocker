const fs = require("fs");

const target = "app/page.tsx";
console.log("\n=== Etape 1 : bouton slug separe ===\n");

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

// 1) Nouvel etat pour le panneau slug independant
const stateAnchor = "  const [acctOpen,setAcctOpen]=useState(false);";
const stateCount = patched.split(stateAnchor).length - 1;
if (stateCount !== 1) {
  console.log("[ARRET] Ancre etat acctOpen trouvee " + stateCount + " fois (attendu: 1). Previens Claude.");
  process.exit(1);
}
patched = patched.replace(stateAnchor, stateAnchor + "\n  const [slugPanelOpen,setSlugPanelOpen]=useState(false);");
changes++;

// 2) Le bloc avatar : ajout du bouton flèche a droite (avant le chevron), le panneau slug utilise desormais slugPanelOpen
const blockAnchor = `            {cards.length>0&&(()=>{const b=collectionBadge(cards.length);return(<img title={cards.length+' cartes'} src={'/'+b.img} alt='' style={{width:'40px',height:'40px',flexShrink:0,objectFit:'contain'}} onError={(e)=>{(e.target as HTMLImageElement).style.display='none';}}/>);})()}
            <span style={{fontSize:'0.6rem',color:'#6fc3e8',opacity:0.8}}>{(acctOpen||cards.length===0)?'▲':'▼'}</span>
          </div>
          {(acctOpen||cards.length===0)&&(
            <input style={{background:'rgba(255,255,255,0.05)',color:'#cfe4fb',padding:'0.28rem 0.55rem',borderRadius:'0.15rem',border:'1px solid rgba(255,255,255,0.1)',outline:'none',fontSize:'0.76rem',boxSizing:'border-box'}} placeholder='ton-slug-sorare' value={slug} onChange={e=>setSlug(e.target.value)} onKeyDown={e=>e.key==='Enter'&&fetchCards()}/>
          )}
        </div>`;
const blockCount = patched.split(blockAnchor).length - 1;
if (blockCount !== 1) {
  console.log("[ARRET] Ancre bloc avatar/slug trouvee " + blockCount + " fois (attendu: 1). Previens Claude.");
  process.exit(1);
}
const blockReplacement = `            {cards.length>0&&(()=>{const b=collectionBadge(cards.length);return(<img title={cards.length+' cartes'} src={'/'+b.img} alt='' style={{width:'40px',height:'40px',flexShrink:0,objectFit:'contain'}} onError={(e)=>{(e.target as HTMLImageElement).style.display='none';}}/>);})()}
            <span onClick={e=>{e.stopPropagation();setSlugPanelOpen(o=>!o);}} title='Changer de galerie consultee' style={{fontSize:'0.85rem',color:slugPanelOpen?'#f5d76e':'#6fc3e8',opacity:0.85,padding:'0.1rem 0.3rem',cursor:'pointer'}}>⇄</span>
          </div>
          {(slugPanelOpen||cards.length===0)&&(
            <input style={{background:'rgba(255,255,255,0.05)',color:'#cfe4fb',padding:'0.28rem 0.55rem',borderRadius:'0.15rem',border:'1px solid rgba(255,255,255,0.1)',outline:'none',fontSize:'0.76rem',boxSizing:'border-box'}} placeholder='ton-slug-sorare' value={slug} onChange={e=>setSlug(e.target.value)} onKeyDown={e=>e.key==='Enter'&&fetchCards()}/>
          )}
        </div>`;
patched = patched.replace(blockAnchor, blockReplacement);
changes++;

fs.writeFileSync(target, patched);
console.log("[OK] " + changes + "/2 modifications appliquees dans " + target);
console.log("\nProchaine etape : npm run build pour tester la compilation (attends l'instruction de Claude).");
