// Vercel serverless function: ElevenLabs speech-to-text (Scribe) for meeting recordings.
// Body: { audio: <base64>, mime: "audio/webm" }. Needs ELEVENLABS_API_KEY.
module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!require('../public-config').paidServicesEnabled) return res.status(501).json({ error: "Live transcription is paused for the cost-free demo. No provider request was made." });
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return res.status(501).json({ error: "ElevenLabs not configured" });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    if (!body.audio) return res.status(400).json({ error: "audio required" });
    const bytes = Buffer.from(body.audio, "base64");
    const fd = new FormData();
    fd.append("model_id", "scribe_v1");
    fd.append("file", new Blob([bytes], { type: body.mime || "audio/webm" }), "meeting.webm");
    const r = await fetch("https://api.elevenlabs.io/v1/speech-to-text", { method: "POST", headers: { "xi-api-key": key }, body: fd });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(502).json({ error: "elevenlabs " + r.status, detail: j });
    return res.status(200).json({ text: j.text || "" });
  } catch (e) {
    return res.status(502).json({ error: String(e.message || e) });
  }
};
