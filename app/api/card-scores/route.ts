import { NextRequest, NextResponse } from 'next/server';
export async function GET(request:NextRequest){
  const slug=(request.nextUrl.searchParams.get('slug')||'').trim();
  if(!slug)return NextResponse.json({error:'slug required'},{status:400});
  const query=`query{anyCards(slugs:["${slug}"]){...on NBACard{basketballPlayer{allPlayerGameScores(last:10){nodes{score}}}}}}`;
  try{
    const headers:Record<string,string>={'Content-Type':'application/json','Accept':'application/json'};
    const jwt=process.env.SORARE_JWT||'';
    const aud=process.env.SORARE_AUD||'';
    if(jwt&&aud){headers['Authorization']=`Bearer ${jwt}`;headers['JWT-AUD']=aud;}
    const r=await fetch('https://api.sorare.com/federation/graphql',{method:'POST',headers,body:JSON.stringify({query}),signal:AbortSignal.timeout(6000)});
    if(!r.ok)return NextResponse.json({},{status:200});
    const j=await r.json();
    if(j.errors?.length)return NextResponse.json({},{status:200});
    const nodes=j?.data?.anyCards?.[0]?.basketballPlayer?.allPlayerGameScores?.nodes||[];
    const scores=nodes.map((n:any)=>n.score).filter((s:any)=>s!=null);
    return NextResponse.json({scores});
  }catch(e){return NextResponse.json({},{status:200});}
}
