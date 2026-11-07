// Demo workflow boundary. No institutional submissions or bank/card operations occur here.
NAV.treasurer.push(['balances', 'Card & Agency balances']);
function cardBalances(state, orgId) {
  const cards = state.spend.filter(s => s.orgId === orgId && s.kind === 'SA' && ['approved','pickup','active','closed'].includes(s.status));
  const balance = s => cents(s.lines.reduce((n,l) => n + spendLineAmt(l),0) - state.txns.filter(t => t.saId === s.id).reduce((n,t) => n + +t.amount,0));
  const sum = fund => cents(cards.filter(s => s.fund === fund && !s.sweptAt && s.status !== 'closed').reduce((n,s) => n + balance(s),0));
  return { asg: sum('ASG'), agencyCard: sum('Agency'), agencyAccount: cents(ledgerFor(state,orgId).agency), balance };
}
function submitDemoAuthorization(orgId) {
  const result = genSAFor(orgId);
  if (result.sa) {
    const sa = result.sa;
    sa.proposalId = approvedProposal(S,orgId).id;
    const check = evaluateSpend(sa,S);
    sa.status = 'review';
    sa.wd = { status: check.level === 'deny' ? 'Demo held for AP review' : 'Demo submitted · awaiting human AP decision', ref: wdRef(), simulated: true, at: new Date().toISOString() };
    sa.history.push({ at: todayIso(), who: 'FundPath demo', action: 'Simulated submission', note: 'No external request sent; AP decision required' });
  }
  return result;
}
A.submitProposal = () => {
  const p = proposalFor(S.orgId);
  if (!p || S.role !== 'treasurer' || !['draft','returned'].includes(p.status)) return;
  const ev = evaluateProposal(p,ORG(),S.settings);
  p.submittedAt = todayIso(); p.simulated = true;
  if (!ev.auto) { p.status = 'review'; p.reviewReasons = ev.flags.map(f => f.msg); logEvt(p.orgId, `${p.id}: demo submission routed to Secretary of Treasury`); }
  else { p.status = 'approved'; p.decidedBy = 'Demo rules engine'; p.decidedAt = todayIso(); p.lines.forEach(l => l.approved = ev.lineAward[l.id]); submitDemoAuthorization(p.orgId); }
  save(); render(); toast(p.status === 'review' ? 'Secretary of Treasury review required' : 'Demo proposal approved; authorization awaits human AP decision');
};
const oldApproveP = A.approveP;
A.approveP = d => {
  const p = S.proposals.find(p => p.id === d.id);
  if (S.role !== 'asg' || !p || p.status !== 'review') return;
  const inputs = [...document.querySelectorAll(`[data-ap^="${p.id}:"]`)];
  if (inputs.some(i => !Number.isFinite(+i.value) || +i.value < 0 || +i.value > +p.lines.find(l => l.id === i.dataset.ap.split(':')[1]).amount)) return toast('Awards must be between zero and the requested amount','bad');
  oldApproveP(d); p.decidedBy = 'Secretary of Treasury (demo human decision)'; submitDemoAuthorization(p.orgId); save(); render();
};
A.denyProposal = d => {
  const p = S.proposals.find(p => p.id === d.id); if (S.role !== 'asg' || !p || p.status !== 'review') return;
  const note = document.querySelector('#notes-' + p.id)?.value.trim(); if (!note) return toast('Add a reason before denying','bad');
  p.status = 'denied'; p.notes = note; p.decidedBy = 'Secretary of Treasury (demo)'; p.decidedAt = todayIso(); save(); render();
};
const oldReview = VIEWS.review;
VIEWS.review = () => oldReview().replaceAll('ASG Funding Committee','Secretary of Treasury').replace(/(<button class="btn" data-a="approveP" data-id="([^"]+)">)/g, '<button class="btn ghost" data-a="denyProposal" data-id="$2">Deny with reason</button> $1');
VIEWS.apportal = () => `<header class="ph"><div><h1>Roudebush Hall Accounts Payable</h1><p>Demo role switch only; production requires authenticated AP access. AI recommendations are advisory. A person makes every final decision.</p></div></header>` + S.spend.filter(s => s.status === 'review').map(s => {
  const ev = evaluateSpend(s,S);
  return `<section class="card"><h2>${esc(s.id)} · ${esc(orgById(s.orgId).name)}</h2><p>AI recommendation (demo rules): <b>${ev.level === 'ok' ? 'Approve' : 'Reject / return for correction'}</b></p>${checkList(ev.flags)}<p>${money(s.kind === 'SA' ? s.lines.reduce((n,l)=>n+spendLineAmt(l),0) : s.amount)} · ${esc(s.wd?.status || 'Demo review')}</p><button class="btn ghost" data-a="workdayView" data-id="${s.id}">Review fields</button><label>Decision reason<textarea id="notes-${esc(s.id)}"></textarea></label><button class="btn" data-a="apApprove" data-id="${s.id}" ${ev.level === 'deny' ? 'disabled' : ''}>Human: approve</button> <button class="btn ghost" data-a="apReject" data-id="${s.id}">Human: reject</button> <button class="btn ghost" data-a="returnSA" data-id="${s.id}">Return for correction</button></section>`;
}).join('');
const oldAP = A.apApprove, oldReturnSA = A.returnSA;
A.apApprove = (d, partial) => {
  const s = S.spend.find(s => s.id === d.id);
  if (S.role !== 'ap' || !s || s.status !== 'review' || evaluateSpend(s,S).level === 'deny') return toast('AP review required; resolve failing checks','bad');
  oldAP(d,partial); s.humanAPDecision = { decision:'approved', at:new Date().toISOString() }; if (s.wd) s.wd.simulated = true; save();
};
A.approveClean = () => toast('Return for correction; AP does not change the approved proposal','bad');
A.returnSA = d => { if (S.role === 'ap' || S.role === 'advisor') oldReturnSA(d); };
A.apReject = d => {
  const s = S.spend.find(s => s.id === d.id); const note = document.querySelector('#notes-' + d.id)?.value.trim();
  if (S.role !== 'ap' || !s || s.status !== 'review') return;
  if (!note) return toast('Add a rejection reason','bad');
  s.status = 'denied'; s.humanAPDecision = { decision:'rejected', note, at:new Date().toISOString() }; s.history.push({at:todayIso(),who:'AP human (demo)',action:'Rejected',note}); save(); render();
};
A.meetToAP = () => A.role({r:'ap'});
const oldPickup = A.pickup;
A.pickup = d => { const s = S.spend.find(s=>s.id===d.id); if (!s || s.orgId !== S.orgId || S.role !== 'treasurer' || s.status !== 'approved') return; oldPickup(d); };
VIEWS.balances = () => {
  const o = ORG(), b = cardBalances(S,o.id);
  return `<header class="ph"><div><h1>Card and Agency balances</h1>${S.role === "ap" ? `<label>Organization<select data-a2="pickOrg">${S.orgs.map(org=>`<option value="${esc(org.id)}" ${org.id === o.id ? "selected" : ""}>${esc(org.name)}</option>`).join("")}</select></label>` : ""}<p>Browser demo ledger. Physical card pickup takes place at Roudebush Hall; marking pickup records your confirmation only.</p></div></header><section class="card"><div class="kpis"><div class="kpi">ASG card<b>${money(b.asg)}</b></div><div class="kpi">Agency card<b>${money(b.agencyCard)}</b></div><div class="kpi">Actual Agency account<b>${money(b.agencyAccount)}</b></div></div><p>Agency allocations reserve funds from the account; semester-end sweeping returns only unused card funds. Recorded charges remain deducted. No bank transaction occurs.</p>${S.role === 'ap' ? '<button class="btn" data-a="sweepAgency">Simulate semester-end Agency sweep</button>' : ''}</section>`;
};
A.sweepAgency = () => {
  if (S.role !== 'ap') return;
  const b = cardBalances(S,S.orgId);
  S.spend.filter(s=>s.orgId===S.orgId && s.fund==='Agency' && s.kind==='SA' && ['approved','pickup','active','closed'].includes(s.status) && !s.sweptAt).forEach(s=>{ s.sweepAmount = Math.max(0,b.balance(s)); s.sweptAt = new Date().toISOString(); s.status = 'closed'; s.history.push({at:todayIso(),who:'AP demo',action:'Semester-end sweep',note:money(s.sweepAmount)}); });
  logEvt(S.orgId,'Simulated semester-end Agency sweep'); save(); render();
};
const workflowRender = render;
render = function() {
  workflowRender();
  const main = document.querySelector('#main');
  if (main) main.insertAdjacentHTML('afterbegin','<div class="banner">Demonstration only: Google Forms, Workday, approvals and card balances are simulated. No institutional submission occurs. AP approval always requires a person.</div>');
};
// Optional live ElevenLabs session. Public agent ID only; never store an API key here.
let liveConversation = null, conversationStarting = false;
const meetingViewWithWorkflow = VIEWS.meeting;
VIEWS.meeting = () => `<section class="card"><h2>ElevenLabs conversational meeting agent</h2><p>Optional live service: starting sends microphone audio to ElevenLabs. Use a public demo agent with transcript events enabled. No API key belongs in this field. The agent can discuss the meeting; only student speech can confirm a demo submission.</p><label class="check"><input type="checkbox" data-a="enableLiveElevenLabs" ${liveElevenLabsEnabled ? "checked" : ""}> Enable live ElevenLabs for this session. This may use billable credits; check your plan and billing first.</label><label>Public ElevenLabs agent ID<input id="agentId" value="${esc(S.settings.demoAgentId || '')}" placeholder="agent_…"></label><button class="btn" data-a="startAgent" ${liveConversation || conversationStarting ? 'disabled' : ''}>Start live agent</button> <button class="btn ghost" data-a="stopAgent" ${liveConversation ? '' : 'disabled'}>Stop live agent</button><p role="status">${liveConversation ? 'Live ElevenLabs session active' : conversationStarting ? 'Connecting…' : 'Disconnected. Browser voice and demo meeting remain available.'}</p></section>` + meetingViewWithWorkflow();
let voiceSessionEpoch = 0;
A.startAgent = async (options = {}) => {
  if (liveConversation || conversationStarting) return;
  if (!liveElevenLabsEnabled) return toast("Live ElevenLabs is disabled. Check billing before enabling it.", "bad");
  const agentId = String(options.agentId || document.querySelector('#agentId')?.value || S.settings.demoAgentId || '').trim();
  if (!/^agent_[a-zA-Z0-9_-]+$/.test(agentId)) return toast('Enter a public demo agent ID','bad');
  S.settings.demoAgentId = agentId; save(); conversationStarting = true; UI.voiceError = ""; const epoch = ++voiceSessionEpoch; render();
  try {
    stopListening();
    const { Conversation } = await import('https://esm.sh/@elevenlabs/client@1.35.0');
    if (epoch !== voiceSessionEpoch) return;
    const session = await Conversation.startSession({ agentId, connectionType:'websocket',
      onMessage: msg => {
        if (!msg.message || msg.isFinal === false) return;
        if (msg.source === 'user' || msg.role === 'user') heard(msg.message, 'Exec board');
        else { M().transcript.push(['ElevenLabs agent',String(msg.message)]); save(); paintTranscript(); }
      },
      onDisconnect: () => { if (epoch === voiceSessionEpoch) { liveConversation = null; conversationStarting = false; render(); } },
      onError: () => { UI.voiceError = 'The voice connection failed. Check the public agent ID, its allowed website domains and microphone access.'; render(); }
    });
    if (epoch !== voiceSessionEpoch) { await session.endSession(); return; }
    liveConversation = session;
  } catch { UI.voiceError = 'Could not connect. Check the public agent ID, microphone access and allowed website domains in ElevenLabs.'; toast(UI.voiceError,'bad'); }
  finally { if (epoch === voiceSessionEpoch) conversationStarting = false; render(); }
};
A.stopAgent = async () => { ++voiceSessionEpoch; conversationStarting = false; const session = liveConversation; liveConversation = null; if (session) await session.endSession(); render(); };
// Keep bounded receipt bytes in the browser backup, not just the file name.
document.addEventListener('change', async event => {
  const el = event.target;
  if (el.dataset?.m !== 'file' || !UI.rcpt || !el.files?.[0]) return;
  const txn = S.txns.find(t => t.id === UI.rcpt), file = el.files[0];
  if (!txn) return;
  if (file.size > 2 * 1024 * 1024 || !['image/png','image/jpeg','image/webp','application/pdf'].includes(file.type)) {
    txn.file = ''; delete txn.receiptData; txn.receiptDone = false; save(); toast('Choose a PNG, JPEG, WebP or PDF under 2 MB','bad'); return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    txn.file = file.name; txn.receiptData = reader.result;
    try { localStorage.setItem(S.mode === 'real' ? REAL_KEY : KEY, JSON.stringify(S)); toast('Receipt stored in this browser'); }
    catch { delete txn.receiptData; txn.file = ''; txn.receiptDone = false; toast('Browser storage is full; receipt was not saved','bad'); }
    render();
  };
  reader.onerror = () => { txn.file = ''; toast('Could not read receipt','bad'); };
  reader.readAsDataURL(file);
});
const saveReceiptWithWorkflow = A.saveReceipt;
A.saveReceipt = d => { const t = S.txns.find(t => t.id === d.id); if (!t?.receiptData) return toast('Attach a receipt file; a file name alone is insufficient','bad'); saveReceiptWithWorkflow(d); };
const cardViewWithWorkflow = VIEWS.card;
VIEWS.card = () => cardViewWithWorkflow() + `<section class="card"><h2>Stored receipts</h2>${S.txns.filter(t=>t.orgId===S.orgId && /^data:(image\/(png|jpeg|webp)|application\/pdf);base64,/.test(t.receiptData || '')).map(t=>`<p><a download="${esc(t.file)}" href="${esc(t.receiptData)}">Download ${esc(t.file)}</a> · ${esc(t.merchant)}</p>`).join('') || '<p>No receipt files stored yet. Older demo entries contain file names only.</p>'}</section>`;
const closeSAWithWorkflow = A.closeSA;
A.closeSA = d => {
  const s = S.spend.find(s=>s.id===d.id);
  if (!s || s.status !== 'active' || S.role !== 'treasurer' || s.orgId !== S.orgId) return;
  if (s.fund !== 'Agency') return closeSAWithWorkflow(d);
  if (S.txns.some(t=>t.saId===s.id && !t.receiptDone)) return toast('Complete receipts before closing','bad');
  s.sweepAmount = Math.max(0,cardBalances(S,s.orgId).balance(s)); s.sweptAt = new Date().toISOString(); s.status='closed';
  s.history.push({at:todayIso(),who:'Treasurer (demo)',action:'Closed Agency card',note:`Unused ${money(s.sweepAmount)} returned to Agency account`}); save(); render();
};
A.genSA = () => { const r=submitDemoAuthorization(S.orgId); save(); if(r.sa) { UI.saId=r.sa.id; UI.view='spend'; location.hash='spend'; } render(); toast(r.sa ? 'Simulated authorization routed to human AP review' : 'No remaining card lines to authorize'); };
function matchesApprovedCardBudget(sa,state) {
  if (sa.kind !== 'SA' || sa.fund !== 'ASG') return true;
  const p = approvedProposal(state,sa.orgId);
  if (!p || !sa.lines.length) return false;
  const refs = new Set();
  return sa.lines.every(l=>{
    const pl=p.lines.find(x=>x.id===l.lineRef);
    if (!pl || refs.has(pl.id) || (CATS[pl.cat]?.route || 'card') !== 'card') return false;
    refs.add(pl.id);
    const committedElsewhere=state.spend.filter(s=>s.id!==sa.id && s.orgId===sa.orgId && s.fund==='ASG' && ACTIVE_SPEND.includes(s.status)).reduce((n,s)=>n+(s.lines || []).filter(x=>x.lineRef===pl.id).reduce((m,x)=>m+spendLineAmt(x),0),0);
    return cents(spendLineAmt(l))===cents(approvedAmt(pl)-committedElsewhere);
  });
}
const approveMatchingAuthorization = A.apApprove;
A.apApprove = (d,partial) => { const s=S.spend.find(s=>s.id===d.id); if(!s || !matchesApprovedCardBudget(s,S)) return toast('Authorization differs from the approved budget. Return for correction.','bad'); approveMatchingAuthorization(d,partial); };

A.enableLiveElevenLabs = async (d,el) => { liveElevenLabsEnabled = el.checked; if (!el.checked) await A.stopAgent(); render(); };
