const fs = require("fs");

const target = "app/page.tsx";
console.log("\n=== Bloc compte en deux lignes (avatar/menu + bandeau collection) ===\n");

if (!fs.existsSync(target)) {
  console.log("[ARRET] " + target + " introuvable. Previens Claude.");
  process.exit(1);
}

const original = fs.readFileSync(target, "utf8");
const usesCRLF = original.includes("\r\n");
let code = original.replace(/\r\n/g, "\n");

if (code.includes("bandeau-collection")) {
  console.log("[ARRET] Le patch semble deja applique (marqueur trouve). Rien touche. Previens Claude.");
  process.exit(1);
}

const anchor = `          <div onClick={()=>setAcctOpen(o=>!o)} style={{display:'flex',alignItems:'center',gap:'0.5rem',padding:'0.3rem 0.4rem',borderRadius:'0.3rem',cursor:'pointer',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(111,195,232,0.18)',transition:'all 0.15s'}} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(111,195,232,0.08)';}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.03)';}}>
            <div style={{width:'28px',height:'28px',flexShrink:0,borderRadius:'50%',background:'radial-gradient(circle at 35% 30%,#1a1c24,#0a0b0f)',border:'1.5px solid #6fc3e8',boxShadow:'0 0 10px rgba(111,195,232,0.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.78rem',fontWeight:900,color:'#6fc3e8'}}>{(slug||'?').trim().charAt(0).toUpperCase()||'?'}</div>
            <div style={{flex:1,minWidth:0,textAlign:'left'}}>
              <p style={{margin:0,fontSize:'0.72rem',fontWeight:700,color:'#eaf2ff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{cards.length>0?'Ma collection':'Mon compte'}</p>
              <p style={{margin:0,fontSize:'0.56rem',color:'#7a8898'}}>{cards.length>0?(cards.length+' cartes'):'Identifiant Sorare'}</p>
            </div>
            {/* BADGE REPOSITIONNE : plus grand, sans cercle, juste avant le chevron */}
            {cards.length>0&&(()=>{const b=collectionBadge(cards.length);return(<img title={cards.length+' cartes'} src={'/'+b.img} alt='' style={{width:'40px',height:'40px',flexShrink:0,objectFit:'contain'}} onError={(e)=>{(e.target as HTMLImageElement).style.display='none';}}/>);})()}
            <span onClick={e=>{e.stopPropagation();setSlugPanelOpen(o=>!o);}} title='Changer de galerie consultee' style={{fontSize:'0.85rem',color:slugPanelOpen?'#f5d76e':'#6fc3e8',opacity:0.85,padding:'0.1rem 0.3rem',cursor:'pointer'}}>⇄</span>
          </div>`;

const count = code.split(anchor).length - 1;
if (count !== 1) {
  console.log("[ARRET] Ancre trouvee " + count + " fois (attendu: 1) meme apres normalisation. Previens Claude.");
  process.exit(1);
}

const replacement = `          {/* LIGNE 1 : bouton Mon compte (ouvre le menu) */}
          <div onClick={()=>setAcctOpen(o=>!o)} style={{display:'flex',alignItems:'center',gap:'0.5rem',padding:'0.35rem 0.4rem',borderRadius:'0.3rem',cursor:'pointer',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(111,195,232,0.18)',transition:'all 0.15s'}} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(111,195,232,0.08)';}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.03)';}}>
            <div style={{width:'28px',height:'28px',flexShrink:0,borderRadius:'50%',background:'radial-gradient(circle at 35% 30%,#1a1c24,#0a0b0f)',border:'1.5px solid #6fc3e8',boxShadow:'0 0 10px rgba(111,195,232,0.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.78rem',fontWeight:900,color:'#6fc3e8'}}>{(slug||'?').trim().charAt(0).toUpperCase()||'?'}</div>
            <div style={{flex:1,minWidth:0,textAlign:'left'}}>
              <p style={{margin:0,fontSize:'0.74rem',fontWeight:700,color:'#eaf2ff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{cards.length>0?'Ma collection':'Mon compte'}</p>
            </div>
            <span style={{fontSize:'0.6rem',color:'#6fc3e8',opacity:0.85,flexShrink:0}}>{acctOpen?'▲':'▼'}</span>
          </div>
          {/* LIGNE 2 : bandeau-collection (badge + compteur + changement de galerie) */}
          {cards.length>0&&(
            <div style={{display:'flex',alignItems:'center',gap:'0.4rem',padding:'0.1rem 0.4rem'}}>
              {(()=>{const b=collectionBadge(cards.length);return(<img title={cards.length+' cartes'} src={'/'+b.img} alt='' style={{width:'34px',height:'34px',flexShrink:0,objectFit:'contain'}} onError={(e)=>{(e.target as HTMLImageElement).style.display='none';}}/>);})()}
              <span style={{flex:1,minWidth:0,fontSize:'0.63rem',color:'#7a8898',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{cards.length+' cartes'}</span>
              <span onClick={e=>{e.stopPropagation();setSlugPanelOpen(o=>!o);}} title='Changer de galerie consultee' style={{fontSize:'0.85rem',color:slugPanelOpen?'#f5d76e':'#6fc3e8',opacity:0.85,padding:'0.1rem 0.3rem',cursor:'pointer',flexShrink:0}}>⇄</span>
            </div>
          )}`;

code = code.replace(anchor, replacement);

if (usesCRLF) {
  code = code.replace(/\n/g, "\r\n");
}

fs.writeFileSync(target, code);
console.log("[OK] Bloc compte restructure en deux lignes");
console.log("(fins de ligne d'origine preservees : " + (usesCRLF ? "CRLF" : "LF") + ")");

console.log("\nProchaine etape : npm run build pour tester la compilation (attends l'instruction de Claude).");
