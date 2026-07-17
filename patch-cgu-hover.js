const fs = require("fs");

const target = "app/page.tsx";
console.log("\n=== Patch : survol manquant sur le lien CGU ===\n");

if (!fs.existsSync(target)) {
  console.log("[ARRET] " + target + " introuvable. Previens Claude.");
  process.exit(1);
}

const original = fs.readFileSync(target, "utf8");

const anchor = "color:'rgba(255,255,255,0.15)',fontSize:'0.6rem',letterSpacing:'0.14em',textTransform:'uppercase',textDecoration:'none',fontFamily:'Courier New,monospace',pointerEvents:'auto'}}>CGU</a>";
const count = original.split(anchor).length - 1;
if (count !== 1) {
  console.log("[ARRET] Ancre CGU trouvee " + count + " fois (attendu: 1). Previens Claude.");
  process.exit(1);
}

const replacement = "color:'rgba(255,255,255,0.15)',fontSize:'0.6rem',letterSpacing:'0.14em',textTransform:'uppercase',textDecoration:'none',fontFamily:'Courier New,monospace',pointerEvents:'auto',transition:'color 0.2s'}} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color='rgba(64,232,255,0.6)';}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.15)';}}>CGU</a>";

const patched = original.replace(anchor, replacement);
fs.writeFileSync(target, patched);
console.log("[OK] Survol CGU ajoute (identique a SORARE)");

console.log("\nProchaine etape : npm run build pour tester la compilation (attends l'instruction de Claude).");
