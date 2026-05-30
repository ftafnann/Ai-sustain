const express = require('express');
const router  = express.Router();
const ZoneSnapshot = require('../models/ZoneSnapshot');

router.post('/', async (req, res) => {
  try {
    const { sessionId, location, lat, lon, zones } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
    const entry = await ZoneSnapshot.create({ sessionId, location, lat, lon, zones });
    res.json({ ok: true, id: entry._id });
  } catch (err) {
    console.error('zones route error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/latest/:sessionId', async (req, res) => {
  try {
    const data = await ZoneSnapshot.findOne({ sessionId: req.params.sessionId })
      .sort({ timestamp: -1 });
    res.json(data || {});
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
