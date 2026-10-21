import { NextRequest, NextResponse } from 'next/server';
export async function GET(request:NextRequest){
  const slug=(request.nextUrl.searchParams.get('slug')||'').trim().toLowerCase();
  const cursor=request.nextUrl.searchParams.get('cursor')||'';
  if(!/^[a-z0-9_-]{1,80}$/.test(slug)||!/^[A-Za-z0-9_=-]{0,400}$/.test(cursor))return NextResponse.json({error:'bad_request'},{status:400}); // evite l'injection dans la requete GraphQL
  const after=cursor?`,after:"${cursor}"`:'';
  const query=`query{user(slug:"${slug}"){nickname cards(first:50${after}){nodes{
    __typename slug name rarityTyped pictureUrl
    anyPlayer{slug lastName shirtNumber gameplayTierStars}
    anyTeam{name ...on Club{country{slug}}}
    ...on NBACard{
      seasonYear specialEdition power xp
      averageScore(type:LAST_TEN_PLAYED_SO5_AVERAGE_SCORE)
      cardStats{ so5LineupsCount bestSo5Appearance{ score } highlightedStats{ type value } }
    }
    ...on Card{
      seasonYear specialEdition power xp
      averageScore(type:LAST_TEN_PLAYED_SO5_AVERAGE_SCORE)
      rawSo5Scores(last:10)
      cardStats{ so5LineupsCount bestSo5Appearance{ score } highlightedStats{ type value } }
    }
  }pageInfo{hasNextPage endCursor}}}}`;
  try{
    const headers:Record<string,string>={'Content-Type':'application/json','Accept':'application/json'};
    const jwt=process.env.SORARE_JWT||'';
    const aud=process.env.SORARE_AUD||'';
    if(jwt&&aud){headers['Authorization']=`Bearer ${jwt}`;headers['JWT-AUD']=aud;}
    const r=await fetch('https://api.sorare.com/graphql',{method:'POST',headers,body:JSON.stringify({query}),signal:AbortSignal.timeout(8000)});
    if(!r.ok)return NextResponse.json({error:'sorare_error'},{status:502});
    const j=await r.json();
    if(j.errors?.length)return NextResponse.json({error:j.errors[0].message},{status:400});
    const data=j?.data?.user?.cards;
    const manager:string|null=j?.data?.user?.nickname||null; // pseudo Sorare du manager (signature de l'image de partage)
    if(!data)return NextResponse.json({error:'no_data'},{status:404});
    // Beat L10 par carte : compteur officiel Sorare (highlightedStats BEAT_L10) / nb de gameweeks jouees (so5LineupsCount).
    // Permet de trier la galerie par Beat L10 sans appel supplementaire. null si la carte n'a pas (encore) de donnee.
    const nodes=(data.nodes||[]).map((n:any)=>{
      const hs:any[]=n?.cardStats?.highlightedStats||[];
      const b=hs.find((h)=>/BEAT_L10/i.test(String(h?.type||'')));
      const beatL10=b&&b.value!=null?Number(b.value):null;
      const beatGw=n?.cardStats?.so5LineupsCount!=null?Number(n.cardStats.so5LineupsCount):null;
      const beatPct=(beatL10!=null&&beatGw&&beatGw>0)?Math.round((beatL10/beatGw)*100):null;
      // GW Record = meilleur score de la carte sur une gameweek (Highest Score du dos de carte)
      const rs=n?.cardStats?.bestSo5Appearance?.score;
      const gwRecord=(rs!=null&&Number(rs)>0)?Number(rs):null;
      return {...n,beatL10,beatGw,beatPct,gwRecord};
    });
    return NextResponse.json({manager,cards:nodes,hasNextPage:data.pageInfo.hasNextPage,cursor:data.pageInfo.endCursor,auth:!!(jwt&&aud)});
  }catch(e){return NextResponse.json({error:String(e)},{status:500});}
}
