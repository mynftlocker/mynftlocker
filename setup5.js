const fs=require('fs'),path=require('path');
const dir='app/api/player-stats';
fs.mkdirSync(dir,{recursive:true});
const code=`import{NextResponse}from 'next/server';
const H={
  'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Referer':'https://www.nba.com/',
  'Accept':'application/json, text/plain, */*',
  'Accept-Language':'en-US,en;q=0.9',
  'Origin':'https://www.nba.com',
  'x-nba-stats-origin':'stats',
  'x-nba-stats-token':'true',
};
function nbaS(sy:number){return \`\${sy}-\${String(sy+1).slice(2)}\`}
export async function GET(req:Request){
  const u=new URL(req.url);
  const name=(u.searchParams.get('name')||'').trim();
  const sy=parseInt(u.searchParams.get('season')||'0',10);
  if(!name)return NextResponse.json({error:'name required'},{status:400});
  const season=sy&&sy>2000?nbaS(sy):'2025-26';
  try{
    const url=\`https://stats.nba.com/stats/leaguedashplayerstats?College=&Conference=&Country=&DateFrom=&DateTo=&Division=&DraftPick=&DraftYear=&GameScope=&GameSegment=&Height=&LastNGames=0&LeagueID=00&Location=&MeasureType=Base&Month=0&OpponentTeamID=0&Outcome=&PORound=0&PaceAdjust=N&PerMode=PerGame&Period=0&PlayerExperience=&PlayerPosition=&PlusMinus=N&Rank=N&Season=\${season}&SeasonSegment=&SeasonType=Regular+Season&ShotClockRange=&StarterBench=&TeamID=0&TwoWay=0&VsConference=&VsDivision=&Weight=\`;
    const res=await fetch(url,{headers:H,signal:AbortSignal.timeout(10000)});
    if(!res.ok)return NextResponse.json({error:'nba_http_'+res.status},{status:502});
    const data=await res.json();
    const rs=data.resultSets[0];
    const hdrs=rs.headers as string[];
    const rows=rs.rowSet as any[][];
    const iName=hdrs.indexOf('PLAYER_NAME');
    const norm=(s:string)=>s.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'');
    const nl=norm(name);
    const player=rows.find((r:any)=>{
      const full=norm(String(r[iName]));
      const parts=full.split(' ');
      const last=parts[parts.length-1];
      return last===nl||full.includes(nl)||nl.includes(last);
    });
    if(!player)return NextResponse.json({error:'not_found:'+name},{status:404});
    const g=(k:string)=>{const i=hdrs.indexOf(k);return i>=0?player[i]:null;};
    const pct=(v:any)=>v!=null?Math.round(Number(v)*1000)/10:null;
    return NextResponse.json({
      pts:g('PTS'),ast:g('AST'),reb:g('REB'),
      stl:g('STL'),blk:g('BLK'),tov:g('TOV'),
      min:g('MIN'),fgp:pct(g('FG_PCT')),tp:pct(g('FG3_PCT')),
      ftp:pct(g('FT_PCT')),fta:g('FTA'),pm:g('PLUS_MINUS'),
      gp:g('GP'),season
    });
  }catch(e){return NextResponse.json({error:String(e)},{status:500});}
}`;
fs.writeFileSync(path.join(dir,'route.ts'),code,'utf8');
console.log('OK - app/api/player-stats/route.ts');
