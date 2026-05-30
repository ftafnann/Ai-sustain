const mongoose = require('mongoose');
const LocationSchema = new mongoose.Schema({
  sessionId:   { type: String, required: true, index: true },
  displayName: { type: String },
  lat:         { type: Number },
  lon:         { type: Number },
  source:      { type: String, enum: ['gps','manual','search'], default: 'search' },
  timestamp:   { type: Date, default: Date.now }
});
module.exports = mongoose.model('LocationEntry', LocationSchema);
