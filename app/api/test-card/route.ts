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
  // Chercher aussi les champs qui contiennent "score" ou "so5" dans NBACard
  const nbaIdx=schema.indexOf('type NBACard ');
  const nbaStart=schema.indexOf('{',nbaIdx)+1;
  const nbaEnd=schema.indexOf('}',nbaStart);
  const nbaBlock=schema.slice(nbaStart,nbaEnd);
  const scoreFields=nbaBlock.split('\n').map((l:string)=>l.trim()).filter((l:string)=>l.toLowerCase().includes('score')||l.toLowerCase().includes('so5')||l.toLowerCase().includes('game'));
  return NextResponse.json({
    NBACard_score_game_fields: scoreFields,
    NBAPlayer: extractType('NBAPlayer').slice(0,30),
  });
}
