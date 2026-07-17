const fs = require("fs");

const target = "app/page.tsx";
console.log("\n=== Patch : le footer SORARE/CGU ne doit plus intercepter les clics ===\n");

if (!fs.existsSync(target)) {
  console.log("[ARRET] " + target + " introuvable. Previens Claude.");
  process.exit(1);
}

const original = fs.readFileSync(target, "utf8");

if (original.includes("pointerEvents:'auto'}} target='_blank'") || original.includes(",pointerEvents:'none'}}><a href='https://sorare.com'")) {
  console.log("[ARRET] Le patch semble deja applique (marqueur trouve). Rien touche. Previens Claude.");
  process.exit(1);
}

let patched = original;
let changes = 0;

// 1) Le div conteneur : ne capte plus aucun clic sur sa surface
const divAnchor = "position:'absolute',bottom:'1.8rem',zIndex:2,display:'flex',gap:'2.5rem',alignItems:'center'";
const divCount = patched.split(divAnchor).length - 1;
if (divCount !== 1) {
  console.log("[ARRET] Ancre div trouvee " + divCount + " fois (attendu: 1). Previens Claude.");
  process.exit(1);
}
patched = patched.replace(divAnchor, divAnchor + ",pointerEvents:'none'");
changes++;

// 2) Le lien SORARE : redevient cliquable individuellement
const sorareAnchor = "color:'rgba(255,255,255,0.2)',fontSize:'0.6rem',letterSpacing:'0.14em',textTransform:'uppercase',textDecoration:'none',fontFamily:'Courier New,monospace',transition:'color 0.2s'";
const sorareCount = patched.split(sorareAnchor).length - 1;
if (sorareCount !== 1) {
  console.log("[ARRET] Ancre lien SORARE trouvee " + sorareCount + " fois (attendu: 1). Previens Claude.");
  process.exit(1);
}
patched = patched.replace(sorareAnchor, sorareAnchor + ",pointerEvents:'auto'");
changes++;

// 3) Le lien CGU : redevient cliquable individuellement
const cguAnchor = "color:'rgba(255,255,255,0.15)',fontSize:'0.6rem',letterSpacing:'0.14em',textTransform:'uppercase',textDecoration:'none',fontFamily:'Courier New,monospace'";
const cguCount = patched.split(cguAnchor).length - 1;
if (cguCount !== 1) {
  console.log("[ARRET] Ancre lien CGU trouvee " + cguCount + " fois (attendu: 1). Previens Claude.");
  process.exit(1);
}
patched = patched.replace(cguAnchor, cguAnchor + ",pointerEvents:'auto'");
changes++;

fs.writeFileSync(target, patched);
console.log("[OK] " + changes + "/3 modifications appliquees dans " + target);
console.log("\nProchaine etape : npm run build pour tester la compilation (attends l'instruction de Claude).");
