const express = require('express');
const router  = express.Router();
const { hermsChatAsync, getHistory } = require('../herms');

// POST /api/chat — send message to Herms
router.post('/', async (req, res) => {
  try {
    const { sessionId, message, language = 'en', context = {} } = req.body;
    if (!sessionId || !message) {
      return res.status(400).json({ error: 'sessionId and message required' });
    }

    const reply = await hermsChatAsync(sessionId, message, language, context);
    res.json({ ok: true, response: reply, model: 'herms-llama3' });
  } catch (err) {
    console.error('chat route error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chat/history/:sessionId — load previous conversation
router.get('/history/:sessionId', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const history = await getHistory(req.params.sessionId, parseInt(limit));
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/chat/history/:sessionId — clear chat history
router.delete('/history/:sessionId', async (req, res) => {
  try {
    const Conversation = require('../models/Conversation');
    await Conversation.deleteMany({ sessionId: req.params.sessionId });
    res.json({ ok: true, message: 'Conversation history cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
