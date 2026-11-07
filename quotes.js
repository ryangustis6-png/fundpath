// Source-backed quote research, with explicit use and human verification.
NAV.treasurer.splice(NAV.treasurer.findIndex(([id])=>id==='proposal')+1,0,['quotes','Find quotes']);
const quoteState={busy:false,error:'',offers:[],message:'',request:null};
function editableQuoteProposal(){const p=proposalFor(S.orgId);return p && ['draft','returned'].includes(p.status)?p:null;}
VIEWS.quotes=()=>{
  const p=editableQuoteProposal(), fields=quoteState.request || {};
  return pageIntro('Quote research','Start with a real supplier offer','The assistant researches published offers. You review the evidence before attaching anything to your proposal.')
    + `<section class="card"><h2>What do you need?</h2><p>Give exact dates and requirements so a nightly starting price is never mistaken for your full trip cost.</p><form data-a2="researchQuotes"><div class="grid2"><label>Type<select name="kind">${['hotel','rental car','flight','supplies','other'].map(k=>`<option ${fields.kind===k?'selected':''}>${k}</option>`).join('')}</select></label><label>Budget line<select name="lineId"><option value="">Research before choosing a line</option>${(p?.lines || []).map(l=>`<option value="${esc(l.id)}" ${UI.quoteLine===l.id?'selected':''}>${esc(l.item)}</option>`).join('')}</select></label></div><label>Item or service<input name="item" value="${esc(fields.item || p?.lines.find(l=>l.id===UI.quoteLine)?.item || '')}" required minlength="3" placeholder="Two hotel rooms for a student conference"></label><div class="grid2"><label>Destination or delivery location<input name="destination" value="${esc(fields.destination || '')}" required placeholder="Chicago, Illinois"></label><label>Quantity<input name="quantity" type="number" min="1" max="1000" value="${esc(fields.quantity || 1)}" required></label><label>Start date<input name="start" type="date" value="${esc(fields.start || '')}" min="${todayIso()}" required></label><label>End date<input name="end" type="date" value="${esc(fields.end || '')}" min="${todayIso()}" required></label></div><label>Requirements<textarea name="details" required placeholder="For hotels: guests per room, room type and cancellation needs. For cars: driver age, pickup and return times and locations, vehicle size, mileage and insurance needs.">${esc(fields.details || '')}</textarea></label><details class="research-access"><summary>Live research access</summary><p class="small">An administrator must enable the research provider in Vercel. This uses separately billed search and model credits. Do not enter a provider API key here.</p><label>Project research access code<input name="accessCode" type="password" autocomplete="off" minlength="12" required></label></details><label class="check"><input name="consent" type="checkbox" required> I want to run this live quote search and understand it may use provider credits.</label><button class="btn" ${quoteState.busy?'disabled':''}>${quoteState.busy?'Researching supplier offers…':'Find real offers'}</button>${quoteState.error?`<p class="inline-error" role="alert">${esc(quoteState.error)}</p>`:''}</form></section>`
    + `<section class="card"><h2>Research results</h2><p role="status">${esc(quoteState.message || 'Your dated, sourced offers will appear here. No prices are generated without evidence.')}</p>${quoteState.offers.map((offer,i)=>`<article class="quote-offer"><div class="section-heading"><div><h3>${esc(offer.supplier)} · ${esc(offer.title)}</h3><p>${esc(offer.start)} – ${esc(offer.end)} · ${offer.quantity} requested</p></div><strong>${money(offer.total)} total</strong></div><p><a href="${esc(offer.sourceUrl)}" target="_blank" rel="noopener">Open supplier source ↗</a></p><p>${esc(offer.conditions)}</p><details><summary>Source evidence and checked time</summary>${offer.evidence.map(t=>`<blockquote>${esc(t)}</blockquote>`).join('')}<p>Checked ${esc(new Date(offer.retrievedAt).toLocaleString())}</p></details><label class="check"><input type="checkbox" id="quoteReviewed-${i}"> I checked the source, dates, full quantity, taxes, fees and conditions.</label><div class="inline-actions"><button class="btn" data-a="attachQuote" data-id="${i}" ${p && quoteState.request?.lineId?'':'disabled'}>Attach to budget line</button><button class="btn ghost" data-a="downloadQuote" data-id="${i}">Download research record</button></div><p class="small muted">Research evidence only. Treasury must review it; no booking or vendor-issued confirmation has been made.</p></article>`).join('')}${!p?'<p class="muted">Create or open an editable proposal before attaching an offer. You can research and download records first.</p>':''}</section>`;
};
document.addEventListener('submit',async event=>{
  if(!event.target.matches('[data-a2="researchQuotes"]'))return;
  event.preventDefault();if(quoteState.busy)return;
  const fields=Object.fromEntries(new FormData(event.target).entries()), accessCode=fields.accessCode;
  delete fields.accessCode;delete fields.consent;fields.quantity=+fields.quantity;
  quoteState.request=fields;quoteState.busy=true;quoteState.error='';quoteState.offers=[];quoteState.message='Searching public supplier sources…';render();
  try{
    const response=await fetch('/api/quotes',{method:'POST',headers:{'content-type':'application/json','x-research-code':accessCode},body:JSON.stringify(fields)});
    const result=await response.json();if(!response.ok)throw Error(result.error || 'The research provider is unavailable.');
    quoteState.offers=result.offers;quoteState.message=result.message;
  }catch(error){quoteState.error=error.message;quoteState.message='No quote has been attached or invented.';}
  finally{quoteState.busy=false;render();}
});
A.attachQuote=d=>{
  const offer=quoteState.offers[+d.id], p=editableQuoteProposal(), l=p?.lines.find(l=>l.id===quoteState.request?.lineId);
  if(!offer || !l || S.role!=='treasurer')return toast('Choose an editable budget line first.','bad');
  if(!document.querySelector('#quoteReviewed-'+d.id)?.checked)return toast('Check the supplier source and confirm the dates, fees and conditions.','bad');
  l.quoteEvidence={...offer,reviewed:true,reviewedAt:new Date().toISOString()};l.quote=true;l.quoteFile='Dated supplier research record';
  l.quoteRequested=false;l.amount=offer.total;
  S.researchedQuotes=S.researchedQuotes || [];S.researchedQuotes.push({orgId:S.orgId,proposalId:p.id,lineId:l.id,...l.quoteEvidence});
  logEvt(S.orgId,`Attached researched supplier evidence to ${l.item}; Treasury review required`);save();A.go({id:'proposal'});toast('Evidence attached and budget updated. Treasury still needs to review it.');
};
A.downloadQuote=d=>{
  const offer=quoteState.offers[+d.id];if(!offer)return;
  const a=document.createElement('a'), url=URL.createObjectURL(new Blob([JSON.stringify({type:'Supplier research record, not a booking or vendor-issued quote',...offer},null,2)],{type:'application/json'}));
  a.href=url;a.download='supplier-research-record.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
const fixWithQuoteResearch=A.fixP;
A.fixP=d=>{if(d.type==='quote'){UI.quoteLine=d.line;A.go({id:'quotes'});return;}fixWithQuoteResearch(d);};
const proposalWithQuoteResearch=VIEWS.proposal;
VIEWS.proposal=()=>`<div class="proposal-quote-link">${actionButton('Find real supplier quotes','quotes',true)}</div>`+proposalWithQuoteResearch();
A.findLineQuote = d => { UI.quoteLine=d.id; A.go({id:'quotes'}); };
