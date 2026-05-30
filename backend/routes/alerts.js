const express = require('express');
const router  = express.Router();
const AlertEntry = require('../models/AlertEntry');

router.post('/', async (req, res) => {
  try {
    const { sessionId, location, alerts } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
    const entry = await AlertEntry.create({ sessionId, location, alerts });
    res.json({ ok: true, id: entry._id });
  } catch (err) {
    console.error('alerts route error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/history/:sessionId', async (req, res) => {
  try {
    const data = await AlertEntry.find({ sessionId: req.params.sessionId })
      .sort({ timestamp: -1 }).limit(10);
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
