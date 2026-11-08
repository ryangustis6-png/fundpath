// =====================================================================
// Receipt audit: treasurer drops receipt files → FundPath names, sorts and
// checks them against the approved budget → submits the set to ASG →
// ASG accepts or flags each receipt.
// File names like "10.5.26 Kofenya Guest Speaker Invoice - $14.95" are read
// automatically; every receipt gets that standard name.
// =====================================================================
const AUD_CATS = [
  { k: "food", label: "Food", hint: "catering, meals, snacks", file: "Food", match: c => c.group === "food" },
  { k: "speaker", label: "Guest speaker", hint: "fees, reimbursement, travel", file: "Guest Speaker", match: c => c.group === "speakers" },
  { k: "trip", label: "Trip", hint: "overnight, day trips, networking, hotels, flights", file: "Trip", match: c => c.sec === "trip" },
  { k: "event", label: "Venue & event", hint: "space, DJ, promo, decorations", file: "Event", match: c => c.sec === "event" && !["food", "speakers"].includes(c.group) },
  { k: "admin", label: "Administrative", hint: "office supplies for the Armstrong office, subscriptions", file: "Admin", match: c => c.sec === "admin" },
  { k: "capital", label: "Capital item", hint: "kept more than 1 year", file: "Capital Item", match: c => !!c.capital }
];
const AUD = Object.fromEntries(AUD_CATS.map(c => [c.k, c]));
const AUD_SAMPLES = ["11.5.26 Kofenya Guest Speaker Lunch/Coffee - $14.35", "11.4.26 Mac & Joes Restaurant Invoice - $136.53 ($30 tip)", "10.21.26 Dominos Catering Invoice - $145.16", "10.21.26 Designated Driver invoice - $191.66", "10.14.26 Jersey Mike's Catering Invoice - $203.90", "10.7.26 Bodega Catering Invoice - $178.39", "10.2.26 Canva Business One-time Annual Subscription - $266.25"];
const AUD_NAME = /^(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{2,4})\s+(.+?)\s*[-–]\s*\$\s*([\d,]+(?:\.\d{1,2})?)\s*(?:\(\s*\$?([\d.]+)\s*tip\s*\))?/i;
const AUD_VSTOP = /\s+(guest|speaker|catering|invoice|receipt|restaurant|lunch|dinner|coffee|one-time|business|annual|subscription|hotel|flight|gas|trip|order|bill|office|supplies)\b/i;
const AUD_BAD = /\b(alcohol|beer|wine|liquor|tobacco|vape|gambl\w*|casino|lottery)\b/i;

function audGuess(t) {
  t = t.toLowerCase();
  if (/speaker/.test(t)) return "speaker";
  if (/\b(hotel|flights?|airfare|airline|gas|fuel|uber|lyft|bus|charter|hertz|enterprise|conference|trip|parking)\b/.test(t)) return "trip";
  if (/cater|restaurant|lunch|dinner|coffee|pizza|food|snack|domino|jersey mike/.test(t)) return "food";
  if (/subscription|canva|office|supplies|pens?\b|pencils?|paper|printing|staples/.test(t)) return "admin";
  if (/banner|tent|table cover|equipment|printer|camera/.test(t)) return "capital";
  if (/driver|venue|lanes|dj|space|room|flyer|poster|decor/.test(t)) return "event";
  return "";
}
function audParse(name) {
  const base = String(name).replace(/\.(pdf|png|jpe?g|heic|webp|gif)$/i, "").trim();
  const m = base.match(AUD_NAME); if (!m) return null;
  let y = +m[3]; if (y < 100) y += 2000;
  const rest = m[4].trim();
  return { date: `${y}-${String(m[1]).padStart(2, "0")}-${String(m[2]).padStart(2, "0")}`, merchant: (rest.split(AUD_VSTOP)[0] || rest).trim(), desc: rest, amount: parseFloat(m[5].replace(/,/g, "")), tip: m[6] ? +m[6] : 0, audCat: audGuess(rest) };
}
function audStdName(t) {
  if (!t.date || !t.merchant || !(+t.amount > 0)) return "";
  const [y, mo, d] = t.date.split("-"); const c = AUD[t.audCat];
  return `${+mo}.${+d}.${String(y).slice(2)} ${t.merchant.trim()} ${c ? c.file + " " : ""}Invoice - $${(+t.amount).toFixed(2)}`;
}
function audCatOfLine(pl) { const c = CATS[pl.cat] || {}; const hit = AUD_CATS.find(a => a.match(c)); return hit ? hit.k : ""; }
function audLines(orgId, k) { const p = approvedProposal(S, orgId); return p ? p.lines.filter(l => !k || audCatOfLine(l) === k) : []; }
function audApproved(orgId) { const led = ledgerFor(S, orgId); const m = {}; (led.lines || []).forEach(x => m[x.l.id] = x.approved); return m; }
function audChecks(t) {
  const out = [], add = (level, msg) => out.push({ level, msg });
  if (!t.date || !t.merchant || !(+t.amount > 0)) add("deny", "Add the date, vendor and amount.");
  if (!t.audCat) add("deny", "Pick a category.");
  else if (!t.lineRef) add("deny", audLines(t.orgId, t.audCat).length ? "Pick the approved budget line it was spent on." : `Nothing in your approved budget is ${AUD[t.audCat].label.toLowerCase()}. ASG funds have to follow the approved budget.`);
  if (!t.file && !t.sample) add("warn", "Attach the receipt file.");
  if (AUD_BAD.test(`${t.merchant} ${t.desc || ""}`)) add("deny", "ASG funds can't pay for this.");
  if (+t.tip > 0) add("warn", `Includes a ${money(+t.tip)} tip. ASG decides whether tips are covered.`);
  if (t.audCat === "capital" && !t.kept) add("warn", "Confirm the club will keep this more than a year, or switch it to Administrative.");
  if (t.lineRef) {
    const appr = audApproved(t.orgId)[t.lineRef] || 0;
    const used = S.txns.filter(x => x.orgId === t.orgId && x.lineRef === t.lineRef).reduce((a, x) => a + +x.amount, 0);
    if (used > appr + 0.004) add("warn", `This budget line is ${money(used - appr)} over what ASG approved (${money(appr)}). Cover the difference from agency funds or explain it to ASG.`);
  }
  return out;
}
function audState() { S.audits = S.audits || []; return S.audits; }
function audFor(saId) { return audState().filter(a => a.saId === saId).slice(-1)[0] || null; }

// ---------- files stay in this browser (IndexedDB) so ASG can open them on the demo laptop ----------
const AUD_FILES = {
  db: null,
  async open() { if (this.db) return this.db; return this.db = await new Promise((ok, no) => { const q = indexedDB.open("fundpath-receipts", 1); q.onupgradeneeded = () => q.result.createObjectStore("f"); q.onsuccess = () => ok(q.result); q.onerror = () => no(q.error); }); },
  async put(id, file) { try { const db = await this.open(); await new Promise((ok, no) => { const tx = db.transaction("f", "readwrite"); tx.objectStore("f").put(file, id); tx.oncomplete = ok; tx.onerror = () => no(tx.error); }); return true; } catch (e) { return false; } },
  async get(id) { try { const db = await this.open(); return await new Promise(ok => { const q = db.transaction("f").objectStore("f").get(id); q.onsuccess = () => ok(q.result || null); q.onerror = () => ok(null); }); } catch (e) { return null; } }
};

// ---------- treasurer: audit section under each active card ----------
function audSection(s) {
  const o = orgById(s.orgId); const tx = S.txns.filter(t => t.saId === s.id); const au = audFor(s.id);
  const ro = au && ["submitted", "passed"].includes(au.status);
  const bad = tx.filter(t => audChecks(t).some(c => c.level === "deny")).length;
  const lineOpts = (t) => `<option value="">Which budget line?</option>` + audLines(o.id, t.audCat).map(l => `<option value="${l.id}" ${l.id === t.lineRef ? "selected" : ""}>${esc(l.item)} · ${money(audApproved(o.id)[l.id] || 0)}</option>`).join("");
  const sums = AUD_CATS.map(c => { const lines = audLines(o.id, c.k); const appr = lines.reduce((a, l) => a + (audApproved(o.id)[l.id] || 0), 0); const spent = tx.filter(t => t.audCat === c.k).reduce((a, t) => a + +t.amount, 0); return { c, appr, spent, n: tx.filter(t => t.audCat === c.k).length }; }).filter(x => x.n || x.appr);
  return `<section class="card aud">
    <h2>Receipt audit · ${s.id} ${au ? chip(au.status === "passed" ? "approved" : au.status === "returned" ? "returned" : "review", au.status === "passed" ? "Audit passed" : au.status === "returned" ? "Changes requested" : "With ASG") : ""}</h2>
    ${au && au.status === "returned" ? `<div class="banner bad"><b>ASG asked for changes.</b> ${esc(au.note || "See the notes on each receipt.")}</div>` : au && au.status === "passed" ? `<div class="banner good"><b>Audit passed.</b> Close ${s.id} in Workday to release what's left.</div>` : au ? `<div class="banner info"><b>ASG is auditing ${au.txnIds.length} receipts.</b> Notes show up here.</div>` : `<p class="muted">Add every receipt. FundPath names it the standard way, sorts it into ASG's categories and checks it against what ASG approved. Then send the whole set to ASG.</p>`}
    ${ro ? "" : `<label class="aud-drop" for="audFiles" data-sa="${s.id}"><b>Drop receipts here, or click to choose files</b><span class="muted small">PDFs or photos. Named like <code>10.5.26 Kofenya Guest Speaker Invoice - $14.95</code>? FundPath reads the date, vendor and amount for you.</span><input type="file" id="audFiles" data-sa="${s.id}" accept="application/pdf,image/*" multiple hidden></label>
    <p class="small muted">Or <button class="linkbtn" data-a="audAdd" data-id="${s.id}">add one by hand</button>${S.mode === "demo" ? ` · <button class="linkbtn" data-a="audSamples" data-id="${s.id}">load 7 sample receipts</button>` : ""}</p>`}
    ${tx.length ? `<div class="aud-list">${[...tx].sort((a, b) => (b.date || "").localeCompare(a.date || "")).map(t => { const ch = audChecks(t); const dec = (au && au.dec && au.dec[t.id]) || null; return `<div class="aud-r ${ch.some(c => c.level === "deny") ? "bad" : ""}">
      <div class="aud-top"><code class="aud-name">${esc(audStdName(t) || t.file || "New receipt")}</code><span>${t.sample ? `<span class="chip gray">sample</span>` : ""}${audStdName(t) ? ` <button class="btn sm ghost" data-a="copy" data-v="${esc(audStdName(t))}">Copy name</button>` : ""}${ro ? "" : ` <button class="btn sm ghost" data-a="audDel" data-id="${t.id}">Remove</button>`}</span></div>
      <div class="aud-f"><label>Date<input type="date" data-au="date" data-id="${t.id}" value="${esc(t.date)}" ${ro ? "disabled" : ""}></label><label>Vendor<input data-au="merchant" data-id="${t.id}" value="${esc(t.merchant)}" ${ro ? "disabled" : ""}></label><label>Amount<input type="number" step="0.01" data-au="amount" data-id="${t.id}" value="${esc(t.amount)}" ${ro ? "disabled" : ""}></label><label>Tip<input type="number" step="0.01" data-au="tip" data-id="${t.id}" value="${esc(t.tip || 0)}" ${ro ? "disabled" : ""}></label></div>
      <div class="aud-cats">${AUD_CATS.map(c => `<button class="aud-cat ${t.audCat === c.k ? "on" : ""}" data-a="audCat" data-id="${t.id}" data-k="${c.k}" title="${esc(c.hint)}" ${ro ? "disabled" : ""}>${c.label}</button>`).join("")}</div>
      ${t.audCat ? `<div class="aud-line"><select data-au="lineRef" data-id="${t.id}" ${ro ? "disabled" : ""}>${lineOpts(t)}</select>${t.audCat === "capital" ? `<label class="check"><input type="checkbox" data-au="kept" data-id="${t.id}" ${t.kept ? "checked" : ""} ${ro ? "disabled" : ""}> We'll keep it more than a year</label>` : ""}${!t.file && !t.sample && !ro ? `<label class="btn sm ghost">Attach file<input type="file" data-aufile="${t.id}" accept="application/pdf,image/*" hidden></label>` : ""}</div>` : ""}
      <div class="aud-ck">${ch.length ? ch.map(c => `<div>${lvl(c.level)} ${esc(c.msg)}</div>`).join("") : `<div>${lvl("ok")} Passes ASG's rules</div>`}${dec ? `<div>${dec.ok ? lvl("ok") + " ASG accepted" : lvl("deny") + " ASG: " + esc(dec.note || "needs a fix")}</div>` : ""}</div>
    </div>`; }).join("")}</div>` : ""}
    ${sums.length ? `<table class="tbl"><thead><tr><th>Category</th><th class="r">Receipts</th><th class="r">Spent</th><th class="r">ASG approved</th><th></th></tr></thead><tbody>${sums.map(x => `<tr><td>${x.c.label}</td><td class="r">${x.n}</td><td class="r mono">${money(x.spent)}</td><td class="r mono">${money(x.appr)}</td><td>${x.spent > x.appr + 0.004 ? `${lvl("deny")} ${money(x.spent - x.appr)} over` : lvl("ok")}</td></tr>`).join("")}</tbody></table>` : ""}
    ${!ro && tx.length ? `<div class="aud-go"><span>${bad ? `${lvl("deny")} ${bad} receipt${bad > 1 ? "s" : ""} need${bad > 1 ? "" : "s"} a fix` : `${lvl("ok")} ${tx.length} receipts · ${money(tx.reduce((a, t) => a + +t.amount, 0))}`}</span><button class="btn" data-a="audSubmit" data-id="${s.id}" ${bad ? "disabled" : ""}>Submit audit to ASG</button></div>` : ""}
  </section>`;
}
function audNewTxn(s, p) {
  const o = orgById(s.orgId);
  const t = { id: nextId("T", S.txns), orgId: s.orgId, saId: s.id, lineRef: "", date: p.date || todayIso(), merchant: p.merchant || "", desc: p.desc || "", amount: +p.amount || 0, tip: +p.tip || 0, audCat: p.audCat || "", kept: false, receiptDone: false, q: {}, file: p.file || "", sample: !!p.sample };
  const lines = t.audCat ? audLines(o.id, t.audCat) : []; if (lines.length === 1) t.lineRef = lines[0].id;
  audFillQ(t); S.txns.push(t); return t;
}
// Pre-answer the Workday Receipts Questionnaire from what the receipt already says.
function audFillQ(t) {
  const o = orgById(t.orgId); const p = approvedProposal(S, t.orgId); const pl = p && p.lines.find(l => l.id === t.lineRef); const s = S.spend.find(x => x.id === t.saId) || {};
  t.q = { who: t.q.who || o.treasurer || "", what: t.q.what || t.desc || t.merchant, when: t.q.when || t.date, where: t.q.where || t.merchant, how: t.q.how || `Student org card${s.cardLast4 ? " ••" + s.cardLast4 : ""}`, why: t.q.why || (pl ? pl.item : "") };
  t.receiptDone = ["who", "what", "when", "where", "how", "why"].every(k => String(t.q[k] || "").trim()) && !!(t.file || t.sample);
}

const _viewCard = VIEWS.card;
VIEWS.card = function () {
  const o = ORG(); const base = _viewCard();
  if (!o) return base;
  const cards = S.spend.filter(s => s.orgId === o.id && s.kind === "SA" && ["active", "closed"].includes(s.status));
  // charges that came in before the audit existed: take the category from their budget line
  S.txns.filter(t => t.orgId === o.id && !t.audCat && t.lineRef).forEach(t => { const p = approvedProposal(S, o.id); const pl = p && p.lines.find(l => l.id === t.lineRef); if (pl) t.audCat = audCatOfLine(pl); });
  return base + cards.map(audSection).join("");
};

// ---------- ASG: Receipt audits queue ----------
function viewAudits() {
  const list = audState().slice().reverse();
  const sel = list.find(a => a.id === UI.auditId) || list.find(a => a.status === "submitted") || list[0];
  if (sel) UI.auditId = sel.id;
  return `<header class="ph"><div><h1>Receipt audits</h1><p>Every receipt arrives named, sorted and checked against the approved budget. Accept it or flag it with a note; the treasurer sees your notes on each receipt.</p></div></header>
  <div class="aud-q"><div class="aud-ql">${list.length ? list.map(a => { const o = orgById(a.orgId); const tx = S.txns.filter(t => a.txnIds.includes(t.id)); return `<button class="aud-qi ${a.id === UI.auditId ? "on" : ""}" data-a="audPick" data-id="${a.id}"><b>${esc(o ? o.name : a.orgId)}</b> ${chip(a.status === "passed" ? "approved" : a.status === "returned" ? "returned" : "review", a.status === "passed" ? "Passed" : a.status === "returned" ? "Sent back" : "To audit")}<small class="muted">${a.saId} · ${tx.length} receipts · ${money(tx.reduce((x, t) => x + +t.amount, 0))}</small></button>`; }).join("") : `<p class="muted">No audits yet. Treasurers submit them from Card & receipts.</p>`}</div>
  <div>${sel ? audDetail(sel) : ""}</div></div>`;
}
function audDetail(a) {
  const o = orgById(a.orgId); const tx = S.txns.filter(t => a.txnIds.includes(t.id)); const open = a.status === "submitted"; a.dec = a.dec || {};
  return `<section class="card"><h2>${esc(o.name)} · ${a.saId} <small class="muted">submitted ${fmtD(a.at)}</small></h2>
    <table class="tbl"><thead><tr><th>Receipt</th><th>Category</th><th>Budget line</th><th class="r">Amount</th><th>Checks</th><th>Decision</th></tr></thead><tbody>
    ${tx.map(t => { const ch = audChecks(t); const p = approvedProposal(S, o.id); const pl = p && p.lines.find(l => l.id === t.lineRef); const d = a.dec[t.id];
      return `<tr><td><code class="aud-name">${esc(audStdName(t) || t.file)}</code>${t.file && !t.sample ? `<br><button class="linkbtn" data-a="audOpen" data-id="${t.id}">Open file</button>` : t.sample ? `<br><small class="muted">sample</small>` : ""}</td><td>${esc(AUD[t.audCat] ? AUD[t.audCat].label : "—")}</td><td>${esc(pl ? pl.item : "—")}</td><td class="r mono">${money(+t.amount)}</td>
      <td class="small">${ch.length ? ch.map(c => `<div>${lvl(c.level)} ${esc(c.msg)}</div>`).join("") : lvl("ok")}</td>
      <td>${open ? `<div class="aud-dec"><button class="btn sm ${d && d.ok ? "" : "ghost"}" data-a="audDec" data-id="${t.id}" data-ok="1">Accept</button><button class="btn sm ${d && !d.ok ? "" : "ghost"}" data-a="audDec" data-id="${t.id}" data-ok="0">Flag</button></div>${d && !d.ok ? `<input data-audnote="${t.id}" value="${esc(d.note || "")}" placeholder="What should they fix?">` : ""}` : d ? (d.ok ? lvl("ok") : `${lvl("deny")} ${esc(d.note || "")}`) : "—"}</td></tr>`; }).join("")}
    </tbody></table>
    ${open ? `<div class="aud-go"><button class="btn ghost" data-a="audAcceptClean">Accept everything that passes</button><span><button class="btn ghost" data-a="audReturn">Send back</button> <button class="btn" data-a="audPass">Pass audit</button></span></div>` : `<p class="muted small">${a.status === "passed" ? "Passed" : "Sent back"} ${fmtD(a.decidedAt)}.</p>`}</section>`;
}
VIEWS.audits = viewAudits;
NAV.asg.splice(2, 0, ["audits", "Receipt audits"]);
NAV_GROUPS.asg[0][1].push("audits");

Object.assign(A, {
  audAdd: d => { const s = S.spend.find(x => x.id === d.id); audNewTxn(s, {}); save(); render(); },
  audSamples: d => { const s = S.spend.find(x => x.id === d.id); AUD_SAMPLES.forEach(n => audNewTxn(s, { ...audParse(n), file: n + ".pdf", sample: true })); logEvt(s.orgId, `Added 7 sample receipts to ${s.id}`); save(); render(); toast("Loaded 7 sample receipts"); },
  audDel: d => { S.txns = S.txns.filter(t => t.id !== d.id); save(); render(); },
  audCat: d => { const t = S.txns.find(x => x.id === d.id); t.audCat = d.k; const lines = audLines(t.orgId, d.k); t.lineRef = lines.length === 1 ? lines[0].id : (lines.some(l => l.id === t.lineRef) ? t.lineRef : ""); audFillQ(t); save(); render(); },
  audSubmit: d => { const s = S.spend.find(x => x.id === d.id); const tx = S.txns.filter(t => t.saId === s.id); if (tx.some(t => audChecks(t).some(c => c.level === "deny"))) return toast("Fix the red items first", "bad");
    tx.forEach(audFillQ); audState().push({ id: nextId("AU", audState()), orgId: s.orgId, saId: s.id, txnIds: tx.map(t => t.id), status: "submitted", at: todayIso(), dec: {} });
    logEvt(s.orgId, `Submitted ${tx.length} receipts for ${s.id} to ASG for audit`); save(); render(); toast("Sent to ASG for audit"); },
  audPick: d => { UI.auditId = d.id; render(); },
  audOpen: async d => { const f = await AUD_FILES.get(d.id); if (!f) return toast("That file is on the treasurer's laptop", "bad"); const a = document.createElement("a"); a.href = URL.createObjectURL(f); a.target = "_blank"; a.rel = "noopener"; a.click(); },
  audDec: d => { const a = audState().find(x => x.id === UI.auditId); a.dec = a.dec || {}; a.dec[d.id] = { ok: d.ok === "1", note: (a.dec[d.id] && a.dec[d.id].note) || "" }; save(); render(); },
  audAcceptClean: () => { const a = audState().find(x => x.id === UI.auditId); a.dec = a.dec || {}; S.txns.filter(t => a.txnIds.includes(t.id) && !audChecks(t).length).forEach(t => a.dec[t.id] = { ok: true }); save(); render(); },
  audPass: () => { const a = audState().find(x => x.id === UI.auditId); a.txnIds.forEach(id => { if (!a.dec[id]) a.dec[id] = { ok: true }; }); a.status = "passed"; a.decidedAt = todayIso(); logEvt(a.orgId, `ASG passed the receipt audit for ${a.saId}`); save(); render(); toast("Audit passed"); },
  audReturn: () => { const a = audState().find(x => x.id === UI.auditId); const flagged = a.txnIds.filter(id => a.dec[id] && !a.dec[id].ok).length; if (!flagged) return toast("Flag at least one receipt with a note", "bad"); a.status = "returned"; a.decidedAt = todayIso(); a.note = `${flagged} receipt${flagged > 1 ? "s" : ""} need${flagged > 1 ? "" : "s"} a fix.`; logEvt(a.orgId, `ASG sent the ${a.saId} audit back: ${a.note}`); save(); render(); toast("Sent back to the treasurer"); }
});

document.addEventListener("change", async e => {
  const el = e.target;
  if (el.id === "audFiles" && el.files.length) {
    const s = S.spend.find(x => x.id === el.dataset.sa); let read = 0;
    for (const f of el.files) { const p = audParse(f.name) || {}; if (p.date) read++; const t = audNewTxn(s, { ...p, merchant: p.merchant || "", file: f.name }); await AUD_FILES.put(t.id, f); }
    logEvt(s.orgId, `Added ${el.files.length} receipt file(s) to ${s.id}`); el.value = ""; save(); render();
    toast(read ? `Read ${read} of ${el.files.length} file name(s) automatically` : "Added. Fill in the details for each receipt.");
    return;
  }
  if (el.dataset.aufile && el.files[0]) { const t = S.txns.find(x => x.id === el.dataset.aufile); t.file = el.files[0].name; await AUD_FILES.put(t.id, el.files[0]); audFillQ(t); save(); render(); return; }
  if (el.dataset.au) { const t = S.txns.find(x => x.id === el.dataset.id); const k = el.dataset.au; t[k] = el.type === "checkbox" ? el.checked : el.type === "number" ? +el.value : el.value; audFillQ(t); save(); render(); }
});
document.addEventListener("input", e => { const el = e.target; if (el.dataset.audnote) { const a = audState().find(x => x.id === UI.auditId); if (a && a.dec[el.dataset.audnote]) { a.dec[el.dataset.audnote].note = el.value; save(); } } });
// drag and drop onto the drop zone
document.addEventListener("dragover", e => { const z = e.target.closest && e.target.closest(".aud-drop"); if (z) { e.preventDefault(); z.classList.add("over"); } });
document.addEventListener("dragleave", e => { const z = e.target.closest && e.target.closest(".aud-drop"); if (z) z.classList.remove("over"); });
document.addEventListener("drop", e => { const z = e.target.closest && e.target.closest(".aud-drop"); if (!z) return; e.preventDefault(); z.classList.remove("over"); const inp = z.querySelector("input[type=file]"); const dt = new DataTransfer(); [...e.dataTransfer.files].forEach(f => dt.items.add(f)); inp.files = dt.files; inp.dispatchEvent(new Event("change", { bubbles: true })); });
