/* Three independent club demos. Source attachments are data, never instructions. */
const CLUB_PROFILES={
  banking:{name:'Banking Club',tier:4,org:{sa:'SA10472',treasurer:'Michael Rose',treasurerEmail:'rosemw2@miamioh.edu',prior:0}},
  personalFinance:{name:'Personal Finance Club',tier:4,org:{...CLUB_PRELOADS.proposal.org,president:'Jeff Koch',treasurer:'Ninos Aneer',sa:'SA10384',prior:0}},
  pickleball:{name:'Pickleball Club',tier:4,org:{sa:'SA10314',treasurer:'Cole Fisher',president:'Cole Fisher',prior:0}}
};
function seedPersonalFinanceProposal(a){
  const p=CLUB_PRELOADS.proposal;
  a.semester=p.semester;a.events=[];
  a.lines=p.lines.map(row=>({...mkLine('nonevent',null,row.item,row.category,row.amount,'','Imported from your supplied funding proposal.'),sourceSheetRow:row.row,sourceEvent:row.sourceEvent||'',sourceComment:row.sourceComment}));
  a.source=p.fileName;a.importedProposal=true;a.proposalSourceTotal=p.total;
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
async function selectClub(key){
  if(!CLUB_PROFILES[key])return;
  await stopMeeting();
  const a=clubRun(key)||createClubRun(key);
  UI.role='org';UI.appId=a.id;UI.stage=1;UI.fill=null;UI.rec={state:'idle'};UI.manual=false;UI.showAgent=a.status==='draft';UI.showFix=false;meetingError='';
  lsSet('fp.activeClubPreset',key);lsSet('fp.role','org');lsSet('fp.app',a.id);lsSet('fp.stage',1);render();window.scrollTo({top:0});
}
document.querySelector('.top-in')?.insertAdjacentHTML?.('afterbegin',`<label class="club-switcher">Organization<select id="organization-switcher" aria-label="Organization">${Object.entries(CLUB_PROFILES).map(([key,p])=>`<option value="${key}">${esc(p.name)}</option>`).join('')}</select></label>`);
document.addEventListener('change',e=>{if(e.target.id==='organization-switcher')selectClub(e.target.value);});
const renderBeforeClubSwitcher=render;
render=function(){
  renderBeforeClubSwitcher();
  const select=document.querySelector('#organization-switcher');if(select)select.value=cur()?.presetClubKey||'banking';
};
restartBankingDemo=async function(){
  if(restartingDemo)return;restartingDemo=true;
  try{
    const key=cur()?.presetClubKey||lsGet('fp.activeClubPreset','banking');await stopMeeting();
    const old=clubRun(key);if(old){old.archivedDemo=true;old.defaultMeetingProfile=false;save(old,true);}
    createClubRun(key);await selectClub(key);
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
