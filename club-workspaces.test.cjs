const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const root=__dirname,server=http.createServer((req,res)=>{const f=path.join(root,req.url==='/'?'index.html':decodeURIComponent(req.url.split('?')[0]));fs.readFile(f,(e,b)=>{if(e){res.writeHead(404);return res.end('{}');}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(b);});});
 await new Promise(r=>server.listen(4197,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'msedge'});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://**',r=>r.abort());
  await page.goto('http://127.0.0.1:4197');
  assert.equal(await page.locator('#organization-switcher option').count(),3);
  assert.equal(await page.getByRole('button',{name:'Start meeting with ElevenLabs',exact:true}).count(),1);
  assert.equal(await page.evaluate(()=>cur().org.sa),'SA10472');
  await page.getByLabel('Organization',{exact:true}).selectOption('personalFinance');
  await page.waitForFunction(()=>cur().presetClubKey==='personalFinance');
  assert.equal(await page.getByRole('button',{name:'Start meeting with ElevenLabs',exact:true}).count(),1);
  assert.equal(await page.evaluate(()=>cur().org.sa),'SA10384');assert.equal(await page.evaluate(()=>cur().org.treasurer),'Ninos Aneer');
  assert.equal(await page.evaluate(()=>cur().lines.length),8);assert.equal(await page.evaluate(()=>totals(cur()).total),2645.95);
  await page.getByRole('button',{name:'Review saved funding proposal',exact:true}).click();
  assert.deepEqual(await page.evaluate(()=>validate(cur()).errors),[]);assert.deepEqual(await page.evaluate(()=>validate(cur()).reviews),[]);
  await page.screenshot({path:'personal-finance-proposal.png',fullPage:true});
  await page.getByRole('button',{name:'Submit proposal to ASG',exact:true}).click();
  assert.equal(await page.evaluate(()=>cur().status),'approved');assert.equal(await page.evaluate(()=>cur().sa.total),2645.95);
  await page.evaluate(()=>{UI.stage=5;render();});assert.equal(await page.locator('.receipt-library').count(),0);assert.equal(await page.evaluate(()=>cur().receipts.length),0);
  await page.getByLabel('Organization',{exact:true}).selectOption('pickleball');await page.waitForFunction(()=>cur().presetClubKey==='pickleball');
  assert.equal(await page.evaluate(()=>cur().org.sa),'SA10314');assert.equal(await page.evaluate(()=>cur().tier),4);assert.equal(await page.evaluate(()=>cur().org.president),'Cole Fisher');assert.equal(await page.evaluate(()=>cur().org.treasurer),'Cole Fisher');
  assert.equal(await page.getByRole('button',{name:'Start meeting with ElevenLabs',exact:true}).count(),1);
  await page.evaluate(()=>{UI.stage=5;render();});
  assert.equal(await page.getByRole('button',{name:'Apply receipt',exact:true}).count(),6);
  assert.equal(await page.locator('[data-club-action="apply-receipt"]:enabled').count(),0);
  assert.equal(await page.evaluate(()=>cur().receipts.length),0);
  // Approve an ordinary Pickleball demo budget; supplied receipts are opt-in.
  await page.evaluate(()=>{const a=cur();a.lines=[mkLine('nonevent',null,'Food catering','Event: Food',1000),mkLine('nonevent',null,'Administrative software','Admin Item',300)];UI.showAgent=false;UI.stage=1;submitBudget();UI.stage=5;render();});
  assert.equal(await page.evaluate(()=>cur().status),'approved');
  for(const key of ['kofenya','bodega','mac-joes','canva','dominos','jersey-mikes']){await page.locator(`[data-receipt="${key}"]`).click();await page.waitForFunction(key=>cur().receipts.some(r=>r.receiptSourceKey===key),key);}
  assert.equal(await page.evaluate(()=>cur().receipts.length),6);assert.equal(await page.evaluate(()=>sum(cur().receipts.map(r=>r.amount))),944.58);
  assert.equal(await page.evaluate(()=>cents(sum(Object.values(cur().asg.approved)))-cents(sum(cur().receipts.map(r=>r.amount)))),35542);
  await page.evaluate(()=>applyPreloadedReceipt('kofenya'));assert.equal(await page.evaluate(()=>cur().receipts.length),6);
  assert.equal(await page.locator('#drop').count(),1);
  assert.equal(await page.evaluate(async()=>!!(await FILES.get(cur().receipts[0].id))?.blob),true);
  await page.screenshot({path:'pickleball-receipt-options.png',fullPage:true});
  await page.getByLabel('Organization',{exact:true}).selectOption('banking');await page.waitForFunction(()=>cur().presetClubKey==='banking');
  assert.equal(await page.evaluate(()=>cur().receipts.length),0);
  await page.getByLabel('Organization',{exact:true}).selectOption('personalFinance');await page.waitForFunction(()=>cur().presetClubKey==='personalFinance');
  assert.equal(await page.evaluate(()=>cur().status),'approved');assert.equal(await page.evaluate(()=>cur().receipts.length),0);
  await page.getByRole('button',{name:'Restart demo',exact:true}).click();await page.waitForFunction(()=>cur().status==='draft');
  assert.equal(await page.evaluate(()=>cur().presetClubKey),'personalFinance');assert.equal(await page.evaluate(()=>cur().lines.length),8);
  await page.reload();assert.equal(await page.evaluate(()=>cur().presetClubKey),'personalFinance');
  assert.equal(await page.getByRole('button',{name:'Start meeting with ElevenLabs',exact:true}).count(),1);
  for(const width of [390,768,1440]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Overflow '+width);}
  const standalone=await browser.newPage();await standalone.route('https://**',r=>r.abort());
  await standalone.goto(require('node:url').pathToFileURL(path.join(root,'..','FundPath - Michael + Jeff.html')).href);
  assert.equal(await standalone.locator('#organization-switcher option').count(),3);
  await standalone.getByLabel('Organization',{exact:true}).selectOption('personalFinance');await standalone.waitForFunction(()=>cur().presetClubKey==='personalFinance');
  assert.equal(await standalone.evaluate(()=>totals(cur()).total),2645.95);
  assert.equal(await standalone.getByRole('button',{name:'Start meeting with ElevenLabs',exact:true}).count(),1);
  // Saved/shared HTML may include controls that were already rendered before loading.
  await standalone.evaluate(()=>{
    const header=document.querySelector('.top-in');
    for(let i=0;i<2;i++){header.appendChild(document.querySelector('.club-switcher').cloneNode(true));header.appendChild(document.querySelector('#restart-demo').cloneNode(true));}
    mountClubControls();mountClubControls();
  });
  assert.equal(await standalone.locator('#organization-switcher').count(),1);
  assert.equal(await standalone.getByRole('button',{name:'Restart demo',exact:true}).count(),1);
  await standalone.getByLabel('Organization',{exact:true}).selectOption('pickleball');await standalone.waitForFunction(()=>cur().presetClubKey==='pickleball');
  const runsBefore=await standalone.evaluate(()=>Object.keys(Store.apps).length);
  await standalone.getByRole('button',{name:'Restart demo',exact:true}).click();await standalone.waitForFunction(count=>Object.keys(Store.apps).length===count+1,runsBefore);
  assert.equal(await standalone.evaluate(()=>cur().presetClubKey),'pickleball');
  assert.deepEqual(errors,[]);console.log('PASS: three-club switcher; meeting-first entry; exact imported PFC proposal + approval/SA; six Pickleball-only receipt assets applied once after approval; exact balance; uploads retained; isolation; per-club restart and reload; responsive widths.');
 }finally{if(browser)await browser.close();server.close();}
})().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});
