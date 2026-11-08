// Workday integration for Spend Authorizations.
// POST { action: "submit", payload }   -> sends the Submit_Spend_Authorization payload FundPath builds (engine.js workdayPayload)
// GET  ?action=status&ref=SPA-123456   -> current business-process status
//
// WORKDAY_MODE=simulated (default): returns a demo reference; the app moves the request through advisor/AP itself.
// WORKDAY_MODE=live: needs an integration system user (ISU) + API client from Miami IT:
//   WORKDAY_HOST, WORKDAY_TENANT, WORKDAY_CLIENT_ID, WORKDAY_CLIENT_SECRET, WORKDAY_REFRESH_TOKEN,
//   WORKDAY_SUBMIT_PATH (resource path under /ccx/api/ that accepts the payload), WORKDAY_STATUS_PATH.
// Token endpoint follows Workday's standard pattern: https://{host}/ccx/oauth2/{tenant}/token
const env = k => (process.env[k] || "").trim();
const live = () => env("WORKDAY_MODE") === "live" && env("WORKDAY_HOST") && env("WORKDAY_TENANT");

async function token() {
  const basic = Buffer.from(`${env("WORKDAY_CLIENT_ID")}:${env("WORKDAY_CLIENT_SECRET")}`).toString("base64");
  const r = await fetch(`https://${env("WORKDAY_HOST")}/ccx/oauth2/${env("WORKDAY_TENANT")}/token`, {
    method: "POST",
    headers: { authorization: `Basic ${basic}`, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: env("WORKDAY_REFRESH_TOKEN") })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error("Workday sign-in failed (" + r.status + ")");
  return j.access_token;
}
async function call(path, init) {
  if (!path) throw new Error("Workday resource path not configured");
  const url = `https://${env("WORKDAY_HOST")}/ccx/api/${path.replace(/^\/+/, "").replace("{tenant}", env("WORKDAY_TENANT"))}`;
  const r = await fetch(url, { ...init, headers: { authorization: `Bearer ${await token()}`, "content-type": "application/json" } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Workday ${r.status}: ${j.error || j.message || "request failed"}`);
  return j;
}
function check(p) {
  const errs = [];
  const sa = p && (p.Spend_Authorization_Data || p);
  if (!sa) errs.push("Missing payload");
  const txt = JSON.stringify(p || {});
  if (/"Cash_Advance[^"]*"\s*:\s*true/i.test(txt)) errs.push("Cash advance can't be requested for student orgs");
  if (!/SA1\d{4}/.test(txt)) errs.push("Student org worktag (SA1####) is missing");
  return errs;
}
module.exports = async (req, res) => {
  res.setHeader("cache-control", "no-store");
  try {
    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      if (body.action !== "submit") return res.status(400).json({ error: "action must be submit" });
      const errs = check(body.payload);
      if (errs.length) return res.status(422).json({ error: errs.join("; ") });
      if (!live()) return res.status(200).json({ mode: "simulated", ref: "SPA-" + String(Math.floor(100000 + Math.random() * 899999)), status: "In progress · awaiting advisor", at: new Date().toISOString() });
      const j = await call(env("WORKDAY_SUBMIT_PATH"), { method: "POST", body: JSON.stringify(body.payload) });
      return res.status(200).json({ mode: "live", ref: j.id || j.descriptor || j.wid, status: j.status || "Submitted", at: new Date().toISOString() });
    }
    const q = req.query || {};
    if (q.action === "status") {
      if (!live()) return res.status(200).json({ mode: "simulated", ref: q.ref, status: null });
      const j = await call(`${env("WORKDAY_STATUS_PATH").replace(/\/+$/, "")}/${encodeURIComponent(q.ref || "")}`, { method: "GET" });
      return res.status(200).json({ mode: "live", ref: q.ref, status: j.status || j.businessProcessStatus || j.descriptor || "Unknown" });
    }
    return res.status(200).json({ mode: live() ? "live" : "simulated" });
  } catch (e) {
    return res.status(502).json({ error: String(e.message || e) });
  }
};
