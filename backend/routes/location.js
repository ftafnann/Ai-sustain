const express = require('express');
const router  = express.Router();
const LocationEntry = require('../models/LocationEntry');
const Session       = require('../models/Session');

// POST /api/location — called every time user sets or changes location
router.post('/', async (req, res) => {
  try {
    const { sessionId, displayName, lat, lon, source = 'search' } = req.body;
    if (!sessionId || !lat || !lon) return res.status(400).json({ error: 'sessionId, lat, lon required' });

    // Always insert NEW entry (every location change = new document)
    const entry = await LocationEntry.create({ sessionId, displayName, lat, lon, source });

    // Upsert session record
    await Session.findOneAndUpdate(
      { sessionId },
      { sessionId, location: displayName, lat, lon, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    res.json({ ok: true, id: entry._id });
  } catch (err) {
    console.error('location route error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
