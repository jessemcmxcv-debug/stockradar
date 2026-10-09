"use strict";
window.MarketData = (() => {
  const periods = Object.freeze({'1m':60000,'5m':300000,'15m':900000,'1h':3600000,'4h':14400000,'1d':86400000});
  function asTime(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value < 1e11 ? value * 1000 : value;
    const s = String(value ?? '').trim();
    if (!s) return NaN;
    if (/^\d{10}(\.\d+)?$/.test(s)) return Number(s) * 1000;
    if (/^\d{13}$/.test(s)) return Number(s);
    // Require timezone for non-epoch ISO data; never silently assume local timezone.
    if (!(/Z$/i.test(s) || /[+-]\d{2}:?\d{2}$/.test(s))) return NaN;
    return Date.parse(s);
  }
  function validateCandles(items, opts = {}) {
    if (!Array.isArray(items)) throw Error('Expected an array of candles.');
    if (items.length > 100000) throw Error('Maximum 100,000 candles per import.');
    const rows = items.map((c, i) => {
      const time = asTime(c.time ?? c.timestamp ?? c.date), open = Number(c.open), high = Number(c.high), low = Number(c.low), close = Number(c.close);
      if (![time,open,high,low,close].every(Number.isFinite)) throw Error(`Row ${i+1}: invalid timestamp or OHLC. Use ISO time with Z/offset, or Unix seconds/ms.`);
      if (time <= 0 || time > Date.now()+86400000 || low <= 0 || high < low || open < low || open > high || close < low || close > high) throw Error(`Row ${i+1}: inconsistent price range or timestamp.`);
      const v = c.volume === undefined || c.volume === '' || c.volume === null ? null : Number(c.volume);
      if (v !== null && (!Number.isFinite(v) || v < 0)) throw Error(`Row ${i+1}: invalid volume.`);
      return {time,open,high,low,close,volume:v};
    });
    rows.sort((a,b)=>a.time-b.time);
    for (let i=1;i<rows.length;i++) if(rows[i].time === rows[i-1].time) throw Error('Duplicate candle timestamps. Export unique OHLC bars.');
    if (opts.requireLength !== false && rows.length < 2) throw Error('At least two candles required.');
    return rows;
  }
  // Handles quoted fields and escaped quotation marks; no extra libraries.
  function parseCsv(text) {
    const records=[], row=[]; let cell='', quoted=false;
    for (let i=0;i<text.length;i++) {
      const ch=text[i];
      if(ch==='"') { if(quoted && text[i+1]==='"') {cell+='"';i++;} else quoted=!quoted; }
      else if(ch===',' && !quoted){row.push(cell);cell='';}
      else if((ch==='\n'||ch==='\r') && !quoted){ if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))records.push(row.slice());row.length=0;cell=''; }
      else cell+=ch;
    }
    if(quoted) throw Error('CSV has an unclosed quote.');
    row.push(cell);if(row.some(x=>x.trim()))records.push(row);
    if(!records.length)throw Error('CSV is empty.');
    const headers=records.shift().map(x=>x.trim().toLowerCase().replace(/^\ufeff/,''));
    for(const h of ['time','open','high','low','close'])if(!headers.includes(h))throw Error(`Missing CSV column: ${h}. Required: time,open,high,low,close[,volume]`);
    return validateCandles(records.map((r)=>Object.fromEntries(headers.map((h,i)=>[h,(r[i]??'').trim()]))));
  }
  function inferPeriod(candles) {
    const diffs=[];
    for(let i=1;i<Math.min(200,candles.length);i++) if(candles[i].time>candles[i-1].time)diffs.push(candles[i].time-candles[i-1].time);
    if(!diffs.length)return null;
    diffs.sort((a,b)=>a-b);
    const best=diffs[Math.floor(diffs.length*0.1)];
    const valid=Object.values(periods).find(p=>Math.abs(p-best)<p*0.1);
    return valid || null;
  }
  function aggregate(candles, timeframe) {
    const ms=periods[timeframe];
    if(!ms)throw Error('Unsupported timeframe');
    const base=inferPeriod(candles);
    if(base && base>ms) return [];
    const result=[];
    for(const candle of candles){
      const time=Math.floor(candle.time/ms)*ms;
      const last=result.at(-1);
      if(last && last.time===time){last.high=Math.max(last.high,candle.high);last.low=Math.min(last.low,candle.low);last.close=candle.close;if(candle.volume!==null)last.volume=(last.volume??0)+candle.volume;}
      else result.push({...candle,time});
    }
    return result;
  }
  function demoCandles(n=18400){
    const out=[];let seed=614247,c=30860;
    const rnd=()=>{ seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
    const stop=Math.floor(Date.now()/periods['5m'])*periods['5m'];
    for(let i=0;i<n;i++){
      const time=stop-(n-i)*periods['5m'];
      const swing=Math.sin(i/95)*2.4+(rnd()-.5)*17;const next=Math.max(200,c+swing);
      out.push({time,open:c,high:Math.max(c,next)+rnd()*9,low:Math.min(c,next)-rnd()*9,close:next,volume:Math.round(200+rnd()*1500)});c=next;
    }
    return out;
  }
  function downloadCsv(candles){
    const values=['time,open,high,low,close,volume',...candles.map(c=>[new Date(c.time).toISOString(),c.open,c.high,c.low,c.close,c.volume??''].join(','))].join('\n');
    const href=URL.createObjectURL(new Blob([values],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=href;a.download='NASUSD.HKT-candles.csv';a.click();setTimeout(()=>URL.revokeObjectURL(href),1500);
  }
  return {periods,asTime,validateCandles,parseCsv,inferPeriod,aggregate,demoCandles,downloadCsv};
})();
