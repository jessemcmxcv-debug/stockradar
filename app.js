"use strict";
(() => {
  const $=id=>document.getElementById(id), fmt=n=>n===null||n===undefined||!Number.isFinite(n)?'—':Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  const local={getItem(key){try{return window.localStorage.getItem(key)}catch{return null}},setItem(key,value){try{window.localStorage.setItem(key,value)}catch{}}};
  const state={source:'demo',base:MarketData.demoCandles(),tf:'5m',timer:null,lastAlertKey:null,logged:[],apiUrl:local.getItem('stockradar.apiUrl')||'',apiConnected:false,feedVerified:false,requestId:0};
  const symbol='NASUSD.HKT';
  $('apiUrl').value=state.apiUrl;
  CandleChart.init($('priceChart'),$('chartTooltip'));
  function warn(message){$('notice').textContent=message;}
  function setMode(source){
    state.source=source;state.apiConnected=false;state.feedVerified=false;state.requestId++;
    if(state.timer)clearInterval(state.timer);state.timer=null;state.lastAlertKey=null;
    for(const id of ['demoBtn','csvBtn','apiBtn'])$(id).classList.toggle('active',id===(source==='demo'?'demoBtn':source==='csv'?'csvBtn':'apiBtn'));
    $('apiSettings').hidden=source!=='api';
  }
  function getTimeframeData(tf){return MarketData.aggregate(state.base,tf);}
  function dataFresh(){
    if(state.source!=='api'||!state.apiConnected||!state.base.length)return false;
    const period=MarketData.inferPeriod(state.base)||300000;
    const latest=state.base.at(-1).time;
    return Date.now()-latest<Math.max(period*3,900000)&&latest<=Date.now();
  }
  function displayInfo(){
    const d=state.base, last=d.at(-1),freq=MarketData.inferPeriod(d);
    const label=Object.keys(MarketData.periods).find(k=>MarketData.periods[k]===freq)||'unknown interval';
    $('candleInfo').textContent=`${d.length.toLocaleString()} base candles · ${label} · ${last?new Date(last.time).toLocaleString():'no bars'}`;
    $('lastUpdate').textContent=state.source==='api'?(state.apiConnected?`Checked ${new Date().toLocaleTimeString()}`:'Disconnected'):state.source==='csv'?'Local data':'Offline demo';
    $('statusDot').classList.toggle('ok',dataFresh());
    $('statusDot').classList.toggle('dead',state.source==='api'&&!dataFresh());
    $('modeBadge').textContent=state.source==='demo'?'DEMO DATA':state.source==='csv'?'CSV DATA':!state.apiConnected?'API DISCONNECTED':!state.feedVerified?'API UNVERIFIED':dataFresh()?'VERIFIED SOURCE*':'STALE API DATA';
    $('sourceDetails').textContent=state.source==='api'?'Broker bridge · authorization must be verified':state.source==='csv'?'Imported local file · no data sent anywhere':'Seeded simulation · not actual NASUSD.HKT';
    $('freshness').textContent=state.source==='demo'?'SIMULATED':state.source==='csv'?'IMPORTED / HISTORICAL':dataFresh()?(state.feedVerified?'RECENT · DECLARED VERIFIED':'RECENT · UNVERIFIED'):'STALE OR OFFLINE';
  }
  function update(){
    displayInfo();const period=MarketData.periods[state.tf];const all=getTimeframeData(state.tf);
    // Only fully closed bars contribute to signals; the current unfinished candle cannot repaint a signal.
    const closed=all.filter(c=>c.time+period<=Date.now());
    const a=SignalEngine.analyze(closed);const latest=all.at(-1),prev=all.at(-2);
    $('tfLabel').textContent=state.tf;
    $('price').textContent=fmt(latest?.close);
    $('priceTime').textContent=latest?`Candle ${new Date(latest.time).toLocaleString()}`:'No quote timestamp';
    const change=latest&&prev?(latest.close-prev.close)/prev.close*100:null;
    $('change').textContent=change===null?'—':`${change>=0?'+':''}${change.toFixed(2)}% vs previous bar`;
    $('change').className=change>=0?'positive':'negative';
    $('chartSubtitle').textContent=`${all.length.toLocaleString()} ${state.tf} OHLC bars · 20 / 50 EMA · ${state.source.toUpperCase()}`;
    CandleChart.draw(all);
    for(const [tf,id] of [['5m','mtf5m'],['15m','mtf15m'],['1h','mtf1h'],['4h','mtf4h'],['1d','mtf1d']]){
      const rows=getTimeframeData(tf).filter(c=>c.time+MarketData.periods[tf]<=Date.now());
      const result=SignalEngine.analyze(rows);
      $(id).textContent=result.ready?`${result.trend} · ${result.score}/100`:'INSUFFICIENT HISTORY';
      $(id).className=result.ready?(result.trend==='BULLISH'?'positive':result.trend==='BEARISH'?'negative':''):'muted';
    }
    if(!a.ready){
      $('signal').textContent='WAIT';$('signalReason').textContent='Not enough closed bars';$('score').textContent='—';
      for(const id of ['trend','rsi','macd','volatility','ema20','ema50','ema200','support','resistance','entry','stop','target','rr'])$(id).textContent='—';
      $('regime').textContent='NO SIGNAL';$('setupBadge').textContent='NO SIGNAL';$('explanation').textContent=a.reason+' Import longer time series or choose a smaller timeframe.';
      $('checks').replaceChildren();return;
    }
    const actionable=state.source==='api'&&dataFresh()&&state.feedVerified,signal=actionable?a.signal:`${a.signal} (ANALYSIS ONLY)`;
    $('signal').textContent=signal;$('signal').className=a.signal==='POTENTIAL BUY'?'positive':a.signal==='POTENTIAL SELL'?'negative':'';
    $('signalReason').textContent=actionable?'Closed-bar technical setup':'Source not live/verified for trading';
    $('score').textContent=a.score+'/100';$('trend').textContent=a.trend;
    $('rsi').textContent=a.rsi.toFixed(1);$('macd').textContent=a.macd.hist>=0?'BULLISH':'BEARISH';$('volatility').textContent=fmt(a.atr);
    for(const key of ['ema20','ema50','ema200','support','resistance','entry','stop','target'])$(key).textContent=fmt(a[key]);
    $('rr').textContent=a.rr.toFixed(1)+':1';$('regime').textContent=a.trend;$('setupBadge').textContent=a.signal;
    $('explanation').textContent=`${a.signal} based on ${closed.length} CLOSED ${state.tf} bars. Bullishness score: ${a.score}/100. EMA trend ${a.trend.toLowerCase()}, RSI ${a.rsi.toFixed(1)}, MACD histogram ${fmt(a.macd.hist)}. Support/resistance use the previous 30 bars. ${actionable?'API data appears recent, but broker authorization, instrument equivalence, and pricing must be checked before using this information.':'This source is demo, imported, disconnected or stale; do not act on the signal.'}`;
    const checks=$('checks');checks.replaceChildren();
    for(const c of a.checks){const el=document.createElement('span');el.className=`check ${c.direction>0?'good':c.direction<0?'bad':'neutral'}`;el.textContent=`${c.direction>0?'▲':c.direction<0?'▼':'•'} ${c.title}`;checks.append(el);}
    if(actionable&&a.signal!=='WAIT')recordEvent(a,closed.at(-1).time);
  }
  function recordEvent(a,time){
    const key=`${time}/${a.signal}`;if(state.lastAlertKey===key)return;state.lastAlertKey=key;
    const item=`${new Date(time).toLocaleString()} · ${a.signal} · ${a.score}/100 · ${fmt(a.price)} (${state.tf})`;
    state.logged.unshift(item);state.logged=state.logged.slice(0,30);renderLog();
    if(Notification.permission==='granted'&&local.getItem('stockradar.alerts')==='yes'){
      // Notification only while the webpage is open and JavaScript is running.
      new Notification(`StockRadar: ${a.signal}`,{body:`${symbol} · ${state.tf} · score ${a.score}/100 · API feed (verify source)`});
    }
  }
  function renderLog(){const node=$('eventLog');node.replaceChildren();if(!state.logged.length){node.textContent='No signal changes recorded.';return;}for(const event of state.logged){const row=document.createElement('div');row.textContent=event;node.appendChild(row);}}
  async function loadApi(){
    if(state.source!=='api')return;
    const apiUrl=$('apiUrl').value.trim();
    let url;
    try { url=new URL(apiUrl); if(url.protocol!=='https:' && !(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw Error('Use HTTPS, except localhost testing.'); }
    catch(e){warn(`INVALID BRIDGE URL · ${e.message}`);return;}
    state.apiUrl=apiUrl;local.setItem('stockradar.apiUrl',apiUrl);
    const request=++state.requestId;
    try{
      const address=new URL(url.href);address.searchParams.set('symbol',symbol);address.searchParams.set('timeframe','5m');address.searchParams.set('limit','20000');
      const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
      let response;
      try{response=await fetch(address,{headers:{'Accept':'application/json'},cache:'no-store',signal:controller.signal,credentials:'omit'});}finally{clearTimeout(timeout);}
      if(request!==state.requestId)return;
      if(!response.ok)throw Error(`HTTP ${response.status}`);
      const body=await response.json();
      if(body.symbol!==symbol)throw Error(`Wrong instrument (${body.symbol??'missing'}). Expected ${symbol}.`);
      if(body.timeframe!=='5m')throw Error('Bridge must return 5m candles, not another timeframe.');
      const rows=MarketData.validateCandles(body.candles);
      const basePeriod=MarketData.inferPeriod(rows);
      if(basePeriod!==300000)throw Error('5m candle spacing cannot be verified.');
      state.base=rows;state.apiConnected=true;state.feedVerified=body.feedVerified===true&&body.source==='upstream';
      warn(`API DATA · ${rows.length.toLocaleString()} broker-bridge candles received. Validate Hankotrade origin, bid/ask conventions, time zone and data licensing. ${dataFresh()?'Freshness check passed.':'Latest bar is stale; alerts disabled.'} ${state.feedVerified?'Source DECLARED authorized by backend operator; verify independently.':'Source NOT VERIFIED; signal alerts disabled.'}`);
      update();
    }catch(e){if(request!==state.requestId)return;state.apiConnected=false;state.feedVerified=false;warn(`API ERROR · ${e.message}. Data not updated, alerts disabled.`);update();}
  }
  $('demoBtn').addEventListener('click',()=>{setMode('demo');state.base=MarketData.demoCandles();warn('DEMO ONLY · Generated candles. Not live NASUSD.HKT and never suitable for trading.');update();});
  $('csvBtn').addEventListener('click',()=>$('csvFile').click());
  $('csvFile').addEventListener('change',async e=>{
    const file=e.target.files?.[0];if(!file)return;
    try{
      if(file.size>15e6)throw Error('Maximum CSV size is 15 MB.');
      const rows=MarketData.parseCsv(await file.text());const period=MarketData.inferPeriod(rows);
      if(!period)throw Error('Could not detect 1m/5m/15m/1h/4h/1d candle interval.');
      setMode('csv');state.base=rows;
      warn(`CSV IMPORTED · ${rows.length.toLocaleString()} candles from ${file.name}. Data is historical or manually provided; no live price feed and no browser trading alerts.`);
      update();
    }catch(err){warn(`CSV ERROR · ${err.message}`);}finally{e.target.value='';}
  });
  $('apiBtn').addEventListener('click',()=>{setMode('api');state.base=[];warn('API NOT CONNECTED · Enter your authorized read-only backend URL, then click Connect. No secret tokens in the browser.');update();});
  $('connectBtn').addEventListener('click',async()=>{if(state.timer)clearInterval(state.timer);await loadApi();if(state.source==='api'&&state.apiConnected)state.timer=setInterval(loadApi,30000);});
  $('disconnectBtn').addEventListener('click',()=>{setMode('api');state.base=[];warn('API DISCONNECTED · No live feed or alerts.');update();});
  $('exportBtn').addEventListener('click',()=>{if(state.base.length)MarketData.downloadCsv(state.base);});
  $('alertsBtn').addEventListener('click',async()=>{
    if(!('Notification'in window)){warn('Your browser does not support desktop notifications.');return;}
    if(!window.isSecureContext){warn('Notifications require HTTPS or localhost.');return;}
    if(Notification.permission==='denied'){warn('Notifications are blocked in your browser settings.');return;}
    const permission=await Notification.requestPermission();
    if(permission==='granted'){const enabled=local.getItem('stockradar.alerts')!=='yes';local.setItem('stockradar.alerts',enabled?'yes':'no');$('alertsBtn').textContent=enabled?'Disable browser alerts':'Enable browser alerts';warn(`Browser alerts ${enabled?'enabled':'disabled'}. They require this tab open, a recent API feed explicitly marked broker-authorized by its operator, and a newly closed-candle setup.`);}
  });
  $('clearLogBtn').addEventListener('click',()=>{state.logged=[];renderLog();});
  $('riskForm').addEventListener('submit',e=>{
    e.preventDefault();const account=Number($('balance').value),riskPct=Number($('riskPct').value),value=Number($('pointValue').value);
    const a=SignalEngine.analyze(getTimeframeData(state.tf).filter(c=>c.time+MarketData.periods[state.tf]<=Date.now()));
    if(!a.ready){$('positionResult').textContent='Not enough closed candle data for a stop-distance estimate.';return;}
    if(!(account>0&&riskPct>0&&riskPct<=5&&value>0)){$('positionResult').textContent='Check balance, risk (0–5%) and broker-confirmed $ per point per lot.';return;}
    const budget=account*riskPct/100,lotRisk=a.stopDistance*value,lots=budget/lotRisk;
    $('positionResult').textContent=`Risk budget: $${fmt(budget)}. Stop distance: ${fmt(a.stopDistance)} points. Estimated ${fmt(lots)} lots before spread, fees and slippage. Confirm contract size, lot increments, leverage and margin with Hankotrade. PAPER ONLY.`;
  });
  document.querySelectorAll('#timeframes button').forEach(btn=>btn.addEventListener('click',()=>{
    state.tf=btn.dataset.tf;document.querySelectorAll('#timeframes button').forEach(el=>el.classList.toggle('active',el===btn));update();
  }));
  if(local.getItem('stockradar.alerts')==='yes')$('alertsBtn').textContent='Disable browser alerts';
  setInterval(()=>{if(state.source==='api')update();},60000);
  update();
})();
