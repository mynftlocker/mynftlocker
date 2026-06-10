import { NextRequest, NextResponse } from 'next/server';
export async function GET(request:NextRequest){
  const slug=request.nextUrl.searchParams.get('slug')||'';
  const cursor=request.nextUrl.searchParams.get('cursor')||'';
  const after=cursor?`,after:"${cursor}"`:'';
  // Requete unifiee : champs communs + ...on NBACard + ...on Card (football)
  const query=`query{user(slug:"${slug}"){cards(first:25${after}){nodes{__typename slug name rarityTyped pictureUrl anyPlayer{lastName shirtNumber}anyTeam{name ...on Club{country{slug}}}...on NBACard{seasonYear specialEdition power xp averageScore(type:LAST_TEN_PLAYED_SO5_AVERAGE_SCORE)}...on Card{seasonYear specialEdition xp averageScore(type:LAST_TEN_PLAYED_SO5_AVERAGE_SCORE)playerGameScores{...on PlayerGameScore{goals assists minutesPlayed yellowCards redCards}}}}pageInfo{hasNextPage endCursor}}}}`;
  try{
    const r=await fetch('https://api.sorare.com/federation/graphql',{
      method:'POST',
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      body:JSON.stringify({query}),
      signal:AbortSignal.timeout(8000),
    });
    if(!r.ok)return NextResponse.json({error:'sorare_error',status:r.status},{status:502});
    const j=await r.json();
    if(j.errors?.length)return NextResponse.json({error:j.errors[0].message},{status:400});
    const data=j?.data?.user?.cards;
    if(!data)return NextResponse.json({error:'no_data'},{status:404});
    return NextResponse.json({cards:data.nodes,hasNextPage:data.pageInfo.hasNextPage,cursor:data.pageInfo.endCursor});
  }catch(e){
    return NextResponse.json({error:String(e)},{status:500});
  }
}
