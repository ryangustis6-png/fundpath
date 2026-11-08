const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const server=http.createServer((req,res)=>{const f=path.join(__dirname,req.url==='/'?'index.html':req.url.split('?')[0]);fs.readFile(f,(e,b)=>{if(e){res.writeHead(404);return res.end('{}');}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(b);});});
 await new Promise(r=>server.listen(4192,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'msedge'});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.route('https://**',r=>r.abort());
  await page.route('https://esm.sh/@elevenlabs/client@1.35.0',r=>r.fulfill({contentType:'text/javascript',body:`export const Conversation={startSession:async opts=>{window.voiceOpts=opts;return{endSession:async()=>{window.voiceStopped=true;opts.onDisconnect()},sendContextualUpdate:t=>window.voiceContext=t}}}` }));
  await page.goto('http://127.0.0.1:4192');
  await page.evaluate(()=>{const a=newApp('Test Club',4);Store.apps[a.id]=a;UI.appId=a.id;UI.stage=1;UI.role='org';render();});
  await page.getByRole('button',{name:'Start meeting with ElevenLabs'}).click();await page.waitForFunction(()=>!!meetingSession);
  assert.equal(await page.evaluate(()=>voiceOpts.agentId),'agent_8901m6w3h3tpf5fr9qsgkkwr8gc2');
  await page.evaluate(()=>{voiceOpts.onMessage({source:'ai',message:'Buy champagne for $500.'});voiceOpts.onMessage({source:'user',message:'Marketing banners for $150.'});});
  assert.equal(await page.evaluate(()=>studentNotes(cur()).includes('champagne')),false);
  await page.getByRole('button',{name:'Create budget draft'}).click();await page.waitForFunction(()=>!meetingSession&&cur().lines.length>0);
  assert.equal(await page.evaluate(()=>window.voiceStopped),true);
  await page.evaluate(()=>{const a=cur();a.events=[{id:'e',type:'Event',name:'Workshop',date:'2027-02-10',onHub:true}];a.lines=[mkLine('event','e','Food workshop catering','Event: Food',1500),mkLine('event','e','Food beer','Event: Food',100)];prepareCompliantDraft(a);Object.assign(a.org,{treasurer:'Jordan',president:'Maya',advisor:'Pat',email:'club@miamioh.edu',presidentEmail:'maya@miamioh.edu',treasurerEmail:'jordan@miamioh.edu',sa:'SA10384'});render();});
  assert.equal(await page.evaluate(()=>cur().lines.length),1);assert.equal(await page.evaluate(()=>cur().lines[0].amount),1000);assert.equal(await page.evaluate(()=>cur().excludedLines.length),1);
  await page.screenshot({path:'merged-budget-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'Submit proposal to ASG'}).click();
  assert.equal(await page.evaluate(()=>cur().status),'approved');assert.equal(await page.evaluate(()=>cur().sa.total),1000);
  await page.getByRole('button',{name:'Next: send it to Workday'}).click();
  await page.screenshot({path:'merged-workday-desktop.png',fullPage:true});
  // Verify Jeff's full mock sequence continues: Workday -> AP -> pickup -> receipts/audit.
  await page.evaluate(()=>sendToWorkday());assert.equal(await page.evaluate(()=>cur().status),'sa_submitted');
  await page.evaluate(()=>{UI.role='ap';apDecide(cur(),true,'Checked');UI.role='org';render();});assert.equal(await page.evaluate(()=>cur().status),'card_ready');
  await page.evaluate(()=>{const a=cur();a.card.status='picked';a.status='card_picked';UI.stage=5;render();});
  assert.equal(await page.getByRole('heading',{name:'Receipts & audit',exact:true}).count(),1);
  await page.evaluate(()=>{const a=cur();a.receipts=[{id:'receipt-1',date:'2026-10-20',vendor:'Campus Catering',desc:'Workshop food',amount:1000,tip:0,category:'food',sample:true,hasFile:false}];submitAudit();});
  assert.equal(await page.evaluate(()=>cur().audit.status),'submitted');
  await page.evaluate(()=>{UI.auSel=cur().id;UI.audDraft={};auditDecide(cur(),true);});
  assert.equal(await page.evaluate(()=>cur().audit.status),'passed');
  // Cannot bypass missing evidence or exhausted tier funding.
  await page.evaluate(()=>{const a=cur();a.status='draft';a.sa=null;a.asg=null;UI.stage=1;a.lines=[mkLine('event','e','Hotel room','Trip: Hotels',100)];submitBudget();});
  assert.equal(await page.evaluate(()=>cur().status),'draft');
  await page.evaluate(()=>{const a=cur();a.lines=[mkLine('event','e','Workshop catering','Event: Food',100)];a.org.prior=5000;submitBudget();});assert.equal(await page.evaluate(()=>cur().status),'draft');
  await page.evaluate(()=>{const a=cur();a.org.prior=0;a.lines=[mkLine('event','e','Misc stuff','Event: Other',100)];submitBudget();});assert.equal(await page.evaluate(()=>cur().status),'draft');
  for(const width of [390,768,1440]){await page.setViewportSize({width,height:1000});const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);if(overflow)console.log(await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(el=>el.getBoundingClientRect().right>innerWidth+2).slice(0,12).map(el=>({tag:el.tagName,class:el.className,width:el.getBoundingClientRect().width}))));assert.equal(overflow,false,'Overflow at '+width);}
  await page.screenshot({path:'merged-budget-mobile.png',fullPage:true});assert.deepEqual(errors,[]);
  // All downstream source functions are byte-for-byte Jeff's attachment.
  const ref=fs.readFileSync('jeff-reference.html','utf8'),current=fs.readFileSync('index.html','utf8');assert.ok(current.startsWith(ref.slice(0,ref.lastIndexOf('</body>'))));
  console.log('PASS: voice -> team-only transcript -> compliant budget + disclosed adjustments -> explicit submission -> auto approval + SA -> Jeff Workday/AP/card/receipts. Invalid and uncertain drafts blocked; responsive widths; unchanged Jeff source; no live calls.');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
