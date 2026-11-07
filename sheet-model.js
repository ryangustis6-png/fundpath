// Cell mapping verified against the supplied Banking Club example and native template.
// Only input anchors are written. Formulas, merged layout, validation and styling survive.
const ProposalSheetModel = (() => {
  const eventCategory = cat => ({'Event: Entertainer / DJ':'Event: Entertainer','Event: Food (sample-size)':'Event: Food','Event: Promotional materials':'Event: Marketing','Trip: Hotel':'Trip: Hotels','Trip: Flight':'Trip: Flights'}[cat] || (/^Event:/.test(cat)?(['Event: Guest Speaker','Event: Space Fee'].includes(cat)?cat:'Event: Other'):/^Trip:/.test(cat)?(cat==='Trip: Gas'?cat:'Trip: Other Travel'):cat));
  const category = cat => /^(Event|Trip):/.test(cat)?eventCategory(cat):cat==='Admin: Banners'?'Banners':cat==='Admin: Storage'?'Storage':/^Capital:/.test(cat)?'Capital Item':'Admin Item';
  const isEvent = l => /^(Event|Trip):/.test(l.cat);
  const snapshot = (p,o) => JSON.stringify({org:[o.id,o.name,o.entityEmail,o.tier,o.worktag,o.president,o.presidentEmail,o.treasurer,o.treasurerEmail,o.advisor],proposal:[p.id,p.prior,p.purpose,p.ack,p.events,p.lines]});
  function inputs(p,o,settings) {
    const ev=p.lines.filter(isEvent),non=p.lines.filter(l=>!isEvent(l));
    if(p.events.length>15||ev.length>35||non.length>27)throw Error('This template holds 15 events, 35 event expenses and 27 other expenses. Nothing was copied.');
    const cells=[];const set=(row,col,value)=>cells.push({row:row-1,col:col-1,value:value??''});
    [o.name,o.entityEmail,`Tier ${o.tier} ($${settings.tierMax[o.tier]}/semester max)`,o.president,o.presidentEmail,o.treasurer,o.treasurerEmail,o.advisor,o.worktag].forEach((v,i)=>set(9+i,6,v));
    set(19,10,+p.prior||0);['hub','itemized','quotes','noGuarantee'].forEach((k,i)=>set(23+i,3,!!p.ack?.[k]));
    for(let i=0;i<15;i++){const e=p.events[i];const values=e?[e.type,e.name,[e.start,e.end].filter(Boolean).join(' to '),e.type==='Trip'?+e.travelers||0:'',e.type==='Trip'?+e.nights||0:'',e.type==='Trip'?+e.travelers||0:'']:['','','','','',''];[3,5,12,18,20,21].forEach((col,j)=>set(34+i,col,values[j]));}
    for(let i=0;i<35;i++){const l=ev[i];const values=l?[p.events.find(e=>e.id===l.eventId)?.name||'',l.item,category(l.cat),+l.amount,l.comment||'']:['','','','',''];[3,9,13,17,19].forEach((col,j)=>set(55+i,col,values[j]));}
    for(let i=0;i<27;i++){const l=non[i];const values=l?[l.item,category(l.cat),+l.amount,l.comment||'']:['','','',''];[3,9,12,14].forEach((col,j)=>set(96+i,col,values[j]));}
    // An example can contain old confirmations or decisions. Never copy these as approvals.
    [141,142,143].forEach(r=>set(r,3,false));[17,18,19,20].forEach(r=>set(r,21,''));set(152,1,'');for(let r=154;r<=160;r++){set(r,1,'');set(r,16,'');}
    for(const cell of cells)if(typeof cell.value==='number'&&!Number.isFinite(cell.value))throw Error('A budget amount is invalid. Correct it before creating a sheet.');
    return cells;
  }
  function requests(cells,sheetId){return cells.map(c=>({updateCells:{range:{sheetId,startRowIndex:c.row,endRowIndex:c.row+1,startColumnIndex:c.col,endColumnIndex:c.col+1},rows:[{values:[c.value===''?{}:{userEnteredValue:{[typeof c.value==='number'?'numberValue':typeof c.value==='boolean'?'boolValue':'stringValue']:c.value}}]}],fields:'userEnteredValue'}}));}
  function parse(rows,p,o) {
    const copy=JSON.parse(JSON.stringify(p)),org=JSON.parse(JSON.stringify(o));const at=(r,c)=>rows[r-1]?.[c-1]??'';const text=(r,c)=>String(at(r,c)).trim();
    const amount=(r,c)=>{const v=at(r,c);if(v===''||typeof v!=='number'||!Number.isFinite(v)||v<0)throw Error(`Correct the amount in row ${r} before reading the sheet.`);return v;};
    ['name','entityEmail','tier','president','presidentEmail','treasurer','treasurerEmail','advisor','worktag'].forEach((k,i)=>{if(k!=='tier')org[k]=text(9+i,6);});
    // A spreadsheet cannot establish a new eligibility tier or worktag automatically.
    if(text(11,6)!==`Tier ${o.tier} ($${p.sheetRef?.tierMax}/semester max)`||org.worktag!==o.worktag)throw Error('Tier or worktag changed. Verify these in the organization profile and create a fresh copy.');
    copy.prior=amount(19,10);copy.ack=Object.fromEntries(['hub','itemized','quotes','noGuarantee'].map((k,i)=>[k,at(23+i,3)===true]));
    copy.events=[];
    for(let i=0;i<15;i++){const r=34+i,name=text(r,5);if(!name){if([3,12,18,20,21].some(c=>text(r,c)))throw Error(`Event name missing in row ${r}.`);continue;}if(copy.events.some(e=>e.name===name))throw Error('Each event needs a distinct name for budget matching.');const type=text(r,3);if(!['Event','Trip'].includes(type))throw Error(`Choose Event or Trip in row ${r}.`);const dates=text(r,12).match(/\d{4}-\d{2}-\d{2}/g)||[];if(!dates.length)throw Error(`Use dates with a four-digit year in row ${r}.`);const old=p.events[i]||{};copy.events.push({...old,id:old.id||`GS-E-${r}`,name,type,start:dates[0],end:dates[1]||dates[0],travelers:type==='Trip'?amount(r,18):0,nights:type==='Trip'?amount(r,20):0});}
    const oldEvent=p.lines.filter(isEvent),oldNon=p.lines.filter(l=>!isEvent(l));copy.lines=[];
    const readLine=(r,event,index)=>{const item=text(r,event?9:3);const cols=event?[3,13,17,19]:[9,12,14];if(!item){if(cols.some(c=>text(r,c)))throw Error(`Budget item missing in row ${r}.`);return;}const old=(event?oldEvent:oldNon)[index],raw=text(r,event?13:9),cat=old&&category(old.cat)===raw?old.cat:raw;const eventName=event?text(r,3):'',e=copy.events.find(e=>e.name===eventName);if(event&&!e)throw Error(`Choose an existing event in row ${r}.`);const value=amount(r,event?17:12),comment=text(r,event?19:14);const line={...(old||{}),id:old?.id||`GS-L-${r}`,item,cat,amount:value,comment,eventId:e?.id||''};
      // An edited expense needs its quote checked again; never keep stale price evidence.
      if(!old||old.item!==item||+old.amount!==value||old.cat!==cat){line.quote=false;delete line.quoteEvidence;delete line.quoteFile;}
      delete line.approved;copy.lines.push(line);};
    for(let i=0;i<35;i++)readLine(55+i,true,i);for(let i=0;i<27;i++)readLine(96+i,false,i);
    return {proposal:copy,org};
  }
  return {inputs,requests,parse,snapshot,category};
})();
if(typeof module!=='undefined')module.exports=ProposalSheetModel;
