// Vercel serverless function: AI narrative drafting + Funding Help answers.
// Needs ANTHROPIC_API_KEY. Without it, returns 501 and the app falls back to
// deterministic templates / rule-matched answers.
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

async function claude(system, user, maxTokens = 600) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] })
  });
  if (!r.ok) throw new Error("upstream " + r.status);
  const j = await r.json();
  return (j.content || []).map(c => c.text || "").join("").trim();
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(501).json({ error: "AI not configured" });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    if (body.mode === "narrative") {
      const f = body.facts || {};
      const text = await claude(
        "You write the justification paragraph for a Miami University ASG student-organization funding request. 90-140 words, plain confident student voice, no headings. Explain who it's open to, what attendees learn, and how it serves the org's constitutional mission. Only use dollar figures that appear in the facts JSON; prefer none except the total.",
        "Facts JSON:\n" + JSON.stringify(f), 400);
      return res.status(200).json({ text });
    }
    if (body.mode === "chat") {
      const rules = body.rules || [];
      const hist = (body.history || []).map(m => `${m.from.toUpperCase()}: ${m.text}`).join("\n");
      const raw = await claude(
        "You are FundPath's funding help assistant for Miami University student org treasurers. Answer ONLY from the rules provided. Be direct, 2-5 sentences, practical next step included. If a rule's kind is 'modeled', say it should be confirmed with an ASG liaison. If the rules don't cover the question, say so and recommend asking a real ASG liaison. Never invent dollar limits not in the rules. End with a final line exactly like: RULES: ID1, ID2 (the rule ids you relied on, or RULES: none).",
        `Org: ${JSON.stringify(body.org || {})}\nRules:\n${JSON.stringify(rules)}\n\nRecent conversation:\n${hist}\n\nQuestion: ${body.question}`, 500);
      const m = raw.match(/RULES:\s*(.*)\s*$/i);
      const ids = m ? m[1].split(/[,\s]+/).map(s => s.trim().toUpperCase()).filter(s => s && s !== "NONE") : [];
      return res.status(200).json({ text: raw.replace(/\n?RULES:.*$/i, "").trim(), rules: ids });
    }
    return res.status(400).json({ error: "unknown mode" });
  } catch (e) {
    return res.status(502).json({ error: String(e.message || e) });
  }
};
