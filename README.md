# AI Trading Radar — GitHub Pages starter

A responsive dashboard starter for the exact symbol **NASUSD.HKT** as shown in ActTrader.

## Important data limitation

**This version does not connect to ActTrader and does not show live NASUSD.HKT prices.** The chart and metrics use randomly generated demonstration data solely to show the interface and exercise the indicator calculations. Do not use demo signals to make trading decisions. The timeframe buttons currently change the selected label; they do not aggregate real candles.

To enable real monitoring, you will need to confirm your broker's authorized API/feed access for this exact symbol and connect a secure backend. Do not put API keys, account credentials, or trading passwords in frontend code or a public GitHub repository.

## Included
- Space/galaxy-style responsive dashboard
- Demo price chart and visible demo-data warnings
- EMA 20/50/200, RSI, MACD and ATR-style volatility calculations
- Transparent illustrative signal score and explanation
- Support/resistance estimates
- Paper position risk calculator

## Deploy
1. Download and unzip this project.
2. Create a GitHub repository and upload the files while preserving the `css` and `js` folders.
3. Open **Settings → Pages**.
4. Select **Deploy from a branch**, choose your main branch and `/ (root)`, then save.
5. Open the GitHub Pages URL shown by GitHub.

Chart.js is loaded from jsDelivr, so the chart needs an internet connection. This is a static frontend; it does not place trades, store a real portfolio, send background alerts, or connect to a broker.

## Before live use
- Verify NASUSD.HKT contract specifications with your ActTrader broker.
- Obtain authorized market-data access and confirm whether data is streaming or delayed.
- Add a secure backend for API credentials and streaming data.
- Test indicator calculations and strategy rules against verified historical data before considering live signals.
