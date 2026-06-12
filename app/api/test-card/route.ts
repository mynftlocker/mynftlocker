import { NextResponse } from 'next/server';
export async function GET(){
  // Telecharger le schema Sorare et extraire les champs NBACard
  const r=await fetch('https://api.sorare.com/graphql/schema',{signal:AbortSignal.timeout(8000)});
  const schema=await r.text();
  // Extraire le bloc "type NBACard"
  const m=schema.match(/type NBACard[^{]*\{([^}]+)\}/s);
  const block=m?m[1]:'NOT FOUND';
  // Extraire aussi TokenOffer et EnglishAuction
  const m2=schema.match(/type TokenOffer[^{]*\{([^}]+)\}/s);
  const m3=schema.match(/type EnglishAuction[^{]*\{([^}]+)\}/s);
  return NextResponse.json({
    NBACard: block.split('\n').map((l:string)=>l.trim()).filter(Boolean),
    TokenOffer: m2?m2[1].split('\n').map((l:string)=>l.trim()).filter(Boolean):[],
    EnglishAuction: m3?m3[1].split('\n').map((l:string)=>l.trim()).filter(Boolean):[],
  });
}
