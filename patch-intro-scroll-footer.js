const fs = require("fs");

const target = "app/page.tsx";
console.log("\n=== Patch groupe : scroll + repositionnement footer SORARE/CGU ===\n");

if (!fs.existsSync(target)) {
  console.log("[ARRET] " + target + " introuvable. Previens Claude.");
  process.exit(1);
}

const original = fs.readFileSync(target, "utf8");

if (original.includes("safe center")) {
  console.log("[ARRET] Le patch semble deja applique (marqueur 'safe center' trouve). Rien touche. Previens Claude.");
  process.exit(1);
}

let patched = original;
let changes = 0;

// 1) Conteneur intro : autoriser le defilement + reutiliser la scrollbar fine du projet
const containerAnchor = "position:'fixed',inset:0,zIndex:100,display:'flex',flexDirection:'column' as const,alignItems:'center',justifyContent:'center',overflow:'hidden'}}>";
const containerCount = patched.split(containerAnchor).length - 1;
if (containerCount !== 1) {
  console.log("[ARRET] Ancre conteneur trouvee " + containerCount + " fois (attendu: 1). Previens Claude.");
  process.exit(1);
}
const containerReplacement = "position:'fixed',inset:0,zIndex:100,display:'flex',flexDirection:'column' as const,alignItems:'center',justifyContent:'safe center',overflow:'auto'}} className='thin-sb'>";
patched = patched.replace(containerAnchor, containerReplacement);
changes++;

// 2) Footer SORARE/CGU : sort du positionnement absolu, rejoint le flux normal
const footerAnchor = "position:'absolute',bottom:'1.8rem',zIndex:2,display:'flex',gap:'2.5rem',alignItems:'center',pointerEvents:'none'";
const footerCount = patched.split(footerAnchor).length - 1;
if (footerCount !== 1) {
  console.log("[ARRET] Ancre footer trouvee " + footerCount + " fois (attendu: 1). Previens Claude.");
  process.exit(1);
}
const footerReplacement = "position:'relative',marginTop:'2.4rem',marginBottom:'1.4rem',zIndex:2,display:'flex',gap:'2.5rem',alignItems:'center'";
patched = patched.replace(footerAnchor, footerReplacement);
changes++;

fs.writeFileSync(target, patched);
console.log("[OK] " + changes + "/2 modifications appliquees dans " + target);
console.log("\nProchaine etape : npm run build pour tester la compilation (attends l'instruction de Claude).");
