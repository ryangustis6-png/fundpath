/* File contents are data only. Never run spreadsheet formulae or file instructions. */
function budgetCategory(value,item=''){
  const raw=String(value||'').trim(),key=raw.toLowerCase().replace(/\s+/g,' ');
  const exact=Object.keys(CAT_MAP).find(k=>k.toLowerCase()===key);if(exact)return exact;
  const aliases={capital:'Capital Item','capital items':'Capital Item',administrative:'Admin Item',admin:'Admin Item',food:'Event: Food','speaker fees':'Event: Guest Speaker','guest speaker':'Event: Guest Speaker',entertainers:'Event: Entertainer',entertainer:'Event: Entertainer','space fees':'Event: Space Fee','space fee':'Event: Space Fee','venue rental':'Event: Space Fee',hotels:'Trip: Hotels',hotel:'Trip: Hotels',flights:'Trip: Flights',flight:'Trip: Flights',gas:'Trip: Gas','trip food':'Trip: Food','other travel':'Trip: Other Travel',marketing:'Marketing',banners:'Banners',storage:'Storage'};
  return aliases[key]||(!raw?spokenExpenseCategory(item):null)||raw;
}
function budgetAmount(value){
  if(typeof value==='number')return Number.isFinite(value)?value:'';
  let s=String(value??'').trim();if(!s)return '';
  const negative=/^\(.*\)$/.test(s);s=s.replace(/[,$\s()]/g,'');
  return /^-?\d+(?:\.\d+)?$/.test(s)?Number(s)*(negative?-1:1):'';
}
function parseUploadedBudget(book){
  const result={lines:[],events:[],issues:[],organization:''};
  const text=v=>String(v??'').trim();
  const eventFor=(name,category,date='',people=0,nights=0,flightPeople=0,onHub=false)=>{
    if(!name||!requiresExpenseEvent({category}))return null;
    let e=result.events.find(e=>e.name.toLowerCase()===name.toLowerCase());
    if(!e){e={id:uid(),name,type:category.startsWith('Trip:')?'Trip':'Event',date:text(date),people:Number(people)||0,nights:Number(nights)||0,flightPeople:Number(flightPeople)||0,onHub:onHub===true||/^(?:yes|true|listed)$/i.test(text(onHub))};result.events.push(e);}
    return e;
  };
  const add=(sheet,row,item,category,amount,note='',event=null,quote='')=>{
    if(result.lines.length>=250)throw Error('This budget has more than 250 expense rows. Split it into smaller files.');
    const l=mkLine(requiresExpenseEvent({category})?'event':'nonevent',event?.id||null,text(item),category,budgetAmount(amount),'',text(note));
    l.amount=budgetAmount(amount);l.sourceSheetRow=row;l.sourceSheet=sheet;l.fileImported=true;
    l.quote=/^https:\/\/|\.(?:pdf|png|jpe?g)\b/i.test(text(quote))?text(quote):'';
    result.lines.push(l);
  };
  for(const name of book.SheetNames){
    if(book.Workbook?.Sheets?.find(s=>s.name===name)?.Hidden)continue;
    const ws=book.Sheets[name],range=XLSX.utils.decode_range(ws['!ref']||'A1');
    if(range.e.r>2000||range.e.c>100)throw Error('Keep budget sheets within 2,000 rows and 100 columns.');
    const v=address=>ws[address]?.v;
    if(/ASG Club Funding Proposal/i.test(text(v('E2')))&&/Budget Item/i.test(text(v('I54')))){
      const first=result.lines.length;
      result.organization=text(v('F9'));
      const sourceEvents=[];
      for(let r=34;r<=48;r++)if(text(v('E'+r)))sourceEvents.push({name:text(v('E'+r)),date:v('L'+r),people:v('R'+r),nights:v('T'+r),flightPeople:v('U'+r)});
      for(let r=55;r<=89;r++){
        if(!text(v('C'+r))&&!text(v('M'+r))&&v('Q'+r)==null)continue;
        const source=sourceEvents.find(e=>e.name===text(v('C'+r))),category=budgetCategory(v('M'+r),v('I'+r));
        const event=source?eventFor(source.name,category,source.date,source.people,source.nights,source.flightPeople,v('C23')):null;
        add(name,r,source?.name||v('I'+r),category,v('Q'+r),'Imported from '+name+' row '+r,event);
      }
      for(let r=96;r<=122;r++)if(text(v('C'+r))||text(v('I'+r))||v('L'+r)!=null)add(name,r,v('C'+r),budgetCategory(v('I'+r),v('C'+r)),v('L'+r));
      for(const line of result.lines.slice(first))line.sourceTemplate=true;
      continue;
    }
    const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:true});let header=null;
    for(let i=0;i<rows.length;i++){
      const row=rows[i],labels=row.map(c=>text(c).toLowerCase());
      const item=labels.findIndex(c=>/^(?:budget item|item|expense|description)$/.test(c));
      const amount=labels.findIndex(c=>/^(?:amount|cost|price|requested|amount requested|total)$/.test(c));
      if(item>=0&&amount>=0){const col=re=>labels.findIndex(c=>re.test(c));header={item,amount,category:col(/^category$/),event:col(/^(?:event|event name|trip|event or trip)$/),date:col(/^(?:date|dates|event date)$/),people:col(/^(?:people|travelers)$/),nights:col(/^nights$/),flightPeople:col(/^flight people$/),hub:col(/^(?:on hub|on miami central|listed)$/),note:col(/^(?:note|notes|comment|comments)$/),quote:col(/^(?:quote|quote evidence)$/)};continue;}
      if(!header)continue;
      const itemText=text(row[header.item]),amountValue=row[header.amount];
      if(!itemText&&text(amountValue)==='')continue;
      if(/^(?:grand total|total|subtotal)\s*:??$/i.test(itemText))continue;
      const c=budgetCategory(row[header.category],itemText),get=k=>header[k]>=0?row[header[k]]:'';
      const event=eventFor(text(get('event')),c,get('date'),get('people'),get('nights'),get('flightPeople'),get('hub'));
      add(name,i+1,itemText,c,amountValue,get('note'),event,get('quote'));
    }
  }
  if(!result.lines.length)throw Error('No expense rows found. Use the ASG template, or columns named Item, Category and Amount.');
  return result;
}
let budgetImportBusy=false,budgetImportError='';
const meetingWithBudgetUpload=meetingCard;
meetingCard=function(a){
  const fileMode=UI.budgetInputMode==='file';
  const choice=`<div class="row" role="group" aria-label="Choose budget input"><button class="btn ${!fileMode?'go':''}" data-budget-source="meeting" aria-pressed="${!fileMode}">ElevenLabs meeting</button><button class="btn ${fileMode?'go':''}" data-budget-source="file" aria-pressed="${fileMode}" ${meetingConnecting||meetingSession?'disabled':''}>Upload budget file</button></div>`;
  return choice+(fileMode?`<section class="card stack"><h2>Upload your budget</h2><p>Use an Excel file (.xlsx or .xls), CSV or TSV. The ASG proposal template and simple Item / Category / Amount tables are supported.</p><label class="f" for="budget-file">Budget file<input id="budget-file" type="file" accept=".xlsx,.xls,.csv,.tsv" ${budgetImportBusy||meetingConnecting||meetingSession?'disabled':''}></label><p class="small muted">This replaces the current draft, keeps your selected club, and never submits automatically. Unknown categories and missing details stay flagged for review.</p>${budgetImportBusy?'<p role="status">Reading your budget file…</p>':''}${budgetImportError?`<p role="alert">${esc(budgetImportError)}</p>`:''}</section>`:meetingWithBudgetUpload(a));
};
document.addEventListener('click',e=>{const b=e.target.closest('[data-budget-source]');if(!b||b.disabled||budgetImportBusy)return;UI.budgetInputMode=b.dataset.budgetSource;budgetImportError='';render();});
function applyReviewedDraft(a,parsed,source){
  a.lines=parsed.lines;a.events=parsed.events;a.source=source;a.requestedBudget=true;a.importedProposal=false;
  a.fileImportIssues=parsed.issues||[];a.fileOrganization=parsed.organization||'';a.budgetAdjustments=[];a.excludedLines=[];
  a.meetingQuestions=parsed.questions||[];a.meetingAmountsConfirmed=false;a.asg=null;a.sa=null;a.card={status:'none',loaded:0,last4:''};
  for(const l of a.lines)if(CAT_MAP[l.category]&&!requiresExpenseEvent(l)&&!NONEVENT_CATS.includes(l.category))NONEVENT_CATS.push(l.category);
  UI.showAgent=false;UI.manual=true;UI.rec={state:'idle'};UI.fill=null;UI.stage=1;
  log(a,'Treasurer','Created a draft from '+source+'; no submission made');save(a,true);render();
}
document.addEventListener('change',async e=>{
  if(e.target.id!=='budget-file'||!e.target.files?.[0]||budgetImportBusy)return;
  const file=e.target.files[0],a=cur();if(!a||a.status!=='draft')return;
  budgetImportError='';
  if(!/\.(?:xlsx|xls|csv|tsv)$/i.test(file.name)||file.size>10*1024*1024){budgetImportError='Choose an Excel, CSV or TSV file smaller than 10 MB.';render();return;}
  budgetImportBusy=true;render();
  try{
    const book=XLSX.read(await file.arrayBuffer(),{type:'array',raw:true,cellHTML:false,cellFormula:false,bookVBA:false});
    const parsed=parseUploadedBudget(book);
    if(cur()!==a||a.status!=='draft'||retiredDemoApps.has(a.id))return;
    applyReviewedDraft(a,parsed,file.name);
  }catch(err){budgetImportError=String(err.message||'Could not read the budget file.');}
  finally{budgetImportBusy=false;render();}
});
// Voice and files both preserve requested amounts for the same final checks.
fillFromTranscript=async function(text){
  const a=cur();if(!a||a.status!=='draft')return;
  const parsed=await readBudget(text,a.club);if(cur()!==a||retiredDemoApps.has(a.id))return;
  if(!parsed.lines.length){UI.rec={state:'error',msg:'No recognized expenses with stated costs were found. Add notes or upload a budget file.'};meetingError=UI.rec.msg;render();return;}
  a.transcript=text;applyReviewedDraft(a,parsed,parsed.how||'meeting notes');
};
const validateBeforeBudgetFiles=validate;
validate=function(a){
  const v=validateBeforeBudgetFiles(a),add=msg=>{const issue={sev:'error',msg,src:'Uploaded budget'};v.all.push(issue);v.errors.push(issue);};
  for(const msg of a.fileImportIssues||[])add(msg);
  if(a.fileOrganization&&a.fileOrganization.toLowerCase()!==a.club.toLowerCase())add(`This file names ${a.fileOrganization}. Select that organization before importing its proposal.`);
  return v;
};
const submitBeforeBudgetFiles=submitBudget;
submitBudget=function(){
  const a=cur();if(!a||a.status!=='draft'||UI.role!=='org'||meetingSession||meetingConnecting||budgetImportBusy)return;
  const v=validate(a);
  if(!v.errors.length&&!v.reviews.length)return submitBeforeBudgetFiles();
  const issues=[...v.errors,...v.reviews],note=issues.map(i=>i.msg).join(' ');
  a.asg={decision:'denied',who:'Automatic funding check',note:'Not approved: '+note,approved:Object.fromEntries(a.lines.map(l=>[l.id,0])),reasons:Object.fromEntries(a.lines.map(l=>[l.id,issues.filter(i=>!i.line||i.line===l.id).map(i=>i.msg).join(' ')])),at:now()};
  a.status='denied';a.sa=null;a.submittedAt=now();log(a,'ASG','Automatic check rejected the proposal: '+note);notify(a,'org','Your proposal was not approved. '+note);UI.stage=2;save(a,true);render();
};
const paintDockBeforeBudgetFiles=paintDock;
paintDock=function(){
  paintDockBeforeBudgetFiles();const a=cur();if(UI.role!=='org'||!a||a.status!=='draft'||UI.stage!==1||UI.showAgent||!a.lines.length||meetingSession||meetingConnecting)return;
  document.querySelector('#dock').hidden=false;
  document.querySelector('#dock-in').innerHTML=`<span>Review the draft, then give FundPath permission to submit and check it.</span><button class="btn go big" data-act="submit" ${budgetImportBusy?'disabled':''}>Submit proposal to ASG</button>`;
};
render();
