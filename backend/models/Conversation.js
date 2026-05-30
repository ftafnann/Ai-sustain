const mongoose = require('mongoose');
const ConversationSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  role:      { type: String, enum: ['user', 'herms'], required: true },
  message:   { type: String, required: true },
  language:  { type: String, default: 'en' },
  context: {
    location:   String,
    lat:        Number,
    lon:        Number,
    weather:    mongoose.Schema.Types.Mixed,
    activeCrop: String
  },
  timestamp: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Conversation', ConversationSchema);
