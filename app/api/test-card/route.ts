import { NextRequest, NextResponse } from 'next/server';
export async function GET(request:NextRequest){
  const slug=request.nextUrl.searchParams.get('slug')||'';
  if(!slug)return NextResponse.json({error:'slug required'});
  const query=`query{anyCards(slugs:["${slug}"]){
    slug
    ...on NBACard{
      xp power
      averageScore(type:LAST_TEN_PLAYED_SO5_AVERAGE_SCORE)
      liveSingleSaleOffer{price}
      latestEnglishAuction{currentPrice}
      myMintedSingleSaleOffer{price}
      so5Scores(last:5){score gameWeek{displayName}}
    }
  }}`;
  const jwt=process.env.SORARE_JWT||'';
  const aud=process.env.SORARE_AUD||'';
  const headers:Record<string,string>={'Content-Type':'application/json','Accept':'application/json'};
  if(jwt&&aud){headers['Authorization']=`Bearer ${jwt}`;headers['JWT-AUD']=aud;}
  const r=await fetch('https://api.sorare.com/federation/graphql',{method:'POST',headers,body:JSON.stringify({query}),signal:AbortSignal.timeout(8000)});
  const j=await r.json();
  return NextResponse.json(j);
}
