const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const server=http.createServer((req,res)=>{const f=path.join(__dirname,req.url==='/'?'index.html':req.url.split('?')[0]);fs.readFile(f,(e,b)=>{if(e){res.writeHead(404);return res.end('{}');}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(b);});});
 await new Promise(r=>server.listen(4198,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'msedge'});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://**',r=>r.abort());await page.goto('http://127.0.0.1:4198');
  await page.evaluate(()=>{const a=cur();a.lines=[mkLine('nonevent',null,'Capital items projector','Capital Item',350)];UI.showAgent=false;render();submitBudget();});
  assert.equal(await page.evaluate(()=>cur().status),'approved');assert.equal(await page.evaluate(()=>cur().sa.workday),null);
  await page.locator('#role').selectOption('ap');
  await page.getByRole('button',{name:'Deny',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Enter a reason before denying'}).waitFor();
  assert.equal(await page.evaluate(()=>cur().status),'approved');
  await page.getByLabel('Reason if denied (required)',{exact:true}).fill('Please correct the card request description.');
  await page.getByRole('button',{name:'Deny',exact:true}).click();assert.equal(await page.evaluate(()=>cur().status),'sa_returned');
  assert.equal(await page.evaluate(()=>cur().returned),'Please correct the card request description.');
  await page.locator('#role').selectOption('org');
  await page.getByText(/Accounts Payable denied your spending request. Reason: Please correct/).waitFor();
  await page.locator('[data-stage="3"]').click();
  await page.getByRole('button',{name:'Revise spending request',exact:true}).click();
  assert.equal(await page.evaluate(()=>cur().status),'approved');
  assert.equal(await page.evaluate(()=>cur().authorizationHistory[0].apDecision.reason),'Please correct the card request description.');
  await page.locator('#role').selectOption('ap');await page.getByRole('button',{name:'Approve',exact:true}).click();
  assert.equal(await page.evaluate(()=>cur().status),'card_ready');assert.equal(await page.evaluate(()=>cur().card.status),'ready');
  assert.equal(await page.evaluate(()=>cur().card.loaded),350);assert.equal(await page.evaluate(()=>cur().apDecisions.length),2);
  await page.screenshot({path:'ap-approved-pickup.png',fullPage:true});
  await page.locator('#role').selectOption('org');
  await page.getByText(/Your card is available for pickup at Roudebush Hall/).waitFor();
  await page.locator('[data-stage="4"]').click();await page.getByRole('button',{name:'I picked up the card',exact:true}).click();
  assert.equal(await page.evaluate(()=>cur().status),'card_picked');
  assert.equal(await page.evaluate(()=>apDecide(cur(),true,'')),false,'Treasurer cannot approve AP requests');
  // The same AP review and notification are available for another organization.
  await page.getByLabel('Organization',{exact:true}).selectOption('personalFinance');await page.waitForFunction(()=>cur().presetClubKey==='personalFinance');
  await page.getByRole('button',{name:'Review saved funding proposal',exact:true}).click();await page.getByRole('button',{name:'Submit proposal to ASG',exact:true}).click();
  await page.locator('#role').selectOption('ap');await page.locator('.ap-request-list button').filter({hasText:'Personal Finance Club'}).click();
  await page.getByRole('button',{name:'Approve',exact:true}).click();assert.equal(await page.evaluate(()=>cur().card.loaded),2645.95);
  await page.getByLabel('Card last four digits (optional)',{exact:true}).fill('1234');await page.getByRole('button',{name:'Mark card picked up',exact:true}).click();
  assert.equal(await page.evaluate(()=>cur().card.last4),'1234');assert.equal(await page.evaluate(()=>cur().status),'card_picked');
  await page.locator('#role').selectOption('org');await page.locator('[data-stage="4"]').click();
  for(const width of [390,768,1440]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
  assert.deepEqual(errors,[]);console.log('PASS: prepared authorizations visible in AP; reason required to deny; denial notification and history; revision; AP approval; Roudebush pickup notification; organization and AP pickup confirmation; role guard; two clubs; responsive layout.');
 }finally{if(browser)await browser.close();server.close();}
})().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});
