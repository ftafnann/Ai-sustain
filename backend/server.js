/* =============================================
   ECOSPHERE AI — BACKEND SERVER
   Node.js + Express + MongoDB + Ollama Herms
   Port: 3001
   ============================================= */

require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const connectDB  = require('./db');

const app  = express();
const PORT = process.env.PORT || 3001;

// ─── MIDDLEWARE ────────────────────────────────
app.use(cors({
  origin: '*', // allow file:// and any localhost origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── REQUEST LOGGER ───────────────────────────
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ─── ROUTES ────────────────────────────────────
app.use('/api/location',          require('./routes/location'));
app.use('/api/weather',           require('./routes/weather'));
app.use('/api/crop-intelligence', require('./routes/cropIntelligence'));
app.use('/api/roi',               require('./routes/roi'));
app.use('/api/simulation',        require('./routes/simulation'));
app.use('/api/alerts',            require('./routes/alerts'));
app.use('/api/zones',             require('./routes/zones'));
app.use('/api/chat',              require('./routes/chat'));

// ─── HEALTH CHECK ─────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    server: 'EcoSphere AI Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    ollama: process.env.OLLAMA_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llama3'
  });
});

// ─── 404 HANDLER ──────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ─── ERROR HANDLER ────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── START ────────────────────────────────────
async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   🌍 EcoSphere AI Backend — RUNNING    ║');
    console.log(`║   http://localhost:${PORT}/api/health      ║`);
    console.log('║   🤖 Herms AI: Ollama Llama3           ║');
    console.log('║   🍃 MongoDB: Atlas Connected          ║');
    console.log('╚════════════════════════════════════════╝\n');
  });
}

start();
