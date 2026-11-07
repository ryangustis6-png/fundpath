const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const root=process.cwd();
 const server=http.createServer(async(req,res)=>{
   if(req.url==='/api/connections'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({agentId:'',speechConfigured:false,billingVerified:false}));}
   if(req.url.startsWith('/api/central')){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({groups:[{name:'Miami University Banking Club',tier:1,mission:'Public mission from Miami Central.',url:'https://miamicentral.miamioh.edu/student_community?club_id=35700'}],checkedAt:new Date().toISOString()}));}
   if(req.url==='/api/quotes'){res.writeHead(501,{'Content-Type':'application/json'});return res.end(JSON.stringify({error:'Live quote research is not configured. No external search was made.'}));}
   const name=path.resolve(root,'.'+(req.url==='/'?'/index.html':req.url.split('?')[0]));if(!name.startsWith(root+path.sep))return res.writeHead(403).end();
   fs.readFile(name,(error,bytes)=>{if(error)return res.writeHead(404).end();res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.html')?'text/html':'application/octet-stream');res.end(bytes);});
 });
 await new Promise(resolve=>server.listen(4173,'127.0.0.1',resolve));let browser;
 try{
   browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:process.env.BROWSER_CHANNEL || 'msedge'}:{})});
   const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],paidRequests=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/api\.elevenlabs|api\.anthropic/.test(r.url()))paidRequests.push(r.url());});
   await page.route('https://esm.sh/@elevenlabs/client@1.35.0',route=>route.fulfill({contentType:'text/javascript',body:'export const Conversation={startSession:async options=>{window.testVoiceOptions=options;return {endSession:async()=>{window.testVoiceEnded=true;options.onDisconnect()}}}};'}));
   await page.goto('http://127.0.0.1:4173');await page.getByRole('heading',{name:'A clear path from meeting to spending'}).waitFor();
   for (const selector of ['body','.page-intro h1','.page-intro>p:last-child','.summary-stat strong','.side nav a']) assert.match(await page.locator(selector).first().evaluate(el=>getComputedStyle(el).fontFamily),/Segoe UI/);await page.screenshot({path:'overview-desktop.png',fullPage:true});
   for(const role of ['Advisor','Treasury','Accounts payable']){await page.getByRole('button',{name:role,exact:true}).click();await page.locator('.review-next').waitFor();assert.equal(await page.locator('details.review-disclosure[open]').count(),0);}
   await page.getByRole('link',{name:'Spending queue',exact:true}).click();await page.locator('details.review-disclosure').first().waitFor();assert.ok(await page.locator('details.review-disclosure').count()>0);assert.equal(await page.locator('details.review-disclosure[open]').count(),1);
   await page.getByRole('button',{name:'Organization',exact:true}).click();
   await page.evaluate(()=>{for(const role of Object.keys(NAV)){S.role=role;for(const [view] of NAV[role]){UI.view=view;UI.saId=null;render();}}S.role='treasurer';UI.view='home';render();});
   await page.getByRole('link',{name:'Campus & voice',exact:true}).click();await page.getByRole('heading',{name:'Connect the tools you already use'}).waitFor();
   await page.getByRole('button',{name:'Search directory',exact:true}).click();await page.locator('.campus-result').waitFor();assert.match(await page.locator('.campus-result').innerText(),/Published tier 1/);assert.equal(await page.evaluate(()=>ORG().tier),4);
   assert.equal(await page.getByRole('button',{name:'Connect agent',exact:true}).isEnabled(),false);
   await page.getByLabel('Public agent identifier',{exact:true}).fill('agent_mock_for_tests');await page.getByRole('button',{name:'Save agent',exact:true}).click();
   await page.getByRole('checkbox',{name:'Allow live ElevenLabs for this session. It may use billable credits.',exact:true}).check();await page.getByRole('button',{name:'Connect agent',exact:true}).click();await page.locator('.connection-status.connected').waitFor();
   await page.evaluate(()=>{M().stage='idle';window.testVoiceOptions.onMessage({source:'user',message:'Hotel rooms cost $200.'});window.testVoiceOptions.onMessage({source:'ai',message:'I suggest a $900 room.'});});assert.equal(await page.evaluate(()=>M().transcript.filter(([who])=>who==='Exec board').length),1);
   await page.evaluate(()=>{M().stage='confirm';window.testVoiceOptions.onMessage({source:'ai',message:'Yes, submit it.'});});assert.equal(await page.evaluate(()=>M().stage),'confirm');
   await page.getByRole('button',{name:'Advisor',exact:true}).click();assert.equal(await page.evaluate(()=>window.testVoiceEnded),true);
   await page.getByRole('button',{name:'Organization',exact:true}).click();await page.getByRole('link',{name:'Find quotes',exact:true}).click();await page.getByRole('heading',{name:'Start with a real supplier offer'}).waitFor();
   await page.getByLabel('Item or service',{exact:true}).fill('Two hotel rooms');await page.getByLabel('Destination or delivery location').fill('Chicago');await page.getByLabel('Start date',{exact:true}).fill('2099-06-01');await page.getByLabel('End date',{exact:true}).fill('2099-06-03');await page.getByLabel('Requirements',{exact:true}).fill('Two guests per room; refundable rates including taxes.');
   await page.getByText('Live research access',{exact:true}).click();await page.getByLabel('Project research access code').fill('test-code-only-12345');await page.getByRole('checkbox',{name:'I want to run this live quote search and understand it may use provider credits.',exact:true}).check();await page.getByRole('button',{name:'Find real offers',exact:true}).click();await page.getByRole('alert').filter({hasText:'not configured'}).waitFor();
   await page.getByRole('link',{name:'Overview',exact:true}).click();for(const width of [390,768,1440]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'horizontal overflow at '+width);}
   const caps=await page.locator('#app').evaluate(root=>{const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),words=[];let n;while(n=walker.nextNode())if(!n.parentElement.closest('script,style,input,textarea,pre,code'))words.push(...(n.textContent.match(/\b[A-Z]{2,}\b/g)||[]));return words;});assert.deepEqual(caps,[]);
   await page.locator('.toast').evaluateAll(nodes=>nodes.forEach(n=>n.remove()));await page.setViewportSize({width:390,height:844});await page.screenshot({path:'demo-mobile.png',fullPage:true});assert.deepEqual(paidRequests,[]);assert.deepEqual(errors,[]);
   console.log('PASS: four role overviews, all navigation routes, review disclosure, system font, sentence case, responsive widths, campus provenance, mocked voice lifecycle and disabled research; no paid calls');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
