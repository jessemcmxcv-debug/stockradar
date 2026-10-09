"use strict";
window.SignalEngine = (() => {
  function analyze(candles) {
    if (!Array.isArray(candles) || candles.length < 210) return {ready: false, reason: `Need 210 candles for the full indicator set; received ${candles?.length ?? 0}.`};
    const closes = candles.map(c => c.close), price = closes.at(-1);
    const ema20 = Indicators.ema(closes, 20), ema50 = Indicators.ema(closes, 50), ema200 = Indicators.ema(closes, 200);
    const rsi = Indicators.rsi(closes), macd = Indicators.macd(closes), atr = Indicators.atr(candles);
    const checks = [];
    let score = 50;
    const check = (title, direction, weight) => { score += direction * weight; checks.push({title, direction}); };
    check(`Price ${price > ema20 ? 'above' : 'below'} EMA 20`, price > ema20 ? 1 : -1, 10);
    check(`Price ${price > ema50 ? 'above' : 'below'} EMA 50`, price > ema50 ? 1 : -1, 10);
    check(`Price ${price > ema200 ? 'above' : 'below'} EMA 200`, price > ema200 ? 1 : -1, 8);
    check(`EMA 20 ${ema20 > ema50 ? 'above' : 'below'} EMA 50`, ema20 > ema50 ? 1 : -1, 8);
    check(`MACD histogram ${macd.hist >= 0 ? 'positive' : 'negative'}`, macd.hist >= 0 ? 1 : -1, 9);
    // Overbought / oversold are warnings, not automatic reversals.
    check(`RSI ${rsi.toFixed(1)} (${rsi >= 70 ? 'overbought' : rsi <= 30 ? 'oversold' : 'neutral zone'})`, rsi > 55 ? 1 : rsi < 45 ? -1 : 0, 5);
    score = Math.min(100, Math.max(0, Math.round(score)));
    const trend = ema20 > ema50 && price > ema50 ? 'BULLISH' : ema20 < ema50 && price < ema50 ? 'BEARISH' : 'MIXED';
    let signal = 'WAIT';
    if (score >= 75 && rsi < 75 && trend === 'BULLISH') signal = 'POTENTIAL BUY';
    if (score <= 25 && rsi > 25 && trend === 'BEARISH') signal = 'POTENTIAL SELL';
    const previous = candles.slice(-31, -1);
    const support = Math.min(...previous.map(c => c.low)), resistance = Math.max(...previous.map(c => c.high));
    const direction = signal === 'POTENTIAL SELL' ? -1 : 1;
    const entry = price;
    // Stop uses BOTH ATR and previous swing level, with a minimum distance.
    const volatilityStop = entry - direction * 1.5 * atr;
    const structureStop = direction > 0 ? support : resistance;
    const stop = direction > 0 ? Math.min(volatilityStop, structureStop) : Math.max(volatilityStop, structureStop);
    const stopDistance = Math.abs(entry - stop);
    const target = entry + direction * 2 * stopDistance;
    return {ready: true, price, ema20, ema50, ema200, rsi, macd, atr, score, trend, signal, support, resistance, entry, stop, target, rr: 2, checks, stopDistance};
  }
  return {analyze};
})();
