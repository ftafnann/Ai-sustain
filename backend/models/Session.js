const mongoose = require('mongoose');
const SessionSchema = new mongoose.Schema({
  sessionId:   { type: String, required: true, unique: true },
  location:    { type: String, default: '' },
  lat:         { type: Number },
  lon:         { type: Number },
  currentCrop: { type: String, default: '' },
  createdAt:   { type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now }
});
module.exports = mongoose.model('Session', SessionSchema);
