/* =============================================
   HERMS — EcoSphere Agricultural AI
   Powered by Ollama Llama3 with MongoDB memory
   ============================================= */

const fetch       = require('node-fetch');
const Conversation = require('./models/Conversation');

const OLLAMA_URL   = process.env.OLLAMA_URL  || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';

const HERMS_SYSTEM_PROMPT = `You are Herms, an expert AI agricultural advisor embedded in EcoSphere AI — a climate-smart agriculture intelligence platform.

Your expertise covers:
- Indian crop cultivation (Rice, Wheat, Maize, Sugarcane, Cotton, Pulses, Vegetables, Fruits)
- Soil health, irrigation scheduling, and water management
- Crop disease detection and prevention (fungal, bacterial, viral)
- Fertilizer recommendations (NPK, organic, micronutrients)
- Climate-smart farming practices
- Government schemes and MSP prices for Indian farmers
- Sustainable and organic farming methods
- Weather-based crop advisory

Your personality:
- You are warm, practical, and speak in simple language a farmer can understand
- You always reference the user's current location and weather when giving advice
- You remember previous conversations and reference them naturally
- You give specific, actionable advice — never vague
- Use emojis occasionally to make responses friendly
- Keep answers concise but complete (3-6 sentences usually)
- If asked in Hindi or Kannada, respond in that language

You introduce yourself as: "Hi! I'm Herms, your EcoSphere agricultural AI advisor."`;

/**
 * Get conversation history from MongoDB for context
 */
async function getHistory(sessionId, limit = 20) {
  try {
    const msgs = await Conversation.find({ sessionId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
    return msgs.reverse(); // oldest first for context
  } catch (err) {
    console.error('getHistory error:', err.message);
    return [];
  }
}

/**
 * Save a message to MongoDB
 */
async function saveMessage(sessionId, role, message, language, context) {
  try {
    await Conversation.create({ sessionId, role, message, language, context });
  } catch (err) {
    console.error('saveMessage error:', err.message);
  }
}

/**
 * Build the Ollama messages array from history + new user message
 */
function buildMessages(history, userMessage, context) {
  const messages = [{ role: 'system', content: HERMS_SYSTEM_PROMPT }];

  // Add location/weather context if available
  if (context && context.location) {
    let ctxNote = `\n[Current context: Location = ${context.location}`;
    if (context.weather) {
      const w = context.weather;
      ctxNote += `, Temp = ${w.temp}°C, Humidity = ${w.hum}%, Rain prob = ${w.rainProb}%`;
      ctxNote += `, Drought risk = ${w.droughtRisk}, Flood risk = ${w.floodRisk}`;
    }
    if (context.activeCrop) ctxNote += `, Current crop focus = ${context.activeCrop}`;
    ctxNote += ']';
    messages[0].content += ctxNote;
  }

  // Add conversation history
  for (const msg of history) {
    messages.push({
      role: msg.role === 'herms' ? 'assistant' : 'user',
      content: msg.message
    });
  }

  // Add current user message
  messages.push({ role: 'user', content: userMessage });

  return messages;
}

/**
 * Main Herms chat function
 * Returns the AI response string
 */
async function hermsChatAsync(sessionId, userMessage, language = 'en', context = {}) {
  // 1. Save user message to MongoDB
  await saveMessage(sessionId, 'user', userMessage, language, context);

  // 2. Fetch conversation history
  const history = await getHistory(sessionId, 20);

  // 3. Build prompt with context + history
  const messages = buildMessages(history, userMessage, context);

  // 4. Call Ollama
  let hermsReply = '';
  try {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          num_predict: 512
        }
      }),
      timeout: 60000 // 60 second timeout
    });

    if (!response.ok) {
      throw new Error(`Ollama responded with ${response.status}`);
    }

    const data = await response.json();
    hermsReply = data.message?.content || 'I apologize, I could not generate a response. Please try again.';
  } catch (err) {
    console.error('Ollama error:', err.message);
    hermsReply = generateFallbackResponse(userMessage, context);
  }

  // 5. Save Herms reply to MongoDB
  await saveMessage(sessionId, 'herms', hermsReply, language, context);

  return hermsReply;
}

/**
 * Fallback response when Ollama is unavailable
 */
function generateFallbackResponse(userMessage, context) {
  const loc = context?.location || 'your region';
  const msg = userMessage.toLowerCase();
  if (msg.includes('crop') || msg.includes('plant'))
    return `🌾 Based on conditions in ${loc}, I'd recommend checking current soil moisture before planting. Ollama AI is temporarily offline — please ensure Ollama is running with: ollama serve`;
  if (msg.includes('disease') || msg.includes('pest'))
    return `🦠 For disease management in ${loc}: Monitor humidity levels carefully. High humidity (>80%) increases fungal disease risk. Ensure good airflow between plants. Ollama AI is temporarily offline.`;
  if (msg.includes('water') || msg.includes('irrigat'))
    return `💧 Irrigation tip for ${loc}: Water early morning to reduce evaporation. Check soil at 6-inch depth — irrigate when dry. Ollama AI is temporarily offline.`;
  return `🌿 Hi! I'm Herms. I'm having trouble connecting to my AI engine right now. Please make sure Ollama is installed and running: ollama serve. Then try again!`;
}

module.exports = { hermsChatAsync, getHistory, saveMessage };
