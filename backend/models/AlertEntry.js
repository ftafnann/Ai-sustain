const mongoose = require('mongoose');
const AlertSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  location:  { type: String },
  alerts: [{
    type:        String,
    icon:        String,
    title:       String,
    description: String,
    confidence:  Number,
    action:      String
  }],
  timestamp: { type: Date, default: Date.now }
});
module.exports = mongoose.model('AlertEntry', AlertSchema);
