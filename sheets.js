// Each website user authorizes their own Google account. Tokens stay in memory.
// Native copies are editable in that account; no anonymous/public sharing is enabled.
const GOOGLE_REVIEW={config:null,ready:false,client:null,token:'',expires:0,templateId:'',busy:false,error:'',phase:''};
NAV.treasurer.push(['sheetReview','Exec-team sheet review']);
const editableSheetProposal=()=>{const p=proposalFor(S.orgId);return S.role==='treasurer'&&p&&['draft','returned'].includes(p.status)?p:null;};
function reviewSnapshot(p){return ProposalSheetModel.snapshot(p,ORG());}
function scriptOnce(url){return new Promise((resolve,reject)=>{const found=document.querySelector(`script[src="${url}"]`);if(found){if(found.dataset.ready)return resolve();found.addEventListener('load',resolve,{once:true});found.addEventListener('error',()=>reject(Error('Google could not load.')), {once:true});return;}const el=document.createElement('script');el.src=url;el.async=true;el.onload=()=>{el.dataset.ready='true';resolve();};el.onerror=()=>{el.remove();reject(Error('Google could not load. Try again.'));};document.head.append(el);});}
function googleSession(){if(!GOOGLE_REVIEW.token||Date.now()>=GOOGLE_REVIEW.expires){GOOGLE_REVIEW.token='';throw Error('Connect your Google account again before continuing.');}return GOOGLE_REVIEW.token;}
async function googleRequest(url,options={}){
  if(!/^https:\/\/(www\.googleapis\.com\/drive\/v3\/|sheets\.googleapis\.com\/v4\/spreadsheets\/)/.test(url))throw Error('Unsupported Google request.');
  const response=await fetch(url,{...options,headers:{Authorization:'Bearer '+googleSession(),'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(25000)});
  const result=await response.json();if(!response.ok)throw Error(response.status===401?'Google session expired. Connect again.':response.status===403?'Google did not grant access. Choose the template again with the correct account.':'Google could not finish this step. No submission was made.');return result;
}
async function readGoogleProposal(id){return googleRequest(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}?includeGridData=true&ranges=${encodeURIComponent("'Club Funding Proposal'!A1:AL161")}&fields=spreadsheetId,spreadsheetUrl,sheets(properties,data(startRow,startColumn,rowData(values(userEnteredValue,effectiveValue,dataValidation))))`);}
function googleGrid(book){const sheet=book.sheets?.find(s=>s.properties.title==='Club Funding Proposal');if(!sheet||sheet.properties.gridProperties.rowCount<161||sheet.properties.gridProperties.columnCount<38)throw Error('Choose the Club Funding Proposal template matching the supplied example.');const rows=[];for(const block of sheet.data||[])(block.rowData||[]).forEach((r,i)=>{const at=(block.startRow||0)+i;rows[at]=rows[at]||[];(r.values||[]).forEach((c,j)=>{const v=c.effectiveValue||c.userEnteredValue||{};rows[at][(block.startColumn||0)+j]=v.stringValue??v.numberValue??v.boolValue??'';});});if(!/Step 1/i.test(String(rows[5]?.[3]))||!/^Budget Item/.test(String(rows[53]?.[8]))||String(rows[53]?.[16])!=='Amount'||String(rows[94]?.[11])!=='Amount')throw Error('The template layout has changed. Nothing will be overwritten.');return {sheet,rows};}
A.prepareGoogleReview=async()=>{
 if(GOOGLE_REVIEW.busy)return;GOOGLE_REVIEW.busy=true;GOOGLE_REVIEW.error='';render();
 try{const r=await fetch('/api/google-config');if(!r.ok)throw Error('Google connection is not configured.');const c=await r.json();GOOGLE_REVIEW.config=c;if(!c.configured)return;
  await Promise.all([scriptOnce('https://accounts.google.com/gsi/client'),scriptOnce('https://apis.google.com/js/api.js')]);
  await new Promise((resolve,reject)=>gapi.load('picker',{callback:resolve,onerror:()=>reject(Error('Google file picker could not load.')),timeout:15000,ontimeout:()=>reject(Error('Google file picker timed out.'))}));
  GOOGLE_REVIEW.client=google.accounts.oauth2.initTokenClient({client_id:c.clientId,scope:'https://www.googleapis.com/auth/drive.file',callback:r=>{if(r.error){GOOGLE_REVIEW.error='Google access was not granted.';}else{GOOGLE_REVIEW.token=r.access_token;GOOGLE_REVIEW.expires=Date.now()+(+r.expires_in||3000)*1000;GOOGLE_REVIEW.templateId='';GOOGLE_REVIEW.error='';}render();},error_callback:()=>{GOOGLE_REVIEW.error='Google sign-in was closed. Your draft is unchanged.';render();}});GOOGLE_REVIEW.ready=true;
 }catch(e){GOOGLE_REVIEW.error=e.message;}finally{GOOGLE_REVIEW.busy=false;render();}
};
A.connectGoogleReview=()=>{if(GOOGLE_REVIEW.client)GOOGLE_REVIEW.client.requestAccessToken({prompt:'select_account'});};
A.chooseGoogleTemplate=()=>{
 try{const token=googleSession(),c=GOOGLE_REVIEW.config;new google.picker.PickerBuilder().setDeveloperKey(c.pickerKey).setAppId(c.appId).setOAuthToken(token).setOrigin(location.origin).addView(new google.picker.DocsView(google.picker.ViewId.SPREADSHEETS)).setTitle('Choose your proposal template or example').setCallback(data=>{if(data.action===google.picker.Action.PICKED){GOOGLE_REVIEW.templateId=data.docs[0].id;GOOGLE_REVIEW.error='';render();}}).build().setVisible(true);}catch(e){GOOGLE_REVIEW.error=e.message;render();}
};
A.createGoogleReviewCopy=async()=>{
 const p=editableSheetProposal();if(!p||GOOGLE_REVIEW.busy)return;GOOGLE_REVIEW.busy=true;GOOGLE_REVIEW.error='';const state=S,org=JSON.parse(JSON.stringify(ORG())),orgId=S.orgId,snapshot=reviewSnapshot(p);let copy;
 const unchanged=()=>{if(S!==state||S.role!=='treasurer'||S.orgId!==orgId||reviewSnapshot(p)!==snapshot)throw Error('The draft or workspace changed. Return to it before creating a review copy.');};
 try{
  const cells=ProposalSheetModel.inputs(p,ORG(),S.settings);googleSession();if(!GOOGLE_REVIEW.templateId)throw Error('Choose your proposal template first.');
  const source=await readGoogleProposal(GOOGLE_REVIEW.templateId);googleGrid(source);
  const root=await googleRequest('https://www.googleapis.com/drive/v3/files/root?fields=id');
  unchanged();
  copy=await googleRequest(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(GOOGLE_REVIEW.templateId)}/copy?fields=id,webViewLink,capabilities(canEdit)&ignoreDefaultVisibility=true&copyComments=false`,{method:'POST',body:JSON.stringify({name:`${org.name} Funding proposal ${new Date().toISOString().slice(0,10)} · Draft ${p.id}`,parents:[root.id]})});
  if(copy.id===source.spreadsheetId||!copy.id)throw Error('Google did not create a separate copy.');
  // Save an honest recovery link before filling. Retry creates a separate copy.
  p.sheetRef={id:copy.id,url:copy.webViewLink||'',status:'incomplete',createdAt:new Date().toISOString(),tierMax:S.settings.tierMax[org.tier]};save();
  const dest=await readGoogleProposal(copy.id),grid=googleGrid(dest);
  unchanged();
  await googleRequest(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(copy.id)}:batchUpdate`,{method:'POST',body:JSON.stringify({requests:ProposalSheetModel.requests(cells,grid.sheet.properties.sheetId)})});
  const verified=await readGoogleProposal(copy.id),filled=googleGrid(verified).rows;
  if(!cells.every(c=>String(filled[c.row]?.[c.col]??'')===String(c.value)))throw Error('The copy could not be verified. Open it to check the draft; do not submit yet.');
  if(!copy.capabilities?.canEdit)throw Error('Google did not verify edit access for this account.');
  if(S.orgId!==orgId||reviewSnapshot(p)!==snapshot)throw Error('The draft changed while the copy was being prepared. Create a fresh copy for the latest draft.');
  p.sheetRef={...p.sheetRef,url:verified.spreadsheetUrl,status:'ready',snapshot};p.execReview=null;save();GOOGLE_REVIEW.phase='created';
 }catch(e){GOOGLE_REVIEW.error=e.message+(copy?.id?' A draft copy exists; the original template is unchanged.':'');}finally{GOOGLE_REVIEW.busy=false;render();}
};
A.readGoogleReviewEdits=async()=>{
 const p=editableSheetProposal();if(!p?.sheetRef?.id||GOOGLE_REVIEW.busy)return;GOOGLE_REVIEW.busy=true;GOOGLE_REVIEW.error='';const before=reviewSnapshot(p),orgId=S.orgId;
 try{const book=await readGoogleProposal(p.sheetRef.id),rows=googleGrid(book).rows;const parsed=ProposalSheetModel.parse(rows,p,ORG());if(S.orgId!==orgId||reviewSnapshot(p)!==before)throw Error('Your local draft changed. Review it before importing the sheet edits.');Object.assign(p,parsed.proposal);Object.assign(ORG(),parsed.org);p.sheetRef.snapshot=reviewSnapshot(p);p.sheetRef.readAt=new Date().toISOString();p.execReview=null;save();GOOGLE_REVIEW.phase='read';}
 catch(e){GOOGLE_REVIEW.error=e.message;}finally{GOOGLE_REVIEW.busy=false;render();}
};
A.confirmExecReview=(d,el)=>{const p=editableSheetProposal();if(!p)return;p.execReview=el.checked?{snapshot:reviewSnapshot(p),mode:p.sheetRef?.readAt?'google':'local-demo',at:new Date().toISOString()}:null;save();render();};
VIEWS.sheetReview=()=>{
 const p=proposalFor(S.orgId);if(!p||!['draft','returned'].includes(p.status))return journeyHeading(2,'Your review sheet')+`<section class="journey-panel"><p>Open an editable proposal first.</p>${journeyGo('Back to proposal','proposal')}</section>`;
 const g=GOOGLE_REVIEW,ref=p.sheetRef,same=ref?.snapshot===reviewSnapshot(p),reviewed=p.execReview?.snapshot===reviewSnapshot(p),local=g.config?.configured===false,canConfirm=local||(ref?.status==='ready'&&same&&ref.readAt);
 let next=g.busy?'<p role="status">Preparing your Google review step…</p>':!g.ready?journeyButton(g.config&&!g.config.configured?'Check Google connection again':'Set up your review sheet','prepareGoogleReview'):!g.token||Date.now()>=g.expires?journeyButton('Connect your Google account','connectGoogleReview'):!g.templateId?journeyButton('Choose your proposal template','chooseGoogleTemplate'):journeyButton(ref?'Create a new filled copy':'Create editable review copy','createGoogleReviewCopy');
 return journeyHeading(2,'Let your exec team review the sheet','Each draft gets a new copy. Your original template stays unchanged.')+`<section class="journey-panel"><h2>${ref?.status==='ready'&&same?'Your editable copy is ready':'Review before you submit'}</h2><p>The person using FundPath connects their own Google account and receives an editable copy there. Open Google Sheets to edit it or share it with your exec team.</p>${next}${local?'<p class="banner">Google sign-in is not configured on this website yet. No live Google Sheet has been created. You can review the local demo sheet below.</p>':''}${ref?.url&&/^https:\/\/docs\.google\.com\/spreadsheets\//.test(ref.url)?`<p><a class="btn ghost" href="${esc(ref.url)}" target="_blank" rel="noopener">Open your editable copy</a></p>${ref.status==='ready'?journeyButton('Read back the team’s edits','readGoogleReviewEdits','',true):'<p role="alert">This copy is incomplete or unverified. Create a fresh copy before continuing.</p>'}${!same?'<p role="alert">Your draft changed. Create a fresh copy so the sheet matches it.</p>':''}`:''}${g.error?`<p role="alert">${esc(g.error)}</p>`:''}<details ${local?'open':''}><summary>Review this local draft or download it</summary>${journeyButton('Download editable Excel draft','exportProposalXlsx','',true)}${sheetPreview(p,ORG())}</details>${canConfirm?`<label class="check"><input type="checkbox" data-a="confirmExecReview" ${reviewed?'checked':''}> ${local?'The exec team reviewed this local demo draft. No shared Google Sheet is connected.':'The exec team reviewed the sheet and I have read back their latest edits.'}</label>`:''}${journeyFooter('proposal',journeyButton('Submit reviewed demo proposal','submitReviewedProposal',reviewed?'':'disabled'))}<p class="small muted">This records your confirmation in the demo. No Google Form, ownership transfer or institutional submission happens here.</p></section>`;
};
const submitBeforeSheetReview=A.submitProposal;
A.submitProposal=()=>{const p=editableSheetProposal();if(!p||p.execReview?.snapshot!==reviewSnapshot(p))return toast('Review the editable draft with your exec team before submitting.','bad');submitBeforeSheetReview();};
A.journeySubmit=()=>A.go({id:'sheetReview'});
A.submitReviewedProposal=async()=>{
 const p=editableSheetProposal();if(!p||GOOGLE_REVIEW.busy)return;
 if(p.execReview?.mode==='google'){
  GOOGLE_REVIEW.busy=true;GOOGLE_REVIEW.error='';render();
  try{const book=await readGoogleProposal(p.sheetRef.id),parsed=ProposalSheetModel.parse(googleGrid(book).rows,p,ORG());if(ProposalSheetModel.snapshot(parsed.proposal,parsed.org)!==reviewSnapshot(p)){Object.assign(p,parsed.proposal);Object.assign(ORG(),parsed.org);p.sheetRef.snapshot=reviewSnapshot(p);p.execReview=null;save();throw Error('The Google Sheet changed after confirmation. Review the new values and confirm again.');}}
  catch(e){GOOGLE_REVIEW.error=e.message;GOOGLE_REVIEW.busy=false;render();return;}
  GOOGLE_REVIEW.busy=false;
 }
 A.submitProposal();if(!['draft','returned'].includes(p.status))A.go({id:'decision'});
};
// Spoken agreement reaches the editable review step, never skips exec review.
A.meetYes=async()=>{if(S.role==='treasurer'&&M().stage==='confirm'){A.meetEdit();A.go({id:'sheetReview'});}};
window.addEventListener('pagehide',()=>{GOOGLE_REVIEW.token='';});
