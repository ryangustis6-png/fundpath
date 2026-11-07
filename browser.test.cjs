const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
 const server=http.createServer((req,res)=>{const name=path.resolve('.','.'+(req.url==='/'?'/index.html':req.url.split('?')[0])); if(!name.startsWith(process.cwd()+path.sep)) {res.writeHead(403).end();return;}fs.readFile(name,(e,b)=>{if(e)res.writeHead(404).end();else {res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.html')?'text/html':'application/octet-stream');res.end(b);}});});
 await new Promise(r=>server.listen(4173,'127.0.0.1',r));
 let browser;
 try {
 browser=await chromium.launch({headless:true,...(process.platform === 'win32' ? {channel:process.env.BROWSER_CHANNEL || 'msedge'} : {})}); const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173');
 await page.getByRole('button',{name:'Roudebush Hall AP',exact:true}).click();
 await page.getByRole('heading',{name:'Roudebush Hall Accounts Payable'}).waitFor();
 await page.getByRole('link',{name:'Card balances & sweep',exact:true}).click();
 await page.getByRole('heading',{name:'Card and Agency balances'}).waitFor();
 await page.getByRole('button',{name:'Secretary of Treasury',exact:true}).click();
 await page.getByRole('button',{name:'Treasurer',exact:true}).click();
 await page.getByRole('link',{name:'Exec meeting',exact:true}).click();
 await page.getByRole('heading',{name:'ElevenLabs conversational meeting agent'}).waitFor();
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'demo-mobile.png',fullPage:true});
 if(errors.length) throw Error(errors.join('\n'));
 console.log('PASS: browser boot, AP portal, balances, Treasury and meeting navigation; no browser errors');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
