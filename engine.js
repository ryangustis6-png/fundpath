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
function findWord(text, words) { const t = " " + lc(text).replace(/[^a-z0-9 ]/g, " ") + " "; return words.find(w => t.includes(" " + w.trim() + " ") || (w.includes(" ") && t.includes(w))); }
function inBreak(start, end, S) { if (!start) return null; const e = end || start; return S.breaks.find(b => !(e < b.start || start > b.end)) || null; }
function tierLimits(tier, S) { return { max: S.tierMax[tier] || 0, food: S.tierFood[tier] || 0, admin: S.admin, storage: S.storage, speakers: S.speakers }; }
function closestHub(name, hub) {
  const n = lc(name).replace(/[^a-z0-9]/g, "");
  let best = null, score = 0;
  hub.forEach(h => { const k = lc(h).replace(/[^a-z0-9]/g, ""); let s = 0; for (let i = 0; i < Math.min(n.length, k.length); i++) if (n[i] === k[i]) s++; if (k.includes(n) || n.includes(k)) s += 5; if (s > score) { score = s; best = h; } });
  return score >= 4 ? best : null;
}

// =============== ASG Funding Proposal (the original budget) ===============
function evaluateProposal(p, org, S) {
  const L = tierLimits(org.tier, S);
  const C = n => ({ n, flags: [] });
  const cr = { 1: C(1), 2: C(2), 3: C(3), 4: C(4), 5: C(5), 6: C(6), 7: C(7) };
  const add = (n, f) => cr[n].flags.push(f);
  const ev = id => p.events.find(e => e.id === id);

  // 1. Eligible for amount + info accurate
  const missing = [];
  if (!org.name) missing.push("organization");
  if (!/@miamioh\.edu$/i.test(org.entityEmail || "")) missing.push("entity email (@miamioh.edu)");
  if (!org.president || !/@miamioh\.edu$/i.test(org.presidentEmail || "")) missing.push("president + email");
  if (!org.treasurer || !/@miamioh\.edu$/i.test(org.treasurerEmail || "")) missing.push("treasurer + email");
  if (!org.advisor) missing.push("advisor");
  if (!/^SA1\d{4}$/.test(org.worktag || "")) missing.push("SA1#### worktag");
  if (missing.length) add(1, { rule: "ELIGINFO", level: "deny", msg: `Step 1 is missing or invalid: ${missing.join(", ")}.`, fix: { type: "org", label: "Open org profile" } });
  if (!org.redBrick || !org.tier) add(1, { rule: "TIERMAX", level: "deny", msg: "No Red Brick Rewards tier on record from Miami Central, so the org isn't eligible yet." });
  const total = cents(p.lines.reduce((s, l) => s + (+l.amount || 0), 0));
  const room = cents(L.max - (+p.prior || 0));
  if (total > room) add(1, { rule: "TIERMAX", level: "deny", msg: `Requesting ${money(total)} but Tier ${org.tier} allows ${money(L.max)} per semester${p.prior ? ` and ${money(p.prior)} was already received` : ""}. Cut ${money(total - room)}.` });
  if (org.penalty) add(1, { rule: "PENALTY", level: "warn", msg: "Active ASG penalty: 25% reduction applies, and the committee reviews this proposal manually." });

  // 2. Itemized
  p.lines.forEach(l => {
    const words = lc(l.item).replace(/[^a-z ]/g, " ").split(/\s+/).filter(Boolean);
    if (!l.item || l.item.trim().length < 4 || words.every(w => VAGUE.includes(w))) add(2, { rule: "ITEMIZED", level: "deny", line: l.id, msg: `"${l.item || "(blank)"}" isn't itemized. Name the specific expense.`, fix: { type: "focus", label: "Itemize" } });
    if (!(+l.amount > 0)) add(2, { rule: "ITEMIZED", level: "deny", line: l.id, msg: "Amount is missing." });
    if (CATS[l.cat] && (CATS[l.cat].event || CATS[l.cat].trip) && !ev(l.eventId)) add(2, { rule: "ITEMIZED", level: "deny", line: l.id, msg: "Pick which event or trip this line belongs to." });
    if (!CATS[l.cat]) add(2, { rule: "ITEMIZED", level: "deny", line: l.id, msg: "Pick an ASG category." });
  });

  // 3. HUB listing
  p.events.forEach(e => {
    if (!(org.hub || []).includes(e.name)) {
      const near = closestHub(e.name, org.hub || []);
      add(3, { rule: "HUBMATCH", level: "deny", event: e.id, msg: near ? `"${e.name}" doesn't exactly match the HUB. The HUB lists "${near}".` : `"${e.name}" isn't listed on the HUB. Create the event in Miami Central first.`, fix: near ? { type: "hubname", label: `Use "${near}"`, value: near } : null });
    }
  });

  // 4. Steps completed
  const ack = p.ack || {};
  if (!(ack.hub && ack.itemized && ack.quotes && ack.noGuarantee)) add(4, { rule: "ELIGINFO", level: "deny", msg: "Confirm all four acknowledgements in Step 1.", fix: { type: "ack", label: "Confirm all" } });
  if (!p.lines.length) add(4, { rule: "ITEMIZED", level: "deny", msg: "Add at least one budget line." });
  p.events.forEach(e => { if (!p.lines.some(l => l.eventId === e.id)) add(4, { rule: "ITEMIZED", level: "warn", event: e.id, msg: `"${e.name}" has no budget lines. Remove it or add its costs.`, fix: { type: "delEvent", label: "Remove event" } }); });
  const t = todayIso();
  if (t < S.window.open || t > S.window.close) add(4, { rule: "DEADLINE", level: "deny", msg: `The ${S.semester} proposal window is ${fmtD(S.window.open)} – ${fmtD(S.window.close)}.` });

  // 5. Follows the rules
  const sum = g => cents(p.lines.filter(l => CATS[l.cat] && CATS[l.cat].group === g).reduce((s, l) => s + (+l.amount || 0), 0));
  const limits = [
    { key: "food", label: "Food", limit: L.food, req: sum("food"), rule: "LIMFOOD", note: "by tier ($500 / $750 / $1,000)" },
    { key: "admin", label: "Admin", limit: L.admin, req: sum("admin"), rule: "LIMADMIN", note: "always $1,000" },
    { key: "storage", label: "Storage", limit: L.storage, req: sum("storage"), rule: "LIMSTORE", note: "always $1,000" },
    { key: "speakers", label: "Speakers", limit: L.speakers, req: sum("speakers"), rule: "LIMSPEAK", note: "always $3,000" }
  ];
  let hotelCap = 0, flightCap = 0;
  p.events.filter(e => e.type === "Trip").forEach(e => { hotelCap += (+e.hotelPeople || 0) * (+e.hotelNights || 0) * S.hotelPerNight; flightCap += (+e.flightPeople || 0) * S.flightPerPerson; });
  limits.push({ key: "hotel", label: "Hotel", limit: hotelCap, req: sum("hotel"), rule: "LIMHOTEL", note: "$50 × people × nights" });
  limits.push({ key: "flight", label: "Flight", limit: flightCap, req: sum("flight"), rule: "LIMFLIGHT", note: "$300 × people" });
  limits.push({ key: "total", label: "Total", limit: room, req: total, rule: "TIERMAX", note: `Tier ${org.tier} max${p.prior ? " less prior funding" : ""}` });
  limits.forEach(x => { if (x.key !== "total" && x.req > x.limit + 0.001) add(5, { rule: x.rule, level: "deny", msg: `${x.label} is ${money(x.req)}, over the ${money(x.limit)} limit.`, fix: { type: "capGroup", label: `Cap ${x.label.toLowerCase()} at ${money(x.limit)}`, group: x.key, value: x.limit } }); });
  p.lines.forEach(l => {
    const c = CATS[l.cat] || {};
    const needsQuote = c.group === "hotel" || c.group === "flight" || (+l.amount > S.quoteOver);
    if (needsQuote && !l.quote) add(5, { rule: "QUOTES", level: "deny", line: l.id, msg: `Quote required (${c.group === "hotel" ? "hotel" : c.group === "flight" ? "flight" : "over $1,000"}).`, fix: { type: "quote", label: "Attach quote" } });
    const bad = findWord(`${l.item} ${l.comment}`, PROHIBITED_WORDS);
    if (bad) add(5, { rule: "PROHIBITED", level: "deny", line: l.id, msg: `"${bad.trim()}" is a prohibited purchase for student org funds.`, fix: { type: "remove", label: "Remove line" } });
    const e = ev(l.eventId);
    if (e && e.type === "Trip" && c.trip) { const b = inBreak(e.start, e.end, S); if (b) add(5, { rule: "BREAKTRIP", level: "deny", line: l.id, msg: `"${e.name}" falls during ${b.name}.`, fix: { type: "remove", label: "Remove line" } }); }
  });

  // 6–7. Purpose / justification
  p.lines.forEach(l => { if ((+l.amount || 0) >= S.justifyOver && (l.comment || "").trim().length < 15) add(6, { rule: "PURPOSE", level: "warn", line: l.id, msg: `Explain how this ${money(+l.amount)} line serves the event and the org.`, fix: { type: "comment", label: "Write it for me" } }); });
  if ((p.purpose || "").trim().length < 40) add(7, { rule: "PURPOSE", level: "warn", msg: "Add one or two sentences on how this semester's plan serves your constitution's purpose.", fix: { type: "purpose", label: "Write it for me" } });

  const criteria = [
    [1, "Club is eligible for the amount and info is accurate"],
    [2, "Budget is sufficiently itemized"],
    [3, "Events and trips are listed on the HUB"],
    [4, "All steps properly completed"],
    [5, "Budget follows the rules"],
    [6, "In line with the purpose of ASG funding"],
    [7, "In line with the purpose of the organization"]
  ].map(([n, title]) => ({ n, title, flags: cr[n].flags, level: worst(cr[n].flags) }));
  const flags = criteria.flatMap(c => c.flags.map(f => ({ ...f, crit: c.n })));
  const lineLevel = {}; flags.forEach(f => { if (f.line) lineLevel[f.line] = RANK[f.level] > RANK[lineLevel[f.line] || "ok"] ? f.level : (lineLevel[f.line] || "ok"); });
  const eventTotals = p.events.map(e => ({ e, total: cents(p.lines.filter(l => l.eventId === e.id).reduce((s, l) => s + (+l.amount || 0), 0)) }));
  const nonEvent = cents(p.lines.filter(l => !(CATS[l.cat] && (CATS[l.cat].event || CATS[l.cat].trip))).reduce((s, l) => s + (+l.amount || 0), 0));
  const passed = criteria.filter(c => c.level === "ok").length;
  const auto = !flags.some(f => f.level === "warn" || f.level === "deny") && !org.penalty;
  return { criteria, flags, lineLevel, limits, total, room, eventTotals, nonEvent, passed, auto, L };
}
function fmtD(s) { return s ? D(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"; }

// =============== Ledger ===============
function approvedProposal(state, orgId) { return state.proposals.find(p => p.orgId === orgId && p.semester === state.settings.semester && p.status === "approved"); }
const ACTIVE_SPEND = ["advisor", "review", "approved", "pickup", "active", "closed"];
function spendLineAmt(l) { return cents((+l.qty || 0) * (+l.unit || 0)); }
function ledgerFor(state, orgId) {
  const p = approvedProposal(state, orgId);
  const lines = [];
  if (p) p.lines.forEach(l => {
    const approved = l.approved != null ? l.approved : +l.amount;
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
  return { p, lines, approved: sum("approved"), committed: sum("committed"), spent: sum("spent"), avail: sum("avail"), loaded, cardSpent, cardBal: cents(loaded - cardSpent), agency: cents((org.agencyBalance || 0) + agencyIn - agencyCommitted), agencyIn };
}

// =============== Spend (second line of review) ===============
function evaluateSpend(s, state) {
  const S = state.settings;
  const org = state.orgs.find(o => o.id === s.orgId);
  const p = approvedProposal(state, s.orgId);
  const flags = [];
  const lineFlags = {};
  const lf = (id, f) => { (lineFlags[id] = lineFlags[id] || []).push(f); flags.push({ ...f, lineId: id }); };
  const r = org.readiness || {};
  if (!(r.hub && r.terms && r.module && r.access === "approved")) flags.push({ rule: "TRAINING", level: "deny", msg: "Treasurer isn't Workday-authorized yet. Finish the access steps on the dashboard." });
  if (todayIso() > S.saCutoff || (s.end && s.end > S.saCutoff)) flags.push({ rule: "JUNE1", level: "deny", msg: `Spend Authorizations aren't accepted after ${fmtD(S.saCutoff)}.` });
  const led = ledgerFor(state, s.orgId);
  const otherCommitted = id => cents(state.spend.filter(x => x.id !== s.id && x.orgId === s.orgId && x.fund === "ASG" && ACTIVE_SPEND.includes(x.status)).reduce((t, x) => t + (x.kind === "REQ" ? (x.lineRef === id ? +x.amount : 0) : x.lines.filter(y => y.lineRef === id).reduce((u, y) => u + spendLineAmt(y), 0)), 0));

  if (s.kind === "REQ") {
    const pl = p && p.lines.find(l => l.id === s.lineRef);
    if (s.fund === "ASG" && !pl) flags.push({ rule: "SAMATCH", level: "deny", msg: "Not tied to a line in the approved ASG budget." });
    if (pl && +s.amount > (pl.approved ?? +pl.amount) - otherCommitted(pl.id) + 0.001) flags.push({ rule: "SAMATCH", level: "deny", msg: `${money(+s.amount)} is more than the ${money((pl.approved ?? +pl.amount) - otherCommitted(pl.id))} left on "${pl.item}".` });
    if (!s.seaApproved) flags.push({ rule: "CONTRACT", level: "deny", msg: "Contract hasn't been reviewed and approved by SEA yet." });
    if (s.serviceDate && daysBetween(todayIso(), s.serviceDate) < 30 && !s.seaApproved) flags.push({ rule: "CONTRACT", level: "warn", msg: `Service is ${daysBetween(todayIso(), s.serviceDate)} days out. Contracts should be set up a month ahead.` });
    if (!s.supplier) flags.push({ rule: "CONTRACT", level: "warn", msg: "Vendor isn't in Workday yet. Email SEA to add them through Payment Works." });
    if (!s.indemnity) flags.push({ rule: "CONTRACT", level: "warn", msg: "Indemnification/insurance agreement not attached for an on-campus service provider." });
    if (s.payeeMiami) flags.push({ rule: "PAYMIAMI", level: "deny", msg: "Payee is a Miami student or employee." });
    const bad = findWord(`${s.vendor} ${s.memo}`, PROHIBITED_WORDS); if (bad) flags.push({ rule: "PROHIBITED", level: "deny", msg: `"${bad.trim()}" is prohibited.` });
    return { flags, lineFlags, level: worst(flags), total: +s.amount || 0 };
  }

  // Spend Authorization (card)
  const total = cents(s.lines.reduce((t, l) => t + spendLineAmt(l), 0));
  if (s.fund === "ASG" && !p) flags.push({ rule: "FUNDSFIRST", level: "deny", msg: "There's no approved ASG proposal for this semester, so ASG funds can't be spent yet." });
  if ((s.justification || "").trim().length < 80) flags.push({ rule: "JUSTIFY", level: "warn", msg: "Justification is thin. List vendors, event details and whether any clothing has Miami's name/logo." });
  if (s.descr === "ADD FUNDS" && !/^\d{4}$/.test(s.cardLast4 || "")) flags.push({ rule: "JUSTIFY", level: "warn", msg: "Adding funds: include the last 4 digits of the existing card." });
  if (!s.proofBudget) flags.push({ rule: "JUSTIFY", level: "warn", msg: "Attach proof of budget." });
  if (!s.proofFunds) flags.push({ rule: "PROOFFUNDS", level: "warn", msg: "Attach a balance-report screenshot as proof of funds." });
  if (s.fund === "Agency" && total > led.agency + (ACTIVE_SPEND.includes(s.status) ? total : 0) + 0.001) flags.push({ rule: "FUNDSFIRST", level: "deny", msg: `Agency balance is ${money(led.agency)}; this needs ${money(total)}.` });
  if (s.descr === "RENTAL/GAS CARDS") {
    const R = s.rental || {};
    if (R.vendor === "Enterprise" && +R.youngest < 21) flags.push({ rule: "RENTAL", level: "deny", msg: "Enterprise blocks drivers under 21. Book Hertz for 18–20 drivers." });
    if (R.van && (+R.youngest < 21 || !R.vanTraining)) flags.push({ rule: "RENTAL", level: "deny", msg: "Van drivers must be 21+ and finish Risk Management van training first." });
  }
  const clothing = s.lines.some(l => findWord(`${l.memo} ${l.desc}`, ["shirt", "shirts", "tshirt", "hoodie", "hoodies", "apparel", "jersey", "hat", "hats", "quarter zip"]));
  if (clothing && !/logo|licens|trademark/i.test(s.justification || "")) flags.push({ rule: "LICENSING", level: "warn", msg: "Clothing on this request: say whether it has Miami's name/logo (Trademarks & Licensing)." });

  s.lines.forEach(l => {
    const amt = spendLineAmt(l);
    if (l.cashAdvance) lf(l.id, { rule: "CASHADV", level: "deny", msg: "'Cash Advance Requested' is checked. Student org cash advances are returned." });
    const bad = findWord(`${l.memo} ${l.desc} ${l.vendor}`, PROHIBITED_WORDS);
    const pl = p && p.lines.find(x => x.id === l.lineRef);
    if (bad) lf(l.id, { rule: "PROHIBITED", level: "deny", slip: !!pl, msg: pl ? `Memo says "${bad.trim()}". This line was approved as "${pl.item}", so the funding review couldn't see it. Caught on the second line.` : `"${bad.trim()}" is a prohibited purchase.` });
    if (findWord(`${l.memo} ${l.desc} ${l.vendor}`, ONCAMPUS) && !(pl && (CATS[pl.cat] || {}).route === "journal")) lf(l.id, { rule: "JOURNAL", level: "deny", slip: !!pl, msg: "On-campus charge. Pay it by worktag journal transfer, not the card." });
    if (s.fund === "ASG") {
      if (!pl) lf(l.id, { rule: "SAMATCH", level: "deny", msg: "Doesn't match any line in the approved ASG budget." });
      else {
        const left = cents((pl.approved ?? +pl.amount) - otherCommitted(pl.id) - s.lines.filter(x => x.lineRef === pl.id && x.id !== l.id).reduce((t, x) => t + spendLineAmt(x), 0));
        if (amt > left + 0.001) lf(l.id, { rule: "SAMATCH", level: "deny", msg: `${money(amt)} is over the ${money(left)} left on approved line "${pl.item}".` });
        const route = (CATS[pl.cat] || {}).route;
        if (route === "contract") lf(l.id, { rule: "CONTRACT", level: "deny", msg: "Speakers/entertainers are paid by contract + requisition, not the card." });
        if (route === "journal") lf(l.id, { rule: "JOURNAL", level: "deny", msg: "Space fees on campus are journal transfers, not card spending." });
        if (l.expense && CATS[pl.cat] && l.expense !== CATS[pl.cat].sc) lf(l.id, { rule: "SAMATCH", level: "warn", msg: `Expense item differs from the approved category (${pl.cat} → ${CATS[pl.cat].sc}).` });
      }
    } else if (pl) lf(l.id, { rule: "ONEFUND", level: "deny", msg: "This line belongs to the ASG budget but the authorization is coded to Agency funds." });
  });
  return { flags, lineFlags, level: worst(flags), total, slips: flags.filter(f => f.slip).length };
}

// =============== Deposits ===============
function evaluateDeposit(d) {
  const f = [];
  if (["PayPal", "Venmo", "Square"].includes(d.source)) f.push({ rule: "PROCESSOR", level: "deny", msg: `${d.source} isn't allowed. Use eMarket or an SEA card reader.` });
  if (d.payType === "Mixed (includes AmEx)") f.push({ rule: "AMEX", level: "deny", msg: "Split this into two cash sales: one for Visa/MC/Discover/Debit and one for AmEx." });
  if (d.source === "PNC deposit" && d.received && d.deposited) { const b = bizDays(d.received, d.deposited); if ((d.amount > 1000 && b > 1) || (d.amount <= 1000 && b > 3)) f.push({ rule: "ORC938", level: "warn", msg: `Deposited ${b} business days after receipt. ${d.amount > 1000 ? "Over $1,000 is due the next business day." : "Due within 3 business days."}` }); }
  if (!d.recorded && d.deposited && daysBetween(d.deposited, todayIso()) >= 1) f.push({ rule: "CASHSALE", level: "deny", msg: "Not recorded in Workday within 24 hours. The money isn't assigned to your org yet." });
  if (d.recorded && d.deposited && daysBetween(d.deposited, d.recorded) > 1) f.push({ rule: "CASHSALE", level: "warn", msg: "Recorded more than 24 hours after the deposit." });
  if (d.rc === "RC0330") f.push({ rule: "GIFTS", level: "warn", msg: "Gifts use the Gift/Donation procedure through University Advancement." });
  if (!d.receipt) f.push({ rule: "CASHSALE", level: "warn", msg: "Attach the settlement/deposit receipt photo." });
  return { flags: f, level: worst(f) };
}

// =============== Who has it now ===============
function ownerOf(item, state) {
  const org = state.orgs.find(o => o.id === item.orgId);
  const map = {
    draft: ["You (treasurer)", "Finish and submit"],
    returned: ["You (treasurer)", "Fix the committee's notes and resubmit"],
    review: item.kind ? ["Accounts Payable + ASG Financial Services", "2–3 business days after it reaches AP"] : ["ASG Funding Committee", "Reply within 10 academic days"],
    advisor: [`Advisor · ${org.advisor || "org advisor"}`, "Advisor approves in Workday"],
    approved: item.kind === "SA" ? ["Accounts Payable", "Card ready for pickup · 107 Roudebush Hall"] : ["Done", "Approved"],
    pickup: ["You (treasurer)", "Pick up card at 107 Roudebush Hall"],
    active: ["You (treasurer)", "Spend, then answer the Receipts Questionnaire"],
    closed: ["Done", "Closed; encumbered funds released"],
    denied: ["Done", "Denied"],
    submitted: ["FundPath auto-review", "Instant"]
  };
  return map[item.status] || ["—", ""];
}

// =============== To-dos / compliance ===============
function tasksFor(state, orgId) {
  const out = [];
  const t = todayIso();
  const org = state.orgs.find(o => o.id === orgId);
  const r = org.readiness || {};
  if (!(r.hub && r.terms && r.module && r.access === "approved")) out.push({ sev: "deny", rule: "TRAINING", title: "Treasurer Workday access isn't complete", go: "home" });
  state.txns.filter(x => x.orgId === orgId && !x.receiptDone).forEach(x => out.push({ sev: daysBetween(x.date, t) > 14 ? "deny" : "warn", rule: "RECEIPTS", title: `Receipts Questionnaire: ${x.merchant} ${money(x.amount)} (${fmtD(x.date)})`, go: "card" }));
  state.spend.filter(s => s.orgId === orgId && s.kind === "SA" && s.status === "active").forEach(s => { const open = state.txns.filter(x => x.saId === s.id && !x.receiptDone).length; out.push({ sev: "ok", rule: "CLOSESA", title: `Close ${s.id} once all receipts are in${open ? ` (${open} still open)` : ""}`, go: "card" }); });
  state.spend.filter(s => s.orgId === orgId && s.status === "approved" && s.kind === "SA").forEach(s => out.push({ sev: "ok", rule: "SAMATCH", title: `${s.id} approved: pick up the card at Accounts Payable, 107 Roudebush Hall`, go: "spend" }));
  state.deposits.filter(d => d.orgId === orgId).forEach(d => { const e = evaluateDeposit(d); if (e.level === "deny") out.push({ sev: "deny", rule: e.flags[0].rule, title: `Deposit ${money(d.amount)} on ${fmtD(d.deposited)}: ${e.flags.find(f => f.level === "deny").msg}`, go: "deposits" }); });
  const led = ledgerFor(state, orgId);
  led.lines.filter(x => x.route === "journal" && !(x.p.journalPaid || {})[x.l.id]).forEach(x => out.push({ sev: "ok", rule: "JOURNAL", title: `Pay "${x.l.item}" (${money(x.approved)}) by worktag journal transfer`, go: "spend" }));
  return out;
}

if (typeof module !== "undefined") module.exports = { evaluateProposal, evaluateSpend, evaluateDeposit, ledgerFor, tasksFor, ownerOf, money };
