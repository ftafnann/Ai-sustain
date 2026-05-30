const mongoose = require('mongoose');
const ROISchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  location:  { type: String },
  inputs: {
    principal:    Number,
    crop:         String,
    area:         Number,
    optimization: String,
    season:       String
  },
  results: {
    revenue:         Number,
    profit:          Number,
    roiPercent:      Number,
    breakevenMonths: Number,
    waterSavings:    Number,
    carbonCredits:   Number,
    aiNote:          String
  },
  timestamp: { type: Date, default: Date.now }
});
module.exports = mongoose.model('ROIResult', ROISchema);
