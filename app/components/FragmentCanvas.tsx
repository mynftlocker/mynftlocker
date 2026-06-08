'use client';
import{useEffect,useRef}from 'react';
interface FragmentCanvasProps{active?:boolean;fragPhase?:number;cx?:number;cy?:number;pw?:number;ph?:number;}
export default function FragmentCanvas({active=false,fragPhase=0,cx=0,cy=0,pw=280,ph=380}:FragmentCanvasProps){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const stateRef=useRef({active,fragPhase,cx,cy,pw,ph});
  useEffect(()=>{stateRef.current={active,fragPhase,cx,cy,pw,ph};},[active,fragPhase,cx,cy,pw,ph]);
  useEffect(()=>{
    const canvas=canvasRef.current!;
    const ctx=canvas.getContext('2d')!;
    let W=0,H=0;
    const resize=()=>{W=canvas.width=window.innerWidth;H=canvas.height=window.innerHeight;};
    resize();
    window.addEventListener('resize',resize);
    const COLS=7,ROWS=8;
    let blocks:any[]=[];
    let particles:any[]=[];
    let plateW=0,plateH=0,bw=0,bh=0;
    let lastFrag=-1;
    let active0=false;
    const rnd=(a:number,b:number)=>a+Math.random()*(b-a);
    const initBlocks=()=>{
      const s=stateRef.current;
      // Plaque or : ratio carte realiste, plus etroite que le pack
      plateW=s.pw*0.74;plateH=plateW*1.4;
      if(plateH>s.ph*0.92){plateH=s.ph*0.92;plateW=plateH/1.4;}
      bw=plateW/COLS;bh=plateH/ROWS;
      const ox=s.cx-plateW/2,oy=s.cy-plateH/2;
      blocks=[];
      for(let r=0;r<ROWS;r++){for(let c=0;c<COLS;c++){
        const hx=ox+c*bw+bw/2,hy=oy+r*bh+bh/2;
        blocks.push({
          hx,hy,x:hx,y:hy,
          ph:rnd(0,Math.PI*2),ax:rnd(1.5,4),ay:rnd(2,5),sp:rnd(0.5,1.0),
          rot:0,rotV:0,
          shade:0.72+(1-r/ROWS)*0.28,
          col:c,row:r,vx:0,vy:0,disp:false,alpha:1,appear:0,
        });
      }}
    };
    const triggerDispersion=()=>{
      const s=stateRef.current;
      for(const b of blocks){
        const dx=b.x-s.cx,dy=b.y-s.cy;
        const dist=Math.sqrt(dx*dx+dy*dy)||1;
        const force=rnd(9,20);
        b.vx=(dx/dist)*force+rnd(-4,4);
        b.vy=(dy/dist)*force+rnd(-4,4)-4;
        b.rotV=rnd(-0.45,0.45);
        b.disp=true;
      }
      for(let i=0;i<240;i++){
        const a=(i/240)*Math.PI*2+rnd(-0.35,0.35);
        const sp=rnd(3,15);
        const gold=Math.random()>0.4;
        particles.push({
          x:s.cx,y:s.cy,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,
          size:rnd(1,3.5),alpha:1,decay:rnd(0.01,0.022),
          r:gold?255:0,g:gold?180+(Math.random()*70|0):225,b:gold?25:255,
        });
      }
    };
    let frame=0,raf:number;
    const loop=()=>{
      raf=requestAnimationFrame(loop);
      frame++;
      const t=frame*0.016;
      ctx.clearRect(0,0,W,H);
      const s=stateRef.current;
      // Reset quand inactif (nouvelle sequence propre)
      if(!s.active){if(active0){blocks=[];particles=[];lastFrag=-1;active0=false;}return;}
      active0=true;
      const fp=s.fragPhase;
      if(fp>=1&&lastFrag<1)initBlocks();
      if(fp>=2&&lastFrag<2)triggerDispersion();
      lastFrag=fp;
      if(fp<1){return;}
      // ── BLOCS ──────────────────────────────────────────────────────────
      for(const b of blocks){
        if(b.disp){
          b.x+=b.vx;b.y+=b.vy;b.vx*=0.985;b.vy*=0.985;b.vy+=0.18;
          b.rot+=b.rotV;b.alpha-=0.016;
        }else{
          if(b.appear<1)b.appear=Math.min(1,b.appear+0.08);
          b.x=b.hx+Math.sin(t*b.sp+b.ph)*b.ax;
          b.y=b.hy+Math.cos(t*b.sp*0.8+b.ph)*b.ay;
          b.rot=Math.sin(t*b.sp*0.5+b.ph)*0.05;
        }
        if(b.alpha<=0)continue;
        const hw=(bw-1.4)/2,hh=(bh-1.4)/2;
        ctx.save();
        ctx.translate(b.x,b.y);
        ctx.rotate(b.rot);
        const sc=b.disp?1:(0.6+b.appear*0.4);
        ctx.scale(sc,sc);
        ctx.globalAlpha=Math.max(0,b.alpha)*(b.disp?1:b.appear);
        // Halo or par bloc (effet tresor)
        ctx.shadowColor='rgba(255,200,40,0.85)';
        ctx.shadowBlur=b.disp?5:13;
        // Degrade or metallique (relief par shade)
        const sh=b.shade;
        const g=ctx.createLinearGradient(-hw,-hh,hw,hh);
        g.addColorStop(0,'rgba('+(255*sh|0)+','+(228*sh|0)+','+(140*sh|0)+',1)');
        g.addColorStop(0.5,'rgba('+(245*sh|0)+','+(195*sh|0)+','+(80*sh|0)+',1)');
        g.addColorStop(1,'rgba('+(165*sh|0)+','+(110*sh|0)+','+(28*sh|0)+',1)');
        ctx.fillStyle=g;
        ctx.fillRect(-hw,-hh,hw*2,hh*2);
        ctx.shadowBlur=0;
        // Bevel 3D : aretes claires haut/gauche, sombres bas/droite
        ctx.fillStyle='rgba(255,255,225,0.45)';
        ctx.fillRect(-hw,-hh,hw*2,1.4);
        ctx.fillRect(-hw,-hh,1.4,hh*2);
        ctx.fillStyle='rgba(70,45,0,0.5)';
        ctx.fillRect(-hw,hh-1.4,hw*2,1.4);
        ctx.fillRect(hw-1.4,-hh,1.4,hh*2);
        ctx.restore();
      }
      // ── PARTICULES ONDE DE CHOC ─────────────────────────────────────────
      ctx.globalAlpha=1;
      for(let i=particles.length-1;i>=0;i--){
        const p=particles[i];
        p.x+=p.vx;p.y+=p.vy;p.vx*=0.96;p.vy*=0.96;p.alpha-=p.decay;
        if(p.alpha<=0){particles.splice(i,1);continue;}
        const col='rgba('+p.r+','+p.g+','+p.b+','+p.alpha.toFixed(2)+')';
        ctx.shadowColor=col;ctx.shadowBlur=9;
        ctx.fillStyle=col;
        ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();
      }
      ctx.shadowBlur=0;ctx.globalAlpha=1;
    };
    loop();
    return()=>{cancelAnimationFrame(raf);window.removeEventListener('resize',resize);};
  },[]);
  return <canvas ref={canvasRef} style={{position:'fixed',inset:0,zIndex:5,width:'100%',height:'100%',pointerEvents:'none',background:'transparent'}}/>;
}