const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const server=http.createServer((req,res)=>{const f=path.join(__dirname,req.url==='/'?'index.html':req.url.split('?')[0]);fs.readFile(f,(e,b)=>{if(e){res.writeHead(404);return res.end('{}');}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(b);});});
 await new Promise(r=>server.listen(4195,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'msedge'});const page=await browser.newPage();page.setDefaultTimeout(60000);page.on('pageerror',e=>console.error('Browser:',e.message));await page.goto('http://127.0.0.1:4195');
  const previous=await page.evaluate(()=>cur().id);await page.getByRole('button',{name:'Restart demo',exact:true}).click();
  await page.emulateMedia({colorScheme:'dark'});
  assert.equal(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor),'rgb(255, 255, 255)');
  await page.evaluate(()=>document.documentElement.dataset.theme='dark');
  assert.equal(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor),'rgb(255, 255, 255)');
  await page.waitForFunction(id=>cur().id!==id,previous);
  assert.equal(await page.evaluate(id=>!!Store.apps[id],previous),true);
  assert.equal(await page.evaluate(()=>cur().org.sa),'SA10472');
  assert.equal(await page.getByRole('button',{name:'Start meeting with ElevenLabs',exact:true}).count(),1);
  const result=await Promise.race([page.evaluate(async()=>{
   const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=1200;const g=canvas.getContext('2d');g.fillStyle='white';g.fillRect(0,0,1200,1200);g.fillStyle='black';g.font='44px Arial';
   ['ACME ELECTRONICS','123 Main Street','11/07/2026','Projector 300.00','Subtotal 300.00','Tax 21.00','TOTAL $321.00','VISA 321.00'].forEach((s,i)=>g.fillText(s,60,100+i*100));
   const blob=await new Promise(r=>canvas.toBlob(r,'image/jpeg',.95));const file=new File([blob],'receipt.jpg',{type:'image/jpeg'});const a=cur();await addReceiptFiles([file]);return a.receipts.at(-1);
  }),new Promise((_,reject)=>setTimeout(()=>reject(Error('Receipt OCR exceeded 90 seconds')),90000))]);
  assert.equal(result.vendor,'ACME ELECTRONICS');assert.equal(result.date,'2026-11-07');assert.equal(result.amount,321);assert.equal(result.category,'capital');assert.equal(result.hasFile,true);assert.equal(result.ocrStatus,'review');await page.screenshot({path:'receipt-autofill.png',fullPage:true});console.log('PASS: real JPEG -> browser OCR -> saved receipt attachment with prefilled vendor/date/total/category.');
 }finally{if(browser)await browser.close();server.close();}
})().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});
