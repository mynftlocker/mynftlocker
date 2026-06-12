import { NextRequest, NextResponse } from 'next/server';
export async function GET(request:NextRequest){
  // Teste la requete exacte de route_cards sur une carte foot
  const query=`query{user(slug:"memejacquet1998-gmail-com"){cards(first:3){nodes{
    __typename slug name rarityTyped pictureUrl
    serialNumber
    anyPlayer{lastName shirtNumber}
    anyTeam{name ...on Club{country{slug}}}
    ...on NBACard{
      seasonYear specialEdition power xp
      averageScore(type:LAST_TEN_PLAYED_SO5_AVERAGE_SCORE)
    }
    ...on Card{
      seasonYear specialEdition power xp
      averageScore(type:LAST_TEN_PLAYED_SO5_AVERAGE_SCORE)
      rawSo5Scores(last:10)
    }
  }pageInfo{hasNextPage endCursor}}}}`;
  const jwt=process.env.SORARE_JWT||'';
  const aud=process.env.SORARE_AUD||'';
  const headers:Record<string,string>={'Content-Type':'application/json','Accept':'application/json'};
  if(jwt&&aud){headers['Authorization']=`Bearer ${jwt}`;headers['JWT-AUD']=aud;}
  const r=await fetch('https://api.sorare.com/federation/graphql',{method:'POST',headers,body:JSON.stringify({query}),signal:AbortSignal.timeout(8000)});
  const j=await r.json();
  return NextResponse.json(j?.errors||j?.data?.user?.cards?.nodes||j);
}
