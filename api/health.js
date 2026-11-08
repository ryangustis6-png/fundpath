// GET /api/health          -> which integrations are configured (never returns secrets)
// GET /api/health?check=1  -> also asks ElevenLabs whether the key works (free call, no credits)
module.exports = async (req, res) => {
  const el = !!process.env.ELEVENLABS_API_KEY;
  const out = {
    ok: true,
    elevenlabs: { configured: el },
    anthropic: { configured: !!process.env.ANTHROPIC_API_KEY },
    workday: { mode: process.env.WORKDAY_MODE === "live" && process.env.WORKDAY_HOST ? "live" : "simulated" }
  };
  if (el && (req.query && req.query.check)) {
    try {
      const r = await fetch("https://api.elevenlabs.io/v1/voices/cgSgspJ2msm6clMCkdW9", { headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY } });
      out.elevenlabs.keyCheck = r.ok ? "ok" : r.status === 401 ? "key rejected (401)" : `status ${r.status}`;
    } catch (e) { out.elevenlabs.keyCheck = "unreachable: " + (e.message || e); }
  }
  res.setHeader("cache-control", "no-store");
  res.status(200).json(out);
};
