const fs = require("fs");

const target = "app/page.tsx";
console.log("\n=== Correctif : balise div manquante (enveloppe menu compte) ===\n");

if (!fs.existsSync(target)) {
  console.log("[ARRET] " + target + " introuvable. Previens Claude.");
  process.exit(1);
}

const original = fs.readFileSync(target, "utf8");

const anchor = `          {(slugPanelOpen||cards.length===0)&&(
            <input style={{background:'rgba(255,255,255,0.05)',color:'#cfe4fb',padding:'0.28rem 0.55rem',borderRadius:'0.15rem',border:'1px solid rgba(255,255,255,0.1)',outline:'none',fontSize:'0.76rem',boxSizing:'border-box'}} placeholder='ton-slug-sorare' value={slug} onChange={e=>setSlug(e.target.value)} onKeyDown={e=>e.key==='Enter'&&fetchCards()}/>
          )}
        </div>

        {/* NAV Vestiaire / Galerie */}`;

const count = original.split(anchor).length - 1;
if (count !== 1) {
  console.log("[ARRET] Ancre trouvee " + count + " fois (attendu: 1). Previens Claude.");
  process.exit(1);
}

if (!original.includes("acctMenuSection")) {
  console.log("[ARRET] Le marqueur 'acctMenuSection' est absent : le patch etape 2 ne semble pas applique. Previens Claude avant de continuer.");
  process.exit(1);
}

const replacement = `          {(slugPanelOpen||cards.length===0)&&(
            <input style={{background:'rgba(255,255,255,0.05)',color:'#cfe4fb',padding:'0.28rem 0.55rem',borderRadius:'0.15rem',border:'1px solid rgba(255,255,255,0.1)',outline:'none',fontSize:'0.76rem',boxSizing:'border-box'}} placeholder='ton-slug-sorare' value={slug} onChange={e=>setSlug(e.target.value)} onKeyDown={e=>e.key==='Enter'&&fetchCards()}/>
          )}
          </div>
        </div>

        {/* NAV Vestiaire / Galerie */}`;

const patched = original.replace(anchor, replacement);
fs.writeFileSync(target, patched);
console.log("[OK] Balise fermante manquante ajoutee");

console.log("\nProchaine etape : npm run build pour tester la compilation (attends l'instruction de Claude).");
