const express = require('express');
const router  = express.Router();
const ROIResult = require('../models/ROIResult');

router.post('/', async (req, res) => {
  try {
    const { sessionId, location, inputs, results } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
    const entry = await ROIResult.create({ sessionId, location, inputs, results });
    res.json({ ok: true, id: entry._id });
  } catch (err) {
    console.error('roi route error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/history/:sessionId', async (req, res) => {
  try {
    const data = await ROIResult.find({ sessionId: req.params.sessionId })
      .sort({ timestamp: -1 }).limit(20);
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
