const mongoose = require('mongoose');
const CropIntelSchema = new mongoose.Schema({
  sessionId:      { type: String, required: true, index: true },
  location:       { type: String },
  lat:            { type: Number },
  lon:            { type: Number },
  weatherSummary: { type: mongoose.Schema.Types.Mixed },
  suitableCrops:  [{ name: String, emoji: String, rainNeed: String }],
  unsuitableCrops:[{ name: String, emoji: String }],
  diseaseRisks:   [{ disease: String, risk: String, action: String }],
  irrAdvice:      { type: String },
  uvNote:         { type: String },
  aqiNote:        { type: String },
  timestamp:      { type: Date, default: Date.now }
});
module.exports = mongoose.model('CropIntelligence', CropIntelSchema);
