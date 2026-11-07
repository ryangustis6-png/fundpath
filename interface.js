// Presentation layer: keep the funding engine and original detail pages intact.
const ROLE_NAMES = { treasurer: 'Organization', advisor: 'Advisor', asg: 'Treasury', ap: 'Accounts payable' };
for (const role of ['advisor', 'asg', 'ap']) NAV[role].unshift(['overview', 'Overview']);
for (const role of Object.keys(NAV)) NAV[role].push(['connections', 'Campus & voice']);
const friendlyLabels = { home: 'Overview', meeting: 'Meeting', proposal: 'Funding proposal', spend: 'Spending requests', card: 'Cards & receipts', balances: 'Balances', review: 'Proposal queue', apportal: 'Spending queue', advq: 'Advisor queue' };
for (const nav of Object.values(NAV)) nav.forEach(item => { if (friendlyLabels[item[0]]) item[1] = friendlyLabels[item[0]]; });
const connectionState = { loading: false, error: '', config: null, groups: [], directoryBusy: false, directoryError: '', checkedAt: '', query: 'Banking' };
function campusDirectoryUrl(query) { return 'https://miamicentral.miamioh.edu/club_signup?view=all&search=' + encodeURIComponent(query || ''); }
function roleQueue(role) {
  return role === 'asg' ? S.proposals.filter(p => p.status === 'review') : S.spend.filter(s => s.status === (role === 'advisor' ? 'advisor' : 'review'));
}
function pageIntro(label, title, subtitle) { return `<header class="page-intro"><p class="eyebrow">${esc(label)}</p><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></header>`; }
function emptyState(title, detail) { return `<div class="quiet-empty"><h2>${esc(title)}</h2><p>${esc(detail)}</p></div>`; }
function actionButton(label, view, secondary = false) { return `<button class="btn ${secondary ? 'ghost' : ''}" data-a="go" data-id="${view}">${esc(label)} <span aria-hidden="true">→</span></button>`; }
function stat(label, value, note = '') { return `<div class="summary-stat"><span>${esc(label)}</span><strong>${esc(value)}</strong>${note ? `<small>${esc(note)}</small>` : ''}</div>`; }
function nextOrgAction() {
  const o = ORG(), p = proposalFor(o.id), cards = S.spend.filter(s => s.orgId === o.id && s.kind === 'SA');
  const sa = cards.slice().reverse().find(s => s.status !== 'closed');
  if (!p) return { step: 1, title: 'Start with your next meeting', detail: 'Talk through your event and costs. FundPath will turn the discussion into a budget you can review.', label: 'Open meeting', view: 'meeting' };
  if (['draft','returned'].includes(p.status)) return { step: 2, title: 'Review your funding proposal', detail: 'Check the line items and answer any open questions before you submit.', label: 'Review proposal', view: 'proposal' };
  if (['review','submitted'].includes(p.status)) return { step: 3, title: 'Your proposal is with Treasury', detail: 'You can view the request and see why a person needs to review it.', label: 'View proposal', view: 'proposal' };
  if (p.status === 'denied') return { step: 3, title: 'Read Treasury’s decision', detail: 'Review the reason before planning a revised request.', label: 'View decision', view: 'proposal' };
  if (!sa || ['draft','returned'].includes(sa.status)) return { step: 4, title: 'Check your spending request', detail: 'Your request should match the approved funding proposal.', label: 'Open spending requests', view: 'spend' };
  if (['review','advisor'].includes(sa.status)) return { step: 5, title: 'Your spending request is in review', detail: 'Accounts payable makes the final decision before the card can be collected.', label: 'Track request', view: 'spend' };
  if (sa.status === 'approved') return { step: 6, title: 'Collect your card at Roudebush Hall', detail: 'Pick up the physical card, then record the pickup here.', label: 'Open card details', view: 'card' };
  return { step: 7, title: 'Keep your receipts up to date', detail: 'Record purchases, attach receipts and check your remaining balances.', label: 'Open cards & receipts', view: 'card' };
}
VIEWS.home = () => {
  const o = ORG(), next = nextOrgAction(), balances = cardBalances(S, o.id);
  const missing = S.txns.filter(t => t.orgId === o.id && !t.receiptDone).length;
  return pageIntro(S.mode === 'demo' ? 'Organization · Sample workspace' : 'Organization', 'A clear path from meeting to spending', o.name)
    + `<section class="next-action"><div><span class="step-pill">Step ${next.step} of 7</span><h2>${esc(next.title)}</h2><p>${esc(next.detail)}</p>${actionButton(next.label, next.view)}</div><ol class="step-track" aria-label="Funding progress">${['Meeting','Your review','Treasury','Spending request','Accounts payable','Card pickup','Receipts'].map((name,i)=>`<li class="${i+1===next.step?'current':i+1<next.step?'complete':''}" ${i+1===next.step?'aria-current="step"':''}><span>${i+1}</span>${name}</li>`).join('')}</ol></section>`
    + `<section class="summary-grid" aria-label="Balances">${stat('Student government card', money(balances.asg))}${stat('Agency card', money(balances.agencyCard))}${stat('Agency account', money(balances.agencyAccount))}</section>`
    + `<section class="card compact-card"><div><h2>${missing ? `${missing} receipt${missing===1?'':'s'} to finish` : 'Your records, in one place'}</h2><p>${missing ? 'Attach the receipt and complete the purchase details.' : 'Open detailed balances, eligibility or recent activity when you need them.'}</p></div><div class="inline-actions">${actionButton('Balances','balances',true)}${actionButton('Cards & receipts','card',true)}</div></section>`
    + `<details class="card detail-disclosure"><summary>Recent activity</summary><ul class="log">${S.log.filter(l=>l.orgId===o.id || !l.orgId).slice(0,5).map(l=>`<li>${esc(l.text)}</li>`).join('') || '<li>No activity yet.</li>'}</ul></details>`;
};
VIEWS.overview = () => {
  const q = roleQueue(S.role), route = { advisor:'advq', asg:'review', ap:'apportal' }[S.role];
  const titles = {advisor:'A focused place for advisor review',asg:'Review the proposals that need your judgment',ap:'The final spending decision stays with you'};
  const subtitles = {advisor:'Review requests before they move to accounts payable.',asg:'Compliant proposals can pass automatically. Exceptions and partial awards come here.',ap:'Read the assistant’s recommendation, then approve, reject or return the request yourself.'};
  return pageIntro(ROLE_NAMES[S.role], titles[S.role], subtitles[S.role])
    + `<section class="next-action review-next"><div><span class="step-pill">${q.length} waiting for review</span><h2>${q.length ? 'Your review queue is ready' : 'You’re up to date'}</h2><p>${q.length ? 'Open the queue and work through one request at a time.' : 'New requests will appear here when they need you.'}</p>${actionButton('Open review queue',route)}</div></section>`
    + `<section class="summary-grid">${stat('Waiting for you',q.length)}${stat('Organizations',S.orgs.length)}${stat('Approved proposals',S.proposals.filter(p=>p.status==='approved').length)}</section>`
    + `<section class="card"><h2>Up next</h2>${q.length ? `<ul class="simple-queue">${q.slice(0,3).map(x=>`<li><div><b>${esc(orgById(x.orgId)?.name || 'Organization')}</b><span>${esc(x.id)} · ${S.role==='asg'?'Funding proposal':'Spending request'}</span></div>${actionButton('Review',route,true)}</li>`).join('')}</ul>` : '<p class="muted">There is nothing waiting for a decision.</p>'}</section>`;
};
async function loadConnectionStatus() {
  if (connectionState.loading) return;
  connectionState.loading = true; connectionState.error = '';
  try {
    const response = await fetch('/api/connections'); if (!response.ok) throw Error();
    connectionState.config = await response.json();
    if (!S.settings.demoAgentId && connectionState.config.agentId) { S.settings.demoAgentId = connectionState.config.agentId; save(); }
  } catch { connectionState.error = 'Connection status is unavailable. You can still enter your public agent ID below.'; }
  finally { connectionState.loading = false; render(); }
}
async function refreshDirectory() {
  if (connectionState.directoryBusy) return;
  connectionState.query = document.querySelector('#campusQuery')?.value.trim() || connectionState.query;
  connectionState.directoryBusy = true; connectionState.directoryError = ''; render();
  try {
    const response = await fetch('/api/central?q=' + encodeURIComponent(connectionState.query));
    const result = await response.json(); if (!response.ok) throw Error(result.error);
    connectionState.groups = result.groups; connectionState.checkedAt = result.checkedAt;
  } catch { connectionState.directoryError = 'The public directory could not be loaded. Open Miami Central directly; your workspace has not changed.'; }
  finally { connectionState.directoryBusy = false; render(); }
}
function voiceConnectionCard() {
  const id = S.settings.demoAgentId || '', status = liveConversation ? 'Connected' : conversationStarting ? 'Connecting' : id ? 'Ready to connect' : 'Agent identifier needed';
  return `<section class="card connection-card"><div class="section-heading"><div><p class="eyebrow">ElevenLabs</p><h2>Let your meeting become the first draft</h2></div><span class="connection-status ${liveConversation?'connected':''}" role="status">${esc(status)}</span></div><p>Connect your public conversational agent. Your discussion feeds the meeting transcript and budget draft.</p><label for="savedAgentId">Public agent identifier</label><div class="connection-entry"><input id="savedAgentId" value="${esc(id)}" placeholder="agent_…" autocomplete="off"><button class="btn ghost" data-a="saveAgentId">Save agent</button></div><p class="small muted">Find it in ElevenLabs → Agents → your agent. Keep API keys in Vercel, never in this field.</p><label class="check"><input type="checkbox" data-a="enableLiveElevenLabs" ${liveElevenLabsEnabled?'checked':''}> Allow live ElevenLabs for this session. It may use billable credits.</label><p class="small muted">Your subscription and remaining credits have not been verified. Live use starts only when you press Connect.</p><div class="inline-actions"><button class="btn" data-a="connectSavedAgent" ${!id || !liveElevenLabsEnabled || liveConversation || conversationStarting?'disabled':''}>${conversationStarting?'Connecting…':'Connect agent'}</button><button class="btn ghost" data-a="stopAgent" ${!liveConversation && !conversationStarting?'disabled':''}>Disconnect</button>${actionButton('Open meeting','meeting',true)}</div>${UI.voiceError?`<p class="inline-error" role="alert">${esc(UI.voiceError)}</p>`:''}</section>`;
}
VIEWS.connections = () => pageIntro('Campus & voice', 'Connect the tools you already use', 'Public campus information and an optional live meeting agent. Your funding decisions stay in FundPath.')
  + voiceConnectionCard()
  + `<section class="card connection-card"><div class="section-heading"><div><p class="eyebrow">Miami Central</p><h2>Look up your organization</h2></div><span class="connection-status">Public directory</span></div><p>Read official names, missions and published tiers. This does not verify balances, training, event registrations or funding eligibility.</p><form data-a2="campusSearch"><label for="campusQuery">Organization name</label><div class="connection-entry"><input id="campusQuery" value="${esc(connectionState.query)}" minlength="2" required><button class="btn ghost" ${connectionState.directoryBusy?'disabled':''}>${connectionState.directoryBusy?'Looking up…':'Search directory'}</button></div></form><p><a href="${esc(campusDirectoryUrl(connectionState.query))}" target="_blank" rel="noopener">Open Miami Central directly ↗</a></p>${connectionState.directoryError?`<p role="alert" class="inline-error">${esc(connectionState.directoryError)}</p>`:''}${connectionState.checkedAt?`<p class="small muted">Checked ${esc(new Date(connectionState.checkedAt).toLocaleString())} · Public campus source</p>`:''}${connectionState.groups.map(g=>`<article class="campus-result"><h3><a href="${esc(g.url)}" target="_blank" rel="noopener">${esc(g.name)} ↗</a></h3><p>${g.tier?'Published tier '+g.tier:'Tier not published in this result'}</p>${g.mission?`<details><summary>Read the published mission</summary><p>${esc(g.mission)}</p></details>`:''}<p class="small muted">Reference information only. Sample financial records have not changed.</p></article>`).join('')}</section>`
  + `<details class="card detail-disclosure"><summary>Connection details</summary><p>${connectionState.loading?'Checking configuration…':connectionState.config?.speechConfigured?'Server speech and transcription are configured.':'Server speech and transcription are not configured. A public conversational agent can work with its agent ID.'}</p>${connectionState.error?`<p>${esc(connectionState.error)}</p>`:''}<p>Institutional submissions remain simulated. Only public campus profiles can be read here.</p><button class="btn ghost" data-a="refreshConnections">Check configuration again</button></details>`;
A.saveAgentId = () => {
  const id = document.querySelector('#savedAgentId')?.value.trim() || '';
  if (id && !/^agent_[a-zA-Z0-9_-]+$/.test(id)) return toast('Enter a public agent ID beginning with agent_. Never enter an API key.','bad');
  S.settings.demoAgentId = id; save(); UI.voiceError = ''; render(); toast(id?'Agent saved. Live use is still your choice.':'Agent removed.');
};
A.connectSavedAgent = () => A.startAgent({ agentId: S.settings.demoAgentId });
A.refreshConnections = loadConnectionStatus;
const goWithConnections = A.go;
A.go = d => { goWithConnections(d); if (d.id === 'connections' && !connectionState.config && !connectionState.error) loadConnectionStatus(); };
document.addEventListener('submit', event => { if (!event.target.matches('[data-a2="campusSearch"]')) return; event.preventDefault(); refreshDirectory(); });

function friendlyText(text) {
  const names = { ASG:'Student government', AP:'Accounts payable', AI:'Assistant', SEA:'Student engagement office', ADV:'Advisor', CSV:'Spreadsheet', XLSX:'Excel', PDF:'Pdf', SA:'Spending request', REQ:'Requisition', EIB:'Import file', JSON:'Data file' };
  return text.replace(/\b[A-Z][A-Z0-9]{1,}\b/g, word => names[word] || word[0] + word.slice(1).toLowerCase());
}
function sentenceCaseContent(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let node;
  while ((node = walker.nextNode())) {
    if (node.parentElement?.closest('script,style,input,textarea,pre,code,[data-exact-text]')) continue;
    const replacement = friendlyText(node.nodeValue); if (replacement !== node.nodeValue) node.nodeValue = replacement;
  }
}
// Preserve the detailed review forms; disclose each request rather than displaying every form at once.
function collapseReviewCards(main) {
  if (!['review','apportal','advq'].includes(UI.view)) return;
  const cards = [...main.querySelectorAll(':scope > section.card')];
  cards.forEach((card,i) => {
    const heading = card.querySelector('h2'); if (!heading) return;
    const details = document.createElement('details'), summary = document.createElement('summary');
    details.className = 'card review-disclosure'; details.open = i === 0;
    summary.textContent = heading.textContent; details.append(summary);
    const body = document.createElement('div'); body.className = 'review-body';
    while (card.firstChild) body.append(card.firstChild);
    details.append(body); card.replaceWith(details);
  });
}
render = function() {
  if (!S) return;
  if (S.mode === 'real' && !S.orgs.length) { renderSetupShell(); sentenceCaseContent(document.querySelector('#app')); return; }
  const nav = NAV[S.role] || NAV.treasurer;
  if (!nav.some(([id]) => id === UI.view)) UI.view = nav[0][0];
  const o = ORG() || S.orgs[0];
  const primary = new Set(['home','overview','meeting','proposal','spend','card','review','advq','apportal','balances','connections','quotes']);
  const navLink = ([id,label]) => `<a href="#${id}" ${UI.view===id?'class="on" aria-current="page"':''}>${esc(label)}</a>`;
  const secondary = nav.filter(([id])=>!primary.has(id));
  document.querySelector('#app').innerHTML = `<a class="skip-link" href="#main">Skip to content</a><header class="topbar"><a class="tb-brand" href="#${nav[0][0]}"><span class="tb-logo" aria-hidden="true">f</span><span><b>FundPath</b><small>Student organization funding</small></span></a><div class="tb-right"><div class="seg" aria-label="Choose a demo role">${Object.entries(ROLE_NAMES).map(([role,label])=>`<button data-a="role" data-r="${role}" class="${S.role===role?'on':''}" aria-pressed="${S.role===role}">${label}</button>`).join('')}</div><button class="mode" data-a="modeMenu">${S.mode==='real'?'My workspace':'Sample workspace'}</button></div></header><div class="shell"><aside class="side"><div class="workspace-label"><p>${esc(ROLE_NAMES[S.role])} workspace</p>${S.role==='treasurer' && S.orgs.length>1?`<label class="sr-only" for="workspaceOrg">Choose organization</label><select id="workspaceOrg" data-a2="pickOrg">${S.orgs.map(org=>`<option value="${esc(org.id)}" ${org.id===o.id?'selected':''}>${esc(org.name)}</option>`).join('')}</select>`:`<strong>${esc(S.role==='treasurer'?o.name:'Your review desk')}</strong>`}</div><nav aria-label="Workspace navigation">${nav.filter(([id])=>primary.has(id)).map(navLink).join('')}${secondary.length?`<details ${secondary.some(([id])=>id===UI.view)?'open':''}><summary>More tools</summary>${secondary.map(navLink).join('')}</details>`:''}</nav><div class="sidefoot"><button class="link" data-a="dockOpen">Ask FundPath</button><a href="https://miamicentral.miamioh.edu/club_signup" target="_blank" rel="noopener">Miami Central ↗</a></div></aside><main id="main" tabindex="-1"><div class="workspace-note"><span class="status-dot" aria-hidden="true"></span>${S.mode==='demo'?'Sample workspace':'Local workspace'}<span>Submissions and financial balances are simulated.</span></div>${VIEWS[UI.view]()}<footer class="foot">FundPath · A student-built funding demo.<br>Physical card pickup: Roudebush Hall. Final spending decisions belong to accounts payable.</footer></main></div>${DOCK.open?voiceDock():''}${UI.modal?`<div class="scrim" data-a="closeModal"></div><div class="modal" role="dialog" aria-modal="true">${UI.modal()}</div>`:''}`;
  collapseReviewCards(document.querySelector('#main'));
  sentenceCaseContent(document.querySelector('#app'));
};
// Prevent a background voice session following the user into a different role or workspace.
const changeRoleWithVoice = A.role;
A.role = async d => { if (liveConversation || conversationStarting) await A.stopAgent(); changeRoleWithVoice(d); };

VIEWS.meeting = () => '<details class="card detail-disclosure"><summary>Live meeting agent · ' + (liveConversation ? 'Connected' : 'Disconnected') + '</summary>' + voiceConnectionCard() + '</details>' + meetingViewWithWorkflow();
const toastInSentenceCase = toast;
toast = (message,kind) => toastInSentenceCase(friendlyText(String(message)),kind);
document.addEventListener('DOMContentLoaded', () => {
  const app = document.querySelector('#app');
  const observer = new MutationObserver(() => sentenceCaseContent(app));
  observer.observe(app, {childList:true,subtree:true});
  if (UI.view === 'connections') loadConnectionStatus();
});

for (const action of ['modeSwitch','meetReset','demoRestart']) {
  const original = A[action];
  A[action] = async (...args) => { if (liveConversation || conversationStarting) await A.stopAgent(); return original(...args); };
}
document.addEventListener('change', event => { if (event.target.dataset?.a2 === 'pickOrg' && (liveConversation || conversationStarting)) A.stopAgent(); }, true);
window.addEventListener('pagehide', () => { if (liveConversation) liveConversation.endSession(); });
