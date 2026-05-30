const express = require('express');
const router  = express.Router();
const CropIntelligence = require('../models/CropIntelligence');

// POST /api/crop-intelligence
router.post('/', async (req, res) => {
  try {
    const { sessionId, location, lat, lon, weatherSummary,
            suitableCrops, unsuitableCrops, diseaseRisks,
            irrAdvice, uvNote, aqiNote } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

    const entry = await CropIntelligence.create({
      sessionId, location, lat, lon, weatherSummary,
      suitableCrops, unsuitableCrops, diseaseRisks,
      irrAdvice, uvNote, aqiNote
    });
    res.json({ ok: true, id: entry._id });
  } catch (err) {
    console.error('crop-intelligence route error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/crop-intelligence/latest/:sessionId
router.get('/latest/:sessionId', async (req, res) => {
  try {
    const entry = await CropIntelligence.findOne({ sessionId: req.params.sessionId })
      .sort({ timestamp: -1 });
    res.json(entry || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
