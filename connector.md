# EcoSphere AI — Backend Connector Reference

> **Repo:** https://github.com/ftafnann/Ai-sustain  
> **Frontend:** Pure HTML / CSS / JS (no build step — open `index.html` directly)  
> **Base API URL (replace with your backend):** `http://localhost:8000/api/v1`  
> **Auth:** Bearer token via `Authorization: Bearer <token>` header (add after auth is implemented)

---

## How to Connect

Every section below lists:
- The **current implementation** (what the frontend does today — usually a free public API or mock data)
- The **backend endpoint** the frontend should call instead
- The **exact file + line number** to update
- The **request / response shape** the backend must return

To swap a live API or mock → backend endpoint, search `js/app.js` for the line number and replace the `fetch(url)` call with `fetch(BACKEND_BASE + '/endpoint')`.

```js
// Add this constant at the top of js/app.js  (line 5, after 'use strict')
const BACKEND_BASE = 'http://localhost:8000/api/v1';
```

---

## 1. Location / Geocoding

### 1.1 Autocomplete Suggestions

| Field | Value |
|-------|-------|
| **File** | `js/app.js` |
| **Lines** | 274–304 |
| **Current** | `GET https://nominatim.openstreetmap.org/search?format=json&q=<query>&limit=6` |
| **Replace with** | `GET {BACKEND_BASE}/location/search?q=<query>&limit=6` |

**Frontend call (line 275):**
```js
const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=6&addressdetails=1`;
```
**Change to:**
```js
const url = `${BACKEND_BASE}/location/search?q=${encodeURIComponent(query)}&limit=6`;
```

**Expected response from backend:**
```json
[
  {
    "name": "Mysuru",
    "display_name": "Mysuru, Mysore District, Karnataka, India",
    "lat": "12.3051828",
    "lon": "76.6553609",
    "type": "city",
    "class": "place"
  }
]
```

---

### 1.2 Single Geocode (Enter key / button)

| Field | Value |
|-------|-------|
| **File** | `js/app.js` |
| **Lines** | 374 |
| **Current** | `GET https://nominatim.openstreetmap.org/search?format=json&q=<query>&limit=1` |
| **Replace with** | `GET {BACKEND_BASE}/location/geocode?q=<query>` |

**Frontend call (line 374):**
```js
fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1&accept-language=en`)
```
**Change to:**
```js
fetch(`${BACKEND_BASE}/location/geocode?q=${encodeURIComponent(query)}`)
```

**Expected response:**
```json
{
  "lat": "12.3051828",
  "lon": "76.6553609",
  "display_name": "Mysuru, Karnataka, India"
}
```

---

## 2. Weather Intelligence

### 2.1 Current Weather + 7-Day Forecast

| Field | Value |
|-------|-------|
| **File** | `js/app.js` |
| **Lines** | 474–522 |
| **Function** | `fetchWeather(lat, lon)` |
| **Current** | `GET https://api.open-meteo.com/v1/forecast?latitude=&longitude=&current=...&daily=...` |
| **Replace with** | `GET {BACKEND_BASE}/weather/forecast?lat=<lat>&lon=<lon>` |

**Frontend call (line 476):**
```js
const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=auto&forecast_days=7`;
```
**Change to:**
```js
const url = `${BACKEND_BASE}/weather/forecast?lat=${lat}&lon=${lon}`;
```

**Fields consumed by frontend (lines 482–509):**
```
data.current.temperature_2m          → w-temp    (line 487)
data.current.relative_humidity_2m    → w-hum     (line 488)
data.current.precipitation_probability → w-rain   (line 489)
data.current.wind_speed_10m          → w-wind    (line 490)
data.daily.time[]                    → chart X-axis labels (line 506)
data.daily.temperature_2m_max[]      → temp chart max line (line 507)
data.daily.temperature_2m_min[]      → temp chart min line (line 508)
data.daily.precipitation_sum[]       → rainfall bar chart (line 509)
```

**Backend must return:**
```json
{
  "current": {
    "temperature_2m": 29,
    "relative_humidity_2m": 68,
    "wind_speed_10m": 14,
    "precipitation_probability": 32
  },
  "daily": {
    "time": ["2025-06-01", "2025-06-02", "2025-06-03", "2025-06-04", "2025-06-05", "2025-06-06", "2025-06-07"],
    "temperature_2m_max": [31, 33, 30, 29, 32, 31, 28],
    "temperature_2m_min": [23, 24, 22, 21, 25, 23, 20],
    "precipitation_sum": [0, 2, 8, 15, 3, 0, 1]
  }
}
```

---

## 3. AI Prediction Panel

### 3.1 30-Day Crop / Water / Disease Predictions

| Field | Value |
|-------|-------|
| **File** | `js/app.js` |
| **Lines** | 689–726 |
| **Function** | `initPredictionChart()` |
| **Current** | Pure client-side Math.sin/cos mock data |
| **Replace with** | `GET {BACKEND_BASE}/ai/predictions?lat=<lat>&lon=<lon>&horizon=30` |

**Frontend call to add (replace lines 694–717):**
```js
fetch(`${BACKEND_BASE}/ai/predictions?lat=${state.location.lat}&lon=${state.location.lon}&horizon=30`)
  .then(r => r.json())
  .then(data => {
    // data.labels       → string array ["D1","D2",...]
    // data.yield        → number array (0–100%)
    // data.water        → number array (0–100%)
    // data.disease_risk → number array (0–100%)
    // pass to initPredictionChart(data)
  });
```

**Backend must return:**
```json
{
  "labels": ["D1","D2","D3","...","D30"],
  "yield_confidence": [75, 78, 80, 77, 82, 85, 83, 79, 76, 80, 84, 87, 85, 82, 79, 75, 78, 81, 83, 80, 77, 74, 76, 79, 82, 84, 81, 78, 75, 77],
  "water_forecast":   [60, 62, 65, 58, 55, 60, 63, 66, 64, 61, 58, 62, 65, 67, 64, 60, 57, 60, 63, 65, 62, 59, 61, 64, 66, 63, 60, 57, 59, 61],
  "disease_risk":     [20, 22, 25, 23, 21, 19, 24, 28, 26, 23, 20, 18, 22, 25, 27, 24, 21, 19, 23, 26, 24, 21, 18, 21, 24, 26, 23, 20, 18, 21]
}
```

---

## 4. Sustainability Scores (Circular Gauges)

| Field | Value |
|-------|-------|
| **File** | `js/app.js` |
| **Lines** | 729–750 |
| **Function** | `initCircularProgress()` |
| **Current** | Hardcoded values: water=78, crop=85, sustainability=71, carbon=63 |
| **Replace with** | `GET {BACKEND_BASE}/farm/sustainability?lat=<lat>&lon=<lon>` |

**Hardcoded values (lines 731–734) to replace:**
```js
{ id: 'cp-water-fill',  value: 78, color: '#00aaff' },   // line 731
{ id: 'cp-crop-fill',   value: 85, color: '#00ff88' },   // line 732
{ id: 'cp-sust-fill',   value: 71, color: '#aa00ff' },   // line 733
{ id: 'cp-carbon-fill', value: 63, color: '#ff6600' }    // line 734
```

**Backend must return:**
```json
{
  "water_efficiency": 78,
  "crop_health": 85,
  "sustainability_index": 71,
  "carbon_impact": 63
}
```

---

## 5. ROI Calculator

### 5.1 Calculate ROI

| Field | Value |
|-------|-------|
| **File** | `js/app.js` |
| **Lines** | 752–830 |
| **Function** | `calcROI()` |
| **Current** | Pure client-side formula using `CROP_ROI` lookup table (lines 33–40) |
| **Replace with** | `POST {BACKEND_BASE}/roi/calculate` |

**Frontend inputs sent to backend:**
```
roiPrincipal → document.getElementById('roiPrincipal').value  (line 754)
roiCrop      → document.getElementById('roiCrop').value       (line 755)
roiArea      → document.getElementById('roiArea').value       (line 756)
roiOpt       → document.getElementById('roiOpt').value        (line 757)
roiSeason    → document.getElementById('roiSeason').value     (line 758)
```

**Request body:**
```json
{
  "principal": 100000,
  "crop": "rice",
  "area_ha": 2.0,
  "ai_optimization": "high",
  "season": "kharif",
  "lat": 12.97,
  "lon": 77.59
}
```

**Backend must return:**
```json
{
  "revenue": 192400,
  "profit": 92400,
  "roi_percent": 92,
  "breakeven_months": 3.1,
  "water_savings_inr": 12400,
  "carbon_credits_inr": 8200,
  "ai_note": "With full AI optimization, your Rice farm is projected to yield 15% above district average.",
  "yield_per_ha": 5.2,
  "price_per_ton": 18500
}
```

**Frontend result fields (lines 787–793):**
```
revenue          → #roiRevenue    (line 788)
profit           → #roiProfit     (line 789)
roi_percent      → #roiPercent    (line 790)
breakeven_months → #roiBreakeven  (line 791)
water_savings    → #roiWater      (line 792)
carbon_credits   → #roiCarbon     (line 793)
ai_note          → #roiNote       (line 805-812)
```

---

## 6. Virtual Farm Zones

### 6.1 Zone Data

| Field | Value |
|-------|-------|
| **File** | `js/app.js` |
| **Lines** | 26–31 |
| **Constant** | `ZONE_DATA` |
| **Current** | Hardcoded object for zones A, B, C, D |
| **Replace with** | `GET {BACKEND_BASE}/farm/zones?farm_id=<farm_id>` |

**Current hardcoded structure (lines 27–30):**
```js
A: { name, crop, status, statusClass, moisture, stage, disease, irr, yield, fert, insight }
B: { ... }
C: { ... }
D: { ... }
```

**Backend must return:**
```json
{
  "zones": [
    {
      "id": "A",
      "name": "Zone A — Rice",
      "crop_emoji": "🌾",
      "status": "Healthy",
      "status_class": "status-good",
      "soil_moisture": "72%",
      "crop_stage": "Tillering",
      "disease_risk": "Low (12%)",
      "next_irrigation": "In 2 days",
      "expected_yield": "5.2 t/ha",
      "fertilizer_due": "Tomorrow",
      "ai_insight": "Zone A is performing excellently. Continue current irrigation schedule."
    }
  ]
}
```

**Zone selection handler (lines 856–880, function `selectZone`):**  
The zone detail panel updates these DOM elements:
```
#zd-name     → zone.name          (line 861)
#zd-status   → zone.status        (line 862)
#zd-moisture → zone.soil_moisture (line 864)
#zd-stage    → zone.crop_stage    (line 865)
#zd-disease  → zone.disease_risk  (line 866)
#zd-irr      → zone.next_irrigation (line 867)
#zd-yield    → zone.expected_yield (line 868)
#zd-fert     → zone.fertilizer_due (line 869)
#zd-insight  → zone.ai_insight    (line 870)
```

---

## 7. AI Simulation (What-If)

### 7.1 Run Simulation

| Field | Value |
|-------|-------|
| **File** | `js/app.js` |
| **Lines** | 900–940 (function `runSimulation`) |
| **Current** | Client-side formula using weighted factors |
| **Replace with** | `POST {BACKEND_BASE}/ai/simulate` |

**Request body (all slider values from state.simParams, line 13):**
```json
{
  "rainfall_pct": 65,
  "temperature_c": 28,
  "irrigation_pct": 50,
  "fertilizer_pct": 40,
  "crop": "rice",
  "horizon_days": 30,
  "lat": 12.97,
  "lon": 77.59
}
```

**Backend must return:**
```json
{
  "crop_health_pct": 82,
  "yield_t_ha": 4.6,
  "water_depletion_pct": 18,
  "carbon_impact_t": 2.4,
  "economic_impact_k_inr": 42,
  "recommendations": [
    "✅ Current parameters are within optimal range for rice cultivation.",
    "💧 Drip irrigation recommended to reduce water depletion by 25%."
  ],
  "chart": {
    "labels": ["Day 1", "Day 4", "Day 7", "Day 10", "Day 13", "Day 16", "Day 19", "Day 22", "Day 25", "Day 28"],
    "crop_health": [78, 79, 80, 82, 83, 84, 83, 82, 81, 82],
    "yield_projection": [3.2, 3.5, 3.8, 4.0, 4.2, 4.4, 4.5, 4.6, 4.6, 4.6],
    "water_reserve": [100, 90, 80, 72, 65, 58, 52, 47, 43, 40]
  }
}
```

**Frontend result DOM elements (lines 908–916):**
```
#sim-r-health   → crop_health_pct       (line 908)
#sim-r-yield    → yield_t_ha            (line 909)
#sim-r-water    → water_depletion_pct   (line 910)
#sim-r-carbon   → carbon_impact_t       (line 911)
#sim-r-econ     → economic_impact_k_inr (line 912)
#simRecommendations → recommendations[] (line 914)
```

---

## 8. Reservoir System

### 8.1 Reservoir Status + 60-Day Forecast

| Field | Value |
|-------|-------|
| **File** | `js/app.js` |
| **Lines** | 978–1006 (function `initReservoir`) |
| **Current** | Client-side mock: level starting at 74%, declining 1.2%/day with random noise |
| **Replace with** | `GET {BACKEND_BASE}/reservoir/status?lat=<lat>&lon=<lon>` |

**Backend must return:**
```json
{
  "current_level_pct": 74,
  "current_volume_m3": 148000,
  "daily_usage_m3": 3900,
  "depletion_days": 38,
  "forecast": {
    "labels": ["Day 1","Day 7","Day 13","Day 19","Day 25","Day 31","Day 37","Day 43","Day 49","Day 55"],
    "level_pct": [74, 65, 57, 49, 41, 34, 27, 21, 15, 10]
  },
  "critical_threshold_pct": 25,
  "emergency_threshold_pct": 10
}
```

---

## 9. AI Advisor Chatbot

### 9.1 Send Message

| Field | Value |
|-------|-------|
| **File** | `js/app.js` |
| **Lines** | 1030–1070 (functions `sendChat`, `generateAIResponse`) |
| **Current** | Client-side keyword matching against `CHAT_RESPONSES` dictionary (lines 44–74) |
| **Replace with** | `POST {BACKEND_BASE}/ai/chat` |

**Frontend sends (function `sendChat`, line 1038):**
```json
{
  "message": "What crops should I grow this season?",
  "language": "en",
  "lat": 12.97,
  "lon": 77.59,
  "context": {
    "current_page": "advisor",
    "selected_zone": "A",
    "season": "kharif"
  }
}
```

**Backend must return:**
```json
{
  "response": "For this season, based on your soil profile...",
  "language": "en",
  "confidence": 0.92,
  "sources": ["weather_data", "soil_database", "crop_model"]
}
```

**Typing indicator (lines 1047–1062):** already handled client-side — just call the API and hide the indicator in the `.then()`.

---

## 10. Satellite / Map Intelligence

### 10.1 Farm Zone Overlays (NDVI / Drought / Water / Climate)

| Field | Value |
|-------|-------|
| **File** | `js/app.js` |
| **Lines** | 1120–1185 (functions `initMap`, `refreshMapMarkers`) |
| **Current** | Static mock zones at fixed lat/lon offsets (`dlat ± 0.05–0.08`) |
| **Replace with** | `GET {BACKEND_BASE}/satellite/zones?lat=<lat>&lon=<lon>&layer=<ndvi|drought|water|climate>` |

**Backend must return:**
```json
{
  "layer": "ndvi",
  "zones": [
    {
      "lat": 12.97,
      "lon": 77.59,
      "radius_m": 2000,
      "color": "#00ff88",
      "label": "Zone A — High NDVI",
      "value": 0.72,
      "status": "Healthy"
    }
  ],
  "center_marker": {
    "lat": 12.9716,
    "lon": 77.5946,
    "label": "Bengaluru, Karnataka"
  }
}
```

### 10.2 NDVI Chart Data

| Field | Value |
|-------|-------|
| **File** | `js/app.js` |
| **Lines** | ~1190–1230 (function `initNDVIChart`) |
| **Current** | Static mock monthly NDVI trend |
| **Replace with** | `GET {BACKEND_BASE}/satellite/ndvi-trend?lat=<lat>&lon=<lon>&months=12` |

**Backend must return:**
```json
{
  "labels": ["Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May"],
  "zone_a": [0.65, 0.70, 0.75, 0.72, 0.68, 0.60, 0.52, 0.48, 0.55, 0.62, 0.68, 0.72],
  "zone_b": [0.40, 0.45, 0.50, 0.48, 0.43, 0.35, 0.28, 0.25, 0.30, 0.38, 0.43, 0.47],
  "zone_c": [0.20, 0.22, 0.25, 0.23, 0.20, 0.15, 0.12, 0.10, 0.13, 0.18, 0.22, 0.24]
}
```

---

## 11. Analytics (Admin Panel)

### 11.1 Analytics Data

| Field | Value |
|-------|-------|
| **File** | `js/app.js` |
| **Lines** | ~1240–1310 (function `initAnalytics`) |
| **Current** | All mock data inline |
| **Replace with** | `GET {BACKEND_BASE}/analytics/summary?lat=<lat>&lon=<lon>` |

**Backend must return:**
```json
{
  "kpi": {
    "avg_yield_t_ha": 4.8,
    "water_saved_pct": 22,
    "carbon_reduction_pct": 15,
    "ai_accuracy_pct": 94,
    "farmer_profit_inr": 168000,
    "platform_health_pct": 98
  },
  "yield_history": {
    "labels": ["2020","2021","2022","2023","2024","2025"],
    "ai_yield":          [3.8, 4.0, 4.3, 4.5, 4.7, 4.9],
    "traditional_yield": [2.8, 2.9, 3.0, 3.1, 3.2, 3.3]
  },
  "water_history": {
    "labels": ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
    "usage_mm":    [30, 25, 40, 55, 65, 80, 75, 60, 45, 35, 28, 25],
    "rainfall_mm": [10,  8, 15, 25, 40, 85, 90, 70, 50, 30, 15, 10]
  },
  "sustainability_trend": {
    "labels": ["Q1 2024","Q2 2024","Q3 2024","Q4 2024","Q1 2025","Q2 2025"],
    "scores": [58, 62, 65, 68, 71, 75]
  },
  "ai_confidence_radar": {
    "dimensions": ["Yield","Weather","Disease","Water","Carbon","Soil"],
    "scores":     [91, 88, 85, 92, 78, 83]
  }
}
```

---

## 12. Alert System

### 12.1 Fetch Active Alerts

| Field | Value |
|-------|-------|
| **File** | `js/app.js` + `index.html` |
| **Lines** | Alert cards are static HTML in `index.html` lines ~540–570 |
| **Current** | Hardcoded HTML cards |
| **Replace with** | `GET {BACKEND_BASE}/alerts?lat=<lat>&lon=<lon>` |

**Backend must return:**
```json
{
  "alerts": [
    {
      "id": "alert_001",
      "type": "danger",
      "icon": "🦠",
      "title": "Disease Outbreak — Zone D",
      "description": "Brown leaf spot detected. Apply fungicide within 48 hours.",
      "ai_confidence": 94,
      "action": "Apply Carbendazim 50WP @ 1g/L"
    },
    {
      "id": "alert_002",
      "type": "warning",
      "icon": "🌊",
      "title": "Flood Risk — Upstream",
      "description": "Heavy rainfall forecast. Check drainage systems.",
      "ai_confidence": 87,
      "action": "Open drainage channels in Zone B"
    }
  ]
}
```

### 12.2 Send Notification (SMS / WhatsApp / Push)

| Field | Value |
|-------|-------|
| **File** | `index.html` |
| **Lines** | Alert channel toggles ~lines 570–610 |
| **Replace with** | `POST {BACKEND_BASE}/notifications/send` |

**Request body:**
```json
{
  "channel": "whatsapp",
  "phone": "+919876543210",
  "message": "⚠ EcoSphere AI Alert: Disease risk HIGH in Zone D. Apply fungicide within 48h.",
  "alert_id": "alert_001"
}
```

---

## 13. Periodic Toast Alerts (Polling)

| Field | Value |
|-------|-------|
| **File** | `js/app.js` |
| **Lines** | 1335–1360 (function `startPeriodicAlerts`, constant `PERIODIC_ALERTS`) |
| **Current** | Client-side array, shown every 30 seconds |
| **Replace with** | `GET {BACKEND_BASE}/alerts/live?lat=<lat>&lon=<lon>` (poll every 60s) |

**Backend must return:**
```json
{
  "alerts": [
    {
      "title": "🦠 Disease Alert",
      "message": "Brown leaf spot risk elevated in Zone D. Confidence: 94%",
      "type": "danger"
    }
  ]
}
```

---

## Summary — All Endpoints

| # | Method | Path | Used For | App.js Lines |
|---|--------|------|----------|-------------|
| 1 | GET | `/location/search?q=&limit=` | Autocomplete suggestions | 275 |
| 2 | GET | `/location/geocode?q=` | Single location resolve | 374 |
| 3 | GET | `/weather/forecast?lat=&lon=` | Live weather + 7-day chart | 476 |
| 4 | GET | `/ai/predictions?lat=&lon=&horizon=` | 30-day AI forecast chart | 694 |
| 5 | GET | `/farm/sustainability?lat=&lon=` | 4 circular gauge scores | 731 |
| 6 | POST | `/roi/calculate` | ROI calculator results | 752 |
| 7 | GET | `/farm/zones?farm_id=` | Virtual farm zone data | 26–31 |
| 8 | POST | `/ai/simulate` | What-if simulation | 900 |
| 9 | GET | `/reservoir/status?lat=&lon=` | Reservoir level + forecast | 978 |
| 10 | POST | `/ai/chat` | AI advisor chatbot | 1038 |
| 11 | GET | `/satellite/zones?lat=&lon=&layer=` | Map overlays | 1120 |
| 12 | GET | `/satellite/ndvi-trend?lat=&lon=&months=` | NDVI history chart | 1190 |
| 13 | GET | `/analytics/summary?lat=&lon=` | Admin analytics page | 1240 |
| 14 | GET | `/alerts?lat=&lon=` | Alert cards | HTML ~540 |
| 15 | POST | `/notifications/send` | SMS/WhatsApp/Push | HTML ~590 |
| 16 | GET | `/alerts/live?lat=&lon=` | Periodic toast notifications | 1335 |

---

## CORS Configuration

The backend **must** allow these origins:
```
Access-Control-Allow-Origin: *        (dev)
Access-Control-Allow-Origin: https://github.com/ftafnann/Ai-sustain  (prod)
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

For **FastAPI** (Python):
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # change in prod
    allow_methods=["*"],
    allow_headers=["*"],
)
```

For **Node.js / Express**:
```js
const cors = require('cors');
app.use(cors()); // dev
```

---

## Quick Integration Checklist

- [ ] Add `const BACKEND_BASE = 'http://localhost:8000/api/v1';` at line 5 of `js/app.js`
- [ ] Replace `fetchWeather` call (line 476) → `/weather/forecast`
- [ ] Replace geocode calls (lines 275, 374) → `/location/search`, `/location/geocode`
- [ ] Replace `calcROI` formula (line 752) → `POST /roi/calculate`
- [ ] Replace `ZONE_DATA` object (lines 26–31) → `GET /farm/zones`
- [ ] Replace `runSimulation` formula (line 900) → `POST /ai/simulate`
- [ ] Replace `initReservoir` mock (line 978) → `GET /reservoir/status`
- [ ] Replace `generateAIResponse` (line 1060) → `POST /ai/chat`
- [ ] Replace `initAnalytics` mock (line 1240) → `GET /analytics/summary`
- [ ] Add auth header to all calls after auth flow is implemented
- [ ] Set CORS headers on backend to allow frontend origin
