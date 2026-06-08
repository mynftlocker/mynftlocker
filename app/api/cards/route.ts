import{NextRequest,NextResponse}from 'next/server';
export async function GET(request:NextRequest){
  const{searchParams}=new URL(request.url);
  const slug=searchParams.get('slug');
  const cursor=searchParams.get('cursor')||null;
  if(!slug)return NextResponse.json({error:'Slug manquant'},{status:400});
  const after=cursor?`, after: "${cursor}"` :'';
  const query=`query{user(slug:"${slug}"){cards(first:25${after}){nodes{slug name rarityTyped pictureUrl ...on NBACard{seasonYear specialEdition power xp averageScore(type:LAST_TEN_PLAYED_SO5_AVERAGE_SCORE)anyTeam{name}anyPlayer{lastName shirtNumber}}}pageInfo{hasNextPage endCursor}}}}`;
  try{
    const res=await fetch('https://api.sorare.com/federation/graphql',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Accept':'application/json,*/*',
        'User-Agent':'Mozilla/5.0(Windows NT 10.0;Win64;x64)AppleWebKit/537.36(KHTML,like Gecko)Chrome/124.0.0.0 Safari/537.36',
        'Origin':'https://sorare.com',
        'Referer':'https://sorare.com/',
        'JWT-AUD':'ext-api-2',
      },
      body:JSON.stringify({query}),
      signal:AbortSignal.timeout(8000),
    });
    if(!res.ok)return NextResponse.json({error:'Sorare HTTP '+res.status},{status:500});
    const json=await res.json();
    if(json.errors||!json?.data?.user?.cards){
      const msg=json.errors?json.errors[0]?.message:'null data';
      return NextResponse.json({error:msg||'API error'},{status:500});
    }
    const c=json.data.user.cards;
    return NextResponse.json({cards:c.nodes,hasNextPage:c.pageInfo.hasNextPage,cursor:c.pageInfo.endCursor});
  }catch(e){
    return NextResponse.json({error:String(e)},{status:500});
  }
}