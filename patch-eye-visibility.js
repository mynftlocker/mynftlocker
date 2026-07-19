const fs = require("fs");

const target = "app/page.tsx";
console.log("\n=== Patch : icone oeil plus visible ===\n");

if (!fs.existsSync(target)) {
  console.log("[ARRET] " + target + " introuvable. Previens Claude.");
  process.exit(1);
}

const original = fs.readFileSync(target, "utf8");

const anchor = "style={{position:'absolute',right:'0.5rem',top:'50%',transform:'translateY(-50%)',cursor:'pointer',fontSize:'0.8rem',color:'rgba(207,228,251,0.5)',userSelect:'none' as const}}>👁</span>";
const count = original.split(anchor).length - 1;
if (count !== 1) {
  console.log("[ARRET] Ancre oeil trouvee " + count + " fois (attendu: 1). Previens Claude.");
  process.exit(1);
}

const replacement = "style={{position:'absolute',right:'0.6rem',top:'50%',transform:'translateY(-50%)',cursor:'pointer',fontSize:'1.15rem',color:'rgba(64,232,255,0.85)',userSelect:'none' as const}}>👁</span>";

const patched = original.replace(anchor, replacement);
fs.writeFileSync(target, patched);
console.log("[OK] Icone oeil : taille et contraste augmentes");

console.log("\nProchaine etape : npm run build pour tester la compilation (attends l'instruction de Claude).");
