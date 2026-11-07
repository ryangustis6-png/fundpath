// User-requested hotel request caps and real uploaded supplier evidence.
function capHotelRequests(p,settings){
 const changes=[];
 for(const e of p.events||[]){const lines=p.lines.filter(l=>l.eventId===e.id&&l.cat==='Trip: Hotel'),n=+e.travelers,nights=+e.nights;
  if(!lines.length||!Number.isInteger(n)||n<1||!Number.isInteger(nights)||nights<1)continue;
  const cap=Math.round(Math.min(Math.ceil(n/settings.perRoom)*settings.hotelPerRoomNight*nights,settings.hotelPerPerson*n*nights)*100)/100;
  let remaining=cap;
  for(const l of lines){const gross=+(l.quoteEvidence?.total??l.hotelQuotedTotal??l.amount);if(!Number.isFinite(gross)||gross<0)continue;
   const requested=Math.min(+l.amount,remaining);remaining=Math.max(0,Math.round((remaining-requested)*100)/100);
   l.hotelQuotedTotal=gross;l.hotelFundingGap=Math.round((gross-requested)*100)/100;l.hotelCap=cap;
   if(+l.amount!==requested){changes.push(l.id);l.amount=requested;}
  }
 }
 return changes;
}
const quoteToolsView=VIEWS.quotes;
VIEWS.quotes=()=>{
 const p=editableQuoteProposal(),line=p?.lines.find(l=>l.id===UI.quoteLine),hotels=(p?.lines||[]).filter(l=>l.cat==='Trip: Hotel');
 return journeyHeading(2,'Add a real supplier quote','Upload a supplier estimate, or use source-backed research when configured.')+`<section class="journey-panel"><h2>Upload your quote</h2><p>Hotel, rental car, speaker, flight or other supplier estimate. A speaker’s fee must come from the speaker or representative.</p>${p?`<form data-a2="uploadSupplierQuote" class="journey-form"><label>Budget item<select name="lineId" required>${p.lines.map(l=>`<option value="${esc(l.id)}" ${l.id===line?.id?'selected':''}>${esc(l.item)}</option>`).join('')}</select></label><label>Supplier name<input name="supplier" required maxlength="160"></label><label>Full quoted total, including known fees<input name="total" type="number" min="0.01" step="0.01" required></label><label>Supplier estimate<input name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" required></label><label>Dates, quantity and conditions<textarea name="conditions" required placeholder="Dates, number of rooms or vehicles, taxes, cancellation terms, speaker services…"></textarea></label><button class="btn">Attach quote</button></form>`:'<p>Open an editable proposal first.</p>'}${hotels.length?`<details open><summary>Hotel funding cap</summary><p>The request is capped at the lower of $130 per room per night (four travelers per room, rounded up) and $50 per traveler per night. Enter whole-number travelers and nights on the event screen. This caps funding, not the supplier’s price.</p><ul>${hotels.map(l=>`<li>${esc(l.item)}: ${money(l.amount)} requested${l.hotelQuotedTotal!=null?` · ${money(l.hotelQuotedTotal)} supplier/estimated total · ${money(l.hotelFundingGap)} to cover separately`:''}</li>`).join('')}</ul><a href="https://miamiohasg.com/funding-1" target="_blank" rel="noopener">Funding policy sources</a></details>`:''}${(p?.lines||[]).filter(l=>l.quoteEvidence?.kind==='uploaded_quote').map(l=>`<p>${esc(l.item)} · ${esc(l.quoteEvidence.supplier)} · ${money(l.quoteEvidence.total)} quoted${l.quoteEvidence.data?` · <a href="${esc(l.quoteEvidence.data)}" download="${esc(l.quoteFile)}">Download uploaded quote</a>`:''}</p>`).join('')}${journeyGo('Continue to proposal','proposal')}</section><details class="journey-panel"><summary>Find supplier offers online</summary><p>Real date-specific prices require a configured search provider. Paid research remains paused. No booking, supplier outreach or invented quote is made.</p>${quoteToolsView()}</details>`;
};
document.addEventListener('submit',async event=>{
 if(!event.target.matches('[data-a2="uploadSupplierQuote"]'))return;event.preventDefault();
 const p=editableQuoteProposal();if(!p||S.role!=='treasurer')return;
 const form=event.target,data=new FormData(form),l=p.lines.find(l=>l.id===data.get('lineId')),file=data.get('file'),total=+data.get('total');
 if(!l||!(total>0)||!Number.isFinite(total)||!file?.size||file.size>2*1024*1024||!['application/pdf','image/png','image/jpeg','image/webp'].includes(file.type))return toast('Choose a Pdf or image under 2 MB and a valid total.','bad');
 const button=form.querySelector('button');button.disabled=true;
 try{const bytes=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});
  if(!S.proposals.includes(p)||!['draft','returned'].includes(p.status))throw Error();
  const before=JSON.stringify(l);l.quoteEvidence={kind:'uploaded_quote',supplier:String(data.get('supplier')).trim(),total,conditions:String(data.get('conditions')).trim(),data:bytes,reviewed:false,retrievedAt:new Date().toISOString()};l.quoteFile=file.name;l.quote=true;l.amount=total;delete l.hotelQuotedTotal;capHotelRequests(p,S.settings);p.execReview=null;
  try{localStorage.setItem(S.mode==='real'?REAL_KEY:KEY,JSON.stringify(S));}catch{Object.keys(l).forEach(k=>delete l[k]);Object.assign(l,JSON.parse(before));throw Error();}render();toast('Quote stored locally. Treasury must review it.');
 }catch{toast('Quote could not be stored. Check browser storage and try again.','bad');button.disabled=false;}
});
const renderWithQuoteTools=render;
render=function(){if(S&&S.role==='treasurer'){const p=editableQuoteProposal();if(p&&capHotelRequests(p,S.settings).length){p.execReview=null;save();}}renderWithQuoteTools();};
if(typeof module!=='undefined')module.exports={capHotelRequests};
