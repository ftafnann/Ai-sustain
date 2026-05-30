const mongoose = require('mongoose');
const SimSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  location:  { type: String },
  params: {
    rainfall:    Number,
    temperature: Number,
    irrigation:  Number,
    fertilizer:  Number,
    crop:        String
  },
  results: {
    cropHealth:      Number,
    yieldTha:        Number,
    waterDepletion:  Number,
    carbonImpact:    Number,
    economicImpact:  Number,
    recommendations: [String]
  },
  timestamp: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Simulation', SimSchema);
