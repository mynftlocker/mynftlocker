const fs = require("fs");

const target = "app/page.tsx";
console.log("\n=== Etape 2 : menu deroulant Mon compte ===\n");

if (!fs.existsSync(target)) {
  console.log("[ARRET] " + target + " introuvable. Previens Claude.");
  process.exit(1);
}

const original = fs.readFileSync(target, "utf8");

if (original.includes("acctMenuSection")) {
  console.log("[ARRET] Le patch semble deja applique (marqueur 'acctMenuSection' trouve). Rien touche. Previens Claude.");
  process.exit(1);
}

let patched = original;
let changes = 0;

// 1) Nouvel etat pour la section de compte actuellement affichee (null = fermee)
const stateRegex = /const \[slugPanelOpen,\s*setSlugPanelOpen\]\s*=\s*useState\(false\);/;
const stateMatches = original.match(new RegExp(stateRegex.source, "g"));
if (!stateMatches || stateMatches.length !== 1) {
  console.log("[ARRET] Etat slugPanelOpen trouve " + (stateMatches ? stateMatches.length : 0) + " fois (attendu: 1). Previens Claude.");
  process.exit(1);
}
patched = patched.replace(stateRegex, stateMatches[0] + "\n  const [acctMenuSection, setAcctMenuSection] = useState<string|null>(null);");
changes++;

// 2) Bloc avatar DESKTOP : le clic ouvre desormais le menu deroulant (acctOpen reste pour l'etat visuel du chevron/dropdown)
const desktopAnchor = `          <div onClick={()=>setAcctOpen(o=>!o)} style={{display:'flex',alignItems:'center',gap:'0.5rem',padding:'0.3rem 0.4rem',borderRadius:'0.3rem',cursor:'pointer',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(111,195,232,0.18)',transition:'all 0.15s'}} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(111,195,232,0.08)';}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.03)';}}>
            <div style={{width:'28px',height:'28px',flexShrink:0,borderRadius:'50%',background:'radial-gradient(circle at 35% 30%,#1a1c24,#0a0b0f)',border:'1.5px solid #6fc3e8',boxShadow:'0 0 10px rgba(111,195,232,0.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.78rem',fontWeight:900,color:'#6fc3e8'}}>{(slug||'?').trim().charAt(0).toUpperCase()||'?'}</div>
            <div style={{flex:1,minWidth:0,textAlign:'left'}}>
              <p style={{margin:0,fontSize:'0.72rem',fontWeight:700,color:'#eaf2ff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{cards.length>0?'Ma collection':'Mon compte'}</p>
              <p style={{margin:0,fontSize:'0.56rem',color:'#7a8898'}}>{cards.length>0?(cards.length+' cartes'):'Identifiant Sorare'}</p>
            </div>
            {/* BADGE REPOSITIONNE : plus grand, sans cercle, juste avant le chevron */}
            {cards.length>0&&(()=>{const b=collectionBadge(cards.length);return(<img title={cards.length+' cartes'} src={'/'+b.img} alt='' style={{width:'40px',height:'40px',flexShrink:0,objectFit:'contain'}} onError={(e)=>{(e.target as HTMLImageElement).style.display='none';}}/>);})()}
            <span onClick={e=>{e.stopPropagation();setSlugPanelOpen(o=>!o);}} title='Changer de galerie consultee' style={{fontSize:'0.85rem',color:slugPanelOpen?'#f5d76e':'#6fc3e8',opacity:0.85,padding:'0.1rem 0.3rem',cursor:'pointer'}}>⇄</span>
          </div>
          {(slugPanelOpen||cards.length===0)&&(
            <input style={{background:'rgba(255,255,255,0.05)',color:'#cfe4fb',padding:'0.28rem 0.55rem',borderRadius:'0.15rem',border:'1px solid rgba(255,255,255,0.1)',outline:'none',fontSize:'0.76rem',boxSizing:'border-box'}} placeholder='ton-slug-sorare' value={slug} onChange={e=>setSlug(e.target.value)} onKeyDown={e=>e.key==='Enter'&&fetchCards()}/>
          )}
        </div>`;
const desktopCount = patched.split(desktopAnchor).length - 1;
if (desktopCount !== 1) {
  console.log("[ARRET] Ancre bloc avatar desktop trouvee " + desktopCount + " fois (attendu: 1). Previens Claude.");
  process.exit(1);
}

const ACCOUNT_ITEMS = `[
              {key:'infos',label:'Informations personnelles'},
              {key:'auth',label:'Authentification'},
              {key:'abo',label:'Abonnement'},
              {key:'confidentialite',label:'Confidentialite & donnees'},
              {key:'aide',label:'Aide / Contact'},
              {key:'deconnexion',label:'Se deconnecter'},
            ]`;

const desktopReplacement = `          <div style={{position:'relative'}}>
          <div onClick={()=>setAcctOpen(o=>!o)} style={{display:'flex',alignItems:'center',gap:'0.5rem',padding:'0.3rem 0.4rem',borderRadius:'0.3rem',cursor:'pointer',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(111,195,232,0.18)',transition:'all 0.15s'}} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(111,195,232,0.08)';}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.03)';}}>
            <div style={{width:'28px',height:'28px',flexShrink:0,borderRadius:'50%',background:'radial-gradient(circle at 35% 30%,#1a1c24,#0a0b0f)',border:'1.5px solid #6fc3e8',boxShadow:'0 0 10px rgba(111,195,232,0.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.78rem',fontWeight:900,color:'#6fc3e8'}}>{(slug||'?').trim().charAt(0).toUpperCase()||'?'}</div>
            <div style={{flex:1,minWidth:0,textAlign:'left'}}>
              <p style={{margin:0,fontSize:'0.72rem',fontWeight:700,color:'#eaf2ff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{cards.length>0?'Ma collection':'Mon compte'}</p>
              <p style={{margin:0,fontSize:'0.56rem',color:'#7a8898'}}>{cards.length>0?(cards.length+' cartes'):'Identifiant Sorare'}</p>
            </div>
            {/* BADGE REPOSITIONNE : plus grand, sans cercle, juste avant le chevron */}
            {cards.length>0&&(()=>{const b=collectionBadge(cards.length);return(<img title={cards.length+' cartes'} src={'/'+b.img} alt='' style={{width:'40px',height:'40px',flexShrink:0,objectFit:'contain'}} onError={(e)=>{(e.target as HTMLImageElement).style.display='none';}}/>);})()}
            <span onClick={e=>{e.stopPropagation();setSlugPanelOpen(o=>!o);}} title='Changer de galerie consultee' style={{fontSize:'0.85rem',color:slugPanelOpen?'#f5d76e':'#6fc3e8',opacity:0.85,padding:'0.1rem 0.3rem',cursor:'pointer'}}>⇄</span>
          </div>
          {(slugPanelOpen||cards.length===0)&&(
            <input style={{background:'rgba(255,255,255,0.05)',color:'#cfe4fb',padding:'0.28rem 0.55rem',borderRadius:'0.15rem',border:'1px solid rgba(255,255,255,0.1)',outline:'none',fontSize:'0.76rem',boxSizing:'border-box'}} placeholder='ton-slug-sorare' value={slug} onChange={e=>setSlug(e.target.value)} onKeyDown={e=>e.key==='Enter'&&fetchCards()}/>
          )}
          {acctOpen&&(
            <div className='thin-sb' style={{position:'absolute',top:'100%',left:0,right:0,marginTop:'0.3rem',background:'#0a0d12',border:'1px solid rgba(111,195,232,0.35)',borderRadius:'0.35rem',boxShadow:'0 10px 28px rgba(0,0,0,0.6)',zIndex:200,overflow:'hidden'}}>
              {${ACCOUNT_ITEMS}.map(item=>(
                <div key={item.key} onClick={()=>{setAcctMenuSection(item.key);setAcctOpen(false);}} style={{padding:'0.5rem 0.7rem',fontSize:'0.72rem',color:item.key==='deconnexion'?'#fca5a5':'#cfe4fb',cursor:'pointer',borderBottom:'1px solid rgba(255,255,255,0.05)',transition:'background 0.12s'}} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(111,195,232,0.1)';}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='transparent';}}>{item.label}</div>
              ))}
            </div>
          )}
          </div>`;
patched = patched.replace(desktopAnchor, desktopReplacement);
changes++;

fs.writeFileSync(target, patched);
console.log("[OK] " + changes + "/2 modifications appliquees dans " + target);
console.log("\nProchaine etape : npm run build pour tester la compilation (attends l'instruction de Claude).");
