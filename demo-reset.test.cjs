const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const server=http.createServer((req,res)=>{const f=path.join(__dirname,req.url==='/'?'index.html':req.url.split('?')[0]);fs.readFile(f,(e,b)=>{if(e){res.writeHead(404);return res.end('{}');}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(b);});});
 await new Promise(r=>server.listen(4199,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'msedge'});const page=await browser.newPage();await page.route('https://**',r=>r.abort());await page.goto('http://127.0.0.1:4199');
  const oldIds=await page.evaluate(async()=>{
    window.oldBank=clubRun('banking');
    for(const a of Object.values(Store.apps)){a.status='card_picked';a.asg={decision:'auto',approved:{old:500}};a.sa={total:500};a.card={status:'picked',loaded:500,last4:'1234'};a.apDecisions=[{decision:'approved'}];a.receipts=[{id:'old-'+a.id,amount:100}];a.notices=[{id:'old',to:'org',t:'Old card active',read:false}];save(a,true);await FILES.put('old-'+a.id,new File(['old receipt'],'old.txt'));}
    const archived=newApp('Banking Club',4);archived.presetClubKey='banking';archived.archivedDemo=true;archived.status='card_ready';archived.card={status:'ready',loaded:100};save(archived,true);return Object.keys(Store.apps);
  });
  await page.getByRole('button',{name:'Restart demo',exact:true}).click();await page.waitForFunction(()=>cur()?.status==='draft'&&!restartingDemo);
  assert.equal(await page.evaluate(()=>Object.keys(Store.apps).length),3);
  assert.equal(await page.evaluate(ids=>ids.every(id=>!Store.apps[id]),oldIds),true);
  assert.equal(await page.evaluate(()=>Object.values(Store.apps).every(a=>!a.asg&&!a.sa&&a.status==='draft'&&a.card.status==='none'&&a.card.loaded===0&&!a.receipts.length&&!a.notices.length&&!a.apDecisions)),true);
  assert.equal(await page.evaluate(async id=>await FILES.get('old-'+id),oldIds[0]),null);
  await page.evaluate(()=>save(window.oldBank,true));assert.equal(await page.evaluate(()=>!!Store.apps[window.oldBank.id]),false,'Stale async saves must not restore old runs');
  await page.locator('#role').selectOption('asg');assert.equal(await page.getByText('No budgets submitted yet.',{exact:true}).count(),1);assert.equal(await page.getByText(/card active|card ready/i).count(),0);
  await page.locator('#role').selectOption('ap');assert.equal(await page.getByRole('heading',{name:'No requests to review yet',exact:true}).count(),1);
  await page.reload();assert.equal(await page.evaluate(()=>Object.values(Store.apps).every(a=>a.card.status==='none'&&!a.asg&&!a.sa)),true);
  // A new run must pass ASG and AP approval again before any card is available.
  await page.evaluate(()=>{const a=cur();a.lines=[mkLine('nonevent',null,'Capital items projector','Capital Item',350)];UI.showAgent=false;submitBudget();});
  assert.equal(await page.evaluate(()=>cur().card.status),'none');await page.locator('#role').selectOption('ap');await page.getByRole('button',{name:'Approve',exact:true}).click();assert.equal(await page.evaluate(()=>cur().card.status),'ready');
  console.log('PASS: restart deletes all prior/archived runs and receipt bytes across clubs; ASG/AP queues empty; no cards or approvals survive reload; stale saves blocked; new cards require fresh ASG/AP approval.');
 }finally{if(browser)await browser.close();server.close();}
})().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});
