// FundPath budget importer: reads an Excel (.xlsx/.xls) or CSV budget and turns it into an ASG proposal.
// Understands the official ASG Club Funding Proposal sheet (Steps 1-4) and simple
// "Item / Category / Amount" spreadsheets. Every decision it makes is recorded in `notes`
// so the treasurer can see exactly how each row was read.

const TEMPLATE_CATS = {
  "event: guest speaker": "Event: Guest Speaker", "event: guest speakers": "Event: Guest Speaker", "guest speaker": "Event: Guest Speaker", "speaker": "Event: Guest Speaker",
  "event: entertainer": "Event: Entertainer / DJ", "event: entertainers": "Event: Entertainer / DJ", "entertainer": "Event: Entertainer / DJ",
  "event: space fee": "Event: Space Fee", "event: space fees": "Event: Space Fee", "space fee": "Event: Space Fee",
  "event: marketing": "Event: Promotional materials", "marketing": "Event: Promotional materials",
  "event: food": "Event: Food (sample-size)", "food": "Event: Food (sample-size)",
  "event: decorations": "Event: Decorations", "event: sound": "Event: Sound & recording",
  "trip: hotel": "Trip: Hotel", "trip: hotels": "Trip: Hotel", "hotel": "Trip: Hotel",
  "trip: flight": "Trip: Flight", "trip: flights": "Trip: Flight", "flight": "Trip: Flight",
  "trip: gas": "Trip: Gas", "gas": "Trip: Gas", "trip: registration": "Trip: Registration (mandatory)",
  "banners": "Admin: Banners", "banner": "Admin: Banners", "storage": "Admin: Storage"
};
const GENERIC_CATS = { "event: other": "event", "trip: other travel": "trip", "trip: other": "trip", "other travel": "trip", "admin item": "admin", "admin": "admin", "capital item": "capital", "capital": "capital", "other": "" };
const SEC_DEFAULT = { event: "Event: Other", trip: "Trip: Gas", admin: "Admin: Organizational materials", capital: "Capital: Other", "": "Event: Other" };

function cellStr(v) { return v == null ? "" : String(v).trim(); }
function cellAmt(v) {
  if (typeof v === "number") return Math.abs(v);
  const s = cellStr(v); if (!s) return NaN;
  const m = s.replace(/[,\s]/g, "").match(/-?\$?\(?\$?(-?\d+(?:\.\d+)?)\)?/);
  return m ? Math.abs(+m[1]) : NaN;
}
function excelDate(v) {
  if (typeof v === "number" && v > 30000 && v < 80000) { const d = new Date(Math.round((v - 25569) * 86400000)); return d.toISOString().slice(0, 10); }
  const s = cellStr(v); if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return parseDate(s) || "";
}
function mapCategory(raw, item, section) {
  const k = lc(raw).replace(/\s+/g, " ").trim();
  if (CATS[raw]) return { cat: raw, how: "exact" };
  const exact = Object.keys(CATS).find(c => lc(c) === k); if (exact) return { cat: exact, how: "exact" };
  if (TEMPLATE_CATS[k]) return { cat: TEMPLATE_CATS[k], how: "template" };
  let sec = GENERIC_CATS[k] !== undefined ? GENERIC_CATS[k] : /^event/.test(k) ? "event" : /^trip/.test(k) ? "trip" : /admin/.test(k) ? "admin" : /capital/.test(k) ? "capital" : section || "";
  const text = lc(`${item} ${raw}`);
  const hit = CAT_KEYS.find(([c, re]) => re.test(text) && (!sec || CATS[c].sec === sec || (sec === "admin" && CATS[c].sec === "capital" && false)));
  if (hit) return { cat: hit[0], how: "keywords" };
  if (sec === "admin" && /print|paper|copies/.test(text)) return { cat: "Admin: Paper supplies", how: "keywords" };
  return { cat: SEC_DEFAULT[sec], how: "default" };
}

// rows: array of arrays (one sheet). Returns parsed budget pieces.
function parseBudgetRows(rows, sheetName) {
  const out = { info: {}, events: [], lines: [], notes: [], prior: 0 };
  const R = rows.map(r => (r || []).map(cellStr));
  const lower = R.map(r => r.map(c => lc(c)));
  // Step 1 key/value labels anywhere in the sheet
  const LABELS = { organization: "name", "entity email": "entityEmail", "tier status": "tier", president: "president", treasurer: "treasurer", advisor: "advisor", "sa1####": "worktag", "worktag": "worktag" };
  lower.forEach((r, i) => r.forEach((c, j) => {
    const key = c.replace(/:$/, "").trim();
    if (LABELS[key] && !out.info[LABELS[key]]) { const v = R[i].slice(j + 1).find(x => x && !/good|✓/i.test(x)); if (v) out.info[LABELS[key]] = v; }
    if (/already given you|already received/.test(c)) { const v = rows[i].slice(j + 1).map(cellAmt).find(n => !isNaN(n)); if (!isNaN(v)) out.prior = v; }
  }));
  if (out.info.tier) { const m = String(out.info.tier).match(/tier\s*(\d|iv|iii|ii|i)\b/i); if (m) out.info.tier = { iv: 4, iii: 3, ii: 2, i: 1 }[lc(m[1])] || +m[1]; }

  // Find header rows
  const headers = [];
  lower.forEach((r, i) => {
    const has = re => r.findIndex(c => re.test(c));
    const iAmt = has(/^amount|^\(?\$|request|cost|price|total/); const iItem = has(/budget item|^item|expense|description/); const iType = has(/^type$/); const iName = has(/^name|event name/);
    if (iType >= 0 && iName >= 0 && iItem < 0) headers.push({ kind: "events", row: i, iType, iName, iDate: has(/date/), iPeople: has(/people|travelers/), iNights: has(/nights/) });
    else if (iItem >= 0 && iAmt >= 0) {
      const sectionText = lower.slice(Math.max(0, i - 3), i + 1).flat().join(" ");
      headers.push({ kind: "lines", row: i, iItem, iAmt, iCat: has(/categor/), iEvent: has(/event|trip/), iCom: has(/comment|note|justif|purpose/), iQuote: has(/quote/),
        section: /non-event|step 4/.test(sectionText) ? "non" : /events? and trips|step 3/.test(sectionText) ? "event" : "" });
    }
  });
  if (!headers.length) { out.notes.push({ level: "deny", msg: `${sheetName ? `"${sheetName}": ` : ""}couldn't find a header row with "Budget Item" (or "Item") and "Amount".` }); return out; }

  const evByName = {};
  const addEvent = (name, type, start, row) => {
    const key = lc(name); if (evByName[key]) return evByName[key];
    const e = { id: "E" + (out.events.length + 1), type: /trip/i.test(type) ? "Trip" : "Event", name, start: start || "", end: "", onCampus: true, educational: true, openToAll: true, service: false, lateNight: false, admission: false, travelers: 0, nights: 0, fromRow: row };
    out.events.push(e); evByName[key] = e; return e;
  };
  headers.forEach((h, hi) => {
    const stop = hi + 1 < headers.length ? headers[hi + 1].row : R.length;
    let blank = 0;
    for (let i = h.row + 1; i < stop; i++) {
      const r = R[i], raw = rows[i] || [];
      if (!r.some(Boolean)) { if (++blank > 25) break; continue; } blank = 0;
      if (r.some(c => /^step \d|^total|limits|subtotal/i.test(c))) { if (r.some(c => /^step \d/i.test(c))) break; continue; }
      if (h.kind === "events") {
        const type = r[h.iType], name = r[h.iName];
        if (!name || !/event|trip/i.test(type || "")) continue;
        const e = addEvent(name, type, h.iDate >= 0 ? excelDate(raw[h.iDate]) : "", i + 1);
        if (h.iDate >= 0 && !e.start && r[h.iDate]) e.dateText = r[h.iDate];
        if (e.type === "Trip") { e.travelers = h.iPeople >= 0 ? +cellAmt(raw[h.iPeople]) || 0 : 0; e.nights = h.iNights >= 0 ? +cellAmt(raw[h.iNights]) || 0 : 0; }
      } else {
        const item = r[h.iItem]; const amt = cellAmt(raw[h.iAmt]);
        if (!item && isNaN(amt)) continue;
        if (isNaN(amt) || amt === 0) { if (item) out.notes.push({ level: "warn", msg: `Row ${i + 1}: "${item}" has no amount, skipped.` }); continue; }
        const evName = h.iEvent >= 0 && h.iEvent !== h.iItem ? r[h.iEvent] : "";
        const sec = h.section === "non" ? "admin" : (h.section === "event" || evName) ? "event" : "";
        const rawCat = h.iCat >= 0 ? r[h.iCat] : "";
        const m = mapCategory(rawCat, item, sec === "admin" && /capital/i.test(rawCat) ? "capital" : sec);
        let eventId = "";
        if (evName && (CATS[m.cat].sec === "event" || CATS[m.cat].sec === "trip")) eventId = addEvent(evName, CATS[m.cat].sec === "trip" ? "Trip" : "Event", "", i + 1).id;
        const comment = h.iCom >= 0 ? r[h.iCom] : "";
        const quote = h.iQuote >= 0 ? /^(y|yes|true|x|✓|attached)/i.test(r[h.iQuote]) : /quote|estimate|invoice/i.test(comment);
        out.lines.push({ id: "L" + (out.lines.length + 1), eventId, item: item || rawCat || "Unnamed", cat: m.cat, amount: cents(amt), comment, quote, fromRow: i + 1, rawCat });
        if (m.how !== "exact") out.notes.push({ level: "info", msg: `Row ${i + 1}: "${item}"${rawCat ? ` (${rawCat})` : ""} → ${m.cat}${m.how === "default" ? " (best guess, check it)" : ""}` });
      }
    }
  });
  return out;
}

// workbook → merged result across sheets (uses the sheet(s) that contain budget rows)
function parseWorkbook(wb) {
  const merged = { info: {}, events: [], lines: [], notes: [], prior: 0, sheets: [] };
  wb.SheetNames.forEach(n => {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: "" });
    const r = parseBudgetRows(rows, n);
    if (!r.lines.length && !r.events.length) return;
    merged.sheets.push(n);
    Object.assign(merged.info, r.info); merged.prior = merged.prior || r.prior;
    const idMap = {};
    r.events.forEach(e => { const ex = merged.events.find(x => lc(x.name) === lc(e.name)); if (ex) idMap[e.id] = ex.id; else { const id = "E" + (merged.events.length + 1); idMap[e.id] = id; merged.events.push({ ...e, id }); } });
    r.lines.forEach(l => merged.lines.push({ ...l, id: "L" + (merged.lines.length + 1), eventId: idMap[l.eventId] || "" }));
    merged.notes.push(...r.notes.filter(x => x.level !== "deny"));
  });
  if (!merged.lines.length) merged.notes.push({ level: "deny", msg: "No budget lines found. Use the ASG proposal sheet, or columns named Item, Category, Amount (Event and Comments optional)." });
  return merged;
}

// Compare what the file says about the club with the org on record
function orgMismatches(info, org, S) {
  const out = [];
  if (info.name && lc(info.name) !== lc(org.name)) out.push(`File is for "${info.name}", you're signed in as ${org.name}.`);
  if (info.tier && +info.tier !== +org.tier) out.push(`File says Tier ${info.tier}; Miami Central has ${org.name} at Tier ${org.tier} (${money(S.tierMax[org.tier])} max). FundPath uses Tier ${org.tier}.`);
  if (info.worktag && org.worktag && info.worktag.replace(/\s/g, "") !== org.worktag) out.push(`SA1#### in the file is ${info.worktag}; on record it's ${org.worktag}.`);
  return out;
}
