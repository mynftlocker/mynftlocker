import { NextRequest, NextResponse } from 'next/server';
export async function GET(request:NextRequest){
  const fields=request.nextUrl.searchParams.get('fields')||'serialNumber';
  // Tester des champs dans user(slug){cards{nodes{...}}}
  const query=`query{user(slug:"memejacquet1998-gmail-com"){cards(first:1){nodes{
    __typename slug
    ${fields}
  }}}}`;
  const jwt=process.env.SORARE_JWT||'';
  const aud=process.env.SORARE_AUD||'';
  const headers:Record<string,string>={'Content-Type':'application/json','Accept':'application/json'};
  if(jwt&&aud){headers['Authorization']=`Bearer ${jwt}`;headers['JWT-AUD']=aud;}
  const r=await fetch('https://api.sorare.com/federation/graphql',{method:'POST',headers,body:JSON.stringify({query}),signal:AbortSignal.timeout(8000)});
  const j=await r.json();
  return NextResponse.json({fields,result:j?.data?.user?.cards?.nodes?.[0]||null,errors:j?.errors||null});
}
