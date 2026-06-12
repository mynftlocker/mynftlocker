import { NextResponse } from 'next/server';
export async function GET(){
  const r=await fetch('https://api.sorare.com/graphql/schema',{signal:AbortSignal.timeout(8000)});
  const schema=await r.text();
  const extractType=(name:string)=>{
    const idx=schema.indexOf('type '+name+' ');
    if(idx<0)return ['NOT FOUND'];
    const start=schema.indexOf('{',idx)+1;
    const end=schema.indexOf('}',start);
    return schema.slice(start,end).split('\n').map((l:string)=>l.trim()).filter(Boolean);
  };
  return NextResponse.json({
    MonetaryAmount: extractType('MonetaryAmount'),
    TokenOfferSide: extractType('TokenOfferSide'),
    TokenAuction: extractType('TokenAuction'),
    Range: extractType('Range'),
    User: extractType('User').slice(0,20),
  });
}
