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
    const up=seg(t,3.0,4.3);
    setPage(lerp(FLOOR[0],0,up),lerp(FLOOR[1],1.25,up),lerp(FLOOR[2],0,up),lerp(FLOOR[3],0,up));
    // she picks the name up from the bottom left and carries it up into the empty headline
    const NW=560,NH=120,U=Math.PI,S=[40,560],D=[64,150];
    const A=feetFor(S[0]+NW/2,S[1]+NH/2,U,NW,NH),B=feetFor(D[0]+NW/2,D[1]+NH/2,U,NW,NH);
    const landed=t>=2.25;
    lift(name,nmSh,landed?D[0]:S[0],landed?D[1]:S[1],NW,NH,0);
    name.style.opacity=t<0.6||landed?1:0;
    slot.style.opacity=1-seg(t,2.25,2.5);
    const card={kind:'name',style:'overhead',w:NW/fig3d.UNIT,h:NH/fig3d.UNIT};
    let fx,fy,o={phase:t*9};
    if(t<0.55){const w=seg(t,0,0.55);fx=lerp(-60,A[0],w);fy=A[1];if(t>0.35)o.yaw=U}
    else if(t<0.95){[fx,fy]=A;o.yaw=U;o.walk=0;o.carry={...card,k:seg(t,0.6,0.92),crouch:Math.sin(Math.PI*lin(t,0.5,0.98))}}
    else if(t<1.85){const w=seg(t,0.95,1.85);fx=lerp(A[0],B[0],w);fy=lerp(A[1],B[1],w);o.yaw=U;o.carry={...card,k:1}}
    else if(t<2.25){[fx,fy]=B;o.yaw=U;o.walk=0;o.carry={...card,k:1-seg(t,1.9,2.22),crouch:Math.sin(Math.PI*lin(t,1.82,2.3))}}
    else{const w=seg(t,2.3,3.0);fx=lerp(B[0],-80,w);fy=lerp(B[1],430,w)}
    placeFig(fx,fy,lerp(FLOOR[0],0,up),o);
    figWrap.style.opacity=fsh.style.opacity=seg(t,0,0.2)*(1-seg(t,2.7,3.0));
  };
});
