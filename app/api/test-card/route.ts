import { NextRequest, NextResponse } from 'next/server';
export async function GET(request:NextRequest){
  const fields=request.nextUrl.searchParams.get('fields')||'serialNumber';
  const slug=request.nextUrl.searchParams.get('slug')||'lebron-james-19841230-2025-limited-210';
  const query=`query{anyCards(slugs:["${slug}"]){
    __typename slug
    ${fields}
  }}`;
  const jwt=process.env.SORARE_JWT||'';
  const aud=process.env.SORARE_AUD||'';
  const headers:Record<string,string>={'Content-Type':'application/json','Accept':'application/json'};
  if(jwt&&aud){headers['Authorization']=`Bearer ${jwt}`;headers['JWT-AUD']=aud;}
  const r=await fetch('https://api.sorare.com/federation/graphql',{method:'POST',headers,body:JSON.stringify({query}),signal:AbortSignal.timeout(8000)});
  const j=await r.json();
  return NextResponse.json({fields,result:j?.data?.anyCards?.[0]||null,errors:j?.errors||null});
}
