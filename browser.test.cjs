const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const root=process.cwd(),server=http.createServer((req,res)=>{
  if(req.url==='/api/connections'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({agentId:'',speechConfigured:false,billingVerified:false,paidServicesEnabled:false}));}
  if(req.url==='/api/google-config'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({configured:false}));}
  if(req.url.startsWith('/api/central')){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({groups:[{name:'Miami University Banking Club',tier:1,mission:'Public mission from Miami Central.',url:'https://miamicentral.miamioh.edu/student_community?club_id=35700'}],checkedAt:new Date().toISOString()}));}
  const name=path.resolve(root,'.'+(req.url==='/'?'/index.html':req.url.split('?')[0]));if(!name.startsWith(root+path.sep))return res.writeHead(403).end();
  fs.readFile(name,(e,b)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.html')?'text/html':'application/octet-stream');res.end(b);});
 });
 await new Promise(r=>server.listen(4173,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:process.env.BROWSER_CHANNEL||'msedge'}:{})});
  const page=await browser.newPage({viewport:{width:1440,height:1000},colorScheme:'dark'}),errors=[],external=[];
  page.on('pageerror',e=>errors.push(e.message));await page.route('https://**',r=>{external.push(r.request().url());return r.abort();});
  await page.goto('http://127.0.0.1:4173');await page.getByRole('heading',{name:'Your next step, made simple'}).waitFor();
  assert.equal(await page.locator('.journey-panel').count(),1);assert.equal(await page.locator('.summary-grid').count(),0);
  assert.equal(await page.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 255)');
  assert.equal(await page.locator('body').evaluate(el=>getComputedStyle(el).fontSize),'18px');
  assert.match(await page.locator('body').evaluate(el=>getComputedStyle(el).fontFamily),/sans-serif/);
  await page.screenshot({path:'journey-desktop.png',fullPage:true});
  const caps=()=>page.locator('#app').evaluate(root=>{const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),out=[];let n;while(n=w.nextNode())if(!n.parentElement.closest('script,style,input,textarea,pre,code,[data-exact-text]'))out.push(...(n.textContent.match(/\b[A-Z]{2,}\b/g)||[]));return out;});
  await page.evaluate(()=>{for(const role of Object.keys(NAV)){S.role=role;for(const [view] of NAV[role]){UI.view=view;UI.saId=null;render();}}S.role='treasurer';UI.view='home';render();});
  for(const route of ['meeting','proposal','decision','authorization','paymentStatus','pickup','receipts']){
   await page.evaluate(v=>A.go({id:v}),route);assert.equal(await page.locator('main h1').count(),1,route);assert.deepEqual(await caps(),[]);
   for(const width of [390,768,1440]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${route} overflow at ${width}`);}
  }
  await page.evaluate(()=>{A.meetReset();A.go({id:'meeting'});});
  await page.getByRole('button',{name:'Use a sample meeting',exact:true}).click();
  assert.ok((await page.getByLabel('Meeting notes').inputValue()).length>100);
  await page.getByText('Voice meeting with ElevenLabs',{exact:true}).click();
  assert.equal(await page.getByLabel('Public agent identifier').inputValue(),'agent_8901m6w3h3tpf5fr9qsgkkwr8gc2');
  await page.evaluate(()=>A.startAgent());assert.equal(await page.evaluate(()=>liveConversation),null);
  await page.getByRole('button',{name:'Continue to build budget',exact:true}).click();
  await page.waitForFunction(()=>M().stage==='question'||M().stage==='confirm');
  assert.equal(await page.locator('.journey-panel').count(),1);assert.equal(await page.evaluate(()=>VOICE.on),false);
  await page.evaluate(()=>{M().stage='confirm';A.meetEdit();UI.proposalPanel=0;render();});
  await page.getByRole('heading',{name:'Check your organization',exact:true}).waitFor();
  for(const title of ['Check events and trips','Check event expenses','Check other expenses','Review and submit']){
   for(let guard=0;guard<30&&!(await page.getByRole('heading',{name:title,exact:true}).count());guard++)await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('heading',{name:title,exact:true}).waitFor();
   assert.equal(await page.locator('main .tbl').count(),0,'Wizard must not show spreadsheet tables');assert.equal(await page.locator('.journey-panel').count(),1);
  }
  assert.equal(await page.getByRole('button',{name:'Submit demo proposal',exact:true}).count(),1);
  await page.getByRole('button',{name:'Back',exact:true}).click();assert.equal(await page.locator('input[data-f$=":item"]').count()<=1,true);
  await page.locator('.toast').evaluateAll(nodes=>nodes.forEach(n=>n.remove()));await page.screenshot({path:'journey-budget.png',fullPage:true});
  for(const role of ['Treasury','Accounts payable','Advisor']){
   await page.getByRole('button',{name:role,exact:true}).click();await page.getByRole('button',{name:'Continue to review queue',exact:true}).click();
   const review=page.getByRole('button',{name:'Review request',exact:true});
   if(await review.count()){await review.first().click();assert.equal(await page.locator('.journey-review>section.card').count(),1);assert.equal(await page.getByRole('button',{name:'Back to queue'}).count(),1);}
  }
  await page.getByRole('button',{name:'Organization',exact:true}).click();await page.evaluate(()=>A.go({id:'connections'}));
  await page.getByRole('button',{name:'Search directory',exact:true}).click();await page.locator('.campus-result').waitFor();assert.equal(await page.evaluate(()=>ORG().tier),4);
  await page.evaluate(()=>A.go({id:'quotes'}));await page.getByText('Find supplier offers online',{exact:true}).click();assert.equal(await page.getByRole('button',{name:'Live research paused'}).isDisabled(),true);
  // Exercise the guided UI through automatic proposal checks, human AP,
  // physical pickup confirmation, charge entry and an actual receipt attachment.
  await page.evaluate(()=>{
   S=seedState();S.mode='demo';S.role='treasurer';S.orgId=S.orgs[0].id;S.proposals=[];S.spend=[];S.txns=[];
   S.settings.window={open:'2000-01-01',close:'2099-12-31'};S.settings.saCutoff='2099-12-31';
   S.proposals.push({id:'P-9000',orgId:S.orgId,semester:S.settings.semester,status:'draft',prior:0,ack:{hub:true,itemized:true,quotes:true,noGuarantee:true},purpose:'Support our student organization educational mission through campus outreach and recruitment.',events:[],lines:[{id:'L-9000',item:'Printed club recruitment banner',cat:'Admin: Banners',amount:150,comment:'Campus outreach for our student educational organization'}],journalPaid:{}});
   UI.proposalPanel=4;A.go({id:'proposal'});
  });
  await page.getByRole('button',{name:'Submit demo proposal',exact:true}).click();await page.getByRole('heading',{name:'Let your exec team review the sheet',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Submit reviewed demo proposal',exact:true}).isDisabled(),true);
  await page.getByRole('button',{name:'Set up your review sheet',exact:true}).click();await page.getByRole('checkbox',{name:'The exec team reviewed this local demo draft. No shared Google Sheet is connected.',exact:true}).check();
  await page.getByRole('button',{name:'Submit reviewed demo proposal',exact:true}).click();await page.getByRole('heading',{name:'Your proposal is approved',exact:true}).waitFor();
  await page.getByRole('button',{name:'Continue to spending request'}).click();await page.getByRole('button',{name:'Continue to payment review'}).click();
  assert.equal(await page.getByRole('heading',{name:'Your request is waiting for review'}).count(),1);assert.equal(await page.getByRole('button',{name:'I picked up my card'}).count(),0);
  await page.getByRole('button',{name:'Accounts payable',exact:true}).click();await page.getByRole('button',{name:'Continue to review queue'}).click();await page.getByRole('button',{name:'Review request',exact:true}).click();await page.getByRole('button',{name:'Human: approve',exact:true}).click();
  assert.equal(await page.evaluate(()=>S.spend[0].humanAPDecision.decision),'approved');
  await page.getByRole('button',{name:'Organization',exact:true}).click();await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('button',{name:'I picked up my card',exact:true}).click();
  await page.getByRole('button',{name:'Record a purchase',exact:true}).click();await page.locator('#txMerch').fill('Demo print supplier');await page.locator('#txAmt').fill('100');await page.getByRole('button',{name:'Add',exact:true}).click();
  await page.getByRole('button',{name:'Add receipt details',exact:true}).click();await page.locator('input[data-m="file"]').setInputFiles({name:'demo-receipt.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64')});await page.waitForFunction(()=>S.txns[0].receiptData?.startsWith('data:image/png;'));
  await page.getByRole('button',{name:'Save',exact:true}).click();assert.equal(await page.evaluate(()=>S.txns[0].receiptDone),true);
  await page.getByRole('button',{name:'Continue to balances'}).click();assert.equal(await page.evaluate(()=>cardBalances(S,S.orgId).asg),50);
  await page.evaluate(()=>A.go({id:'home'}));await page.setViewportSize({width:390,height:844});assert.equal(await page.getByRole('navigation',{name:'Funding steps'}).isVisible(),false);await page.getByRole('button',{name:'See all seven steps'}).click();assert.equal(await page.getByRole('navigation',{name:'Funding steps'}).isVisible(),true);await page.getByRole('button',{name:'See all seven steps'}).click();await page.locator('.toast').evaluateAll(nodes=>nodes.forEach(n=>n.remove()));await page.screenshot({path:'journey-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  // Mock only Google's network boundary, exercising the real copy/fill/readback UI.
  const model=require('./sheet-model'),googleCopies=new Map(),googleWrites=[];
  const fixture={proposal:{id:'P-9100',orgId:'bank',semester:'Fall 2026',status:'draft',prior:0,purpose:'Support student education and outreach through our club mission.',ack:{hub:true,itemized:true,quotes:true,noGuarantee:true},events:[],lines:[{id:'L-9100',item:'Printed club recruitment banner',cat:'Admin: Banners',amount:150,comment:'Educational campus outreach'}],journalPaid:{}},org:null,settings:null};
  await page.evaluate(p=>{S=seedState();S.mode='demo';S.role='treasurer';S.orgId=S.orgs[0].id;p.orgId=S.orgId;p.semester=S.settings.semester;S.proposals=[p];S.spend=[];S.txns=[];S.settings.window={open:'2000-01-01',close:'2099-12-31'};S.settings.saCutoff='2099-12-31';GOOGLE_REVIEW.config={configured:true};GOOGLE_REVIEW.ready=true;GOOGLE_REVIEW.token='mock-session-only-token';GOOGLE_REVIEW.expires=Date.now()+60000;GOOGLE_REVIEW.templateId='mock-source';A.go({id:'sheetReview'});},fixture.proposal);
  Object.assign(fixture,await page.evaluate(()=>({proposal:proposalFor(S.orgId),org:ORG(),settings:S.settings})));
  const rows=[];for(const c of model.inputs(fixture.proposal,fixture.org,fixture.settings)){rows[c.row]??=[];rows[c.row][c.col]=c.value;}
  for(const [r,c,v] of [[5,3,'Step 1: Club Info'],[53,8,'Budget Item'],[53,16,'Amount'],[94,11,'Amount']]){rows[r]??=[];rows[r][c]=v;}
  const sourceJSON=JSON.stringify(rows);
  const nativeBook=(id,data)=>({spreadsheetId:id,spreadsheetUrl:`https://docs.google.com/spreadsheets/d/${id}/edit`,sheets:[{properties:{sheetId:19,title:'Club Funding Proposal',gridProperties:{rowCount:161,columnCount:38}},data:[{rowData:Array.from({length:161},(_,i)=>({values:Array.from(data[i]||[],v=>v==null?{}:{effectiveValue:{[typeof v==='number'?'numberValue':typeof v==='boolean'?'boolValue':'stringValue']:v}})}))}]}]});
  await page.route('https://**googleapis.com/**',async route=>{
   const req=route.request(),url=new URL(req.url());let result;
   assert.equal(req.headers().authorization,'Bearer mock-session-only-token');
   if(url.pathname.endsWith('/files/root'))result={id:'mock-own-root'};
   else if(url.pathname.endsWith('/files/mock-source/copy')){const body=req.postDataJSON();assert.deepEqual(body.parents,['mock-own-root']);const id='mock-copy-'+(googleCopies.size+1);googleCopies.set(id,JSON.parse(sourceJSON));googleWrites.push({id,kind:'copy'});result={id,webViewLink:`https://docs.google.com/spreadsheets/d/${id}/edit`,capabilities:{canEdit:true}};}
   else{const id=url.pathname.split('/').pop().split(':')[0];if(req.method()==='POST'){assert.ok(googleCopies.has(id),'Only a fresh copy may be written');const data=googleCopies.get(id);for(const update of req.postDataJSON().requests){const u=update.updateCells;assert.equal(u.fields,'userEnteredValue');const v=u.rows[0].values[0].userEnteredValue||{};data[u.range.startRowIndex]??=[];data[u.range.startRowIndex][u.range.startColumnIndex]=v.stringValue??v.numberValue??v.boolValue??'';}googleWrites.push({id,kind:'fill'});result={};}else result=nativeBook(id,id==='mock-source'?rows:googleCopies.get(id));}
   await route.fulfill({contentType:'application/json',body:JSON.stringify(result)});
  });
  await page.getByRole('button',{name:'Create editable review copy',exact:true}).click();await page.waitForFunction(()=>!GOOGLE_REVIEW.busy);assert.equal(await page.evaluate(()=>GOOGLE_REVIEW.error),'');await page.getByRole('heading',{name:'Your editable copy is ready',exact:true}).waitFor();
  await page.getByRole('button',{name:'Create a new filled copy',exact:true}).click();await page.waitForFunction(()=>proposalFor(S.orgId).sheetRef.id==='mock-copy-2'&&proposalFor(S.orgId).sheetRef.status==='ready');
  assert.equal(googleCopies.size,2);assert.equal(JSON.stringify(rows),sourceJSON);assert.deepEqual(googleWrites.map(x=>x.id),['mock-copy-1','mock-copy-1','mock-copy-2','mock-copy-2']);
  googleCopies.get('mock-copy-2')[95][11]=100;
  await page.getByRole('button',{name:'Read back the team’s edits',exact:true}).click();await page.waitForFunction(()=>proposalFor(S.orgId).lines[0].amount===100);
  const confirm=page.getByRole('checkbox',{name:'The exec team reviewed the sheet and I have read back their latest edits.',exact:true});await confirm.check();googleCopies.get('mock-copy-2')[95][11]=75;
  await page.getByRole('button',{name:'Submit reviewed demo proposal',exact:true}).click();await page.getByRole('alert').filter({hasText:'changed after confirmation'}).waitFor();assert.equal(await page.evaluate(()=>proposalFor(S.orgId).status),'draft');
  await confirm.check();await page.getByRole('button',{name:'Submit reviewed demo proposal',exact:true}).click();await page.getByRole('heading',{name:'Your proposal is approved',exact:true}).waitFor();assert.equal(await page.evaluate(()=>S.spend[0].lines[0].unit),75);
  assert.equal(await page.evaluate(()=>JSON.stringify(localStorage).includes('mock-session-only-token')),false);
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  console.log('PASS: mocked Google boundary: two distinct editable copies; original untouched; literal input fill; team edits imported; post-confirmation edits block submission; current reviewed amount feeds mandatory AP; token not persisted');
  console.log('PASS: seven guided steps, five proposal screens, one-item fields, focused review queues, every retained route, accessible mobile progress, white theme, larger sans-serif, sentence case; full UI proposal → human AP → pickup → purchase → stored receipt → balance; no external/paid requests');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
