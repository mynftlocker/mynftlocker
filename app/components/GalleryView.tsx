"use client";
import { memo, useState, useEffect, useRef } from 'react';
import { StatPanel, CardBack, RARITY_GLOW, RARITY_COLOR, RARITY_FILL, parseCard, isNBA, FootStars } from './StatPanel';

// Embleme rond myNFTlocker dessine (repli si /logo-rond.png absent) : anneau or + etoile centrale facon crest.
const Emblem=({w}:{w:string})=>(
  <svg viewBox='0 0 100 100' style={{width:w,height:w,flexShrink:0}}>
    <defs><linearGradient id='mnflEmbG' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stopColor='#fff6b0'/><stop offset='0.5' stopColor='#f5d76e'/><stop offset='1' stopColor='#c9870f'/></linearGradient></defs>
    <circle cx='50' cy='50' r='45' fill='rgba(0,0,0,0.4)' stroke='url(#mnflEmbG)' strokeWidth='6'/>
    <circle cx='50' cy='50' r='33' fill='none' stroke='url(#mnflEmbG)' strokeWidth='1.6' strokeOpacity='0.55'/>
    <g transform='translate(26,26) scale(2)'><path d='M12 1.6l2.95 7.03 7.6.62-5.78 4.96 1.75 7.42L12 17.7l-6.52 3.93 1.75-7.42L1.45 9.25l7.6-.62z' fill='url(#mnflEmbG)' style={{filter:'drop-shadow(0 0 1.5px rgba(245,215,110,0.6))'}}/></g>
  </svg>
);
// Logo rond : vrai fichier public/logo-rond.png si present, sinon repli sur l'embleme dessine.
const LogoMark=({w}:{w:string})=>{
  const [err,setErr]=useState(false);
  if(err) return <Emblem w={w}/>;
  return <img src='/logo-rond.png' alt='' onError={()=>setErr(true)} style={{width:w,height:w,flexShrink:0,objectFit:'contain',display:'block',borderRadius:'50%'}}/>;
};

// Bloc etoiles du slab (pentagone NBA / rangee foot) dimensionne en cqw (meme donnee gameplayTierStars que le stat panel).
const S_PATH='M12 1.6l2.95 7.03 7.6.62-5.78 4.96 1.75 7.42L12 17.7l-6.52 3.93 1.75-7.42L1.45 9.25l7.6-.62z';
const SlabStars=({card,w}:{card:any;w:string})=>{
  const sv=card?.anyPlayer?.gameplayTierStars;
  const stars=(sv==null||isNaN(Number(sv)))?null:Math.max(0,Math.min(5,Number(sv)));
  if(stars==null)return null;
  const uid='sl'+String(card.slug||'').replace(/[^a-zA-Z0-9]/g,'');
  const grad=(<linearGradient id={'g'+uid} x1='0' y1='0' x2='0' y2='1'><stop offset='0' stopColor='#fff6b0'/><stop offset='0.45' stopColor='#f5d76e'/><stop offset='1' stopColor='#c9870f'/></linearGradient>);
  if(isNBA(card)){
    const starN=Math.min(5,Math.max(1,Math.ceil(stars)));
    const starFull=Math.floor(stars);
    const LAY:Record<number,number[][]>={1:[[50,50]],2:[[34,50],[66,50]],3:[[33,36],[67,36],[50,67]],4:[[34,35],[66,35],[34,67],[66,67]],5:[[32,33],[68,33],[32,69],[68,69],[50,51]]};
    const pos=LAY[starN]||[];
    const lerp=(a:number,b:number,t:number)=>Math.round(a+(b-a)*t);
    const tT=Math.max(0,Math.min(1,(stars-1)/4));
    const tierCol='rgb('+lerp(255,0,tT)+','+lerp(126,243,tT)+','+lerp(52,235,tT)+')';
    const frac=(i:number)=>(i<starFull?1:((stars-starFull)>=0.5?0.5:1));
    return(<svg viewBox='0 0 100 100' style={{width:w,height:w,flexShrink:0,overflow:'visible'}}>
      <defs>{grad}</defs>
      <polygon points='50,3 92,27 92,73 50,97 8,73 8,27' fill={tierCol} fillOpacity='0.22' stroke={tierCol} strokeWidth='4' strokeOpacity='0.9'/>
      {pos.map((p,i)=>{const f=frac(i);const sc=1.15;const off=12*sc;const cid='c'+uid+i;return(<g key={i} transform={'translate('+(p[0]-off)+','+(p[1]-off)+') scale('+sc+')'}><path d={S_PATH} fill='rgba(255,255,255,0.16)'/><clipPath id={cid}><rect x='0' y='0' width={24*f} height='24'/></clipPath><path d={S_PATH} fill={'url(#g'+uid+')'} clipPath={'url(#'+cid+')'} style={{filter:'drop-shadow(0 0 1.5px rgba(245,215,110,0.7))'}}/></g>);})}
    </svg>);
  }
  const n=Math.max(1,Math.round(stars));
  return(<span style={{display:'inline-flex',whiteSpace:'nowrap' as const,flexShrink:0,lineHeight:0,gap:'0.6cqw'}}>{Array.from({length:n}).map((_,i)=>(<svg key={i} viewBox='0 0 24 24' style={{width:'calc('+w+' / 4.5)',height:'calc('+w+' / 4.5)'}}><defs>{grad}</defs><path d={S_PATH} fill={'url(#g'+uid+')'} style={{filter:'drop-shadow(0 0 1.5px rgba(245,215,110,0.7))'}}/></svg>))}</span>);
};

// Carte galerie : flip 3D + halo cyan + trace (memes animations que le vestiaire)
const scaleGlow=(glowStr:string,scale:number)=>glowStr.replace(/(\d+(?:\.\d+)?)px/g,(_,n)=>(parseFloat(n)*scale).toFixed(1)+'px');
const gapFor=(cols:number)=>cols<=3?'1.4rem':cols===4?'1rem':cols===5?'0.75rem':cols===6?'0.55rem':cols===7?'0.42rem':'0.32rem';
const glowScaleFor=(cols:number)=>cols<=3?1:cols===4?0.8:cols===5?0.65:cols===6?0.55:cols===7?0.48:0.42;
// Mesure la largeur naturelle du nom (ratio largeur/taille) pour remplir exactement la case nom via SVG (jamais tronque).
let _nameCtx:CanvasRenderingContext2D|null=null;
function nameNatW(txt:string){
  if(typeof document==='undefined')return Math.max(1,txt.length*0.56);
  if(!_nameCtx){try{_nameCtx=document.createElement('canvas').getContext('2d');}catch(e){_nameCtx=null;}}
  if(!_nameCtx)return Math.max(1,txt.length*0.56);
  _nameCtx.font='800 100px Inter, system-ui, sans-serif';
  return Math.max(1,_nameCtx.measureText(txt).width/100);
}
// ===== PARTAGE : exporte le slab en image PNG (fond sombre + halo de rarete + signature) =====
async function buildSlabImage(el:HTMLElement,card:any,fill:string,rc:string):Promise<{blob:Blob,file:File,fname:string}>{
  const {toPng}=await import('html-to-image');
  // Definition : on vise ~900 px de large quelle que soit la taille de la carte a l'ecran (mini 2x, maxi 6x)
  const pr=Math.min(6,Math.max(2,900/Math.max(1,el.getBoundingClientRect().width)));
  const PX='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // pixel transparent si une image ne charge pas
  const dataUrl:string=await Promise.race([
    toPng(el,{pixelRatio:pr,skipFonts:true,imagePlaceholder:PX,style:{background:fill,transform:'none',margin:'0'}}),
    new Promise<string>((_,rej)=>setTimeout(()=>rej(new Error('timeout')),25000)),
  ]);
  const img=new Image(); img.src=dataUrl; await img.decode();
  // La pastille de rarete est redessinee a la main (certains navigateurs mobiles affichent son texte decale a l'export).
  const slabCv=document.createElement('canvas'); slabCv.width=img.width; slabCv.height=img.height;
  const sx=slabCv.getContext('2d'); if(!sx)throw new Error('canvas');
  sx.drawImage(img,0,0);
  const pillEl=el.querySelector('[data-share-pill]') as HTMLElement|null;
  if(pillEl){
    const er=el.getBoundingClientRect(), r=pillEl.getBoundingClientRect(), k=img.width/er.width;
    const px=(r.left-er.left)*k, py=(r.top-er.top)*k, pw=r.width*k, ph=r.height*k, lw=Math.max(1.5,k);
    const rr=(x:number,y:number,w:number,h:number)=>{const q=h/2;sx.beginPath();sx.moveTo(x+q,y);sx.lineTo(x+w-q,y);sx.arc(x+w-q,y+q,q,-Math.PI/2,Math.PI/2);sx.lineTo(x+q,y+h);sx.arc(x+q,y+q,q,Math.PI/2,Math.PI*1.5);sx.closePath();};
    // efface l'ancienne pastille (fond du bandeau) puis trace la nouvelle
    sx.fillStyle='#0b1018'; rr(px-lw*1.5,py-lw*1.5,pw+lw*3,ph+lw*3); sx.fill();
    sx.strokeStyle=rc; sx.lineWidth=lw; rr(px+lw/2,py+lw/2,pw-lw,ph-lw); sx.stroke();
    const label=String(pillEl.textContent||'').toUpperCase();
    const fs=Math.round(ph*0.5); sx.font=fs+'px ui-monospace, Menlo, Consolas, monospace'; sx.fillStyle=rc; sx.textBaseline='middle'; sx.textAlign='left';
    const sp=fs*0.14, widths=Array.from(label).map(ch=>sx.measureText(ch).width);
    const total=widths.reduce((a,b)=>a+b,0)+sp*(label.length-1);
    let cx=px+(pw-total)/2; const cy=py+ph/2+fs*0.04;
    Array.from(label).forEach((ch,i)=>{sx.fillText(ch,cx,cy);cx+=widths[i]+sp;});
  }
  // Composition : marge + halo couleur rarete + signature
  const pad=Math.round(img.width*0.12), foot=Math.round(img.width*0.1);
  const cv=document.createElement('canvas'); cv.width=img.width+pad*2; cv.height=img.height+pad*2+foot;
  const ctx=cv.getContext('2d'); if(!ctx)throw new Error('canvas');
  const bg=ctx.createRadialGradient(cv.width/2,cv.height*0.42,cv.width*0.1,cv.width/2,cv.height*0.5,cv.width*0.85);
  bg.addColorStop(0,'#101826'); bg.addColorStop(1,'#04070d');
  ctx.fillStyle=bg; ctx.fillRect(0,0,cv.width,cv.height);
  ctx.save(); ctx.shadowColor=rc; ctx.shadowBlur=pad*0.7; ctx.drawImage(slabCv,pad,pad); ctx.restore();
  ctx.drawImage(slabCv,pad,pad);
  ctx.textAlign='center'; ctx.fillStyle='rgba(245,215,110,0.9)'; ctx.font='800 '+Math.round(foot*0.34)+'px system-ui, sans-serif';
  ctx.fillText('myNFTlocker',cv.width/2,img.height+pad*2+foot*0.18);
  ctx.fillStyle='rgba(207,216,230,0.55)'; ctx.font='600 '+Math.round(foot*0.2)+'px system-ui, sans-serif';
  ctx.fillText('mynftlocker.vercel.app',cv.width/2,img.height+pad*2+foot*0.5);
  const blob:Blob|null=await new Promise(r=>cv.toBlob(r,'image/png'));
  if(!blob)throw new Error('blob');
  const fname='mynftlocker-'+String(card.slug||'carte').slice(0,60)+'.png';
  return {blob,file:new File([blob],fname,{type:'image/png'}),fname};
}
const canShareFile=(file:File)=>{try{const n:any=navigator;return typeof n.canShare==='function'&&n.canShare({files:[file]});}catch(e){return false;}};
const downloadBlob=(blob:Blob,fname:string)=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=fname;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);};
const GalleryCard=memo(({card,isFlipped,onFlip,glowScale}:any)=>{
  const [hover,setHover]=useState(false);
  const slabRef=useRef<HTMLDivElement>(null);
  const [sharing,setSharing]=useState(false);
  const [shareMenu,setShareMenu]=useState<{blob:Blob,file:File,fname:string}|null>(null);
  const menuRef=useRef<HTMLDivElement>(null);
  const [touchOnly,setTouchOnly]=useState(false);
  useEffect(()=>{try{setTouchOnly(window.matchMedia('(hover: none)').matches);}catch(e){}},[]);
  // Ferme le menu de partage au clic ailleurs / Echap
  useEffect(()=>{
    if(!shareMenu)return;
    const down=(e:Event)=>{if(menuRef.current&&!menuRef.current.contains(e.target as Node))setShareMenu(null);};
    const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setShareMenu(null);};
    document.addEventListener('pointerdown',down); document.addEventListener('keydown',key);
    return ()=>{document.removeEventListener('pointerdown',down); document.removeEventListener('keydown',key);};
  },[shareMenu]);
  const glowRaw=RARITY_GLOW[card.rarityTyped]||RARITY_GLOW.common;
  const glow=scaleGlow(glowRaw,glowScale??1);
  const fill=RARITY_FILL[card.rarityTyped]||RARITY_FILL.common;
  const rc=RARITY_COLOR[card.rarityTyped]||'#9ca3af';
  const {serial,season}=parseCard(card.name);
  const score=card.averageScore!=null?String(card.averageScore):null;
  // Nom : initiale du prenom + NOM, sur sa propre ligne PLEINE LARGEUR -> tient a toute longueur (meme V. WEMBANYAMA). Police adaptative.
  const _left=String(card.name.split('•')[0]||'').replace(/\d{4}-\d{2}/,'').trim();
  const _parts=_left.split(' ').filter(Boolean);
  const _lastName=(card.anyPlayer?.lastName||_parts[_parts.length-1]||'').toUpperCase();
  const _firstInit=((_parts.length>1?_parts[0]:'')[0]||'').toUpperCase();
  const disp=_firstInit?(_firstInit+'. '+_lastName):_lastName;
  const [natW,setNatW]=useState(()=>Math.max(1,disp.length*0.56)*100);
  useEffect(()=>{setNatW(nameNatW(disp)*100);},[disp]);
  const team=card.anyTeam?.name||'';
  const comp=isNBA(card)?'NBA':'FOOT';
  const rarLabel=card.rarityTyped==='common'?'SET':card.rarityTyped.replace('_',' ').toUpperCase();
  return(
    <div style={{perspective:'900px',cursor:'pointer',width:'100%',position:'relative',containerType:'inline-size'}} onClick={()=>onFlip(card.slug)} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}>
      <div style={{position:'relative',transformStyle:'preserve-3d',transition:'transform 0.4s cubic-bezier(0.2,0.8,0.3,1),box-shadow 0.3s ease',transform:(isFlipped?'rotateY(180deg)':'rotateY(0deg)')+((hover&&!isFlipped)?' translateY(-10px) scale(1.03)':''),boxShadow:isFlipped?'0 0 12px 3px rgba(64,232,255,0.45),0 0 24px 6px rgba(64,232,255,0.2)':((hover&&!isFlipped)?glow+', 0 22px 40px -8px rgba(0,0,0,0.7)':glow),borderRadius:'7cqw',background:fill,...({['--rc']:rc,animation:isFlipped?'mnflCyanPulse 2.2s ease-in-out infinite':undefined} as any)}}>
        {/* SLAB : coque plastique translucide + bandeau label (en haut) + art 100% visible dessous. */}
        <div ref={slabRef} data-slab='1' style={{position:'relative',backfaceVisibility:'hidden',WebkitBackfaceVisibility:'hidden',borderRadius:'7cqw',padding:'4cqw 4cqw 4.8cqw',background:'linear-gradient(180deg,rgba(236,243,255,0.14) 0%,rgba(236,243,255,0.05) 7%,rgba(190,205,230,0.07) 16%,rgba(150,166,194,0.045) 100%)',border:'1px solid rgba(214,226,244,0.55)',boxShadow:'0 1px 0 rgba(255,255,255,0.35) inset,0 0 0 1px rgba(10,14,22,0.6)'}}>
          {/* bandeau label */}
          <div style={{position:'relative',zIndex:2,borderRadius:'4.8cqw',overflow:'hidden',background:'linear-gradient(165deg,#10151f,#0a0e16)',border:'1px solid rgba(120,150,190,0.14)',boxShadow:'0 2px 10px -4px rgba(0,0,0,0.6)',padding:'3.6cqw 4.4cqw 4cqw'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'3cqw',marginBottom:'2cqw'}}>
              <span style={{fontFamily:'ui-monospace,Menlo,monospace',fontSize:'3.9cqw',letterSpacing:'0.12em',color:'#35e6ff',opacity:0.9,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{serial||''}</span>
              <span style={{display:'flex',alignItems:'center',gap:'2cqw',flexShrink:0}}>
                <LogoMark w={'6.4cqw'}/>
                <span style={{fontWeight:800,fontSize:'5.3cqw',letterSpacing:'0.02em',lineHeight:1,whiteSpace:'nowrap',background:'linear-gradient(180deg,#fff3c4,#f5d76e 55%,#b8801a)',WebkitBackgroundClip:'text',backgroundClip:'text',color:'transparent'}}>myNFTlocker</span>
              </span>
            </div>
            <div style={{display:'flex',alignItems:'stretch',justifyContent:'space-between',gap:'2.5cqw'}}>
              <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column' as const,justifyContent:'center',gap:'1.4cqw'}}>
                {/* case NOM : le nom est dessine en SVG qui remplit la case -> jamais tronque, taille auto selon la longueur, mini marge */}
                <div style={{width:'100%',height:'11cqw',padding:'0 0.5cqw'}}>
                  <svg viewBox={'0 0 '+natW+' 100'} preserveAspectRatio='xMinYMid meet' style={{width:'100%',height:'100%',display:'block',overflow:'visible'}}>
                    <text x='1' y='80' fontSize='100' fontWeight='800' fill='#eef4ff' style={{filter:'drop-shadow(0 0 4px rgba(53,230,255,0.25))'}}>{disp}</text>
                  </svg>
                </div>
                <div style={{display:'flex',flexDirection:'column' as const,gap:'0.5cqw'}}>
                  <div style={{fontSize:'4cqw',color:'#cfd8e6',fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{team}</div>
                  <div style={{fontSize:'3.6cqw',color:'#8a97ad',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{comp} · {season}</div>
                </div>
              </div>
              <div style={{flexShrink:0,display:'flex',flexDirection:'column' as const,alignItems:'center',justifyContent:'center',gap:'2cqw'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'2cqw',borderRadius:'4cqw',padding:'2cqw 2.8cqw 1.6cqw',border:'1px solid rgba(120,150,190,0.14)',background:'radial-gradient(120% 120% at 50% 0%,rgba(53,230,255,0.10),rgba(8,12,20,0.6))'}}>
                  {isNBA(card)?<SlabStars card={card} w={'11.3cqw'}/>:<FootStars n={Math.round(Number(card.anyPlayer?.gameplayTierStars)||0)} s={'3.8cqw'}/>}
                  <div style={{display:'flex',flexDirection:'column' as const,alignItems:'center',lineHeight:1}}>
                    <div style={{fontWeight:800,fontSize:'8.7cqw',lineHeight:0.92,color:'#f5d76e',textShadow:'0 0 10px rgba(245,215,110,0.35)'}}>{score||'—'}</div>
                    <div style={{fontFamily:'ui-monospace,Menlo,monospace',fontSize:'3.2cqw',letterSpacing:'0.1em',color:'#35e6ff',marginTop:'0.5cqw'}}>L10</div>
                  </div>
                </div>
                <span data-share-pill='1' style={{fontFamily:'ui-monospace,Menlo,monospace',fontSize:'3.5cqw',lineHeight:1.15,letterSpacing:'0.14em',textIndent:'0.14em',textTransform:'uppercase' as const,padding:'0.8cqw 2.6cqw',borderRadius:'999px',border:'1px solid '+rc,color:rc,whiteSpace:'nowrap',display:'inline-flex',alignItems:'center',justifyContent:'center',textAlign:'center' as const}}>{rarLabel}</span>
              </div>
            </div>
          </div>
          {/* art Sorare : jamais recouvert */}
          <div style={{position:'relative',zIndex:1,marginTop:'3.6cqw',borderRadius:'4.8cqw',overflow:'hidden',boxShadow:'0 10px 26px -12px rgba(0,0,0,0.85)'}}>
            <img src={card.pictureUrl} alt={card.name} loading='lazy' style={{width:'100%',height:'auto',display:'block'}} onError={(e:any)=>{e.target.style.display='none';}}/>
          </div>
          {/* reflet plastique diagonal (coque) */}
          <div style={{position:'absolute',inset:0,borderRadius:'7cqw',pointerEvents:'none',background:'linear-gradient(118deg,transparent 38%,rgba(255,255,255,0.10) 48%,transparent 56%)',mixBlendMode:'screen' as const,opacity:0.5}}/>
        </div>
        <CardBack card={card} rc={rc} mobile={true}/>
      </div>
      {/* Bouton Partager : visible au survol (toujours visible sur ecran tactile), masque quand la carte est retournee.
          Clic -> generation de l'image -> petit menu "Partager / Telecharger" (nouveau clic = geste utilisateur valide pour le partage natif). */}
      {(()=>{
        const show=(hover||touchOnly||sharing||!!shareMenu)&&!isFlipped;
        return(<>
          <button type='button' title="Partager la carte (image)" aria-label="Partager la carte (image)" disabled={sharing}
            onClick={(e)=>{e.stopPropagation();if(shareMenu){setShareMenu(null);return;}if(!slabRef.current||sharing)return;setSharing(true);buildSlabImage(slabRef.current,card,fill,rc).then(r=>setShareMenu(r)).catch((err)=>console.error('share failed',err)).finally(()=>setSharing(false));}}
            style={{position:'absolute',bottom:'7cqw',right:'7cqw',zIndex:30,width:'10cqw',height:'10cqw',minWidth:'28px',minHeight:'28px',borderRadius:'50%',border:'1px solid rgba(64,232,255,0.6)',background:'rgba(6,10,18,0.8)',color:'#40e8ff',cursor:sharing?'wait':'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0,transition:'opacity 0.15s',opacity:show?(sharing?0.6:1):0,pointerEvents:show?'auto':'none'}}>
            <svg viewBox='0 0 24 24' style={{width:'55%',height:'55%'}} fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><circle cx='18' cy='5' r='3'/><circle cx='6' cy='12' r='3'/><circle cx='18' cy='19' r='3'/><path d='M8.6 13.5l6.8 4M15.4 6.5l-6.8 4'/></svg>
          </button>
          {shareMenu&&(
            <div ref={menuRef} onClick={(e)=>e.stopPropagation()} style={{position:'absolute',bottom:'calc(7cqw + max(10cqw,28px) + 6px)',right:'7cqw',zIndex:40,display:'flex',flexDirection:'column' as const,gap:'4px',padding:'6px',borderRadius:'10px',background:'rgba(6,10,18,0.95)',border:'1px solid rgba(64,232,255,0.5)',boxShadow:'0 8px 24px rgba(0,0,0,0.6)',minWidth:'128px'}}>
              {canShareFile(shareMenu.file)&&(<button type='button' onClick={async(e)=>{e.stopPropagation();const m=shareMenu;setShareMenu(null);try{await (navigator as any).share({files:[m.file],title:card.name});}catch(err:any){if(!err||err.name!=='AbortError')console.error('share failed',err);}}} style={{background:'rgba(64,232,255,0.12)',border:'1px solid rgba(64,232,255,0.35)',color:'#cfeeff',borderRadius:'7px',padding:'7px 10px',fontSize:'12px',fontWeight:700,cursor:'pointer',textAlign:'left' as const}}>Partager…</button>)}
              <button type='button' onClick={(e)=>{e.stopPropagation();const m=shareMenu;setShareMenu(null);downloadBlob(m.blob,m.fname);}} style={{background:'rgba(245,215,110,0.1)',border:'1px solid rgba(245,215,110,0.35)',color:'#f5e6b0',borderRadius:'7px',padding:'7px 10px',fontSize:'12px',fontWeight:700,cursor:'pointer',textAlign:'left' as const}}>Télécharger l'image</button>
            </div>
          )}
        </>);
      })()}
      {isFlipped&&(<svg style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',zIndex:22,pointerEvents:'none',overflow:'visible'}}><rect x='0' y='0' width='100%' height='100%' rx='8' pathLength='1000' fill='none' stroke='#40e8ff' strokeWidth='2.5' style={{filter:'drop-shadow(0 0 9px rgba(64,232,255,0.9))',strokeDasharray:'1000',strokeDashoffset:'1000',animation:'mnflCardTrace 1.4s ease-in-out 0.5s both'}}/></svg>)}
    </div>
  );
});
GalleryCard.displayName='GalleryCard';

// ===== PARTAGE depuis le vestiaire : meme image que la galerie. Le slab est rendu hors ecran (meme composant GalleryCard) puis exporte. =====
export async function exportCardImage(card:any):Promise<{blob:Blob,file:File,fname:string}>{
  const [{createRoot},{flushSync}]=await Promise.all([import('react-dom/client'),import('react-dom')]);
  const holder=document.createElement('div');
  holder.style.cssText='position:fixed;left:-20000px;top:0;width:380px;pointer-events:none;';
  document.body.appendChild(holder);
  const root=createRoot(holder);
  try{
    flushSync(()=>{root.render(<GalleryCard card={card} isFlipped={false} onFlip={()=>{}} glowScale={1}/>);});
    const slab=holder.querySelector('[data-slab]') as HTMLElement|null;
    if(!slab)throw new Error('slab');
    const imgs=Array.from(holder.querySelectorAll('img')) as HTMLImageElement[];
    imgs.forEach(i=>{i.loading='eager';});
    await Promise.race([
      Promise.all(imgs.map(i=>i.complete?Promise.resolve():new Promise<void>(r=>{i.onload=()=>r();i.onerror=()=>r();}))),
      new Promise<void>(r=>setTimeout(r,8000)),
    ]);
    // laisse React appliquer les effets (largeur du nom) avant la capture
    await new Promise<void>(r=>setTimeout(r,150));
    await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));
    const fill=RARITY_FILL[card.rarityTyped]||RARITY_FILL.common;
    const rc=RARITY_COLOR[card.rarityTyped]||'#9ca3af';
    return await buildSlabImage(slab,card,fill,rc);
  } finally { root.unmount(); holder.remove(); }
}
// Bouton + petit menu "Partager / Telecharger" (meme comportement que dans la galerie)
export function ShareControl({card,visible,btn=28,offset=7}:{card:any,visible:boolean,btn?:number,offset?:number}){
  const [sharing,setSharing]=useState(false);
  const [menu,setMenu]=useState<{blob:Blob,file:File,fname:string}|null>(null);
  const menuRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!menu)return;
    const down=(e:Event)=>{if(menuRef.current&&!menuRef.current.contains(e.target as Node))setMenu(null);};
    const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setMenu(null);};
    document.addEventListener('pointerdown',down); document.addEventListener('keydown',key);
    return ()=>{document.removeEventListener('pointerdown',down); document.removeEventListener('keydown',key);};
  },[menu]);
  const show=visible||sharing||!!menu;
  const stop=(e:any)=>e.stopPropagation();
  return(<>
    <button type='button' title="Partager la carte (image)" aria-label="Partager la carte (image)" disabled={sharing}
      onClick={(e)=>{e.stopPropagation();if(menu){setMenu(null);return;}if(sharing)return;setSharing(true);exportCardImage(card).then(r=>setMenu(r)).catch((err)=>console.error('share failed',err)).finally(()=>setSharing(false));}}
      onDoubleClick={stop}
      style={{position:'absolute',bottom:offset+'px',right:offset+'px',zIndex:30,width:btn+'px',height:btn+'px',borderRadius:'50%',border:'1px solid rgba(64,232,255,0.6)',background:'rgba(6,10,18,0.8)',color:'#40e8ff',cursor:sharing?'wait':'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0,transition:'opacity 0.15s',opacity:show?(sharing?0.6:1):0,pointerEvents:show?'auto':'none'}}>
      <svg viewBox='0 0 24 24' style={{width:'55%',height:'55%'}} fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><circle cx='18' cy='5' r='3'/><circle cx='6' cy='12' r='3'/><circle cx='18' cy='19' r='3'/><path d='M8.6 13.5l6.8 4M15.4 6.5l-6.8 4'/></svg>
    </button>
    {menu&&(
      <div ref={menuRef} onClick={stop} onDoubleClick={stop} style={{position:'absolute',bottom:(offset+btn+6)+'px',right:offset+'px',zIndex:40,display:'flex',flexDirection:'column' as const,gap:'4px',padding:'6px',borderRadius:'10px',background:'rgba(6,10,18,0.95)',border:'1px solid rgba(64,232,255,0.5)',boxShadow:'0 8px 24px rgba(0,0,0,0.6)',minWidth:'128px'}}>
        {canShareFile(menu.file)&&(<button type='button' onClick={async(e)=>{e.stopPropagation();const m=menu;setMenu(null);try{await (navigator as any).share({files:[m.file],title:card.name});}catch(err:any){if(!err||err.name!=='AbortError')console.error('share failed',err);}}} style={{background:'rgba(64,232,255,0.12)',border:'1px solid rgba(64,232,255,0.35)',color:'#cfeeff',borderRadius:'7px',padding:'7px 10px',fontSize:'12px',fontWeight:700,cursor:'pointer',textAlign:'left' as const}}>Partager…</button>)}
        <button type='button' onClick={(e)=>{e.stopPropagation();const m=menu;setMenu(null);downloadBlob(m.blob,m.fname);}} style={{background:'rgba(245,215,110,0.1)',border:'1px solid rgba(245,215,110,0.35)',color:'#f5e6b0',borderRadius:'7px',padding:'7px 10px',fontSize:'12px',fontWeight:700,cursor:'pointer',textAlign:'left' as const}}>Télécharger l'image</button>
      </div>
    )}
  </>);
}

export default function GalleryView({cards}:{cards:any[]}){
  const [activeSlug,setActiveSlug]=useState<string|null>(null);
  const [galleryCols,setGalleryCols]=useState(4);
  useEffect(()=>{
    const saved=localStorage.getItem('mnfl_gallery_cols');
    if(saved){setGalleryCols(Math.min(8,Math.max(1,parseInt(saved,10)||4)));return;}
    setGalleryCols(4);
  },[]);
  const changeCols=(delta:number)=>{setGalleryCols(c=>{const next=Math.min(8,Math.max(1,c+delta));localStorage.setItem('mnfl_gallery_cols',String(next));return next;});};
  const gridRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const el=gridRef.current; if(!el) return;
    let startDist=0, active=false;
    const dist=(t:TouchList)=>{const dx=t[0].clientX-t[1].clientX,dy=t[0].clientY-t[1].clientY;return Math.sqrt(dx*dx+dy*dy);};
    const onStart=(e:TouchEvent)=>{ if(e.touches.length===2){ startDist=dist(e.touches); active=true; } };
    const onMove=(e:TouchEvent)=>{
      if(e.touches.length===2 && active){
        e.preventDefault();
        const d=dist(e.touches); const delta=d-startDist; const THRESHOLD=55;
        if(Math.abs(delta)>THRESHOLD){
          changeCols(delta>0?-1:1); // ecarter les doigts = zoom avant = moins de colonnes ; pincer = plus de colonnes
          startDist=d;
        }
      }
    };
    const onEnd=()=>{active=false;};
    el.addEventListener('touchstart',onStart,{passive:true});
    el.addEventListener('touchmove',onMove,{passive:false});
    el.addEventListener('touchend',onEnd,{passive:true});
    return ()=>{ el.removeEventListener('touchstart',onStart); el.removeEventListener('touchmove',onMove); el.removeEventListener('touchend',onEnd); };
  },[]);
  const [isClosing,setIsClosing]=useState(false);
  const startClose=()=>{setIsClosing(true);setTimeout(()=>{setActiveSlug(null);setIsClosing(false);},600);};
  const handleFlip=(slug:string)=>{if(slug===activeSlug){startClose();}else{setActiveSlug(slug);setIsClosing(false);}};
  const activeCard=activeSlug?(cards.find(c=>c.slug===activeSlug)||null):null;
  return(
    <div style={{padding:'1.2rem',minHeight:'100%',boxSizing:'border-box'}}>
      {cards.length===0?(
        <div style={{display:'flex',flexDirection:'column' as const,alignItems:'center',justifyContent:'center',height:'55vh',color:'rgba(64,232,255,0.28)',fontFamily:'Courier New,monospace',gap:'0.5rem'}}>
          <p style={{fontSize:'2rem',margin:0}}>⬡</p>
          <p style={{fontSize:'0.7rem',letterSpacing:'0.25em',textTransform:'uppercase',margin:0}}>Aucune carte</p>
        </div>
      ):(
        <>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'0.5rem',marginBottom:'0.8rem'}}>
          <span style={{fontSize:'0.7rem',color:'rgba(207,216,230,0.6)',letterSpacing:'0.05em',textTransform:'uppercase' as const}}>{cards.length} {cards.length>1?'joueurs':'joueur'}</span>
          <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
          <span style={{fontSize:'0.7rem',color:'rgba(207,216,230,0.6)',letterSpacing:'0.05em',textTransform:'uppercase' as const}}>Taille</span>
          <button onClick={()=>changeCols(-1)} disabled={galleryCols<=1} style={{width:'26px',height:'26px',borderRadius:'0.3rem',background:'rgba(64,232,255,0.1)',border:'1px solid rgba(64,232,255,0.4)',color:'#40e8ff',cursor:galleryCols<=1?'not-allowed':'pointer',opacity:galleryCols<=1?0.4:1,fontSize:'1rem',lineHeight:1}}>−</button>
          <span style={{fontSize:'0.75rem',color:'#eaf2ff',minWidth:'14px',textAlign:'center' as const}}>{galleryCols}</span>
          <button onClick={()=>changeCols(1)} disabled={galleryCols>=8} style={{width:'26px',height:'26px',borderRadius:'0.3rem',background:'rgba(64,232,255,0.1)',border:'1px solid rgba(64,232,255,0.4)',color:'#40e8ff',cursor:galleryCols>=8?'not-allowed':'pointer',opacity:galleryCols>=8?0.4:1,fontSize:'1rem',lineHeight:1}}>+</button>
          </div>
        </div>
        <div ref={gridRef} style={{display:'grid',gridTemplateColumns:'repeat('+galleryCols+',1fr)',gap:gapFor(galleryCols),touchAction:'pan-y'}}>
          {cards.map(c=>(<GalleryCard key={c.slug} card={c} isFlipped={activeSlug===c.slug} onFlip={handleFlip} glowScale={glowScaleFor(galleryCols)}/>))}
        </div>
        </>
      )}
      {activeCard&&(<div className='mnfl-gallery-stat-desktop'>{<StatPanel key={activeCard.slug} card={activeCard} isClosing={isClosing} onClose={startClose} placement='overlay'/>}</div>)}
      {activeCard&&(<div className='mnfl-gallery-stat-mobile'>{<StatPanel key={'m'+activeCard.slug} card={activeCard} isClosing={isClosing} onClose={startClose} placement='galleryMobile'/>}</div>)}
    </div>
  );
}
