// Intro, 7 s: a dull template page tips over into a floor, a person drags the photo into place,
// the page takes on the design, then the name appears.
scenes.intro=(()=>{
  const nav=el('nav',`<b class="dull" style="font-size:22px">LOGO</b><span style="flex:1"></span><span class="dull">首頁</span><span class="dull">關於</span><span class="dull">聯絡</span>`,{});
  const navNew=el('nav2',`<b style="font-size:22px;color:#0d0e11">攝影社</b><span style="flex:1"></span><span>上學期作品</span><span>新生常見問題</span><span style="background:#0d0e11;color:#f4f1ea;padding:8px 18px">一起加入</span>`,{left:'0',top:'0',width:'1200px',height:'70px',display:'flex',alignItems:'center',padding:'0 48px',boxSizing:'border-box',gap:'36px',fontSize:'20px',color:'#0d0e11',opacity:0});
  const hOld=el('h1',`<div class="dull" style="font-size:44px;text-align:center">歡迎來到我們的網站</div><div class="dull" style="font-size:22px;text-align:center;margin-top:14px">在這裡輸入你的副標題</div>`,{left:'200px',top:'120px',width:'800px'});
  const hNew=el('h2',`<div style="font-size:76px;font-weight:900;line-height:1.1;color:#0d0e11">攝影社，<br>新學期招生中</div><div style="font-size:24px;margin-top:22px;color:#4a4a48">沒有相機也可以，手機也能拍出好照片</div><div style="display:inline-block;margin-top:30px;background:#18c964;color:#0d0e11;font-weight:800;font-size:22px;padding:14px 30px">立即報名</div>`,{left:'64px',top:'140px',width:'560px',opacity:0});
  const btn=el('btn',`<div class="box dull" style="width:200px;height:56px;border-radius:28px;display:flex;align-items:center;justify-content:center;color:#fff;background:#b8b5ae">按鈕</div>`,{left:'500px',top:'250px'});
  const phSh=shadow();
  const photo=el('photo',`<div class="box" style="position:absolute;inset:0"><svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="10" stroke="#c4c0b8" stroke-width=".06"/><line x1="10" y1="0" x2="0" y2="10" stroke="#c4c0b8" stroke-width=".06"/></svg></div><img src="club-shadow.jpg" style="position:absolute;inset:0;opacity:0" id="phimg">`,{});
  const pics=['club-exhibit.jpg','camera.jpg','club-camera.jpg'];
  const cards=[0,1,2].map(i=>el('c'+i,`<div class="box" style="height:150px;position:relative"><img src="${pics[i]}" style="position:absolute;inset:0;opacity:0"></div><div class="box" style="height:16px;width:70%;margin-top:14px"></div><div class="box" style="height:16px;width:50%;margin-top:10px"></div>`,{left:(64+i*370)+'px',top:'560px',width:'330px'}));
  const title=document.getElementById('title');
  return t=>{
    // camera
    const k=seg(t,1.2,2.7);
    setPage(lerp(0,FLOOR[0],k),lerp(1.25,FLOOR[1],k),lerp(0,FLOOR[2],k),lerp(0,FLOOR[3],k));
    // the photo: she picks the dull box up, carries it to the top right and sets it down;
    // while in her hands it is drawn in her 3D scene, the page element hides
    const CW=440,CH=200,R=Math.PI/2;
    const S=[380,330],D=[660,110];
    const A=feetFor(S[0]+CW/2,S[1]+CH/2,R,CW,CH),B=feetFor(D[0]+CW/2,D[1]+CH/2,R,CW,CH);
    const grow=seg(t,5.0,5.4),landed=t>=4.98;
    const px=landed?D[0]:S[0],py=landed?D[1]:S[1],pw=landed?lerp(CW,480,grow):CW,ph=landed?lerp(CH,400,grow):CH;
    lift(photo,phSh,px,py,pw,ph,0);
    photo.style.opacity=t<3.35||landed?1:0;
    photo.querySelector('#phimg').style.opacity=landed?1:0;
    // the rest of the page restyles once the photo lands
    const r=seg(t,4.9,5.5);
    hOld.style.opacity=1-r;btn.style.opacity=1-r;nav.style.opacity=1-r;
    hNew.style.opacity=r;navNew.style.opacity=r;
    cards.forEach((c,i)=>{const q=seg(t,4.8+i*.1,5.3+i*.1);c.querySelector('img').style.opacity=q;c.querySelectorAll('.box').forEach((b,j)=>{if(j)b.style.background=q>.5?'#0d0e11':'#d9d6cf'})});
    // her path: walk in, pick up, carry, set down, step back to an empty spot
    const mix=seg(t,3.9,4.5),C=[560,490];
    let fx,fy,o={phase:t*9};
    if(t<3.3){const w=seg(t,2.2,3.3);fx=lerp(40,A[0],w);fy=lerp(560,A[1],w);if(t>3.0)o.yaw=R}
    else if(t<3.75){[fx,fy]=A;o.yaw=R;o.walk=0;o.carry={kind:'photo',w:CW/fig3d.UNIT,h:CH/fig3d.UNIT,k:seg(t,3.35,3.72),crouch:Math.sin(Math.PI*lin(t,3.25,3.78)),mix}}
    else if(t<4.55){const w=seg(t,3.75,4.55);fx=lerp(A[0],B[0],w);fy=lerp(A[1],B[1],w);if(t>4.3)o.yaw=R;o.carry={kind:'photo',w:CW/fig3d.UNIT,h:CH/fig3d.UNIT,k:1,mix}}
    else if(t<4.98){[fx,fy]=B;o.yaw=R;o.walk=0;o.carry={kind:'photo',w:CW/fig3d.UNIT,h:CH/fig3d.UNIT,k:1-seg(t,4.6,4.95),crouch:Math.sin(Math.PI*lin(t,4.55,5.05)),mix}}
    else{const w=seg(t,5.05,6.0);fx=lerp(B[0],C[0],w);fy=lerp(B[1],C[1],w)}
    placeFig(fx,fy,FLOOR[0]*k,o);
    figWrap.style.opacity=fsh.style.opacity=seg(t,2.2,2.5);
    // name
    const n=seg(t,5.5,6.2);
    title.innerHTML=`<div class="k">MICROSOFT × NCU AI INNOVATION DEMO DAY</div><div class="h">Sketch2Site</div><div class="s">先畫草稿，再做成網站</div>`;
    title.style.opacity=n;title.style.transform=`translateY(${(1-n)*24}px)`;
  };
});
