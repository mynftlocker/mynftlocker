import { NextRequest, NextResponse } from 'next/server';
import { BEST_APPEARANCE_FRAG, gwRecordOf } from '../../lib/gwRecord';
// Champs demandes pour chaque carte (identiques pour la galerie et pour le lien direct vers une carte)
const cardFields=(detail:boolean)=>{const BA=detail?BEST_APPEARANCE_FRAG:'bestSo5Appearance{ score }';return `
    __typename slug name rarityTyped pictureUrl
    anyPlayer{slug lastName shirtNumber gameplayTierStars nextClassicFixtureProjectedScore gainOnProjection injuries{status expectedEndDate}}
    anyTeam{name ...on Club{country{slug}}}
    ...on NBACard{
      seasonYear specialEdition inSeasonEligible power xp
      averageScore(type:LAST_TEN_PLAYED_SO5_AVERAGE_SCORE)
      cardStats{ so5LineupsCount ${BA} highlightedStats{ type value } }
    }
    ...on Card{
      seasonYear specialEdition inSeasonEligible power xp
      averageScore(type:LAST_TEN_PLAYED_SO5_AVERAGE_SCORE)
      rawSo5Scores(last:10)
      cardStats{ so5LineupsCount ${BA} highlightedStats{ type value } }
    }
  `;};
// Beat L10 par carte : compteur officiel Sorare (highlightedStats BEAT_L10) / nb de gameweeks jouees (so5LineupsCount).
const enrich=(n:any)=>{
  const hs:any[]=n?.cardStats?.highlightedStats||[];
  const b=hs.find((h)=>/BEAT_L10/i.test(String(h?.type||'')));
  const beatL10=b&&b.value!=null?Number(b.value):null;
  const beatGw=n?.cardStats?.so5LineupsCount!=null?Number(n.cardStats.so5LineupsCount):null;
  const beatPct=(beatL10!=null&&beatGw&&beatGw>0)?Math.round((beatL10/beatGw)*100):null;
  // GW Record = meilleur score de la carte sur une gameweek (Highest Score du dos de carte)
  const gwRecord=gwRecordOf(n?.cardStats?.bestSo5Appearance); // recalcule si le detail Sorare est corrompu
  // Projection Sorare du prochain match + ecart (projection - minimum du palier d'etoiles actuel). NBA uniquement : null pour le foot.
  const pj=n?.anyPlayer?.nextClassicFixtureProjectedScore, gn=n?.anyPlayer?.gainOnProjection;
  const proj=(pj!=null&&isFinite(Number(pj)))?Number(pj):null;
  const gain=(gn!=null&&isFinite(Number(gn)))?Number(gn):null;
  return {...n,beatL10,beatGw,beatPct,gwRecord,proj,gain};
};
// Requete avec le detail du score (recalcul du record GW). Si Sorare refuse (profondeur/complexite), on retente sans le detail : la galerie ne doit jamais casser.
const sorareQuery=async(headers:Record<string,string>,build:(detail:boolean)=>string)=>{
  for(const detail of [true,false]){
    const r=await fetch('https://api.sorare.com/graphql',{method:'POST',headers,body:JSON.stringify({query:build(detail)}),signal:AbortSignal.timeout(8000)});
    if(!r.ok)return {status:r.status,j:null as any};
    const j=await r.json();
    if(detail&&j.errors?.length&&/depth|complexity/i.test(String(j.errors[0]?.message||'')))continue;
    return {status:200,j};
  }
  return {status:502,j:null as any};
};
const sorareHeaders=()=>{
  const headers:Record<string,string>={'Content-Type':'application/json','Accept':'application/json'};
  const jwt=process.env.SORARE_JWT||'';
  const aud=process.env.SORARE_AUD||'';
  if(jwt&&aud){headers['Authorization']=`Bearer ${jwt}`;headers['JWT-AUD']=aud;}
  if(process.env.SORARE_API_KEY){headers['APIKEY']=process.env.SORARE_API_KEY;}
  return {headers,auth:!!(jwt&&aud)};
};
export async function GET(request:NextRequest){
  const sp=request.nextUrl.searchParams;
  const slug=(sp.get('slug')||'').trim().toLowerCase();
  const cursor=sp.get('cursor')||'';
  const cardSlug=(sp.get('card')||'').trim().toLowerCase();
  const {headers,auth}=sorareHeaders();
  // LOT DE CARTES : /api/cards?slug=<manager>&cards=a,b,c (25 max) -> ces cartes parmi celles que le manager possede (Sorare ignore les autres), pour afficher en premier le Hall of Fame / l'equipe par defaut
  const list=(sp.get('cards')||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
  if(list.length){
    if(list.length>25||!/^[a-z0-9_-]{1,80}$/.test(slug)||list.some(x=>!/^[a-z0-9_-]{3,200}$/.test(x)))return NextResponse.json({error:'bad_request'},{status:400});
    try{
      const {j}=await sorareQuery(headers,(d)=>`query{user(slug:"${slug}"){cards(first:25,slugs:[${list.map(x=>`"${x}"`).join(',')}]){nodes{${cardFields(d)}}}}}`);
      if(!j)return NextResponse.json({error:'sorare_error'},{status:502});
      const nodes=j?.data?.user?.cards?.nodes;
      if(!nodes)return NextResponse.json({error:String(j.errors?.[0]?.message||'no_data')},{status:400});
      return NextResponse.json({cards:nodes.map((c:any)=>({...enrich(c),owner:slug}))});
    }catch(e){return NextResponse.json({error:String(e)},{status:500});}
  }
  // LIEN DIRECT VERS UNE CARTE : /api/cards?card=<slug-de-la-carte> -> une seule carte, reponse quasi immediate
  if(cardSlug){
    if(!/^[a-z0-9_-]{3,200}$/.test(cardSlug))return NextResponse.json({error:'bad_request'},{status:400});
    try{
      const {j}=await sorareQuery(headers,(d)=>`query{anyCard(slug:"${cardSlug}"){${cardFields(d)}}}`);
      if(!j)return NextResponse.json({error:'sorare_error'},{status:502});
      if(j.errors?.length)return NextResponse.json({error:j.errors[0].message},{status:400});
      const c=j?.data?.anyCard;
      if(!c)return NextResponse.json({error:'no_data'},{status:404});
      return NextResponse.json({card:enrich(c)});
    }catch(e){return NextResponse.json({error:String(e)},{status:500});}
  }
  if(!/^[a-z0-9_-]{1,80}$/.test(slug)||!/^[A-Za-z0-9_=-]{0,400}$/.test(cursor))return NextResponse.json({error:'bad_request'},{status:400}); // evite l'injection dans la requete GraphQL
  const after=cursor?`,after:"${cursor}"`:'';
  try{
    const {j}=await sorareQuery(headers,(d)=>`query{user(slug:"${slug}"){nickname cards(first:50${after}){nodes{${cardFields(d)}}pageInfo{hasNextPage endCursor}}}}`);
    if(!j)return NextResponse.json({error:'sorare_error'},{status:502});
    if(j.errors?.length)return NextResponse.json({error:j.errors[0].message},{status:400});
    const data=j?.data?.user?.cards;
    const manager:string|null=j?.data?.user?.nickname||null; // pseudo Sorare du manager (signature de l'image de partage)
    if(!data)return NextResponse.json({error:'no_data'},{status:404});
    const nodes=(data.nodes||[]).map(enrich);
    return NextResponse.json({manager,cards:nodes,hasNextPage:data.pageInfo.hasNextPage,cursor:data.pageInfo.endCursor,auth});
  }catch(e){return NextResponse.json({error:String(e)},{status:500});}
}
