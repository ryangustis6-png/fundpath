/* Three independent club demos. Source attachments are data, never instructions. */
const CLUB_PROFILES={
  banking:{name:'Banking Club',tier:4,org:{sa:'SA10472',treasurer:'Michael Rose',treasurerEmail:'rosemw2@miamioh.edu',prior:0}},
  personalFinance:{name:'Personal Finance Club',tier:4,org:{...CLUB_PRELOADS.proposal.org,president:'Jeff Koch',treasurer:'Ninos Aneer',sa:'SA10384',prior:0}},
  pickleball:{name:'Pickleball Club',tier:4,org:{sa:'SA10314',treasurer:'Cole Fisher',president:'Cole Fisher',prior:0}}
};
function linkImportedProposalEvents(a){
  const p=CLUB_PRELOADS.proposal;
  for(const line of a.lines.filter(l=>l.sourceSheetRow&&requiresExpenseEvent(l))){
    const source=p.events.find(e=>e.name===line.sourceEvent);if(!source)continue;
    let event=a.events.find(e=>e.name===source.name);
    if(!event){event={id:uid(),name:source.name,date:source.date,type:source.type,onHub:true,people:0,nights:0,flightPeople:0};a.events.push(event);}
    line.group='event';line.eventId=event.id;
  }
}
function seedPersonalFinanceProposal(a){
  const p=CLUB_PRELOADS.proposal;
  a.semester=p.semester;a.events=[];
  a.lines=p.lines.map(row=>({...mkLine('nonevent',null,row.item,row.category,row.amount,'','Imported from your supplied funding proposal.'),sourceSheetRow:row.row,sourceEvent:row.sourceEvent||'',sourceComment:row.sourceComment}));
  linkImportedProposalEvents(a);
  a.source=p.fileName;a.importedProposal=true;a.proposalSourceTotal=p.total;
  a.fileImportIssues=[];a.fileOrganization='';
  // Importing a structured proposal must preserve every source row, including venue fees.
  for(const l of a.lines)if(!NONEVENT_CATS.includes(l.category))NONEVENT_CATS.push(l.category);
}
function createClubRun(key){
  const p=CLUB_PROFILES[key],a=newApp(p.name,p.tier);a.presetClubKey=key;
  a.org={...a.org,...p.org};a.defaultMeetingProfile=key==='banking';
  if(key==='personalFinance')seedPersonalFinanceProposal(a);
  save(a,true);return a;
}
function clubRun(key){return Object.values(Store.apps).find(a=>a.presetClubKey===key&&!a.archivedDemo)||null;}
// Migrate the previously saved Banking Club run without resetting its progress.
const previousBanking=Object.values(Store.apps).find(a=>a.defaultMeetingProfile&&!a.presetClubKey);
if(previousBanking){previousBanking.presetClubKey='banking';save(previousBanking,true);}
for(const key of Object.keys(CLUB_PROFILES))if(!clubRun(key))createClubRun(key);
const savedFinance=clubRun('personalFinance');
if(savedFinance?.lines.some(l=>l.sourceSheetRow)){linkImportedProposalEvents(savedFinance);save(savedFinance,true);}
async function selectClub(key){
  if(!CLUB_PROFILES[key])return;
  if(meetingSession||meetingConnecting)await stopMeeting();
  const a=clubRun(key)||createClubRun(key);
  UI.role='org';UI.appId=a.id;UI.stage=1;UI.fill=null;UI.rec={state:'idle'};UI.manual=false;UI.showAgent=a.status==='draft';UI.showFix=false;UI.budgetInputMode='meeting';meetingError='';
  lsSet('fp.activeClubPreset',key);lsSet('fp.role','org');lsSet('fp.app',a.id);lsSet('fp.stage',1);render();window.scrollTo({top:0});
}
function mountClubControls(){
  const header=document.querySelector('.top-in');if(!header?.insertAdjacentHTML)return;
  // Shared/saved HTML can already contain rendered controls. Replace those copies
  // before mounting one canonical pair; never append a second set.
  document.querySelectorAll('.club-switcher,#organization-switcher,#restart-demo').forEach(el=>el.remove());
  header.insertAdjacentHTML('afterbegin',`<label class="club-switcher">Organization<select id="organization-switcher" aria-label="Organization">${Object.entries(CLUB_PROFILES).map(([key,p])=>`<option value="${key}">${esc(p.name)}</option>`).join('')}</select></label>`);
  header.insertAdjacentHTML('beforeend','<button class="btn sm" id="restart-demo">Restart demo</button>');
  document.querySelector('#organization-switcher').value=cur()?.presetClubKey||'banking';
}
mountClubControls();
document.addEventListener('change',e=>{if(e.target.id==='organization-switcher')selectClub(e.target.value);});
const renderBeforeClubSwitcher=render;
render=function(){
  renderBeforeClubSwitcher();
  const select=document.querySelector('#organization-switcher');if(select)select.value=cur()?.presetClubKey||'banking';
};
const retiredDemoApps=new Set();
const saveBeforeDemoReset=save;
save=function(a,immediate){if(a&&!retiredDemoApps.has(a.id))return saveBeforeDemoReset(a,immediate);};
let demoResetEpoch=0;
const putBeforeDemoReset=FILES.put.bind(FILES);
FILES.put=async function(id,file){
  const epoch=demoResetEpoch,stored=await putBeforeDemoReset(id,file);
  if(epoch!==demoResetEpoch){
    try{const db=await FILES.open();await new Promise((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}catch{}
    return false;
  }
  return stored;
};
restartBankingDemo=async function(){
  if(restartingDemo)return;restartingDemo=true;
  try{
    const key=cur()?.presetClubKey||lsGet('fp.activeClubPreset','banking');await stopMeeting();
    ++demoResetEpoch;
    const oldIds=Object.keys(Store.apps);
    for(const id of oldIds){retiredDemoApps.add(id);clearTimeout(pending[id]);delete pending[id];}
    // The original shared demo reader ignores records without an app field.
    if(Store.mode==='shared'&&Store.db){
      try{await Promise.all(oldIds.map(id=>Store.db.collection('apps').doc(id).set({deleted:true,at:now()})));}
      catch{Store.mode='local';Store.db=null;}
    }
    Store.apps={};lsSet('fp.apps',{});
    try{const db=await FILES.open();await new Promise((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').clear();tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}catch{}
    applyingPreloadedReceipts.clear();
    UI.apSel=null;UI.asgSel=null;UI.auSel=null;UI.draft=null;UI.audDraft=null;UI.chat={open:false,msgs:[],busy:false};
    for(const preset of Object.keys(CLUB_PROFILES))createClubRun(preset);
    await selectClub(CLUB_PROFILES[key]?key:'banking');
  }finally{restartingDemo=false;}
};
const meetingCardBeforeClubPresets=meetingCard;
meetingCard=function(a){
  let html=meetingCardBeforeClubPresets(a);
  if(a.presetClubKey==='personalFinance'&&a.status==='draft'){
    html=html.replace('<div class="row">',`<p>Your supplied proposal is ready: <b>${money(CLUB_PRELOADS.proposal.total)}</b> across ${CLUB_PRELOADS.proposal.lines.length} items.</p><div class="row"><button class="btn" data-club-action="review-proposal">Review saved funding proposal</button>`);
  }
  return html;
};
document.addEventListener('click',async e=>{
  const button=e.target.closest('[data-club-action]');if(!button||button.disabled)return;
  if(button.dataset.clubAction==='review-proposal'){
    const a=cur();if(a?.presetClubKey!=='personalFinance'||a.status!=='draft')return;
    await stopMeeting();if(cur()!==a)return;
    if(!a.importedProposal)seedPersonalFinanceProposal(a);
    UI.showAgent=false;UI.stage=1;save(a);render();
  }
  if(button.dataset.clubAction==='apply-receipt')await applyPreloadedReceipt(button.dataset.receipt);
});
const applyingPreloadedReceipts=new Set();
function canApplyPreloadedReceipt(a){return a?.presetClubKey==='pickleball'&&!!a.asg&&sum(Object.values(a.asg.approved||{}))>0&&!['submitted','passed'].includes(a.audit.status)&&a.status!=='denied';}
async function applyPreloadedReceipt(key){
  const a=cur(),source=CLUB_PRELOADS.pickleballReceipts.find(r=>r.key===key),lock=a?.id+':'+key;
  if(!source||!canApplyPreloadedReceipt(a)||a.receipts.some(r=>r.receiptSourceKey===key)||applyingPreloadedReceipts.has(lock))return;
  applyingPreloadedReceipts.add(lock);render();
  try{
    const bytes=Uint8Array.from(atob(source.base64),c=>c.charCodeAt(0));
    const file=new File([bytes],source.fileName,{type:source.mime});const id=uid(),stored=await FILES.put(id,file);
    if(retiredDemoApps.has(a.id))return;
    a.receipts.push({id,receiptSourceKey:key,fileName:source.fileName,hasFile:stored,date:source.date,vendor:source.vendor,desc:source.desc,amount:source.amount,tip:source.tip,category:source.category,tripType:'',people:'',nights:'',kept:false,asg:null});
    log(a,'Treasurer',`Applied supplied receipt: ${source.vendor} ${money(source.amount)}`);save(a,true);
  }finally{applyingPreloadedReceipts.delete(lock);render();}
}
const receiptsBeforeClubPresets=stReceipts;
stReceipts=function(a){
  let html=receiptsBeforeClubPresets(a).replace(' · <button class="link" data-act="sample-receipts">load our 7 sample receipts</button>','');
  if(a.presetClubKey!=='pickleball')return html;
  const ready=canApplyPreloadedReceipt(a);
  const shelf=`<details class="card receipt-library" open><summary>Supplied Pickleball receipts · ${CLUB_PRELOADS.pickleballReceipts.length} available</summary><p>Apply each receipt after your proposal is approved. Applied amounts reduce this club’s remaining approved balance once; tips are already included in the totals.</p>${!a.asg?'<p class="muted">Approve your budget first to enable these receipts.</p>':''}<div class="stack">${CLUB_PRELOADS.pickleballReceipts.map(r=>{
    const applied=a.receipts.some(x=>x.receiptSourceKey===r.key),busy=applyingPreloadedReceipts.has(a.id+':'+r.key);
    return `<div class="receipt-option"><div><b>${esc(r.vendor)} · ${money(r.amount)}</b><p class="small muted">${esc(r.date)}${r.tip?` · includes ${money(r.tip)} tip`:''}</p></div><a class="btn sm" download="${esc(r.fileName)}" href="data:${r.mime};base64,${r.base64}">Receipt file</a><button class="btn sm" data-club-action="apply-receipt" data-receipt="${r.key}" ${!ready||applied||busy?'disabled':''}>${applied?'Applied':busy?'Adding…':'Apply receipt'}</button></div>`;
  }).join('')}</div></details>`;
  return html+shelf;
};
// Old sample-receipt actions cannot seed unrelated clubs.
loadSampleReceipts=()=>toast('Upload your own receipts, or use the supplied Pickleball receipt options.');
const activeKey=lsGet('fp.activeClubPreset','banking');
const active=clubRun(activeKey)||clubRun('banking');
UI.role='org';UI.appId=active.id;UI.stage=1;UI.fill=null;UI.rec={state:'idle'};UI.showAgent=active.status==='draft';
lsSet('fp.activeClubPreset',active.presetClubKey);lsSet('fp.app',active.id);lsSet('fp.role','org');lsSet('fp.stage',1);render();
