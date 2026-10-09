# StockRadar v2 — NASUSD.HKT (Hankotrade/ActTrader)

A dark, mobile-friendly, GitHub Pages-compatible **read-only trading analysis dashboard**. This version has working OHLC candlesticks, timeframe aggregation, real calculations, CSV import/export, configurable broker data bridge, and closed-candle browser alerts. It **never places trades**.

## Quick start: GitHub Pages

1. In your `stockradar` GitHub repo, replace the files in the repository root with `index.html`, `style.css`, `app.js`, `indicators.js`, `signals.js`, `data.js`, `chart.js` and `README.md`. **All of these go directly in the repository root**, matching your screenshot. The previous version pointed to non-existent `js/` and `css/` paths.
2. You can optionally upload the `backend/` folder, which is provided for a separate server; GitHub Pages will not run Python backend code.
3. Go to **Settings → Pages** and choose branch `main`, directory `/(root)`. GitHub Pages requires eligible repository visibility/plan.
4. Open the new GitHub Pages URL after the deployment finishes.

### Working immediately (no broker approval needed)

- **Demo** starts automatically with seeded *fictional* price candles. Any demo outputs are explicitly labelled not for trades.
- **Import CSV** takes an OHLC candle export from ActTrader/Hankotrade or another *authorized* source, processes it **locally inside your browser**, and produces technical analysis; it does **not** turn historical data into live prices.
- **Export CSV** saves currently loaded candles.
- **5m/15m/1h/4h/1D buttons** really aggregate 5m candles into larger OHLC bars. If source candles are coarser than the requested timeframe or fewer than 210 closed bars are available, a signal is intentionally withheld.
- Chart candlesticks and 20/50 EMA lines are drawn locally with no external JavaScript CDN dependency. Hover candles for OHLC and timestamps.
- Signals use EMA 20/50/200, RSI 14 (Wilder), MACD 12/26/9, ATR 14 (Wilder), prior-30-candle support/resistance, and an explainable composite **bullishness score**, not an AI prediction.
- Potential trade maps are **illustrative** only. The paper-risk calculator requires a verified dollar-per-point-per-lot contract value from the broker and makes **no** claim about margin, pip units, commissions or slippage.

### Expected CSV format

Exact header: `time,open,high,low,close,volume` (volume optional). Timestamps must be UTC ISO 8601 (`2026-10-08T20:00:00Z`), include a timezone offset (`2026-10-08T16:00:00-04:00`), or be Unix seconds/milliseconds. **Timezone-naive dates are intentionally rejected** so Eastern/UTC mixups don't corrupt signals. One row per unique candle-open timestamp; no other files or metadata are transmitted.

Sample:

```csv
time,open,high,low,close,volume
2026-10-08T20:00:00Z,30800,30820,30790,30810,140
2026-10-08T20:05:00Z,30810,30826,30805,30822,145
```

For complete indicator confirmation, import **at least 210 closed candles at the selected timeframe**. For example, 210 daily candles requires substantially more than 210 five-minute bars.

## Connecting a real broker feed

**Hankotrade-specific API access, exact URLs, credentials, candle history methods, and right to redistribute/display NASUSD.HKT have not been verified.** Public ActTrader Python SDK examples are NOT Hankotrade credentials/endpoints. DO NOT point the bridge to sample `sysfx` hosts, scrape or bypass the broker's access controls, or publish credentials in GitHub.

This project implements a real HTTP interface **once an authorized candle source is available**. The frontend never handles broker secrets. A backend server receives 5m bars from a broker-authorized API, normalizes timestamps, and exposes:

`GET https://YOUR-BRIDGE-DOMAIN/api/candles?symbol=NASUSD.HKT&timeframe=5m&limit=20000`

Response:

```json
{
  "symbol": "NASUSD.HKT",
  "timeframe": "5m",
  "candles": [
    {"time":"2026-10-08T20:00:00Z","open":30800,"high":30820,"low":30790,"close":30810,"volume":140}
  ]
}
```

The frontend **checks the exact symbol and 5m timeframe**, validates candle price ranges, rejects duplicates and unsupported timestamps, polls every 30 seconds, and suppresses notifications when the feed becomes stale **or the backend has not explicitly declared the source authorized**. The bridge sets `feedVerified:false` by default; CSV mode can never be marked verified. Browser alerts require notification permission, HTTPS, an open tab, a recent connected API feed *declared authorized by the backend operator*, and a newly closed-candle actionable signal. The status distinguishes RECENT but UNVERIFIED API data from an operator-declared verified upstream source. Backend declaration is not independent proof of Hankotrade authenticity.

### Optional Python read-only bridge

`backend/server.py` uses only Python standard library. It is a working bridge for CSV data, and provides a documented **normalization proxy** for a future authorized upstream API that already provides the expected JSON format. It does not implement Hankotrade authentication, streaming or tick-to-candle aggregation before the broker documents those features.

To test locally with an exported CSV:

```bash
export STOCKRADAR_SOURCE=csv
export STOCKRADAR_CSV_PATH=/absolute/path/to/candles.csv
export PUBLIC_ORIGIN=http://localhost:8080
python backend/server.py
```

Then serve the frontend (in another terminal):

```bash
python -m http.server 8080
```

Open `http://localhost:8080`, select **Broker API**, enter `http://127.0.0.1:8000/api/candles`, and connect. Note: this is **CSV-backed testing**, not a live broker feed, even if its timestamps are recent. (The UI uses the backend response timestamps for freshness checks.)

For actual live use, deploy the bridge to an HTTPS host and set its CORS `PUBLIC_ORIGIN` to your exact GitHub Pages origin (`https://username.github.io`, without `/stockradar/`). Set `STOCKRADAR_SOURCE=upstream` and `STOCKRADAR_UPSTREAM_CANDLES_URL` to a **broker-authorized normalized candles endpoint**. Set `STOCKRADAR_VERIFIED_BROKER_FEED=yes` **only after** confirming broker authorization and that the feed matches NASUSD.HKT. It is an operator assertion, not automatic validation. Set any bearer token only as a server environment variable. **Do not store these secrets in the frontend.** In practice, Hankotrade's actual API response format may differ; add a broker-specific adapter *after* receiving authorized documentation. A public API endpoint without auth exposes candles to anyone: review data-redistribution rights and protect the backend if required.

## Signal limitations and safeguards

- Runs on **closed candles only** to avoid provisional-candle repainting.
- Not enough bars = `WAIT` and no fabricated indicator confirmation.
- Imported CSV/demo data are explicitly labelled **analysis only**, no push notifications.
- Recent data does not imply a verified market origin. A quote's freshness does not prove its correctness.
- The bias score is a hand-built indicator composite; it is **not** a probabilistic success rate.
- Alerts run *only while the page is open*. GitHub Pages alone cannot send background push notifications or hold private credentials.
- Broker instrument lot value, spread, financing, margin, tick size and server timezone require broker confirmation before treating risk estimates as accurate.
- The site cannot track trades or actual account balance without separate authorized account endpoints.
- Production deployment should consider private feed auth, access control, HTTPS, TLS, monitoring, market-hours awareness, and licensing.

## Developer tests

Run from the project root:

```bash
node tests/test.js
python -m unittest discover -s tests -p 'test_*.py'
```

No orders are sent and no trading endpoints are included.
