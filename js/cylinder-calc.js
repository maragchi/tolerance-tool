/* 直线气缸选型计算 —— 由 /cylinder/ calcWizard 原样搬出的基础数据与计算（无 DOM）。
 * /cylinder/ 与首页仪表盘共用同一份，改数值/公式只改这里。 */
const STD_BORES=[8,10,12,16,20,25,32,40,50,63,80,100,125,160,200,250,320];
const ROD={8:4,10:4,12:6,16:6,20:8,25:10,32:12,40:16,50:20,63:20,80:25,100:30,125:32,160:40,200:40,250:50,320:63};
const STD_STROKES=[25,50,75,100,125,150,160,175,200,250,300,350,400,450,500,600,700,800,900,1000,1100,1200,1250,1400,1500];
const P0=0.1013, G=9.81;
/* o: {dir:'h'|'hp'|'vu'|'vd'|'vdp', m, mu, f0, P, eta, stroke, bite}
 * state: zero=负载为 0 / ok=余量≥10% / low=0~10% / bad=出力不足
 * buck: safe / risk / nostroke / noload / tension（杆受压时按欧拉公式，两端铰支，E=206000MPa，n=4） */
function cylCore(o){
  const wDir=o.dir, m=o.m, mu=o.mu, f0=o.f0, P=o.P, stroke=o.stroke, bite=o.bite;
  let F;
  if(wDir==='h'||wDir==='hp'){F=mu*m*G+f0;}
  else{F=m*G+f0;}
  const eta=o.eta;
  const Ft=eta>0?F/eta:0;
  // 计算缸径：推力侧 / 拉力侧（杆径比≈0.35估算）
  let D0;
  if(wDir==='hp'||wDir==='vd'){D0=Math.sqrt(4*Ft/(Math.PI*P*(1-0.35*0.35)));}
  else{D0=Math.sqrt(4*Ft/(Math.PI*P));}
  // 选标准缸径
  let D=STD_BORES.find(b=>b>=D0)||STD_BORES[STD_BORES.length-1];
  const rod=ROD[D];
  const push=P*Math.PI*D*D/4, pull=P*Math.PI*(D*D-rod*rod)/4;
  const usable=(wDir==='hp'||wDir==='vd')?pull*eta:push*eta;
  const margin=F>0?(usable/F-1)*100:Infinity;
  // 标准行程
  const need=stroke+bite;
  const sRec=STD_STROKES.find(s=>s>=need)||'>1250（定做）';
  const state=margin===Infinity?'zero':margin>=10?'ok':margin>=0?'low':'bad';
  const isCompress=(wDir==='h'||wDir==='vu'||wDir==='vdp');
  let buck='tension', Pcr=null, safe=null;
  if(isCompress&&stroke>0&&rod>0&&F>0){
    const Im=Math.PI*Math.pow(rod,4)/64;
    Pcr=Math.PI*Math.PI*206000*Im/(stroke*stroke);
    safe=Pcr/4;
    buck=safe>=F?'safe':'risk';
  }else if(isCompress&&stroke<=0){buck='nostroke';}
  else if(isCompress&&F<=0){buck='noload';}
  return {F:F,eta:eta,Ft:Ft,D0:D0,D:D,rod:rod,push:push,pull:pull,margin:margin,need:need,sRec:sRec,state:state,buck:buck,Pcr:Pcr,safe:safe};
}
