// Jeff's numbered journey, using FundPath's existing records, checks and actions.
// No provider calls are authorized in this cost-free demo iteration.
const JOURNEY_STEPS = [
  ['meeting','Meeting to budget','Organization'], ['proposal','Review and submit','Organization'],
  ['decision','Funding decision','Treasury'], ['authorization','Spending request','Organization'],
  ['paymentStatus','Payment review','Accounts payable'], ['pickup','Pick up your card','Organization'],
  ['receipts','Receipts and balances','Organization']
];
const journeyOriginal = { ...VIEWS };
for (const [id,label] of JOURNEY_STEPS) if (!NAV.treasurer.some(x=>x[0]===id)) NAV.treasurer.push([id,label]);
NAV.treasurer.push(['proposalSheet','Full proposal sheet']);
NAV.treasurer.push(['purchase','Record a purchase'],['receiptEntry','Receipt details']);
VIEWS.proposalSheet = journeyOriginal.proposal;
const journeyButton = (label,action,attrs='',secondary=false) => `<button class="btn ${secondary?'ghost':''}" data-a="${action}" ${attrs}>${esc(label)}</button>`;
const journeyGo = (label,view,secondary=false) => journeyButton(label,'go',`data-id="${view}"`,secondary);
const journeyHeading = (step,title,detail='') => `<header class="journey-heading"><p class="eyebrow">${step ? `Step ${step} of 7` : ROLE_NAMES[S.role]}</p><h1>${esc(title)}</h1>${detail?`<p>${esc(detail)}</p>`:''}</header>`;
const journeyFooter = (back,next='') => `<div class="journey-actions">${back?journeyGo('Back',back,true):'<span></span>'}${next}</div>`;
function journeyCard() { return S.spend.filter(s=>s.orgId===S.orgId && s.kind==='SA').slice().reverse().find(s=>s.fund==='ASG' && s.status!=='closed'); }
function journeyProposalStatus() {
  const p=proposalFor(S.orgId);
  return !p?'Not submitted':({draft:'Draft',returned:'Changes requested',review:'Treasury review',approved:'Approved',denied:'Not approved'}[p.status] || p.status);
}
VIEWS.home = () => {
  const next=nextOrgAction(),route=JOURNEY_STEPS[next.step-1][0];
  return journeyHeading(0,'Your next step, made simple',ORG().name)+`<section class="journey-panel welcome"><span class="step-pill">Step ${next.step} of 7</span><h2>${esc(next.title)}</h2><p>${esc(next.detail)}</p>${journeyGo('Continue',route)}<p class="small muted">Saved in this browser · ${esc(journeyProposalStatus())}</p></section>`;
};
VIEWS.meeting = () => {
  const m=M(),q=m.stage==='question'?m.qs[m.qi]:null;
  if(q) return journeyHeading(1,'One quick question',`Question ${m.qi+1} of ${m.qs.length}`)+`<section class="journey-panel"><h2>${esc(q.text)}</h2><form data-a2="meetAns" class="journey-form"><label for="ansIn">Your answer</label><input id="ansIn" required autocomplete="off"><button class="btn">Continue</button></form></section>`;
  if(m.stage==='building'||m.stage==='running') return journeyHeading(1,'Preparing your draft')+`<section class="journey-panel" role="status"><p>Your meeting is being turned into a budget. No institutional submission is being sent.</p></section>`;
  if(m.built && ['confirm','built','done'].includes(m.stage)) return journeyHeading(1,'Your meeting has a draft','You choose what happens next.')+`<section class="journey-panel"><h2>${money(m.built.ev.total)} requested</h2><p>${m.built.p.lines.length} budget items · ${m.built.p.events.length} events</p><p>Review every item before submitting. Extracted amounts are draft estimates, not supplier quotes.</p>${m.stage==='confirm'?journeyButton('Continue to your draft','meetEdit'):journeyGo('Continue to your draft','proposal')}<details><summary>See the transcript and draft changes</summary><div id="transcript" class="transcript">${transcriptHtml()}</div><ul>${(m.built.changes||[]).map(c=>`<li>${esc(c.what)}</li>`).join('')}</ul></details></section>`;
  return journeyHeading(1,'Start with your meeting','Talk about the event, what you need and what it costs.')+`<section class="journey-panel"><h2>What did your group agree on?</h2><p>Paste meeting notes, or use the sample to try the flow. Only your group’s statements become budget items.</p><label for="journeyNotes">Meeting notes</label><textarea id="journeyNotes" rows="6" placeholder="We agreed to host… The estimated cost is…">${esc(m.transcript.filter(([w])=>w!=='ElevenLabs agent').map(([w,t])=>`${w}: ${t}`).join('\n'))}</textarea><div class="journey-actions">${journeyButton('Use a sample meeting','journeySample','',true)}${journeyButton('Continue to build budget','journeyBuild')}</div><details><summary>Voice meeting with ElevenLabs</summary>${voiceConnectionCard()}</details></section>`;
};
A.journeySample = () => { UI.demoAuto=false; const m=M(); m.transcript=DEMO_MEETING.map(x=>[...x]);m.stage='idle';m.built=null;save();render(); };
A.journeyBuild = () => { const notes=document.querySelector('#journeyNotes')?.value.trim();if(!notes)return toast('Add meeting notes first.','bad');M().transcript=notes.split('\n').filter(Boolean).map(t=>['Exec board',t]);UI.demoAuto=false;save();return A.meetBuild(); };

// Move through existing proposal fields a section at a time. The full sheet stays available.
function proposalSections() {
  const template=document.createElement('template');template.innerHTML=journeyOriginal.proposal();
  return [...template.content.querySelectorAll('section.card')].filter(el=>/^Step [12346]/.test(el.querySelector('h2')?.textContent||''));
}
A.journeyPanel = d => { UI.proposalPanel=Math.max(0,Math.min(4,+d.n));render();document.querySelector('#main')?.focus(); };
function journeyItemFields(p,n,disabled) {
  const list=n===1?p.events:p.lines.filter(l=>n===2?isEv(l.cat):!isEv(l.cat));
  const index=Math.max(0,Math.min(list.length-1,UI.journeyItems?.[n]||0)),item=list[index],dis=disabled?'disabled':'';
  const field=(name,key,value,type='text')=>`<label>${name}<input type="${type}" data-f="${n===1?'ev':'ln'}:${item.id}:${key}" value="${esc(value??'')}" ${dis} ${type==='number'?'min="0" step="0.01"':''}></label>`;
  const select=(name,key,value,options)=>`<label>${name}<select data-f="${n===1?'ev':'ln'}:${item.id}:${key}" ${dis}>${options.map(([v,t])=>`<option value="${esc(v)}" ${v===value?'selected':''}>${esc(t)}</option>`).join('')}</select></label>`;
  let fields='';
  if(item&&n===1)fields=select('Event or trip','type',item.type,[['Event','Event'],['Trip','Trip']])+field('Name as registered on Miami Central','name',item.name)+field('Start date','start',item.start,'date')+field('End date','end',item.end,'date')+(item.type==='Trip'?field('Number of travelers','travelers',item.travelers,'number')+field('Number of nights','nights',item.nights,'number'):`<fieldset><legend>Event details</legend>${[['onCampus','On campus'],['educational','Educational'],['openToAll','Open to all'],['service','Service'],['lateNight','Late night']].map(([key,label])=>`<label class="check"><input type="checkbox" data-f="ev:${item.id}:${key}" ${item[key]?'checked':''} ${dis}>${label}</label>`).join('')}</fieldset>`);
  if(item&&n!==1)fields=field('What are you buying?','item',item.item)+select('Category','cat',item.cat,Object.keys(CATS).filter(k=>n===2?isEv(k):!isEv(k)).map(k=>[k,k]))+(n===2?select('For which event?','eventId',item.eventId,[['','Choose an event'],...p.events.map(e=>[e.id,e.name])]):'')+field('Total estimated cost','amount',item.amount,'number')+field('Why do you need this?','comment',item.comment)+`<p class="small muted">${item.quoteEvidence?'Supplier source attached; human review required.':item.quote?'A sample quote is recorded. Check its source before relying on it.':'No supplier quote attached. Estimates are not verified offers.'}</p>${journeyButton('Find a supplier quote','findLineQuote',`data-id="${item.id}"`,true)}`;
  return `<p class="small muted">${item?`${n===1?'Event':'Expense'} ${index+1} of ${list.length}`:'Nothing added yet'}</p>${item?`<div class="journey-fields">${fields}</div><details><summary>Change the item list</summary><div class="item-navigation">${index?journeyButton('Previous item','journeyItem',`data-panel="${n}" data-n="${index-1}"`,true):''}${journeyButton('Remove this item',n===1?'delEvent':'delLine',`data-id="${item.id}"`,true)}</div>${journeyButton(n===1?'Add another event':'Add another expense','journeyAddItem',`data-panel="${n}"`,true)}</details>`:'<p>Add only the items your organization agreed to request.</p>'+journeyButton(n===1?'Add an event':'Add an expense','journeyAddItem',`data-panel="${n}"`,true)}`;
}
A.journeyItem=d=>{UI.journeyItems={...(UI.journeyItems||{}),[d.panel]:+d.n};render();document.querySelector('#main')?.focus();};
A.journeyAddItem=d=>{const p=proposalFor(S.orgId),n=+d.panel;if(!p)return;const count=n===1?p.events.length:p.lines.filter(l=>n===2?isEv(l.cat):!isEv(l.cat)).length;UI.journeyItems={...(UI.journeyItems||{}),[n]:count};if(n===1)A.addEvent();else A.addLine({k:n===2?'event':'non'});};
A.journeyContinue=()=>{const n=UI.proposalPanel||0,p=proposalFor(S.orgId);if(n>=1&&n<=3){const list=n===1?p.events:p.lines.filter(l=>n===2?isEv(l.cat):!isEv(l.cat)),i=Math.max(0,Math.min(list.length-1,UI.journeyItems?.[n]||0));if(i<list.length-1)return A.journeyItem({panel:n,n:i+1});}A.journeyPanel({n:n+1});};
VIEWS.proposal = () => {
  const p=proposalFor(S.orgId);
  if(!p)return journeyHeading(2,'Create your funding draft')+`<section class="journey-panel"><p>Start with meeting notes, or enter a budget yourself.</p>${journeyGo('Start with a meeting','meeting')}${journeyButton('Enter a budget myself','newProposal','',true)}</section>`;
  if(!['draft','returned'].includes(p.status))return journeyHeading(2,'Your proposal is submitted',journeyProposalStatus())+`<section class="journey-panel"><h2>${money(evaluateProposal(p,ORG(),S.settings).total)} requested</h2><p>Your submitted proposal is saved. The next screen explains the funding decision.</p>${journeyGo('Continue to funding decision','decision')}<details><summary>View submitted proposal</summary>${sheetPreview(p,ORG())}</details></section>`;
  const n=UI.proposalPanel||0,sections=proposalSections(),titles=['Check your organization','Check events and trips','Check event expenses','Check other expenses','Review and submit'];
  const el=sections[n];if(!el)return journeyOriginal.proposal();
  el.querySelector('h2')?.remove();
  // Acknowledgements belong with the final submission, not the profile check.
  const acks=sections[0]?.querySelector('.acks');if(n===0)el.querySelector('.acks')?.remove();
  let content=el.innerHTML;
  if(n>=1&&n<=3)content=journeyItemFields(p,n,false);
  if(n===0)content=`<p><b>${esc(ORG().name)}</b> · ${esc(ORG().entityEmail)}</p><p>Tier ${esc(ORG().tier)} · ${esc(ORG().worktag)}</p><details><summary>Check or update organization details</summary>${journeyGo('Open organization profile','org',true)}</details>`+content.replace(/<div class="kvs">[\s\S]*?<\/div>\s*<label/,'<label');
  if(n===4){const ev=evaluateProposal(p,ORG(),S.settings);content=`<p class="review-total">${money(ev.total)} requested · ${p.lines.length} items</p>${content}`;const t=document.createElement('template');t.innerHTML=content;t.content.querySelector('.submitrow')?.remove();content=t.innerHTML+(acks?.outerHTML||'')+`<details ${ev.flags.length?'open':''}><summary>${ev.flags.length?`${ev.flags.length} checks need attention`:'All modeled checks pass'}</summary><ul>${ev.flags.map(f=>`<li>${esc(f.msg)}</li>`).join('')}</ul><p>Exceptions go to Treasury for a human decision. A compliant full award can pass automatically in this demo.</p></details>`;}
  const back=n?journeyButton('Back','journeyPanel',`data-n="${n-1}"`,true):journeyGo('Back','meeting',true);
  const next=n<4?journeyButton('Continue','journeyContinue'):journeyButton('Submit demo proposal','journeySubmit');
  return journeyHeading(2,titles[n],`Your review · ${n+1} of 5`)+`<section class="journey-panel">${p.status==='returned'?`<p role="alert">Treasury asked for changes: ${esc(p.notes||'')}</p>`:''}${content}<div class="journey-actions">${back}${next}</div></section>`;
};
A.journeySubmit = () => { A.submitProposal();const p=proposalFor(S.orgId);if(p&&!['draft','returned'].includes(p.status))A.go({id:'decision'}); };
VIEWS.decision = () => {
  const p=proposalFor(S.orgId),approved=p?.status==='approved';
  return journeyHeading(3,'Your funding decision',journeyProposalStatus())+`<section class="journey-panel"><h2>${approved?'Your proposal is approved':p?.status==='denied'?'Treasury did not approve this request':p?.status==='review'?'Treasury needs to review your request':'Submit your proposal first'}</h2><p>${approved?'Your approved card budget creates a matching spending request automatically in the demo.':p?.status==='review'?'You can leave this screen and return later. A person must decide on flagged items or a partial award.':'Return to your proposal to see its details.'}</p>${p?.notes?`<p>${esc(p.notes)}</p>`:''}${p?.reviewReasons?.length?`<details><summary>Why review is needed</summary><ul>${p.reviewReasons.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details>`:''}${journeyFooter('proposal',approved?journeyGo('Continue to spending request','authorization'):journeyGo('View proposal','proposal'))}</section>`;
};
VIEWS.authorization = () => {
  const p=approvedProposal(S,S.orgId),sa=journeyCard();
  return journeyHeading(4,'Your spending request','Built from your approved budget. No retyping.')+`<section class="journey-panel"><h2>${sa?`${money(sa.lines.reduce((n,l)=>n+spendLineAmt(l),0))} for your card`:p?'Your approved payment routes':'Funding approval comes first'}</h2><p>${sa?'This matching authorization is saved in the simulated Workday queue. No request was sent to Miami University.':p?'Card expenses can generate an authorization. Speaker contracts and other payment routes remain separate.':'Once Treasury approves your proposal, this step becomes available.'}</p>${sa?`<details><summary>Review authorization details</summary><p>Request ${esc(sa.id)} · Proposal ${esc(sa.proposalId||p?.id||'')}</p><ul>${sa.lines.map(l=>`<li>${esc(l.desc||l.memo)} · ${money(spendLineAmt(l))}</li>`).join('')}</ul><p>${esc(sa.wd?.status||sa.status)}</p></details>`:''}${journeyFooter('decision',sa?journeyGo('Continue to payment review','paymentStatus'):p?journeyButton('Prepare demo authorization','genSA'):journeyGo('View funding decision','decision'))}</section>`;
};
VIEWS.paymentStatus = () => {
  const sa=journeyCard(),ready=sa&&['approved','active'].includes(sa.status);
  return journeyHeading(5,'Accounts payable has the final say')+`<section class="journey-panel"><h2>${ready?'Your card request is approved':sa?.status==='denied'?'Your request was rejected':sa?'Your request is waiting for review':'No card request is ready yet'}</h2><p>${ready?'You can continue to physical card pickup.':sa?'The assistant offers a recommendation. A person in the Roudebush Hall portal approves, rejects or returns the request.':'Complete your approved spending request first.'}</p>${sa?.humanAPDecision?.note?`<p>${esc(sa.humanAPDecision.note)}</p>`:''}${journeyFooter('authorization',ready?journeyGo('Continue to card pickup','pickup'):journeyGo('View spending request','authorization'))}</section>`;
};
VIEWS.pickup = () => {
  const sa=journeyCard(),picked=sa?.status==='active';
  return journeyHeading(6,'Pick up your physical card','Card pickup takes place at Roudebush Hall.')+`<section class="journey-panel"><h2>${picked?'Pickup recorded':sa?.status==='approved'?'Your card is ready for pickup':'Wait for accounts payable approval'}</h2><p>${picked?'You can now record purchases and attach receipts.':sa?.status==='approved'?'Collect the card in person. Record your confirmation below after pickup.':'You cannot record pickup before a person approves the spending request.'}</p>${journeyFooter('paymentStatus',picked?journeyGo('Continue to receipts','receipts'):sa?.status==='approved'?journeyButton('I picked up my card','journeyPickup',`data-id="${sa.id}"`):journeyGo('View payment review','paymentStatus'))}</section>`;
};
A.journeyPickup = d => { A.pickup(d);if(journeyCard()?.status==='active')A.go({id:'receipts'}); };
VIEWS.receipts = () => {
  const cards=S.spend.filter(s=>s.orgId===S.orgId&&s.kind==='SA'&&s.status==='active'),tx=S.txns.filter(t=>t.orgId===S.orgId),missing=tx.filter(t=>!t.receiptDone);
  return journeyHeading(7,'Keep your receipts together',`${missing.length} ${missing.length===1?'receipt needs':'receipts need'} attention`)+`<section class="journey-panel"><h2>${missing.length?'Finish your next receipt':'Your receipts are up to date'}</h2>${missing.length?`<p>${esc(missing[0].merchant)} · ${money(missing[0].amount)}</p>${journeyButton('Add receipt details','journeyReceipt',`data-id="${missing[0].id}"`)}`:`<p>Record a card purchase, then upload its receipt and answer the purchase questions.</p>${cards.length?journeyButton('Record a purchase','journeyPurchase',`data-id="${cards[0].id}"`):journeyGo('Check card pickup','pickup')}`}<div class="journey-actions">${journeyGo('Back','pickup',true)}${journeyGo('Continue to balances','balances')}</div><details><summary>All cards and receipt records</summary>${journeyGo('Open card records','card',true)}</details></section>`;
};
function journeyFormBody(html) { const t=document.createElement('template');t.innerHTML=html;t.content.querySelector('.mh')?.remove();return t.innerHTML; }
A.journeyPurchase=d=>{UI.journeyCardId=d.id;A.go({id:'purchase'});};
VIEWS.purchase=()=>{const card=S.spend.find(s=>s.id===UI.journeyCardId&&s.orgId===S.orgId&&s.status==='active');return journeyHeading(7,'Record your purchase')+`<section class="journey-panel">${card?journeyFormBody(txnModal(card.id)):'<p>Choose an active card from your receipt records first.</p>'+journeyGo('Back to receipts','receipts')}</section>`;};
A.journeyReceipt=d=>{A.receipt(d);UI.modal=null;A.go({id:'receiptEntry'});};
VIEWS.receiptEntry=()=>{const t=S.txns.find(t=>t.id===UI.rcpt&&t.orgId===S.orgId);return journeyHeading(7,'Add your receipt',t?`${t.merchant} · ${money(t.amount)}`:'')+`<section class="journey-panel">${t?journeyFormBody(receiptModal(t.id)):'<p>Choose a purchase from your receipt records first.</p>'+journeyGo('Back to receipts','receipts')}</section>`;};
for(const name of ['saveTxn','saveReceipt']){const original=A[name];A[name]=d=>{const guided=['purchase','receiptEntry'].includes(UI.view);original(d);if(guided&&(name==='saveTxn'||S.txns.find(t=>t.id===d.id)?.receiptDone))A.go({id:'receipts'});};}

// Show a queue first, then one selected human decision. Never approve on Continue.
for(const [route,role] of [['review','asg'],['apportal','ap'],['advq','advisor']]) {
  VIEWS[route] = () => {
    const queue=roleQueue(role),selected=queue.find(x=>x.id===UI.journeyReview);
    if(!selected)return journeyHeading(0,'Choose the next request',`${queue.length} waiting for review`)+`<section class="journey-panel">${queue.length?`<ul class="journey-queue">${queue.map(x=>`<li><div><b>${esc(orgById(x.orgId)?.name)}</b><p>${esc(x.id)}</p></div>${journeyButton('Review request','journeyReview',`data-id="${x.id}"`)}</li>`).join('')}</ul>`:'<h2>You’re up to date</h2><p>New requests will appear here when they need your decision.</p>'}</section>`;
    const template=document.createElement('template');template.innerHTML=journeyOriginal[route]();
    const card=[...template.content.querySelectorAll('section.card')].find(el=>el.querySelector('h2')?.textContent.includes(selected.id));
    return journeyHeading(0,role==='ap'?'Make the final payment decision':role==='asg'?'Review the funding request':'Review the spending request','Sample roles are for demonstration. Production requires verified access.')+`<div class="journey-review">${journeyButton('Back to queue','journeyReview','',true)}${card?.outerHTML||'<p>This request has changed. Return to the queue.</p>'}</div>`;
  };
}
A.journeyReview=d=>{UI.journeyReview=d.id||null;render();document.querySelector('#main')?.focus();};
VIEWS.overview = () => { const q=roleQueue(S.role),route={asg:'review',ap:'apportal',advisor:'advq'}[S.role];return journeyHeading(0,S.role==='ap'?'Your payment review desk':S.role==='asg'?'Your Treasury review desk':'Your advisor review desk')+`<section class="journey-panel welcome"><h2>${q.length?`${q.length} requests need your review`:'You’re up to date'}</h2><p>${S.role==='ap'?'The assistant recommends. You make the final decision.':'Open one request, review its details and record your decision.'}</p>${journeyGo('Continue to review queue',route)}</section>`; };

// The user authorized using their ElevenLabs credits. Keep the original SDK
// lifecycle and session-only opt-in; never start calls on page load.
const creditedVoiceCard=voiceConnectionCard;
voiceConnectionCard=()=>creditedVoiceCard().replace('Your subscription and remaining credits have not been verified. Live use starts only when you press Connect.','You reported available free credits. FundPath cannot check your balance or prevent ElevenLabs overage charges. Live use starts only when you press Connect; no billing settings are changed.');
A.meetRecord = () => toast('Paid transcription is paused. Paste meeting notes instead.','bad');
const journeyQuoteView=VIEWS.quotes;
VIEWS.quotes=()=>journeyQuoteView().replace('<form ', '<p class="banner">Live research is paused to prevent provider charges. No prices will be invented. You can still review existing source-backed offers.</p><form ').replace(/<button class="btn" (disabled)?>(Researching supplier offers…|Find real offers)<\/button>/,'<button class="btn" disabled>Live research paused</button>');

const journeySetupRender=render;
A.journeyProgress=()=>{UI.showJourneySteps=!UI.showJourneySteps;render();};
render = function() {
  if(!S)return;
  if(S.mode==='real'&&!S.orgs.length)return journeySetupRender();
  const nav=NAV[S.role]||NAV.treasurer;if(!nav.some(([id])=>id===UI.view))UI.view=nav[0][0];
  const o=ORG()||S.orgs[0],step=JOURNEY_STEPS.findIndex(([id])=>id===UI.view),current=nextOrgAction().step;
  const tools=nav.filter(([id])=>!JOURNEY_STEPS.some(([s])=>s===id)&&!['home','overview','purchase','receiptEntry'].includes(id));
  document.querySelector('#app').innerHTML=`<a class="skip-link" href="#main">Skip to content</a><header class="journey-top"><a class="journey-brand" href="#${S.role==='treasurer'?'home':'overview'}"><span class="journey-logo" aria-hidden="true">f</span><span><b>FundPath</b><small>From meeting to card</small></span></a><div class="seg" aria-label="Choose a demo role">${Object.entries(ROLE_NAMES).map(([r,label])=>`<button data-a="role" data-r="${r}" class="${S.role===r?'on':''}" aria-pressed="${S.role===r}">${label}</button>`).join('')}</div></header><div class="journey-wrap"><div class="journey-context"><div>${S.role==='treasurer'&&S.orgs.length>1?`<label for="workspaceOrg" class="sr-only">Choose organization</label><select id="workspaceOrg" data-a2="pickOrg">${S.orgs.map(x=>`<option value="${esc(x.id)}" ${x.id===o.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select>`:`<b>${esc(ROLE_NAMES[S.role])}</b>`}</div><details class="journey-tools"><summary>More tools</summary><nav aria-label="More tools">${tools.map(([id,label])=>`<a href="#${id}">${esc(label)}</a>`).join('')}<button class="link" data-a="modeMenu">Switch workspace</button></nav></details></div><div class="journey-grid ${S.role==='treasurer'?'':'reviewer'}">${S.role==='treasurer'?`<aside class="journey-rail"><p>Where everything stands</p><button class="journey-progress-toggle" data-a="journeyProgress" aria-expanded="${!!UI.showJourneySteps}">See all seven steps</button><nav class="${UI.showJourneySteps?'expanded':''}" aria-label="Funding steps">${JOURNEY_STEPS.map(([id,label,owner],i)=>`<a href="#${id}" class="journey-step ${step===i?'now':''}" ${step===i?'aria-current="step"':''}><span class="journey-number">${i+1}</span><span><b>${label}</b><small>${owner}${i+1===current?' · Up next':''}</small></span></a>`).join('')}</nav></aside>`:''}<main id="main" tabindex="-1">${VIEWS[UI.view]()}<footer class="journey-foot">${S.mode==='demo'?'Sample':'Local'} workspace · Saved in this browser.<br>Institutional submissions, approvals and balances are simulated.</footer></main></div></div>${DOCK.open?voiceDock():''}${UI.modal?`<div class="scrim" data-a="closeModal"></div><div class="modal" role="dialog" aria-modal="true" aria-label="Request details">${UI.modal()}</div>`:''}`;
  document.querySelector('.journey-foot')?.insertAdjacentHTML('beforeend','<br><button class="link" data-a="dockOpen">Ask FundPath for help</button>');
  sentenceCaseContent(document.querySelector('#app'));
};
