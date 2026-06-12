import { NextRequest, NextResponse } from 'next/server';
export async function GET(request:NextRequest){
  // Introspection complete sur NBACard + types lies
  const query=`{
    nbaCard: __type(name: "NBACard") { fields { name type { name kind ofType { name kind ofType { name kind } } } } }
    tokenOffer: __type(name: "TokenOffer") { fields { name type { name kind } } }
    englishAuction: __type(name: "EnglishAuction") { fields { name type { name kind } } }
    so5Score: __type(name: "So5Score") { fields { name type { name kind } } }
  }`;
  const jwt=process.env.SORARE_JWT||'';
  const aud=process.env.SORARE_AUD||'';
  const headers:Record<string,string>={'Content-Type':'application/json','Accept':'application/json'};
  if(jwt&&aud){headers['Authorization']=`Bearer ${jwt}`;headers['JWT-AUD']=aud;}
  const r=await fetch('https://api.sorare.com/federation/graphql',{method:'POST',headers,body:JSON.stringify({query}),signal:AbortSignal.timeout(8000)});
  const j=await r.json();
  // Formater proprement
  const fmt=(t:any)=>t?.fields?.map((f:any)=>f.name)||[];
  return NextResponse.json({
    NBACard_fields: fmt(j?.data?.nbaCard),
    TokenOffer_fields: fmt(j?.data?.tokenOffer),
    EnglishAuction_fields: fmt(j?.data?.englishAuction),
    So5Score_fields: fmt(j?.data?.so5Score),
  });
}
