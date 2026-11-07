// Configuration status only. This endpoint never calls ElevenLabs or returns an API key.
module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Use a read-only request.' });
  res.setHeader('Cache-Control', 'no-store');
  const agentId = process.env.ELEVENLABS_AGENT_ID || '';
  return res.status(200).json({
    agentId: /^agent_[a-zA-Z0-9_-]+$/.test(agentId) ? agentId : '',
    speechConfigured: Boolean(process.env.ELEVENLABS_API_KEY),
    billingVerified: false,
    quoteResearchConfigured: process.env.QUOTE_RESEARCH_ENABLED === 'true' && Boolean(process.env.ANTHROPIC_API_KEY) && (process.env.QUOTE_RESEARCH_ACCESS_CODE || '').length >= 12,
    campusScope: 'Public directory only'
  });
};
