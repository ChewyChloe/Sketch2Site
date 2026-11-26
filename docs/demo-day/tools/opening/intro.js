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
    // photo: from centre-low dull box to the right, becoming the real photo
    const g=seg(t,3.5,4.9);
    const z=t<3.3?0:t<3.55?24*seg(t,3.3,3.55):t<4.9?24:24*(1-seg(t,4.9,5.15));
    const px=lerp(380,660,g),py=lerp(330,110,g),pw=lerp(440,480,g),ph=lerp(200,400,g);
    lift(photo,phSh,px,py,pw,ph,z);
    photo.querySelector('#phimg').style.opacity=seg(t,4.0,4.8);
    // the rest of the page restyles once the photo lands
    const r=seg(t,4.7,5.4);
    hOld.style.opacity=1-r;btn.style.opacity=1-r;nav.style.opacity=1-r;
    hNew.style.opacity=r;navNew.style.opacity=r;
    cards.forEach((c,i)=>{const q=seg(t,4.8+i*.1,5.3+i*.1);c.querySelector('img').style.opacity=q;c.querySelectorAll('.box').forEach((b,j)=>{if(j)b.style.background=q>.5?'#0d0e11':'#d9d6cf'})});
    // the person: walks in from the left edge, grabs the photo, drags it, steps back
    let fx,fy,ph2=0,reach=0;
    if(t<3.4){const w=seg(t,2.2,3.4);fx=lerp(40,px-30,w);fy=lerp(560,py+ph*0.8,w);ph2=(t-2.2)*11}
    else if(t<4.9){fx=px-30;fy=py+ph*0.8;reach=seg(t,3.3,3.5);ph2=t<3.5?0:(t-3.5)*9}
    else{const w=seg(t,5.0,6.2);fx=lerp(px-30,px-150,w);fy=lerp(py+ph*0.8,py+ph+120,w);reach=1-seg(t,4.9,5.1);ph2=w>0&&w<1?(t-5)*10:0}
    placeFig(fx,fy,FLOOR[0]*k,ph2,reach,0);
    figWrap.style.opacity=fsh.style.opacity=seg(t,2.2,2.5);
    // name
    const n=seg(t,5.1,5.9);
    title.innerHTML=`<div class="k">MICROSOFT × NCU AI INNOVATION DEMO DAY</div><div class="h">Sketch2Site</div><div class="s">先畫草稿，再做成網站</div>`;
    title.style.opacity=n;title.style.transform=`translateY(${(1-n)*24}px)`;
  };
});
