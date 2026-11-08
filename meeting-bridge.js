/* Michael's live meeting intake; Jeff's downstream workflow stays in index.html. */
let meetingSession=null,meetingConnecting=false,meetingEpoch=0,meetingError='';
const meetingAgentId=DEFAULT_MEETING_AGENT_ID;
const spokenExpenseCategories=[
  [/\bcapital(?:\s+(?:items?|purchases?|equipment))?\b/i,'Capital Item'],
  [/\bflights?\b/i,'Trip: Flights'],[/\bgas\b/i,'Trip: Gas'],
  [/\bhotels?\b/i,'Trip: Hotels'],[/\bspeaker\s+fees?\b/i,'Event: Guest Speaker'],
  [/\bfood\b/i,'Event: Food'],[/\bmarketing\b/i,'Marketing'],
  [/\badministrative\b/i,'Admin Item']
];
function spokenExpenseCategory(text){return spokenExpenseCategories.find(([pattern])=>pattern.test(text))?.[1]||null;}
const isTravelExpense=l=>['Trip: Gas','Trip: Flights','Trip: Hotels'].includes(l.category);
for(const category of ['Event: Food','Event: Guest Speaker'])if(!NONEVENT_CATS.includes(category))NONEVENT_CATS.push(category);
function isMeetingEnd(text){
  return /^(?:(?:awesome|okay|ok|great|thanks|thank you|fundpath|please|let's|lets|we can|can you|could you)[\s,.!—-]+)*(?:end|stop|finish|wrap up)\s+(?:(?:the|our|this)\s+)?meeting(?:\s+(?:now|please))?[\s,.!?]*$/i.test(String(text).trim());
}
function hasExpense(text){return !isMeetingEnd(text)&&!!spokenExpenseCategory(text);}
let meetingFinishing=false;
async function finishMeetingAndBuild(){
  const a=cur();if(!a||a.status!=='draft'||meetingFinishing)return;
  meetingFinishing=true;
  try{await stopMeeting();if(cur()===a){const text=studentNotes(a);if(text.trim())await fillFromTranscript(text);else toast('No expenses were captured. Add meeting notes to build your budget.');}}
  finally{meetingFinishing=false;}
}
// Keep the spoken description available to the purchase-restriction checker.
const jeffFromSentence=fromSentence;
fromSentence=function(s,amounts,event){
  if(!hasExpense(s))return [];
  const result=jeffFromSentence(s,amounts,event);
  for(const l of [].concat(result))l.note=[l.note,s].filter(Boolean).join(' · ');
  return result;
};
// Only explicit expense categories can create a budget line. Conversation context
// never becomes an event; event/trip headers must be deliberately stated.
const jeffParseTranscript=parseTranscript;
function consolidateMeetingExpenses(lines,events=[]){
  const result=[];
  const identity=l=>(`${l.item} ${l.note||''}`.toLowerCase().match(/\b(projector|laptop|computer|tablet|monitor|printer|camera|microphone|chair|table|tent|banner|poster|flyer|subscription|software)s?\b/)||[])[1]||'';
  const context=l=>events.find(e=>e.id===l.eventId)?.name?.toLowerCase().trim()||l.eventId||'';
  for(const line of lines){
    if(line.sourceSheetRow){result.push({...line});continue;}
    const noun=identity(line),separate=/\b(another|additional|second|third|separate|different)\b/i.test(line.item);
    const previous=!separate&&[...result].reverse().find(l=>l.category===line.category&&context(l)===context(line)&&(!noun||!identity(l)||identity(l)===noun));
    if(previous){
      const id=previous.id,mentions=(previous.meetingMentions||1)+1,notes=[...new Set([previous.note,line.note].filter(Boolean))].join(' · ');
      Object.assign(previous,line,{id,note:notes,meetingMentions:mentions});
    }else result.push({...line,meetingMentions:line.meetingMentions||1});
  }
  return result;
}
parseTranscript=function(text){
  const result={tier:null,prior:null,events:[],lines:[],questions:[]};let event=null;
  const sentences=String(text).split(/\n+|(?<=[.!?])\s+/).flatMap(s=>s.split(/\s+(?:and|then)\s+(?=(?:capital|flights?|gas|hotels?|speaker\s+fees?|food|marketing|administrative)\b)/i));
  for(let sentence of sentences){
    sentence=sentence.replace(/^[A-Z][\w .'-]*\([^)]*\):\s*/, '').trim();
    if(!sentence||isMeetingEnd(sentence))continue;
    if(/^(?:event|trip)\b[^:]*:/i.test(sentence)){
      const context=jeffParseTranscript(sentence);if(context.events.length){event=context.events[0];result.events.push(event);}
    }
    const category=spokenExpenseCategory(sentence);if(!category)continue;
    const amounts=[...sentence.matchAll(/\$\s*([\d,]+(?:\.\d{1,2})?)|\b(\d+(?:\.\d{1,2})?)\s+dollars\b/gi)].map(m=>Number((m[1]||m[2]).replace(/,/g,'')));
    if(!amounts.length)continue;
    if(amounts.length>1){result.questions.push('Confirm the itemized amount for: '+sentence);}
    const standalone=!isTravelExpense({category});
    const label=sentence.replace(/\$\s*[\d,.]+|\b\d+(?:\.\d{1,2})?\s+dollars\b/gi,'').replace(/\s+/g,' ').trim();
    result.lines.push(mkLine(standalone?'nonevent':'event',standalone?null:event?.id||null,label,category,amounts.at(-1),'',sentence));
  }
  result.lines=consolidateMeetingExpenses(result.lines,result.events);
  // Do not keep a meeting/event heading with no actual event expenses.
  result.events=result.events.filter(e=>result.lines.some(l=>l.eventId===e.id));
  return result;
};
function meetingMessages(a){return a.meetingMessages||(a.meetingMessages=[]);}
readBudget=async function(text){return {...parseTranscript(text),how:'FundPath category reader'};};
function studentNotes(a){return meetingMessages(a).filter(m=>m.role==='user'&&!isMeetingEnd(m.text)).map(m=>m.text).join('\n');}
function meetingCard(a){
  const rows=meetingMessages(a),busy=meetingConnecting||UI.rec.state==='reading';
  return `<section class="card stack" aria-labelledby="meeting-title"><h2 id="meeting-title">Plan your event together</h2><p>Talk with your team. Your ElevenLabs agent listens and helps check the plan. Say “end meeting” when you’re done; FundPath will stop listening and create your budget.</p><p class="small muted">Starting shares microphone audio with ElevenLabs and uses your account's credits.</p><p role="status">${meetingConnecting?'Connecting…':meetingSession?'Your meeting agent is listening.':rows.length?'Meeting notes saved. Continue when your team is ready.':'Ready when your team is.'}</p>${meetingError?`<p role="alert">${esc(meetingError)}</p>`:''}<div class="row">${meetingSession?'<button class="btn" data-meeting="stop">End meeting</button>':`<button class="btn go big" data-meeting="start" ${busy?'disabled':''}>Start meeting with ElevenLabs</button>`}<button class="btn ${rows.length?'go':''}" data-meeting="build" ${!studentNotes(a)||busy?'disabled':''}>${UI.rec.state==='reading'?'Checking your plan…':'Create budget draft'}</button></div>${rows.length?`<details><summary>Meeting transcript · ${rows.length} messages</summary><div class="meeting-transcript">${rows.map(m=>`<p><b>${m.role==='user'?'Your team':'ElevenLabs agent'}</b><br>${esc(m.text)}</p>`).join('')}</div></details>`:''}<details><summary>Use notes or try an example</summary><div class="stack"><label for="bridge-notes">Meeting notes</label><textarea id="bridge-notes" rows="5" placeholder="Event, date, attendees, each expense and agreed cost">${esc(a.transcript)}</textarea><div class="row"><button class="btn" data-meeting="notes">Create draft from notes</button><button class="btn" data-meeting="sample">Try sample meeting</button></div></div></details></section>`;
}
async function startMeeting(){
  const a=cur();if(!a||a.status!=='draft'||meetingSession||meetingConnecting)return;
  const epoch=++meetingEpoch;meetingConnecting=true;meetingError='';render();
  try{
    const {Conversation}=await import('https://esm.sh/@elevenlabs/client@1.35.0');
    if(epoch!==meetingEpoch)return;
    let disconnected=false;
    const session=await Conversation.startSession({agentId:meetingAgentId,connectionType:'websocket',
      onMessage:m=>{
        if(epoch!==meetingEpoch||cur()!==a||!m.message||m.isFinal===false)return;
        meetingMessages(a).push({role:m.source==='user'||m.role==='user'?'user':'agent',text:String(m.message)});
        a.transcript=studentNotes(a);save(a);render();
        if((m.source==='user'||m.role==='user')&&isMeetingEnd(m.message))Promise.resolve().then(finishMeetingAndBuild);
      },
      onDisconnect:()=>{disconnected=true;if(epoch===meetingEpoch){meetingSession=null;meetingConnecting=false;render();}},
      onError:()=>{if(epoch===meetingEpoch){meetingError='Could not connect. Check microphone permission and the allowed website domains for your ElevenLabs agent.';render();}}
    });
    if(epoch!==meetingEpoch||cur()!==a){await session.endSession();return;}
    if(!disconnected){meetingSession=session;session.sendContextualUpdate?.(`You are helping ${a.club} plan an ASG budget. Listen to the team and offer concise suggestions. Do not claim to submit or approve anything. Budget limits: tier ${a.tier}, remaining ${totals(a).cap}; food ${totals(a).foodCap}; hotel $50/person/night; flights $300/person; admin/storage $1000 each; speakers $3000. Alcohol, tobacco and gambling are prohibited. Capital purchases need no quote or Miami Central listing. Food, speaker fees, marketing and administrative expenses also stand alone and need no event or campus listing. Only gas, flights and hotels require an event/trip relationship. Ask for travel dates, attendance and Miami Central listing for those travel plans; quotes remain required for hotels and flights. Flag uncertain eligibility. The app validates the draft after the meeting.`);}
  }catch{if(epoch===meetingEpoch)meetingError='Could not start your meeting. Check microphone permission, your connection and the agent’s allowed website domains. Your notes are saved.';}
  finally{if(epoch===meetingEpoch){meetingConnecting=false;render();}}
}
async function stopMeeting(){
  ++meetingEpoch;meetingConnecting=false;const s=meetingSession;meetingSession=null;
  try{if(s)await s.endSession();}catch{meetingError='The connection ended. Your meeting notes are saved.';}
  render();
}
function prepareCompliantDraft(a){
  const adjustments=[];a.excludedLines=[];
  a.lines=a.lines.filter(l=>{
    const category=l.sourceSheetRow?l.category:spokenExpenseCategory(l.item)||spokenExpenseCategory(l.note||'');
    if(isMeetingEnd(l.item)||!category)return false;
    l.category=category;
    if(!isTravelExpense(l)){l.group='nonevent';l.eventId=null;}
    const text=`${l.item} ${l.vendor} ${l.note}`;
    if(PROHIBITED.test(text)||CLOTHING.test(text)){a.excludedLines.push({...l,reason:PROHIBITED.test(text)?'Prohibited purchase':'Requires a trademark / funding review'});return false;}
    return true;
  });
  a.lines=consolidateMeetingExpenses(a.lines,a.events);
  function cap(label,limit,predicate){
    const lines=a.lines.filter(predicate),total=sum(lines.map(l=>l.amount));
    if(total>limit){for(const l of lines){const before=l.amount;l.amount=Math.floor(cents(before)*Math.max(0,limit)/total)/100;adjustments.push(`${l.item}: ${money(before)} → ${money(l.amount)} (${label}).`);}}
  }
  let t=totals(a);
  cap('food limit',t.foodCap,l=>/Food$/.test(l.category));
  cap('admin limit',1000,l=>l.category==='Admin Item');cap('storage limit',1000,l=>l.category==='Storage');cap('speaker limit',3000,l=>l.category==='Event: Guest Speaker');
  // Missing traveler counts must be supplied before calculating a travel cap.
  const trips=a.events.filter(e=>e.type==='Trip');
  if(trips.length&&trips.every(e=>+e.people>0&&+e.nights>0))cap('hotel limit',t.hotelCap,l=>l.category==='Trip: Hotels');
  if(trips.length&&trips.every(e=>+e.flightPeople>0))cap('flight limit',t.flightCap,l=>l.category==='Trip: Flights');
  cap('remaining tier funding',t.cap,()=>true);
  a.lines=a.lines.filter(l=>{if(+l.amount>0)return true;a.excludedLines.push({...l,reason:'No remaining allowance in this funding category'});return false;});
  a.budgetAdjustments=adjustments;
  a.events=a.events.filter(e=>a.lines.some(l=>l.eventId===e.id));
}
const jeffFillFromTranscript=fillFromTranscript;
fillFromTranscript=async function(text){
  const a=cur();if(!a||a.status!=='draft')return;
  await jeffFillFromTranscript(text);
  if(cur()!==a||UI.rec.state!=='done')return;
  a.importedProposal=false;
  prepareCompliantDraft(a);a.meetingQuestions=UI.rec.questions||[];a.meetingAmountsConfirmed=false;UI.rec={state:'idle'};UI.showAgent=false;UI.manual=true;save(a,true);render();
};
const jeffValidate=validate;
validate=function(a){
  const travelLines=a.lines.filter(isTravelExpense);
  const normalized={...a,lines:a.lines.map(l=>isTravelExpense(l)?{...l,group:'event'}:{...l,group:'nonevent',eventId:null}),events:a.events.filter(e=>travelLines.some(l=>l.eventId===e.id))};
  const v=jeffValidate(normalized);
  // Standalone purchases need neither a fictional event nor a campus listing.
  const standaloneOnly=a.lines.length>0&&!travelLines.length;
  if(standaloneOnly){
    v.all=v.all.filter(x=>x.msg!=='Add at least one event or trip.');
    v.errors=v.all.filter(x=>x.sev==='error');v.reviews=v.all.filter(x=>x.sev==='review');
  }
  // Capital items are exempt from the attachment's over-$1,000 quote gate.
  v.all=v.all.filter(x=>!(x.fix==='quote'&&a.lines.some(l=>l.id===x.line&&l.category==='Capital Item')));
  v.all=v.all.filter(x=>!(x.sev==='review'&&x.src==='ASG committee criterion: itemized'&&a.lines.some(l=>l.id===x.line&&l.sourceSheetRow)));
  v.errors=v.all.filter(x=>x.sev==='error');v.reviews=v.all.filter(x=>x.sev==='review');
  // This preset demo skips officer setup; never invent president/advisor identities.
  if(a.defaultMeetingProfile||a.presetClubKey){
    v.all=v.all.filter(x=>!x.club||/Treasurer name|SA number/.test(x.msg)||(/Treasurer email/.test(x.msg)&&!!a.org.treasurerEmail));
    v.errors=v.all.filter(x=>x.sev==='error');v.reviews=v.all.filter(x=>x.sev==='review');
  }
  const add=(msg)=>{const x={sev:'error',msg,src:S.tpl};v.all.push(x);v.errors.push(x);};
  for(const line of travelLines)if(!a.events.some(e=>e.id===line.eventId))add(`${line.item}: link this travel expense to an event or trip.`);
  if(!a.lines.length)add('Add at least one eligible expense before submitting.');
  if(!(TIERS[a.tier]>0))add('Choose a valid funding tier.');
  if(!Number.isFinite(+a.org.prior)||+a.org.prior<0)add('Prior funding must be a valid nonnegative amount.');
  if(v.t.total>v.t.cap&&!v.errors.some(x=>x.fix==='total'))add('No funding remains within your tier allowance.');
  if(a.lines.some(l=>!Number.isFinite(+l.amount)||!CAT_MAP[l.category]))add('Every expense needs a valid amount and funding category.');
  if(a.meetingQuestions?.length&&!a.meetingAmountsConfirmed)add('Check the itemization of the meeting amounts and confirm the lines below.');
  return v;
};
const jeffBudgetEditor=budgetEditor;
budgetEditor=function(a,locked){
  let html=jeffBudgetEditor(a,locked);
  for(const l of a.lines.filter(l=>l.category==='Capital Item')){
    html=html.replace(`<label class="btn sm" for="q-${l.id}">Add quote</label>`,`<label class="btn sm" for="q-${l.id}">Add quote (optional)</label>`);
  }
  return html;
};
const jeffStBudget=stBudget;
stBudget=function(a){
  if(a.status!=='draft')return jeffStBudget(a);
  if(!a.lines.length&&!a.transcript||UI.showAgent)return `<div class="stack"><h1>Start with your meeting</h1>${meetingCard(a)}</div>`;
  const v=validate(a),issues=[...v.errors,...v.reviews];
  if(v.all.some(x=>x.club)){
    const shell=document.createElement('div');shell.innerHTML=budgetEditor(a,false);
    return `<div class="stack"><h1>Confirm your club details</h1><p>Your draft is saved. Complete these details before reviewing the budget lines.</p>${shell.querySelector('#club-details').outerHTML}<ul>${v.all.filter(x=>x.club).map(x=>`<li>${esc(x.msg)}</li>`).join('')}</ul></div>`;
  }
  return `<div class="stack"><h1>Review your budget</h1><p>FundPath checked the draft against the ASG rules included in this demo. Review each line, then choose whether to submit.</p><section class="card stack"><h2>${money(totals(a).total)} requested</h2><div class="tw"><table><thead><tr><th>Expense</th><th>Category</th><th class="r">ASG request</th></tr></thead><tbody>${a.lines.map(l=>`<tr><td>${esc(l.item)}</td><td>${esc(CAT_NAMES[l.category]||l.category)}</td><td class="r num">${money(l.amount)}</td></tr>`).join('')}</tbody></table></div>${a.budgetAdjustments?.length||a.excludedLines?.length?`<details><summary>What FundPath adjusted</summary><ul>${(a.budgetAdjustments||[]).map(s=>`<li>${esc(s)}</li>`).join('')}${(a.excludedLines||[]).map(l=>`<li>${esc(l.item)} · ${money(l.amount)} excluded: ${esc(l.reason)}.</li>`).join('')}</ul></details>`:''}${issues.length?`<h3>Finish these details</h3><ul>${issues.map(x=>`<li>${esc(x.msg)}</li>`).join('')}</ul>`:`<p role="status">All included checks passed. Ready for automatic ASG approval in this demo.</p>`}${a.meetingQuestions?.length&&!a.meetingAmountsConfirmed?`<ul>${a.meetingQuestions.map(q=>`<li>${esc(q)}</li>`).join('')}</ul><button class="btn" data-meeting="confirm-amounts">I checked the itemized amounts</button>`:''}</section><details class="card" ${issues.length?'open':''}><summary>Edit budget and supporting details</summary>${budgetEditor(a,false)}</details></div>`;
};
const jeffPaintDock=paintDock;
paintDock=function(){
  jeffPaintDock();const a=cur();
  if(UI.role!=='org'||UI.stage!==1||!a||a.status!=='draft')return;
  if(meetingSession||meetingConnecting||UI.showAgent||!a.lines.length){$('#dock').hidden=true;return;}
  const v=validate(a),blocked=v.errors.length||v.reviews.length;
  $('#dock').hidden=false;
  $('#dock-in').innerHTML=`<span>${blocked?'Complete the details above.':'May FundPath submit this ASG proposal?'}</span><button class="btn go big" data-act="submit" ${blocked?'disabled':''}>Submit proposal to ASG</button>`;
};
const jeffSubmitBudget=submitBudget;
submitBudget=function(){
  const a=cur();if(!a||a.status!=='draft'||meetingSession||meetingConnecting)return;
  const v=validate(a);if(v.errors.length||v.reviews.length){UI.showFix=true;render();return;}
  jeffSubmitBudget();
  if(a.status==='approved'&&!a.sa){a.sa=buildSA(a);save(a,true);render();}
};
document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-meeting]');if(!b||b.disabled)return;
  const a=cur();if(!a||a.status!=='draft')return;
  if(b.dataset.meeting==='start')return startMeeting();
  if(b.dataset.meeting==='confirm-amounts'){a.meetingAmountsConfirmed=true;save(a);render();return;}
  if(b.dataset.meeting==='stop')return stopMeeting();
  if(b.dataset.meeting==='build'){await stopMeeting();if(cur()===a)await fillFromTranscript(studentNotes(a));}
  if(b.dataset.meeting==='notes'){const text=$('#bridge-notes').value.trim();if(!text)return toast('Add meeting notes first.');await stopMeeting();if(cur()===a)await fillFromTranscript(text);}
  if(b.dataset.meeting==='sample'){await stopMeeting();if(cur()===a)await fillFromTranscript(scriptText());}
});
// Stop a microphone session before role, stage or workspace changes.
document.addEventListener('click',e=>{if(e.target.closest('[data-stage],[data-open],#club-chip,[data-act="stage"]')&&(meetingSession||meetingConnecting))stopMeeting();},true);
$('#role').addEventListener('change',()=>{if(meetingSession||meetingConnecting)stopMeeting();});
window.addEventListener('pagehide',()=>{++meetingEpoch;meetingSession?.endSession();});
let restartingDemo=false;
async function restartBankingDemo(){
  if(restartingDemo)return;restartingDemo=true;
  try{
    await stopMeeting();
    for(const a of Object.values(Store.apps))if(a.defaultMeetingProfile){a.defaultMeetingProfile=false;save(a,true);}
    const a=newApp('Banking Club',4);a.defaultMeetingProfile=true;
    Object.assign(a.org,{sa:'SA10472',treasurer:'Michael Rose',treasurerEmail:'rosemw2@miamioh.edu',prior:0});
    bankingWorkspace=a;UI.role='org';UI.appId=a.id;UI.stage=1;UI.fill=null;UI.rec={state:'idle'};UI.manual=false;UI.showAgent=true;UI.showFix=false;meetingError='';
    save(a,true);lsSet('fp.role','org');lsSet('fp.app',a.id);lsSet('fp.stage',1);render();window.scrollTo({top:0});
  }finally{restartingDemo=false;}
}
document.addEventListener('click',e=>{if(e.target.closest('#restart-demo'))restartBankingDemo();});
// Open directly in Michael's Banking Club workspace without an officer setup form.
let bankingWorkspace=Object.values(Store.apps).find(a=>a.defaultMeetingProfile);
if(!bankingWorkspace){
  bankingWorkspace=newApp('Banking Club',4);bankingWorkspace.defaultMeetingProfile=true;
  Object.assign(bankingWorkspace.org,{sa:'SA10472',treasurer:'Michael Rose',treasurerEmail:'rosemw2@miamioh.edu',prior:0});
  save(bankingWorkspace,true);
}
UI.role='org';UI.appId=bankingWorkspace.id;UI.stage=1;
// Clean already-saved drafts too, so refreshing removes previous phantom events.
if(bankingWorkspace.status==='draft'&&bankingWorkspace.lines.length){
  prepareCompliantDraft(bankingWorkspace);save(bankingWorkspace,true);
}
UI.showAgent=bankingWorkspace.status==='draft';
lsSet('fp.role',UI.role);lsSet('fp.app',UI.appId);lsSet('fp.stage',UI.stage);
render();
