/* Read receipt photos in the browser. No paid API or image upload is used. */
let receiptOcrLibrary=null;
function loadReceiptOcr(){
  if(window.Tesseract)return Promise.resolve(window.Tesseract);
  if(!receiptOcrLibrary)receiptOcrLibrary=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js';
    script.onload=()=>window.Tesseract?resolve(window.Tesseract):reject(Error('Receipt reader did not load.'));
    script.onerror=()=>{script.remove();receiptOcrLibrary=null;reject(Error('Receipt reading needs an internet connection.'));};
    document.head.appendChild(script);
  });
  return receiptOcrLibrary;
}
function receiptFieldsFromText(text){
  const lines=String(text).split(/\r?\n/).map(s=>s.trim()).filter(Boolean),out={};
  let date;
  const iso=String(text).match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  const us=String(text).match(/\b(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2}|20\d{2})\b/);
  if(iso)date=[+iso[1],+iso[2],+iso[3]];
  else if(us)date=[+us[3]<100?2000+(+us[3]):+us[3],+us[1],+us[2]];
  if(date){const [y,m,d]=date,check=new Date(Date.UTC(y,m-1,d));if(check.getUTCFullYear()===y&&check.getUTCMonth()===m-1&&check.getUTCDate()===d)out.date=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;}
  const moneyAtEnd=s=>{const m=s.match(/(?:\$\s*)?([\d,]+[.]\d{2})\s*(?:USD)?\s*$/i);return m?+m[1].replace(/,/g,''):null;};
  const totals=[];
  for(let i=0;i<lines.length;i++){
    if(/\b(?:grand\s+total|amount\s+(?:paid|due)|total(?:\s+(?:paid|amount|due))?)\b/i.test(lines[i])&&!/\bsub\s*total\b|subtotal|tax\s+total|total\s+(?:tax|savings|discount)/i.test(lines[i])){
      const amount=moneyAtEnd(lines[i])??(/^(?:grand\s+total|total|amount\s+(?:paid|due))\s*[:$]?$/i.test(lines[i])?moneyAtEnd(lines[i+1]||''):null);
      if(amount!==null&&amount>0)totals.push({amount,priority:/grand\s+total|amount\s+paid|total\s+paid/i.test(lines[i])?2:1});
    }
    if(/\b(?:tip|gratuity)\b/i.test(lines[i])){const tip=moneyAtEnd(lines[i]);if(tip!==null)out.tip=tip;}
  }
  if(totals.length)out.amount=totals.sort((a,b)=>b.priority-a.priority)[0].amount;
  out.vendor=lines.slice(0,8).find(s=>/[a-z]{2}/i.test(s)&&!/^\d|\b(receipt|invoice|order|transaction|date|time|cashier|welcome|thank|www\.|https?:|tel|phone)\b|@/i.test(s))||'';
  if(lines.length)out.desc=lines.slice(0,30).join(' · ').slice(0,3000);
  const body=String(text).toLowerCase();
  if(/projector|laptop|computer|monitor|printer|camera|furniture|capital item/.test(body))out.category='capital';
  else if(/hotel|lodging|flight|airfare|gasoline|fuel|unleaded/.test(body)){out.category='trip';out.tripType=/hotel|lodging/.test(body)?'hotel':/flight|airfare/.test(body)?'flight':'gas';}
  else if(/speaker fee|honorarium/.test(body))out.category='speaker';
  else if(/catering|restaurant|pizza|sandwich|coffee|food|meal/.test(body))out.category='food';
  else if(/subscription|software|office supplies|administrative/.test(body))out.category='admin';
  else if(/marketing|advertising|poster|flyer/.test(body))out.category='event';
  return out;
}
async function readReceiptImage(file){
  const engine=await loadReceiptOcr();let worker;
  try{
    worker=await engine.createWorker('eng',1,{
      workerPath:'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/worker.min.js',
      corePath:'https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0',
      langPath:'https://tessdata.projectnaptha.com/4.0.0'
    });
    const result=await worker.recognize(file);
    return {fields:receiptFieldsFromText(result.data.text),text:result.data.text};
  }finally{if(worker)await worker.terminate();}
}
async function autofillReceiptPhoto(a,r,file){
  if(!/^image\/(?:jpeg|png|webp)$/i.test(file.type)&&! /\.(?:jpe?g|png|webp)$/i.test(file.name))return;
  const before={date:r.date,vendor:r.vendor,amount:r.amount,tip:r.tip,category:r.category,tripType:r.tripType,desc:r.desc};
  r.ocrStatus='reading';save(a);render();
  try{
    const result=await readReceiptImage(file);
    if(!a.receipts.includes(r))return;
    for(const [key,value]of Object.entries(result.fields))if(r[key]===before[key]&&value!==''&&value!=null)r[key]=value;
    r.ocrStatus=Object.keys(result.fields).some(k=>result.fields[k]!=='')?'review':'empty';
  }catch{r.ocrStatus='error';}
  finally{if(a.receipts.includes(r)){save(a);render();}}
}
addReceiptFiles=async function(files){
  const a=cur();if(!a)return;
  for(const file of files){
    if(typeof retiredDemoApps!=='undefined'&&retiredDemoApps.has(a.id))return;
    const p=parseReceiptName(file.name),id=uid(),stored=await FILES.put(id,file);
    if(typeof retiredDemoApps!=='undefined'&&retiredDemoApps.has(a.id))return;
    const r={id,fileName:file.name,hasFile:stored,date:p?.date||'',vendor:p?.vendor||'',desc:p?.desc||'',amount:p?.amount||'',tip:p?.tip||0,category:p?.category||'',tripType:'',people:'',nights:'',kept:false,asg:null};
    a.receipts.push(r);save(a);render();await autofillReceiptPhoto(a,r,file);
  }
  log(a,'Treasurer',`Added ${files.length} receipt file(s)`);save(a);render();toast('Receipts added. Review the details read from each photo.');
};
const receiptCardWithoutOcr=receiptCard;
receiptCard=function(a,r,ro){
  const messages={reading:'Reading receipt photo…',review:'Read from your receipt photo. Please check the date, vendor, amount and category.',empty:'No clear fields found. Enter the details below.',error:'Could not read this photo. Your attachment is kept; enter the details below.'};
  return (r.ocrStatus?`<p role="status" class="small muted">${esc(messages[r.ocrStatus]||'')}</p>`:'')+receiptCardWithoutOcr(a,r,ro);
};
// Existing per-receipt attachment controls use the same reader, exactly once.
document.addEventListener('change',async e=>{
  const input=e.target;if(!input.dataset?.rfile||!input.files?.[0])return;
  e.stopImmediatePropagation();const a=cur(),r=a?.receipts.find(x=>x.id===input.dataset.rfile),file=input.files[0];if(!r)return;
  r.hasFile=await FILES.put(r.id,file);r.fileName=file.name;save(a);render();await autofillReceiptPhoto(a,r,file);
},true);
