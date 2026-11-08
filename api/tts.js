// Vercel serverless function: ElevenLabs text-to-speech for FundPath's voice.
// Needs ELEVENLABS_API_KEY. Optional: ELEVENLABS_VOICE_ID, ELEVENLABS_MODEL.
// Without a key it returns 501 and the browser falls back to its built-in voice.
// Voices are premade ElevenLabs voices available in every workspace; the old default
// (Rachel, 21m00Tcm4TlvDq8ikWAM) isn't in newer libraries, which forced the browser voice.
const VOICES = {
  fundpath: "cgSgspJ2msm6clMCkdW9", // Jessica: warm, bright, young American
  maya: "cgSgspJ2msm6clMCkdW9",     // sample meeting: president
  jordan: "bIHbv24MWmeRgasZH58o",   // Will: relaxed, young American (treasurer)
  sam: "IKne3meq5aSn9XLyUdCD",      // Charlie: energetic (VP Events)
  river: "SAz9YHcvj6GT2YYXdXww",    // River: relaxed, neutral (VP Education)
  chris: "iP95p4xoKVk53GoZ742B",    // Chris: down-to-earth (VP Marketing)
  roger: "CwhRBWXzGAHq8TQ4Fs17",    // Roger: laid-back (VP Social)
  backup: "cjVigY5qzO86Huf0OWal"    // Eric: smooth, trustworthy
};
module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return res.status(501).json({ error: "ElevenLabs not configured" });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const text = String(body.text || "").slice(0, 1200);
    if (!text) return res.status(400).json({ error: "text required" });
    const who = String(body.voice || "fundpath").toLowerCase();
    const voices = [...new Set([VOICES[who], who === "fundpath" ? process.env.ELEVENLABS_VOICE_ID : null, VOICES.fundpath, VOICES.backup].filter(Boolean))];
    const models = [...new Set([process.env.ELEVENLABS_MODEL || "eleven_flash_v2_5", "eleven_multilingual_v2"])];
    let last = null;
    for (const voice of voices) for (const model of models) {
      const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
        method: "POST",
        headers: { "xi-api-key": key, "content-type": "application/json", accept: "audio/mpeg" },
        body: JSON.stringify({ text, model_id: model, voice_settings: { stability: 0.45, similarity_boost: 0.8 } })
      });
      if (r.ok) {
        const buf = Buffer.from(await r.arrayBuffer());
        res.setHeader("content-type", "audio/mpeg");
        res.setHeader("x-fundpath-voice", voice);
        res.setHeader("cache-control", "no-store");
        return res.status(200).send(buf);
      }
      last = { status: r.status, detail: await r.json().catch(() => null) };
      if (r.status === 401 || r.status === 429) break; // bad key / out of credits: retrying won't help
    }
    return res.status(502).json({ error: `ElevenLabs ${last && last.status}`, detail: last && last.detail });
  } catch (e) {
    return res.status(502).json({ error: String(e.message || e) });
  }
};
