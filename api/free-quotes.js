// Free-plan-only search. No model endpoint, paid fallback, booking or outreach.
const domains=['hilton.com','marriott.com','hyatt.com','ihg.com','enterprise.com','hertz.com','avis.com','budget.com','aa.com','delta.com','southwest.com','aaespeakers.com','speakers.com'];
function extractOffer(page,item){
 let url;try{url=new URL(page.url);}catch{return null;}if(url.protocol!=='https:'||!domains.some(d=>url.hostname===d||url.hostname.endsWith('.'+d)))return null;
 const body=String(page.markdown||'');if(!body.toLowerCase().includes(item.destination.toLowerCase()))return null;const blocks=body.split(/\n\s*\n/);
 for(const block of blocks){if(!block.includes(item.start)||!block.includes(item.end)||!new RegExp(`\\b${item.quantity}\\s+(?:rooms?|vehicles?|tickets?|speakers?)\\b`,'i').test(block)||!/including (?:all )?(?:taxes|fees)/i.test(block))continue;
  if(/starting (?:at|from)|per night|per day|estimated total/i.test(block))continue;
  const price=block.match(/\b(?:grand total|total (?:for (?:the )?(?:entire|full) (?:stay|rental|service)|including (?:all )?taxes(?: and fees)?))\s*:?\s*(?:USD\s*|\$)([\d,]+(?:\.\d{2})?)/i);if(!price)continue;
  return {supplier:url.hostname,title:item.item,total:+price[1].replace(/,/g,''),currency:'USD',sourceUrl:url.href,start:item.start,end:item.end,quantity:item.quantity,conditions:block.slice(0,1600),evidence:[block.slice(0,1600)],kind:'researched_offer',reviewed:false,retrievedAt:new Date().toISOString()};
 }return null;
}
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');if(req.method!=='POST')return res.status(405).json({error:'Use the draft quote search.'});
 if(process.env.FIRECRAWL_FREE_ONLY_VERIFIED!=='true'||!process.env.FIRECRAWL_API_KEY)return res.status(501).json({error:'Free-only web research is not connected. Configure a no-card Firecrawl Free account; no paid fallback is used.'});
 let input;try{input=typeof req.body==='string'?JSON.parse(req.body):req.body||{};}catch{return res.status(400).json({error:'Invalid request.'});}
 const items=input.items;if(!Array.isArray(items)||items.length<1||items.length>4||items.some(i=>!i.id||typeof i.item!=='string'||i.item.length>200||typeof i.destination!=='string'||i.destination.length>160||!i.destination||!/^\d{4}-\d{2}-\d{2}$/.test(i.start)||!/^\d{4}-\d{2}-\d{2}$/.test(i.end)||i.start>i.end||!Number.isInteger(i.quantity)||i.quantity<1||i.quantity>100))return res.status(400).json({error:'Provide locations, dates and quantities for at most four items.'});
 try{const results=[];for(const item of items){const r=await fetch('https://api.firecrawl.dev/v2/search',{method:'POST',signal:AbortSignal.timeout(25000),headers:{Authorization:'Bearer '+process.env.FIRECRAWL_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({query:`${item.item} ${item.destination} ${item.start} ${item.end} ${item.quantity} total including taxes fees`,limit:3,sources:[{type:'web'}],includeDomains:domains,domainTools:false,scrapeOptions:{formats:['markdown']}})});if(!r.ok)return res.status(503).json({error:'Free research is unavailable or its quota is exhausted. No paid fallback was attempted.'});const data=await r.json(),pages=data.data?.web||[],offers=pages.map(p=>extractOffer(p,item)).filter(Boolean).sort((a,b)=>a.total-b.total);results.push({id:item.id,offer:offers[0]||null,message:offers.length?'A source-supported total was found.':'No exact dated, full-quantity, tax-inclusive total was verifiable. A supplier-issued quote is still needed.'});}return res.status(200).json({results});}catch{return res.status(503).json({error:'Free research did not finish. No paid fallback was attempted.'});}
};
module.exports.extractOffer=extractOffer;
