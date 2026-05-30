const mongoose = require('mongoose');
const WeatherSchema = new mongoose.Schema({
  sessionId:   { type: String, required: true, index: true },
  location:    { type: String },
  lat:         { type: Number },
  lon:         { type: Number },
  current: {
    temp:        Number,
    feelsLike:   Number,
    humidity:    Number,
    wind:        Number,
    pressure:    Number,
    rainProb:    Number,
    description: String,
    uvVal:       Number,
    aqi:         Number
  },
  risks: {
    droughtRisk: String,
    floodRisk:   String
  },
  forecast7:   { type: mongoose.Schema.Types.Mixed },
  timestamp:   { type: Date, default: Date.now }
});
module.exports = mongoose.model('WeatherEntry', WeatherSchema);
