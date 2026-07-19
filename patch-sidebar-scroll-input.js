const fs = require("fs");

const target = "app/page.tsx";
console.log("\n=== Patch : input slug pleine largeur + sidebar scrollable ===\n");

if (!fs.existsSync(target)) {
  console.log("[ARRET] " + target + " introuvable. Previens Claude.");
  process.exit(1);
}

const original = fs.readFileSync(target, "utf8");
const usesCRLF = original.includes("\r\n");
let code = original.replace(/\r\n/g, "\n");

if (code.includes("mnfl-sidebar thin-sb")) {
  console.log("[ARRET] Le patch semble deja applique. Rien touche. Previens Claude.");
  process.exit(1);
}

let changes = 0;

// 1) Input slug : pleine largeur comme les autres elements
const inputAnchor = `            <input style={{background:'rgba(255,255,255,0.05)',color:'#cfe4fb',padding:'0.28rem 0.55rem',borderRadius:'0.15rem',border:'1px solid rgba(255,255,255,0.1)',outline:'none',fontSize:'0.76rem',boxSizing:'border-box'}} placeholder='ton-slug-sorare' value={slug} onChange={e=>setSlug(e.target.value)} onKeyDown={e=>e.key==='Enter'&&fetchCards()}/>`;
const inputCount = code.split(inputAnchor).length - 1;
if (inputCount !== 1) {
  console.log("[ARRET] Ancre input slug trouvee " + inputCount + " fois (attendu: 1). Previens Claude.");
  process.exit(1);
}
const inputReplacement = `            <input style={{width:'100%',background:'rgba(255,255,255,0.05)',color:'#cfe4fb',padding:'0.28rem 0.55rem',borderRadius:'0.15rem',border:'1px solid rgba(255,255,255,0.1)',outline:'none',fontSize:'0.76rem',boxSizing:'border-box'}} placeholder='ton-slug-sorare' value={slug} onChange={e=>setSlug(e.target.value)} onKeyDown={e=>e.key==='Enter'&&fetchCards()}/>`;
code = code.replace(inputAnchor, inputReplacement);
changes++;

// 2) CSS : retirer la regle qui masque de force la scrollbar de aside
const cssAnchor = "aside::-webkit-scrollbar,.noscroll::-webkit-scrollbar{width:0;height:0;display:none}";
const cssCount = code.split(cssAnchor).length - 1;
if (cssCount !== 1) {
  console.log("[ARRET] Ancre CSS scrollbar trouvee " + cssCount + " fois (attendu: 1). Previens Claude.");
  process.exit(1);
}
code = code.replace(cssAnchor, ".noscroll::-webkit-scrollbar{width:0;height:0;display:none}");
changes++;

// 3) aside : overflow auto + scrollbar fine + classe thin-sb
const asideAnchor = "<aside className='mnfl-sidebar' style={{position:'fixed',left:0,top:0,width:'220px',height:'100vh',overflow:'hidden',";
const asideCount = code.split(asideAnchor).length - 1;
if (asideCount !== 1) {
  console.log("[ARRET] Ancre aside trouvee " + asideCount + " fois (attendu: 1). Previens Claude.");
  process.exit(1);
}
code = code.replace(asideAnchor, "<aside className='mnfl-sidebar thin-sb' style={{position:'fixed',left:0,top:0,width:'220px',height:'100vh',overflow:'auto',");
changes++;

// 4) aside : scrollbarWidth none -> thin (Firefox)
const sbAnchor = "zIndex:50,scrollbarWidth:'none',display:'flex',flexDirection:'column' as const,gap:'0',fontFamily:\"'Inter','Segoe UI',system-ui,-apple-system,sans-serif\"}}>";
const sbCount = code.split(sbAnchor).length - 1;
if (sbCount !== 1) {
  console.log("[ARRET] Ancre scrollbarWidth trouvee " + sbCount + " fois (attendu: 1). Previens Claude.");
  process.exit(1);
}
code = code.replace(sbAnchor, "zIndex:50,scrollbarWidth:'thin',display:'flex',flexDirection:'column' as const,gap:'0',fontFamily:\"'Inter','Segoe UI',system-ui,-apple-system,sans-serif\"}}>");
changes++;

// 5) Bloc filtres : ne doit plus se comprimer, sinon la sidebar ne scrolle jamais
const filtersAnchor = "<div style={{textAlign:'left',flex:1,minHeight:0,display:'flex',flexDirection:'column' as const,gap:0,borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:'0.3rem'}}>";
const filtersCount = code.split(filtersAnchor).length - 1;
if (filtersCount !== 1) {
  console.log("[ARRET] Ancre bloc filtres trouvee " + filtersCount + " fois (attendu: 1). Previens Claude.");
  process.exit(1);
}
code = code.replace(filtersAnchor, "<div style={{textAlign:'left',flexShrink:0,display:'flex',flexDirection:'column' as const,gap:0,borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:'0.3rem'}}>");
changes++;

if (usesCRLF) {
  code = code.replace(/\n/g, "\r\n");
}

fs.writeFileSync(target, code);
console.log("[OK] " + changes + "/5 modifications appliquees dans " + target);
console.log("(fins de ligne d'origine preservees : " + (usesCRLF ? "CRLF" : "LF") + ")");

console.log("\nProchaine etape : npm run build pour tester la compilation (attends l'instruction de Claude).");
