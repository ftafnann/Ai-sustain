const express = require('express');
const router  = express.Router();
const WeatherEntry = require('../models/WeatherEntry');

// POST /api/weather — store weather reading for current location
router.post('/', async (req, res) => {
  try {
    const { sessionId, location, lat, lon, current, risks, forecast7 } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

    const entry = await WeatherEntry.create({ sessionId, location, lat, lon, current, risks, forecast7 });
    res.json({ ok: true, id: entry._id });
  } catch (err) {
    console.error('weather route error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/weather/history/:sessionId — last 10 weather readings
router.get('/history/:sessionId', async (req, res) => {
  try {
    const data = await WeatherEntry.find({ sessionId: req.params.sessionId })
      .sort({ timestamp: -1 }).limit(10);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
