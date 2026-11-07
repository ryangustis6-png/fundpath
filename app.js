// FundPath UI
const KEY = "fundpath-v5b";
let S;
let UI = { view: "home", modal: null, threadId: null, busy: false, saId: null, open: null, confirmSubmit: false };
const MODE_KEY = "fundpath-mode", REAL_KEY = "fundpath-real-v1";
function curMode() { try { return localStorage.getItem(MODE_KEY) || "demo"; } catch (e) { return "demo"; } }
function load() { const mode = curMode(); try { const raw = localStorage.getItem(mode === "real" ? REAL_KEY : KEY); if (raw) { const s = JSON.parse(raw); if (s.v === 5) { S = s; S.mode = mode; return; } } } catch (e) {} S = mode === "real" ? seedReal() : seedState(); S.mode = mode; }
function save() { try { localStorage.setItem(S.mode === "real" ? REAL_KEY : KEY, JSON.stringify(S)); } catch (e) {} }
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = s => document.querySelector(s);
const ORG = () => S.orgs.find(o => o.id === S.orgId);
const orgById = id => S.orgs.find(o => o.id === id);
const nextId = (p, arr) => { const n = arr.filter(x => String(x.id).startsWith(p + "-")).map(x => +String(x.id).split("-")[1] || 0); return `${p}-${Math.max(1000, ...n) + 1}`; };
const uid = () => Math.random().toString(36).slice(2, 7);
function toast(msg, kind = "ok") { document.querySelectorAll(".toast").forEach(x => x.remove()); const t = document.createElement("div"); t.className = `toast ${kind}`; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 3400); }
// In-place DOM updates. The page is never torn down and rebuilt, so the field you're typing in,
// the cursor, scroll positions (page, sidebar, transcript) and opened sections all survive a redraw.
const MORPH_OPTS = {
  childrenOnly: true,
  onBeforeElUpdated(from, to) {
    if (from.tagName === "DETAILS") { if (from.open) to.setAttribute("open", ""); else to.removeAttribute("open"); }
    if (from.tagName === "INPUT" && from.type === "file") return false;
    if (from === document.activeElement && (from.tagName === "TEXTAREA" || from.tagName === "SELECT" || (from.tagName === "INPUT" && !["checkbox", "radio", "button", "submit", "file"].includes(from.type)))) {
      from.disabled = to.hasAttribute("disabled");
      return false; // leave what the person is typing alone
    }
    return true;
  }
};
function patch(el, html) {
  if (!el) return;
  if (!window.morphdom) { el.innerHTML = html; return; }
  const t = el.cloneNode(false); t.innerHTML = html; morphdom(el, t, MORPH_OPTS);
}
const PAINT = { view: null, modal: false };
function paintApp(html) {
  const tr = $("#transcript"), dl = $("#dockLog");
  const stick = el => el && el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  const stickT = stick(tr), stickD = stick(dl);
  patch($("#app"), html);
  const tr2 = $("#transcript"); if (tr2 && (stickT || !tr)) tr2.scrollTop = tr2.scrollHeight;
  const dl2 = $("#dockLog"); if (dl2 && (stickD || !dl)) dl2.scrollTop = dl2.scrollHeight;
  document.body.classList.toggle("modal-open", !!UI.modal);
  if (UI.modal && !PAINT.modal) { const f = document.querySelector(".modal input:not([type=hidden]):not([type=file]):not([type=checkbox]), .modal textarea"); if (f) setTimeout(() => f.focus({ preventScroll: true }), 0); }
  PAINT.modal = !!UI.modal;
  const key = S.role + ":" + UI.view + ":" + (UI.saId || "");
  if (PAINT.view !== null && PAINT.view !== key) {
    const m = $("#main"); if (m) { m.classList.remove("enter"); void m.offsetWidth; m.classList.add("enter"); }
    if (PAINT.view.split(":").slice(0, 2).join(":") !== key.split(":").slice(0, 2).join(":") || UI.saId) window.scrollTo(0, 0);
  }
  PAINT.view = key;
}
function logEvt(orgId, text) { S.log.unshift({ at: new Date().toISOString(), orgId, text }); S.log = S.log.slice(0, 80); }
const isEv = cat => !!(CATS[cat] && (CATS[cat].sec === "event" || CATS[cat].sec === "trip"));
const proposalFor = orgId => S.proposals.find(p => p.orgId === orgId && p.semester === S.settings.semester);

const NAV = {
  treasurer: [["home", "Dashboard"], ["meeting", "Exec meeting · voice"], ["proposal", "ASG proposal (budget)"], ["spend", "Spend Authorization"], ["card", "Card & receipts"], ["deposits", "Deposits"], ["help", "Funding Help"], ["resources", "Resources"], ["workday", "Workday"], ["org", "Org & eligibility"], ["rules", "Rules"]],
  advisor: [["advq", "Advisor approvals"], ["rules", "Rules"]],
  asg: [["sareview", "Spend review (2nd line)"], ["review", "Proposal review"], ["workday", "Workday sync"], ["inbox", "Liaison inbox"], ["oversight", "Org oversight"], ["rules", "Rules & settings"]]
};
const CHIP = { draft: "gray", submitted: "blue", review: "blue", advisor: "amber", approved: "green", pickup: "green", active: "green", closed: "gray", returned: "red", denied: "red", open: "amber", answered: "green", ai: "gray" };
const LABEL = { review: "In review", advisor: "With advisor", approved: "Approved", pickup: "Card ready", active: "Card active", closed: "Closed", returned: "Returned", draft: "Draft", denied: "Denied" };
const chip = (s, label) => `<span class="chip ${CHIP[s] || "gray"}">${esc(label || LABEL[s] || s)}</span>`;
const lvl = l => l === "deny" ? `<span class="lv deny">Fails</span>` : l === "warn" ? `<span class="lv warn">Check</span>` : `<span class="lv ok">Pass</span>`;
const ruleTag = id => { const r = RULES[id]; if (!r) return ""; return `<button class="rtag ${r.kind}" data-a="showRule" data-id="${id}">${esc(r.title)}<i>${r.kind}</i></button>`; };

const NAV_GROUPS = {
  treasurer: [["Start here", ["home", "meeting", "upload"]], ["Funding", ["proposal", "rules"]], ["Spending", ["spend", "card", "deposits", "workday"]], ["Help", ["help", "resources", "org"]]],
  asg: [["Review", ["sareview", "review"]], ["Manage", ["inbox", "oversight", "workday", "rules"]]],
  advisor: [["Review", ["advq"]], ["Reference", ["rules"]]]
};
const SHORT = { proposal: "ASG proposal", sareview: "Spend review", rules: "Rules and limits" };
function siteFooter() {
  return `<footer class="site-foot"><div class="sf-in">
    <div class="sf-cols">
      <div><b class="sf-brand">FundPath</b><p>ASG funding and student organization spending for Miami University, in one place.</p></div>
      <div><h4>Links</h4><a href="https://miamicentral.miamioh.edu" target="_blank" rel="noopener">Miami Central</a><a href="https://miamiohasg.com/funding-1" target="_blank" rel="noopener">ASG Funding</a><a href="https://miamioh.edu/workday" target="_blank" rel="noopener">Workday</a><a href="https://miamioh.instructure.com/courses/225476" target="_blank" rel="noopener">Treasurer training (Canvas)</a></div>
      <div><h4>Contact</h4><p>ASG Funding Committee<br>asgfunding@miamioh.edu</p><p>Accounts Payable<br>107 Roudebush Hall, Oxford, OH 45056</p></div>
    </div>
    <div class="sf-legal"><span>Rules sourced from the ASG Funding Committee Standing Rules 2025–2026, the ASG Club Funding Proposal and SEA Student Org Finance Training.</span><span>Student-built for Redhawk Builds 2026. Not an official Miami University website.</span></div>
  </div></footer>`;
}
function render() {
  if (S.mode === "real" && !S.orgs.length && S.role !== "asg") { renderSetupShell(); return; }
  const role = S.role, nav = NAV[role];
  if (!nav.some(n => n[0] === UI.view)) UI.view = nav[0][0];
  const o = ORG() || S.orgs[0] || {};
  const badge = v => {
    let n = 0;
    if (v === "card") n = S.txns.filter(t => t.orgId === o.id && !t.receiptDone).length + S.spend.filter(x => x.orgId === o.id && x.kind === "SA" && x.status === "approved").length;
    if (v === "deposits") n = S.deposits.filter(d => d.orgId === o.id && evaluateDeposit(d).level === "deny").length;
    if (v === "advq") n = S.spend.filter(s => s.status === "advisor").length;
    if (v === "review") n = S.proposals.filter(p => p.status === "review").length;
    if (v === "sareview") n = S.spend.filter(s => s.status === "review").length;
    if (v === "inbox") n = S.threads.filter(t => t.status === "open").length;
    return n ? `<b class="nb">${n}</b>` : "";
  };
  const label = v => SHORT[v] || (nav.find(n => n[0] === v) || ["", v])[1];
  const initials = x => String(x || "?").replace(/^Miami University /, "").split(/\s+/).filter(w => /^[A-Z]/.test(w)).slice(0, 2).map(w => w[0]).join("") || "?";
  const who = role === "treasurer"
    ? `<div class="who"><div class="who-logo">${esc(initials(o.name))}</div><div class="who-t"><b>${esc(o.name)}</b><span>Tier ${TIER_ROMAN[o.tier] || "?"} · ${esc(o.worktag || "")}</span><span>Advisor: ${esc(o.advisor || "not set")} · <a href="#org">Edit</a></span>${S.orgs.length > 1 ? `<label class="who-sw">Switch organization<select data-a2="pickOrg">${S.orgs.map(x => `<option value="${x.id}" ${x.id === o.id ? "selected" : ""}>${esc(x.name.replace(/^Miami University /, ""))}</option>`).join("")}</select></label>` : ""}</div></div>`
    : `<div class="who"><div class="who-logo alt">${role === "asg" ? "ASG" : "ADV"}</div><div class="who-t"><b>${role === "asg" ? "ASG Funding + Accounts Payable" : "Organization advisors"}</b><span>${S.orgs.length} organizations</span></div></div>`;
  const groups = NAV_GROUPS[role].map(([g, vs]) => `<div class="sg"><h5>${g}</h5>${vs.filter(v => nav.some(n => n[0] === v)).map(v => `<a href="#${v}" class="${UI.view === v ? "on" : ""}"><span>${esc(label(v))}</span>${badge(v)}</a>`).join("")}</div>`).join("");
  paintApp(`
  <header class="hdr"><div class="hdr-in">
    <a class="brand2" href="#${nav[0][0]}"><span class="mark">F</span><span class="word"><b>FundPath</b><small>Student Organization Funding</small></span></a>
    <div class="hdr-r"><span class="hdr-l">Viewing as</span><div class="seg2">${[["treasurer", "Treasurer"], ["advisor", "Advisor"], ["asg", "ASG / AP"]].map(([r, l]) => `<button class="${role === r ? "on" : ""}" data-a="role" data-r="${r}">${l}</button>`).join("")}</div>
      <button class="hdr-btn" data-a="modeMenu">${S.mode === "real" ? "My club data" : "Demo data"}</button></div>
  </div></header>
  <div class="lay">
    <aside class="snav">${who}<nav class="sgs">${groups}</nav><div id="sideDemo">${typeof demoGuideHtml === "function" ? demoGuideHtml() : ""}</div></aside>
    <main id="main" class="pg">
      <div class="crumbs">${role === "treasurer" ? esc(o.name || "") : role === "asg" ? "ASG Funding Committee" : "Advisors"} <span>›</span> ${esc(label(UI.view))}</div>
      ${S.mode === "demo" && role === "treasurer" ? `<p class="demo-note">Demo data: officers, numbers and approvals are examples, not pulled from Miami Central or Workday.</p>` : ""}
      ${role === "treasurer" && o.id ? cardReadyBanner(o) : ""}${VIEWS[UI.view]()}
    </main>
  </div>
  ${siteFooter()}
  ${voiceDock()}
  ${UI.modal ? `<div class="scrim" data-a="closeModal"></div><div class="modal">${UI.modal()}</div>` : ""}`);
}
function readinessHtml(o) {
  const r = o.readiness || {};
  const items = [
    ["Red Brick Rewards tier", o.redBrick ? `Tier ${o.tier} · $${(S.settings.tierMax[o.tier] || 0).toLocaleString()}/semester max` : "Not on record", !!o.redBrick, "Miami Central"],
    ["Listed as treasurer on Miami Central", r.hub ? esc(o.treasurer) : "Not listed", !!r.hub, "Miami Central"],
    ["Accepted treasurer terms", r.terms ? "Accepted" : "Not accepted", !!r.terms, "Miami Central"],
    ["Workday access module (annual)", r.module ? `Completed ${fmtD(r.moduleDate)}` : "Not completed", !!r.module, "Canvas"],
    ["Workday access request", r.access === "approved" ? "Approved by SEA" : r.access === "pending" ? "Waiting on SEA review" : "Not submitted", r.access === "approved", "TeamDynamix"]
  ];
  return `<div class="ready">${items.map(([t, v, ok, src]) => `<div class="ri ${ok ? "ok" : "no"}"><i>${ok ? "✓" : "!"}</i><div><b>${t}</b><span>${v}</span><small>checked in ${src}</small></div></div>`).join("")}</div>`;
}
function viewHome() {
  const o = ORG(), led = ledgerFor(S, o.id), p = proposalFor(o.id);
  const sas = S.spend.filter(s => s.orgId === o.id && s.kind === "SA");
  const sa = sas.slice().reverse().find(s => s.status !== "closed") || sas[sas.length - 1];
  const tasks = tasksFor(S, o.id);
  const pe = p ? evaluateProposal(p, o, S.settings) : null;
  if (p && (p.status === "draft" || p.status === "returned")) tasks.unshift({ sev: pe.flags.some(f => f.level === "deny") ? "deny" : "warn", rule: "ELIGINFO", title: `${S.settings.semester} ASG proposal: ${pe.passed}/7 criteria pass, ${pe.flags.length} issue${pe.flags.length === 1 ? "" : "s"} to fix before submitting`, go: "proposal" });
  if (!p) tasks.unshift({ sev: "warn", rule: "DEADLINE", title: `No ${S.settings.semester} ASG proposal yet. Window closes ${fmtD(S.settings.window.close)}`, go: "proposal" });
  const own = x => x ? ownerOf(x, S) : ["—", ""];
  const steps = [
    { t: "Tier status", s: o.redBrick ? `Tier ${o.tier}` : "Missing", done: !!o.redBrick, who: "Miami Central" },
    { t: "Treasurer training", s: o.readiness.access === "approved" ? "Authorized" : "Incomplete", done: o.readiness.access === "approved", who: "Canvas + SEA" },
    { t: "ASG proposal", s: p ? LABEL[p.status] : "Not started", done: p && p.status === "approved", who: p ? own(p)[0] : "You", now: p && p.status !== "approved" },
    { t: "Spend Authorization", s: sa ? `${sa.id} · ${LABEL[sa.status]}` : "Not started", done: sa && ["approved", "pickup", "active", "closed"].includes(sa.status), who: sa ? own(sa)[0] : "You", now: p && p.status === "approved" && (!sa || ["draft", "advisor", "review"].includes(sa.status)) },
    { t: "Card pickup", s: sa && ["active", "closed"].includes(sa.status) ? "Picked up" : sa && sa.status === "approved" ? "Ready at 107 Roudebush" : "—", done: sa && ["active", "closed"].includes(sa.status), who: "Accounts Payable", now: sa && sa.status === "approved" },
    { t: "Spend + receipts", s: sa && sa.status === "active" ? `${money(led.cardBal)} left on card` : sa && sa.status === "closed" ? "Closed" : "—", done: sa && sa.status === "closed", who: "You", now: sa && sa.status === "active" }
  ];
  const tierRoom = cents((S.settings.tierMax[o.tier] || 0) - led.approved);
  return `
  <header class="ph"><div><h1>${esc(o.name)}</h1><p>Tier ${o.tier} · ${esc(o.worktag)} · Treasurer ${esc(o.treasurer)} · Advisor ${esc(o.advisor)}</p></div>
    <div class="ph-actions">${p ? `<button class="btn" data-a="go" data-id="proposal">Open ${esc(S.settings.semester)} proposal</button>` : `<button class="btn" data-a="newProposal">Start ${esc(S.settings.semester)} proposal</button>`}</div></header>
  <section class="kpis">
    <div class="kpi"><span>ASG approved · ${esc(S.settings.semester)}</span><b>${money(led.approved)}</b><small>${money(Math.max(0, tierRoom))} tier room left</small></div>
    <div class="kpi good"><span>ASG available to spend</span><b>${money(led.avail)}</b><small>after authorizations</small></div>
    <div class="kpi"><span>Card balance</span><b>${money(led.cardBal)}</b><small>${money(led.loaded)} loaded · ${money(led.cardSpent)} spent</small></div>
    <div class="kpi"><span>Agency account</span><b>${money(led.agency)}</b><small>FD9001 · dues, sales, gifts</small></div>
    <div class="kpi ${tasks.some(t => t.sev === "deny") ? "bad" : ""}"><span>Needs you</span><b>${tasks.length}</b><small>${tasks.filter(t => t.sev === "deny").length} urgent</small></div>
  </section>
  <section class="card"><h2>Where everything stands <small class="muted">who has it now, and what happens next</small></h2>
    <div class="pipe">${steps.map((s, i) => `<div class="stage ${s.done ? "done" : s.now ? "now" : ""}"><i>${s.done ? "✓" : i + 1}</i><b>${s.t}</b><span>${esc(s.s)}</span><small>${s.done ? "" : "With: " + esc(s.who)}</small></div>`).join("")}</div></section>
  <div class="split2">
    <section class="card"><h2>Needs your attention</h2>${tasks.length ? `<ul class="todo">${tasks.map(t => `<li class="${t.sev}"><p>${esc(t.title)} ${ruleTag(t.rule)}</p><button class="btn sm" data-a="go" data-id="${t.go}">Open</button></li>`).join("")}</ul>` : `<p class="muted">You're all caught up.</p>`}</section>
    <section class="card"><h2>Eligibility <small class="muted">what ASG checks before funding</small></h2>${readinessHtml(o)}</section>
  </div>
  <section class="card"><h2>Recent activity</h2>${S.log.filter(l => l.orgId === o.id || !l.orgId).length ? `<ul class="log">${S.log.filter(l => l.orgId === o.id || !l.orgId).slice(0, 8).map(l => `<li><time>${new Date(l.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time>${esc(l.text)}</li>`).join("")}</ul>` : `<p class="muted">Actions you take show up here.</p>`}</section>`;
}

function viewProposal() {
  const o = ORG(); const p = proposalFor(o.id);
  if (!p) return `<header class="ph"><div><h1>ASG Funding Proposal</h1><p>Your original budget for ${esc(S.settings.semester)}. Everything you spend later has to match it.</p></div></header>
    <section class="card empty-card"><h2>No ${esc(S.settings.semester)} proposal yet</h2><p>FundPath pre-fills Step 1 from Miami Central and checks every line against ASG's rules as you type. If all 7 committee criteria pass, it's approved instantly.</p><button class="btn" data-a="newProposal">Start proposal</button></section>`;
  const ev = evaluateProposal(p, o, S.settings);
  const ro = !["draft", "returned"].includes(p.status) || S.role !== "treasurer";
  const dis = ro ? "disabled" : "";
  const evOpts = sel => `<option value="">—</option>` + p.events.map(e => `<option value="${e.id}" ${e.id === sel ? "selected" : ""}>${esc(e.name)}</option>`).join("");
  const catOpts = (sel, kind) => Object.keys(CATS).filter(k => kind === "event" ? isEv(k) : !isEv(k)).map(k => `<option ${k === sel ? "selected" : ""}>${k}</option>`).join("");
  const lineRow = (l, kind) => `<tr class="lvl-${ev.lineLevel[l.id] || "ok"}" id="row-${l.id}">
    ${kind === "event" ? `<td><select data-f="ln:${l.id}:eventId" ${dis}>${evOpts(l.eventId)}</select></td>` : ""}
    <td><input data-f="ln:${l.id}:item" id="in-${l.id}" value="${esc(l.item)}" ${dis} placeholder="Specific expense"></td>
    <td><select data-f="ln:${l.id}:cat" ${dis}>${catOpts(l.cat, kind)}</select></td>
    <td class="r"><input class="num" type="number" min="0" step="0.01" data-f="ln:${l.id}:amount" value="${esc(l.amount)}" ${dis}></td>
    <td><input data-f="ln:${l.id}:comment" value="${esc(l.comment)}" ${dis} placeholder="How it serves the event / org"></td>
    <td class="c"><label class="mini"><input type="checkbox" data-f="ln:${l.id}:quote" ${l.quote ? "checked" : ""} ${dis}> quote</label></td>
    <td id="lv-${l.id}">${lvl(ev.lineLevel[l.id])}</td>
    ${ro ? "" : `<td><button class="x" data-a="delLine" data-id="${l.id}">×</button></td>`}</tr>`;
  const eventLines = p.lines.filter(l => isEv(l.cat));
  const nonLines = p.lines.filter(l => !(isEv(l.cat)));
  const f1 = (label, val, okv) => `<div class="kv"><span>${label}</span><b>${esc(val || "—")}</b>${okv ? `<i class="okv">✓</i>` : `<i class="nov">!</i>`}</div>`;
  return `
  <header class="ph"><div><h1>ASG Funding Proposal · ${esc(S.settings.semester)}</h1><p>${p.id} · Your original budget. Every Spend Authorization line must match it. ${chip(p.status)} ${p.decidedBy ? `<small class="muted">by ${esc(p.decidedBy)} ${fmtD(p.decidedAt)}</small>` : ""}</p></div>
    <div class="ph-actions"><button class="btn ghost" data-a="exportSheet">Copy in ASG sheet format</button>${!ro ? `<button class="btn ghost" data-a="importCsv">Import from Google Sheet</button>` : ""}${p.status === "approved" && S.role === "treasurer" ? `<button class="btn" data-a="genSA">Generate Spend Authorization →</button>` : ""}</div></header>
  ${p.status === "returned" ? `<div class="banner bad"><b>Returned by the ASG Funding Committee:</b> ${esc(p.notes || "")}</div>` : ""}
  ${p.status === "approved" ? `<div class="banner good"><b>Approved${p.decidedBy === "FundPath auto-approval" ? " automatically: all 7 committee criteria passed" : " by the ASG Funding Committee"}.</b> <small>Committee decisions are recommendations ratified by Senate (SR §3.1).</small> ${money(ev.total)} is now in your ASG account (FD1000 / PRG040). Generate the Spend Authorization from this budget so you don't type it all again.</div>` : ""}
  ${p.status === "review" ? `<div class="banner info"><b>With the ASG Funding Committee.</b> FundPath flagged items that need a human decision. Expect a reply within 10 academic days, and you'll see it here.</div>` : ""}
  <div class="split">
    <div>
      <section class="card"><h2>Step 1 · Club info <small class="muted">pulled from Miami Central. Fix anything wrong in Org & eligibility.</small></h2>
        <div class="kvs">${f1("Organization", o.name, !!o.name)}${f1("Entity email", o.entityEmail, /@miamioh\.edu$/.test(o.entityEmail || ""))}${f1("Tier status", `Tier ${o.tier} (${money(S.settings.tierMax[o.tier])}/semester max)`, !!o.redBrick)}${f1("President", `${o.president} · ${o.presidentEmail}`, !!o.president)}${f1("Treasurer", `${o.treasurer} · ${o.treasurerEmail}`, !!o.treasurer)}${f1("Advisor", o.advisor, !!o.advisor)}${f1("SA1####", o.worktag, /^SA1\d{4}$/.test(o.worktag || ""))}</div>
        <label class="inline">ASG funding already received this semester<input type="number" min="0" data-f="p:prior" value="${esc(p.prior)}" ${dis}></label>
        <div class="acks">${[["hub", "Events and trips are registered on Miami Central"], ["itemized", "Budget is itemized into specific expenses"], ["quotes", "Quotes attached for hotels, flights and items over $1,000"], ["noGuarantee", "Eligibility doesn't guarantee approval"]].map(([k, t]) => `<label class="check"><input type="checkbox" data-f="ack:${k}" ${(p.ack || {})[k] ? "checked" : ""} ${dis}> ${t}</label>`).join("")}</div>
      </section>
      <section class="card"><h2>Step 2 · Events and trips <small class="muted">names must exactly match Miami Central (SR §6.2.1)</small></h2>
        <table class="tbl items"><thead><tr><th>Type</th><th>Name (exactly as on Miami Central)</th><th>Start</th><th>End</th><th>Event criteria (25% each, SR §11.1)</th><th>Miami Central</th>${ro ? "" : "<th></th>"}</tr></thead><tbody>
        ${p.events.map(e => { const ok = (o.hub || []).includes(e.name); return `<tr class="lvl-${ok ? "ok" : "deny"}"><td><select data-f="ev:${e.id}:type" ${dis}><option ${e.type === "Event" ? "selected" : ""}>Event</option><option ${e.type === "Trip" ? "selected" : ""}>Trip</option></select></td>
          <td><input data-f="ev:${e.id}:name" value="${esc(e.name)}" ${dis}></td><td><input type="date" data-f="ev:${e.id}:start" value="${esc(e.start)}" ${dis}></td><td><input type="date" data-f="ev:${e.id}:end" value="${esc(e.end)}" ${dis}></td>
          <td>${e.type === "Trip" ? `<div class="crit-in"><label class="mini">Travelers<input class="num" type="number" min="0" data-f="ev:${e.id}:travelers" value="${esc(e.travelers || 0)}" ${dis}></label><label class="mini">Nights<input class="num" type="number" min="0" data-f="ev:${e.id}:nights" value="${esc(e.nights || 0)}" ${dis}></label><span class="tag">live hearing</span></div>` : `<div class="crit-in">${[["onCampus", "On campus"], ["educational", "Educational"], ["openToAll", "Open to all"], ["service", "Service"], ["lateNight", "Late night"]].map(([k, t]) => `<label class="mini"><input type="checkbox" data-f="ev:${e.id}:${k}" ${e[k] ? "checked" : ""} ${dis}> ${t}</label>`).join("")}<b class="pct">${eventPct(e, o).pct}%</b></div>`}</td>
          <td>${ok ? `<span class="lv ok">Registered</span>` : `<span class="lv deny">No match</span>`}</td>${ro ? "" : `<td><button class="x" data-a="delEvent" data-id="${e.id}">×</button></td>`}</tr>`; }).join("")}
        </tbody></table>${ro ? "" : `<button class="btn ghost sm" data-a="addEvent">+ Add event or trip</button>`}
        <p class="muted small">On Miami Central for ${esc(o.name)}: ${(o.hub || []).map(h => `<span class="tag">${esc(h)}</span>`).join(" ")}</p>
      </section>
      <section class="card"><h2>Step 3 · Event and trip budget</h2>
        <table class="tbl items"><thead><tr><th>Event / trip</th><th>Budget item</th><th>Category</th><th class="r">Amount</th><th>Comments</th><th>Quote</th><th>Check</th>${ro ? "" : "<th></th>"}</tr></thead><tbody>${eventLines.map(l => lineRow(l, "event")).join("")}</tbody></table>
        ${ro ? "" : `<button class="btn ghost sm" data-a="addLine" data-k="event">+ Add line</button>`}
      </section>
      <section class="card"><h2>Step 4 · Non-event budget <small class="muted">capital = kept more than 1 year · admin = operating costs</small></h2>
        <table class="tbl items"><thead><tr><th>Budget item</th><th>Category</th><th class="r">Amount</th><th>Comments</th><th>Quote</th><th>Check</th>${ro ? "" : "<th></th>"}</tr></thead><tbody>${nonLines.map(l => lineRow(l, "non")).join("")}</tbody></table>
        ${ro ? "" : `<button class="btn ghost sm" data-a="addLine" data-k="non">+ Add line</button>`}
      </section>
      <section class="card"><h2>Step 6 · Purpose and submit</h2>
        <label>How this semester's plan serves ASG's purpose and your constitution <small class="muted">Mission: "${esc(o.mission)}"</small><textarea rows="3" data-f="p:purpose" ${dis}>${esc(p.purpose)}</textarea></label>
        ${!ro ? `<div class="submitrow"><p class="muted small">If all 7 criteria pass, the proposal is approved instantly and the money is available. Anything that needs judgment goes to the ASG Funding Committee instead, with the reasons attached.</p><button class="btn big" data-a="submitProposal">Submit proposal</button></div>` : ""}
      </section>
    </div>
    <aside id="side">${proposalSide(p, o, ev, ro)}</aside>
  </div>`;
}
function proposalSide(p, o, ev, ro) {
  const autoFix = ev.flags.filter(f => f.fix && f.fix.type !== "focus" && f.fix.type !== "org").length;
  return `<section class="card stick">
    <div class="score"><div class="ring" style="--p:${Math.round(ev.passed / 7 * 100)}"><b>${ev.passed}/7</b></div><div><b>Committee criteria</b><p class="muted">${ev.auto ? "All pass: approves automatically" : ev.flags.some(f => f.level === "deny") ? "ASG would deny this as written" : "Would go to the committee for review"}</p></div></div>
    <ul class="crit">${ev.criteria.map(c => `<li class="${c.level}"><i>${c.level === "ok" ? "✓" : c.level === "warn" ? "!" : "✕"}</i>${c.n}. ${esc(c.title)}</li>`).join("")}</ul>
    <h3>Step 5 · Limits</h3>
    <table class="lim">${ev.limits.filter(x => x.limit > 0 || x.req > 0).map(x => `<tr class="${x.req > x.limit + 0.001 ? "over" : ""}"><td>${x.label}<small>${esc(x.note)}</small></td><td class="r mono">${money(x.req)}</td><td class="r mono muted">/ ${money(x.limit)}</td></tr>`).join("")}</table>
    <h3>Fix before you submit ${!ro && autoFix ? `<button class="btn sm" data-a="fixAllP">Fix ${autoFix} automatically</button>` : ""}</h3>
    ${ev.flags.length ? `<ul class="flags">${ev.flags.map(f => { const l = f.line ? p.lines.find(x => x.id === f.line) : null; const e = f.event ? p.events.find(x => x.id === f.event) : null;
      return `<li class="${f.level}"><div><small>Criterion ${f.crit}${l ? " · " + esc(l.item || "line") : e ? " · " + esc(e.name) : ""}</small><p>${esc(f.msg)}</p>${ruleTag(f.rule)}</div>${!ro && f.fix ? `<button class="btn sm ghost" data-a="fixP" data-rule="${f.rule}" data-line="${f.line || ""}" data-event="${f.event || ""}" data-type="${f.fix.type}" data-ids="${f.fix.ids || ""}" data-value="${esc(f.fix.value ?? "")}">${esc(f.fix.label)}</button>` : ""}</li>`; }).join("")}</ul>` : `<p class="okline">Nothing to fix. This will be approved automatically.</p>`}
  </section>`;
}
function refreshProposalSide() {
  const o = ORG(), p = proposalFor(o.id); if (!p) return; const ev = evaluateProposal(p, o, S.settings);
  patch($("#side"), proposalSide(p, o, ev, false));
  p.lines.forEach(l => { const c = $("#lv-" + l.id); if (c) c.innerHTML = lvl(ev.lineLevel[l.id]); const r = $("#row-" + l.id); if (r) r.className = "lvl-" + (ev.lineLevel[l.id] || "ok"); });
}
function applyPFix(p, o, d) {
  if (d.type === "focus") { UI.focus = "in-" + d.line; return; }
  if (d.type === "org") { UI.view = "org"; return; }
  applyFix(p, o, d);
}

function draftJustification(o, p, lines) {
  const vendors = [...new Set(lines.map(l => l.vendor).filter(Boolean))];
  const evs = p ? p.events.filter(e => p.lines.some(x => lines.some(l => l.lineRef === x.id) && x.eventId === e.id)) : [];
  return `Card funds for ${o.name} per our approved ${S.settings.semester} ASG proposal (${p ? p.id : "n/a"}). ${evs.length ? `Events: ${evs.map(e => `${e.name}${e.start ? " (" + fmtD(e.start) + ")" : ""}`).join("; ")}. ` : ""}Expected vendors: ${vendors.length ? vendors.join(", ") : "listed per line"}. Every line maps to an approved budget line. No clothing with Miami's name or logo is included. Proof of budget (approved proposal) and proof of funds (balance report) attached.`;
}
function viewSpend() {
  const o = ORG(); const p = approvedProposal(S, o.id); const led = ledgerFor(S, o.id);
  const items = S.spend.filter(s => s.orgId === o.id);
  const cur = items.find(s => s.id === UI.saId) || null;
  if (cur) return cur.kind === "SA" ? viewSAEditor(cur) : viewReqEditor(cur);
  const routes = { card: led.lines.filter(x => x.route === "card"), contract: led.lines.filter(x => x.route === "contract"), journal: led.lines.filter(x => x.route === "journal") };
  return `<header class="ph"><div><h1>Spend Authorization</h1><p>Turn the approved budget into Workday-ready requests without typing it twice. Each line is re-checked by your advisor and then Accounts Payable / ASG as a second line of review.</p></div>
    <div class="ph-actions">${p ? `<button class="btn" data-a="genSA">Generate from approved budget</button>` : ""}<button class="btn ghost" data-a="newSA" data-fund="Agency">New Agency-fund authorization</button></div></header>
  ${!p ? `<div class="banner info"><b>No approved ASG proposal yet.</b> ASG money can't be spent until the proposal is approved ${ruleTag("FUNDSFIRST")}. You can still request Agency funds (FD9001).</div>` : ""}
  ${p ? `<section class="card"><h2>How your approved budget gets paid <small class="muted">FundPath routes each line the way the SEA training requires</small></h2>
    <div class="routes">
      <div><h3>Card (Spend Authorization)</h3><p class="muted small">Goods: food, supplies, printing, travel</p>${routes.card.map(x => `<div class="rl"><span>${esc(x.l.item)}</span><b class="mono">${money(x.avail)}</b></div>`).join("") || "<p class=muted>None</p>"}</div>
      <div><h3>Contract + requisition</h3><p class="muted small">Speakers and entertainers ${ruleTag("CONTRACT")}</p>${routes.contract.map(x => `<div class="rl"><span>${esc(x.l.item)}</span><b class="mono">${money(x.avail)}</b></div>`).join("") || "<p class=muted>None</p>"}</div>
      <div><h3>Worktag journal transfer</h3><p class="muted small">On-campus rooms, Rec Center, MUPD ${ruleTag("JOURNAL")}</p>${routes.journal.map(x => `<div class="rl"><span>${esc(x.l.item)}</span>${(p.journalPaid || {})[x.l.id] ? `<span class="lv ok">Paid</span>` : `<button class="btn sm ghost" data-a="journalPaid" data-id="${x.l.id}">Mark paid · ${esc(o.worktag)}</button>`}</div>`).join("") || "<p class=muted>None</p>"}</div>
    </div></section>` : ""}
  <section class="card"><h2>Your requests</h2><table class="tbl"><thead><tr><th>ID</th><th>Type</th><th>Fund</th><th class="r">Total</th><th>Status</th><th>With</th><th>Checks</th><th></th></tr></thead><tbody>
  ${items.slice().reverse().map(s => { const e = evaluateSpend(s, S); const w = ownerOf(s, S); return `<tr class="click" data-a="openSA" data-id="${s.id}"><td class="mono">${s.id}</td><td>${s.kind === "SA" ? `Spend Authorization · ${esc(s.descr)}` : `Requisition · ${esc(s.vendor || "service")}`}</td><td>${s.fund === "ASG" ? "ASG · FD1000" : "Agency · FD9001"}</td><td class="r mono">${money(e.total)}</td><td>${chip(s.status)}</td><td><small>${esc(w[0])}<br><span class="muted">${esc(w[1])}</span></small></td><td>${lvl(e.level)}</td><td class="r"><span class="link">Open →</span></td></tr>`; }).join("") || `<tr><td colspan=8 class=muted>Nothing yet. ${p ? "Click “Generate from approved budget”." : ""}</td></tr>`}
  </tbody></table></section>
  ${p ? `<section class="card"><h2>Approved budget vs. spending</h2>${ledgerTable(led)}</section>` : ""}`;
}
function ledgerTable(led) {
  const pct = (a, b) => b ? Math.min(100, a / b * 100) : 0;
  return `<table class="tbl"><thead><tr><th>Approved line</th><th>Pays by</th><th class="r">Approved</th><th class="r">Authorized</th><th class="r">Spent</th><th class="r">Available</th><th style="width:16%">Usage</th></tr></thead><tbody>
  ${led.lines.map(x => `<tr><td><b>${esc(x.l.item)}</b><br><small class="muted">${esc(x.l.cat)}</small></td><td><small>${x.route === "card" ? "Card" : x.route === "contract" ? "Contract" : "Journal transfer"}</small></td><td class="r mono">${money(x.approved)}</td><td class="r mono">${money(x.committed)}</td><td class="r mono">${money(x.spent)}</td><td class="r mono"><b>${money(x.avail)}</b></td><td><div class="usage"><i class="c" style="width:${pct(x.committed, x.approved)}%"></i><i class="s" style="width:${pct(x.spent, x.approved)}%"></i></div></td></tr>`).join("")}
  </tbody></table><p class="legend"><i class="c"></i>Authorized <i class="s"></i>Spent</p>`;
}
function viewSAEditor(s) {
  const o = orgById(s.orgId); const p = approvedProposal(S, s.orgId); const e = evaluateSpend(s, S);
  const ro = !["draft", "returned"].includes(s.status) || S.role !== "treasurer"; const dis = ro ? "disabled" : "";
  const lineOpts = sel => `<option value="">Not in approved budget</option>` + (s.fund === "ASG" && p ? p.lines.map(l => `<option value="${l.id}" ${l.id === sel ? "selected" : ""}>${esc(l.item)} (${money(l.approved ?? l.amount)})</option>`).join("") : "");
  const scList = [...new Set(Object.values(CATS).map(c => c.sc))];
  const timeline = ["Draft", "Advisor", "AP + ASG review", "Card ready", "Card active", "Closed"];
  const at = { draft: 0, returned: 0, advisor: 1, review: 2, approved: 3, pickup: 3, active: 4, closed: 5 }[s.status];
  return `<header class="ph"><div><button class="link" data-a="backSpend">← All requests</button><h1>${s.id} · Create Spend Authorization</h1><p>${esc(o.name)} · ${s.fund === "ASG" ? "ASG funds (FD1000 / PRG040)" : "Agency funds (FD9001 / PRG100)"} ${chip(s.status)}</p></div>
    <div class="ph-actions"><button class="btn ghost" data-a="workdayView" data-id="${s.id}">Workday copy sheet</button>${!ro ? `<button class="btn" data-a="submitSA" data-id="${s.id}">Submit to advisor</button>` : ""}${s.status === "approved" && S.role === "treasurer" ? `<button class="btn" data-a="pickup" data-id="${s.id}">I picked up the card</button>` : ""}</div></header>
  <div class="steps">${timeline.map((t, i) => `<span class="${i < at ? "done" : i === at ? "now" : ""}">${t}</span>`).join("")}</div>
  ${s.status === "returned" ? `<div class="banner bad"><b>Returned:</b> ${esc(s.notes || "")}</div>` : ""}
  <div class="split"><div>
    <section class="card"><h2>Spend Authorization information <small class="muted">same fields as Workday</small></h2>
      <div class="grid4">
        <label>Company<input value="100 Miami University" disabled></label>
        <label>Start date<input type="date" data-f="sa:start" value="${esc(s.start)}" ${dis}></label>
        <label>End date<input type="date" data-f="sa:end" value="${esc(s.end)}" ${dis}></label>
        <label>Description<select data-f="sa:descr" ${dis}>${["NEW CARD", "ADD FUNDS", "RENTAL/GAS CARDS"].map(x => `<option ${x === s.descr ? "selected" : ""}>${x}</option>`).join("")}</select></label>
        <label>Business purpose<input value="Student Org Card Request" disabled></label>
        <label>Spend Authorization total<input value="${money(e.total)}" disabled></label>
        <label>Reimbursement payment type<input value="Check (leave as is)" disabled></label>
        ${s.descr === "ADD FUNDS" ? `<label>Existing card last 4<input data-f="sa:cardLast4" value="${esc(s.cardLast4 || "")}" maxlength="4" ${dis}></label>` : `<label>Currency<input value="USD" disabled></label>`}
      </div>
      ${s.descr === "RENTAL/GAS CARDS" ? `<div class="grid4"><label>Rental vendor<select data-f="rent:vendor" ${dis}>${["Hertz", "Enterprise"].map(x => `<option ${x === (s.rental || {}).vendor ? "selected" : ""}>${x}</option>`).join("")}</select></label><label>Youngest driver age<input type="number" data-f="rent:youngest" value="${esc((s.rental || {}).youngest || 21)}" ${dis}></label><label class="check"><input type="checkbox" data-f="rent:van" ${(s.rental || {}).van ? "checked" : ""} ${dis}> 12–15 passenger or cargo van</label><label class="check"><input type="checkbox" data-f="rent:vanTraining" ${(s.rental || {}).vanTraining ? "checked" : ""} ${dis}> Van safety training done</label></div>` : ""}
      <label>Justification <small class="muted">drafted from your approved budget. Edit freely.</small><textarea rows="4" data-f="sa:justification" ${dis}>${esc(s.justification)}</textarea></label>
      <div class="row"><label class="check"><input type="checkbox" data-f="sa:proofBudget" ${s.proofBudget ? "checked" : ""} ${dis}> Proof of budget attached${s.proofBudget && p ? ` <span class="tag">${p.id} approved proposal</span>` : ""}</label><label class="check"><input type="checkbox" data-f="sa:proofFunds" ${s.proofFunds ? "checked" : ""} ${dis}> Proof of funds attached <span class="tag">balance report</span></label></div>
    </section>
    <section class="card"><h2>Spend Authorization lines</h2>
      <table class="tbl items"><thead><tr><th>Approved budget line</th><th>Expense item</th><th class="r">Qty</th><th class="r">Per unit</th><th class="r">Total</th><th>Memo (business purpose, vendor, event)</th><th>Vendor</th><th>Cash adv.</th><th>Check</th>${ro ? "" : "<th></th>"}</tr></thead><tbody>
      ${s.lines.map(l => { const fl = e.lineFlags[l.id] || []; const lv = worst(fl); return `<tr class="lvl-${lv}"><td><select data-f="sl:${l.id}:lineRef" ${dis}>${lineOpts(l.lineRef)}</select></td>
        <td><select data-f="sl:${l.id}:expense" ${dis}>${scList.map(c => `<option ${c === l.expense ? "selected" : ""}>${c}</option>`).join("")}</select></td>
        <td class="r"><input class="num" type="number" min="0" data-f="sl:${l.id}:qty" value="${esc(l.qty)}" ${dis}></td><td class="r"><input class="num" type="number" min="0" step="0.01" data-f="sl:${l.id}:unit" value="${esc(l.unit)}" ${dis}></td>
        <td class="r mono">${money(spendLineAmt(l))}</td><td><input data-f="sl:${l.id}:memo" value="${esc(l.memo)}" ${dis}></td><td><input data-f="sl:${l.id}:vendor" value="${esc(l.vendor)}" ${dis}></td>
        <td class="c"><input type="checkbox" data-f="sl:${l.id}:cashAdvance" ${l.cashAdvance ? "checked" : ""} ${dis}></td><td>${lvl(lv)}</td>${ro ? "" : `<td><button class="x" data-a="delSL" data-id="${l.id}">×</button></td>`}</tr>`; }).join("")}
      </tbody></table>${ro ? "" : `<button class="btn ghost sm" data-a="addSL">+ Add line</button>`}
      <p class="muted small">Worktags on every line: Cost Center (auto) · Student Organizations and Agencies <b>${esc(o.worktag)}</b> · Fund <b>${s.fund === "ASG" ? "FD1000" : "FD9001"}</b> · Program <b>${s.fund === "ASG" ? "PRG040" : "PRG100"}</b></p>
    </section>
    ${(s.history || []).length ? `<section class="card"><h2>History</h2><ul class="log">${s.history.map(h => `<li><time>${fmtD(h.at)}</time><b>${esc(h.who)}</b> · ${esc(h.action)}${h.note ? `: ${esc(h.note)}` : ""}</li>`).join("")}</ul></section>` : ""}
  </div><aside id="side">${saSide(s, e, ro)}</aside></div>`;
}
function saSide(s, e, ro) {
  return `<section class="card stick"><div class="score"><div class="ring ${e.level}" style="--p:${e.level === "ok" ? 100 : e.level === "warn" ? 60 : 25}"><b>${e.level === "ok" ? "✓" : e.flags.length}</b></div><div><b>Second-line checks</b><p class="muted">${e.level === "ok" ? "Matches the approved budget. Clean." : "The same checks your advisor and AP will see"}</p></div></div>
    ${e.flags.length ? `<ul class="flags">${e.flags.map(f => { const l = f.lineId ? s.lines.find(x => x.id === f.lineId) : null; return `<li class="${f.level}"><div>${f.slip ? `<span class="slip">Slipped past funding approval</span>` : ""}${l ? `<small>${esc(l.desc || l.memo)}</small>` : ""}<p>${esc(f.msg)}</p>${ruleTag(f.rule)}</div>${!ro && l && f.level === "deny" ? `<button class="btn sm ghost" data-a="delSL" data-id="${l.id}">Remove line</button>` : ""}</li>`; }).join("")}</ul>` : `<p class="okline">All checks pass.</p>`}
    ${!ro ? `<p class="muted small">You can submit with open issues, but the reviewer will see every flag. Fixing them now avoids a return.</p>` : ""}</section>`;
}
function refreshSASide() { const s = S.spend.find(x => x.id === UI.saId); if (!s) return; patch($("#side"), saSide(s, evaluateSpend(s, S), !["draft", "returned"].includes(s.status) || S.role !== "treasurer")); }
function viewReqEditor(s) {
  const o = orgById(s.orgId); const e = evaluateSpend(s, S); const p = approvedProposal(S, s.orgId); const pl = p && p.lines.find(l => l.id === s.lineRef);
  const ro = !["draft", "returned"].includes(s.status) || S.role !== "treasurer"; const dis = ro ? "disabled" : "";
  const ck = (k, t) => `<label class="check"><input type="checkbox" data-f="rq:${k}" ${s[k] ? "checked" : ""} ${dis}> ${t}</label>`;
  return `<header class="ph"><div><button class="link" data-a="backSpend">← All requests</button><h1>${s.id} · Service requisition</h1><p>${esc(o.name)} · ${pl ? `Approved line: ${esc(pl.item)} (${money(pl.approved ?? pl.amount)})` : "Not tied to an approved line"} ${chip(s.status)}</p></div>
    <div class="ph-actions">${!ro ? `<button class="btn" data-a="submitSA" data-id="${s.id}">Submit to advisor</button>` : ""}</div></header>
  <div class="split"><div><section class="card"><h2>Contract checklist ${ruleTag("CONTRACT")}</h2>
    <div class="grid3"><label>Vendor / speaker<input data-f="rq:vendor" value="${esc(s.vendor)}" ${dis}></label><label>Amount<input type="number" data-f="rq:amount" value="${esc(s.amount)}" ${dis}></label><label>Service date<input type="date" data-f="rq:serviceDate" value="${esc(s.serviceDate)}" ${dis}></label></div>
    <div class="col">${ck("contractSent", "Contract sent to SEA for review (at least 1 month before the service)")}${ck("seaApproved", "SEA approved the contract before we signed")}${ck("indemnity", "Indemnification + insurance agreement attached")}${ck("supplier", "Vendor is set up in Workday (Payment Works, via email to SEA)")}${ck("payeeMiami", "Payee is a Miami student or employee")}</div>
    <label>Memo<input data-f="rq:memo" value="${esc(s.memo || "")}" ${dis}></label>
    <p class="muted small">After approval: Requisitions app → Request Non-Catalog Items, type Service, Ship-To 550 E Spring Street, worktag ${esc(o.worktag)} / ${s.fund === "ASG" ? "FD1000 / PRG040" : "FD9001 / PRG100"}.</p></section></div>
  <aside id="side">${saSide({ ...s, lines: [] }, e, ro)}</aside></div>`;
}
function workdayModal(id) {
  const s = S.spend.find(x => x.id === id); const o = orgById(s.orgId);
  const row = (k, v) => `<tr><td>${k}</td><td><code>${esc(v)}</code></td><td><button class="btn sm ghost" data-a="copy" data-v="${esc(v)}">Copy</button></td></tr>`;
  return `<div class="mh"><h2>Workday copy sheet · ${s.id}</h2><button class="x" data-a="closeModal">×</button></div>
  <p class="muted small">Until FundPath is connected to Workday, this is every field in the order Workday asks for it (Search “Create Spend Auth”).</p>
  <table class="tbl wd">${row("Company", "100 Miami University")}${row("Start Date", fmtD(s.start))}${row("End Date", fmtD(s.end))}${row("Description", s.descr)}${row("Business Purpose", "Student Org Card Request")}${row("Spend Authorization Total", evaluateSpend(s, S).total.toFixed(2))}${row("Reimbursement Payment Type", "Check (leave unchanged)")}${row("Justification", s.justification)}</table>
  ${s.lines.map((l, i) => `<h3>Line ${i + 1}</h3><table class="tbl wd">${row("Expense Item", l.expense)}${row("Quantity", l.qty)}${row("Per Unit Amount", (+l.unit).toFixed(2))}${row("Memo", `${l.memo}${l.vendor ? " · Vendor: " + l.vendor : ""}`)}${row("Cash Advance Requested", "Leave unchecked")}${row("Student Organizations and Agencies", o.worktag)}${row("Fund", s.fund === "ASG" ? "FD1000 E&G Designated" : "FD9001 Student Organization - Agency")}${row("Program", s.fund === "ASG" ? "PRG040 Student Services" : "PRG100 Agency Funds")}</table>`).join("")}
  <p class="muted small">Attachments: approved proposal (proof of budget) and balance report screenshot (proof of funds).</p>`;
}

function viewCard() {
  const o = ORG(); const led = ledgerFor(S, o.id);
  const cards = S.spend.filter(s => s.orgId === o.id && s.kind === "SA" && ["approved", "active", "closed"].includes(s.status));
  return `<header class="ph"><div><h1>Card & receipts</h1><p>See exactly what's left, answer the Receipts Questionnaire as you go, and close the authorization to release unspent funds.</p></div></header>
  <section class="kpis four"><div class="kpi"><span>Loaded to card</span><b>${money(led.loaded)}</b></div><div class="kpi"><span>Spent on card</span><b>${money(led.cardSpent)}</b></div><div class="kpi good"><span>Card balance</span><b>${money(led.cardBal)}</b></div><div class="kpi ${S.txns.some(t => t.orgId === o.id && !t.receiptDone) ? "bad" : ""}"><span>Receipts missing</span><b>${S.txns.filter(t => t.orgId === o.id && !t.receiptDone).length}</b></div></section>
  ${cards.map(s => { const tx = S.txns.filter(t => t.saId === s.id); const loaded = cents(s.lines.reduce((t, l) => t + spendLineAmt(l), 0)); const spent = cents(tx.reduce((t, x) => t + x.amount, 0)); const allDone = tx.every(t => t.receiptDone);
    return `<section class="card"><h2>${s.id} · ${esc(s.descr)}${s.cardLast4 ? ` · card ••${esc(s.cardLast4)}` : ""} ${chip(s.status)}<span>${s.status === "approved" ? `<button class="btn sm" data-a="pickup" data-id="${s.id}">I picked up the card</button>` : s.status === "active" ? `<button class="btn sm ghost" data-a="addTxn" data-id="${s.id}">+ Card transaction</button> <button class="btn sm" data-a="closeSA" data-id="${s.id}" ${allDone ? "" : "disabled"}>Close Spend Authorization</button>` : ""}</span></h2>
      ${s.status === "approved" ? `<div class="banner info">Card is ready at <b>Accounts Payable, 107 Roudebush Hall</b>. Bring your Miami ID.</div>` : ""}
      <p class="muted small">Loaded ${money(loaded)} · spent ${money(spent)} · <b>${money(loaded - spent)} left</b>${s.status === "closed" ? ` · ${money(loaded - spent)} released back to your ASG budget` : ""}</p>
      <table class="tbl"><thead><tr><th>Date</th><th>Merchant</th><th>Budget line</th><th class="r">Amount</th><th>Receipts Questionnaire</th><th></th></tr></thead><tbody>
      ${tx.map(t => { const pl = approvedProposal(S, o.id) && approvedProposal(S, o.id).lines.find(l => l.id === t.lineRef); return `<tr><td>${fmtD(t.date)}</td><td><b>${esc(t.merchant)}</b></td><td>${esc(pl ? pl.item : "—")}</td><td class="r mono">${money(t.amount)}</td><td>${t.receiptDone ? `<span class="lv ok">Complete</span> <small class="muted">${esc(t.file)}</small>` : `<span class="lv warn">Needs receipt + 6 answers</span>`}</td><td class="r">${t.receiptDone ? "" : `<button class="btn sm" data-a="receipt" data-id="${t.id}">Answer</button>`}</td></tr>`; }).join("") || `<tr><td colspan=6 class=muted>No transactions yet.</td></tr>`}
      </tbody></table></section>`; }).join("") || `<section class="card"><p class="muted">No approved card yet. Once AP approves a Spend Authorization, it shows up here.</p></section>`}
  ${led.p ? `<section class="card"><h2>Approved budget vs. spending</h2>${ledgerTable(led)}</section>` : ""}`;
}
function receiptModal(id) {
  const t = S.txns.find(x => x.id === id); const q = t.q || {};
  const f = (k, l, ph) => `<label>${l}<input data-m="q.${k}" value="${esc(q[k] || "")}" placeholder="${ph}"></label>`;
  return `<div class="mh"><h2>Receipts Questionnaire · ${esc(t.merchant)} ${money(t.amount)}</h2><button class="x" data-a="closeModal">×</button></div>
  <p class="muted small">Workday asks these for every transaction ${ruleTag("RECEIPTS")}. FundPath pre-fills what it already knows.</p>
  <div class="grid2">${f("who", "Who made the purchase?", "Name")}${f("what", "What was bought?", "Items")}${f("when", "When?", "Date")}${f("where", "Where?", "Merchant")}${f("how", "How was it paid?", "Org card ending …")}${f("why", "Why? (event / business purpose)", "Event")}</div>
  <label>Itemized receipt<input type="file" accept="image/*,.pdf" data-m="file"><small class="muted">${esc(t.file || "Photo or PDF")}</small></label>
  <div class="mf"><span></span><button class="btn" data-a="saveReceipt" data-id="${id}">Save</button></div>`;
}
function txnModal(saId) {
  const s = S.spend.find(x => x.id === saId);
  return `<div class="mh"><h2>Add card transaction (demo)</h2><button class="x" data-a="closeModal">×</button></div><p class="muted small">In production this feed comes from the card statement.</p>
  <div class="grid2"><label>Date<input type="date" id="txDate" value="${todayIso()}"></label><label>Merchant<input id="txMerch" value="${esc((s.lines[0] && s.lines[0].vendor) || "Oxford caterer")}"></label>
  <label>Budget line<select id="txLine">${s.lines.map(l => `<option value="${l.lineRef}">${esc(l.desc || l.memo)}</option>`).join("")}</select></label><label>Amount<input type="number" step="0.01" id="txAmt" value="${s.lines[0] ? spendLineAmt(s.lines[0]) : 0}"></label></div>
  <div class="mf"><span></span><button class="btn" data-a="saveTxn" data-id="${saId}">Add</button></div>`;
}

function viewDeposits() {
  const o = ORG(); const list = S.deposits.filter(d => d.orgId === o.id).slice().reverse();
  return `<header class="ph"><div><h1>Deposits & cash sales</h1><p>Money you collect only counts once the cash sale is recorded in Workday, within 24 hours.</p></div><div class="ph-actions"><button class="btn" data-a="newDeposit">Record a deposit</button></div></header>
  <section class="card"><table class="tbl"><thead><tr><th>Deposited</th><th>Source</th><th>Payment type</th><th>Revenue cat.</th><th class="r">Amount</th><th>Recorded in Workday</th><th>Checks</th><th></th></tr></thead><tbody>
  ${list.map(d => { const e = evaluateDeposit(d); return `<tr><td>${fmtD(d.deposited)}<br><small class="muted">${esc(d.memo || "")}</small></td><td>${esc(d.source)}</td><td>${esc(d.payType)}</td><td class="mono">${esc(d.rc)}</td><td class="r mono">${money(d.amount)}</td><td>${d.recorded ? fmtD(d.recorded) : `<span class="lv deny">Not recorded</span>`}</td><td>${e.flags.map(f => ruleTag(f.rule)).join("") || lvl("ok")}</td><td class="r">${d.recorded ? "" : `<button class="btn sm" data-a="recordSale" data-id="${d.id}">Mark recorded</button>`}</td></tr>`; }).join("") || `<tr><td colspan=8 class=muted>No deposits yet.</td></tr>`}
  </tbody></table><p class="muted small">Cash sale fields: Company 100 Miami University · Customer “Student Organization Deposits” · Bank account “JPMC MU Merchant Settlement” (card) or “PNC MU Student Organization Deposits” · Deposit reference = org name · Driving worktag ${esc(o.worktag)} · RC0244 dues/fees/food (non-taxable), RC0331 merchandise (taxable), RC0330 gifts.</p></section>`;
}
let draftDep = null;
function depositModal() {
  const d = draftDep; const e = evaluateDeposit(d);
  const sel = (k, opts) => `<select data-m="${k}">${opts.map(x => `<option ${x === d[k] ? "selected" : ""}>${x}</option>`).join("")}</select>`;
  return `<div class="mh"><h2>Record a deposit</h2><button class="x" data-a="closeModal">×</button></div>
  <div class="grid2"><label>Source${sel("source", ["Card reader settlement", "PNC deposit", "eMarket", "PayPal", "Venmo", "Square"])}</label><label>Payment type${sel("payType", ["Visa/MC/Discover/Debit", "American Express", "Check (includes cash)", "Mixed (includes AmEx)"])}</label>
  <label>Revenue category${sel("rc", ["RC0244", "RC0331", "RC0330"])}</label><label>Amount<input type="number" step="0.01" data-m="amount" value="${d.amount || ""}"></label>
  <label>Money received<input type="date" data-m="received" value="${d.received}"></label><label>Deposited / settled<input type="date" data-m="deposited" value="${d.deposited}"></label>
  <label>What it was for<input data-m="memo" value="${esc(d.memo)}"></label><label>Receipt photo<input type="file" data-m="receipt"><small class="muted">${esc(d.receipt || "")}</small></label></div>
  <div id="mcheck">${checkList(e.flags)}</div>
  <div class="mf"><span></span><button class="btn" data-a="saveDeposit" ${e.flags.some(f => f.rule === "AMEX" || f.rule === "PROCESSOR") ? "disabled" : ""}>Save and record in Workday</button></div>`;
}
const checkList = flags => flags.length ? `<ul class="flags">${flags.map(f => `<li class="${f.level}"><div><p>${esc(f.msg)}</p>${ruleTag(f.rule)}</div></li>`).join("")}</ul>` : `<p class="okline">All checks pass.</p>`;

function viewHelp() {
  const o = ORG(); const threads = S.threads.filter(t => t.orgId === o.id).slice().reverse();
  const t = S.threads.find(x => x.id === UI.threadId && x.orgId === o.id) || null;
  if (t && t.unread) { t.unread = false; save(); }
  const sugg = ["What's the food limit for our tier?", "Do we need a quote for a $1,200 item?", "Can we put a speaker on the card?", "How do I pay for an Armstrong room?", "Can we fund a trip over spring break?", "Why can't we spend our ASG money yet?"];
  return `<header class="ph"><div><h1>Funding Help</h1><p>Answers grounded in ASG and SEA rules, any time. One tap routes it to the right office (asgfunding@miamioh.edu for ASG questions).</p></div><div class="ph-actions"><button class="btn ghost" data-a="newThread">New question</button></div></header>
  <div class="chat"><div class="threads">${threads.map(x => `<button class="th ${t && t.id === x.id ? "on" : ""}" data-a="thread" data-id="${x.id}"><b>${esc(x.subject)}</b><span>${x.status === "open" ? chip("open", "Waiting on ASG") : x.status === "answered" ? chip("answered", "ASG answered") : chip("ai", "AI answered")} ${x.unread ? "<i class=dot></i>" : ""}</span></button>`).join("") || `<p class="muted pad">No questions yet.</p>`}</div>
    <div class="convo">${t ? `<div class="msgs">${t.msgs.map(msgHtml).join("")}${UI.busy ? `<div class="msg ai"><div class="bub typing"><i></i><i></i><i></i></div></div>` : ""}</div>
      ${t.status === "ai" ? `<div class="escal"><span>Need a person? It goes to <b>${esc(routeFor(t))}</b>.</span><button class="btn sm" data-a="escalate" data-id="${t.id}">Ask a real ASG liaison</button></div>` : t.status === "open" ? `<div class="escal wait">With ${esc(routeFor(t))}. Replies show up here and on your dashboard.</div>` : ""}
      <form class="composer" data-a2="send"><input id="chatIn" placeholder="Ask a follow-up…" autocomplete="off"><button class="btn">Send</button></form>`
    : `<div class="empty"><h3>Ask anything about ASG funding or spending</h3><div class="sugg">${sugg.map(s => `<button data-a="ask" data-q="${esc(s)}">${esc(s)}</button>`).join("")}</div><form class="composer" data-a2="send"><input id="chatIn" placeholder="e.g. Can we buy food for a members-only meeting?" autocomplete="off"><button class="btn">Ask</button></form></div>`}</div></div>`;
}
function routeFor(t) { const last = t.msgs.filter(m => m.rules).slice(-1)[0]; const r = last && last.rules && last.rules[0]; const st = r && RULES[r] ? RULES[r].stage : ""; return st === "Deposits" ? "Treasury Services / SEA" : st === "Spend" || st === "Close-out" ? "Accounts Payable + SEA (studentorgfin@miamioh.edu)" : "ASG Financial Services (asgfunding@miamioh.edu)"; }
function msgHtml(m) { if (m.system) return `<div class="sys">${esc(m.text)}</div>`; return `<div class="msg ${m.from}"><div class="who">${esc(m.who)}${m.from === "asg" ? ` <span class="chip green">Verified ASG</span>` : m.from === "ai" ? ` <span class="chip gray">AI</span>` : ""}</div><div class="bub">${esc(m.text).replace(/\n/g, "<br>")}${m.rules && m.rules.length ? `<div class="cites">${m.rules.map(ruleTag).join("")}</div>` : ""}</div></div>`; }
const SYN = { LIMFOOD: "food pizza catering meal lunch dinner snacks", LIMSPEAK: "speaker speakers honorarium keynote", LIMADMIN: "admin subscription subscriptions software", LIMSTORE: "storage", LIMHOTEL: "hotel lodging", LIMFLIGHT: "flight flights plane airfare", QUOTES: "quote quotes 1000 1200", HUBMATCH: "hub listed name event", ITEMIZED: "itemized itemize misc", TIERMAX: "tier max maximum limit cap how much 5000", DEADLINE: "deadline when window due close", PROHIBITED: "alcohol beer wine tobacco gambling", BREAKTRIP: "trip break spring winter summer", FUNDSFIRST: "can't spend yet before approval money", CONTRACT: "speaker contract card performer dj entertainer", JOURNAL: "armstrong room rec center mupd on campus journal", CASHADV: "cash advance", RECEIPTS: "receipt receipts questionnaire", CLOSESA: "close", CASHSALE: "deposit record cash sale", AMEX: "amex american express", PROCESSOR: "paypal venmo square", REIMB: "reimburse reimbursement own card", LICENSING: "shirt shirts logo apparel", RENTAL: "rental car van hertz enterprise driver", JUNE1: "june summer fiscal", TRAINING: "workday access training quiz", CAPITAL: "capital equipment heater" };
function localAnswer(q) {
  const words = q.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(w => w.length > 2);
  const scored = Object.keys(RULES).map(id => { const syn = SYN[id] || ""; const bag = syn + " " + RULES[id].title.toLowerCase(); return { id, s: words.reduce((s, w) => s + (syn.split(" ").includes(w) ? 3 : bag.includes(w) ? 1 : 0), 0) }; }).sort((a, b) => b.s - a.s);
  const top = scored.filter(x => x.s >= 3 && x.s >= scored[0].s * 0.7).slice(0, 2);
  if (!top.length) return { text: "I couldn't match that to a specific ASG or SEA rule. Tap “Ask a real ASG liaison” and it goes to the right office.", rules: [] };
  const o = ORG(); let extra = "";
  if (top[0].id === "LIMFOOD") extra = ` For ${o.name} (Tier ${o.tier}) that's ${money(S.settings.tierFood[o.tier])} this semester.`;
  if (top[0].id === "TIERMAX") extra = ` For ${o.name} (Tier ${o.tier}) that's ${money(S.settings.tierMax[o.tier])} this semester.`;
  const modeled = top.some(x => RULES[x.id].kind === "modeled");
  return { text: top.map(x => RULES[x.id].text).join(" ") + extra + (modeled ? "\n\nPart of this comes from a modeled rule, so confirm with a liaison." : ""), rules: top.map(x => x.id) };
}
async function aiCall(body, ms = 12000) { const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms); try { const res = await fetch("api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: ctl.signal }); clearTimeout(t); if (!res.ok) return null; const j = await res.json(); return j && j.text ? j : null; } catch (e) { clearTimeout(t); return null; } }
async function askAI(t, q) {
  UI.busy = true; render(); scrollChat();
  const o = ORG();
  const ai = await aiCall({ mode: "chat", question: q, org: { name: o.name, tier: o.tier, tierMax: S.settings.tierMax[o.tier], food: S.settings.tierFood[o.tier] }, rules: Object.values(RULES).map(r => ({ id: r.id, title: r.title, kind: r.kind, text: r.text })), history: t.msgs.filter(m => !m.system).slice(-6).map(m => ({ from: m.from, text: m.text })) });
  const ans = ai ? { text: ai.text, rules: (ai.rules || []).filter(id => RULES[id]) } : localAnswer(q);
  t.msgs.push({ from: "ai", who: "FundPath AI", text: ans.text, rules: ans.rules });
  UI.busy = false; save(); render(); scrollChat();
}
function scrollChat() { const m = $(".msgs"); if (m) m.scrollTop = m.scrollHeight; }
function sendQuestion(q) {
  q = (q || "").trim(); if (!q) return;
  let t = S.threads.find(x => x.id === UI.threadId && x.orgId === S.orgId);
  if (!t) { t = { id: nextId("Q", S.threads), orgId: S.orgId, status: "ai", subject: q.length > 60 ? q.slice(0, 57) + "…" : q, created: todayIso(), msgs: [] }; S.threads.push(t); UI.threadId = t.id; }
  t.msgs.push({ from: "user", who: ORG().treasurer, text: q });
  if (t.status === "open") { save(); render(); scrollChat(); return; }
  askAI(t, q);
}

function viewResources() {
  const C = [["ASG funding proposals, rules, caps", "ASG Financial Services", "asgfunding@miamioh.edu"], ["Budgets, Workday, org finance", "SEA student org finance", "studentorgfin@miamioh.edu"], ["Org accounts, Agency setup, supplier onboarding", "Student Engagement & Activities, 2030 Armstrong", "studentactivities@miamioh.edu · (513) 529-2266"], ["Payments, purchasing cards, check requests, vendors", "Accounts Payable, 107 Roudebush Hall", "AccountsPayable@miamioh.edu · (513) 529-9200"], ["Deposits, card readers, cash sales", "Treasury Services", "treasuryservices@miamioh.edu · (513) 529-6417"], ["eMarket online payment pages", "Bursar e-commerce", "bur_ecommerce@miamioh.edu"], ["Donations, Give to Miami, Move In Miami", "University Advancement, 926 Chestnut Lane", "MUDevelopment@miamioh.edu · (513) 529-5957"], ["Travel emergency", "Miami University Police", "(513) 529-2222"]];
  const T = [["Workday access module before first requisition", "At least 2 weeks; renew every academic year"], ["Spend Authorization processing (after advisor)", "2–3 business days at Accounts Payable"], ["ASG proposal decision", "Within 10 academic days (manual review)"], ["Contracts for services", "At least 1 month before the service"], ["Record a cash sale", "Within 24 hours of deposit/settlement"], ["Deposit over $1,000", "Next business day (ORC 9.38)"], ["Hertz on-campus delivery", "At least 7 days ahead; 2–3 weeks preferred"], ["Student Life Special Events Fund", "At least 8 weeks before the event"], ["Spend Authorizations", "None accepted after June 1"]];
  return `<header class="ph"><div><h1>Resources</h1><p>The right office for each question, and every deadline from the SEA treasurer training in one place.</p></div></header>
  <div class="split2"><section class="card"><h2>Who to contact</h2><table class="tbl">${C.map(c => `<tr><td><b>${c[0]}</b><br><small class="muted">${c[1]}</small></td><td class="small">${c[2]}</td></tr>`).join("")}</table></section>
  <section class="card"><h2>Lead times</h2><table class="tbl">${T.map(t => `<tr><td>${t[0]}</td><td><b>${t[1]}</b></td></tr>`).join("")}</table></section></div>
  <section class="card"><h2>Sources FundPath is built on</h2><ul class="log">${Object.values(SRC).filter(Boolean).filter((v, i, a) => a.findIndex(x => x.label === v.label) === i).map(s => `<li><a href="${s.url}" target="_blank" rel="noopener">${esc(s.label)} ↗</a></li>`).join("")}</ul>
  <p class="muted small">The ASG Financial Services module in the Canvas course is locked to students, so tier caps for Tiers 1–3 and current window dates are modeled. Tier 4's $5,000 cap and the category limits come from the ASG proposal template.</p></section>`;
}

function viewOrg() {
  const o = ORG(); const r = o.readiness;
  const inp = (k, l) => `<label>${l}<input data-o="${k}" value="${esc(o[k] || "")}"></label>`;
  return `<header class="ph"><div><h1>Org & eligibility</h1><p>In production these sync from Miami Central, Canvas and Workday. Edit here for the demo.</p></div></header>
  <section class="card"><h2>Step 1 info</h2><div class="grid3">${inp("name", "Organization")}${inp("entityEmail", "Entity email")}<label>Red Brick tier<select data-o="tier">${[1, 2, 3, 4].map(n => `<option value="${n}" ${n == o.tier ? "selected" : ""}>Tier ${n} · ${money(S.settings.tierMax[n])} max</option>`).join("")}</select></label>${inp("president", "President")}${inp("presidentEmail", "President email")}${inp("worktag", "SA1####")}${inp("treasurer", "Treasurer")}${inp("treasurerEmail", "Treasurer email")}${inp("advisor", "Advisor")}</div>
  <label>Mission (from constitution)<textarea data-o="mission" rows="2">${esc(o.mission)}</textarea></label>
  <label>Events registered on Miami Central (one per line)<textarea data-o="hub" rows="3">${esc((o.hub || []).join("\n"))}</textarea></label>
  <div class="row"><label class="check"><input type="checkbox" data-o="redBrick" ${o.redBrick ? "checked" : ""}> Red Brick tier on record</label><label class="check"><input type="checkbox" data-o="penalty" ${o.penalty ? "checked" : ""}> Active ASG penalty</label><label>Agency balance<input type="number" data-o="agencyBalance" value="${o.agencyBalance}"></label></div></section>
  <section class="card"><h2>Treasurer authorization ${ruleTag("TRAINING")}</h2>${readinessHtml(o)}
  <div class="row"><label class="check"><input type="checkbox" data-r="hub" ${r.hub ? "checked" : ""}> Listed on Miami Central</label><label class="check"><input type="checkbox" data-r="terms" ${r.terms ? "checked" : ""}> Terms accepted</label><label class="check"><input type="checkbox" data-r="module" ${r.module ? "checked" : ""}> Workday module done</label><label>Access request<select data-r="access">${["none", "pending", "approved"].map(x => `<option ${x === r.access ? "selected" : ""}>${x}</option>`).join("")}</select></label></div></section>`;
}

function viewRules() {
  const edit = S.role === "asg"; const st = S.settings; const dis = edit ? "" : "disabled";
  const stages = ["Eligibility", "Proposal", "Spend", "Close-out", "Deposits"];
  const n = k => Object.values(RULES).filter(r => r.kind === k).length;
  return `<header class="ph"><div><h1>Rules${edit ? " & settings" : ""}</h1><p>${n("sourced")} from ASG/SEA materials · ${n("precedent")} from past ASG decisions · ${n("modeled")} modeled. Every flag in FundPath links back here.</p></div></header>
  <section class="card"><h2>${esc(st.semester)} settings ${edit ? "" : `<small class="muted">(set by ASG)</small>`}</h2><div class="grid4">
    <label>Window opens<input type="date" data-s="window.open" value="${st.window.open}" ${dis}></label><label>Window closes<input type="date" data-s="window.close" value="${st.window.close}" ${dis}></label>
    ${[1, 2, 3, 4].map(t => `<label>Tier ${t} max${t === 4 ? " (sourced)" : " (modeled)"}<input type="number" data-s="tierMax.${t}" value="${st.tierMax[t]}" ${dis}></label>`).join("")}
    ${[1, 2, 3, 4].map(t => `<label>Tier ${t} food limit<input type="number" data-s="tierFood.${t}" value="${st.tierFood[t]}" ${dis}></label>`).join("")}
    <label>Admin limit<input type="number" data-s="admin" value="${st.admin}" ${dis}></label><label>Storage limit<input type="number" data-s="storage" value="${st.storage}" ${dis}></label><label>Speaker limit<input type="number" data-s="speakers" value="${st.speakers}" ${dis}></label><label>Quote required over<input type="number" data-s="quoteOver" value="${st.quoteOver}" ${dis}></label>
  </div></section>
  ${stages.map(sg => `<section class="card"><h2>${sg}</h2><div class="rules">${Object.values(RULES).filter(r => r.stage === sg).map(r => `<div class="rule"><div><b>${esc(r.title)}</b><span class="kind ${r.kind}">${r.kind}</span></div><p>${esc(r.text)}</p>${r.src ? `<a href="${r.src.url}" target="_blank" rel="noopener">${esc(r.src.label)} ↗</a>` : ""}</div>`).join("")}</div></section>`).join("")}`;
}
function ruleModal(id) { const r = RULES[id]; return `<div class="mh"><h2>${esc(r.title)}</h2><button class="x" data-a="closeModal">×</button></div><span class="kind ${r.kind}">${r.kind}</span><p>${esc(r.text)}</p>${r.src ? `<p><a href="${r.src.url}" target="_blank" rel="noopener">${esc(r.src.label)} ↗</a></p>` : ""}`; }

function viewAdvisor() {
  const q = S.spend.filter(s => s.status === "advisor");
  return `<header class="ph"><div><h1>Advisor approvals</h1><p>Every Workday request needs the advisor before Accounts Payable can start its clock. FundPath shows the checks so it takes seconds.</p></div></header>
  ${q.map(s => { const e = evaluateSpend(s, S); const o = orgById(s.orgId); return `<section class="card"><h2>${s.id} · ${esc(o.name)} · ${s.kind === "SA" ? esc(s.descr) : "Service requisition"} <span>${lvl(e.level)}</span></h2>
    <p class="muted small">${esc(s.justification || s.memo || "")}</p>
    ${s.kind === "SA" ? `<table class="tbl"><thead><tr><th>Line</th><th>Memo</th><th class="r">Amount</th><th>Check</th></tr></thead><tbody>${s.lines.map(l => `<tr><td>${esc(l.desc)}</td><td>${esc(l.memo)}</td><td class="r mono">${money(spendLineAmt(l))}</td><td>${lvl(worst(e.lineFlags[l.id] || []))}</td></tr>`).join("")}</tbody></table>` : ""}
    ${e.flags.length ? checkList(e.flags) : ""}
    <div class="mf"><span class="muted small">Total ${money(e.total)} · ${s.fund === "ASG" ? "FD1000 / PRG040" : "FD9001 / PRG100"}</span><span><button class="btn ghost" data-a="returnSA" data-id="${s.id}">Return to treasurer</button> <button class="btn" data-a="advisorApprove" data-id="${s.id}">Approve</button></span></div></section>`; }).join("") || `<section class="card"><p class="muted">Nothing waiting on advisors.</p></section>`}`;
}

function viewReview() {
  const q = S.proposals.filter(p => p.status === "review"); const auto = S.proposals.filter(p => p.status === "approved" && p.decidedBy === "FundPath auto-approval");
  return `<header class="ph"><div><h1>Proposal review</h1><p>Clean proposals approve themselves. You only see the ones that need judgment, with the reasons already written.</p></div></header>
  <section class="kpis four"><div class="kpi"><span>Needs a decision</span><b>${q.length}</b></div><div class="kpi good"><span>Auto-approved this semester</span><b>${auto.length}</b></div><div class="kpi"><span>Approved $ this semester</span><b>${money(S.proposals.filter(p => p.status === "approved").reduce((t, p) => t + p.lines.reduce((u, l) => u + +(l.approved ?? l.amount), 0), 0))}</b></div><div class="kpi"><span>Returned</span><b>${S.proposals.filter(p => p.status === "returned").length}</b></div></section>
  ${q.map(p => { const o = orgById(p.orgId); const ev = evaluateProposal(p, o, S.settings); return `<section class="card"><h2>${esc(o.name)} · ${p.id} <span>${chip("review")} <small class="muted">submitted ${fmtD(p.submittedAt)}</small></span></h2>
    <div class="split2"><div><ul class="crit">${ev.criteria.map(c => `<li class="${c.level}"><i>${c.level === "ok" ? "✓" : c.level === "warn" ? "!" : "✕"}</i>${c.n}. ${esc(c.title)}</li>`).join("")}</ul>${ev.flags.length ? checkList(ev.flags) : ""}<p class="small"><b>Purpose:</b> ${esc(p.purpose)}</p></div>
    <div><table class="tbl"><thead><tr><th>Line</th><th>Category</th><th class="r">Requested</th><th class="r">Approve</th></tr></thead><tbody>${p.lines.map(l => `<tr class="lvl-${ev.lineLevel[l.id] || "ok"}"><td>${esc(l.item)}<br><small class="muted">${esc(l.comment)}</small></td><td><small>${esc(l.cat)}</small></td><td class="r mono">${money(+l.amount)}</td><td class="r"><input class="num" type="number" data-ap="${p.id}:${l.id}" value="${l.approved ?? l.amount}"></td></tr>`).join("")}</tbody></table>
    <label>Committee notes to the org<textarea id="notes-${p.id}" rows="2" placeholder="Required if returning">${esc(p.notes || "")}</textarea></label>
    <div class="mf"><span></span><span><button class="btn ghost" data-a="returnP" data-id="${p.id}">Return with notes</button> <button class="btn" data-a="approveP" data-id="${p.id}">Approve</button></span></div></div></div></section>`; }).join("") || `<section class="card"><p class="muted">Nothing needs a decision.</p></section>`}
  <section class="card"><h2>Auto-approved <small class="muted">7/7 criteria. Spot-check any of them.</small></h2><table class="tbl"><thead><tr><th>Org</th><th>Proposal</th><th>Approved</th><th class="r">Amount</th><th></th></tr></thead><tbody>${auto.map(p => `<tr><td>${esc(orgById(p.orgId).name)}</td><td class="mono">${p.id}</td><td>${fmtD(p.decidedAt)}</td><td class="r mono">${money(p.lines.reduce((t, l) => t + +(l.approved ?? l.amount), 0))}</td><td class="r"><button class="btn sm ghost" data-a="viewP" data-id="${p.id}">View</button></td></tr>`).join("")}</tbody></table></section>`;
}

function viewSAReview() {
  const q = S.spend.filter(s => s.status === "review").reverse();
  const totalSlips = q.reduce((t, s) => t + evaluateSpend(s, S).slips, 0);
  return `<header class="ph"><div><h1>Spend review · second line</h1><p>Every line is re-checked from scratch against the approved budget and the SEA purchasing rules. This is where anything that slipped through funding approval gets caught.</p></div></header>
  ${totalSlips ? `<div class="banner bad"><b>${totalSlips} item${totalSlips > 1 ? "s" : ""} slipped past funding approval</b> and ${totalSlips > 1 ? "were" : "was"} caught here because the Spend Authorization detail didn't match what the budget said.</div>` : ""}
  ${q.map(s => { const e = evaluateSpend(s, S); const o = orgById(s.orgId); const p = approvedProposal(S, s.orgId); const clean = s.kind === "SA" ? s.lines.filter(l => worst(e.lineFlags[l.id] || []) !== "deny") : [];
    return `<section class="card"><h2>${s.id} · ${esc(o.name)} · ${s.kind === "SA" ? esc(s.descr) : "Service requisition"} <span>${lvl(e.level)} <small class="muted">${(s.history || []).map(h => h.action).join(" → ")}</small></span></h2>
    <p class="small">${esc(s.justification || s.memo || "")}</p>
    ${s.kind === "SA" ? `<table class="tbl"><thead><tr><th>SA line</th><th>Approved budget line</th><th>Memo</th><th class="r">Amount</th><th>Second-line result</th></tr></thead><tbody>${s.lines.map(l => { const fl = e.lineFlags[l.id] || []; const pl = p && p.lines.find(x => x.id === l.lineRef); return `<tr class="lvl-${worst(fl)}"><td><b>${esc(l.desc)}</b><br><small class="muted">${esc(l.expense)}</small></td><td>${pl ? `${esc(pl.item)}<br><small class="muted">${esc(pl.cat)} · ${money(pl.approved ?? pl.amount)}</small>` : `<span class="lv deny">None</span>`}</td><td>${esc(l.memo)}<br><small class="muted">${esc(l.vendor)}</small></td><td class="r mono">${money(spendLineAmt(l))}</td><td>${fl.length ? fl.map(f => `<div class="small">${f.slip ? `<span class="slip">Slipped through</span> ` : ""}${lvl(f.level)} ${esc(f.msg)} ${ruleTag(f.rule)}</div>`).join("") : lvl("ok")}</td></tr>`; }).join("")}</tbody></table>` : ""}
    ${e.flags.filter(f => !f.lineId).length ? checkList(e.flags.filter(f => !f.lineId)) : ""}
    <label>Notes to the treasurer<textarea id="notes-${s.id}" rows="2">${esc(s.notes || "")}</textarea></label>
    <div class="mf"><span class="muted small">Total ${money(e.total)}</span><span><button class="btn ghost" data-a="returnSA" data-id="${s.id}">Return to treasurer</button>${s.kind === "SA" && clean.length && clean.length < s.lines.length ? ` <button class="btn ghost" data-a="approveClean" data-id="${s.id}">Approve ${clean.length} clean line${clean.length > 1 ? "s" : ""} (${money(clean.reduce((t, l) => t + spendLineAmt(l), 0))})</button>` : ""} <button class="btn" data-a="apApprove" data-id="${s.id}" ${e.level === "deny" ? "disabled" : ""}>Approve${s.kind === "SA" ? " & load card" : ""}</button></span></div></section>`; }).join("") || `<section class="card"><p class="muted">Nothing waiting on second-line review.</p></section>`}`;
}

function viewInbox() {
  const open = S.threads.filter(t => t.status === "open");
  return `<header class="ph"><div><h1>Liaison inbox</h1><p>Questions the AI couldn't settle, with the AI's draft and cited rules already attached.</p></div></header>
  ${open.map(t => `<section class="card"><div class="ib-h"><b>${esc(t.subject)}</b><span class="muted">${esc(orgById(t.orgId).name)} · ${fmtD(t.created)}</span></div><div class="msgs static">${t.msgs.map(msgHtml).join("")}</div>
    <form class="composer" data-a2="reply" data-id="${t.id}"><input id="rep-${t.id}" placeholder="Reply as ASG Financial Services…"><button class="btn">Send reply</button></form></section>`).join("") || `<section class="card"><p class="muted">No open questions.</p></section>`}`;
}
function viewOversight() {
  return `<header class="ph"><div><h1>Org oversight</h1><p>Every org's funding, spending and paperwork at a glance.</p></div></header>
  <section class="card"><table class="tbl"><thead><tr><th>Org</th><th>Tier</th><th>Proposal</th><th class="r">Approved</th><th class="r">Authorized</th><th class="r">Spent</th><th>Treasurer access</th><th>Open items</th></tr></thead><tbody>
  ${S.orgs.map(o => { const l = ledgerFor(S, o.id); const p = proposalFor(o.id); const t = tasksFor(S, o.id).filter(x => x.sev === "deny").length; return `<tr><td><b>${esc(o.name)}</b><br><small class="mono muted">${esc(o.worktag)}</small></td><td>${o.tier}${o.penalty ? " · penalty" : ""}</td><td>${p ? chip(p.status) : `<span class="muted">none</span>`}</td><td class="r mono">${money(l.approved)}</td><td class="r mono">${money(l.committed)}</td><td class="r mono">${money(l.spent)}</td><td>${o.readiness.access === "approved" ? `<span class="lv ok">Authorized</span>` : `<span class="lv warn">${esc(o.readiness.access)}</span>`}</td><td>${t ? `<span class="lv deny">${t} urgent</span>` : `<span class="lv ok">clean</span>`}</td></tr>`; }).join("")}
  </tbody></table></section>`;
}

const VIEWS = { home: viewHome, proposal: viewProposal, spend: viewSpend, card: viewCard, deposits: viewDeposits, help: viewHelp, resources: viewResources, org: viewOrg, rules: viewRules, advq: viewAdvisor, meeting: viewMeeting, workday: viewWorkday, review: viewReview, sareview: viewSAReview, inbox: viewInbox, oversight: viewOversight };

function genSAFor(orgId) {
  const o = orgById(orgId); const p = approvedProposal(S, orgId); const led = ledgerFor(S, orgId);
  const card = led.lines.filter(x => x.route === "card" && x.avail > 0);
  const id = nextId("SA", S.spend);
  const lines = card.map(x => ({ id: uid(), lineRef: x.l.id, desc: x.l.item, expense: CATS[x.l.cat].sc, qty: 1, unit: x.avail, memo: `${x.l.item}${x.l.comment ? " · " + x.l.comment : ""}`, vendor: "", cashAdvance: false }));
  const hasCard = S.spend.some(s => s.orgId === orgId && s.kind === "SA" && ["active", "closed"].includes(s.status));
  const sa = { id, kind: "SA", orgId, fund: "ASG", status: "draft", descr: hasCard ? "ADD FUNDS" : "NEW CARD", start: todayIso(), end: "2026-12-18", created: todayIso(), cardLast4: "", proofBudget: true, proofFunds: true, lines, history: [] };
  sa.justification = draftJustification(o, p, lines);
  if (lines.length) S.spend.push(sa);
  let reqs = 0;
  led.lines.filter(x => x.route === "contract" && x.avail > 0).forEach(x => { if (S.spend.some(s => s.kind === "REQ" && s.lineRef === x.l.id && s.status !== "denied")) return; S.spend.push({ id: nextId("RQ", S.spend), kind: "REQ", orgId, fund: "ASG", status: "draft", lineRef: x.l.id, vendor: "", amount: x.avail, serviceDate: (p.events.find(e => e.id === x.l.eventId) || {}).start || "", contractSent: false, seaApproved: false, indemnity: false, supplier: false, memo: x.l.item, history: [] }); reqs++; });
  logEvt(orgId, `Generated ${lines.length ? id : "no card authorization"}${reqs ? ` + ${reqs} service requisition${reqs > 1 ? "s" : ""}` : ""} from the approved budget`);
  return { sa: lines.length ? sa : null, reqs };
}
const A = {
  role: d => { S.role = d.r; UI.view = NAV[d.r][0][0]; UI.saId = null; location.hash = UI.view; save(); render(); },
  go: d => { UI.modal = null; UI.saId = null; UI.view = d.id; location.hash = d.id; render(); window.scrollTo(0, 0); },
  reset: () => { UI.modal = () => `<div class="mh"><h2>Reset demo data?</h2><button class="x" data-a="closeModal">×</button></div><p>Restores the seeded orgs, proposals and authorizations.</p><div class="mf"><span></span><button class="btn" data-a="doReset">Reset</button></div>`; render(); },
  doReset: () => { S = seedState(); S.mode = "demo"; UI = { view: "home", modal: null, threadId: null, busy: false, saId: null }; save(); location.hash = "home"; render(); toast("Demo data reset"); },
  closeModal: () => { UI.modal = null; UI.rcpt = null; draftDep = null; render(); },
  showRule: d => { UI.modal = () => ruleModal(d.id); render(); },
  copy: async d => { try { await navigator.clipboard.writeText(d.v); toast("Copied"); } catch (e) { toast("Select and copy manually"); } },
  newProposal: () => { const o = ORG(); S.proposals.push({ id: nextId("P", S.proposals), orgId: o.id, semester: S.settings.semester, status: "draft", created: todayIso(), prior: 0, ack: {}, purpose: "", events: [], lines: [], journalPaid: {} }); save(); A.go({ id: "proposal" }); },
  addEvent: () => { const p = proposalFor(S.orgId); p.events.push({ id: "E" + uid(), type: "Event", name: "", start: "", end: "" }); save(); render(); },
  delEvent: d => { const p = proposalFor(S.orgId); p.events = p.events.filter(e => e.id !== d.id); p.lines.forEach(l => { if (l.eventId === d.id) l.eventId = ""; }); save(); render(); },
  addLine: d => { const p = proposalFor(S.orgId); p.lines.push({ id: "L" + uid(), eventId: d.k === "event" && p.events[0] ? p.events[0].id : "", item: "", cat: d.k === "event" ? "Event: Food" : "Admin Item", amount: 0, comment: "", quote: false }); save(); render(); },
  delLine: d => { const p = proposalFor(S.orgId); p.lines = p.lines.filter(l => l.id !== d.id); save(); render(); },
  fixP: d => { const p = proposalFor(S.orgId); applyPFix(p, ORG(), d); save(); render(); if (UI.focus) { const el = document.getElementById(UI.focus); UI.focus = null; if (el) { el.focus(); el.select(); } } else toast("Fixed"); },
  fixAllP: () => { const p = proposalFor(S.orgId); const o = ORG(); let n = 0, guard = 60;
    while (guard--) { const ev = evaluateProposal(p, o, S.settings); const f = ev.flags.find(x => x.fix && !["focus", "org"].includes(x.fix.type)); if (!f) break; applyPFix(p, o, { type: f.fix.type, line: f.line, event: f.event, ids: f.fix.ids, value: f.fix.value }); n++; }
    save(); render(); const ev = evaluateProposal(p, o, S.settings); toast(`${n} fix${n === 1 ? "" : "es"} applied${ev.flags.length ? ` · ${ev.flags.length} left that need you` : " · ready to submit"}`); },
  submitProposal: () => { const p = proposalFor(S.orgId); const o = ORG(); const ev = evaluateProposal(p, o, S.settings);
    if (ev.flags.some(f => f.level === "deny")) { toast(`ASG would deny this: ${ev.flags.filter(f => f.level === "deny").length} item${ev.flags.filter(f => f.level === "deny").length > 1 ? "s" : ""} still fail. Fix them first.`, "bad"); return; }
    p.submittedAt = todayIso();
    if (ev.auto) { p.status = "approved"; p.decidedBy = "FundPath auto-approval"; p.decidedAt = todayIso(); p.lines.forEach(l => { l.approved = ev.lineAward[l.id] ?? +l.amount; }); logEvt(o.id, `${p.id} auto-approved: 7/7 criteria, ${money(ev.total)} available in ASG funds`);
      save(); render(); UI.modal = () => `<div class="mh"><h2>Approved automatically</h2><button class="x" data-a="closeModal">×</button></div><div class="bigok">✓</div><p><b>${money(ev.total)}</b> for ${esc(S.settings.semester)} is approved. All 7 ASG committee criteria passed, so there's no 1–2 week email wait.</p><p class="muted small">ASG can still spot-check auto-approved proposals. Next, generate the Spend Authorization straight from this budget.</p><div class="mf"><span></span><button class="btn" data-a="genSA">Generate Spend Authorization →</button></div>`; render(); }
    else { p.status = "review"; logEvt(o.id, `${p.id} sent to the ASG Funding Committee (${ev.flags.length} item${ev.flags.length > 1 ? "s" : ""} need judgment)`); save(); render(); toast("Sent to the ASG Funding Committee with the flagged items attached"); } },
  exportSheet: async () => { const p = proposalFor(S.orgId); const ev = (id) => (p.events.find(e => e.id === id) || {}).name || "";
    const t = ["Step 2: Events and Trips", "Type\tName\tDate", ...p.events.map(e => `${e.type}\t${e.name}\t${e.start}${e.end ? " - " + e.end : ""}`), "", "Step 3: Budget - Events and Trips", "Event/Trip\tBudget Item\tCategory\tAmount\tComments", ...p.lines.filter(l => isEv(l.cat)).map(l => `${ev(l.eventId)}\t${l.item}\t${l.cat}\t${l.amount}\t${l.comment}`), "", "Step 4: Budget - Non-Event", "Budget Item\tCategory\tAmount\tComments", ...p.lines.filter(l => !(isEv(l.cat))).map(l => `${l.item}\t${l.cat}\t${l.amount}\t${l.comment}`)].join("\n");
    try { await navigator.clipboard.writeText(t); toast("Copied. Paste into the ASG proposal sheet"); } catch (e) { UI.modal = () => `<div class="mh"><h2>ASG sheet format</h2><button class="x" data-a="closeModal">×</button></div><pre class="packet">${esc(t)}</pre>`; render(); } },
  importCsv: () => { UI.modal = () => `<div class="mh"><h2>Import from your Google Sheet</h2><button class="x" data-a="closeModal">×</button></div><p class="muted small">Copy Step 3 or Step 4 rows from the ASG proposal sheet and paste below. Columns: Event/Trip (optional), Budget Item, Category, Amount, Comments.</p><textarea id="csvIn" rows="8" placeholder="Founder Speaker Night\tFlyers\tEvent: Marketing\t120\tPosters around campus"></textarea><div class="mf"><span></span><button class="btn" data-a="doImport">Import lines</button></div>`; render(); },
  doImport: () => { const p = proposalFor(S.orgId); const rows = ($("#csvIn").value || "").split(/\n/).map(r => r.split(/\t|,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(c => c.replace(/^"|"$/g, "").trim())).filter(r => r.length >= 3);
    let n = 0; rows.forEach(r => { let [a, b, c, d, e] = r; if (CATS[b]) { e = d; d = c; c = b; b = a; a = ""; } if (!CATS[c]) return; let evx = p.events.find(x => x.name === a); if (a && !evx) { evx = { id: "E" + uid(), type: c.startsWith("Trip") ? "Trip" : "Event", name: a, start: "", end: "" }; p.events.push(evx); } p.lines.push({ id: "L" + uid(), eventId: evx ? evx.id : "", item: b, cat: c, amount: +String(d).replace(/[$,()]/g, "") || 0, comment: e || "", quote: false }); n++; });
    UI.modal = null; save(); render(); toast(`${n} line${n === 1 ? "" : "s"} imported`); },
  genSA: () => { UI.modal = null; const r = genSAFor(S.orgId); save(); if (r.sa) { UI.view = "spend"; UI.saId = r.sa.id; location.hash = "spend"; render(); toast(`${r.sa.id} built from your approved budget${r.reqs ? ` · ${r.reqs} speaker requisition${r.reqs > 1 ? "s" : ""} too` : ""}`); } else { A.go({ id: "spend" }); toast(r.reqs ? "Speaker requisitions created" : "Nothing left to authorize"); } },
  newSA: d => { const id = nextId("SA", S.spend); S.spend.push({ id, kind: "SA", orgId: S.orgId, fund: d.fund, status: "draft", descr: "NEW CARD", start: todayIso(), end: "2026-12-18", created: todayIso(), justification: "", proofBudget: false, proofFunds: false, lines: [{ id: uid(), lineRef: "", desc: "", expense: "SC0309 Supplies - Office (Event Supplies/Decorations)", qty: 1, unit: 0, memo: "", vendor: "", cashAdvance: false }], history: [] }); save(); UI.saId = id; render(); },
  openSA: d => { UI.saId = d.id; UI.view = "spend"; render(); window.scrollTo(0, 0); },
  backSpend: () => { UI.saId = null; render(); },
  addSL: () => { const s = S.spend.find(x => x.id === UI.saId); s.lines.push({ id: uid(), lineRef: "", desc: "", expense: "SC0309 Supplies - Office (Event Supplies/Decorations)", qty: 1, unit: 0, memo: "", vendor: "", cashAdvance: false }); save(); render(); },
  delSL: d => { const s = S.spend.find(x => x.id === UI.saId); s.lines = s.lines.filter(l => l.id !== d.id); save(); render(); },
  workdayView: d => { UI.modal = () => workdayModal(d.id); render(); },
  submitSA: d => { const s = S.spend.find(x => x.id === d.id); const e = evaluateSpend(s, S);
    if (e.flags.some(f => f.rule === "TRAINING")) return toast("Treasurer isn't Workday-authorized yet", "bad");
    s.status = "advisor"; s.wd = { status: "In progress · awaiting advisor", ref: s.wd && s.wd.ref || wdRef(), at: new Date().toISOString() }; (s.history = s.history || []).push({ at: todayIso(), who: orgById(s.orgId).treasurer, action: "Submitted" }); logEvt(s.orgId, `${s.id} submitted to advisor (${money(e.total)})`); save(); render(); toast(e.level === "deny" ? "Submitted. The reviewer will see the open flags" : "Submitted to your advisor"); },
  advisorApprove: d => { const s = S.spend.find(x => x.id === d.id); s.status = "review"; s.wd = { status: "In progress · awaiting Accounts Payable", ref: (s.wd && s.wd.ref) || wdRef(), at: new Date().toISOString() }; s.history.push({ at: todayIso(), who: `${orgById(s.orgId).advisor} (advisor)`, action: "Approved" }); logEvt(s.orgId, `${s.id} approved by advisor, now with Accounts Payable`); save(); render(); toast("Approved. Sent to Accounts Payable + ASG"); },
  returnSA: d => { const s = S.spend.find(x => x.id === d.id); const n = $("#notes-" + d.id); s.notes = n ? n.value : "Returned by advisor"; s.status = "returned"; if (s.wd) s.wd.status = "Sent back"; s.history.push({ at: todayIso(), who: S.role === "advisor" ? "Advisor" : "Accounts Payable / ASG", action: "Returned", note: s.notes }); logEvt(s.orgId, `${s.id} returned: ${s.notes}`); save(); render(); toast("Returned to the treasurer"); },
  approveClean: d => { const s = S.spend.find(x => x.id === d.id); const e = evaluateSpend(s, S); const removed = s.lines.filter(l => worst(e.lineFlags[l.id] || []) === "deny"); s.lines = s.lines.filter(l => worst(e.lineFlags[l.id] || []) !== "deny"); s.notes = `Removed: ${removed.map(l => `${l.desc} (${(e.lineFlags[l.id] || []).map(f => RULES[f.rule].title).join(", ")})`).join("; ")}`; A.apApprove(d, true); },
  apApprove: (d, partial) => { const s = S.spend.find(x => x.id === d.id); s.status = s.kind === "SA" ? "approved" : "closed"; if (s.kind === "SA") s.wd = { status: "Approved · card funded", ref: (s.wd && s.wd.ref) || wdRef(), at: new Date().toISOString() }; if (s.kind === "SA" && !s.cardLast4) s.cardLast4 = String(1000 + Math.floor(Math.random() * 8999)); s.history.push({ at: todayIso(), who: "Accounts Payable + ASG", action: partial === true ? "Approved clean lines" : "Approved", note: partial === true ? s.notes : (s.kind === "SA" ? "Card loaded; ready for pickup at 107 Roudebush Hall" : "Requisition approved") }); logEvt(s.orgId, `${s.id} approved by Accounts Payable${s.kind === "SA" ? ". Card ready at 107 Roudebush Hall" : ""}`); save(); render(); toast(s.kind === "SA" ? "Approved. Card loaded and ready for pickup" : "Requisition approved"); },
  pickup: d => { const s = S.spend.find(x => x.id === d.id); s.status = "active"; s.history.push({ at: todayIso(), who: orgById(s.orgId).treasurer, action: "Picked up card" }); logEvt(s.orgId, `Picked up card for ${s.id}`); save(); UI.saId = null; A.go({ id: "card" }); },
  addTxn: d => { UI.modal = () => txnModal(d.id); render(); },
  saveTxn: d => { const s = S.spend.find(x => x.id === d.id); const t = { id: nextId("T", S.txns), orgId: s.orgId, saId: s.id, lineRef: $("#txLine").value, date: $("#txDate").value, merchant: $("#txMerch").value || "Vendor", amount: +$("#txAmt").value || 0, receiptDone: false, q: {}, file: "" }; S.txns.push(t); UI.modal = null; logEvt(s.orgId, `Card charge ${t.merchant} ${money(t.amount)}`); save(); render(); },
  receipt: d => { const t = S.txns.find(x => x.id === d.id); const s = S.spend.find(x => x.id === t.saId); const o = orgById(t.orgId); const p = approvedProposal(S, t.orgId); const pl = p && p.lines.find(l => l.id === t.lineRef);
    t.q = { who: t.q.who || o.treasurer, what: t.q.what || (pl ? pl.item : ""), when: t.q.when || t.date, where: t.q.where || t.merchant, how: t.q.how || `Org card ending ${s.cardLast4 || "____"}`, why: t.q.why || (pl && p ? `${(p.events.find(e => e.id === pl.eventId) || {}).name || "Club operations"}: ${pl.comment || pl.item}` : "") };
    UI.modal = () => receiptModal(d.id); UI.rcpt = d.id; render(); },
  saveReceipt: d => { const t = S.txns.find(x => x.id === d.id); const q = t.q; if (!["who", "what", "when", "where", "how", "why"].every(k => (q[k] || "").trim()) || !t.file) return toast("Answer all six and attach the receipt", "bad"); t.receiptDone = true; UI.modal = null; UI.rcpt = null; logEvt(t.orgId, `Receipt done: ${t.merchant} ${money(t.amount)}`); save(); render(); toast("Receipt saved"); },
  closeSA: d => { const s = S.spend.find(x => x.id === d.id); s.status = "closed"; const tx = S.txns.filter(t => t.saId === s.id); const spent = tx.reduce((t, x) => t + x.amount, 0); s.lines.forEach(l => { const used = tx.filter(t => t.lineRef === l.lineRef).reduce((t, x) => t + x.amount, 0); l.unit = cents(used); l.qty = 1; }); s.history.push({ at: todayIso(), who: orgById(s.orgId).treasurer, action: "Closed", note: `Spent ${money(spent)}; unspent funds released` }); logEvt(s.orgId, `Closed ${s.id}. Unspent card funds released back to the ASG budget`); save(); render(); toast("Closed. Unspent funds released back to your budget"); },
  journalPaid: d => { const p = approvedProposal(S, S.orgId); p.journalPaid = p.journalPaid || {}; p.journalPaid[d.id] = true; logEvt(S.orgId, `Paid by worktag journal transfer: ${p.lines.find(l => l.id === d.id).item}`); save(); render(); },
  newDeposit: () => { draftDep = { id: nextId("DP", S.deposits), orgId: S.orgId, source: "Card reader settlement", payType: "Visa/MC/Discover/Debit", rc: "RC0244", amount: 0, received: todayIso(), deposited: todayIso(), recorded: "", receipt: "", memo: "" }; UI.modal = depositModal; render(); },
  saveDeposit: () => { draftDep.recorded = todayIso(); S.deposits.push(draftDep); logEvt(draftDep.orgId, `Recorded cash sale ${money(draftDep.amount)} (${draftDep.rc})`); draftDep = null; UI.modal = null; save(); render(); toast("Recorded. Funds are assigned to your Agency account"); },
  recordSale: d => { const x = S.deposits.find(z => z.id === d.id); x.recorded = todayIso(); logEvt(x.orgId, `Recorded cash sale ${money(x.amount)}`); save(); render(); },
  newThread: () => { UI.threadId = null; render(); setTimeout(() => $("#chatIn") && $("#chatIn").focus(), 0); },
  thread: d => { const t = S.threads.find(x => x.id === d.id); if (t && S.role === "treasurer") S.orgId = t.orgId; UI.threadId = d.id; A.go({ id: "help" }); scrollChat(); },
  ask: d => sendQuestion(d.q),
  escalate: d => { const t = S.threads.find(x => x.id === d.id); t.status = "open"; t.msgs.push({ from: "user", who: ORG().treasurer, text: `Sent to ${routeFor(t)}.`, system: true }); logEvt(t.orgId, `Asked a liaison: ${t.subject}`); save(); render(); toast("A real person has your question"); },
  approveP: d => { const p = S.proposals.find(x => x.id === d.id); document.querySelectorAll(`[data-ap^="${p.id}:"]`).forEach(i => { const l = p.lines.find(x => x.id === i.dataset.ap.split(":")[1]); if (l) l.approved = +i.value || 0; }); p.status = "approved"; p.decidedBy = "ASG Funding Committee"; p.decidedAt = todayIso(); const n = $("#notes-" + p.id); p.notes = n ? n.value : ""; logEvt(p.orgId, `${p.id} approved by the ASG Funding Committee`); save(); render(); toast("Approved. The org can generate its Spend Authorization now"); },
  returnP: d => { const p = S.proposals.find(x => x.id === d.id); const n = $("#notes-" + p.id); if (!n || !n.value.trim()) return toast("Add notes so the org knows what to fix", "bad"); p.notes = n.value; p.status = "returned"; p.decidedBy = "ASG Funding Committee"; p.decidedAt = todayIso(); logEvt(p.orgId, `${p.id} returned: ${p.notes}`); save(); render(); toast("Returned with notes"); },
  viewP: d => { const p = S.proposals.find(x => x.id === d.id); S.role = "treasurer"; S.orgId = p.orgId; A.go({ id: "proposal" }); }
};

document.addEventListener("click", e => { const el = e.target.closest("[data-a]"); if (!el || el.tagName === "A") return; const fn = A[el.dataset.a]; if (!fn) return; if (el.tagName === "BUTTON") e.preventDefault(); fn(el.dataset, el, e); });
document.addEventListener("submit", e => { const f = e.target.closest("[data-a2]"); if (!f) return; e.preventDefault();
  if (f.dataset.a2 === "send") { const v = $("#chatIn").value; f.reset(); sendQuestion(v); }
  if (f.dataset.a2 === "reply") { const txt = $("#rep-" + f.dataset.id).value.trim(); if (!txt) return; f.reset(); const t = S.threads.find(x => x.id === f.dataset.id); t.msgs.push({ from: "asg", who: "ASG Financial Services · asgfunding@miamioh.edu", text: txt }); t.status = "answered"; t.unread = true; logEvt(t.orgId, `ASG answered: ${t.subject}`); save(); render(); toast("Reply sent to the org"); } });
function val(el) { return el.type === "checkbox" ? el.checked : el.type === "number" ? (el.value === "" ? 0 : +el.value) : el.value; }
function onField(e, full) {
  const el = e.target;
  if (el.dataset.a2 === "pickRole") { A.role({ r: el.value }); return; }
  if (el.dataset.a2 === "pickOrg") { S.orgId = el.value; UI.threadId = null; UI.saId = null; save(); render(); return; }
  const d = el.dataset;
  if (d.f) {
    const [k, a, b] = d.f.split(":"); const v = val(el);
    const p = proposalFor(S.orgId); const s = S.spend.find(x => x.id === UI.saId);
    if (["p", "ack", "ev", "ln"].includes(k) && !p) return;
    if (["sa", "rent", "sl", "rq"].includes(k) && !s) return;
    if (k === "p") p[a] = v; else if (k === "ack") { p.ack = p.ack || {}; p.ack[a] = v; } else if (k === "ev") { const x = p.events.find(z => z.id === a); if (!x) return; x[b] = v; } else if (k === "ln") { const x = p.lines.find(z => z.id === a); if (!x) return; x[b] = v; }
    else if (k === "sa") s[a] = v; else if (k === "rent") { s.rental = s.rental || { vendor: "Hertz", youngest: 21 }; s.rental[a] = v; } else if (k === "sl") { const x = s.lines.find(z => z.id === a); if (!x) return; x[b] = v; if (b === "lineRef") { const pl = approvedProposal(S, s.orgId) && approvedProposal(S, s.orgId).lines.find(z => z.id === v); if (pl) { x.desc = pl.item; x.expense = CATS[pl.cat].sc; } } } else if (k === "rq") s[a] = v;
    save();
    if (full || el.tagName === "SELECT" || el.type === "checkbox") render(); else if (k === "sa" || k === "sl" || k === "rq" || k === "rent") refreshSASide(); else refreshProposalSide();
    return;
  }
  if (d.m && UI.modal) {
    if (draftDep) { if (el.type === "file") draftDep.receipt = el.files[0] ? el.files[0].name : ""; else draftDep[d.m] = val(el); if (full || el.tagName === "SELECT" || el.type === "file") render(); else { const ev = evaluateDeposit(draftDep); $("#mcheck").innerHTML = checkList(ev.flags); } return; }
    if (UI.rcpt) { const t = S.txns.find(x => x.id === UI.rcpt); if (!t) return; if (el.type === "file") { t.file = el.files[0] ? el.files[0].name : ""; render(); } else if (d.m.startsWith("q.")) t.q[d.m.slice(2)] = el.value; save(); return; }
  }
  if (d.o) { const o = ORG(); if (!o) return; o[d.o] = d.o === "hub" ? el.value.split("\n").map(x => x.trim()).filter(Boolean) : d.o === "tier" || d.o === "agencyBalance" ? +el.value : val(el); save(); if (full || el.type === "checkbox" || el.tagName === "SELECT") render(); return; }
  if (d.r) { if (!ORG()) return; ORG().readiness[d.r] = val(el); if (d.r === "module" && el.checked) ORG().readiness.moduleDate = todayIso(); save(); render(); return; }
  if (d.s) { const [a, b] = d.s.split("."); if (b) S.settings[a][b] = el.type === "number" ? +el.value : el.value; else S.settings[a] = +el.value; save(); if (full) render(); return; }
}
document.addEventListener("input", e => onField(e, false));
document.addEventListener("change", e => { const t = e.target; if (t.tagName === "SELECT" || t.type === "checkbox") return; onField(e, true); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && UI.modal) A.closeModal(); });
window.addEventListener("hashchange", () => { const v = location.hash.slice(1); if (v && VIEWS[v] && v !== UI.view) { const role = Object.keys(NAV).find(r => NAV[r].some(n => n[0] === v)); if (role && !NAV[S.role].some(n => n[0] === v)) S.role = role; UI.view = v; UI.saId = null; UI.modal = null; save(); render(); } });
// =====================================================================
// Exec meeting (voice) → AI budget → submit sheet + form → auto-approve
// → Workday Spend Authorization → AP review → card pickup
// =====================================================================
const VOICE = { on: true, rec: null, listening: false, speaking: false, media: null, chunks: [], recording: false, playing: false };
const wdRef = () => "SPA-" + String(Math.floor(100000 + Math.random() * 899999));
const EXEC = ["President", "Treasurer", "VP Events", "VP Marketing", "Exec board"];
const sleep = ms => new Promise(r => setTimeout(r, ms));
function M() { S.meeting = S.meeting || { transcript: [], built: null, stage: "idle", pipe: [] }; S.meeting.pipe = S.meeting.pipe || []; return S.meeting; }

async function speak(text) {
  if (!VOICE.on || !text) return;
  VOICE.speaking = true; paintVoice();
  try {
    const r = await fetch("/api/tts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
    if (!r.ok || !(r.headers.get("content-type") || "").includes("audio")) throw new Error("no tts");
    const a = new Audio(URL.createObjectURL(await r.blob())); VOICE.engine = "ElevenLabs";
    await a.play(); await new Promise(res => { a.onended = res; a.onerror = res; });
  } catch (e) {
    if (window.speechSynthesis) { VOICE.engine = "browser voice"; await new Promise(res => { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.rate = 1.04; u.onend = res; u.onerror = res; speechSynthesis.speak(u); setTimeout(res, 30000); }); }
  }
  VOICE.speaking = false; paintVoice();
}
function paintVoice() { patch($("#voiceState"), voiceState()); }
function voiceState() {
  if (VOICE.speaking) return `<span class="vdot talk"></span>FundPath is speaking${VOICE.engine ? ` · ${VOICE.engine}` : ""}`;
  if (VOICE.listening) return `<span class="vdot live"></span>Listening live${UI.interim ? `: <i>${esc(UI.interim)}</i>` : ""}`;
  if (VOICE.recording) return `<span class="vdot live"></span>Recording for ElevenLabs transcription…`;
  return `<span class="vdot"></span>Mic off`;
}
function heard(text, who) {
  const m = M(); const t = text.trim(); if (!t) return;
  if (m.stage === "confirm") {
    if (/\b(yes|yeah|yep|yup|approve[ds]?|go ahead|submit( it)?|do it|sounds good|let'?s do it)\b/i.test(t)) { m.transcript.push([who || UI.speaker || "Exec board", t]); return A.meetYes(); }
    if (/\b(no|nope|wait|hold on|cancel|stop)\b/i.test(t)) { m.transcript.push([who || UI.speaker || "Exec board", t]); return A.meetNo(); }
  }
  m.transcript.push([who || UI.speaker || "Exec board", t]); save(); paintTranscript();
  if (/build (our|the|a) budget|fund ?path,? (build|make)|make (our|the) budget/i.test(t) && ["idle", "built"].includes(m.stage)) A.meetBuild();
}
function paintTranscript() { const el = $("#transcript"); if (!el) return; patch(el, transcriptHtml()); el.scrollTop = el.scrollHeight; }
function transcriptHtml() {
  const m = M();
  return m.transcript.length ? m.transcript.map(([w, t]) => `<div class="tl"><b>${esc(w)}</b><span>${esc(t)}</span></div>`).join("") : `<div class="muted pad">Start the mic and run your exec meeting like normal. Talk through events, what you need and what it costs. Say <b>“FundPath, build our budget”</b> when you're done.</div>`;
}
function startListening() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { toast("Live transcription needs Chrome or Edge. Use “Record · ElevenLabs” or the demo meeting.", "bad"); return; }
  const r = new SR(); r.continuous = true; r.interimResults = true; r.lang = "en-US";
  r.onresult = ev => { for (let i = ev.resultIndex; i < ev.results.length; i++) { const res = ev.results[i]; const t = res[0].transcript; if (res.isFinal) { UI.interim = ""; if (!VOICE.speaking) heard(t); } else UI.interim = t; } paintVoice(); };
  r.onerror = e => { if (e.error === "not-allowed") { VOICE.listening = false; toast("Microphone blocked. Allow it in the address bar.", "bad"); render(); } };
  r.onend = () => { if (VOICE.listening) { try { r.start(); } catch (e) {} } };
  try { r.start(); } catch (e) {}
  VOICE.rec = r; VOICE.listening = true; render();
}
function stopListening() { VOICE.listening = false; try { VOICE.rec && VOICE.rec.stop(); } catch (e) {} render(); }
async function toggleRecord() {
  if (VOICE.recording) { VOICE.media.stop(); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream); VOICE.media = mr; VOICE.chunks = [];
    mr.ondataavailable = e => VOICE.chunks.push(e.data);
    mr.onstop = async () => {
      VOICE.recording = false; stream.getTracks().forEach(t => t.stop()); render(); toast("Transcribing with ElevenLabs…");
      const blob = new Blob(VOICE.chunks, { type: mr.mimeType || "audio/webm" });
      const b64 = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(",")[1]); fr.readAsDataURL(blob); });
      try { const r = await fetch("/api/stt", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ audio: b64, mime: blob.type }) }); const j = await r.json(); if (!r.ok) throw new Error(j.error || r.status);
        (j.text || "").split(/(?<=[.?!])\s+/).forEach(x => heard(x)); toast("Transcribed");
      } catch (e) { toast("ElevenLabs isn't connected on this deploy. Use the live mic or demo meeting.", "bad"); }
    };
    mr.start(); VOICE.recording = true; render();
  } catch (e) { toast("Microphone blocked. Allow it in the address bar.", "bad"); }
}

function sheetPreview(p, o) {
  const evn = id => (p.events.find(e => e.id === id) || {}).name || "";
  const evL = p.lines.filter(l => isEv(l.cat)), nonL = p.lines.filter(l => !isEv(l.cat));
  return `<div class="gsheet"><div class="gs-h"><span class="gs-ico"></span><b>ASG Club Funding Proposal · ${esc(o.name)}</b><small>Google Sheets · ${esc(S.settings.semester)} ${esc(S.settings.cycle || "")}</small></div>
  <table><tr class="gs-sec"><td colspan="5">Step 1 · Club info</td></tr>
  <tr><td>Organization</td><td colspan="4">${esc(o.name)} · Tier ${TIER_ROMAN[o.tier]} · ${esc(o.worktag)}</td></tr>
  <tr><td>Officers</td><td colspan="4">${esc(o.president)} (president) · ${esc(o.treasurer)} (treasurer) · ${esc(o.advisor)} (advisor)</td></tr>
  <tr class="gs-sec"><td colspan="5">Step 2 · Events and trips</td></tr>
  ${p.events.map(e => `<tr><td>${esc(e.type)}</td><td colspan="2">${esc(e.name)}</td><td colspan="2">${e.start ? fmtD(e.start) : "date TBD"} · ${eventPct(e, o).pct}% criteria</td></tr>`).join("")}
  <tr class="gs-sec"><td colspan="5">Step 3 · Event and trip budget</td></tr>
  <tr class="gs-th"><td>Event</td><td>Budget item</td><td>Category</td><td class="r">Amount</td><td>Quote</td></tr>
  ${evL.map(l => `<tr><td>${esc(evn(l.eventId))}</td><td>${esc(l.item)}</td><td>${esc(l.cat)}</td><td class="r">${money(+l.amount)}</td><td>${l.quote ? "✓" : ""}</td></tr>`).join("")}
  <tr class="gs-sec"><td colspan="5">Step 4 · Non-event budget</td></tr>
  ${nonL.map(l => `<tr><td></td><td>${esc(l.item)}</td><td>${esc(l.cat)}</td><td class="r">${money(+l.amount)}</td><td>${l.quote ? "✓" : ""}</td></tr>`).join("")}
  <tr class="gs-tot"><td colspan="3">Total request</td><td class="r">${money(p.lines.reduce((t, l) => t + +l.amount, 0))}</td><td></td></tr></table></div>`;
}
function formPreview(p, o) {
  const f = (q, a) => `<div class="gf-q"><span>${q}</span><b>${esc(a)}</b></div>`;
  return `<div class="gform"><div class="gf-bar"></div><b>ASG Funding Request Form</b><small>Signed in as ${esc(o.entityEmail)} (entity account)</small>
    ${f("Organization name", o.name)}${f("Red Brick Rewards tier", "Tier " + TIER_ROMAN[o.tier])}${f("Treasurer", `${o.treasurer} · ${o.treasurerEmail}`)}${f("Total amount requested", money(p.lines.reduce((t, l) => t + +l.amount, 0)))}${f("Link to proposal sheet", "docs.google.com/spreadsheets/…/" + o.worktag)}${f("Events registered on Miami Central?", "Yes")}${f("Acknowledgements", "All four confirmed")}</div>`;
}
function viewMeeting() {
  const o = ORG(); const m = M(); const b = m.built;
  const listeningBtn = VOICE.listening ? `<button class="btn" data-a="meetMic">■ Stop mic</button>` : `<button class="btn" data-a="meetMic">● Start mic</button>`;
  const removed = b ? b.changes.filter(c => c.kind === "removed" || c.kind === "capped" || c.kind === "dropped") : [];
  let right = "";
  if (!b && m.stage !== "building") right = `<section class="card"><h2>What FundPath does with your meeting</h2><ol class="howto"><li><b>Listens</b> to your exec board (live mic, or ElevenLabs transcription).</li><li><b>Builds the ASG budget</b>: events, line items, categories, amounts, quotes you mention.</li><li><b>Applies every ASG rule</b> for Tier ${TIER_ROMAN[o.tier]}: takes out what ASG won't fund and caps anything over a limit.</li><li><b>Asks you to approve</b>, out loud. Say “yes”.</li><li><b>Submits</b> the ASG proposal sheet and form, gets the rules decision, and creates your Workday Spend Authorization.</li></ol></section>`;
  if (m.stage === "building") right = `<section class="card"><h2>Building your budget…</h2><div class="typing"><i></i><i></i><i></i></div><p class="muted small">Pulling events from Miami Central, matching categories, checking SR §11 and §19 limits.</p></section>`;
  if (b) right = `
    <section class="card ai-card ${m.stage === "confirm" ? "ask" : ""}"><div class="ai-h"><span class="ai-dot"></span><b>FundPath assistant</b>${chip(b.ev.auto ? "approved" : "review", b.ev.auto ? `${b.ev.passed}/7 · auto-approvable` : `${b.ev.passed}/7 · needs review`)}</div>
      <p class="ai-say">${esc(m.say || "")}</p>
      ${removed.length ? `<ul class="changes">${removed.map(c => `<li><span class="lv ${c.kind === "capped" ? "warn" : "deny"}">${c.kind}</span> ${esc(c.what)} <small class="muted">${esc(c.why)}</small> ${ruleTag(c.rule)}</li>`).join("")}</ul>` : ""}
      ${b.ev.flags.length ? checkList(b.ev.flags.filter(f => f.rule !== "ELIGINFO")) : ""}
      ${m.stage === "confirm" ? `<div class="ask-row"><span>Say <b>“yes”</b> or click</span><span><button class="btn ghost" data-a="meetEdit">Edit first</button> <button class="btn ghost" data-a="meetNo">No</button> <button class="btn big" data-a="meetYes">Yes, submit it</button></span></div>` : ""}
    </section>
    ${m.pipe.length ? `<section class="card"><h2>Submission</h2><ol class="pipe-v">${m.pipe.map(x => `<li class="${x.done ? "done" : "now"}"><i>${x.done ? "✓" : ""}</i><div><b>${esc(x.t)}</b><span>${x.d || ""}</span></div></li>`).join("")}</ol>
      ${m.stage === "done" ? `<div class="mf"><span class="muted small">Next: ASG / Accounts Payable reviews the Spend Authorization.</span><button class="btn" data-a="meetToAP">Open ASG / AP view →</button></div>` : ""}</section>` : ""}
    ${sheetPreview(b.p, o)}${formPreview(b.p, o)}`;
  return `<header class="ph"><div><h1>Exec meeting</h1><p>${esc(o.name)} · Tier ${TIER_ROMAN[o.tier]} (${money(S.settings.tierMax[o.tier])}/semester) · ${esc(S.settings.semester)} ${esc(S.settings.cycle || "")}, closes ${fmtD(S.settings.window.close)}</p></div>
    <div class="ph-actions"><label class="check vt"><input type="checkbox" data-a="voiceOn" ${VOICE.on ? "checked" : ""}> FundPath talks back</label><button class="btn ghost" data-a="meetReset">New meeting</button></div></header>
  <div class="meet">
    <section class="card mic-card"><div class="mic-h"><div id="voiceState" class="vstate">${voiceState()}</div>
      <div class="mic-ctl"><select data-a2="speaker" title="Who's talking">${EXEC.map(x => `<option ${x === (UI.speaker || "Exec board") ? "selected" : ""}>${x}</option>`).join("")}</select>${listeningBtn}<button class="btn ghost" data-a="meetRecord">${VOICE.recording ? "■ Stop & transcribe" : "Record · ElevenLabs"}</button></div></div>
      <div id="transcript" class="transcript">${transcriptHtml()}</div>
      <form class="composer" data-a2="meetType"><input id="meetIn" placeholder="Or type what someone said…"><button class="btn ghost">Add</button></form>
      <div class="mic-foot">${m.transcript.length ? "" : `<button class="btn ghost sm" data-a="meetDemo">▶ Play demo meeting (${esc(o.name.replace("Miami University ", ""))})</button>`}<button class="btn sm" data-a="meetBuild" ${m.transcript.length ? "" : "disabled"}>Build our budget</button></div>
    </section>
    <div>${right}</div>
  </div>`;
}
function cardReadyBanner(o) {
  const s = S.spend.find(x => x.orgId === o.id && x.kind === "SA" && x.status === "approved"); if (!s) return "";
  return `<div class="banner card-ready"><div><b>Your card is ready.</b> ${(s.history || []).some(h => /straight-through/.test(h.who)) ? `FundPath approved ${s.id} automatically (every check passed) and` : `Accounts Payable approved ${s.id} and`} loaded ${money(s.lines.reduce((t, l) => t + spendLineAmt(l), 0))}. Pick it up at AP, 107 Roudebush Hall.</div><button class="btn" data-a="cardGo" data-id="${s.id}">Get the card →</button></div>`;
}
function cardModal(id) {
  const s = S.spend.find(x => x.id === id); const o = orgById(s.orgId); const total = s.lines.reduce((t, l) => t + spendLineAmt(l), 0);
  return `<div class="mh"><h2>Pick up your card · ${s.id}</h2><button class="x" data-a="closeModal">×</button></div>
  <div class="cardvis"><small>Miami University · Student Org Card</small><b>•••• •••• •••• ${esc(s.cardLast4 || "0000")}</b><span>${esc(o.name)}</span><em>${money(total)} available · ${esc(o.worktag)} · FD1000</em></div>
  <ol class="howto"><li>Go to <b>Accounts Payable, 107 Roudebush Hall</b>, Mon–Fri 8–5. Bring your Miami ID.</li><li>The card is loaded for exactly what's on ${s.id}: ${s.lines.map(l => esc(l.desc)).join(", ")}.</li><li>Every charge needs the receipt and the six-question Receipts Questionnaire within the week ${ruleTag("RECEIPTS")}.</li><li>On-campus charges (rooms, Rec Center) are journal transfers, not the card ${ruleTag("JOURNAL")}.</li></ol>
  <div class="mf"><span class="muted small">Card valid ${fmtD(s.start)} – ${fmtD(s.end)}</span><button class="btn" data-a="pickup" data-id="${s.id}">I picked up the card</button></div>`;
}

function viewWorkday() {
  const asg = S.role === "asg"; const o = ORG();
  const list = S.spend.filter(s => s.kind === "SA" && (asg || s.orgId === o.id)).slice().reverse();
  return `<header class="ph"><div><h1>Workday ${asg ? "sync" : ""}</h1><p>FundPath works alongside Workday. It builds each Spend Authorization from the approved ASG budget, then sends it to Workday so nobody types it twice.</p></div>
    <div class="ph-actions"><button class="btn ghost" data-a="eibAll">Download EIB (CSV)</button></div></header>
  <div class="banner info"><b>Demo tenant.</b> Submissions here go to a simulated Workday tenant. In production FundPath calls Workday's <code>Submit_Spend_Authorization</code> web service (Resource Management) with an integration account set up by Miami IT, or uploads the same data as an EIB. The payload below is exactly what would be sent.</div>
  <section class="card"><table class="tbl"><thead><tr><th>Spend Authorization</th>${asg ? "<th>Org</th>" : ""}<th class="r">Total</th><th>FundPath</th><th>Workday</th><th>Workday ref</th><th></th></tr></thead><tbody>
  ${list.map(s => { const tot = evaluateSpend(s, S).total; const w = s.wd || {}; return `<tr><td class="mono">${s.id}<br><small class="muted">${esc(s.descr)}</small></td>${asg ? `<td>${esc(orgById(s.orgId).name)}</td>` : ""}<td class="r mono">${money(tot)}</td><td>${chip(s.status)}</td><td>${w.status ? `<span class="lv ${/Approved/.test(w.status) ? "ok" : /back/.test(w.status) ? "deny" : "warn"}">${esc(w.status)}</span>` : `<span class="muted small">Not sent</span>`}</td><td class="mono small">${esc(w.ref || "—")}</td><td class="r"><button class="btn sm ghost" data-a="wdPayload" data-id="${s.id}">Payload</button> <button class="btn sm ghost" data-a="workdayView" data-id="${s.id}">Copy sheet</button></td></tr>`; }).join("") || `<tr><td colspan=7 class=muted>No Spend Authorizations yet.</td></tr>`}
  </tbody></table></section>
  <section class="card"><h2>How FundPath fits with Workday</h2><div class="routes">
    <div><h3>1 · Budget → SA</h3><p class="small">Approved ASG lines become SA lines with the right expense item, fund (FD1000/PRG040 or FD9001/PRG100) and the org's SA1#### worktag.</p></div>
    <div><h3>2 · Workday routing</h3><p class="small">Advisor approval, then Accounts Payable, same as today. FundPath shows the status and the second-line checks next to it.</p></div>
    <div><h3>3 · Card and receipts</h3><p class="small">Card charges come back from Workday; FundPath matches each to its budget line and runs the Receipts Questionnaire before you close the SA.</p></div></div></section>`;
}
function wdModal(id) {
  const s = S.spend.find(x => x.id === id);
  return `<div class="mh"><h2>Workday payload · ${s.id}</h2><button class="x" data-a="closeModal">×</button></div><p class="muted small">Submit_Spend_Authorization request body (JSON form of the Workday web-service call).</p><pre class="packet">${esc(JSON.stringify(workdayPayload(s, S), null, 2))}</pre><div class="mf"><span></span><button class="btn ghost" data-a="copy" data-v="${esc(JSON.stringify(workdayPayload(s, S), null, 2))}">Copy JSON</button></div>`;
}
function eibCsv(list) {
  const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [["Spend_Authorization_ID", "Company", "Start_Date", "End_Date", "Description", "Business_Purpose", "Justification", "Line", "Expense_Item", "Quantity", "Per_Unit_Amount", "Memo", "Student_Org_Worktag", "Fund", "Program"]];
  list.forEach(s => { const o = orgById(s.orgId); s.lines.forEach((l, i) => rows.push([s.id, "100 Miami University", s.start, s.end, s.descr, "Student Org Card Request", s.justification, i + 1, l.expense, l.qty, (+l.unit).toFixed(2), l.memo, o.worktag, s.fund === "ASG" ? "FD1000" : "FD9001", s.fund === "ASG" ? "PRG040" : "PRG100"])); });
  return rows.map(r => r.map(q).join(",")).join("\n");
}

Object.assign(A, {
  voiceOn: (d, el) => { VOICE.on = el.checked; if (!VOICE.on && window.speechSynthesis) speechSynthesis.cancel(); },
  meetMic: () => VOICE.listening ? stopListening() : startListening(),
  meetRecord: () => toggleRecord(),
  meetReset: () => { S.meeting = { transcript: [], built: null, stage: "idle", pipe: [] }; VOICE.playing = false; save(); render(); },
  meetDemo: async () => { const m = M(); if (VOICE.playing) return; VOICE.playing = true; m.stage = "idle"; render();
    for (const [w, t] of DEMO_MEETING) { if (!VOICE.playing) break; await sleep(700 + Math.min(1600, t.length * 9)); heard(t, w); }
    VOICE.playing = false; },
  meetBuild: async () => { const m = M(); const o = ORG(); if (!m.transcript.length) return; m.stage = "building"; m.pipe = []; save(); render();
    await sleep(1400);
    const b = aiBuildBudget(m.transcript.map(([w, t]) => `${w}: ${t}`).join("\n"), o, S.settings);
    applyFix(b.p, o, { type: "ack" }); b.ev = evaluateProposal(b.p, o, S.settings);
    m.built = b; const removed = b.changes.filter(c => c.kind === "removed");
    const evs = b.p.events.map(e => e.name);
    m.say = `I heard ${b.extracted.lines.length} requests totaling ${money(b.heard)}. ${removed.length ? `ASG won't fund ${removed.map(c => { const w = c.what.replace(/ \(.*\)$/, ""); return w.charAt(0).toLowerCase() + w.slice(1); }).join(" or ")}, so I took ${removed.length > 1 ? "those" : "that"} out. ` : ""}Your proposal is ${money(b.ev.total)}: ${b.p.lines.length} lines for ${evs.join(" and ") || "general operations"}${b.p.lines.some(l => !l.eventId) ? " plus club operations" : ""}. ${b.ev.auto || b.ev.flags.every(f => f.rule === "ELIGINFO") ? `It's inside every Tier ${TIER_ROMAN[o.tier]} limit and passes all seven committee criteria.` : `There ${b.ev.flags.length === 1 ? "is one thing" : `are ${b.ev.flags.length} things`} a person still needs to look at.`} Do you approve submitting the ASG proposal sheet and funding form?`;
    m.stage = "confirm"; logEvt(o.id, `FundPath built a ${money(b.ev.total)} budget from the exec meeting`); save(); render(); speak(m.say); },
  meetNo: () => { const m = M(); m.stage = "built"; save(); render(); speak("Okay. I won't submit anything. Keep talking, or edit the budget first."); },
  meetEdit: () => { const m = M(); const o = ORG(); const p = materialize(m.built.p, o, "draft"); m.stage = "built"; save(); A.go({ id: "proposal" }); toast(`${p.id} opened in the proposal editor`); },
  meetYes: async () => { const m = M(); const o = ORG(); if (m.stage !== "confirm") return; m.stage = "running"; m.pipe = []; save(); render();
    const step = async (t, d, ms = 900) => { m.pipe.push({ t, d, done: false }); render(); await sleep(ms); m.pipe[m.pipe.length - 1].done = true; save(); render(); };
    const p = materialize(m.built.p, o, "draft"); applyFix(p, o, { type: "ack" });
    await step("Filled the ASG Club Funding Proposal sheet", `Steps 1–6 · ${p.events.length} events · ${p.lines.length} lines · ${money(p.lines.reduce((t, l) => t + +l.amount, 0))}`);
    p.status = "submitted"; p.submittedAt = todayIso(); logEvt(o.id, `${p.id} proposal sheet + ASG funding form submitted from ${o.entityEmail}`);
    await step("Submitted the ASG funding Google Form", `From ${esc(o.entityEmail)} · acknowledgements confirmed by the exec board`);
    const ev = evaluateProposal(p, o, S.settings);
    if (!ev.auto) { p.status = "review"; save(); await step("Sent to the ASG Funding Committee", `${ev.flags.length} item${ev.flags.length > 1 ? "s" : ""} need a person`); m.stage = "done"; save(); render(); speak("Submitted. A few items need the Funding Committee, so it's with them now."); return; }
    p.status = "approved"; p.decidedBy = "FundPath auto-approval"; p.decidedAt = todayIso(); p.lines.forEach(l => { l.approved = ev.lineAward[l.id] ?? +l.amount; });
    logEvt(o.id, `${p.id} auto-approved: 7/7 criteria, ${money(ev.award)}`);
    await step("ASG rules check: 7/7 criteria → approved", `${money(ev.award)} approved · Finance & Audit recommendation, ratified by Senate (SR §3.1)`, 1100);
    const r = genSAFor(o.id); const sa = r.sa;
    if (sa) { sa.wd = { status: "In progress · awaiting advisor", ref: wdRef(), at: new Date().toISOString() }; sa.history.push({ at: todayIso(), who: "FundPath", action: "Created and submitted in Workday", note: `${sa.wd.ref} · built from ${p.id}` }); }
    await step("Created and submitted the Workday Spend Authorization", sa ? `${sa.id} · ${sa.descr} · ${money(sa.lines.reduce((t, l) => t + spendLineAmt(l), 0))} on the card${r.reqs ? ` · plus ${r.reqs} speaker requisition (contract, not the card)` : ""} · Workday ${sa.wd.ref}` : "Nothing for the card");
    if (sa && S.settings.advisorPreauth) { sa.status = "review"; sa.wd.status = "In progress · awaiting Accounts Payable"; sa.history.push({ at: todayIso(), who: `${o.advisor} (advisor)`, action: "Pre-authorized", note: "Advisor pre-authorizes SAs that exactly match the approved proposal" }); logEvt(o.id, `${sa.id} pre-authorized by ${o.advisor}; now with Accounts Payable + ASG`); }
    await step("Advisor pre-authorization applied", `${esc(o.advisor)} · SA matches the approved proposal line for line → routed to Accounts Payable + ASG`);
    m.stage = "done"; save(); render();
    speak(`Done. Your proposal is approved for ${money(ev.award).replace(".00", "")}, and spend authorization ${sa ? sa.id.replace("-", " ") : ""} is in Workday waiting on Accounts Payable.`); },
  meetToAP: () => { S.role = "asg"; UI.view = "sareview"; location.hash = "sareview"; save(); render(); window.scrollTo(0, 0); },
  cardGo: d => { UI.modal = () => cardModal(d.id); render(); },
  wdPayload: d => { UI.modal = () => wdModal(d.id); render(); },
  eibAll: () => { const list = S.spend.filter(s => s.kind === "SA" && (S.role === "asg" || s.orgId === S.orgId)); const blob = new Blob([eibCsv(list)], { type: "text/csv" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "fundpath_spend_authorizations_eib.csv"; a.click(); toast("EIB file downloaded"); }
});
function materialize(bp, o, status) {
  S.proposals = S.proposals.filter(x => !(x.orgId === o.id && x.semester === S.settings.semester && ["draft", "returned"].includes(x.status)));
  const p = JSON.parse(JSON.stringify(bp)); p.id = nextId("P", S.proposals); p.orgId = o.id; p.semester = S.settings.semester; p.cycle = S.settings.cycle; p.status = status; p.created = todayIso(); p.journalPaid = {}; p.source = "Exec meeting";
  S.proposals.push(p); return p;
}
document.addEventListener("submit", e => { const f = e.target.closest("[data-a2=meetType]"); if (!f) return; e.preventDefault(); const i = $("#meetIn"); heard(i.value); i.value = ""; i.focus(); });
document.addEventListener("change", e => { if (e.target.dataset && e.target.dataset.a2 === "speaker") UI.speaker = e.target.value; });

function boot() {
load();
{ const v = location.hash.slice(1); if (v && VIEWS[v]) { const role = Object.keys(NAV).find(r => NAV[r].some(n => n[0] === v)); if (role && !NAV[S.role].some(n => n[0] === v)) S.role = role; UI.view = v; } }
render();
}
window.addEventListener("DOMContentLoaded", boot);
