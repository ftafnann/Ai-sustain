/* =============================================
   ECOSPHERE AI — MAIN APPLICATION SCRIPT
   ============================================= */

'use strict';

// ─── API KEYS ────────────────────────────────
const OWM_API_KEY  = '8b9ffe9df56803eec5bb89004b819126';
const OWM_BASE     = 'https://api.openweathermap.org/data/2.5';

// ─── BACKEND CONFIG ───────────────────────
const BACKEND_BASE = 'http://localhost:3001/api';

// Unique session ID per browser tab (persisted in sessionStorage)
const SESSION_ID = (() => {
  let sid = sessionStorage.getItem('eco_session');
  if (!sid) { sid = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8); sessionStorage.setItem('eco_session', sid); }
  return sid;
})();

// Silent backend POST helper — never blocks UI on backend failure
async function postToBackend(endpoint, data) {
  try {
    await fetch(`${BACKEND_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: SESSION_ID, ...data })
    });
  } catch (e) { /* backend offline — silent fail, UI still works */ }
}

// ─── STATE ───────────────────────────────────
const state = {
  currentPage: 'hero',
  currentLang: 'en',
  location: null,
  charts: {},
  simParams: { rain: 65, temp: 28, irr: 50, fert: 40, crop: 'rice', horizon: 30 },
  selectedZone: 'A',
  mapLayer: 'ndvi',
  map: null,
  roiChart: null
};

// ─── MOCK DATA ────────────────────────────────
const mockWeather = {
  temp: 29, humidity: 68, rain: 32, wind: 14,
  drought: 'Medium', flood: 'Low'
};

const ZONE_DATA = {
  A: { name: 'Zone A — Rice', crop: '🌾', status: 'Healthy', statusClass: 'status-good', moisture: '72%', stage: 'Tillering', disease: 'Low (12%)', irr: 'In 2 days', yield: '5.2 t/ha', fert: 'Tomorrow', insight: 'Zone A is performing excellently. Soil nutrients are balanced. Continue current irrigation schedule for optimal yield.' },
  B: { name: 'Zone B — Maize', crop: '🌽', status: 'Moderate Stress', statusClass: 'status-moderate', moisture: '48%', stage: 'Vegetative', disease: 'Moderate (28%)', irr: 'Today', yield: '3.8 t/ha', fert: 'In 3 days', insight: 'Zone B shows early moisture stress. Increase irrigation by 20% for next 3 days. Watch for fall armyworm signs.' },
  C: { name: 'Zone C — Vegetables', crop: '🌿', status: 'Healthy', statusClass: 'status-good', moisture: '65%', stage: 'Fruiting', disease: 'Low (9%)', irr: 'In 1 day', yield: '12.4 t/ha', fert: 'In 2 days', insight: 'Zone C vegetables are in excellent shape. High humidity may increase fungal risk — monitor closely.' },
  D: { name: 'Zone D — Sunflower', crop: '🌻', status: 'Critical Stress', statusClass: 'status-poor', moisture: '28%', stage: 'Flowering', disease: 'High (52%)', irr: 'IMMEDIATE', yield: '1.9 t/ha', fert: 'Overdue', insight: '⚠ CRITICAL: Zone D sunflower needs emergency irrigation NOW. Moisture at 28% — critical stress threshold. Disease risk very high.' }
};

const CROP_ROI = {
  rice:       { multiplier: 1.68, yieldPerHa: 5.2, price: 18500 },
  wheat:      { multiplier: 1.55, yieldPerHa: 4.8, price: 21500 },
  sugarcane:  { multiplier: 1.90, yieldPerHa: 65,  price: 3200 },
  cotton:     { multiplier: 1.72, yieldPerHa: 2.1, price: 65000 },
  maize:      { multiplier: 1.45, yieldPerHa: 6.2, price: 17500 },
  groundnut:  { multiplier: 1.58, yieldPerHa: 3.5, price: 47000 }
};

const AI_OPT_FACTOR = { high: 1.0, medium: 0.80, none: 0.55 };

const CHAT_RESPONSES = {
  en: {
    default: [
      "Based on current satellite data and soil analytics, I recommend monitoring soil moisture levels daily this week. AI predictions show 72% probability of rainfall in 5 days — delay irrigation by 3 days to conserve water resources.",
      "Your farm's sustainability score is 71/100. To improve: (1) Switch to drip irrigation in Zone D, (2) Apply vermicompost in Zone B, (3) Implement crop rotation after harvest.",
      "Current AI analysis shows your region has a 23% disease risk probability — primarily brown leaf spot. Recommended action: Spray Trifloxystrobin at 0.5ml/L within 48 hours.",
      "Based on 10-year climate patterns for your location, I recommend planting BPT-5204 rice variety this season. Expected yield: 5.8 t/ha with 18% better drought tolerance than traditional varieties.",
      "Your water consumption forecast shows 285mm needed this season. With AI-optimized irrigation, you can save up to 22% (63mm) which translates to approximately ₹8,400 in water costs saved."
    ],
    crop: "For this season, based on your soil profile and weather forecast, I recommend: 🌾 Rice (BPT-5204) for wet zones, 🌽 Maize (NK 6240) for upland areas, and 🫘 Black gram for fallow land to improve soil nitrogen. Expected combined income: ₹2.4 lakhs/hectare.",
    irrigation: "Optimal irrigation schedule: Zone A — 45mm every 4 days, Zone B — 55mm every 3 days (stress), Zone C — 30mm every 5 days, Zone D — Emergency: 80mm immediately. Total water budget: 285mm/season. Drip irrigation recommended for 22% savings.",
    disease: "Current disease risk analysis: 🦠 Brown Leaf Spot (Zone D) — HIGH risk 52% | Bacterial Blight (Zone B) — MODERATE 28% | Sheath Blight (Zone A) — LOW 12%. Apply preventive spray of Copper Oxychloride 50WP @ 3g/L across all zones within 24 hours.",
    sustainability: "Your Sustainability Index is 71/100. Top actions to improve: (1) Zero-tillage farming: +8 pts, (2) Organic composting: +5 pts, (3) Solar irrigation pump: +6 pts, (4) Crop diversification: +4 pts. Achieving 85+ qualifies you for carbon credit registration worth ₹12,000/season.",
    rainfall: "30-day rainfall forecast for your location: Week 1: 12mm (low), Week 2: 28mm (moderate), Week 3: 45mm (good), Week 4: 8mm (low). Total forecast: 93mm. This is 42mm below the seasonal normal — supplemental irrigation planning is essential.",
    carbon: "Carbon credit opportunity detected! Your farm can earn credits through: (1) Zero-tillage: 1.8 t CO₂/ha, (2) Cover crops: 0.9 t CO₂/ha, (3) Agroforestry: 2.1 t CO₂/ha. Total potential: 4.8 t CO₂/ha × ₹2,000/t = ₹9,600/hectare annually. Register at ecosphere.ai/carbon-credits."
  },
  hi: {
    default: [
      "वर्तमान उपग्रह डेटा के अनुसार, इस सप्ताह मिट्टी की नमी की दैनिक निगरानी की सिफारिश की जाती है। AI पूर्वानुमान 5 दिनों में 72% वर्षा संभावना दिखाता है — पानी बचाने के लिए सिंचाई को 3 दिन तक स्थगित करें।",
      "आपके खेत का स्थिरता स्कोर 71/100 है। सुधार के लिए: (1) जोन D में ड्रिप सिंचाई, (2) जोन B में वर्मीकम्पोस्ट, (3) फसल चक्र।",
      "AI विश्लेषण 23% रोग जोखिम दिखाता है — मुख्यतः भूरे पत्ती धब्बे। अनुशंसित: 48 घंटों में 0.5ml/L पर ट्राइफ्लोक्सीस्ट्रोबिन का छिड़काव।"
    ]
  },
  kn: {
    default: [
      "ಪ್ರಸ್ತುತ ಉಪಗ್ರಹ ದತ್ತಾಂಶದ ಪ್ರಕಾರ, ಈ ವಾರ ಪ್ರತಿದಿನ ಮಣ್ಣಿನ ತೇವಾಂಶ ಮೇಲ್ವಿಚಾರಣೆ ಮಾಡಲು ಶಿಫಾರಸು ಮಾಡಲಾಗಿದೆ. AI ಮುನ್ಸೂಚನೆ 5 ದಿನಗಳಲ್ಲಿ 72% ಮಳೆಯ ಸಂಭಾವ್ಯತೆ ತೋರಿಸುತ್ತದೆ.",
      "ನಿಮ್ಮ ಜಮೀನಿನ ಸ್ಥಿರತೆ ಸ್ಕೋರ್ 71/100 ಆಗಿದೆ. ಸುಧಾರಣೆಗಾಗಿ: (1) ಜೋನ್ D ನಲ್ಲಿ ಡ್ರಿಪ್ ಸಿಂಚನ, (2) ಜೋನ್ B ನಲ್ಲಿ ವರ್ಮಿಕಂಪೋಸ್ಟ್.",
      "AI ವಿಶ್ಲೇಷಣೆ 23% ರೋಗ ಅಪಾಯ ತೋರಿಸುತ್ತದೆ. ಶಿಫಾರಸು: 48 ಗಂಟೆಗಳಲ್ಲಿ ಟ್ರೈಫ್ಲಾಕ್ಸಿಸ್ಟ್ರೋಬಿನ್ ಸಿಂಪಡಿಸಿ."
    ]
  }
};

// ─── PAGE NAVIGATION ─────────────────────────
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  const page = document.getElementById('page-' + pageId);
  if (page) page.classList.add('active');

  const link = document.querySelector(`.nav-link[data-page="${pageId}"]`);
  if (link) link.classList.add('active');

  state.currentPage = pageId;

  // Lazy init page-specific stuff
  setTimeout(() => {
    if (pageId === 'dashboard')  initDashboard();
    if (pageId === 'simulation') initSimulation();
    if (pageId === 'reservoir')  initReservoir();
    if (pageId === 'analytics')  initAnalytics();
    if (pageId === 'satellite')  initMap();
    if (pageId === 'satellite')  initNDVIChart();
    if (pageId === 'advisor')    loadHermsHistory();
  }, 100);

  // Close mobile nav
  document.getElementById('navLinks').classList.remove('open');

  // Scroll to top
  window.scrollTo(0, 0);
}

// Attach nav link listeners (backup — onclick on elements is primary)
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      showPage(link.dataset.page);
    });
  });
});

function toggleNav() {
  document.getElementById('navLinks').classList.toggle('open');
}

// ─── HERO CANVAS ANIMATION ─────────────────
function initHeroCanvas() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const particles = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 2 + 0.5,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    alpha: Math.random() * 0.6 + 0.2,
    color: Math.random() > 0.5 ? '0,255,136' : '0,170,255'
  }));

  // Globe points
  const globePoints = [];
  for (let lat = -80; lat <= 80; lat += 20) {
    for (let lon = 0; lon < 360; lon += 20) {
      globePoints.push({ lat, lon });
    }
  }

  let angle = 0;

  function drawGlobe(cx, cy, r) {
    ctx.save();
    ctx.translate(cx, cy);

    // Draw globe arcs
    ctx.strokeStyle = 'rgba(0,255,136,0.12)';
    ctx.lineWidth = 0.5;

    // Latitude lines
    for (let lat = -60; lat <= 60; lat += 30) {
      const y = r * Math.sin(lat * Math.PI / 180);
      const rx = r * Math.cos(lat * Math.PI / 180);
      ctx.beginPath();
      ctx.ellipse(0, y, rx, rx * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Longitude lines
    for (let lon = 0; lon < 180; lon += 30) {
      const a = (lon + angle) * Math.PI / 180;
      ctx.beginPath();
      ctx.ellipse(r * Math.cos(a) * 0.3, 0, r * 0.3 * Math.abs(Math.sin(a)), r, Math.PI / 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Glow core
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0,   'rgba(0,255,136,0.08)');
    g.addColorStop(0.5, 'rgba(0,170,255,0.04)');
    g.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Outer ring glow
    ctx.strokeStyle = 'rgba(0,255,136,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Particles
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color},${p.alpha})`;
      ctx.fill();
    });

    // Connection lines between nearby particles
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 80) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0,255,136,${0.08 * (1 - dist/80)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    // Draw globe
    const cx = canvas.width / 2;
    const cy = canvas.height * 0.5;
    const globeR = Math.min(canvas.width, canvas.height) * 0.28;
    drawGlobe(cx, cy, globeR);

    angle += 0.3;
    requestAnimationFrame(animate);
  }

  animate();
}

// ─── STAT COUNTER ANIMATION ──────────────────
function animateCounters() {
  document.querySelectorAll('.stat-num').forEach(el => {
    const target = parseInt(el.dataset.target);
    let current = 0;
    const step = target / 60;
    const timer = setInterval(() => {
      current += step;
      if (current >= target) { current = target; clearInterval(timer); }
      el.textContent = Math.round(current).toLocaleString();
    }, 20);
  });
}

// ─── LOCATION SEARCH SYSTEM ──────────────────
let suggestTimer = null;
let pendingSuggestions = {};   // keyed by containerId

function searchLocationSuggestions(query, containerId) {
  clearTimeout(suggestTimer);
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!query || query.length < 2) {
    container.innerHTML = '';
    return;
  }

  // Show loading state
  container.innerHTML = `<div class="loc-suggestion-item"><span class="loc-sug-icon">⏳</span><div><div class="loc-sug-main">Searching...</div></div></div>`;

  suggestTimer = setTimeout(() => {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=6&addressdetails=1&accept-language=en`;

    fetch(url, { headers: { 'Accept-Language': 'en' } })
      .then(r => r.json())
      .then(results => {
        if (!results.length) {
          container.innerHTML = `<div class="loc-suggestion-item"><span class="loc-sug-icon">🚫</span><div><div class="loc-sug-main">No results found</div><div class="loc-sug-sub">Try a different city or district name</div></div></div>`;
          return;
        }

        container.innerHTML = results.map(r => {
          const name = r.name || r.display_name.split(',')[0];
          const sub  = r.display_name.split(',').slice(1, 3).join(',').trim();
          const type = r.type || r.class || 'place';
          const icon = getLocationIcon(type, r.class);
          return `
            <div class="loc-suggestion-item" onclick="selectLocation('${escapeAttr(r.display_name)}', ${r.lat}, ${r.lon}, '${containerId}')">
              <span class="loc-sug-icon">${icon}</span>
              <div>
                <div class="loc-sug-main">${name}</div>
                <div class="loc-sug-sub">${sub}</div>
              </div>
            </div>
          `;
        }).join('');
      })
      .catch(() => {
        container.innerHTML = `<div class="loc-suggestion-item"><span class="loc-sug-icon">❌</span><div><div class="loc-sug-main">Search failed</div><div class="loc-sug-sub">Check your internet connection</div></div></div>`;
      });
  }, 350);
}

function getLocationIcon(type, cls) {
  if (cls === 'boundary' || type === 'administrative') return '🏛️';
  if (type === 'city' || type === 'town') return '🏙️';
  if (type === 'village' || type === 'hamlet') return '🏘️';
  if (cls === 'natural' || type === 'water') return '🌊';
  if (type === 'district' || type === 'county') return '📍';
  return '📍';
}

function escapeAttr(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function selectLocation(displayName, lat, lon, containerId) {
  state.location = { lat: parseFloat(lat), lon: parseFloat(lon), name: displayName };

  // Update inputs
  const shortName = displayName.split(',').slice(0, 2).join(',').trim();
  const modalInput = document.getElementById('locationModalInput');
  const navInput   = document.getElementById('navLocationInput');
  if (modalInput) modalInput.value = shortName;
  if (navInput)   navInput.value   = shortName;

  // Clear suggestions
  ['modalSuggestions', 'navSuggestions'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '';
  });

  // If coming from modal, apply immediately
  if (containerId === 'modalSuggestions') {
    applyLocation(parseFloat(lat), parseFloat(lon), shortName);
  } else {
    // From nav — just update, re-fetch weather
    applyLocation(parseFloat(lat), parseFloat(lon), shortName);
  }
}

function applyLocationFromModal() {
  const input = document.getElementById('locationModalInput');
  const query = input?.value?.trim();
  if (!query) { input?.focus(); return; }

  // Check if user just typed without selecting a suggestion
  // Try to geocode the typed text directly
  geocodeAndApply(query);
}

function applyLocationFromNav() {
  const input = document.getElementById('navLocationInput');
  const query = input?.value?.trim();
  if (!query) return;
  geocodeAndApply(query);
}

function showNavSuggestions() {
  const input = document.getElementById('navLocationInput');
  if (input?.value?.length >= 2) {
    searchLocationSuggestions(input.value, 'navSuggestions');
  }
}

function geocodeAndApply(query) {
  // Show loading on modal button
  const btn = document.querySelector('.loc-modal-btn');
  if (btn) { btn.textContent = '⏳ Locating...'; btn.disabled = true; }

  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1&accept-language=en`)
    .then(r => r.json())
    .then(results => {
      if (btn) { btn.textContent = '🚀 Load My Region'; btn.disabled = false; }
      if (!results.length) {
        showToast('Location Not Found', `Could not find "${query}". Try a more specific name.`, 'warning');
        return;
      }
      const r = results[0];
      const shortName = r.display_name.split(',').slice(0, 2).join(',').trim();
      applyLocation(parseFloat(r.lat), parseFloat(r.lon), shortName);
    })
    .catch(() => {
      if (btn) { btn.textContent = '🚀 Load My Region'; btn.disabled = false; }
      showToast('Network Error', 'Unable to search location. Please check connection.', 'danger');
    });
}

function applyLocation(lat, lon, displayName, source = 'search') {
  state.location = { lat, lon, name: displayName };

  // Update nav input
  const navInput = document.getElementById('navLocationInput');
  if (navInput) navInput.value = displayName;

  // Update status bar
  const statusLoc = document.getElementById('statusLocation');
  if (statusLoc) statusLoc.textContent = '📍 ' + displayName;

  // Update dashboard sub-title
  const sub = document.getElementById('dashLocationSub');
  if (sub) sub.textContent = `📍 ${displayName} — Live weather data`;

  // Close modal
  const modal = document.getElementById('locationModal');
  if (modal) modal.classList.add('hidden');

  // Show loading screen while fetching
  const ls = document.getElementById('loadingScreen');
  const lt = document.getElementById('loaderText');
  if (ls) { ls.classList.remove('hidden-init'); ls.classList.add('showing'); }
  if (lt) lt.textContent = `Loading weather for ${displayName}...`;

  // 📤 Store location change in MongoDB (every change = new entry)
  postToBackend('/location', { displayName, lat, lon, source });

  // Fetch real weather
  fetchWeather(lat, lon);

  // Re-init map with new location
  if (state.map) {
    state.map.setView([lat, lon], 10);
    refreshMapMarkers(lat, lon, displayName);
  } else {
    mapInitialized = false;
  }

  showToast('📍 Location Set', `Now showing data for: ${displayName}`, 'success');
}

function refreshMapMarkers(lat, lon, name) {
  const map = state.map;
  if (!map) return;
  // Clear existing layers except tile
  map.eachLayer(layer => {
    if (!(layer instanceof L.TileLayer)) map.removeLayer(layer);
  });
  map.setView([lat, lon], 10);

  // Add new zones around user location
  const zones = [
    { dlat:  0.05, dlon: -0.05, color: '#00ff88', label: 'Zone A — High NDVI',  ndvi: 0.72 },
    { dlat: -0.04, dlon:  0.06, color: '#ffcc00', label: 'Zone B — Moderate',   ndvi: 0.41 },
    { dlat:  0.08, dlon:  0.08, color: '#ff4455', label: 'Zone C — Drought',    ndvi: 0.18 },
    { dlat: -0.08, dlon: -0.06, color: '#00aaff', label: 'Zone D — Wetland',    ndvi: 0.55 }
  ];

  zones.forEach(z => {
    L.circle([lat + z.dlat, lon + z.dlon], {
      radius: 2000, color: z.color, fillColor: z.color, fillOpacity: 0.25, weight: 2
    }).addTo(map).bindPopup(`
      <b>${z.label}</b><br>
      NDVI: <b>${z.ndvi}</b><br>
      Status: ${z.ndvi > 0.5 ? '✅ Healthy' : z.ndvi > 0.3 ? '⚠ Moderate' : '🔴 Stressed'}
    `);
    L.circleMarker([lat + z.dlat, lon + z.dlon], { radius: 6, color: z.color, fillColor: z.color, fillOpacity: 1 })
      .addTo(map).bindTooltip(z.label, { permanent: false });
  });

  L.marker([lat, lon]).addTo(map)
    .bindPopup(`<b>📍 ${name}</b><br>Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}<br>Monitoring Active ✅`)
    .openPopup();
}

// Close suggestions when clicking outside
document.addEventListener('click', e => {
  if (!e.target.closest('.nav-location-search')) {
    const ns = document.getElementById('navSuggestions');
    if (ns) ns.innerHTML = '';
  }
});

// ─── AUTO DETECT LOCATION ────────────────────
function autoDetectLocation() {
  const btn    = document.getElementById('gpsBtn');
  const status = document.getElementById('gpsStatus');

  if (!navigator.geolocation) {
    status.textContent = '❌ Geolocation not supported by your browser.';
    status.className = 'gps-status error';
    return;
  }

  // Update UI
  btn.disabled    = true;
  btn.innerHTML   = '<span class="gps-pulse"></span> ⏳ Detecting location...';
  status.textContent = '📡 Requesting GPS access...';
  status.className   = 'gps-status detecting';

  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude: lat, longitude: lon, accuracy } = pos.coords;
      status.textContent = `✅ Location found! (±${Math.round(accuracy)}m accuracy)`;
      status.className   = 'gps-status success';
      btn.innerHTML      = '<span class="gps-pulse"></span> 📡 Auto-Detect My Location';
      btn.disabled       = false;

      // Reverse geocode with Nominatim
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=en`)
        .then(r => r.json())
        .then(data => {
          const addr = data.address;
          const city  = addr.city || addr.town || addr.village || addr.suburb || addr.county || 'Your Location';
          const state2 = addr.state || '';
          const name  = `${city}${state2 ? ', ' + state2 : ''}`;
          applyLocation(lat, lon, name);
        })
        .catch(() => applyLocation(lat, lon, `${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`));
    },
    err => {
      btn.disabled    = false;
      btn.innerHTML   = '<span class="gps-pulse"></span> 📡 Auto-Detect My Location';
      const msgs = {
        1: '🔒 Location access denied. Please allow location or enter manually.',
        2: '📡 Position unavailable. Try entering your location manually.',
        3: '⏱ Location request timed out. Try again or enter manually.'
      };
      status.textContent = msgs[err.code] || '❌ Could not detect location.';
      status.className   = 'gps-status error';
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

function fetchWeather(lat, lon) {
  // ── Current weather via OpenWeatherMap
  const currentUrl  = `${OWM_BASE}/weather?lat=${lat}&lon=${lon}&appid=${OWM_API_KEY}&units=metric`;
  const forecastUrl = `${OWM_BASE}/forecast?lat=${lat}&lon=${lon}&appid=${OWM_API_KEY}&units=metric&cnt=56`;
  const uvUrl       = `${OWM_BASE}/uvi?lat=${lat}&lon=${lon}&appid=${OWM_API_KEY}`;
  const airUrl      = `${OWM_BASE}/air_pollution?lat=${lat}&lon=${lon}&appid=${OWM_API_KEY}`;

  Promise.all([
    fetch(currentUrl).then(r => r.json()),
    fetch(forecastUrl).then(r => r.json()),
    fetch(uvUrl).then(r => r.json()).catch(() => ({ value: null })),
    fetch(airUrl).then(r => r.json()).catch(() => ({ list: [] }))
  ])
  .then(([current, forecast, uv, air]) => {
    // ── Extract current conditions
    const temp     = Math.round(current.main.temp);
    const feelsLike= Math.round(current.main.feels_like);
    const hum      = current.main.humidity;
    const wind     = Math.round(current.wind.speed * 3.6); // m/s → km/h
    const pressure = current.main.pressure;
    const clouds   = current.clouds.all;
    const rain1h   = current.rain ? current.rain['1h'] || 0 : 0;
    const rainProb = Math.min(Math.round((clouds * 0.5) + (hum > 80 ? 20 : 0) + (rain1h > 0 ? 30 : 0)), 100);
    const desc     = current.weather[0]?.description || '';
    const uvVal    = uv.value !== undefined ? uv.value : null;
    const aqi      = air.list?.[0]?.main?.aqi || null; // 1=Good … 5=Very Poor

    // ── Update weather cards
    document.getElementById('w-temp').textContent  = `${temp}°C`;
    document.getElementById('w-hum').textContent   = `${hum}%`;
    document.getElementById('w-rain').textContent  = `${rainProb}%`;
    document.getElementById('w-wind').textContent  = `${wind} km/h`;

    // ── Risk calculation using real data
    const droughtRisk = (temp > 38 || hum < 25) ? 'High' : (temp > 32 || hum < 45) ? 'Medium' : 'Low';
    const floodRisk   = (rainProb > 75 || rain1h > 5) ? 'High' : (rainProb > 45 || rain1h > 1) ? 'Medium' : 'Low';

    const dEl = document.getElementById('w-drought');
    const fEl = document.getElementById('w-flood');
    if (dEl) { dEl.textContent = droughtRisk; dEl.className = 'weather-value ' + (droughtRisk === 'High' ? 'risk-high' : droughtRisk === 'Medium' ? 'risk-medium' : 'risk-low'); }
    if (fEl) { fEl.textContent = floodRisk;   fEl.className = 'weather-value ' + (floodRisk   === 'High' ? 'risk-high' : floodRisk   === 'Medium' ? 'risk-medium' : 'risk-low'); }

    // ── Process 7-day forecast from 3h slots → daily aggregates
    const dailyMap = {};
    forecast.list.forEach(slot => {
      const day = slot.dt_txt.split(' ')[0];
      if (!dailyMap[day]) dailyMap[day] = { maxT: -99, minT: 99, rainSum: 0, count: 0 };
      dailyMap[day].maxT    = Math.max(dailyMap[day].maxT, slot.main.temp_max);
      dailyMap[day].minT    = Math.min(dailyMap[day].minT, slot.main.temp_min);
      dailyMap[day].rainSum += (slot.rain ? slot.rain['3h'] || 0 : 0);
      dailyMap[day].count++;
    });
    const days     = Object.keys(dailyMap).slice(0, 7);
    const maxTemps = days.map(d => Math.round(dailyMap[d].maxT));
    const minTemps = days.map(d => Math.round(dailyMap[d].minT));
    const rains    = days.map(d => Math.round(dailyMap[d].rainSum * 10) / 10);
    const labels   = days.map(d => new Date(d).toLocaleDateString('en-IN', { weekday: 'short' }));

    initWeatherCharts(labels, maxTemps, minTemps, rains);

    // ── Run crop intelligence with real data
    computeCropIntelligence({
      temp, feelsLike, hum, wind, pressure, clouds,
      rain1h, rainProb, droughtRisk, floodRisk,
      desc, uvVal, aqi,
      forecast7: { days: labels, maxTemps, minTemps, rains }
    });

    // ── Store for other modules
    state.weather = { temp, hum, wind, rainProb, pressure, desc, uvVal, aqi, droughtRisk, floodRisk };

    // 📤 Store weather in MongoDB
    postToBackend('/weather', {
      location: state.location?.name || '',
      lat:      state.location?.lat,
      lon:      state.location?.lon,
      current:  { temp, feelsLike, humidity: hum, wind, pressure, rainProb, description: desc, uvVal, aqi },
      risks:    { droughtRisk, floodRisk },
      forecast7: { days: labels, maxTemps, minTemps, rains }
    });

    // ── Hide loader
    const ls = document.getElementById('loadingScreen');
    if (ls) { ls.classList.add('hidden'); ls.classList.remove('showing'); }

    showToast('🌤 Weather Updated', `${temp}°C · ${hum}% humidity · ${desc}`, 'success', 3500);
  })
  .catch(() => {
    setDefaultWeather();
    const ls = document.getElementById('loadingScreen');
    if (ls) { ls.classList.add('hidden'); ls.classList.remove('showing'); }
    showToast('⚠ Weather Error', 'Using offline defaults. Check your connection.', 'warning');
  });
}

// ─── CROP INTELLIGENCE ENGINE (OpenWeatherMap-driven) ────
function computeCropIntelligence(w) {
  const { temp, hum, wind, rainProb, droughtRisk, floodRisk, uvVal, aqi, desc } = w;

  // ── Suitability scoring per crop (temp range, humidity, rain need)
  const cropProfiles = [
    { name: 'Rice',       emoji: '🌾', tempMin: 22, tempMax: 35, humMin: 70, rainNeed: 'High',   suitable: temp >= 22 && temp <= 35 && hum >= 65 },
    { name: 'Wheat',      emoji: '🌿', tempMin: 10, tempMax: 25, humMin: 50, rainNeed: 'Medium', suitable: temp >= 10 && temp <= 25 && hum >= 45 },
    { name: 'Maize',      emoji: '🌽', tempMin: 18, tempMax: 32, humMin: 50, rainNeed: 'Medium', suitable: temp >= 18 && temp <= 32 },
    { name: 'Sugarcane',  emoji: '🍬', tempMin: 20, tempMax: 38, humMin: 60, rainNeed: 'High',   suitable: temp >= 20 && temp <= 38 && hum >= 55 },
    { name: 'Cotton',     emoji: '☁️', tempMin: 25, tempMax: 40, humMin: 40, rainNeed: 'Low',    suitable: temp >= 25 && hum < 75 },
    { name: 'Groundnut',  emoji: '🥜', tempMin: 22, tempMax: 33, humMin: 45, rainNeed: 'Medium', suitable: temp >= 22 && temp <= 33 },
    { name: 'Soybean',    emoji: '🫘', tempMin: 20, tempMax: 30, humMin: 60, rainNeed: 'Medium', suitable: temp >= 20 && temp <= 30 && hum >= 55 },
    { name: 'Tomato',     emoji: '🍅', tempMin: 18, tempMax: 29, humMin: 50, rainNeed: 'Medium', suitable: temp >= 18 && temp <= 29 },
    { name: 'Onion',      emoji: '🧅', tempMin: 13, tempMax: 28, humMin: 40, rainNeed: 'Low',    suitable: temp >= 13 && temp <= 28 },
    { name: 'Banana',     emoji: '🍌', tempMin: 24, tempMax: 38, humMin: 75, rainNeed: 'High',   suitable: temp >= 24 && hum >= 70 }
  ];

  const suitable   = cropProfiles.filter(c => c.suitable);
  const unsuitable = cropProfiles.filter(c => !c.suitable);

  // ── Disease risk based on real conditions
  const diseaseRisk = [];
  if (hum > 80 && temp > 25)  diseaseRisk.push({ d: 'Brown Leaf Spot',    risk: 'HIGH',   action: 'Apply Carbendazim 50WP @ 1g/L within 48h' });
  if (hum > 70 && temp > 28)  diseaseRisk.push({ d: 'Blast Disease',       risk: 'HIGH',   action: 'Apply Tricyclazole 75WP @ 0.6g/L' });
  if (hum > 65 && temp > 20)  diseaseRisk.push({ d: 'Bacterial Blight',    risk: 'MEDIUM', action: 'Spray Copper Oxychloride 50WP @ 3g/L' });
  if (temp > 35 && hum < 40)  diseaseRisk.push({ d: 'Powdery Mildew',      risk: 'HIGH',   action: 'Apply Wettable Sulfur 80WP @ 2g/L' });
  if (rainProb > 60)          diseaseRisk.push({ d: 'Root Rot / Damping',  risk: 'MEDIUM', action: 'Improve drainage · Apply Metalaxyl' });
  if (!diseaseRisk.length)    diseaseRisk.push({ d: 'No active threat',    risk: 'LOW',    action: 'Continue routine monitoring' });

  // ── Irrigation advice
  let irrAdvice;
  if (droughtRisk === 'High')       irrAdvice = '🚨 URGENT: Irrigate immediately. High drought stress detected.';
  else if (rainProb > 65)           irrAdvice = '✅ Skip irrigation — high rainfall probability in next 24h.';
  else if (hum < 50 && temp > 30)   irrAdvice = '💧 Irrigate today — low humidity + high temperature.';
  else                              irrAdvice = '📅 Irrigate as per normal schedule.';

  // ── UV advisory
  let uvNote = '';
  if (uvVal !== null) {
    uvNote = uvVal >= 8 ? '☀️ Very High UV — spray in early morning or evening only.'
           : uvVal >= 6 ? '🌤 High UV — avoid midday field work.'
           : '✅ UV levels safe for field operations.';
  }

  // ── AQI advisory
  let aqiNote = '';
  if (aqi !== null) {
    aqiNote = aqi >= 4 ? '🏭 Poor air quality — may affect pollination. Avoid burning crop residue.'
            : aqi >= 3 ? '⚠ Moderate AQI — monitor sensitive crops.'
            : '✅ Air quality: Good';
  }

  // ── Update chat AI responses dynamically with real data
  const cropList = suitable.map(c => `${c.emoji} ${c.name}`).join(' · ');
  const diseaseTop = diseaseRisk[0];

  CHAT_RESPONSES.en.crop = `🤖 Based on current conditions (${temp}°C, ${hum}% humidity, ${desc}), the following crops are **optimally suited** for your region right now:\n\n${cropList}\n\nTop recommendation: ${suitable[0]?.name || 'Consult local agronomist'}. ${irrAdvice}`;

  CHAT_RESPONSES.en.irrigation = `🤖 ${irrAdvice}\n\n📊 Current: Temp ${temp}°C · Humidity ${hum}% · Rain probability ${rainProb}% · Wind ${wind} km/h. ${uvNote}`;

  CHAT_RESPONSES.en.disease = `🤖 Disease Risk Analysis (based on live weather):\n\n${diseaseRisk.map(d => `🦠 **${d.d}** — ${d.risk}\n   Action: ${d.action}`).join('\n\n')}\n\n${aqiNote}`;

  CHAT_RESPONSES.en.default[0] = `🤖 Live AI analysis for your location: Temperature ${temp}°C (feels like ${w.feelsLike}°C), Humidity ${hum}%, Wind ${wind} km/h. ${irrAdvice} Drought risk: **${droughtRisk}** · Flood risk: **${floodRisk}**.`;

  // ── Update zone data dynamically based on weather
  updateZonesFromWeather(w, suitable, diseaseRisk);

  // ── Update AI prediction chart with real-weather-weighted data
  updatePredictionFromWeather(w);

  // ── Store for other modules
  state.cropIntelligence = { suitable, unsuitable, diseaseRisk, irrAdvice, uvNote, aqiNote };

  // 📤 Store crop intelligence in MongoDB
  postToBackend('/crop-intelligence', {
    location:       state.location?.name || '',
    lat:            state.location?.lat,
    lon:            state.location?.lon,
    weatherSummary: { temp, hum, wind, rainProb, desc, droughtRisk, floodRisk },
    suitableCrops:  suitable.map(c => ({ name: c.name, emoji: c.emoji, rainNeed: c.rainNeed })),
    unsuitableCrops:unsuitable.map(c => ({ name: c.name, emoji: c.emoji })),
    diseaseRisks:   diseaseRisk.map(d => ({ disease: d.d, risk: d.risk, action: d.action })),
    irrAdvice, uvNote, aqiNote
  });
}

// ─── UPDATE ZONE DATA FROM REAL WEATHER ──────
function updateZonesFromWeather(w, suitableCrops, diseaseRisk) {
  const { temp, hum, rainProb, droughtRisk } = w;

  // Calculate moisture score from real weather
  const moistureA = Math.min(Math.round(hum * 0.9 + rainProb * 0.1), 99);
  const moistureB = Math.min(Math.round(hum * 0.6 + rainProb * 0.1), 80);
  const moistureC = Math.min(Math.round(hum * 0.8), 90);
  const moistureD = Math.max(Math.round(hum * 0.35 - (temp > 35 ? 10 : 0)), 10);

  const topCrop  = suitableCrops[0]?.name || 'Rice';
  const topEmoji = suitableCrops[0]?.emoji || '🌾';
  const disease0 = diseaseRisk[0]?.risk === 'HIGH' ? 'High' : diseaseRisk[0]?.risk === 'MEDIUM' ? 'Moderate' : 'Low';
  const diseaseD = droughtRisk === 'High' ? 'High (64%)' : 'Moderate (38%)';

  // Overwrite ZONE_DATA with live-weather-adjusted values
  ZONE_DATA.A = {
    name: `Zone A — ${topCrop}`,
    crop: topEmoji,
    status: moistureA > 60 ? 'Healthy' : 'Moderate Stress',
    statusClass: moistureA > 60 ? 'status-good' : 'status-moderate',
    moisture: `${moistureA}%`,
    stage: 'Active Growth',
    disease: `${disease0} (${diseaseRisk[0]?.d || 'Monitored'})`,
    irr: rainProb > 60 ? 'Skip — rain forecast' : 'In 2 days',
    yield: `${(suitableCrops[0] ? 4.8 + (moistureA - 60) * 0.02 : 3.5).toFixed(1)} t/ha`,
    fert: 'As scheduled',
    insight: `Live weather: ${temp}°C · ${hum}% humidity. ${suitableCrops[0]?.name || topCrop} is ${moistureA > 60 ? 'thriving' : 'under moderate stress'}. ${diseaseRisk[0]?.action || 'Continue monitoring.'}`
  };
  ZONE_DATA.B = {
    name: 'Zone B — Maize',
    crop: '🌽',
    status: moistureB > 50 ? 'Healthy' : 'Moderate Stress',
    statusClass: moistureB > 50 ? 'status-good' : 'status-moderate',
    moisture: `${moistureB}%`,
    stage: 'Vegetative',
    disease: diseaseRisk.length > 1 ? `Moderate (${diseaseRisk[1]?.d})` : 'Low',
    irr: hum < 55 ? 'Today' : 'In 3 days',
    yield: `${(3.5 + (moistureB - 48) * 0.015).toFixed(1)} t/ha`,
    fert: 'In 3 days',
    insight: `Maize moisture at ${moistureB}%. Wind speed ${w.wind} km/h — ${w.wind > 40 ? 'high wind risk, stake plants.' : 'within safe range.'}`
  };
  ZONE_DATA.C = {
    name: 'Zone C — Vegetables',
    crop: '🌿',
    status: moistureC > 55 ? 'Healthy' : 'Monitor',
    statusClass: moistureC > 55 ? 'status-good' : 'status-moderate',
    moisture: `${moistureC}%`,
    stage: 'Fruiting',
    disease: hum > 75 ? `Moderate — Fungal risk (${hum}% RH)` : 'Low',
    irr: rainProb > 50 ? 'Skip — rain forecast' : 'In 1 day',
    yield: `${(11 + (moistureC - 55) * 0.05).toFixed(1)} t/ha`,
    fert: 'In 2 days',
    insight: `Vegetables: Humidity at ${hum}% — ${hum > 75 ? '⚠ fungal disease risk elevated, ensure good airflow.' : '✅ humidity acceptable.'} UV advisory: ${w.uvVal ? (w.uvVal > 6 ? 'High UV — shade netting recommended.' : 'Normal UV levels.') : 'UV data unavailable.'}`
  };
  ZONE_DATA.D = {
    name: 'Zone D — Critical Zone',
    crop: '🌻',
    status: moistureD < 30 ? 'Critical Stress' : 'Moderate Stress',
    statusClass: moistureD < 30 ? 'status-poor' : 'status-moderate',
    moisture: `${moistureD}%`,
    stage: 'Flowering',
    disease: diseaseD,
    irr: moistureD < 30 ? 'IMMEDIATE' : 'Today',
    yield: `${(1.5 + moistureD * 0.015).toFixed(1)} t/ha`,
    fert: moistureD < 25 ? 'Overdue' : 'In 2 days',
    insight: `⚠ Zone D is critically ${droughtRisk === 'High' ? 'water-stressed' : 'moisture-depleted'}. Current soil moisture estimate: ${moistureD}%. Drought risk: ${droughtRisk}. ${droughtRisk === 'High' ? 'Emergency irrigation required NOW.' : 'Increase irrigation frequency.'}`
  };
}

// ─── UPDATE PREDICTION CHART FROM REAL WEATHER ─
function updatePredictionFromWeather(w) {
  const { temp, hum, rainProb } = w;
  // Weight predictions based on real current conditions
  const yieldBase   = Math.min(95, 60 + (hum > 60 ? 15 : 0) + (temp < 35 ? 10 : 0) + (rainProb < 70 ? 10 : 0));
  const waterBase   = Math.min(90, 55 + (rainProb > 50 ? 20 : 0) + (hum > 65 ? 10 : 0));
  const diseaseBase = Math.max(5,  10 + (hum > 75 ? 15 : 0) + (temp > 30 ? 8 : 0));

  // Store so initPredictionChart() uses them
  state.predBases = { yieldBase, waterBase, diseaseBase };
}


function setDefaultWeather() {
  document.getElementById('w-temp').textContent  = '--°C';
  document.getElementById('w-hum').textContent   = '--%';
  document.getElementById('w-rain').textContent  = '--%';
  document.getElementById('w-wind').textContent  = '-- km/h';
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const temps = [28, 30, 31, 29, 27, 28, 30];
  const rains = [2, 0, 5, 12, 8, 1, 0];
  initWeatherCharts(days, temps, temps.map(t => t-4), rains);
}

// ─── DASHBOARD INIT ──────────────────────────
function initDashboard() {
  initCircularProgress();
  initPredictionChart();
  calcROI();
}

// ─── DASHBOARD RESET ─────────────────────────
function resetDashboard() {
  // 1. Reset ROI inputs
  const roiDefaults = {
    roiPrincipal: '100000',
    roiArea:      '2',
    roiCrop:      'rice',
    roiSeason:    'kharif',
    roiOpt:       'high'
  };
  Object.entries(roiDefaults).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  });

  // 2. Reset ROI result fields
  ['roiRevenue','roiProfit','roiPercent','roiBreakeven','roiWater','roiCarbon'].forEach(id => {
    setROIField(id, '—');
  });
  const noteEl = document.getElementById('roiNote');
  if (noteEl) noteEl.innerHTML = '🤖 <strong>AI Insight:</strong> Enter your investment details and click Calculate to see AI-projected returns for your farm.';

  // 3. Destroy ROI chart
  if (state.roiChart) { state.roiChart.destroy(); state.roiChart = null; }
  const roiCanvas = document.getElementById('roiChart');
  if (roiCanvas) { const ctx = roiCanvas.getContext('2d'); ctx.clearRect(0, 0, roiCanvas.width, roiCanvas.height); }

  // 4. Reset weather values to loading state
  ['w-temp','w-hum','w-rain','w-wind'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '--';
  });
  const dEl = document.getElementById('w-drought');
  const fEl = document.getElementById('w-flood');
  if (dEl) { dEl.textContent = '--'; dEl.className = 'weather-value'; }
  if (fEl) { fEl.textContent = '--'; fEl.className = 'weather-value'; }

  // 5. Destroy all dashboard charts
  ['temp','rain','pred'].forEach(key => {
    if (state.charts[key]) { state.charts[key].destroy(); delete state.charts[key]; }
  });

  // 6. Reset circular progress gauges (animate back to 0 then re-init)
  ['cp-water-fill','cp-crop-fill','cp-sust-fill','cp-carbon-fill'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const circ = 2 * Math.PI * 40;
      el.style.strokeDasharray = circ;
      el.style.strokeDashoffset = circ; // 0%
    }
  });

  // 7. Reset location subtitle
  const sub = document.getElementById('dashLocationSub');
  if (sub) sub.textContent = 'Enter a location to load live weather data';

  // 8. Re-fetch weather if location is set, else show placeholder charts
  if (state.location?.lat) {
    fetchWeather(state.location.lat, state.location.lon);
    setTimeout(() => { initCircularProgress(); initPredictionChart(); }, 800);
  } else {
    setDefaultWeather();
    setTimeout(() => { initCircularProgress(); initPredictionChart(); }, 300);
  }

  showToast('🔄 Dashboard Reset', 'All values restored to defaults. Weather re-loading.', 'info', 3500);

  // Flash the dashboard header
  const header = document.querySelector('#page-dashboard .page-header');
  if (header) {
    header.style.transition = 'box-shadow 0.3s';
    header.style.boxShadow = '0 0 30px rgba(0,170,255,0.4)';
    setTimeout(() => { header.style.boxShadow = ''; }, 800);
  }
}

// ─── CHART CONFIG HELPER ─────────────────────
const chartDefaults = {
  plugins: { legend: { labels: { color: '#8faab8', font: { size: 11 } } } },
  scales: {
    x: { ticks: { color: '#8faab8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
    y: { ticks: { color: '#8faab8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } }
  }
};

function initWeatherCharts(days, maxTemps, minTemps, rains) {
  // Temperature Chart
  const tCtx = document.getElementById('tempChart');
  if (!tCtx) return;
  if (state.charts.temp) state.charts.temp.destroy();

  state.charts.temp = new Chart(tCtx, {
    type: 'line',
    data: {
      labels: days,
      datasets: [
        {
          label: 'Max Temp (°C)',
          data: maxTemps,
          borderColor: '#ff6644',
          backgroundColor: 'rgba(255,102,68,0.1)',
          fill: true, tension: 0.4, pointRadius: 4,
          pointBackgroundColor: '#ff6644'
        },
        {
          label: 'Min Temp (°C)',
          data: minTemps,
          borderColor: '#00aaff',
          backgroundColor: 'rgba(0,170,255,0.08)',
          fill: true, tension: 0.4, pointRadius: 4,
          pointBackgroundColor: '#00aaff'
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      animation: { duration: 1000, easing: 'easeInOutQuart' },
      ...chartDefaults
    }
  });

  // Rainfall Chart
  const rCtx = document.getElementById('rainChart');
  if (!rCtx) return;
  if (state.charts.rain) state.charts.rain.destroy();

  state.charts.rain = new Chart(rCtx, {
    type: 'bar',
    data: {
      labels: days,
      datasets: [{
        label: 'Rainfall (mm)',
        data: rains,
        backgroundColor: rains.map(v => v > 10 ? 'rgba(0,100,255,0.7)' : 'rgba(0,170,255,0.5)'),
        borderColor: '#00aaff',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      animation: { duration: 1000 },
      ...chartDefaults
    }
  });
}

function initPredictionChart() {
  const ctx = document.getElementById('predChart');
  if (!ctx) return;
  if (state.charts.pred) state.charts.pred.destroy();

  // Use real weather-driven bases if available, else sensible defaults
  const yBase = state.predBases?.yieldBase   ?? 75;
  const wBase = state.predBases?.waterBase   ?? 60;
  const dBase = state.predBases?.diseaseBase ?? 20;

  const labels = Array.from({ length: 30 }, (_, i) => `D${i+1}`);
  state.charts.pred = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Yield Confidence (%)',
          data: labels.map((_, i) => Math.min(99, Math.max(10, yBase + Math.sin(i * 0.3) * 8 + (Math.random() - 0.5) * 4))),
          borderColor: '#00ff88', backgroundColor: 'rgba(0,255,136,0.08)',
          fill: true, tension: 0.4, pointRadius: 0
        },
        {
          label: 'Water Forecast (%)',
          data: labels.map((_, i) => Math.min(99, Math.max(10, wBase + Math.cos(i * 0.2) * 12 + (Math.random() - 0.5) * 4))),
          borderColor: '#00aaff', backgroundColor: 'rgba(0,170,255,0.06)',
          fill: true, tension: 0.4, pointRadius: 0
        },
        {
          label: 'Disease Risk (%)',
          data: labels.map((_, i) => Math.min(95, Math.max(2, dBase + Math.sin(i * 0.4) * 6 + (Math.random() - 0.5) * 3))),
          borderColor: '#ffaa00', backgroundColor: 'rgba(255,170,0,0.06)',
          fill: true, tension: 0.4, pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      animation: { duration: 1200 },
      ...chartDefaults
    }
  });
}

// ─── CIRCULAR PROGRESS ───────────────────────
function initCircularProgress() {
  const circles = [
    { id: 'cp-water-fill',  value: 78, color: '#00aaff' },
    { id: 'cp-crop-fill',   value: 85, color: '#00ff88' },
    { id: 'cp-sust-fill',   value: 71, color: '#aa00ff' },
    { id: 'cp-carbon-fill', value: 63, color: '#ff6600' }
  ];

  circles.forEach(c => {
    const el = document.getElementById(c.id);
    if (!el) return;
    const circumference = 2 * Math.PI * 40; // r=40
    el.style.stroke = c.color;
    el.style.strokeDasharray = circumference;
    el.style.filter = `drop-shadow(0 0 6px ${c.color}80)`;
    // Animate
    setTimeout(() => {
      const offset = circumference * (1 - c.value / 100);
      el.style.strokeDashoffset = offset;
    }, 200);
  });
}

// ─── ROI CALCULATOR ──────────────────────────
function calcROI() {
  const principalEl = document.getElementById('roiPrincipal');
  const cropEl      = document.getElementById('roiCrop');
  const areaEl      = document.getElementById('roiArea');
  const optEl       = document.getElementById('roiOpt');
  const seasonEl    = document.getElementById('roiSeason');

  const principal = parseFloat(principalEl?.value) || 0;
  const crop      = cropEl?.value || 'rice';
  const area      = parseFloat(areaEl?.value) || 0;
  const opt       = optEl?.value || 'high';
  const season    = seasonEl?.value || 'kharif';

  // ── Validation
  if (principal <= 0) {
    highlightError(principalEl, 'Please enter a valid investment amount greater than 0');
    return;
  }
  if (area <= 0) {
    highlightError(areaEl, 'Please enter a valid farm area greater than 0');
    return;
  }

  // ── Calculation
  const cropData   = CROP_ROI[crop] || CROP_ROI.rice;
  const optFactor  = AI_OPT_FACTOR[opt] || 1;
  const revenue    = Math.round(cropData.yieldPerHa * area * cropData.price * optFactor);
  const profit     = revenue - principal;
  const roiPct     = principal > 0 ? Math.round((profit / principal) * 100) : 0;
  const monthsInSeason = season === 'kharif' ? 6 : season === 'rabi' ? 5 : 3;
  const breakeven  = revenue > 0 ? (principal / (revenue / monthsInSeason)).toFixed(1) : 'N/A';
  const waterSave  = Math.round(principal * 0.124 * optFactor);
  const carbonCred = Math.round(area * 2000 * optFactor);

  // ── Update result fields with animation
  animateROIField('roiRevenue',  `₹${revenue.toLocaleString('en-IN')}`);
  animateROIField('roiProfit',   `${profit >= 0 ? '+' : ''}₹${Math.abs(profit).toLocaleString('en-IN')}`, profit >= 0 ? 'green-val' : 'red-val');
  animateROIField('roiPercent',  `${roiPct}%`, roiPct >= 0 ? 'accent-val' : 'red-val');
  animateROIField('roiBreakeven',`${breakeven} months`);
  animateROIField('roiWater',    `₹${waterSave.toLocaleString('en-IN')}`, 'blue-val');
  animateROIField('roiCarbon',   `₹${carbonCred.toLocaleString('en-IN')}`, 'green-val');

  // ── AI Note
  const notes = {
    rice:      `🤖 With ${opt === 'high' ? 'full' : opt === 'medium' ? 'partial' : 'no'} AI optimization, your <strong>Rice</strong> farm (${area} ha) is projected to yield <strong>₹${revenue.toLocaleString('en-IN')}</strong> this ${season} season — ${roiPct >= 0 ? roiPct + '% ROI' : 'a loss of ' + Math.abs(roiPct) + '%'}. ${opt === 'none' ? 'Tip: Enabling AI optimization can boost returns by up to 45%.' : 'Drip irrigation recommended for additional 22% water cost savings.'}`,
    wheat:     `🤖 Wheat market prices are favorable. AI suggests early sowing for max yield of <strong>${cropData.yieldPerHa} t/ha</strong>. Projected revenue: <strong>₹${revenue.toLocaleString('en-IN')}</strong> with <strong>${roiPct}% ROI</strong>.`,
    sugarcane: `🤖 Sugarcane delivers the highest ROI in your region. AI-optimized ratoon cropping can extend profitability for 3 seasons. Projected: <strong>₹${revenue.toLocaleString('en-IN')}</strong> at <strong>${roiPct}% ROI</strong>.`,
    cotton:    `🤖 Cotton prices are bullish. AI recommends Bt Cotton with IPM to cut pesticide costs by 30%. Projected revenue: <strong>₹${revenue.toLocaleString('en-IN')}</strong>.`,
    maize:     `🤖 Maize demand is rising. Consider contract farming for guaranteed ₹18,500/ton. Your <strong>${area} ha</strong> could earn <strong>₹${revenue.toLocaleString('en-IN')}</strong>.`,
    groundnut: `🤖 Groundnut oil prices at 5-year high. Valencia variety recommended for 25% higher oil content. Projected: <strong>₹${revenue.toLocaleString('en-IN')}</strong> at <strong>${roiPct}% ROI</strong>.`
  };

  const noteEl = document.getElementById('roiNote');
  if (noteEl) noteEl.innerHTML = notes[crop] || notes.rice;

  updateROIChart(principal, revenue, profit, waterSave, carbonCred);

  // ── Visual feedback on calculate button
  const btn = document.querySelector('.roi-calc-btn');
  if (btn) {
    btn.textContent = '✅ Calculated!';
    btn.style.background = 'linear-gradient(135deg, #00ff88, #00cc66)';
    btn.style.color = '#050d12';
    setTimeout(() => {
      btn.textContent = '🤖 Calculate AI-Projected ROI';
      btn.style.background = '';
      btn.style.color = '';
    }, 1800);
  }
}

function highlightError(el, msg) {
  if (!el) return;
  el.style.borderColor = '#ff4455';
  el.style.boxShadow = '0 0 0 3px rgba(255,68,85,0.2)';
  el.focus();
  el.select?.();
  showToast('⚠ Input Error', msg, 'danger', 3000);
  setTimeout(() => { el.style.borderColor = ''; el.style.boxShadow = ''; }, 2000);
}

function animateROIField(id, val, extraClass = '') {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.transform = 'scale(0.85)';
  el.style.opacity = '0';
  el.style.transition = 'all 0.25s ease';
  setTimeout(() => {
    el.textContent = val;
    el.className = 'roi-result-value' + (extraClass ? ' ' + extraClass : '');
    el.style.transform = 'scale(1)';
    el.style.opacity = '1';
  }, 200);
}

function setROIField(id, val) {
  const el = document.getElementById(id);
  if (el) { el.textContent = val; el.className = 'roi-result-value'; }
}

function resetROI() {
  const defaults = { roiPrincipal: '100000', roiArea: '2', roiCrop: 'rice', roiSeason: 'kharif', roiOpt: 'high' };
  Object.entries(defaults).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  });
  ['roiRevenue','roiProfit','roiPercent','roiBreakeven','roiWater','roiCarbon'].forEach(id => setROIField(id, '—'));
  const noteEl = document.getElementById('roiNote');
  if (noteEl) noteEl.innerHTML = '🤖 <strong>AI Insight:</strong> Enter your investment details above and click <em>Calculate</em> to see AI-projected returns for your farm.';
  if (state.roiChart) { state.roiChart.destroy(); state.roiChart = null; }
  const roiCanvas = document.getElementById('roiChart');
  if (roiCanvas) { const ctx2 = roiCanvas.getContext('2d'); ctx2.clearRect(0, 0, roiCanvas.width, roiCanvas.height); }
  showToast('↺ ROI Reset', 'Investment inputs cleared. Enter new values to recalculate.', 'info', 2500);
}

function updateROIChart(principal, revenue, profit, water, carbon) {
  const ctx = document.getElementById('roiChart');
  if (!ctx) return;
  if (state.roiChart) state.roiChart.destroy();

  state.roiChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Investment', 'Net Profit', 'Water Savings', 'Carbon Credits'],
      datasets: [{
        data: [principal, Math.max(profit, 0), water, carbon],
        backgroundColor: [
          'rgba(0,170,255,0.7)',
          'rgba(0,255,136,0.7)',
          'rgba(170,0,255,0.7)',
          'rgba(0,220,100,0.7)'
        ],
        borderColor: ['#00aaff','#00ff88','#aa00ff','#00dc64'],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      cutout: '65%',
      plugins: {
        legend: { position: 'bottom', labels: { color: '#8faab8', font: { size: 11 }, padding: 12 } }
      },
      animation: { animateRotate: true, duration: 800 }
    }
  });
}

// ─── SIMULATION ──────────────────────────────
function initSimulation() {
  runSimulation();
}

function updateSimParam(key, val) {
  state.simParams[key] = isNaN(val) ? val : parseFloat(val);

  const labels = { rain: '☔', temp: '🌡️', irr: '💦', fert: '🧪' };
  const units  = { rain: '%', temp: '°C', irr: '%', fert: '%' };
  const el = document.getElementById(`sim-${key}-val`);
  if (el && units[key]) el.textContent = `${val}${units[key]}`;

  runSimulation();
}

function runSimulation() {
  const p = state.simParams;

  // AI model — weighted formula
  const rainFactor = p.rain / 100;
  const tempStress = p.temp > 35 ? 0.7 : p.temp > 30 ? 0.85 : p.temp < 20 ? 0.75 : 1.0;
  const irrFactor  = p.irr / 100;
  const fertFactor = Math.min(p.fert / 60, 1.1);

  const health  = Math.min(Math.round((rainFactor * 0.3 + tempStress * 0.25 + irrFactor * 0.25 + fertFactor * 0.2) * 100), 100);

  const yieldMap = { rice: 5.5, wheat: 5.0, cotton: 2.4, sugarcane: 70, maize: 6.8 };
  const baseYield = yieldMap[p.crop] || 5.0;
  const yieldVal  = (baseYield * (health / 100) * tempStress).toFixed(1);

  const waterDepl = Math.round((1 - rainFactor) * p.irr * 0.3);
  const carbonImpact = (p.fert * 0.025 + p.irr * 0.018 - rainFactor * 1.5).toFixed(1);

  const priceMap = { rice: 18500, wheat: 21500, cotton: 65000, sugarcane: 3200, maize: 17500 };
  const econ = Math.round(parseFloat(yieldVal) * (priceMap[p.crop] || 18500) * 0.001);

  // Update cards
  setSimResult('sim-r-health', `${health}%`, 'sim-r-health-bar', health, health > 70 ? '#00ff88' : health > 50 ? '#ffaa00' : '#ff4455');
  setSimResult('sim-r-yield',  `${yieldVal} t/ha`, 'sim-r-yield-bar', (parseFloat(yieldVal)/baseYield)*100, '#00aaff');
  setSimResult('sim-r-water',  `-${waterDepl}%`, 'sim-r-water-bar', waterDepl, '#ffaa00');
  setSimResult('sim-r-carbon', `${carbonImpact >= 0 ? '+' : ''}${carbonImpact} t`, 'sim-r-carbon-bar', Math.abs(parseFloat(carbonImpact)) * 10, '#ff6600');
  setSimResult('sim-r-econ',   `${econ >= 0 ? '+' : ''}₹${Math.abs(econ)}K`, 'sim-r-econ-bar', Math.min(econ/10, 100), '#aa00ff');

  updateSimChart(p, health, parseFloat(yieldVal));
  updateSimRecs(p, health, waterDepl);
}

function setSimResult(valId, val, barId, pct, color) {
  const v = document.getElementById(valId);
  const b = document.getElementById(barId);
  if (v) v.textContent = val;
  if (b) { b.style.width = `${Math.max(0,Math.min(100,pct))}%`; b.style.background = color; }
}

function updateSimChart(p, health, yieldVal) {
  const ctx = document.getElementById('simChart');
  if (!ctx) return;
  if (state.charts.sim) state.charts.sim.destroy();

  const days = Array.from({ length: parseInt(p.horizon) }, (_, i) => `Day ${i+1}`).filter((_, i) => i % Math.ceil(p.horizon/10) === 0);
  const healthTrend = days.map((_, i) => Math.min(health + Math.sin(i * 0.5) * 5 + i * 0.2, 100));
  const yieldTrend  = days.map((_, i) => yieldVal * (0.7 + i * 0.3 / days.length));
  const waterTrend  = days.map((_, i) => 100 - i * (p.irr / days.length));

  state.charts.sim = new Chart(ctx, {
    type: 'line',
    data: {
      labels: days,
      datasets: [
        { label: 'Crop Health (%)',    data: healthTrend, borderColor: '#00ff88', backgroundColor: 'rgba(0,255,136,0.08)', fill: true, tension: 0.4, pointRadius: 3 },
        { label: 'Yield Projection',   data: yieldTrend,  borderColor: '#00aaff', backgroundColor: 'rgba(0,170,255,0.06)', fill: true, tension: 0.4, pointRadius: 3 },
        { label: 'Water Reserve (%)',  data: waterTrend,  borderColor: '#ffaa00', backgroundColor: 'rgba(255,170,0,0.06)',  fill: true, tension: 0.4, pointRadius: 3 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      animation: { duration: 600 },
      ...chartDefaults
    }
  });
}

function updateSimRecs(p, health, waterDepl) {
  const container = document.getElementById('simRecommendations');
  if (!container) return;

  const recs = [];
  if (health > 80)   recs.push('✅ Excellent conditions detected. Current parameters are optimal for ' + p.crop + '.');
  if (health < 60)   recs.push('⚠️ Crop health below threshold. Immediate action required to prevent yield loss.');
  if (p.temp > 35)   recs.push('🌡️ High temperature stress detected. Consider shade netting or night irrigation.');
  if (p.rain < 30)   recs.push('☔ Low rainfall scenario. Increase irrigation by 25% to compensate deficit.');
  if (p.irr > 80)    recs.push('💧 Over-irrigation risk. Reduce by 20% to prevent waterlogging and root rot.');
  if (p.fert > 70)   recs.push('🧪 High fertilizer load. Risk of nutrient burn. Reduce by 15% and add organic matter.');
  if (waterDepl > 30) recs.push('💦 Significant water depletion projected. Switch to drip irrigation immediately.');
  if (recs.length === 0) recs.push('✅ All parameters within optimal range. No immediate action required.');

  container.innerHTML = recs.map(r => `<div class="sim-rec-item">${r}</div>`).join('');
}

function resetSimulation() {
  ['sim-rain','sim-temp','sim-irr','sim-fert'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) { el.value = [65,28,50,40][i]; }
  });
  state.simParams = { rain: 65, temp: 28, irr: 50, fert: 40, crop: 'rice', horizon: 30 };
  ['rain','temp','irr','fert'].forEach((k,i) => updateSimParam(k, [65,28,50,40][i]));
}

// ─── VIRTUAL FARM ─────────────────────────────
function selectZone(z) {
  state.selectedZone = z;
  const d = ZONE_DATA[z];
  if (!d) return;

  document.getElementById('zd-name').textContent    = d.name;
  document.getElementById('zd-status').textContent  = '● ' + d.status;
  document.getElementById('zd-status').className    = 'zone-detail-status ' + d.statusClass;
  document.getElementById('zd-moisture').textContent = d.moisture;
  document.getElementById('zd-stage').textContent   = d.stage;
  document.getElementById('zd-disease').textContent = d.disease;
  document.getElementById('zd-irr').textContent     = d.irr;
  document.getElementById('zd-yield').textContent   = d.yield;
  document.getElementById('zd-fert').textContent    = d.fert;
  document.getElementById('zd-insight').textContent = d.insight;

  // Highlight selected zone
  document.querySelectorAll('.farm-section').forEach(s => s.style.boxShadow = '');
  const zoneEl = document.querySelector(`.zone-${z.toLowerCase()}`);
  if (zoneEl) zoneEl.style.boxShadow = '0 0 20px rgba(0,255,136,0.4), inset 0 0 20px rgba(0,255,136,0.05)';
}

// ─── RESERVOIR ────────────────────────────────
function initReservoir() {
  const ctx = document.getElementById('resChart');
  if (!ctx || state.charts.res) return;

  const days = Array.from({ length: 60 }, (_, i) => `Day ${i+1}`).filter((_, i) => i % 6 === 0);
  const level = days.map((_, i) => Math.max(74 - i * 1.2 + Math.random() * 3, 5));
  const critical = Array(days.length).fill(25);
  const empty    = Array(days.length).fill(10);

  state.charts.res = new Chart(ctx, {
    type: 'line',
    data: {
      labels: days,
      datasets: [
        { label: 'Reservoir Level (%)', data: level, borderColor: '#00aaff', backgroundColor: 'rgba(0,170,255,0.15)', fill: true, tension: 0.4 },
        { label: 'Critical Threshold',  data: critical, borderColor: '#ffaa00', borderDash: [5,5], borderWidth: 1, fill: false, pointRadius: 0 },
        { label: 'Emergency Level',     data: empty,    borderColor: '#ff4455', borderDash: [3,3], borderWidth: 1, fill: false, pointRadius: 0 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      animation: { duration: 1000 },
      ...chartDefaults
    }
  });
}

// ─── AI ADVISOR CHAT ─────────────────────────
function setLang(lang) {
  state.currentLang = lang;
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById(`lang-${lang}`);
  if (btn) btn.classList.add('active');
}

function quickQuestion(q) {
  document.getElementById('chatInput').value = q;
  sendChat();
}

function sendChat() {
  const input = document.getElementById('chatInput');
  const msg   = input.value.trim();
  if (!msg) return;

  addChatMessage(msg, 'user');
  input.value = '';

  // Typing indicator with Herms branding
  const typingId = addTypingIndicator();

  // Build context to send to Herms
  const context = {
    location:   state.location?.name || '',
    lat:        state.location?.lat,
    lon:        state.location?.lon,
    weather:    state.weather || null,
    activeCrop: document.getElementById('roiCrop')?.value || ''
  };

  // Call Herms via backend
  fetch(`${BACKEND_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: SESSION_ID,
      message:   msg,
      language:  state.currentLang || 'en',
      context
    })
  })
  .then(r => r.json())
  .then(data => {
    removeTypingIndicator(typingId);
    addChatMessage(data.response || 'Herms is thinking...', 'bot');
  })
  .catch(() => {
    removeTypingIndicator(typingId);
    addChatMessage('🌿 Herms is offline. Make sure the backend is running: open backend/start.bat', 'bot');
  });
}

// Load Herms conversation history from MongoDB
async function loadHermsHistory() {
  try {
    const container = document.getElementById('chatMessages');
    if (!container) return;

    const res  = await fetch(`${BACKEND_BASE}/chat/history/${SESSION_ID}?limit=30`);
    const msgs = await res.json();

    if (!Array.isArray(msgs) || msgs.length === 0) {
      // First time — Herms greeting
      addChatMessage('🌿 Hi! I\'m **Herms**, your EcoSphere agricultural AI advisor. Ask me anything about crops, irrigation, disease risk, or market prices!', 'bot');
      return;
    }

    // Render loaded history
    msgs.forEach(m => addChatMessage(m.message, m.role === 'herms' ? 'bot' : 'user'));
    const container2 = document.getElementById('chatMessages');
    if (container2) container2.scrollTop = container2.scrollHeight;
  } catch {
    addChatMessage('🌿 Hi! I\'m Herms, your EcoSphere AI advisor. How can I help you today?', 'bot');
  }
}

function generateAIResponse(msg) {
  // Legacy fallback — no longer called when backend is running
  const lang = state.currentLang;
  const m = msg.toLowerCase();
  const res = CHAT_RESPONSES[lang] || CHAT_RESPONSES.en;
  if (m.includes('crop') || m.includes('grow') || m.includes('plant') || m.includes('seed')) return res.crop || res.default[0];
  if (m.includes('irrigat') || m.includes('water') || m.includes('moisture')) return res.irrigation || res.default[1];
  if (m.includes('disease') || m.includes('pest') || m.includes('blight')) return res.disease || res.default[2];
  return res.default[Math.floor(Math.random() * res.default.length)];
}

// ─── SATELLITE MAP ────────────────────────────
let mapInitialized = false;

function initMap() {
  if (mapInitialized) return;
  mapInitialized = true;

  const lat = state.location?.lat || 12.9716;
  const lon = state.location?.lon || 77.5946;

  const map = L.map('mainMap', { zoomControl: true }).setView([lat, lon], 10);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap | EcoSphere AI',
    maxZoom: 18
  }).addTo(map);

  state.map = map;

  // Add mock zone circles
  const zones = [
    { lat: lat + 0.05,  lon: lon - 0.05, color: '#00ff88', label: 'Zone A — High NDVI', ndvi: 0.72 },
    { lat: lat - 0.04, lon: lon + 0.06, color: '#ffcc00', label: 'Zone B — Moderate',  ndvi: 0.41 },
    { lat: lat + 0.08, lon: lon + 0.08, color: '#ff4455', label: 'Zone C — Drought',   ndvi: 0.18 },
    { lat: lat - 0.08, lon: lon - 0.06, color: '#00aaff', label: 'Zone D — Wetland',   ndvi: 0.55 }
  ];

  zones.forEach(z => {
    L.circle([z.lat, z.lon], {
      radius: 2000,
      color: z.color,
      fillColor: z.color,
      fillOpacity: 0.25,
      weight: 2
    }).addTo(map).bindPopup(`
      <b>${z.label}</b><br>
      NDVI: <b>${z.ndvi}</b><br>
      Status: ${z.ndvi > 0.5 ? '✅ Healthy' : z.ndvi > 0.3 ? '⚠ Moderate' : '🔴 Stressed'}
    `);

    L.circleMarker([z.lat, z.lon], { radius: 6, color: z.color, fillColor: z.color, fillOpacity: 1 })
      .addTo(map)
      .bindTooltip(z.label, { permanent: false });
  });

  // Farm marker
  L.marker([lat, lon]).addTo(map)
    .bindPopup(`<b>📍 Your Farm Location</b><br>Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}<br>Monitoring Active ✅`)
    .openPopup();
}

function initNDVIChart() {
  const ctx = document.getElementById('ndviChart');
  if (!ctx || state.charts.ndvi) return;

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  state.charts.ndvi = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [
        { label: 'Zone A NDVI', data: [0.35,0.40,0.55,0.72,0.80,0.75,0.70,0.72,0.68,0.60,0.45,0.38], borderColor: '#00ff88', fill: false, tension: 0.4 },
        { label: 'Zone B NDVI', data: [0.20,0.25,0.38,0.45,0.55,0.48,0.41,0.42,0.38,0.30,0.22,0.18], borderColor: '#ffcc00', fill: false, tension: 0.4 },
        { label: 'Zone C NDVI', data: [0.10,0.12,0.18,0.20,0.25,0.22,0.18,0.17,0.15,0.12,0.10,0.08], borderColor: '#ff4455', fill: false, tension: 0.4 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      animation: { duration: 1000 },
      scales: {
        ...chartDefaults.scales,
        y: { ...chartDefaults.scales.y, min: 0, max: 1 }
      },
      plugins: chartDefaults.plugins
    }
  });
}

function setMapLayer(layer) {
  state.mapLayer = layer;
  document.querySelectorAll('.map-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');

  const legends = {
    ndvi:    { title: 'NDVI — Vegetation Health',  items: [['#006400','High (0.7–1.0)'],['#90EE90','Medium (0.3–0.7)'],['#FFD700','Low (0.1–0.3)'],['#FF4500','Bare Soil (<0.1)']] },
    drought: { title: 'Drought Risk Index',         items: [['#00ff88','No Risk'],['#ffcc00','Mild Risk'],['#ff6600','Moderate Risk'],['#ff0000','Severe Drought']] },
    water:   { title: 'Water Stress Index',         items: [['#00aaff','Low Stress'],['#66aaff','Mild Stress'],['#ffaa00','Moderate'],['#ff4455','Critical']] },
    climate: { title: 'Climate Risk Zones',         items: [['#00ff88','Safe'],['#ffcc00','Low Risk'],['#ff6600','Medium Risk'],['#ff0000','High Risk']] }
  };

  const info = legends[layer] || legends.ndvi;
  const overlay = document.getElementById('mapOverlayInfo');
  if (overlay) {
    overlay.innerHTML = `
      <div class="map-legend">
        <div class="legend-title">${info.title}</div>
        <div class="legend-items">
          ${info.items.map(([c, l]) => `<div class="legend-item"><span class="legend-dot" style="background:${c}"></span>${l}</div>`).join('')}
        </div>
      </div>
    `;
  }
}

// ─── ANALYTICS ────────────────────────────────
function initAnalytics() {
  if (state.charts.yieldTrend) return;
  initYieldTrend();
  initWaterTrend();
  initSustTrend();
  initConfChart();
  initImpactChart();
}

function initYieldTrend() {
  const ctx = document.getElementById('yieldTrendChart');
  if (!ctx) return;

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  state.charts.yieldTrend = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        { label: 'AI-Optimized Yield (t/ha)', data: [3.2,3.5,4.0,4.8,5.2,5.4,5.1,4.9,5.3,4.7,4.2,3.8], backgroundColor: 'rgba(0,255,136,0.6)', borderColor: '#00ff88', borderWidth: 1, borderRadius: 4 },
        { label: 'Traditional Yield (t/ha)',   data: [2.8,3.0,3.4,4.0,4.4,4.5,4.2,4.0,4.3,3.9,3.5,3.2], backgroundColor: 'rgba(0,170,255,0.4)', borderColor: '#00aaff', borderWidth: 1, borderRadius: 4 }
      ]
    },
    options: { responsive: true, animation: { duration: 1200 }, ...chartDefaults }
  });
}

function initWaterTrend() {
  const ctx = document.getElementById('waterTrendChart');
  if (!ctx) return;

  const weeks = Array.from({ length: 12 }, (_, i) => `Wk ${i+1}`);
  state.charts.waterTrend = new Chart(ctx, {
    type: 'line',
    data: {
      labels: weeks,
      datasets: [
        { label: 'Water Usage (mm)', data: weeks.map(() => 25 + Math.random() * 15), borderColor: '#00aaff', fill: true, backgroundColor: 'rgba(0,170,255,0.08)', tension: 0.4 },
        { label: 'Rainfall (mm)',    data: weeks.map(() => 10 + Math.random() * 20), borderColor: '#aa00ff', fill: true, backgroundColor: 'rgba(170,0,255,0.06)', tension: 0.4 }
      ]
    },
    options: { responsive: true, animation: { duration: 1000 }, ...chartDefaults }
  });
}

function initSustTrend() {
  const ctx = document.getElementById('sustTrendChart');
  if (!ctx) return;

  const months = ['Jan','Feb','Mar','Apr','May','Jun'];
  state.charts.sustTrend = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [{
        label: 'Sustainability Index',
        data: [58, 62, 66, 68, 71, 74],
        borderColor: '#aa00ff',
        backgroundColor: 'rgba(170,0,255,0.1)',
        fill: true, tension: 0.4, pointRadius: 5,
        pointBackgroundColor: '#aa00ff'
      }]
    },
    options: { responsive: true, animation: { duration: 1000 }, ...chartDefaults }
  });
}

function initConfChart() {
  const ctx = document.getElementById('confChart');
  if (!ctx) return;

  state.charts.conf = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Yield Prediction','Weather Forecast','Disease Detection','Water Forecast','Soil Analysis','ROI Estimate'],
      datasets: [{
        label: 'AI Confidence (%)',
        data: [91, 88, 94, 86, 89, 82],
        borderColor: '#00ff88',
        backgroundColor: 'rgba(0,255,136,0.1)',
        borderWidth: 2,
        pointBackgroundColor: '#00ff88'
      }]
    },
    options: {
      responsive: true,
      scales: {
        r: {
          min: 0, max: 100,
          ticks:        { color: '#8faab8', font: { size: 9 }, backdropColor: 'transparent' },
          pointLabels:  { color: '#8faab8', font: { size: 10 } },
          grid:         { color: 'rgba(255,255,255,0.06)' },
          angleLines:   { color: 'rgba(255,255,255,0.06)' }
        }
      },
      plugins: chartDefaults.plugins,
      animation: { duration: 1000 }
    }
  });
}

function initImpactChart() {
  const ctx = document.getElementById('impactChart');
  if (!ctx) return;

  state.charts.impact = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Water Saved','Carbon Reduced','Energy Efficiency','Yield Increase','Cost Savings'],
      datasets: [{
        data: [22, 18, 15, 14, 31],
        backgroundColor: ['rgba(0,170,255,0.7)','rgba(0,255,136,0.7)','rgba(170,0,255,0.7)','rgba(255,170,0,0.7)','rgba(255,68,85,0.7)'],
        borderColor: ['#00aaff','#00ff88','#aa00ff','#ffaa00','#ff4455'],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true, cutout: '60%',
      plugins: { legend: { position: 'right', labels: { color: '#8faab8', font: { size: 10 } } } },
      animation: { duration: 1000 }
    }
  });
}

function updateAnalyticsCharts(range) {
  // Placeholder — in production would refetch data
  console.log('Analytics range:', range);
}

// ─── CLOCK ───────────────────────────────────
function startClock() {
  function tick() {
    const now = new Date();
    const t   = now.toLocaleTimeString('en-IN', { hour12: false });
    const el  = document.getElementById('dashTime');
    if (el) el.textContent = t;
    const st = document.getElementById('statusTime');
    if (st) st.textContent = '⏱ ' + now.toLocaleTimeString('en-IN', { hour12: true, hour: '2-digit', minute: '2-digit' });
  }
  tick();
  setInterval(tick, 1000);
}

// ─── LIVE WEATHER UPDATE ──────────────────────
function startWeatherUpdates() {
  setInterval(() => {
    // Simulate small fluctuations in weather values
    const tempEl = document.getElementById('w-temp');
    const humEl  = document.getElementById('w-hum');
    if (tempEl && tempEl.textContent !== '--°C') {
      const t = parseFloat(tempEl.textContent) + (Math.random() - 0.5) * 0.4;
      tempEl.textContent = `${t.toFixed(1)}°C`;
    }
    if (humEl && humEl.textContent !== '--%') {
      const h = parseFloat(humEl.textContent) + (Math.random() - 0.5) * 0.6;
      humEl.textContent = `${Math.min(100, Math.max(0, Math.round(h)))}%`;
    }
  }, 5000);
}

// ─── ANIMATION OBSERVER ───────────────────────
function initScrollAnimations() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.glass-card, .feature-card, .future-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
  });
}

// ─── LOADING SCREEN ──────────────────────────
function hideLoadingScreen() {
  const screen = document.getElementById('loadingScreen');
  if (screen) screen.classList.add('hidden');
}

// ─── TOAST NOTIFICATIONS ─────────────────────
function showToast(title, msg, type = 'info', duration = 4000) {
  const icons = { success: '✅', warning: '⚠️', danger: '🚨', info: 'ℹ️' };
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || 'ℹ️'}</div>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      <div class="toast-msg">${msg}</div>
    </div>
    <button class="toast-close" onclick="dismissToast(this.parentElement)">×</button>
  `;
  container.appendChild(toast);

  setTimeout(() => dismissToast(toast), duration);
}

function dismissToast(toast) {
  if (!toast || !toast.parentElement) return;
  toast.classList.add('toast-hide');
  setTimeout(() => { if (toast.parentElement) toast.parentElement.removeChild(toast); }, 320);
}

// ─── STATUS BAR UPDATES ──────────────────────
function updateStatusBar() {
  const locEl = document.getElementById('statusLocation');
  if (locEl && state.location?.name) {
    locEl.textContent = '📍 ' + state.location.name.split(',')[0];
  }
}

// ─── FIXED MAP LAYER BUTTON ───────────────────
function setMapLayer(layer, btnEl) {
  state.mapLayer = layer;
  document.querySelectorAll('.map-btn').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');

  const legends = {
    ndvi:    { title: 'NDVI — Vegetation Health',  items: [['#006400','High (0.7–1.0)'],['#90EE90','Medium (0.3–0.7)'],['#FFD700','Low (0.1–0.3)'],['#FF4500','Bare Soil (<0.1)']] },
    drought: { title: 'Drought Risk Index',         items: [['#00ff88','No Risk'],['#ffcc00','Mild Risk'],['#ff6600','Moderate Risk'],['#ff0000','Severe Drought']] },
    water:   { title: 'Water Stress Index',         items: [['#00aaff','Low Stress'],['#66aaff','Mild Stress'],['#ffaa00','Moderate'],['#ff4455','Critical']] },
    climate: { title: 'Climate Risk Zones',         items: [['#00ff88','Safe'],['#ffcc00','Low Risk'],['#ff6600','Medium Risk'],['#ff0000','High Risk']] }
  };

  const info = legends[layer] || legends.ndvi;
  const overlay = document.getElementById('mapOverlayInfo');
  if (overlay) {
    overlay.innerHTML = `
      <div class="map-legend">
        <div class="legend-title">${info.title}</div>
        <div class="legend-items">
          ${info.items.map(([c, l]) => `<div class="legend-item"><span class="legend-dot" style="background:${c}"></span>${l}</div>`).join('')}
        </div>
      </div>
    `;
  }
  showToast('Layer Changed', `Now viewing: ${info.title}`, 'info', 2500);
}

// ─── RANDOM PERIODIC ALERTS ──────────────────
const PERIODIC_ALERTS = [
  { title: '🦠 Disease Alert', msg: 'Brown leaf spot risk elevated in Zone D. Confidence: 94%', type: 'danger' },
  { title: '💧 Irrigation Reminder', msg: 'Zone B scheduled irrigation in 30 minutes.', type: 'info' },
  { title: '🌡️ Temperature Spike', msg: 'Heat stress predicted for tomorrow — 38°C expected.', type: 'warning' },
  { title: '✅ Yield Forecast Updated', msg: 'Rice yield forecast revised upward: 5.2 t/ha (+0.3).', type: 'success' },
  { title: '☔ Rainfall Alert', msg: '12mm rainfall predicted in next 6 hours. Adjust irrigation.', type: 'info' },
  { title: '🌊 Water Level Alert', msg: 'Reservoir at 74%. Plan irrigation schedule accordingly.', type: 'warning' }
];

function startPeriodicAlerts() {
  // Show first alert after 5s, then every 30s
  setTimeout(() => {
    const a = PERIODIC_ALERTS[0];
    showToast(a.title, a.msg, a.type);
  }, 5000);

  let idx = 1;
  setInterval(() => {
    const a = PERIODIC_ALERTS[idx % PERIODIC_ALERTS.length];
    showToast(a.title, a.msg, a.type);
    idx++;
  }, 30000);
}

// ─── INIT ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initHeroCanvas();
  startClock();
  startWeatherUpdates();
  startPeriodicAlerts();

  // Show location modal on first load
  const modal = document.getElementById('locationModal');
  if (modal) {
    modal.classList.remove('hidden');
    setTimeout(() => {
      document.getElementById('locationModalInput')?.focus();
    }, 300);
  }

  // Animate hero counters after short delay
  setTimeout(animateCounters, 600);

  // Init scroll observer (excluding hero which is always shown)
  setTimeout(initScrollAnimations, 100);

  // Update status bar periodically
  setInterval(updateStatusBar, 2000);
});
