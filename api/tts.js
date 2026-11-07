// Vercel serverless function: ElevenLabs text-to-speech for FundPath's voice.
// Needs ELEVENLABS_API_KEY (optional ELEVENLABS_VOICE_ID). Without it, returns 501
// and the browser falls back to its built-in speech voice.
module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return res.status(501).json({ error: "ElevenLabs not configured" });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const text = String(body.text || "").slice(0, 1200);
    if (!text) return res.status(400).json({ error: "text required" });
    const voice = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": key, "content-type": "application/json", accept: "audio/mpeg" },
      body: JSON.stringify({ text, model_id: process.env.ELEVENLABS_MODEL || "eleven_flash_v2_5", voice_settings: { stability: 0.5, similarity_boost: 0.75 } })
    });
    if (!r.ok) return res.status(502).json({ error: "elevenlabs " + r.status });
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader("content-type", "audio/mpeg");
    res.setHeader("cache-control", "no-store");
    return res.status(200).send(buf);
  } catch (e) {
    return res.status(502).json({ error: String(e.message || e) });
  }
};
