const mongoose = require('mongoose');
const ZoneSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  location:  { type: String },
  lat:       { type: Number },
  lon:       { type: Number },
  zones: {
    A: mongoose.Schema.Types.Mixed,
    B: mongoose.Schema.Types.Mixed,
    C: mongoose.Schema.Types.Mixed,
    D: mongoose.Schema.Types.Mixed
  },
  timestamp: { type: Date, default: Date.now }
});
module.exports = mongoose.model('ZoneSnapshot', ZoneSchema);
