/* Explicit demo AP review, denial reasons, notifications, and card pickup. */
const AP_REVIEWABLE=['approved','partial','sa_submitted'];
function apRequests(){
  return Object.values(Store.apps).filter(a=>!a.archivedDemo&&a.asg&&sum(Object.values(a.asg.approved||{}))>0&&['approved','partial','sa_submitted','sa_returned','card_ready','card_picked'].includes(a.status)).map(a=>{
    if(!a.sa){a.sa=buildSA(a);save(a,true);}return a;
  }).sort((a,b)=>Number(AP_REVIEWABLE.includes(b.status))-Number(AP_REVIEWABLE.includes(a.status)));
}
function apRequestLabel(a){return a.status==='sa_returned'?'Denied':a.status==='card_ready'?'Ready for pickup':a.status==='card_picked'?'Picked up':'Awaiting AP decision';}
apView=function(){
  const requests=apRequests();
  if(!requests.some(a=>a.id===UI.apSel))UI.apSel=requests.find(a=>a.id===cur()?.id)?.id||requests[0]?.id||null;
  const selected=requests.find(a=>a.id===UI.apSel);
  return `<div class="stack"><h1>Accounts Payable</h1><p>Review the prepared Spend Authorization, then approve or deny it. Approval makes the card available for pickup at Roudebush Hall.</p>${requests.length?`<div class="ap-request-list" aria-label="Spend Authorization requests">${requests.map(a=>`<button class="btn ${a.id===UI.apSel?'go':''}" data-ap-action="select" data-id="${a.id}" aria-pressed="${a.id===UI.apSel}">${esc(a.club)} · ${money(a.sa.total)}<span class="small">${esc(apRequestLabel(a))}</span></button>`).join('')}</div>${apDetail(selected)}`:'<section class="card"><h2>No requests to review yet</h2><p>An approved ASG proposal automatically prepares a Spend Authorization. It appears here for AP review, even before the optional demo Workday submission.</p></section>'}</div>`;
};
apDetail=function(a){
  if(!a?.sa)return '';
  const pending=AP_REVIEWABLE.includes(a.status),decision=a.apDecisions?.at(-1),checks=apChecks(a);
  return `<section class="card stack"><div class="head"><div><p class="small muted">${esc(a.org.sa)} · ${a.sa.workday?esc(a.sa.workday.id):'Prepared in FundPath · demo'}</p><h2>${esc(a.club)} · ${money(a.sa.total)}</h2></div><span class="pill">${esc(apRequestLabel(a))}</span></div>${!a.sa.workday?'<p class="small muted">This authorization is prepared in the demo. It has not been submitted to Workday.</p>':''}<div class="tw"><table><thead><tr><th>Expense</th><th class="r">Amount</th></tr></thead><tbody>${a.sa.lines.map(l=>`<tr><td>${esc(l.memo)}</td><td class="r num">${money(l.amount)}</td></tr>`).join('')}</tbody></table></div><details><summary>Funding and purchasing checks</summary><ul>${checks.map(c=>`<li>${c.ok?'✓':'Review:'} ${esc(c.ok?c.t:c.f)}</li>`).join('')}</ul></details>${pending?`<label class="f" for="ap-decision-reason">Reason if denied (required)<textarea id="ap-decision-reason" rows="3" placeholder="Explain what the organization needs to correct."></textarea></label><p id="ap-reason-error" class="flag error" role="alert" hidden>Enter a reason before denying this request.</p><p class="small muted">Approve will notify ${esc(a.club)} that its card is ready for pickup at Roudebush Hall.</p><div class="row between"><button class="btn bad" data-ap-action="deny" data-id="${a.id}">Deny</button><button class="btn ok big" data-ap-action="approve" data-id="${a.id}">Approve</button></div>`:a.status==='sa_returned'?`<div role="status"><h3>Denied by Accounts Payable</h3><p>${esc(a.returned||decision?.reason||'See the AP decision history.')}</p><p class="small muted">The organization has been notified and can revise its request.</p></div>`:a.card.status==='ready'?`<div role="status"><h3>Card available for pickup</h3><p>${esc(a.club)} has been notified to pick up its card at Roudebush Hall.</p></div><label class="f" for="ap-pickup-last4">Card last four digits (optional)<input type="text" id="ap-pickup-last4" inputmode="numeric" maxlength="4"></label><button class="btn go" data-ap-action="pickup" data-id="${a.id}">Mark card picked up</button>`:`<p role="status">Card picked up at Roudebush Hall${a.card.pickedAt?' · '+day(a.card.pickedAt):''}.</p>`}${a.apDecisions?.length?`<details><summary>AP decision history</summary><ul>${a.apDecisions.map(d=>`<li>${d.decision==='approved'?'Approved':'Denied'} · ${day(d.at)}${d.reason?' · '+esc(d.reason):''}</li>`).join('')}</ul></details>`:''}</section>`;
};
apDecide=function(a,ok,note=''){
  if(UI.role!=='ap'||!a?.sa||!AP_REVIEWABLE.includes(a.status))return false;
  const reason=String(note).trim();
  if(!ok&&!reason){toast('Enter a reason before denying this request.');return false;}
  const approved=sum(Object.values(a.asg?.approved||{}));
  if(ok&&(!(a.sa.total>0)||cents(a.sa.total)>cents(approved)||!a.sa.lines.length)){toast('The authorization must be within the approved ASG amount.');return false;}
  const decision={decision:ok?'approved':'denied',reason:ok?'':reason,at:now(),amount:a.sa.total,who:'Accounts Payable'};
  (a.apDecisions||(a.apDecisions=[])).push(decision);a.sa.apDecision=decision;
  if(ok){
    a.status='card_ready';a.card={status:'ready',loaded:a.sa.total,last4:'',pickupLocation:'Roudebush Hall',readyAt:now()};
    if(a.sa.workday)a.sa.workday.status='Approved — card ready for pickup';
    delete a.returned;
    log(a,'Accounts Payable',`Approved ${money(a.sa.total)}; card available at Roudebush Hall`);
    notify(a,'org',`Accounts Payable approved your spending request for ${money(a.sa.total)}. Your card is available for pickup at Roudebush Hall. Bring your Miami ID.`);
  }else{
    a.status='sa_returned';a.returned=reason;
    if(a.sa.workday)a.sa.workday.status='Denied by Accounts Payable';
    log(a,'Accounts Payable','Denied spending request: '+reason);
    notify(a,'org','Accounts Payable denied your spending request. Reason: '+reason+'. Revise the request and send it again.');
  }
  save(a,true);render();return true;
};
function confirmCardPickup(a,last4=''){
  if(!a||a.card.status!=='ready'||!['org','ap'].includes(UI.role)||(UI.role==='org'&&cur()!==a))return;
  if(last4&&!/^\d{4}$/.test(last4)){toast('Enter four digits, or leave the field blank.');return;}
  a.card.status='picked';a.card.last4=last4;a.card.pickedAt=now();a.status='card_picked';
  log(a,UI.role==='ap'?'Accounts Payable':'Treasurer','Confirmed card pickup at Roudebush Hall');
  notify(a,'org','Card pickup at Roudebush Hall is confirmed. Save receipts as you spend.');save(a,true);render();
}
const workdayBeforeExplicitAp=stWorkday;
stWorkday=function(a){
  if(a.status==='sa_returned')return `<div class="stack"><h1>Spending request denied</h1>${hero('bad','!','Accounts Payable denied this request',esc(a.returned||'See your AP decision.'))}<p>Your ASG budget approval is still saved. Correct the spending request and send it for AP review again.</p><button class="btn go" data-ap-action="revise" data-id="${a.id}">Revise spending request</button></div>`;
  return workdayBeforeExplicitAp(a);
};
const cardBeforeExplicitAp=stCard;
stCard=function(a){
  if(a.card.status!=='ready')return cardBeforeExplicitAp(a);
  return `<div class="stack"><h1>Pick up your card</h1>${hero('ok','✓','Your card is available for pickup',`${esc(a.club)} · ${money(a.card.loaded)} approved. Pick up your card at Roudebush Hall. Bring your Miami ID.`)}<p>After collecting your card, confirm pickup to continue to receipts.</p><button class="btn go big" data-ap-action="org-pickup" data-id="${a.id}">I picked up the card</button></div>`;
};
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-ap-action]');if(!b||b.disabled)return;
  const a=Store.apps[b.dataset.id];
  if(b.dataset.apAction==='select'&&UI.role==='ap'){UI.apSel=a?.id;render();return;}
  if(['approve','deny'].includes(b.dataset.apAction)&&UI.role==='ap'){
    const reason=document.querySelector('#ap-decision-reason')?.value.trim()||'';
    if(b.dataset.apAction==='deny'&&!reason){const error=document.querySelector('#ap-reason-error');if(error)error.hidden=false;document.querySelector('#ap-decision-reason')?.focus();return;}
    apDecide(a,b.dataset.apAction==='approve',reason);
  }
  if(b.dataset.apAction==='pickup'&&UI.role==='ap')confirmCardPickup(a,document.querySelector('#ap-pickup-last4')?.value.trim()||'');
  if(b.dataset.apAction==='org-pickup'&&UI.role==='org')confirmCardPickup(a);
  if(b.dataset.apAction==='revise'&&UI.role==='org'&&a===cur()&&a.status==='sa_returned'){
    (a.authorizationHistory||(a.authorizationHistory=[])).push(a.sa);a.sa=buildSA(a);a.status=a.asg.decision==='partial'?'partial':'approved';UI.stage=3;
    log(a,'Treasurer','Prepared a revised spending request after AP denial');save(a,true);render();
  }
});
render();
