// FundPath features: exec meeting with clarifying questions + straight-through approval,
// "Talk to FundPath" voice assistant on every page, Excel/CSV budget upload, real-club workspace.

// ---------------------------------------------------------------------------
// Navigation additions
// ---------------------------------------------------------------------------
NAV.treasurer.splice(NAV.treasurer.findIndex(n => n[0] === "proposal") + 1, 0, ["upload", "Upload a budget"]);
NAV.treasurer.find(n => n[0] === "meeting")[1] = "Exec meeting";
LABEL.submitted = "Submitted";

// ---------------------------------------------------------------------------
// Clarifying questions
// ---------------------------------------------------------------------------
const YES = /\b(yes|yeah|yep|yup|correct|right|we do|we have|it is|sure|affirmative|attached)\b/i;
const NO = /\b(no|nope|don'?t|do not|not yet|drop it|remove it|take it out|cut it|skip)\b/i;

function buildQuestions(p, org, S) {
  const ev = evaluateProposal(p, org, S); const qs = []; const seen = new Set();
  const L = id => p.lines.find(l => l.id === id); const E = id => p.events.find(e => e.id === id);
  ev.flags.forEach(f => {
    const l = f.line ? L(f.line) : null, e = f.event ? E(f.event) : null;
    const key = (f.line || f.event || "") + ":" + f.rule; if (seen.has(key)) return; seen.add(key);
    if (l && f.rule === "ITEMIZED" && /itemized/.test(f.msg)) qs.push({ kind: "itemize", line: l.id, text: `What exactly is the ${money(+l.amount)} for "${l.item}"? ASG needs specific items.` });
    else if (l && ["QUOTES3P", "QUOTES", "CAPITAL"].includes(f.rule)) qs.push({ kind: "quote", line: l.id, text: `Do you have a written quote for ${lc(l.item)} (${money(+l.amount)})? ASG won't fund it without one.` });
    else if (l && f.rule === "LIMFOOD" && f.level === "warn") qs.push({ kind: "food", line: l.id, text: `Is the food for ${(E(l.eventId) || {}).name || "that event"} sample-size and part of the program? ASG doesn't fund meals.` });
    else if (e && f.rule === "HUBMATCH" && !(f.fix && f.fix.type === "hubname")) qs.push({ kind: "hub", event: e.id, text: `"${e.name}" isn't registered on Miami Central yet. Keep it in the budget? It would have to go to ASG for review.` });
  });
  p.events.filter(e => e.type === "Event" && !e.start && p.lines.some(l => l.eventId === e.id)).forEach(e => qs.push({ kind: "date", event: e.id, text: `What date is ${e.name}?` }));
  return qs;
}
function answerQuestion(p, org, q, ans) {
  const l = q.line ? p.lines.find(x => x.id === q.line) : null; const e = q.event ? p.events.find(x => x.id === q.event) : null;
  const t = String(ans || "").trim();
  switch (q.kind) {
    case "quote":
      if (YES.test(t) && !/\bno\b/i.test(t)) { if (l) { l.quote = true; l.quoteFile = "quote (confirmed in meeting).pdf"; } return { note: `Quote confirmed for ${l ? l.item : "line"}`, ok: true }; }
      if (l) p.lines = p.lines.filter(x => x !== l); return { note: `Took out ${l ? l.item : "line"}: no written quote`, ok: true };
    case "itemize":
      if (NO.test(t) && t.length < 25) { p.lines = p.lines.filter(x => x !== l); return { note: `Took out ${l ? l.item : "line"}`, ok: true }; }
      if (l && t.length > 3) { const clean = t.replace(/^(it'?s|they'?re|we need|for|just)\s+/i, "").replace(/[.!]$/, ""); l.item = clean.charAt(0).toUpperCase() + clean.slice(1); const hit = CAT_KEYS.find(([c, re]) => re.test(lc(clean)) && CATS[c].sec === CATS[l.cat].sec); if (hit) l.cat = hit[0]; return { note: `Itemized as "${l.item}"`, ok: true }; }
      return { ok: false };
    case "food":
      if (YES.test(t) && !/\bno\b/i.test(t)) { if (l) l.comment = `Sample-size food served during ${(e || p.events.find(x => x.id === l.eventId) || {}).name || "the program"} as part of the educational session; open to all students`; return { note: "Food confirmed sample-size", ok: true }; }
      if (l) p.lines = p.lines.filter(x => x !== l); return { note: "Took out the food (ASG doesn't fund meals)", ok: true };
    case "hub":
      if (YES.test(t) && !NO.test(t)) return { note: `Kept ${e ? e.name : "event"}; ASG will review it`, ok: true, review: true };
      if (e) { p.events = p.events.filter(x => x !== e); p.lines = p.lines.filter(x => x.eventId !== e.id); } return { note: `Dropped ${e ? e.name : "event"}`, ok: true };
    case "date": { const d = parseDate(t); if (e && d) { e.start = d; return { note: `${e.name} set for ${fmtD(d)}`, ok: true }; } return { note: `${e ? e.name : "Event"} date left open`, ok: true }; }
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Straight-through approval: approve only when FundPath is certain
// ---------------------------------------------------------------------------
function confidenceCheck(p, org, ST, ev, sa) {
  const saEv = sa ? evaluateSpend(sa, S) : null; const st = orgStanding(org);
  const lim = ST.tierMax[org.tier] || 0;
  return [
    { ok: ev.passed === 7 && !ev.flags.some(f => f.level === "warn" || f.level === "deny"), t: "All 7 ASG committee criteria pass with no warnings" },
    { ok: p.events.every(e => (org.hub || []).includes(e.name)), t: "Every event is registered on Miami Central under its exact name" },
    { ok: !p.events.some(e => e.type === "Trip"), t: "No overnight trips (those need a live hearing, SR §13)" },
    { ok: p.lines.every(l => !CATS[l.cat] || !(CATS[l.cat].third || CATS[l.cat].quote || l.amount > ST.quoteOver) || l.quote), t: "Written quotes for every third party, hotel, flight and item over $1,000" },
    { ok: ev.total + (+p.prior || 0) <= lim, t: `Within the Tier ${TIER_ROMAN[org.tier]} limit (${money(lim)})` },
    { ok: !st.blocked && !org.debt && !(org.deficitSemesters > 0), t: "No ASG debt, deficit or penalty on record" },
    { ok: (org.readiness || {}).access === "approved", t: "Treasurer has Workday access (SEA training done)" },
    { ok: !sa || saEv.level === "ok", t: "Spend Authorization matches the approved budget line for line" },
    { ok: !!ST.straightThrough, t: "Straight-through approval is turned on by ASG" }
  ];
}

// ---------------------------------------------------------------------------
// Exec meeting v2
// ---------------------------------------------------------------------------
function liveBudget() {
  const m = M(); const o = ORG(); if (!m.transcript.length) return null;
  try { const x = extractFromTranscript(m.transcript.map(([w, t]) => `${w}: ${t}`).join("\n"), o); return x; } catch (e) { return null; }
}
function liveBudgetHtml() {
  const x = liveBudget(); if (!x || !x.lines.length) return `<p class="muted small">Line items show up here as people talk.</p>`;
  const evn = id => (x.events.find(e => e.id === id) || {}).name || "General";
  return `<table class="tbl tight"><thead><tr><th>Heard</th><th>For</th><th class="r">Amount</th></tr></thead><tbody>${x.lines.map(l => `<tr><td>${esc(l.item)}<br><small class="muted">${esc(l.cat)}</small></td><td><small>${esc(evn(l.eventId))}</small></td><td class="r mono">${money(+l.amount)}</td></tr>`).join("")}</tbody><tfoot><tr><td colspan="2"><b>Running total</b></td><td class="r mono"><b>${money(x.lines.reduce((t, l) => t + +l.amount, 0))}</b></td></tr></tfoot></table>`;
}
function paintLive() { const el = $("#live"); if (el) el.innerHTML = liveBudgetHtml(); }

heard = function (text, who) {
  const m = M(); const t = String(text || "").trim(); if (!t) return;
  const speaker = who || UI.speaker || "Exec board";
  if (m.stage === "question") { m.transcript.push([speaker, t]); save(); paintTranscript(); return A.meetAnswer({ v: t }); }
  if (m.stage === "confirm") {
    if (/\b(yes|yeah|yep|yup|approve[ds]?|go ahead|submit( it)?|do it|sounds good|let'?s do it)\b/i.test(t)) { m.transcript.push([speaker, t]); return A.meetYes(); }
    if (/\b(no|nope|wait|hold on|cancel|stop)\b/i.test(t)) { m.transcript.push([speaker, t]); return A.meetNo(); }
  }
  m.transcript.push([speaker, t]); save(); paintTranscript(); paintLive();
  if (/build (our|the|a) budget|fund ?path,? (build|make)|make (our|the) budget|that'?s (it|everything)/i.test(t) && ["idle", "built"].includes(m.stage)) A.meetBuild();
};

function viewMeeting2() {
  const o = ORG(); const m = M(); const b = m.built;
  const q = m.stage === "question" ? m.qs[m.qi] : null;
  const changes = b ? (b.changes || []).filter(c => ["removed", "capped", "dropped", "renamed", "answer"].includes(c.kind)) : [];
  let right = "";
  if (!b && m.stage !== "building") right = `
    <section class="card"><h2>Live budget</h2><div id="live">${liveBudgetHtml()}</div></section>
    <section class="card"><h2>How it works</h2><ol class="howto">
      <li>Run your exec meeting. Go through every event and every item and what it costs.</li>
      <li>Say <b>“FundPath, build our budget.”</b> It applies every ASG rule for Tier ${TIER_ROMAN[o.tier]} and asks out loud about anything it isn't sure of.</li>
      <li>It builds the ASG proposal and the Spend Authorizations, then asks if you want to submit.</li>
      <li>If everything is inside the rules, it's approved on the spot and your card is ready. If not, only the uncertain items go to ASG or your advisor, with the reason.</li></ol></section>`;
  if (m.stage === "building") right = `<section class="card"><h2>Building your budget</h2><p class="muted">Matching events to Miami Central, sorting categories, checking Standing Rules §11 and §19…</p><div class="bar-ind"><i></i></div></section>`;
  if (b) right = `
    <section class="card assistant ${["question", "confirm"].includes(m.stage) ? "ask" : ""}">
      <div class="as-h"><b>FundPath</b><span>${m.stage === "question" ? `Question ${m.qi + 1} of ${m.qs.length}` : b.ev.auto ? `${b.ev.passed}/7 criteria · within limits` : `${b.ev.passed}/7 criteria`}</span></div>
      <p class="as-say">${esc(q ? q.text : m.say || "")}</p>
      ${q ? `<div class="ask-row"><form class="ans" data-a2="meetAns"><input id="ansIn" placeholder="Answer out loud, or type here"><button class="btn">Answer</button></form>${["quote", "food", "hub"].includes(q.kind) ? `<span><button class="btn ghost" data-a="meetAnswer" data-v="no">No</button> <button class="btn" data-a="meetAnswer" data-v="yes">Yes</button></span>` : q.kind === "itemize" ? `<button class="btn ghost" data-a="meetAnswer" data-v="no, remove it">Remove it</button>` : `<button class="btn ghost" data-a="meetAnswer" data-v="not set">Skip</button>`}</div>` : ""}
      ${m.stage === "confirm" ? `<div class="ask-row"><span class="muted small">Say <b>“yes”</b> to submit</span><span><button class="btn ghost" data-a="meetEdit">Edit first</button> <button class="btn ghost" data-a="meetNo">Not yet</button> <button class="btn" data-a="meetYes">Yes, submit</button></span></div>` : ""}
    </section>
    ${changes.length ? `<section class="card"><h2>What FundPath changed</h2><ul class="changes">${changes.map(c => `<li><span class="lv ${c.kind === "removed" || c.kind === "dropped" ? "deny" : c.kind === "answer" ? "ok" : "warn"}">${c.kind === "answer" ? "you said" : c.kind}</span> ${esc(c.what)} ${c.why ? `<small class="muted">${esc(c.why)}</small>` : ""} ${c.rule ? ruleTag(c.rule) : ""}</li>`).join("")}</ul></section>` : ""}
    ${m.payPlan && ["confirm", "running", "done"].includes(m.stage) ? `<section class="card"><h2>How every line gets paid</h2>${payPlanHtml(m.payPlan)}</section>` : ""}
    ${m.pipe.length ? `<section class="card"><h2>Submission</h2><ol class="pipe-v">${m.pipe.map(x => `<li class="${x.done ? (x.warn ? "warn" : "done") : "now"}"><i>${x.done ? (x.warn ? "!" : "✓") : ""}</i><div><b>${esc(x.t)}</b><span>${x.d || ""}</span></div></li>`).join("")}</ol>
      ${m.conf ? `<h3>Approval check</h3><ul class="conf">${m.conf.map(c => `<li class="${c.ok ? "ok" : "no"}"><i>${c.ok ? "✓" : "✕"}</i>${esc(c.t)}</li>`).join("")}</ul>` : ""}
      ${m.stage === "done" ? `<div class="mf"><span class="muted small">${m.outcome === "auto" ? "Nothing else needs an approval." : "Only the items above need a person."}</span><span>${m.outcome === "auto" ? `<button class="btn" data-a="go" data-id="card">Get the card →</button>` : `<button class="btn" data-a="meetToAP">Open ASG / AP view →</button>`}</span></div>` : ""}</section>` : ""}
    ${b.p ? `<details class="collapse card" ${["running", "done"].includes(m.stage) ? "" : ""}><summary>See the filled ASG proposal sheet and funding form</summary>${sheetPreview(b.p, o)}${formPreview(b.p, o)}</details>` : ""}`;
  return `<header class="ph"><div><p class="eyebrow">${esc(o.name)} · Tier ${TIER_ROMAN[o.tier]}</p><h1>Exec meeting</h1><p>${esc(S.settings.semester)} ${esc(S.settings.cycle || "")} · ASG proposals close ${fmtD(S.settings.window.close)} · ${money(S.settings.tierMax[o.tier])} semester limit</p></div>
    <div class="ph-actions"><label class="check vt"><input type="checkbox" data-a="voiceOn" ${VOICE.on ? "checked" : ""}> Spoken replies</label><button class="btn ghost" data-a="meetReset">New meeting</button></div></header>
  <div class="meet">
    <section class="card mic-card"><div class="mic-h"><div id="voiceState" class="vstate">${voiceState()}</div>
      <div class="mic-ctl"><select data-a2="speaker" title="Who's talking">${EXEC.map(x => `<option ${x === (UI.speaker || "Exec board") ? "selected" : ""}>${x}</option>`).join("")}</select><button class="btn" data-a="meetMic">${VOICE.listening ? "Stop listening" : "Start listening"}</button><button class="btn ghost" data-a="meetRecord">${VOICE.recording ? "Stop and transcribe" : "Record (ElevenLabs)"}</button></div></div>
      <div id="transcript" class="transcript">${transcriptHtml()}</div>
      <form class="composer" data-a2="meetType"><input id="meetIn" placeholder="Type what someone said…"><button class="btn ghost">Add</button></form>
      <div class="mic-foot">${m.transcript.length ? `<span class="muted small">${m.transcript.length} lines</span>` : `<button class="btn ghost sm" data-a="meetDemo">Play the demo meeting</button>`}<button class="btn sm" data-a="meetBuild" ${m.transcript.length && ["idle", "built"].includes(m.stage) ? "" : "disabled"}>Build our budget</button></div>
    </section>
    <div>${right}</div>
  </div>`;
}
VIEWS.meeting = viewMeeting2;

function payPlan(p, org) {
  return p.lines.map(l => { const r = (CATS[l.cat] || {}).route || "card"; return { l, route: r, how: r === "card" ? "Spend Authorization (card)" : r === "contract" ? "Contract + requisition (SEA signs)" : r === "journal" ? "Worktag journal transfer" : "Purchase order" }; });
}
function payPlanHtml(pp) {
  return `<table class="tbl tight"><thead><tr><th>Line</th><th>Paid by</th><th class="r">Amount</th></tr></thead><tbody>${pp.map(x => `<tr><td>${esc(x.l.item)}</td><td><small>${esc(x.how)}</small></td><td class="r mono">${money(+x.l.amount)}</td></tr>`).join("")}</tbody></table>`;
}

async function askNext() {
  const m = M(); const o = ORG();
  if (m.qi < m.qs.length) { m.stage = "question"; save(); render(); const q = m.qs[m.qi]; await speak(q.text); if (UI.demoAuto && m.stage === "question" && m.qs[m.qi] === q) { const a = DEMO_ANSWERS[q.kind] || ["Treasurer", "Yes."]; await sleep(900); heard(a[1], a[0]); } return; }
  // all answered: re-run the rules and summarize
  const b = m.built; const more = autoFixProposal(b.p, o, S.settings); b.changes.push(...more);
  applyFix(b.p, o, { type: "ack" }); b.ev = evaluateProposal(b.p, o, S.settings);
  const qs2 = buildQuestions(b.p, o, S.settings).filter(q => !m.asked.includes(q.kind + (q.line || q.event)));
  if (qs2.length) { m.qs.push(...qs2); return askNext(); }
  m.payPlan = payPlan(b.p, o);
  const removed = b.changes.filter(c => c.kind === "removed");
  const card = m.payPlan.filter(x => x.route === "card").reduce((t, x) => t + +x.l.amount, 0);
  const contract = m.payPlan.filter(x => x.route === "contract");
  m.say = `Here's the budget: ${money(b.ev.total)} across ${b.p.lines.length} lines${b.p.events.length ? ` for ${b.p.events.map(e => e.name).join(" and ")}` : ""}${b.p.lines.some(l => !l.eventId) ? " plus club operations" : ""}. ${removed.length ? `I left out ${removed.map(c => c.what.replace(/ \(.*\)$/, "")).map(w => w.charAt(0).toLowerCase() + w.slice(1)).join(" and ")} because ASG doesn't fund ${removed.length > 1 ? "those" : "that"}. ` : ""}${money(card)} goes on a Spend Authorization for the card${contract.length ? `, and ${money(contract.reduce((t, x) => t + +x.l.amount, 0))} for speakers goes on a contract` : ""}. ${b.ev.auto ? "Everything is inside the ASG rules, so it should approve right away." : `${b.ev.flags.length} item${b.ev.flags.length > 1 ? "s" : ""} will need ASG to look at ${b.ev.flags.length > 1 ? "them" : "it"}.`} Do you want me to submit it?`;
  m.stage = "confirm"; save(); render(); speak(m.say);
}

Object.assign(A, {
  meetDemo: async () => { const m = M(); if (VOICE.playing) return; VOICE.playing = true; UI.demoAuto = true; m.stage = "idle"; render();
    for (const [w, t] of DEMO_MEETING) { if (!VOICE.playing) break; await sleep(650 + Math.min(1500, t.length * 8)); heard(t, w); }
    VOICE.playing = false; },
  meetReset: () => { S.meeting = { transcript: [], built: null, stage: "idle", pipe: [] }; VOICE.playing = false; UI.demoAuto = false; save(); render(); },
  meetBuild: async () => { const m = M(); const o = ORG(); if (!m.transcript.length) return; m.stage = "building"; m.pipe = []; m.conf = null; m.payPlan = null; save(); render();
    await sleep(1200);
    const b = aiBuildBudget(m.transcript.map(([w, t]) => `${w}: ${t}`).join("\n"), o, S.settings);
    m.built = b; m.qs = buildQuestions(b.p, o, S.settings); m.qi = 0; m.asked = m.qs.map(q => q.kind + (q.line || q.event));
    logEvt(o.id, `FundPath built a ${money(b.ev.total)} draft budget from the exec meeting`);
    if (m.qs.length) { const intro = `I've got ${b.p.lines.length} line items. ${m.qs.length === 1 ? "One question" : `${m.qs.length} quick questions`} before I build the final budget.`; m.say = intro; m.stage = "question"; save(); render(); await speak(intro); }
    askNext(); },
  meetAnswer: d => { const m = M(); const o = ORG(); if (m.stage !== "question") return; const q = m.qs[m.qi]; const r = answerQuestion(m.built.p, o, q, d.v);
    if (!r.ok) { speak("Sorry, can you say what it's for?"); return; }
    m.built.changes.push({ kind: "answer", what: r.note }); if (r.review) m.built.review = true; m.qi++; save(); askNext(); },
  meetYes: async () => { const m = M(); const o = ORG(); if (m.stage !== "confirm") return; m.stage = "running"; m.pipe = []; m.conf = null; save(); render();
    const step = async (t, d, ms = 850, warn) => { m.pipe.push({ t, d, done: false, warn }); render(); await sleep(ms); m.pipe[m.pipe.length - 1].done = true; save(); render(); };
    const p = materialize(m.built.p, o, "draft"); applyFix(p, o, { type: "ack" });
    await step("Filled out the ASG Club Funding Proposal sheet", `${p.events.length} events · ${p.lines.length} lines · ${money(p.lines.reduce((t, l) => t + +l.amount, 0))}`);
    p.status = "submitted"; p.submittedAt = todayIso();
    await step("Submitted the ASG funding form", `From ${esc(o.entityEmail)}, approved by the exec board in the meeting`);
    const ev = evaluateProposal(p, o, S.settings);
    let conf = confidenceCheck(p, o, S.settings, ev, null);
    const propOk = conf.slice(0, 7).every(c => c.ok) && !m.built.review;
    if (!propOk) {
      p.status = "review"; logEvt(o.id, `${p.id} sent to the ASG Funding Committee: ${conf.filter(c => !c.ok).map(c => c.t).join("; ")}`);
      m.conf = conf; await step("Sent to the ASG Funding Committee", `FundPath wasn't 100% sure, so a person decides: ${conf.filter(c => !c.ok).map(c => esc(c.t)).join("; ") || "items you asked ASG to review"}`, 700, true);
      m.stage = "done"; m.outcome = "review"; save(); render(); speak("Submitted. A couple of things need a person, so it's with the ASG Funding Committee. Everything else is ready to go once they sign off."); return;
    }
    p.status = "approved"; p.decidedBy = "FundPath auto-approval"; p.decidedAt = todayIso(); p.lines.forEach(l => { l.approved = ev.lineAward[l.id] ?? +l.amount; });
    logEvt(o.id, `${p.id} auto-approved: 7/7 criteria, ${money(ev.award)}`);
    await step("Approved: all 7 ASG criteria pass", `${money(ev.award)} · logged as a Finance & Audit recommendation for Senate (SR §3.1)`);
    const r = genSAFor(o.id); const sa = r.sa;
    if (sa) { sa.wd = { status: "Submitted", ref: wdRef(), at: new Date().toISOString() }; sa.history.push({ at: todayIso(), who: "FundPath", action: "Created in Workday", note: `${sa.wd.ref} · built from ${p.id}` }); }
    S.spend.filter(x => x.kind === "REQ" && x.orgId === o.id && x.status === "draft").forEach(x => { x.vendor = x.vendor || x.memo; });
    await step("Created the Workday Spend Authorization", sa ? `${sa.id} · ${sa.descr} · ${money(sa.lines.reduce((t, l) => t + spendLineAmt(l), 0))} for the card · Workday ${sa.wd.ref}` : "No card purchases in this budget");
    if (r.reqs) await step(`Created ${r.reqs} speaker requisition${r.reqs > 1 ? "s" : ""}`, "Speakers are paid by contract. FundPath drafted it; SEA signs the contract (university policy).");
    conf = confidenceCheck(p, o, S.settings, ev, sa); m.conf = conf;
    if (sa && conf.every(c => c.ok)) {
      sa.status = "approved"; sa.cardLast4 = sa.cardLast4 || String(1000 + Math.floor(Math.random() * 8999)); sa.wd.status = "Approved · card funded";
      sa.history.push({ at: todayIso(), who: "FundPath straight-through approval", action: "Approved", note: "Matches the auto-approved proposal line for line; every check passed" });
      logEvt(o.id, `${sa.id} approved straight through. Card ready at 107 Roudebush Hall`);
      await step("Spend Authorization approved automatically", "Every check passed, so no advisor or Accounts Payable step was needed. The card is being loaded.");
      m.stage = "done"; m.outcome = "auto"; save(); render();
      speak(`Done. Your budget is approved for ${money(ev.award).replace(".00", "")}, and spend authorization ${sa.id.replace("-", " ")} is approved too. Your card is ready to pick up at Accounts Payable in Roudebush Hall.`);
    } else if (sa) {
      sa.status = "review"; sa.wd.status = "In progress · awaiting Accounts Payable"; logEvt(o.id, `${sa.id} routed to Accounts Payable: ${conf.filter(c => !c.ok).map(c => c.t).join("; ")}`);
      await step("Routed to Accounts Payable", `Not every check passed: ${conf.filter(c => !c.ok).map(c => esc(c.t)).join("; ")}`, 700, true);
      m.stage = "done"; m.outcome = "review"; save(); render(); speak("Your budget is approved. The spend authorization needs one human check at Accounts Payable before the card is loaded.");
    } else { m.stage = "done"; m.outcome = "auto"; save(); render(); speak("Done. Your budget is approved."); }
  },
  meetEdit: () => { const m = M(); const o = ORG(); const p = materialize(m.built.p, o, "draft"); m.stage = "built"; save(); A.go({ id: "proposal" }); toast(`${p.id} opened in the proposal editor`); }
});
document.addEventListener("submit", e => { const f = e.target.closest("[data-a2=meetAns]"); if (!f) return; e.preventDefault(); const i = $("#ansIn"); const v = i.value.trim(); if (!v) return; M().transcript.push([UI.speaker || "Exec board", v]); A.meetAnswer({ v }); });

// ---------------------------------------------------------------------------
// Talk to FundPath: voice assistant on every page
// ---------------------------------------------------------------------------
const DOCK = { open: false, log: [], rec: null, listening: false };
function voiceDock() {
  if (S.mode === "real" && !S.orgs.length) return "";
  return `<div class="dock ${DOCK.open ? "open" : ""}">
    ${DOCK.open ? `<div class="dock-p"><div class="dock-h"><b>Talk to FundPath</b><button class="x" data-a="dockToggle">×</button></div>
      <div class="dock-log" id="dockLog">${DOCK.log.length ? DOCK.log.map(x => `<div class="dl ${x.who}"><span>${esc(x.text)}</span></div>`).join("") : `<div class="muted small pad">Try: “How much can we still spend?” · “What's our food limit?” · “Start a meeting” · “Check my budget file” · “Submit our proposal” · “Where's our spend authorization?”${S.role === "asg" ? " · “Approve the Banking Club authorization”" : ""}</div>`}</div>
      <form class="dock-in" data-a2="dockSend"><button type="button" class="mic ${DOCK.listening ? "on" : ""}" data-a="dockMic" title="Hold a conversation">${DOCK.listening ? "Stop" : "Speak"}</button><input id="dockIn" placeholder="Ask or tell FundPath…"><button class="btn sm">Send</button></form></div>` : ""}
    <button class="dock-b" data-a="dockToggle">${DOCK.open ? "Close" : "Talk to FundPath"}</button></div>`;
}
function dockSay(text, who = "ai") { DOCK.log.push({ who, text }); const el = $("#dockLog"); if (el) { el.innerHTML = DOCK.log.map(x => `<div class="dl ${x.who}"><span>${esc(x.text)}</span></div>`).join(""); el.scrollTop = el.scrollHeight; } if (who === "ai") speak(text); }
const VIEW_WORDS = [["meeting", /meeting|record/], ["upload", /upload|excel|spreadsheet|file|check (my|our) budget/], ["proposal", /proposal|budget/], ["spend", /spend auth|authorization|\bsa\b/], ["card", /card|receipt/], ["deposits", /deposit|cash sale/], ["workday", /workday/], ["help", /help|liaison|question/], ["rules", /rules?|limits?|settings/], ["home", /dashboard|home/], ["sareview", /spend review|review queue/], ["review", /proposal review/]];
function handleCommand(raw) {
  const t = lc(raw).trim(); const o = ORG(); if (!t) return;
  dockSay(raw, "me");
  const go = v => { const role = Object.keys(NAV).find(r => NAV[r].some(n => n[0] === v)); if (role && !NAV[S.role].some(n => n[0] === v)) S.role = role; A.go({ id: v }); };
  // meeting / build
  if (/start (a |the |our )?(exec )?meeting|record (a |the |our )?meeting|let'?s start/.test(t)) { go("meeting"); if (!VOICE.listening) startListening(); return dockSay("Meeting started. I'm listening. Go through each event and what it costs, and say “FundPath, build our budget” when you're done."); }
  if (/(build|make|create|draft) (a |our |the )?(budget|proposal)/.test(t) && /\$\s?\d|\d+ dollars/.test(t)) { go("meeting"); heard(raw, o.treasurer); return dockSay("Added that to the meeting. Keep going, or say “build our budget.”"); }
  if (/(build|make|create|draft) (a |our |the )?(budget|proposal)/.test(t)) { go("meeting"); if (M().transcript.length) { A.meetBuild(); return dockSay("Building it from the meeting now."); } if (!VOICE.listening) startListening(); return dockSay("Tell me each event and what you need for it, with amounts. I'm listening."); }
  if (/\$\s?\d|\d+ dollars/.test(t) && /for |need|want|buy|get/.test(t)) { go("meeting"); heard(raw, o.treasurer); return dockSay("Got it, added to the meeting budget."); }
  // money questions
  if (/how much|left|remaining|available|balance|can we (still )?spend/.test(t) && o) {
    const led = ledgerFor(S, o.id); const room = (S.settings.tierMax[o.tier] || 0) - led.approved;
    if (/food|speaker|admin|promo|decor/.test(t)) return answerLimit(t, o);
    return dockSay(`${o.name}: ${money(led.approved)} approved this semester and ${money(Math.max(0, room))} of your ${money(S.settings.tierMax[o.tier])} Tier ${TIER_ROMAN[o.tier]} limit left to request. ${money(led.avail)} is approved but not yet authorized, and the card has ${money(led.cardBal)} on it.`);
  }
  if (/limit|cap|max|allowed/.test(t)) return answerLimit(t, o);
  // status
  if (/where|status|what'?s happening|update/.test(t) && o) {
    const p = proposalFor(o.id); const sa = S.spend.filter(s => s.orgId === o.id && s.kind === "SA").slice(-1)[0];
    return dockSay(`${p ? `Proposal ${p.id} is ${(LABEL[p.status] || p.status).toLowerCase()}${p.status === "review" ? " with the ASG Funding Committee" : ""}.` : "No proposal yet this semester."} ${sa ? `${sa.id} is ${(LABEL[sa.status] || sa.status).toLowerCase()}, with ${ownerOf(sa, S)[0]}.` : "No spend authorization yet."}`);
  }
  // actions
  if (/submit/.test(t) && /proposal|budget|it/.test(t) && S.role === "treasurer") { const p = proposalFor(o.id); if (!p || !["draft", "returned"].includes(p.status)) return dockSay("There's no draft proposal to submit right now."); go("proposal"); A.submitProposal(); return dockSay(`Submitting ${p.id}.`); }
  if (/fix (it|everything|all|the budget|my budget)/.test(t)) { go("proposal"); A.fixAllP(); return dockSay("Fixed everything FundPath can fix on its own. Anything left needs your call."); }
  if (/approve/.test(t) && S.role === "asg") { const q = S.spend.filter(s => s.status === "review"); const hit = q.find(s => t.includes(lc(orgById(s.orgId).name).replace("miami university ", "")) || t.includes(lc(s.id))) || (q.length === 1 ? q[0] : null); if (!hit) return dockSay(q.length ? `Which one? ${q.map(s => `${s.id} for ${orgById(s.orgId).name}`).join(", ")}.` : "Nothing is waiting for approval."); if (evaluateSpend(hit, S).level === "deny") return dockSay(`${hit.id} still has failing lines. Open it to approve only the clean lines or return it.`); A.apApprove({ id: hit.id }); return dockSay(`Approved ${hit.id}. The card is loaded and the treasurer has been told.`); }
  if (/picked up|got the card/.test(t)) { const sa = S.spend.find(s => s.orgId === o.id && s.status === "approved"); if (sa) { A.pickup({ id: sa.id }); return dockSay(`Marked ${sa.id}'s card as picked up.`); } }
  // navigation
  if (/^(open|go to|show( me)?|take me to|pull up)\b/.test(t)) { const hit = VIEW_WORDS.find(([, re]) => re.test(t)); if (hit) { go(hit[0]); return dockSay(`Here's ${NAV[S.role].find(n => n[0] === hit[0])[1]}.`); } }
  // rules Q&A
  const a = localAnswer(raw); dockSay(a.text.replace(/\n+/g, " "));
}
function answerLimit(t, o) {
  const st = S.settings; const tier = o.tier;
  const map = [[/food|snack|pizza|catering/, `Food is capped at ${money(st.tierFood[tier])} a semester for Tier ${TIER_ROMAN[tier]}, and only sample-size food that's part of an educational program (SR §19.1).`],
    [/speaker|honorari/, `Speakers are capped at ${money(st.speakers)} a semester under the ASG template (the Standing Rules allow ${money(st.speakersSR)}; FundPath uses the stricter one). Every speaker needs a written quote and is paid by contract.`],
    [/admin|subscription|software/, `Administrative costs are capped at ${money(st.admin)} a semester (template; SR §11 allows ${money(st.adminSR)}).`],
    [/promo|flyer|poster|marketing/, "Promotional materials are capped at $150 per event."], [/decor/, "Decorations are capped at $250 per event."],
    [/banner/, "Banners are capped at $200 a semester, except Tier IV orgs, which are exempt."], [/hotel/, `Hotels: ${money(st.hotelPerRoomNight)} per room-night at four per room, or ${money(st.hotelPerPerson)} per person per night, whichever is lower.`],
    [/flight|airfare/, `Flights are capped at ${money(st.flightPerPerson)} per person.`], [/capital|electronic|equipment/, "Capital items: electronics $2,000, recreational electronics $1,500, instruments $750, costumes $1,000, athletic $2,000 a semester. Anything over $300 needs a quote and you need storage."],
    [/tier|total|semester|overall/, `Tier ${TIER_ROMAN[tier]} can get up to ${money(st.tierMax[tier])} a semester.`]];
  const hit = map.find(([re]) => re.test(t)); dockSay(hit ? hit[1] : `Tier ${TIER_ROMAN[tier]} can get up to ${money(st.tierMax[tier])} a semester. Ask about a category, like food or speakers, for its limit.`);
}
function dockListen() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { toast("Voice input needs Chrome or Edge. You can type instead.", "bad"); return; }
  if (VOICE.listening) stopListening();
  const r = new SR(); r.lang = "en-US"; r.interimResults = true; r.continuous = false; DOCK.rec = r; DOCK.listening = true; render();
  let final = "";
  r.onresult = ev => { let interim = ""; for (let i = ev.resultIndex; i < ev.results.length; i++) { if (ev.results[i].isFinal) final += ev.results[i][0].transcript; else interim += ev.results[i][0].transcript; } const i = $("#dockIn"); if (i) i.value = final || interim; };
  r.onend = () => { DOCK.listening = false; render(); if (final.trim()) handleCommand(final.trim()); };
  r.onerror = () => { DOCK.listening = false; render(); };
  try { r.start(); } catch (e) {}
}
Object.assign(A, {
  dockToggle: () => { DOCK.open = !DOCK.open; render(); if (DOCK.open) setTimeout(() => { const i = $("#dockIn"); if (i) i.focus(); const l = $("#dockLog"); if (l) l.scrollTop = l.scrollHeight; }, 0); },
  dockMic: () => { if (DOCK.listening) { try { DOCK.rec.stop(); } catch (e) {} return; } dockListen(); }
});
document.addEventListener("submit", e => { const f = e.target.closest("[data-a2=dockSend]"); if (!f) return; e.preventDefault(); const i = $("#dockIn"); const v = i.value; i.value = ""; handleCommand(v); });

// ---------------------------------------------------------------------------
// Upload a budget (Excel / CSV)
// ---------------------------------------------------------------------------
let xlsxLoading = null;
function needXLSX() { if (window.XLSX) return Promise.resolve(); if (!xlsxLoading) xlsxLoading = new Promise((res, rej) => { const s = document.createElement("script"); s.src = "vendor/xlsx.full.min.js"; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); return xlsxLoading; }
function viewUpload() {
  const o = ORG(); const u = UI.upload;
  const head = `<header class="ph"><div><p class="eyebrow">${esc(o.name)}</p><h1>Upload a budget</h1><p>Drop in your ASG proposal sheet or any budget spreadsheet. FundPath reads every row, checks it against the ASG rules for Tier ${TIER_ROMAN[o.tier]}, and tells you exactly what would pass.</p></div>
    <div class="ph-actions"><a class="btn ghost" href="samples/asg-proposal-template.xlsx" download>Blank ASG template</a><a class="btn ghost" href="samples/banking-club-budget.xlsx" download>Sample budget</a></div></header>`;
  if (!u) return head + `<section class="card"><label class="drop" id="drop"><input type="file" id="budgetFile" accept=".xlsx,.xls,.xlsm,.csv" hidden><b>Choose a file or drag it here</b><span>Excel (.xlsx, .xls) or CSV · the official ASG Club Funding Proposal sheet, or columns named Item, Category, Amount (Event and Comments optional)</span></label>
    <div class="row muted small" style="margin-top:12px">Your file stays in your browser. Nothing is uploaded to a server.</div></section>
    <section class="card"><h2>What gets checked</h2><div class="routes"><div><h3>Every row</h3><p class="small">Category mapped to ASG's list, amount, event, quote. Vague rows like “Misc” are flagged.</p></div><div><h3>Every limit</h3><p class="small">Tier total, food by tier, speakers, admin, per-event caps (promo $150, decorations $250), capital caps, hotel and flight rates.</p></div><div><h3>Every rule</h3><p class="small">Miami Central event names, quotes, items ASG never funds (apparel, alcohol venues, banquets), trips over breaks.</p></div></div></section>`;
  const ev0 = u.ev0, ev1 = u.ev1;
  const evn = (p, id) => (p.events.find(e => e.id === id) || {}).name || "";
  const lineRows = u.p0.lines.map(l => { const fl = ev0.flags.filter(f => f.line === l.id); return `<tr class="lvl-${ev0.lineLevel[l.id] || "ok"}"><td class="mono small">${l.fromRow || ""}</td><td>${esc(evn(u.p0, l.eventId)) || `<span class="muted">—</span>`}</td><td><b>${esc(l.item)}</b>${l.rawCat && l.rawCat !== l.cat ? `<br><small class="muted">sheet said “${esc(l.rawCat)}”</small>` : ""}</td><td><small>${esc(l.cat)}</small></td><td class="r mono">${money(+l.amount)}</td><td>${fl.length ? fl.map(f => `<div class="small">${lvl(f.level)} ${esc(f.msg)}</div>`).join("") : lvl("ok")}</td></tr>`; }).join("");
  const human = ev1.flags.filter(f => f.rule !== "ELIGINFO");
  return head + `
  <section class="card"><h2>${esc(u.name)} <span><button class="btn ghost sm" data-a="upClear">Upload a different file</button></span></h2>
    <div class="kpis four flat"><div class="kpi"><span>Rows read</span><b>${u.p0.lines.length}</b><small>${u.p0.events.length} events · sheet${u.parsed.sheets.length > 1 ? "s" : ""} ${esc(u.parsed.sheets.join(", "))}</small></div>
      <div class="kpi"><span>Requested</span><b>${money(ev0.total)}</b><small>Tier ${TIER_ROMAN[o.tier]} limit ${money(S.settings.tierMax[o.tier])}</small></div>
      <div class="kpi ${ev0.passed < 7 ? "bad" : "good"}"><span>As uploaded</span><b>${ev0.passed}/7</b><small>${ev0.flags.filter(f => f.level === "deny").length} problems</small></div>
      <div class="kpi ${ev1.passed === 7 ? "good" : ""}"><span>After FundPath's fixes</span><b>${ev1.passed}/7</b><small>${money(ev1.total)} · ${human.length} need you</small></div></div>
    ${u.mism.length ? `<div class="banner bad">${u.mism.map(esc).join("<br>")}</div>` : ""}
  </section>
  <section class="card"><h2>Every row, as uploaded</h2><div class="scroll"><table class="tbl"><thead><tr><th>Row</th><th>Event</th><th>Item</th><th>ASG category</th><th class="r">Amount</th><th>Result</th></tr></thead><tbody>${lineRows}</tbody></table></div>
    ${ev0.flags.filter(f => !f.line).length ? `<h3>Whole-budget checks</h3>${checkList(ev0.flags.filter(f => !f.line))}` : ""}
    ${u.parsed.notes.length ? `<details><summary class="small">How FundPath read the file (${u.parsed.notes.length})</summary><ul class="lines small">${u.parsed.notes.map(n => `<li>${esc(n.msg)}</li>`).join("")}</ul></details>` : ""}</section>
  <div class="split2">
    <section class="card"><h2>FundPath can fix these</h2>${u.changes.length ? `<ul class="changes">${u.changes.map(c => `<li><span class="lv ${c.kind === "removed" || c.kind === "dropped" ? "deny" : "warn"}">${c.kind}</span> ${esc(c.what)} <small class="muted">${esc(c.why)}</small></li>`).join("")}</ul>` : `<p class="muted">Nothing to fix automatically.</p>`}</section>
    <section class="card"><h2>These need you</h2>${human.length ? checkList(human) : `<p class="okline">Nothing. After the fixes, this budget passes all 7 criteria.</p>`}</section>
  </div>
  <section class="card"><div class="submitrow"><p class="small">Use the fixed version as your ${esc(S.settings.semester)} proposal. You can still edit every line, then submit. If it passes everything, it approves on the spot.</p>
    <span><button class="btn ghost" data-a="upDownload">Download fixed budget (.xlsx)</button> <button class="btn ghost" data-a="upUse" data-v="raw">Use as uploaded</button> <button class="btn" data-a="upUse" data-v="fixed">Use the fixed budget →</button></span></div></section>`;
}
VIEWS.upload = viewUpload;
async function readBudgetFile(file) {
  const o = ORG();
  try {
    await needXLSX();
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: false });
    const parsed = parseWorkbook(wb);
    if (!parsed.lines.length) { toast(parsed.notes.map(n => n.msg).join(" "), "bad"); return; }
    const p0 = { id: "upload", orgId: o.id, semester: S.settings.semester, prior: parsed.prior || 0, ack: { hub: true, itemized: true, quotes: true, noGuarantee: true }, purpose: "", events: parsed.events, lines: parsed.lines };
    const ev0 = evaluateProposal(p0, o, S.settings);
    const p1 = JSON.parse(JSON.stringify(p0)); const changes = autoFixProposal(p1, o, S.settings, { comments: true }); const ev1 = evaluateProposal(p1, o, S.settings);
    UI.upload = { name: file.name, parsed, p0, ev0, p1, ev1, changes, mism: orgMismatches(parsed.info, o, S.settings) };
    logEvt(o.id, `Checked budget file ${file.name}: ${ev0.passed}/7 as uploaded, ${ev1.passed}/7 after fixes`);
    render();
  } catch (e) { console.error(e); toast("Couldn't read that file. Save it as .xlsx or .csv and try again.", "bad"); }
}
document.addEventListener("change", e => { if (e.target.id === "budgetFile" && e.target.files[0]) readBudgetFile(e.target.files[0]); if (e.target.id === "wsFile" && e.target.files[0]) importWorkspace(e.target.files[0]); if (e.target.id === "hubFile" && e.target.files[0]) importHubFile(e.target.files[0]); });
document.addEventListener("dragover", e => { const d = e.target.closest && e.target.closest("#drop"); if (d) { e.preventDefault(); d.classList.add("over"); } });
document.addEventListener("dragleave", e => { const d = e.target.closest && e.target.closest("#drop"); if (d) d.classList.remove("over"); });
document.addEventListener("drop", e => { const d = e.target.closest && e.target.closest("#drop"); if (!d) return; e.preventDefault(); d.classList.remove("over"); const f = e.dataTransfer.files[0]; if (f) readBudgetFile(f); });
function proposalAOA(p, o) {
  const evn = id => (p.events.find(e => e.id === id) || {}).name || "";
  const rows = [["ASG Club Funding Proposal"], [], ["Step 1: Club Info"], ["Organization:", o.name], ["Entity Email:", o.entityEmail], ["Tier Status:", `Tier ${o.tier} (${money(S.settings.tierMax[o.tier])}/semester max)`], ["President:", o.president], ["Treasurer:", o.treasurer], ["Advisor:", o.advisor], ["SA1####:", o.worktag], ["How much funding has ASG already given you this semester?", +p.prior || 0], [],
    ["Step 2: List of Events and Trips"], ["Type", "Name (Must exactly match Miami Central)", "Date or Date Range", "Hotel People", "Nights"], ...p.events.map(e => [e.type, e.name, e.start || e.dateText || "", e.travelers || "", e.nights || ""]), [],
    ["Step 3: Budget - Events and Trips"], ["Select Your Event/Trip", "Budget Item", "Category", "Amount", "Comments", "Quote attached?"], ...p.lines.filter(l => isEv(l.cat)).map(l => [evn(l.eventId), l.item, l.cat, +l.amount, l.comment || "", l.quote ? "Yes" : ""]), [],
    ["Step 4: Budget - Non-Event"], ["Budget Item", "Category", "Amount", "Comments", "Quote attached?"], ...p.lines.filter(l => !isEv(l.cat)).map(l => [l.item, l.cat, +l.amount, l.comment || "", l.quote ? "Yes" : ""]), [],
    ["Step 6: Purpose"], [p.purpose || ""]];
  return rows;
}
Object.assign(A, {
  upClear: () => { UI.upload = null; render(); },
  upUse: d => { const u = UI.upload; const o = ORG(); const src = d.v === "fixed" ? u.p1 : u.p0; const p = materialize(src, o, "draft"); p.source = `Uploaded file ${u.name}`; save(); UI.upload = null; A.go({ id: "proposal" }); toast(`${p.id} created from ${u.name}`); },
  upDownload: async () => { await needXLSX(); const u = UI.upload; const o = ORG(); const ws = XLSX.utils.aoa_to_sheet(proposalAOA(u.p1, o)); ws["!cols"] = [{ wch: 30 }, { wch: 40 }, { wch: 30 }, { wch: 12 }, { wch: 60 }, { wch: 14 }]; const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Proposal"); XLSX.writeFile(wb, u.name.replace(/\.(xlsx|xls|xlsm|csv)$/i, "") + " (FundPath fixed).xlsx"); },
  exportProposalXlsx: async () => { await needXLSX(); const o = ORG(); const p = proposalFor(o.id); if (!p) return; const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(proposalAOA(p, o)), "Proposal"); XLSX.writeFile(wb, `${o.name} ASG proposal ${S.settings.semester}.xlsx`); }
});

// ---------------------------------------------------------------------------
// Real club workspace
// ---------------------------------------------------------------------------
function renderSetupShell() {
  $("#app").innerHTML = `<header class="topbar"><a class="tb-brand"><span class="tb-logo">F</span><span><b>FundPath</b><small>for Miami Central</small></span></a><div class="tb-right"><span class="mode real" data-a="modeMenu">My club data</span></div></header>
  <div class="shell one"><main id="main">${viewSetup()}</main></div>${UI.modal ? `<div class="scrim" data-a="closeModal"></div><div class="modal">${UI.modal()}</div>` : ""}`;
}
function viewSetup() {
  const f = (k, l, ph = "", type = "text") => `<label>${l}<input name="${k}" type="${type}" placeholder="${esc(ph)}"></label>`;
  return `<header class="ph"><div><p class="eyebrow">My club data</p><h1>Set up your organization</h1><p>Use your real club. Nothing here is demo data. Copy these from Miami Central (your group's About page and roster) and the ASG Funding Committee's tier list.</p></div></header>
  <form class="card" data-a2="setup"><h2>Organization</h2>
    <div class="grid2">${f("name", "Organization name (exactly as on Miami Central)", "Miami University Banking Club")}${f("entityEmail", "Entity email", "club@miamioh.edu", "email")}</div>
    <div class="grid4"><label>Red Brick Rewards tier<select name="tier">${[1, 2, 3, 4].map(n => `<option value="${n}" ${n === 4 ? "selected" : ""}>Tier ${TIER_ROMAN[n]} · ${money(S.settings.tierMax[n])}</option>`).join("")}</select></label>${f("worktag", "Workday worktag (SA1####)", "SA10482")}${f("agencyBalance", "Agency account balance", "0", "number")}${f("prior", "ASG funds already received this semester", "0", "number")}</div>
    <h2>Officers</h2><div class="grid4">${f("president", "President")}${f("presidentEmail", "President email", "", "email")}${f("treasurer", "Treasurer (you)")}${f("treasurerEmail", "Treasurer email", "", "email")}</div><div class="grid2">${f("advisor", "Advisor")}<label class="check"><input type="checkbox" name="access" checked> I've finished the SEA treasurer training and have Workday access</label></div>
    <h2>Mission and events</h2><label>Constitution purpose<textarea name="mission" rows="2" placeholder="prepare Miami students for careers in finance through…"></textarea></label>
    <label>Events registered on Miami Central (one per line, exact names)<textarea name="hub" id="hubTa" rows="4" placeholder="Speaker Meetings&#10;Valuation Workshop"></textarea></label>
    <p class="small muted">Or upload your Miami Central events export (CSV or Excel with an event name column): <input type="file" id="hubFile" accept=".csv,.xlsx,.xls"></p>
    <div class="mf"><button type="button" class="link" data-a="modeSwitch" data-v="demo">Use the demo data instead</button><button class="btn">Create my workspace</button></div></form>
  <section class="card"><h2>Already set up on another device?</h2><p class="small">Import a FundPath backup file (.json) your treasurer or president exported.</p><input type="file" id="wsFile" accept=".json"></section>`;
}
document.addEventListener("submit", e => {
  const f = e.target.closest("[data-a2=setup]"); if (!f) return; e.preventDefault();
  const v = Object.fromEntries(new FormData(f).entries());
  if (!v.name || !v.treasurer) return toast("Add at least the organization name and treasurer", "bad");
  const org = { id: "o1", name: v.name.trim(), entityEmail: v.entityEmail, tier: +v.tier, redBrick: true, worktag: v.worktag.trim().toUpperCase(), president: v.president, presidentEmail: v.presidentEmail, treasurer: v.treasurer, treasurerEmail: v.treasurerEmail, advisor: v.advisor, hub: (v.hub || "").split("\n").map(x => x.trim()).filter(Boolean), mission: v.mission || "", readiness: { hub: true, terms: true, module: !!v.access, moduleDate: todayIso(), access: v.access ? "approved" : "pending" }, agencyBalance: +v.agencyBalance || 0, undergradPct: 100, debt: 0, priorSpendPct: 100, spendHistory: true, hasStorage: true, deficitSemesters: 0, prior: +v.prior || 0 };
  S.orgs.push(org); S.orgId = org.id; logEvt(org.id, `Workspace created for ${org.name}`); save(); UI.view = "home"; location.hash = "home"; render(); toast("Workspace ready. Start with an exec meeting or upload your budget.");
});
async function importHubFile(file) {
  try { await needXLSX(); const wb = XLSX.read(await file.arrayBuffer(), { type: "array" }); const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: "" });
    const hi = rows.findIndex(r => r.some(c => /event name|^name$|^title$|^event$/i.test(String(c).trim()))); if (hi < 0) return toast("Couldn't find an event name column", "bad");
    const ci = rows[hi].findIndex(c => /event name|^name$|^title$|^event$/i.test(String(c).trim())); const names = [...new Set(rows.slice(hi + 1).map(r => String(r[ci] || "").trim()).filter(Boolean))];
    const ta = $("#hubTa"); if (ta) ta.value = names.join("\n"); else { const o = ORG(); o.hub = [...new Set([...(o.hub || []), ...names])]; save(); render(); }
    toast(`${names.length} events imported from Miami Central`);
  } catch (e) { toast("Couldn't read that file", "bad"); }
}
async function importWorkspace(file) {
  try { const j = JSON.parse(await file.text()); if (j.v !== 5 || !Array.isArray(j.orgs)) throw 0; j.mode = "real"; S = j; localStorage.setItem(MODE_KEY, "real"); save(); UI.modal = null; render(); toast("Workspace imported"); }
  catch (e) { toast("That isn't a FundPath backup file", "bad"); }
}
function modeModal() {
  return `<div class="mh"><h2>Your data</h2><button class="x" data-a="closeModal">×</button></div>
  <p class="small">You're using <b>${S.mode === "real" ? "your club's data" : "demo data"}</b>. Each one is saved separately in this browser, so switching never deletes anything.</p>
  <div class="choice"><button class="${S.mode === "demo" ? "on" : ""}" data-a="modeSwitch" data-v="demo"><b>Demo data</b><span>Seven sample orgs with proposals, authorizations and slips to catch. For judging and practice.</span></button>
  <button class="${S.mode === "real" ? "on" : ""}" data-a="modeSwitch" data-v="real"><b>My club</b><span>Your real organization, starting empty. Run a meeting or upload your budget.</span></button></div>
  <h3>Back up or share</h3><p class="small muted">Download everything (orgs, proposals, authorizations, receipts) as a file. Import it on another laptop so your exec board sees the same thing.</p>
  <div class="row"><button class="btn ghost sm" data-a="wsExport">Download backup (.json)</button><label class="btn ghost sm">Import backup<input type="file" id="wsFile" accept=".json" hidden></label>${S.mode === "real" ? `<button class="btn ghost sm" data-a="wsWipe">Erase my club data</button>` : `<button class="btn ghost sm" data-a="reset">Reset demo data</button>`}</div>`;
}
Object.assign(A, {
  modeMenu: () => { UI.modal = modeModal; render(); },
  modeSwitch: d => { save(); localStorage.setItem(MODE_KEY, d.v); UI = { view: "home", modal: null, threadId: null, busy: false, saId: null }; load(); location.hash = "home"; render(); toast(d.v === "real" ? "Switched to your club's data" : "Switched to demo data"); },
  wsExport: () => { const blob = new Blob([JSON.stringify(S, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `fundpath-${S.mode === "real" ? (ORG() || {}).name || "club" : "demo"}-${todayIso()}.json`.replace(/\s+/g, "-"); a.click(); },
  wsWipe: () => { if (!confirmWipe()) return; S = seedReal(); S.mode = "real"; save(); UI.modal = null; render(); toast("Your club data was erased"); }
});
function confirmWipe() { UI.wipeArm = !UI.wipeArm; if (UI.wipeArm) { toast("Click “Erase my club data” again to confirm", "bad"); setTimeout(() => { UI.wipeArm = false; }, 5000); return false; } return true; }

// proposal page: add Excel export + upload shortcut
const _viewProposal = VIEWS.proposal;
VIEWS.proposal = () => _viewProposal().replace('<button class="btn ghost" data-a="exportSheet">Copy in ASG sheet format</button>', '<button class="btn ghost" data-a="exportProposalXlsx">Download as Excel</button><button class="btn ghost" data-a="go" data-id="upload">Upload a budget</button>');

// settings: straight-through toggle for ASG
const _viewRules = VIEWS.rules;
VIEWS.rules = () => _viewRules().replace('</div></section>', `</div><label class="check"><input type="checkbox" data-a="toggleST" ${S.settings.straightThrough ? "checked" : ""} ${S.role === "asg" ? "" : "disabled"}> Straight-through approval: when a proposal and its Spend Authorization pass every check, approve both without an advisor or Accounts Payable step. Anything FundPath isn't certain about still goes to a person.</label></section>`);
A.toggleST = (d, el) => { S.settings.straightThrough = el.checked; save(); toast(el.checked ? "Straight-through approval on" : "Every authorization now goes to the advisor and AP"); };

// top-bar search: send to the assistant
document.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.dataset && e.target.dataset.a2 === "search") { const v = e.target.value.trim(); if (!v) return; DOCK.open = true; render(); handleCommand(v); } });

// ---------------------------------------------------------------------------
// Presenter guide (demo data only): the five demo beats, with progress
// ---------------------------------------------------------------------------
function demoBeats() {
  const m = M(); const o = S.orgs.find(x => x.id === "o1");
  const sa = o && S.spend.filter(s => s.orgId === o.id && s.kind === "SA").slice(-1)[0];
  const done = [m.transcript.length > 0, !!m.built && (m.qs || []).length > 0 && m.qi >= (m.qs || []).length, ["running", "done"].includes(m.stage), !!sa && ["approved", "active", "closed"].includes(sa.status), !!sa && ["active", "closed"].includes(sa.status)];
  const names = ["Run the exec meeting", "Answer FundPath's questions", "Say yes to submit", "Approved automatically", "Pick up the card"];
  const cur = done.indexOf(false);
  return names.map((n, i) => ({ n, done: done[i], on: i === cur }));
}
const _render = render;
render = function () {
  _render();
  if (S.mode !== "demo" || UI.hidePresenter) return;
  const tb = document.querySelector(".topbar"); if (!tb) return;
  const el = document.createElement("div"); el.className = "presenter";
  el.innerHTML = `<b>Demo</b><ol>${demoBeats().map((x, i) => `<li class="${x.done ? "done" : x.on ? "on" : ""}">${i + 1}. ${esc(x.n)}</li>`).join("")}</ol><button data-a="demoRestart">Restart demo</button><button data-a="demoHide" style="margin-left:0">Hide</button>`;
  tb.after(el);
};
Object.assign(A, {
  demoRestart: () => { S = seedState(); S.mode = "demo"; UI = { view: "meeting", modal: null, threadId: null, busy: false, saId: null }; VOICE.playing = false; DOCK.log = []; save(); location.hash = "meeting"; render(); window.scrollTo(0, 0); toast("Demo reset. Start the meeting when you're ready."); },
  demoHide: () => { UI.hidePresenter = true; render(); }
});

// Upload: don't silently replace an approved proposal
const _vu = VIEWS.upload;
VIEWS.upload = () => { const o = ORG(); const ap = S.proposals.find(p => p.orgId === o.id && p.semester === S.settings.semester && p.status === "approved"); let h = _vu(); if (UI.upload && ap) h = h.replace(/<button class="btn ghost" data-a="upUse" data-v="raw">Use as uploaded<\/button> <button class="btn" data-a="upUse" data-v="fixed">Use the fixed budget →<\/button>/, `<span class="small muted">${ap.id} is already approved for ${esc(S.settings.semester)}. Changes go through an ASG amendment.</span>`); return h; };

// Dashboard: lead with the exec meeting when there's no proposal yet
const _vh = VIEWS.home;
VIEWS.home = () => _vh().replace(/<button class="btn" data-a="newProposal">Start ([^<]*) proposal<\/button>/, '<button class="btn ghost" data-a="go" data-id="upload">Upload a budget</button><button class="btn ghost" data-a="newProposal">Start $1 proposal by hand</button><button class="btn" data-a="go" data-id="meeting">Start with an exec meeting</button>');
