// FundPath engine: pure functions over state. No DOM.
const D = s => { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const iso = dt => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
const addDays = (s, n) => { const x = D(s); x.setDate(x.getDate() + n); return iso(x); };
const todayIso = () => iso(new Date());
const daysBetween = (a, b) => Math.round((D(b) - D(a)) / 86400000);
function bizDays(a, b) { let n = 0, x = D(a); const end = D(b); while (x < end) { x.setDate(x.getDate() + 1); const d = x.getDay(); if (d !== 0 && d !== 6) n++; } return n; }
const money = n => { const a = Math.abs(n || 0); const c = Math.abs(a - Math.round(a)) > 0.004 && a < 1000; return (n < 0 ? "-$" : "$") + (c ? a.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : Math.round(a).toLocaleString("en-US")); };
const cents = n => Math.round((n || 0) * 100) / 100;
const RANK = { ok: 0, info: 0, warn: 1, deny: 2 };
const worst = flags => flags.reduce((w, f) => RANK[f.level] > RANK[w] ? f.level : w, "ok");
const lc = s => String(s || "").toLowerCase();
const norm = s => " " + lc(s).replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ") + " ";
function findWord(text, words) { const t = norm(text); return words.find(w => t.includes(" " + lc(w).replace(/[^a-z0-9 ]/g, " ").trim() + " ")); }
function inBreak(start, end, S) { if (!start) return null; const e = end || start; return S.breaks.find(b => !(e < b.start || start > b.end)) || null; }
function fmtD(s) { return s ? D(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"; }
const TIER_ROMAN = { 1: "I", 2: "II", 3: "III", 4: "IV" };
function closestHub(name, hub) {
  const toks = s => lc(s).replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(w => w.length > 2);
  const a = toks(name); let best = null, score = 0;
  hub.forEach(h => { const b = toks(h); const s = a.filter(w => b.some(x => x.startsWith(w.slice(0, 5)) || w.startsWith(x.slice(0, 5)))).length; if (s > score) { score = s; best = h; } });
  return score >= 1 ? best : null;
}

// ---------- Org-level rules ----------
function orgStanding(org) {
  const debt = +org.debt || 0;
  let debtPen = 0, blocked = null;
  if (debt >= 2500) blocked = `Account is ${money(debt)} in debt. Orgs $2,500+ in debt can't request ASG funding.`;
  else if (debt >= 500) debtPen = 0.5; else if (debt >= 150) debtPen = 0.25;
  const sweepPen = (org.priorSpendPct != null && org.priorSpendPct < 75 && !org.sweepExempt) ? 0.25 : 0;
  const mult = (1 - debtPen) * (1 - sweepPen);
  return { debt, debtPen, sweepPen, mult, blocked };
}
function eventPct(e, org) {
  if (e.type === "Trip") return { pct: 100, met: [], note: "Overnight trips are decided at a live hearing" };
  const met = [];
  if (e.onCampus) met.push("On campus"); if (e.educational) met.push("Educational");
  if (e.openToAll && !e.admission) met.push("Open to all"); if (org.spendHistory) met.push("Spending history");
  let pct = met.length * 25;
  if (pct < 100 && e.service) { met.push("Service (subsidiary)"); pct += 25; }
  if (pct < 100 && e.lateNight) { met.push("Late night (subsidiary)"); pct += 25; }
  return { pct: Math.min(100, pct), met };
}

// =============== ASG Funding Proposal (the original budget) ===============
function evaluateProposal(p, org, S) {
  const C = {}; [1, 2, 3, 4, 5, 6, 7].forEach(n => C[n] = []);
  const add = (n, f) => C[n].push(f);
  const ev = id => p.events.find(e => e.id === id);
  const amt = l => +l.amount || 0;
  const st = orgStanding(org);
  const tierMax = S.tierMax[org.tier] || 0;
  const room = cents(Math.min(tierMax, S.globalCycle) - (+p.prior || 0));
  const total = cents(p.lines.reduce((s, l) => s + amt(l), 0));
  const capFix = (lines, limit, label) => ({ type: "cap", ids: lines.map(l => l.id).join(","), value: limit, label: `Cap at ${money(limit)}` + (label ? "" : "") });

  // 1. Eligibility + accurate info
  const missing = [];
  if (!org.name) missing.push("organization");
  if (!/@miamioh\.edu$/i.test(org.entityEmail || "")) missing.push("entity email");
  if (!org.president || !/@miamioh\.edu$/i.test(org.presidentEmail || "")) missing.push("president");
  if (!org.treasurer || !/@miamioh\.edu$/i.test(org.treasurerEmail || "")) missing.push("treasurer");
  if (!org.advisor) missing.push("advisor");
  if (!/^SA1\d{4}$/.test(org.worktag || "")) missing.push("SA1#### worktag");
  if (missing.length) add(1, { rule: "ELIGINFO", level: "deny", msg: `Step 1 is missing: ${missing.join(", ")}.`, fix: { type: "org", label: "Open org profile" } });
  if (!org.redBrick || !org.tier) add(1, { rule: "TIERMAX", level: "deny", msg: "No Red Brick Rewards tier on record in Miami Central." });
  if ((+org.undergradPct || 0) < 80) add(1, { rule: "UNDERGRAD", level: "deny", msg: `Membership is ${org.undergradPct}% undergraduate. ASG requires at least 80%.` });
  if (st.blocked) add(1, { rule: "DEBT", level: "deny", msg: st.blocked });
  if ((+org.deficitSemesters || 0) > 1) add(1, { rule: "DEFICIT", level: "deny", msg: "Account has been in deficit for more than one semester, so the org isn't eligible this cycle." });
  if (total > room + 0.001) add(1, { rule: "TIERMAX", level: "deny", msg: `Requesting ${money(total)}, but Tier ${TIER_ROMAN[org.tier]} allows ${money(Math.min(tierMax, S.globalCycle))} this semester${p.prior ? ` and ${money(p.prior)} was already received` : ""}. Cut ${money(total - room)}.` });
  if (st.debtPen) add(1, { rule: "DEBT", level: "info", msg: `Debt of ${money(st.debt)}: ${st.debtPen * 100}% penalty applies until it's paid off.` });
  if (st.sweepPen) add(1, { rule: "SWEEP", level: "info", msg: `Spent ${org.priorSpendPct}% of last cycle's funds, under the 75% minimum: 25% reduction this cycle.` });

  // 2. Itemized
  p.lines.forEach(l => {
    const words = lc(l.item).replace(/[^a-z ]/g, " ").split(/\s+/).filter(Boolean);
    if (!l.item || l.item.trim().length < 4 || words.every(w => VAGUE.includes(w))) add(2, { rule: "ITEMIZED", level: "deny", line: l.id, msg: `"${l.item || "(blank)"}" isn't itemized. Name the specific expense.`, fix: { type: "focus", label: "Itemize" } });
    if (!(amt(l) > 0)) add(2, { rule: "ITEMIZED", level: "deny", line: l.id, msg: "Amount is missing." });
    const c = CATS[l.cat];
    if (!c) add(2, { rule: "ITEMIZED", level: "deny", line: l.id, msg: "Pick an ASG category." });
    else if ((c.sec === "event" || c.sec === "trip") && !ev(l.eventId)) add(2, { rule: "ITEMIZED", level: "deny", line: l.id, msg: "Pick which event or trip this belongs to." });
  });

  // 3. Registered on Miami Central (exact name)
  p.events.forEach(e => {
    if (!(org.hub || []).includes(e.name)) {
      const near = closestHub(e.name, org.hub || []);
      add(3, { rule: "HUBMATCH", level: "deny", event: e.id, msg: near ? `"${e.name}" doesn't exactly match Miami Central. The listing is "${near}".` : `"${e.name}" isn't registered on Miami Central. Register the event first.`, fix: near ? { type: "hubname", label: `Use "${near}"`, value: near } : null });
    }
  });

  // 4. Steps completed
  const ack = p.ack || {};
  if (!(ack.hub && ack.itemized && ack.quotes && ack.noGuarantee)) add(4, { rule: "ELIGINFO", level: "deny", msg: "Confirm the four acknowledgements in Step 1.", fix: { type: "ack", label: "Confirm all" } });
  if (!p.lines.length) add(4, { rule: "ITEMIZED", level: "deny", msg: "Add at least one budget line." });
  p.events.forEach(e => { if (!p.lines.some(l => l.eventId === e.id)) add(4, { rule: "ITEMIZED", level: "warn", event: e.id, msg: `"${e.name}" has no budget lines.`, fix: { type: "delEvent", label: "Remove event" } }); });
  const t = todayIso();
  if (t < S.window.open || t > S.window.close) add(4, { rule: "DEADLINE", level: "deny", msg: `${S.semester} ${S.cycle} applications are open ${fmtD(S.window.open)} – ${fmtD(S.window.close)}.` });

  // 5. Follows the rules
  const inCat = (pred) => p.lines.filter(l => CATS[l.cat] && pred(CATS[l.cat], l));
  const sum = ls => cents(ls.reduce((s, l) => s + amt(l), 0));
  const limits = [];
  const limit = (key, label, lines, lim, rule, note) => { const req = sum(lines); limits.push({ key, label, req, limit: lim, rule, note }); if (req > lim + 0.001) add(5, { rule, level: "deny", msg: `${label}: ${money(req)} is over the ${money(lim)} limit.`, fix: capFix(lines, lim) }); };
  limits.push({ key: "total", label: `Total (Tier ${TIER_ROMAN[org.tier]})`, req: total, limit: room, rule: "TIERMAX", note: "per semester, incl. prior funding" });
  limit("food", "Food", inCat(c => c.group === "food"), S.tierFood[org.tier] || 0, "LIMFOOD", "by tier: $500 / $750 / $1,000");
  limit("speakers", "Speakers", inCat(c => c.group === "speakers"), Math.min(S.speakers, S.speakersSR), "LIMSPEAK", "template $3,000 · SR $7,000");
  limit("admin", "Administrative", inCat(c => c.sec === "admin" && c.group === "admin"), Math.min(S.admin, S.adminSR), "ADMIN", "template $1,000 · SR $1,500");
  // per-semester and per-event categorical caps
  const capKeys = {};
  p.lines.forEach(l => { const c = CATS[l.cat]; if (c && c.cap) { const k = c.cap.per === "event" ? `${c.cap.key}@${l.eventId}` : c.cap.key; (capKeys[k] = capKeys[k] || { c, lines: [] }).lines.push(l); } });
  Object.values(capKeys).forEach(({ c, lines }) => {
    if (c.cap.tier4exempt && org.tier === 4) return;
    const e = c.cap.per === "event" ? ev(lines[0].eventId) : null;
    limit(c.cap.key + (e ? e.id : ""), `${l2(c)}${e ? " · " + e.name : ""}`, lines, c.cap.amt, c.cap.rule, c.cap.per === "event" ? "per event" : "per semester");
  });
  // trips
  p.events.filter(e => e.type === "Trip").forEach(e => {
    const n = +e.travelers || 0, nights = +e.nights || 0;
    const hotelCap = Math.min(Math.ceil(n / S.perRoom) * S.hotelPerRoomNight * nights, S.hotelPerPerson * n * nights);
    const hotel = p.lines.filter(l => l.eventId === e.id && CATS[l.cat] && CATS[l.cat].group === "hotel");
    if (hotel.length) limit("hotel" + e.id, `Hotel · ${e.name}`, hotel, hotelCap, "LIMHOTEL", `${Math.ceil(n / S.perRoom)} rooms × $130 × ${nights} nights`);
    const fl = p.lines.filter(l => l.eventId === e.id && CATS[l.cat] && CATS[l.cat].group === "flight");
    if (fl.length) limit("flight" + e.id, `Airfare · ${e.name}`, fl, S.flightPerPerson * n, "LIMFLIGHT", `$200 × ${n} travelers`);
    if (nights > 0) add(5, { rule: "OVERNIGHT", level: "warn", event: e.id, msg: `"${e.name}" is an overnight trip, so it goes to a live hearing with an itinerary (SR §13).` });
    const b = inBreak(e.start, e.end, S); if (b) p.lines.filter(l => l.eventId === e.id).forEach(l => add(5, { rule: "BREAKTRIP", level: "deny", line: l.id, msg: `"${e.name}" falls during ${b.name}.`, fix: { type: "remove", label: "Remove line" } }));
  });
  // per line
  p.lines.forEach(l => {
    const c = CATS[l.cat] || {}; const e = ev(l.eventId); const text = `${l.item} ${l.comment}`;
    const bad = findWord(text, PROHIBITED_WORDS);
    if (bad) add(5, { rule: "PROHIBITED", level: "deny", line: l.id, msg: `"${bad}" can't be bought with student org funds.`, fix: { type: "remove", label: "Remove line" } });
    const nf = NOTFUNDED_WORDS.find(([w]) => findWord(text, [w]));
    if (nf && !bad) add(5, { rule: "NOTFUNDED", level: "deny", line: l.id, msg: `ASG doesn't fund ${nf[1]} (SR §19.1).`, fix: { type: "remove", label: "Remove line" } });
    if (c.third && !l.quote) add(5, { rule: "QUOTES3P", level: "deny", line: l.id, msg: `Third-party ${c.group === "speakers" ? "speaker" : "vendor"} needs a written quote. Without it, none of ${e ? `"${e.name}"` : "this event"}'s expenses are approved.`, fix: { type: "quote", label: "Attach quote" } });
    else if (!c.third && (c.group === "hotel" || c.group === "flight" || amt(l) > S.quoteOver) && !l.quote) add(5, { rule: "QUOTES", level: "deny", line: l.id, msg: `Quote required (${c.group === "hotel" ? "hotel" : c.group === "flight" ? "flight" : "over $1,000"}).`, fix: { type: "quote", label: "Attach quote" } });
    if (c.capital) {
      if (amt(l) > S.capitalQuoteOver && !l.quote && amt(l) <= S.quoteOver) add(5, { rule: "CAPITAL", level: "deny", line: l.id, msg: "Capital items over $300 need a written estimate or online quote.", fix: { type: "quote", label: "Attach quote" } });
      if (!org.hasStorage) add(5, { rule: "CAPITAL", level: "deny", line: l.id, msg: "Capital items need an office or storage space to keep them." });
      if (["Capital: Recreational electronics", "Capital: Musical instruments", "Capital: Lab materials"].includes(l.cat)) add(5, { rule: "LIMCAP", level: "warn", line: l.id, msg: "This category is only funded when it matches the org's primary purpose. The committee decides." });
    }
    if (c.group === "food") {
      if (e && !e.educational) add(5, { rule: "LIMFOOD", level: "deny", line: l.id, msg: "Food is only funded at educational events (SR §19.1)." });
      else if (!/sample|educational|tasting|demo/i.test(text)) add(5, { rule: "LIMFOOD", level: "warn", line: l.id, msg: "Say the food is sample-size and part of the educational program (SR §19.1).", fix: { type: "comment", label: "Write it for me" } });
    }
  });

  // 6. Purpose of ASG funding (event criteria + justification)
  p.events.forEach(e => { if (e.type === "Trip") return; const r = eventPct(e, org); if (r.pct < 100) add(6, { rule: "EVENTCRIT", level: "info", event: e.id, msg: `"${e.name}" meets ${r.met.length ? r.met.join(", ") : "no criteria"}, so it's funded at ${r.pct}%.` }); if (e.admission) add(6, { rule: "FUNDRAISE", level: "warn", event: e.id, msg: `"${e.name}" charges admission, so it counts as a fundraiser. Disclose it and report sales.` }); });
  p.lines.forEach(l => { if (amt(l) >= S.justifyOver && (l.comment || "").trim().length < 15) add(6, { rule: "PURPOSE", level: "warn", line: l.id, msg: `Explain how this ${money(amt(l))} line serves the event and students.`, fix: { type: "comment", label: "Write it for me" } }); });
  // 7. Org purpose
  if ((p.purpose || "").trim().length < 40) add(7, { rule: "PURPOSE", level: "warn", msg: "Add a sentence on how this plan serves your constitution's purpose.", fix: { type: "purpose", label: "Write it for me" } });

  const criteria = [[1, "Club is eligible for the amount and info is accurate"], [2, "Budget is sufficiently itemized"], [3, "Events and trips are registered on Miami Central"], [4, "All steps properly completed"], [5, "Budget follows the rules"], [6, "In line with the purpose of ASG funding"], [7, "In line with the purpose of the organization"]]
    .map(([n, title]) => ({ n, title, flags: C[n], level: worst(C[n]) }));
  const flags = criteria.flatMap(c => c.flags.map(f => ({ ...f, crit: c.n })));
  const lineLevel = {}; flags.forEach(f => { if (f.line) lineLevel[f.line] = RANK[f.level] > RANK[lineLevel[f.line] || "ok"] ? f.level : (lineLevel[f.line] || "ok"); });
  // Recommended award: event lines × criteria %, then penalties
  const lineAward = {};
  p.lines.forEach(l => { const e = ev(l.eventId); const pct = e ? eventPct(e, org).pct : 100; lineAward[l.id] = cents(amt(l) * pct / 100 * st.mult); });
  const award = cents(Object.values(lineAward).reduce((s, x) => s + x, 0));
  const passed = criteria.filter(c => c.level === "ok").length;
  const auto = !flags.some(f => f.level === "warn" || f.level === "deny");
  return { criteria, flags, lineLevel, limits, total, room, award, lineAward, passed, auto, standing: st };
}
function l2(c) { const k = Object.keys(CATS).find(x => CATS[x] === c) || ""; return k.replace(/^(Event|Admin|Capital|Trip): /, ""); }

// =============== Meeting transcript → budget ===============
const NUMWORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, fifteen: 15, twenty: 20, a: 1, an: 1 };
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
const CAT_KEYS = [
  ["Event: Guest Speaker", /speaker|honorari|keynote|panelist|guest lectur/],
  ["Event: Entertainer / DJ", /\bdj\b|band|performer|entertain/],
  ["Event: Sound & recording", /sound system|recording|videograph/],
  ["Event: Space Fee", /room fee|space fee|venue fee|room rental|reserve the room/],
  ["Event: Decorations", /decor|tablecloth|balloon|centerpiece/],
  ["Event: Crafting supplies", /craft/],
  ["Admin: Organizational materials", /software|subscription|canva|website|domain|pitchbook|capital iq|notion|zoom/],
  ["Admin: Banners", /banner/],
  ["Admin: Office supplies", /\bpens\b|office supplies|printer ink/],
  ["Capital: Electronics", /printer|camera|laptop|computer|projector|monitor|tablet/],
  ["Admin: Storage", /storage/],
  ["Trip: Hotel", /hotel|lodging/], ["Trip: Flight", /flight|airfare/], ["Trip: Gas", /\bgas\b|fuel/], ["Trip: Charter bus", /charter|\bbus\b/],
  ["Event: Promotional materials", /flyer|poster|handout|promo|marketing/],
  ["Event: Food (sample-size)", /snack|food|pizza|lunch|dinner|cater|refreshment|coffee|bagel|cookies|chipotle/],
  ["Event: Other", /shirt|apparel|hoodie|drinks|beer|wine|supplies|materials|prizes|ticket/]
];
function parseAmount(s) {
  const t = lc(s);
  const each = t.match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve|fifteen|twenty)\s+(?:alumni\s+|guest\s+|outside\s+)?(?:\w+\s+)?(?:speakers?|panelists?|people|items|rooms|tickets)\b[^$]*?\$\s?([\d,]+(?:\.\d+)?)\s*(?:each|apiece|per)/);
  if (each) { const q = NUMWORDS[each[1]] || +each[1] || 1; return { amount: q * +each[2].replace(/,/g, ""), qty: q, unit: +each[2].replace(/,/g, "") }; }
  const m = t.match(/\$\s?([\d,]+(?:\.\d+)?)|([\d,]+(?:\.\d+)?)\s*(?:dollars|bucks)/);
  if (!m) return null;
  return { amount: +(m[1] || m[2]).replace(/,/g, "") };
}
function parseDate(s) {
  const t = lc(s).replace(/(\d)(st|nd|rd|th)\b/g, "$1"); const now = new Date();
  const pad = n => String(n).padStart(2, "0");
  let mo = 0, d = 0, y = 0, m;
  if ((m = t.match(/\b(20\d\d)[-/.](\d{1,2})[-/.](\d{1,2})\b/))) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else if ((m = t.match(/\b(\d{1,2})\s+(?:of\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?(?:,?\s+(20\d\d))?/))) { mo = MONTHS[m[2]]; d = +m[1]; y = m[3] ? +m[3] : 0; }
  else if ((m = t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})\b(?:,?\s+(20\d\d|\d\d)\b)?/))) { mo = MONTHS[m[1]]; d = +m[2]; y = m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : 0; }
  else if ((m = t.match(/\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](20\d\d|\d\d))?\b/))) { mo = +m[1]; d = +m[2]; y = m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : 0; }
  if (!mo || mo > 12 || !d || d > 31) return "";
  if (!y) { y = now.getFullYear(); if (mo < now.getMonth() + 1 - 2) y++; }
  const dt = new Date(y, mo - 1, d); if (dt.getMonth() !== mo - 1) return "";
  return `${y}-${pad(mo)}-${pad(d)}`;
}
const LEFTSTOP = ["we", "i", "our", "need", "needs", "want", "wants", "get", "buy", "also", "and", "a", "an", "the", "some", "can", "could", "to", "for", "do", "order", "bringing", "bring", "in", "maybe", "about", "around", "like", "new"];
const RIGHTSTOP = ["for", "in", "on", "from", "so", "because", "which", "that", "to", "with"];
const NUMW = Object.keys(NUMWORDS);
function itemLabel(sentence, re, hub) {
  const toks = sentence.split(/\s+/).filter(Boolean);
  const clean = w => w.replace(/^[^a-zA-Z0-9$]+|[^a-zA-Z0-9]+$/g, "");
  const inHub = i => (hub || []).some(h => { const hw = lc(h).split(" "); for (let k = Math.max(0, i - hw.length + 1); k <= i; k++) if (hw.every((w, j) => lc(clean(toks[k + j] || "")) === w)) return true; return false; });
  let i = toks.findIndex((w, k) => re.test(lc(w)) && !inHub(k));
  if (i < 0) return "";
  let a = i, b = i;
  while (a - 1 >= 0 && !LEFTSTOP.includes(lc(clean(toks[a - 1]))) && !NUMW.includes(lc(clean(toks[a - 1]))) && !/[,.?!$\d]/.test(toks[a - 1])) a--;
  if (lc(clean(toks[a - 1] || "")) === "new") a--;
  while (b + 1 < toks.length && !/[,.?!]$/.test(toks[b]) && !RIGHTSTOP.includes(lc(clean(toks[b + 1]))) && !/[$\d]/.test(toks[b + 1])) b++;
  let words = toks.slice(a, b + 1).map(clean).filter(Boolean);
  while (words.length && ["at", "and", "of"].includes(lc(words[words.length - 1]))) words.pop();
  while (words.length > 1 && ["of", "about", "around", "some"].includes(lc(words[0]))) words.shift();
  const x = words.join(" ");
  return x.charAt(0).toUpperCase() + x.slice(1);
}
function extractFromTranscript(text, org) {
  const sentences = String(text).replace(/\r/g, "").split(/(?<=[.!?])\s+|\n+/).map(s => s.replace(/^\s*[A-Z][a-zA-Z .]{0,30}:\s*/, "").trim()).filter(Boolean);
  const events = []; const lines = []; let cur = null; const heard = [];
  const getEvent = name => { let e = events.find(x => x.name === name); if (!e) { e = { id: "E" + (events.length + 1), type: "Event", name, start: "", end: "", onCampus: false, educational: false, openToAll: false, service: false, lateNight: false, admission: false, travelers: 0, nights: 0 }; events.push(e); } return e; };
  sentences.forEach(s => {
    const t = lc(s);
    const hubHit = (org.hub || []).find(h => t.includes(lc(h)) || lc(h).split(" ").filter(w => w.length > 3).every(w => t.includes(w)));
    if (hubHit) cur = getEvent(hubHit);
    if (/non-event|admin|operating|for the club in general|club-wide|for the office/.test(t) && !hubHit) cur = null;
    if (cur) {
      const d = parseDate(s); if (d && !cur.start) cur.start = d;
      if (/farmer|armstrong|shriver|on campus|king library|upham|benton|campus/.test(t)) cur.onCampus = true;
      if (/workshop|speaker|learn|educational|panel|training|teach|lecture|case study|valuation|modeling/.test(t)) cur.educational = true;
      if (/free|open to (all|everyone|any)|everyone|any student|all students/.test(t)) cur.openToAll = true;
      if (/charge|admission|tickets? (are|cost)/.test(t)) cur.admission = true;
      if (/service|volunteer/.test(t)) cur.service = true;
      if (/hotel|overnight|nights?\b/.test(t)) { cur.type = "Trip"; const n = t.match(/(\w+)\s+nights?/); if (n) cur.nights = NUMWORDS[n[1]] || +n[1] || cur.nights; const tr = t.match(/(\w+)\s+(?:members|students|people|travelers)/); if (tr) cur.travelers = NUMWORDS[tr[1]] || +tr[1] || cur.travelers; }
    }
    const a = parseAmount(s);
    if ((!a || !a.amount) && /quotes?|estimates?/.test(t) && lines.length) { const lastE = cur ? lines.filter(l => l.eventId === cur.id) : [lines[lines.length - 1]]; lastE.forEach(l => { l.quote = true; }); }
    if (!a || !a.amount) return;
    const hit = CAT_KEYS.find(([, re]) => re.test(t)); if (!hit) return;
    let cat = hit[0];
    if (cat === "Event: Promotional materials" && !cur) cat = "Admin: Paper supplies";
    if (CATS[cat].sec === "event" && !cur) cat = cat === "Event: Food (sample-size)" ? cat : cat;
    const quote = /quote|estimate|invoice/.test(t);
    const item = (itemLabel(s, hit[1], org.hub) || cat.replace(/^\w+: /, "")) + (a.qty ? ` (${a.qty} × ${money(a.unit)})` : "");
    lines.push({ id: "L" + (lines.length + 1), eventId: CATS[cat].sec === "event" || CATS[cat].sec === "trip" ? (cur ? cur.id : "") : "", item, cat, amount: a.amount, comment: s.length > 160 ? s.slice(0, 157) + "…" : s, quote });
    heard.push({ s, cat, amount: a.amount });
  });
  return { events, lines, heard };
}

// =============== Ledger ===============
function approvedProposal(state, orgId) { return state.proposals.find(p => p.orgId === orgId && p.semester === state.settings.semester && p.status === "approved"); }
const ACTIVE_SPEND = ["advisor", "review", "approved", "pickup", "active", "closed"];
function spendLineAmt(l) { return cents((+l.qty || 0) * (+l.unit || 0)); }
function approvedAmt(l) { return l.approved != null ? +l.approved : +l.amount; }
function ledgerFor(state, orgId) {
  const p = approvedProposal(state, orgId);
  const lines = [];
  if (p) p.lines.forEach(l => {
    const approved = approvedAmt(l);
    const committed = cents(state.spend.filter(s => s.orgId === orgId && s.fund === "ASG" && ACTIVE_SPEND.includes(s.status)).reduce((t, s) => t + (s.kind === "REQ" ? (s.lineRef === l.id ? +s.amount : 0) : s.lines.filter(x => x.lineRef === l.id).reduce((u, x) => u + spendLineAmt(x), 0)), 0));
    const spent = cents(state.txns.filter(x => x.orgId === orgId && x.lineRef === l.id).reduce((t, x) => t + x.amount, 0) + ((p.journalPaid || {})[l.id] ? approved : 0) + state.spend.filter(s => s.kind === "REQ" && s.lineRef === l.id && s.status === "closed").reduce((t, s) => t + +s.amount, 0));
    lines.push({ l, p, approved, committed, spent, avail: cents(approved - Math.max(committed, spent)), route: (CATS[l.cat] || {}).route || "card" });
  });
  const sum = k => cents(lines.reduce((s, x) => s + x[k], 0));
  const cards = state.spend.filter(s => s.orgId === orgId && s.kind === "SA" && ["active", "closed", "pickup"].includes(s.status));
  const loaded = cents(cards.reduce((t, s) => t + s.lines.reduce((u, x) => u + spendLineAmt(x), 0), 0));
  const cardSpent = cents(state.txns.filter(x => x.orgId === orgId && cards.some(c => c.id === x.saId)).reduce((t, x) => t + x.amount, 0));
  const org = state.orgs.find(o => o.id === orgId);
  const agencyIn = cents(state.deposits.filter(d => d.orgId === orgId && d.recorded).reduce((t, d) => t + d.amount, 0));
  const agencyCommitted = cents(state.spend.filter(s => s.orgId === orgId && s.fund === "Agency" && ACTIVE_SPEND.includes(s.status)).reduce((t, s) => t + (s.kind === "REQ" ? +s.amount : s.lines.reduce((u, x) => u + spendLineAmt(x), 0)), 0));
  const approvedTot = sum("approved"), spentTot = sum("spent");
  return { p, lines, approved: approvedTot, committed: sum("committed"), spent: spentTot, avail: sum("avail"), loaded, cardSpent, cardBal: cents(loaded - cardSpent), agency: cents((org.agencyBalance || 0) + agencyIn - agencyCommitted), agencyIn, spentPct: approvedTot ? Math.round(spentTot / approvedTot * 100) : 0 };
}

// =============== Spend (second line of review) ===============
function evaluateSpend(s, state) {
  const S = state.settings;
  const org = state.orgs.find(o => o.id === s.orgId);
  const p = approvedProposal(state, s.orgId);
  const flags = [], lineFlags = {};
  const lf = (id, f) => { (lineFlags[id] = lineFlags[id] || []).push(f); flags.push({ ...f, lineId: id }); };
  const r = org.readiness || {};
  if (!(r.hub && r.terms && r.module && r.access === "approved")) flags.push({ rule: "TRAINING", level: "deny", msg: "Treasurer isn't Workday-authorized yet." });
  if (todayIso() > S.saCutoff || (s.end && s.end > S.saCutoff)) flags.push({ rule: "JUNE1", level: "deny", msg: `Spend Authorizations aren't accepted after ${fmtD(S.saCutoff)}.` });
  const led = ledgerFor(state, s.orgId);
  const otherCommitted = id => cents(state.spend.filter(x => x.id !== s.id && x.orgId === s.orgId && x.fund === "ASG" && ACTIVE_SPEND.includes(x.status)).reduce((t, x) => t + (x.kind === "REQ" ? (x.lineRef === id ? +x.amount : 0) : x.lines.filter(y => y.lineRef === id).reduce((u, y) => u + spendLineAmt(y), 0)), 0));
  if (s.kind === "REQ") {
    const pl = p && p.lines.find(l => l.id === s.lineRef);
    if (s.fund === "ASG" && !pl) flags.push({ rule: "SAMATCH", level: "deny", msg: "Not tied to a line in the approved ASG budget." });
    if (pl && +s.amount > approvedAmt(pl) - otherCommitted(pl.id) + 0.001) flags.push({ rule: "SAMATCH", level: "deny", msg: `${money(+s.amount)} is more than the ${money(approvedAmt(pl) - otherCommitted(pl.id))} approved for "${pl.item}".` });
    if (!s.seaApproved) flags.push({ rule: "CONTRACT", level: "deny", msg: "Contract hasn't been reviewed and approved by SEA yet." });
    if (!s.supplier) flags.push({ rule: "CONTRACT", level: "warn", msg: "Vendor isn't in Workday yet (Payment Works, via SEA)." });
    if (!s.indemnity) flags.push({ rule: "CONTRACT", level: "warn", msg: "Indemnification/insurance agreement not attached." });
    if (s.payeeMiami) flags.push({ rule: "PAYMIAMI", level: "deny", msg: "Payee is a Miami student or employee." });
    return { flags, lineFlags, level: worst(flags), total: +s.amount || 0, slips: 0 };
  }
  const total = cents(s.lines.reduce((t, l) => t + spendLineAmt(l), 0));
  if (s.fund === "ASG" && !p) flags.push({ rule: "FUNDSFIRST", level: "deny", msg: "No approved ASG proposal this semester, so ASG funds can't be spent yet." });
  if ((s.justification || "").trim().length < 80) flags.push({ rule: "JUSTIFY", level: "warn", msg: "Justification is thin. List vendors, events and whether any clothing has Miami's name/logo." });
  if (s.descr === "ADD FUNDS" && !/^\d{4}$/.test(s.cardLast4 || "")) flags.push({ rule: "JUSTIFY", level: "warn", msg: "Adding funds: include the existing card's last 4 digits." });
  if (!s.proofBudget) flags.push({ rule: "JUSTIFY", level: "warn", msg: "Attach proof of budget." });
  if (!s.proofFunds) flags.push({ rule: "PROOFFUNDS", level: "warn", msg: "Attach proof of funds (balance report)." });
  if (s.fund === "Agency" && total > led.agency + (ACTIVE_SPEND.includes(s.status) ? total : 0) + 0.001) flags.push({ rule: "FUNDSFIRST", level: "deny", msg: `Agency balance is ${money(led.agency)}; this needs ${money(total)}.` });
  if (s.descr === "RENTAL/GAS CARDS") { const Rr = s.rental || {}; if (Rr.vendor === "Enterprise" && +Rr.youngest < 21) flags.push({ rule: "RENTAL", level: "deny", msg: "Enterprise blocks drivers under 21. Use Hertz." }); if (Rr.van && (+Rr.youngest < 21 || !Rr.vanTraining)) flags.push({ rule: "RENTAL", level: "deny", msg: "Van drivers must be 21+ with van training." }); }
  s.lines.forEach(l => {
    const amt = spendLineAmt(l); const text = `${l.memo} ${l.desc} ${l.vendor}`;
    const pl = p && p.lines.find(x => x.id === l.lineRef);
    if (l.cashAdvance) lf(l.id, { rule: "CASHADV", level: "deny", msg: "'Cash Advance Requested' is checked." });
    const bad = findWord(text, PROHIBITED_WORDS);
    if (bad) lf(l.id, { rule: "PROHIBITED", level: "deny", slip: !!pl, msg: pl ? `Memo says "${bad}". This line was approved as "${pl.item}", so the funding review couldn't have seen it.` : `"${bad}" is prohibited.` });
    const nf = NOTFUNDED_WORDS.find(([w]) => findWord(text, [w]));
    if (nf && !bad) lf(l.id, { rule: "NOTFUNDED", level: "deny", slip: !!pl, msg: `Memo describes ${nf[1]}, which ASG doesn't fund (SR §19.1).${pl ? ` It was approved as "${pl.item}".` : ""}` });
    if (findWord(text, ONCAMPUS) && !(pl && (CATS[pl.cat] || {}).route === "journal")) lf(l.id, { rule: "JOURNAL", level: "deny", slip: !!pl, msg: "On-campus charge. Pay it by worktag journal transfer, not the card." });
    if (s.fund === "ASG") {
      if (!pl) lf(l.id, { rule: "SAMATCH", level: "deny", msg: "Doesn't match any line in the approved ASG budget (SR §16.3)." });
      else {
        const left = cents(approvedAmt(pl) - otherCommitted(pl.id) - s.lines.filter(x => x.lineRef === pl.id && x.id !== l.id).reduce((t, x) => t + spendLineAmt(x), 0));
        if (amt > left + 0.001) lf(l.id, { rule: "SAMATCH", level: "deny", msg: `${money(amt)} is over the ${money(left)} approved for "${pl.item}" (SR §16.4).` });
        const route = (CATS[pl.cat] || {}).route;
        if (route === "contract") lf(l.id, { rule: "CONTRACT", level: "deny", msg: "Speakers/entertainers are paid by contract + requisition, not the card." });
        if (route === "journal") lf(l.id, { rule: "JOURNAL", level: "deny", msg: "Space fees on campus are journal transfers, not card spending." });
        if (l.expense && CATS[pl.cat] && l.expense !== CATS[pl.cat].sc) lf(l.id, { rule: "SAMATCH", level: "warn", msg: `Expense item doesn't match the approved category (${pl.cat}).` });
      }
    } else if (pl) lf(l.id, { rule: "ONEFUND", level: "deny", msg: "This line belongs to the ASG budget but the authorization uses Agency funds." });
  });
  return { flags, lineFlags, level: worst(flags), total, slips: flags.filter(f => f.slip).length };
}

// =============== Deposits ===============
function evaluateDeposit(d) {
  const f = [];
  if (["PayPal", "Venmo", "Square"].includes(d.source)) f.push({ rule: "PROCESSOR", level: "deny", msg: `${d.source} isn't allowed. Use eMarket or an SEA card reader.` });
  if (d.payType === "Mixed (includes AmEx)") f.push({ rule: "AMEX", level: "deny", msg: "Split into two cash sales: Visa/MC/Discover/Debit and AmEx." });
  if (d.source === "PNC deposit" && d.received && d.deposited) { const b = bizDays(d.received, d.deposited); if ((d.amount > 1000 && b > 1) || (d.amount <= 1000 && b > 3)) f.push({ rule: "ORC938", level: "warn", msg: `Deposited ${b} business days after receipt.` }); }
  if (!d.recorded && d.deposited && daysBetween(d.deposited, todayIso()) >= 1) f.push({ rule: "CASHSALE", level: "deny", msg: "Not recorded in Workday within 24 hours. The money isn't assigned to your org yet." });
  if (d.recorded && d.deposited && daysBetween(d.deposited, d.recorded) > 1) f.push({ rule: "CASHSALE", level: "warn", msg: "Recorded more than 24 hours after the deposit." });
  if (d.rc === "RC0330") f.push({ rule: "GIFTS", level: "warn", msg: "Gifts go through University Advancement." });
  if (!d.receipt) f.push({ rule: "CASHSALE", level: "warn", msg: "Attach the receipt photo." });
  return { flags: f, level: worst(f) };
}

// =============== Who has it now ===============
function ownerOf(item, state) {
  const org = state.orgs.find(o => o.id === item.orgId);
  const map = {
    draft: ["You (treasurer)", "Finish and submit"], returned: ["You (treasurer)", "Fix the notes and resubmit"],
    review: item.kind ? ["Accounts Payable + ASG Financial Services", "2–3 business days at AP"] : ["ASG Funding Committee", "Reply within 10 academic days"],
    advisor: [`Advisor · ${org.advisor || "advisor"}`, "Approves in Workday"],
    approved: item.kind === "SA" ? ["Accounts Payable", "Card ready · 107 Roudebush Hall"] : ["Done", "Approved (F&A recommendation to Senate)"],
    active: ["You (treasurer)", "Spend, then answer the Receipts Questionnaire"], closed: ["Done", "Closed; unspent funds released"], denied: ["Done", "Denied"]
  };
  return map[item.status] || ["—", ""];
}

// =============== To-dos ===============
function tasksFor(state, orgId) {
  const out = []; const t = todayIso();
  const org = state.orgs.find(o => o.id === orgId); const r = org.readiness || {};
  if (!(r.hub && r.terms && r.module && r.access === "approved")) out.push({ sev: "deny", rule: "TRAINING", title: "Treasurer Workday access isn't complete", go: "org" });
  state.txns.filter(x => x.orgId === orgId && !x.receiptDone).forEach(x => out.push({ sev: daysBetween(x.date, t) > 14 ? "deny" : "warn", rule: "RECEIPTS", title: `Receipts Questionnaire: ${x.merchant} ${money(x.amount)}`, go: "card" }));
  state.spend.filter(s => s.orgId === orgId && s.kind === "SA" && s.status === "approved").forEach(s => out.push({ sev: "ok", rule: "SAMATCH", title: `${s.id} approved: pick up your card at Accounts Payable, 107 Roudebush Hall`, go: "card" }));
  state.spend.filter(s => s.orgId === orgId && s.kind === "SA" && s.status === "active").forEach(s => out.push({ sev: "ok", rule: "CLOSESA", title: `Close ${s.id} once every receipt is in`, go: "card" }));
  state.deposits.filter(d => d.orgId === orgId).forEach(d => { const e = evaluateDeposit(d); if (e.level === "deny") out.push({ sev: "deny", rule: e.flags[0].rule, title: `Deposit ${money(d.amount)} (${fmtD(d.deposited)}): ${e.flags.find(f => f.level === "deny").msg}`, go: "deposits" }); });
  const led = ledgerFor(state, orgId);
  led.lines.filter(x => x.route === "journal" && !(x.p.journalPaid || {})[x.l.id]).forEach(x => out.push({ sev: "ok", rule: "JOURNAL", title: `Pay "${x.l.item}" (${money(x.approved)}) by worktag journal transfer`, go: "spend" }));
  return out;
}

// =============== Workday payloads ===============
function workdayPayload(s, state) {
  const org = state.orgs.find(o => o.id === s.orgId);
  const fund = s.fund === "ASG" ? { Fund: "FD1000", Program: "PRG040" } : { Fund: "FD9001", Program: "PRG100" };
  return {
    operation: "Submit_Spend_Authorization",
    Spend_Authorization_Data: {
      Company_Reference: "100 Miami University", Spend_Authorization_ID: s.id,
      Start_Date: s.start, End_Date: s.end, Description: s.descr, Business_Purpose_Reference: "Student Org Card Request",
      Currency_Reference: "USD", Justification: s.justification,
      Spend_Authorization_Line_Data: s.lines.map((l, i) => ({ Line_Order: i + 1, Expense_Item_Reference: l.expense, Quantity: +l.qty, Per_Unit_Amount: +(+l.unit).toFixed(2), Extended_Amount: spendLineAmt(l), Memo: `${l.memo}${l.vendor ? " · Vendor: " + l.vendor : ""}`, Cash_Advance_Requested: false, Worktags: { Student_Organizations_and_Agencies: org.worktag, ...fund } })),
      Attachments: ["Approved ASG proposal (proof of budget)", "Balance report (proof of funds)"]
    }
  };
}

// ---------- Fixes (shared by the editor's "Fix" buttons and the AI budget builder) ----------
function applyFix(p, org, d) {
  const l = d.line ? p.lines.find(x => x.id === d.line) : null;
  switch (d.type) {
    case "hubname": { const e = p.events.find(x => x.id === d.event); if (e) e.name = d.value; break; }
    case "cap": {
      const ids = String(d.ids || "").split(",").filter(Boolean); const inG = p.lines.filter(x => ids.includes(x.id));
      let excess = cents(inG.reduce((t, x) => t + +x.amount, 0) - +d.value);
      for (let i = inG.length - 1; i >= 0 && excess > 0; i--) { const cut = Math.min(+inG[i].amount, excess); inG[i].amount = cents(+inG[i].amount - cut); excess = cents(excess - cut); }
      p.lines = p.lines.filter(x => +x.amount > 0 || !inG.includes(x)); break;
    }
    case "quote": if (l) { l.quote = true; l.quoteFile = "vendor_quote.pdf"; } break;
    case "remove": p.lines = p.lines.filter(x => x.id !== d.line); break;
    case "delEvent": p.events = p.events.filter(x => x.id !== d.event); p.lines.forEach(x => { if (x.eventId === d.event) x.eventId = ""; }); break;
    case "ack": p.ack = { hub: true, itemized: true, quotes: true, noGuarantee: true }; break;
    case "comment": if (l) { const e = p.events.find(x => x.id === l.eventId); const c = CATS[l.cat] || {};
      l.comment = c.group === "food" ? `Sample-size, part of the educational program at ${e ? e.name : "the event"}; open to all Miami students` : c.capital ? `${l.item} is kept by the org for more than a year and stored in our org storage; supports ${org.mission}` : `${l.item} for ${e ? e.name : "the club's general operations"}, open to all Miami students and tied to our mission`; } break;
    case "purpose": p.purpose = `This semester's plan ${p.events.length ? `(${p.events.map(e => e.name).join(", ")}) ` : ""}is open to all Miami students and serves our constitution's purpose to ${org.mission}. Every line is itemized, matched to a Miami Central event, and kept inside ASG's limits.`; break;
  }
}

function autoFixProposal(p, org, S, opts = {}) {
  const changes = [];
  let guard = 80;
  while (guard--) {
    const ev = evaluateProposal(p, org, S);
    const f = ev.flags.find(z => z.fix && !["focus", "org", "ack", "quote"].includes(z.fix.type) && !(z.fix.type === "comment" && z.rule === "LIMFOOD"));
    if (!f) break;
    const l = f.line ? p.lines.find(z => z.id === f.line) : null; const e = f.event ? p.events.find(z => z.id === f.event) : null;
    const before = l ? +l.amount : 0; const oldName = e ? e.name : "";
    applyFix(p, org, { type: f.fix.type, line: f.line, event: f.event, ids: f.fix.ids, value: f.fix.value });
    const why = f.msg;
    if (f.fix.type === "remove") changes.push({ kind: "removed", what: l ? `${l.item} (${money(before)})` : "line", why, rule: f.rule });
    else if (f.fix.type === "cap") changes.push({ kind: "capped", what: `Capped at ${money(+f.fix.value)}`, why, rule: f.rule });
    else if (f.fix.type === "delEvent") changes.push({ kind: "dropped", what: `Event "${e ? e.name : ""}"`, why: "Nothing fundable left for it", rule: f.rule });
    else if (f.fix.type === "hubname") changes.push({ kind: "renamed", what: `"${oldName}" → "${f.fix.value}"`, why, rule: f.rule });
    else if (f.fix.type === "comment") changes.push({ kind: "wrote", what: `Comment for ${l ? l.item : "line"}`, why: "ASG asks how each line serves students", rule: f.rule });
    else if (f.fix.type === "purpose") changes.push({ kind: "wrote", what: "Purpose statement", why: "Criterion 7", rule: f.rule });
  }
  if (opts.comments) p.lines.forEach(l => { if ((l.comment || "").trim().length < 15 || opts.comments === "all") { l.said = l.comment; applyFix(p, org, { type: "comment", line: l.id }); } });
  return changes;
}

// AI budget builder: meeting transcript -> ASG proposal that follows every rule.
// It removes what ASG won't fund, caps what's over a limit, fixes names and writes comments.
// It never invents a quote: anything still missing stays flagged for a person.
function aiBuildBudget(text, org, S) {
  const x = extractFromTranscript(text, org);
  const p = { id: "draft", orgId: org.id, semester: S.semester, prior: 0, ack: {}, purpose: "", events: x.events, lines: x.lines };
  const heard = cents(p.lines.reduce((t, l) => t + +l.amount, 0));
  const changes = autoFixProposal(p, org, S);
  p.lines.forEach(l => { l.said = l.comment; applyFix(p, org, { type: "comment", line: l.id }); });
  const ev = evaluateProposal(p, org, S);
  return { p, changes, heard, ev, extracted: x };
}

if (typeof module !== "undefined") module.exports = { evaluateProposal, evaluateSpend, evaluateDeposit, ledgerFor, tasksFor, ownerOf, money, extractFromTranscript, eventPct, orgStanding, workdayPayload, applyFix, aiBuildBudget, autoFixProposal };
