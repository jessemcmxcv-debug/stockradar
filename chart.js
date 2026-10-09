"use strict";
window.CandleChart = (() => {
  let canvas,tip,lastCandles=[],hitboxes=[],zoom=100;
  const fmt=n=>Number(n).toLocaleString('en-US',{maximumFractionDigits:2,minimumFractionDigits:2});
  function init(element,tooltip){canvas=element;tip=tooltip;window.addEventListener('resize',()=>draw(lastCandles));canvas.addEventListener('mousemove',move);canvas.addEventListener('mouseleave',()=>{tip.hidden=true;});}
  function move(event){
    const r=canvas.getBoundingClientRect(),x=event.clientX-r.left,hit=hitboxes.reduce((best,v)=>Math.abs(v.x-x)<Math.abs((best?.x??Infinity)-x)?v:best,null);
    if(!hit||Math.abs(hit.x-x)>18){tip.hidden=true;return;}
    const c=hit.c;tip.hidden=false;
    tip.textContent=`${new Date(c.time).toLocaleString()}  O ${fmt(c.open)}  H ${fmt(c.high)}  L ${fmt(c.low)}  C ${fmt(c.close)}`;
    tip.style.left=Math.max(8,Math.min(x-110, r.width-270))+'px';tip.style.top='14px';
  }
  function draw(candles) {
    lastCandles=candles;
    if(!canvas)return;
    const rect=canvas.getBoundingClientRect(),width=Math.max(250,rect.width),height=Math.max(200,rect.height),dpr=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.floor(width*dpr);canvas.height=Math.floor(height*dpr);
    const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);ctx.clearRect(0,0,width,height);
    const left=20,right=75,top=24,bottom=35,plotW=width-left-right,plotH=height-top-bottom;
    hitboxes=[];
    if(!candles.length){ctx.fillStyle='#95a3c3';ctx.font='14px system-ui';ctx.textAlign='center';ctx.fillText('No candles available for this timeframe',width/2,height/2);return;}
    const sample=candles.slice(-Math.min(zoom,candles.length)),values=sample.flatMap(c=>[c.low,c.high]);
    let low=Math.min(...values),high=Math.max(...values),pad=Math.max((high-low)*.1,0.1);low-=pad;high+=pad;
    const y=v=>top+(high-v)/(high-low)*plotH;
    const slot=plotW/sample.length;
    ctx.font='11px system-ui';ctx.strokeStyle='#1d2a44';ctx.lineWidth=1;ctx.textAlign='right';ctx.fillStyle='#7b8aaf';
    for(let i=0;i<=5;i++){const p=top+plotH*i/5,value=high-(high-low)*i/5;ctx.beginPath();ctx.moveTo(left,p);ctx.lineTo(width-right+8,p);ctx.stroke();ctx.fillText(fmt(value),width-5,p+4);}
    const labelCount=Math.max(2,Math.floor(plotW/(width<600?92:120)));const labelStep=Math.max(1,Math.ceil(sample.length/labelCount));ctx.textAlign='center';
    sample.forEach((c,i)=>{if(i%labelStep!==0&&i!==sample.length-1)return;const x=left+(i+.5)*slot;ctx.fillStyle='#7180a4';ctx.fillText(new Date(c.time).toLocaleString([],(width<600?{hour:'2-digit',minute:'2-digit'}:{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})),x,height-10);});
    sample.forEach((c,i)=>{
      const x=left+(i+.5)*slot,green=c.close>=c.open;ctx.strokeStyle=green?'#48d6a3':'#ff6688';ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=1.1;
      ctx.beginPath();ctx.moveTo(x,y(c.high));ctx.lineTo(x,y(c.low));ctx.stroke();
      const oy=y(c.open),cy=y(c.close),bodyH=Math.max(Math.abs(cy-oy),1.3);
      ctx.fillRect(x-Math.min(Math.max(slot*.58,1.5),13)/2,Math.min(oy,cy),Math.min(Math.max(slot*.58,1.5),13),bodyH);
      hitboxes.push({x,c});
    });
    const full=candles.map(c=>c.close);
    for(const [period,color] of [[20,'#8d86ff'],[50,'#ffce76']]) {
      const ema=Indicators.emaSeries(full,period).slice(-sample.length);ctx.strokeStyle=color;ctx.lineWidth=1.6;ctx.beginPath();let started=false;
      ema.forEach((v,i)=>{if(v===null)return;const x=left+(i+.5)*slot;if(!started){ctx.moveTo(x,y(v));started=true;}else ctx.lineTo(x,y(v));});ctx.stroke();
    }
  }
  return {init,draw};
})();
