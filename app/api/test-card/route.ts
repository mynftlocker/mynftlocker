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
  const cardFields=extractType('Card');
  // Filtrer les champs pertinents: xp, serial, score, l10, average
  const relevant=cardFields.filter((l:string)=>
    /xp|serial|score|average|game|season|power|special/i.test(l)
  );
  return NextResponse.json({relevant, total: cardFields.length});
}
