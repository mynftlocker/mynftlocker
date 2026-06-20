'use client';
import { memo, useState, useEffect, Fragment } from 'react';

export const RARITY_GLOW: Record<string,string> = {
  common:'0 0 18px 3px rgba(225,228,255,0.75), 0 0 36px 8px rgba(190,200,255,0.35)',
  limited:'0 0 20px 4px rgba(234,179,8,0.95), 0 0 42px 10px rgba(234,179,8,0.45)',
  rare:'0 0 20px 4px rgba(239,68,68,0.97), 0 0 44px 11px rgba(239,68,68,0.5)',
  super_rare:'0 0 20px 4px rgba(59,130,246,0.97), 0 0 44px 11px rgba(59,130,246,0.5)',
  unique:'0 0 24px 5px rgba(168,85,247,1), 0 0 50px 12px rgba(168,85,247,0.55)',
};
export const RARITY_COLOR: Record<string,string> = {
  common:'#9ca3af',limited:'#eab308',rare:'#3b82f6',super_rare:'#ef4444',unique:'#a855f7',
};
export const RARITY_FILL: Record<string,string> = {
  common:'#a8a8b5',limited:'#b48a14',rare:'#1e4ba8',super_rare:'#a82a2a',unique:'#7e3fc4',
};
export const isNBA=(c:any)=>c?.__typename==='NBACard';
export const parseCard=(name:string)=>{
  const parts=name.split('•');const left=parts[0].trim();const right=(parts[1]||'').trim();
  const sm=left.match(/(\d{4}-\d{2})/);const season=sm?sm[1]:'';
  const pn=left.replace(/\d{4}-\d{2}/,'').trim();
  const lastName=pn.split(' ').pop()!.toUpperCase();
  const sr=right.match(/(\d+\/\d+)/);
  return {lastName,season,serial:sr?sr[1]:null};
};
export const nfs=(l:number)=>l<=5?'1.45rem':l<=7?'1.2rem':l<=9?'1rem':l<=11?'0.82rem':l<=13?'0.7rem':'0.6rem';

export const CardBack=memo(({card,rc}:any)=>{
  const {season,serial}=parseCard(card.name);
  const ln=(card.anyPlayer?.lastName||parseCard(card.name).lastName).toUpperCase();
  const sn=card.anyPlayer?.shirtNumber??null;
  const bonus=card.power?('+'+Math.round((parseFloat(card.power)-1)*100)+'%'):null;
  const score=card.averageScore!=null?String(card.averageScore):null;
  const fv=(v:any,t:string)=>{if(v==null)return '—';const n=Number(v);if(t==='pct')return n.toFixed(1)+'%';if(t==='pm')return(n>=0?'+':'')+n.toFixed(1);return n.toFixed(1);};
  return(
    <div style={{position:'absolute',inset:0,backfaceVisibility:'hidden',WebkitBackfaceVisibility:'hidden',transform:'rotateY(180deg)',borderRadius:'0.4rem',overflow:'hidden',background:'radial-gradient(ellipse 130% 90% at 50% 0%,#191b24 0%,#0c0d14 60%,#06070d 100%)',display:'flex',flexDirection:'column' as const,border:'1px solid '+rc+'44'}}>
      <div style={{height:'3px',background:'linear-gradient(90deg,transparent,'+rc+',transparent)'}}></div>
      <div style={{padding:'0.35rem 0.4rem 0.3rem',textAlign:'center',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <p style={{margin:0,fontSize:'0.6rem',color:'#e3c074',fontWeight:900,letterSpacing:'0.08em'}}>myNFTlocker</p>
        <p style={{margin:'1px 0 0',fontSize:'0.48rem',color:'#9aa3b2',fontWeight:600,letterSpacing:'0.1em'}}>{isNBA(card)?'NBA':'FOOT'} • {season}</p>
      </div>
      <div style={{flex:1,minHeight:0,display:'flex',flexDirection:'column' as const,alignItems:'center',justifyContent:'center',padding:'0.2rem 0.3rem',overflow:'hidden'}}>
        <p style={{margin:0,width:'100%',fontSize:nfs(ln.length),fontWeight:900,color:'#fff',lineHeight:1.05,textAlign:'center',textShadow:'0 0 14px '+rc+'aa',overflow:'hidden'}}>{ln}</p>
        <p style={{margin:'2px 0 0',fontSize:'0.5rem',color:'#9aa3b2',fontWeight:700,letterSpacing:'0.05em'}}>{sn!==null?('#'+sn):''}{(sn!==null&&serial)?'  ·  ':''}{serial||''}</p>
      </div>
      <div style={{borderTop:'1px solid rgba(255,255,255,0.06)',padding:'0.4rem 0.3rem',textAlign:'center'}}>
        <p style={{margin:0,fontSize:'1.4rem',fontWeight:900,color:'#fff',lineHeight:1,textShadow:score?('0 0 14px '+rc+'aa'):'none'}}>{score||'—'}</p>
        <p style={{margin:'2px 0 0',fontSize:'0.42rem',color:rc,textTransform:'uppercase',fontWeight:800,letterSpacing:'0.1em'}}>MOY. L10</p>
      </div>
      <div style={{display:'flex',gap:'0.3rem',padding:'0.3rem 0.4rem 0.45rem'}}>
        <span style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',height:'1.05rem',borderRadius:'0.3rem',border:'1px solid '+rc+'55',background:rc+'15',fontSize:'0.46rem',fontWeight:800,color:rc,letterSpacing:'0.02em',whiteSpace:'nowrap'}}>BONUS {bonus||'—'}</span>
        <span style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',height:'1.05rem',borderRadius:'0.3rem',border:'1px solid '+rc+'55',background:'rgba(0,0,0,0.4)',fontSize:'0.46rem',fontWeight:700,color:rc,textTransform:'uppercase',letterSpacing:'0.02em',whiteSpace:'nowrap'}}>{card.rarityTyped.replace('_',' ')}</span>
      </div>
    </div>
  );
});
CardBack.displayName='CardBack';

export const StatPanel=memo(({card,onClose,isClosing=false,placement='scene'}:any)=>{
  const rc=RARITY_COLOR[card.rarityTyped]||'#9ca3af';
  const {season,serial}=parseCard(card.name);
  const ln=(card.anyPlayer?.lastName||parseCard(card.name).lastName).toUpperCase();
  const sn=card.anyPlayer?.shirtNumber;
  const bonus=card.power?('+'+(Math.round((parseFloat(card.power)-1)*100))+'%'):null;
  const avgNum=card.averageScore!=null?parseFloat(String(card.averageScore)):null;
  const team=card.anyTeam?.name||'—';
  const xp=card.xp?card.xp.toLocaleString():'—';
  const edition=card.specialEdition?card.specialEdition.replace(/_/g,' ').toUpperCase():'STANDARD';
  const nbaSeasonStr=card.seasonYear&&card.seasonYear>2000?String(card.seasonYear)+'-'+String(card.seasonYear+1).slice(2):'2025-26';
  const [typedName,setTypedName]=useState('');
  const [countedAvg,setCountedAvg]=useState('0');
  const [nbaStats,setNbaStats]=useState<any>(null);
  const [nbaLoading,setNbaLoading]=useState(false);
  const [footStats,setFootStats]=useState<any>(null);
  const [footLoading,setFootLoading]=useState(false);

  const _full=(card.name.split('•')[0]||'').replace(/\d{4}-\d{2}/,'').trim();
  useEffect(()=>{let i=0;let iv:any;const t=setTimeout(()=>{iv=setInterval(()=>{i++;setTypedName(ln.slice(0,i));if(i>=ln.length)clearInterval(iv);},45);},600);return()=>{clearTimeout(t);clearInterval(iv);};},[ln]);
  useEffect(()=>{if(avgNum==null)return;let step=0;let iv:any;const t=setTimeout(()=>{iv=setInterval(()=>{step++;const cur=Math.min((avgNum/20)*step,avgNum);setCountedAvg(cur%1===0?String(Math.round(cur)):cur.toFixed(1));if(step>=20)clearInterval(iv);},40);},700);return()=>{clearTimeout(t);clearInterval(iv);};},[avgNum]);

  useEffect(()=>{if(!card.anyPlayer?.lastName)return;setNbaLoading(true);fetch(`/api/player-stats?name=${encodeURIComponent(_full||card.anyPlayer.lastName)}&season=${card.seasonYear||0}`).then(r=>r.json()).then(d=>{if(!d.error)setNbaStats(d);}).catch(()=>{}).finally(()=>setNbaLoading(false));},[]);
  useEffect(()=>{if(isNBA(card))return;const nm=_full||card.anyPlayer?.lastName;if(!nm)return;setFootLoading(true);fetch(`/api/player-stats-foot?name=${encodeURIComponent(nm)}`).then(r=>r.json()).then(d=>{if(!d.error&&d.rows)setFootStats(d);}).catch(()=>{}).finally(()=>setFootLoading(false));},[]);
;

  const CY='#40e8ff';const CYS='0 0 8px rgba(64,232,255,0.5)';
  const sep:React.CSSProperties={borderBottom:'1px solid rgba(64,232,255,0.16)',paddingBottom:'0.42rem',marginBottom:'0.42rem',flexShrink:0};
  const fv=(v:any,t:string)=>{if(v==null)return '—';const n=Number(v);if(t==='pct')return n.toFixed(1)+'%';if(t==='pm')return(n>=0?'+':'')+n.toFixed(1);if(t==='int')return String(Math.round(n));return n.toFixed(1);};
  const isOverlay=placement==='overlay';
  const posStyle:React.CSSProperties=isOverlay
    ? {position:'fixed',right:'1%',top:'5%',width:'22.2vw',maxHeight:'89vh',zIndex:200}
    : {position:'absolute',right:'1%',top:'5%',width:'30%',maxHeight:'89%',zIndex:50};
  const deployDelay=isOverlay?'0.1s':'0.45s';
  return(
    <div key={card.slug} style={{...posStyle,background:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(64,232,255,0.03) 2px,rgba(64,232,255,0.03) 3px),linear-gradient(rgba(2,10,22,0.95),rgba(2,10,22,0.95))',border:'1px solid rgba(64,232,255,0.5)',boxShadow:'0 0 40px rgba(64,232,255,0.15),inset 0 0 60px rgba(0,0,0,0.5)',clipPath:isClosing?'none':'polygon(14px 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%,0 14px)',padding:'0.8rem 0.75rem',display:'flex',flexDirection:'column' as const,overflow:'hidden',animation:isClosing?'mnflClose 0.45s cubic-bezier(0.7,0,0.95,1) both':('mnflDeploy 0.55s ease-out '+deployDelay+' backwards'),fontFamily:'Courier New,Consolas,monospace',backdropFilter:isClosing?'none':'blur(12px)',WebkitBackdropFilter:isClosing?'none':'blur(12px)'}}>
      <style>{`
        .stat-link-btn{transition:box-shadow 0.22s ease,border-color 0.22s ease,background 0.22s ease;}
        .stat-link-btn:hover{
          border-color:#40e8ff !important;
          background:rgba(64,232,255,0.14) !important;
          box-shadow:0 0 12px rgba(64,232,255,0.7),0 0 22px rgba(64,232,255,0.45),inset 0 0 10px rgba(64,232,255,0.25) !important;
        }
        .stat-link-btn:hover *{text-shadow:0 0 8px rgba(64,232,255,0.6);}
      `}</style>
      <div style={{...sep,display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div>
          <p style={{margin:0,fontSize:'0.55rem',color:'rgba(64,232,255,0.5)',fontWeight:700,letterSpacing:'0.18em',textTransform:'uppercase'}}>myNFTlocker · STATS</p>
          <p style={{margin:'4px 0 2px',fontSize:'1.1rem',fontWeight:900,color:CY,letterSpacing:'0.06em',textShadow:CYS,minHeight:'1.35em'}}>{typedName}{typedName.length<ln.length?'▊':''}</p>
          <p style={{margin:0,fontSize:'0.6rem',color:'rgba(64,232,255,0.38)',letterSpacing:'0.04em'}}>{sn!=null?'#'+sn+' · ':''}{season}</p>
        </div>
        <button onClick={!isClosing?onClose:undefined} style={{background:'transparent',border:'1px solid rgba(64,232,255,0.35)',borderRadius:'50%',width:'20px',height:'20px',color:CY,cursor:'pointer',fontSize:'0.55rem',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,opacity:isClosing?0:1,marginTop:'2px'}}>✕</button>
      </div>
      <div style={{...sep,display:'flex',alignItems:'stretch'}}>
        <div style={{width:'50%',textAlign:'center',display:'flex',flexDirection:'column' as const,justifyContent:'center',borderRight:'1px solid rgba(64,232,255,0.1)',paddingRight:'0.5rem'}}>
          <p style={{margin:0,fontSize:'2.2rem',fontWeight:900,color:CY,lineHeight:1,textShadow:'0 0 22px '+CY}}>{countedAvg}</p>
          <p style={{margin:'2px 0 0',fontSize:'0.52rem',color:'rgba(64,232,255,0.6)',letterSpacing:'0.2em',textTransform:'uppercase'}}>MOY. L10</p>
        </div>
        <div style={{width:'50%',display:'flex',flexDirection:'column' as const,gap:'0.24rem',paddingLeft:'0.5rem',justifyContent:'center'}}>
          {bonus&&<div style={{padding:'0.22rem 0.4rem',border:'1px solid rgba(64,232,255,0.28)',borderRadius:'0.25rem',background:'rgba(64,232,255,0.07)',display:'flex',justifyContent:'space-between',alignItems:'baseline'}}><span style={{fontSize:'0.52rem',color:'rgba(64,232,255,0.55)',letterSpacing:'0.1em'}}>BONUS</span><span style={{fontSize:'0.72rem',fontWeight:800,color:CY,textShadow:CYS}}>{bonus}</span></div>}
          <div style={{padding:'0.22rem 0.4rem',border:'1px solid '+rc+'55',borderRadius:'0.25rem',background:rc+'0d',textAlign:'center'}}><span style={{fontSize:'0.65rem',fontWeight:900,color:rc,letterSpacing:'0.1em',textShadow:'0 0 7px '+rc}}>{card.rarityTyped.replace(/_/g,' ').toUpperCase()}</span></div>
        </div>
      </div>
      <div style={{...sep}}>
        <p style={{margin:'0 0 0.3rem',fontSize:'0.52rem',fontWeight:900,color:'rgba(64,232,255,0.6)',letterSpacing:'0.2em',textTransform:'uppercase'}}>CARTE</p>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.18rem 0.6rem'}}>
          {([[' ÉQUIPE',team],[' SÉRIE',serial],[' SAISON',season],[' XP',xp],[' ÉDITION',edition]] as [string,string][]).map(([l,v])=>(
            <div key={l} style={{minWidth:0}}>
              <span style={{display:'block',fontSize:'0.5rem',color:'rgba(64,232,255,0.4)',letterSpacing:'0.1em',textTransform:'uppercase'}}>{l}</span>
              <span style={{display:'block',fontSize:'0.72rem',fontWeight:700,color:CY,textShadow:'0 0 5px rgba(64,232,255,0.3)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{v}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{...sep,overflow:'hidden'}}>
        {isNBA(card)?(
          <>
            <p style={{margin:'0 0 0.3rem',fontSize:'0.52rem',fontWeight:900,color:'rgba(64,232,255,0.6)',letterSpacing:'0.2em',textTransform:'uppercase'}}>NBA STATS · {nbaStats?.season||nbaSeasonStr}</p>
            {nbaLoading&&<p style={{margin:0,fontSize:'0.62rem',color:'rgba(64,232,255,0.42)',letterSpacing:'0.14em'}}>CHARGEMENT...</p>}
            {!nbaLoading&&nbaStats&&(
              <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:'0.18rem'}}>
                {([[' PTS',nbaStats.pts,'dec'],[' AST',nbaStats.ast,'dec'],[' REB',nbaStats.reb,'dec'],[' STL',nbaStats.stl,'dec'],[' BLK',nbaStats.blk,'dec'],[' TOV',nbaStats.tov,'dec'],[' MIN',nbaStats.min,'dec'],[' FG%',nbaStats.fgp,'pct'],[' 3P%',nbaStats.tp,'pct'],[' FT%',nbaStats.ftp,'pct'],[' DD',nbaStats.dd,'int'],[' TD',nbaStats.td,'int']] as any[]).map(([l,v,t]:any)=>(<div key={l} style={{textAlign:'center',padding:'0.16rem 0.08rem',border:'1px solid rgba(64,232,255,0.14)',borderRadius:'0.2rem',background:'rgba(64,232,255,0.04)'}}><span style={{display:'block',fontSize:'0.4rem',color:'rgba(64,232,255,0.5)',letterSpacing:'0.04em',textTransform:'uppercase'}}>{l}</span><span style={{display:'block',fontSize:'0.76rem',fontWeight:900,color:CY,textShadow:CYS,lineHeight:1.15}}>{fv(v,t)}</span></div>))}
              </div>
            )}
            {!nbaLoading&&!nbaStats&&<p style={{margin:0,fontSize:'0.58rem',color:'rgba(64,232,255,0.28)',letterSpacing:'0.06em'}}>stats non disponibles</p>}
          </>
        ):(
          <>
            <p style={{margin:'0 0 0.3rem',fontSize:'0.52rem',fontWeight:900,color:'rgba(64,232,255,0.6)',letterSpacing:'0.2em',textTransform:'uppercase'}}>STATS · {card.seasonYear&&card.seasonYear>2000?String(card.seasonYear)+'-'+String(card.seasonYear+1).slice(2):'2025-26'}</p>
            {footLoading&&<p style={{margin:0,fontSize:'0.62rem',color:'rgba(64,232,255,0.42)',letterSpacing:'0.14em'}}>CHARGEMENT...</p>}
            {!footLoading&&footStats&&footStats.rows&&(
              <div style={{width:'100%'}}>
                <div style={{display:'grid',gridTemplateColumns:'1.6fr repeat(6,1fr)',gap:'0.1rem 0.12rem',alignItems:'center'}}>
                  {([''].concat(['TITU','B','PD','TC','CJ','CR'])).map((h,i)=>(
                    <span key={'h'+i} style={{fontSize:'0.42rem',fontWeight:800,color:'rgba(64,232,255,0.55)',textAlign:i===0?'left':'center',letterSpacing:'0.04em'}}>{h}</span>
                  ))}
                  {footStats.rows.map((row:any,ri:number)=>(
                    <Fragment key={'r'+ri}>
                      <span style={{fontSize:'0.5rem',fontWeight:700,color:'rgba(64,232,255,0.85)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{row.label}</span>
                      {[row.titu,row.b,row.pd,row.tc,row.cj,row.cr].map((v:any,ci:number)=>(
                        <span key={'c'+ci} style={{fontSize:'0.6rem',fontWeight:700,color:CY,textAlign:'center',textShadow:'0 0 4px rgba(64,232,255,0.25)'}}>{v||'-'}</span>
                      ))}
                    </Fragment>
                  ))}
                  <span style={{fontSize:'0.5rem',fontWeight:900,color:'#f5d76e',whiteSpace:'nowrap',borderTop:'1px solid rgba(245,215,110,0.3)',paddingTop:'0.12rem',marginTop:'0.06rem'}}>TOTAL</span>
                  {[footStats.total.titu,footStats.total.b,footStats.total.pd,footStats.total.tc,footStats.total.cj,footStats.total.cr].map((v:any,ci:number)=>(
                    <span key={'t'+ci} style={{fontSize:'0.62rem',fontWeight:900,color:'#f5d76e',textAlign:'center',textShadow:'0 0 5px rgba(245,215,110,0.4)',borderTop:'1px solid rgba(245,215,110,0.3)',paddingTop:'0.12rem',marginTop:'0.06rem'}}>{v||'-'}</span>
                  ))}
                </div>
                <p style={{margin:'0.25rem 0 0',fontSize:'0.38rem',color:'rgba(64,232,255,0.3)',letterSpacing:'0.04em',textAlign:'right'}}>TITU = titularisations · source ESPN</p>
              </div>
            )}
            {!footLoading&&!footStats&&<p style={{margin:0,fontSize:'0.58rem',color:'rgba(64,232,255,0.28)',letterSpacing:'0.06em'}}>stats non disponibles</p>}
          </>
        )}
      </div>
      <div style={{display:'flex',gap:'0.4rem',marginBottom:'0.3rem',flexShrink:0}}>
        {(nbaStats?._id||!isNBA(card))&&(
          <a href={isNBA(card)?('https://sorare.com/fr/nba/players/'+card.slug.split('-').filter((_:any,i:number,a:any)=>i<a.length-3).join('-')+'?sale=true'):('https://sorare.com/fr/football/players/'+card.slug.split('-').filter((_:any,i:number,a:any)=>i<a.length-3).join('-')+'?sale=true')}
            target='_blank' rel='noopener noreferrer' className='stat-link-btn'
            style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:'0.3rem',padding:'0.3rem 0',borderRadius:'0.25rem',border:'1px solid rgba(64,232,255,0.5)',background:'rgba(64,232,255,0.06)',color:'#ffffff',fontSize:'0.55rem',fontWeight:800,letterSpacing:'0.1em',textDecoration:'none',cursor:'pointer'}}>
            <img src="/sorare-logo.png" alt="S" style={{width:'14px',height:'14px',borderRadius:'50%',objectFit:'cover'}} onError={(e:any)=>{e.target.style.display='none';}}/> SORARE
          </a>
        )}
        {isNBA(card)&&nbaStats?._id&&(
          <a href={'https://www.espn.com/nba/player/_/id/'+nbaStats._id+'/'+(_full||card.anyPlayer?.lastName||'').toLowerCase().replace(/\s+/g,'-')}
            target='_blank' rel='noopener noreferrer' className='stat-link-btn'
            style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:'0.3rem',padding:'0.3rem 0',borderRadius:'0.25rem',border:'1px solid rgba(64,232,255,0.5)',background:'rgba(64,232,255,0.06)',color:'#e05050',fontSize:'0.55rem',fontWeight:800,letterSpacing:'0.1em',textDecoration:'none',cursor:'pointer'}}>
            <img src="https://a.espncdn.com/favicon.ico" alt="E" style={{width:'14px',height:'14px',objectFit:'contain'}}/> ESPN
          </a>
        )}
        {!isNBA(card)&&footStats?._id&&(
          <a href={'https://www.espn.com/soccer/player/_/id/'+footStats._id+'/'+(_full||card.anyPlayer?.lastName||'').toLowerCase().replace(/\s+/g,'-')}
            target='_blank' rel='noopener noreferrer' className='stat-link-btn'
            style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:'0.3rem',padding:'0.3rem 0',borderRadius:'0.25rem',border:'1px solid rgba(64,232,255,0.5)',background:'rgba(64,232,255,0.06)',color:'#e05050',fontSize:'0.55rem',fontWeight:800,letterSpacing:'0.1em',textDecoration:'none',cursor:'pointer'}}>
            <img src="https://a.espncdn.com/favicon.ico" alt="E" style={{width:'14px',height:'14px',objectFit:'contain'}}/> ESPN
          </a>
        )}
      </div>

    </div>
  );
});
StatPanel.displayName='StatPanel';
