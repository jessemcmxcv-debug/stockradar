"use strict";
window.Indicators = (() => {
  function emaSeries(values, period) {
    const result = Array(values.length).fill(null);
    if (values.length < period) return result;
    const k = 2 / (period + 1);
    let avg = values.slice(0, period).reduce((s, n) => s + n, 0) / period;
    result[period - 1] = avg;
    for (let i = period; i < values.length; i++) {
      avg = values[i] * k + avg * (1 - k);
      result[i] = avg;
    }
    return result;
  }
  function ema(values, period) { return emaSeries(values, period).at(-1) ?? null; }
  function rsi(values, period = 14) {
    if (values.length < period + 1) return null;
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
      const d = values[i] - values[i - 1];
      gains += Math.max(d, 0);
      losses += Math.max(-d, 0);
    }
    let avgG = gains / period, avgL = losses / period;
    for (let i = period + 1; i < values.length; i++) {
      const d = values[i] - values[i - 1];
      avgG = (avgG * (period - 1) + Math.max(d, 0)) / period;
      avgL = (avgL * (period - 1) + Math.max(-d, 0)) / period;
    }
    if (avgL === 0) return avgG === 0 ? 50 : 100;
    return 100 - 100 / (1 + avgG / avgL);
  }
  function macd(values, fast = 12, slow = 26, signalPeriod = 9) {
    if (values.length < slow + signalPeriod - 1) return null;
    const f = emaSeries(values, fast), s = emaSeries(values, slow);
    const line = values.map((_, i) => (f[i] === null || s[i] === null) ? null : f[i] - s[i]);
    const valid = line.filter(v => v !== null);
    const sig = emaSeries(valid, signalPeriod).at(-1);
    const last = line.at(-1);
    return {value: last, signal: sig, hist: last - sig};
  }
  function atr(candles, period = 14) {
    if (candles.length < period + 1) return null;
    const tr = [];
    for (let i = 1; i < candles.length; i++) {
      const prev = candles[i - 1].close, c = candles[i];
      tr.push(Math.max(c.high - c.low, Math.abs(c.high - prev), Math.abs(c.low - prev)));
    }
    let v = tr.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < tr.length; i++) v = (v * (period - 1) + tr[i]) / period;
    return v;
  }
  return {ema, emaSeries, rsi, macd, atr};
})();
