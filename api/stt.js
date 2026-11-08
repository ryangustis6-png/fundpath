// Vercel serverless function: ElevenLabs speech-to-text (Scribe) for meeting recordings.
// Body: { audio: <base64>, mime: "audio/webm" }. Needs ELEVENLABS_API_KEY.
// Returns { text, transcript } where transcript has "Speaker 1: ..." lines when speakers are detected.
module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return res.status(501).json({ error: "ElevenLabs not configured" });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    if (!body.audio) return res.status(400).json({ error: "audio required" });
    const bytes = Buffer.from(body.audio, "base64");
    const mime = String(body.mime || "audio/webm").split(";")[0];
    let last = null;
    for (const model of [process.env.ELEVENLABS_STT_MODEL || "scribe_v1", "scribe_v2"]) {
      const fd = new FormData();
      fd.append("model_id", model);
      fd.append("diarize", "true");
      fd.append("tag_audio_events", "false");
      fd.append("file", new Blob([bytes], { type: mime }), "meeting." + (mime.split("/")[1] || "webm"));
      const r = await fetch("https://api.elevenlabs.io/v1/speech-to-text", { method: "POST", headers: { "xi-api-key": key }, body: fd });
      const j = await r.json().catch(() => ({}));
      if (r.ok) return res.status(200).json({ text: j.text || "", transcript: turns(j), model });
      last = { status: r.status, detail: j };
      if (r.status === 401 || r.status === 429) break;
    }
    return res.status(502).json({ error: `ElevenLabs ${last && last.status}`, detail: last && last.detail });
  } catch (e) {
    return res.status(502).json({ error: String(e.message || e) });
  }
};
function turns(j) {
  const words = Array.isArray(j.words) ? j.words.filter(w => w.type !== "audio_event") : [];
  if (!words.some(w => w.speaker_id)) return [];
  const ids = {}, out = []; let cur, buf = "";
  const name = id => { if (!(id in ids)) ids[id] = "Speaker " + (Object.keys(ids).length + 1); return ids[id]; };
  for (const w of words) { const sp = w.speaker_id || cur; if (sp !== cur) { if (buf.trim()) out.push([name(cur), buf.trim()]); buf = ""; cur = sp; } buf += w.text; }
  if (buf.trim()) out.push([name(cur), buf.trim()]);
  return out;
}
