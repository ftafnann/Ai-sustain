# 🌍 EcoSphere AI — Climate Intelligence Platform

> AI-powered climate-smart agriculture platform for farmers, institutions, and communities.

## 🚀 Live Demo

Open `index.html` directly in any browser — no server or build step required.

## 📁 Project Structure

```
Ai-sustain/
├── index.html          ← Main app entry point
├── styles/
│   └── main.css        ← Dark neon glassmorphism design system
├── js/
│   └── app.js          ← All logic: weather, maps, ROI, simulation, chatbot
├── connector.md        ← Backend API integration guide (read this first!)
└── README.md
```

## 🔌 Backend Integration

See **[connector.md](./connector.md)** for the complete API specification including:
- All 16 backend endpoints with exact request/response shapes
- Exact line numbers in `js/app.js` where each `fetch()` call lives
- CORS setup for FastAPI and Node.js/Express
- Quick checklist to swap mocks → live backend

## ✨ Features

| Page | Feature |
|------|---------|
| 🏠 Hero | Animated canvas globe, counter animations |
| 🌿 Dashboard | Live weather (Open-Meteo), ROI calculator, AI predictions, sustainability scores |
| 🔬 Simulation | Real-time what-if sliders for crop/water/climate parameters |
| 🚜 Virtual Farm | 4-zone interactive farm grid with AI zone insights |
| 💧 Reservoir | Water level monitoring + 60-day depletion forecast |
| 🤖 AI Advisor | Multilingual chatbot (English / Hindi / Kannada) |
| 🛰️ Satellite Map | Leaflet.js interactive map with NDVI/drought/water layers |
| 🚨 Alerts | Disease, flood, drought, irrigation alerts with SMS/WhatsApp/Push |
| 📊 Analytics | Historical crop yield, water usage, sustainability trend charts |
| 🚀 Roadmap | Future features and brand identity |

## 🌐 External APIs Used (Frontend)

| API | Purpose | Free? |
|-----|---------|-------|
| [Open-Meteo](https://open-meteo.com) | Live weather + 7-day forecast | ✅ Yes, no key |
| [OpenStreetMap Nominatim](https://nominatim.org) | Location geocoding & search | ✅ Yes, no key |
| [Leaflet.js](https://leafletjs.com) | Interactive satellite map | ✅ Yes |
| [Chart.js](https://chartjs.org) | All charts and visualizations | ✅ Yes |

## 🛠️ Tech Stack

- **Frontend:** HTML5 + Vanilla CSS + Vanilla JS
- **Charts:** Chart.js 4.4
- **Maps:** Leaflet.js 1.9.4
- **Fonts:** Google Fonts (Inter + Orbitron)
- **Backend (planned):** Python FastAPI or Node.js Express

## 🏃 Quick Start

```bash
# Clone the repo
git clone https://github.com/ftafnann/Ai-sustain.git
cd Ai-sustain

# Just open the file — no npm install, no build step
start index.html   # Windows
open index.html    # macOS
```

## © License

© 2025 EcoSphere AI · Climate Intelligence Platform
