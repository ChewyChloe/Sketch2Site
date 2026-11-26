// Outro, 6 s: the person drags the name into the empty headline slot, walks off,
// and the page stands up as the finished end card.
scenes.outro=(()=>{
  el('onav',`<b style="font-size:22px;color:#0d0e11">Sketch2Site</b><span style="flex:1"></span><span style="color:#4a4a48">Microsoft × NCU AI Innovation Demo Day</span>`,{left:'0',top:'0',width:'1200px',height:'70px',display:'flex',alignItems:'center',padding:'0 48px',boxSizing:'border-box',gap:'36px',fontSize:'20px',borderBottom:'2px solid #0d0e11'});
  const slot=el('slot','',{left:'64px',top:'150px',width:'560px',height:'120px',border:'3px dashed #18c964',boxSizing:'border-box'});
  const nmSh=shadow();
  const name=el('name',`<div style="font-size:96px;font-weight:900;line-height:1.15;color:#0d0e11;white-space:nowrap">Sketch2Site</div>`,{});
  el('sub',`<div style="font-size:34px;font-weight:700;color:#0d0e11">全隊　呂沛珍</div><div style="font-size:24px;margin-top:8px;color:#4a4a48">中央大學資管三</div><div style="width:64px;height:8px;background:#18c964;margin-top:30px"></div><div style="font-size:24px;margin-top:22px;color:#4a4a48">先畫草稿，再做成網站</div>`,{left:'64px',top:'300px',width:'560px'});
  el('pic',`<img src="club-shadow.jpg">`,{left:'680px',top:'130px',width:'456px',height:'560px'});
  return t=>{
    const up=seg(t,2.9,4.3);
    setPage(lerp(FLOOR[0],0,up),lerp(FLOOR[1],1.25,up),lerp(FLOOR[2],0,up),lerp(FLOOR[3],0,up));
    const g=seg(t,0.5,1.9);
    const z=t<0.3?0:t<0.5?24*seg(t,0.3,0.5):t<1.9?24:24*(1-seg(t,1.9,2.15));
    const nx=lerp(120,64,g),ny=lerp(560,150,g);
    lift(name,nmSh,nx,ny,560,120,z);
    slot.style.opacity=1-seg(t,1.9,2.2);
    let fx,fy,ph=0,reach=0;
    if(t<2.0){fx=nx+600;fy=ny+150;reach=seg(t,0.2,0.45);ph=t<0.5?0:t*9}
    else{const w=seg(t,2.1,3.2);fx=lerp(nx+600,1400,w);fy=lerp(ny+150,640,w);reach=1-seg(t,2.0,2.2);ph=(t-2)*11}
    placeFig(fx,fy,lerp(FLOOR[0],0,up),ph,reach,0);
    figWrap.querySelector('svg').style.transform='scaleX(-1)';
    figWrap.style.opacity=fsh.style.opacity=1-seg(t,2.7,3.0);
  };
});
