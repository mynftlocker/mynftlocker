import { NextRequest, NextResponse } from 'next/server';
export async function GET(request:NextRequest){
  const slug=request.nextUrl.searchParams.get('slug')||'';
  if(!slug)return NextResponse.json({error:'slug required'});
  const query=`query{anyCards(slugs:["${slug}"]){
    slug serialNumber
    user{nickname slug}
    liveSingleSaleOffer{senderSide{amounts{eurCents wei}}}
    latestEnglishAuction{currentPrice currency}
    myMintedSingleSaleOffer{senderSide{amounts{eurCents wei}}}
    priceRange{min max}
    ...on NBACard{
      xp power seasonYear specialEdition
      averageScore(type:LAST_TEN_PLAYED_SO5_AVERAGE_SCORE)
      so5Scores(last:10){score anyGame{date}}
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
