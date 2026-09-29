# PriceMyTrip

Web app to estimate Indian freight trip costs, built on an explicit
**Fixed + Variable + Margin** model: 21 itemized cost heads (driver/helper
salary, depreciation, insurance, interest, fuel, tolls, maintenance, loading,
overhead, profit, empty return, etc.), each allocated per-trip via a
utilization engine (trip-days, uptime, annual km) and backed by real/proxy/
estimate-sourced truck economics for 101 named truck models across 46
categories.

## Quick start

```bash
npm install
cp .env.example .env.local
# Optional: add OPENROUTESERVICE_API_KEY or GOOGLE_MAPS_API_KEY for live routing
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## UI

Three tabs: **Configuration** (editable fixed/variable inputs, source badges,
include/exclude per cost head, truck-data reference table), **Cost
Breakdown** (calculated result, live-recomputed as Configuration changes),
and **Route Map** (placeholder — see Roadmap).

## Configuration

| File | Purpose |
|------|---------|
| `config/truck-rates.json` | Per-category fixed/variable cost rates (46 categories) |
| `config/truck-models.json` | Named truck models (mileage, price, source labels) |
| `config/fallback-rates.json` | Values when APIs fail |
| `config/cities-cache.json` | City geocodes + spelling suggestions |

See `config/README.md` for how to tune rates with your fleet data.

## API keys (optional)

- **OPENROUTESERVICE_API_KEY** — road distance ([openrouteservice.org](https://openrouteservice.org))

Without keys, distance uses haversine × road factor; tolls use corridor data (Delhi–Mumbai) or ₹/km fallback.

**Diesel price** is fetched live from [The Core India Fuel Watch](https://energy.thecore.in/fuel/prices) (`/api/india-state-prices`, no API key). If that feed is down, `config/fallback-rates.json` is used.

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm test` — Vitest unit tests

## API

`POST /api/newcalculate`

```json
{
  "truckId": "16T_6W",
  "origin": "Delhi",
  "destination": "Mumbai",
  "payloadTons": 16
}
```

## Roadmap

This branch (`p0-zbc-model-refactor`) is a phased rebuild per the PRD at
`docs/superpowers/specs/2026-07-02-zbc-refactor-prd.md`:

- Done — **P0** Fixed+Variable+Margin cost engine rewrite
- Done — **P1** Truck data enrichment (101 named models, real/proxy/estimate sourced)
- Done — **P2** Configuration tab + tabbed UI
- Planned — **P3** Cost Breakdown tab redesign (grouped Fixed/Variable/Margin view, derived metrics)
- Planned — **P4** Route Map tab (TollGuru alternatives, `/api/routes`, Leaflet map, downloads)
- Planned — **P5** Batch parity (tabs + on-demand route alternatives for batch uploads)
- Planned — **P6** Return-load tuning + validation against real trip data

Not merged to `main` until all phases are complete.
