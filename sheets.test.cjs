const assert=require('node:assert/strict'),model=require('./sheet-model');
const org={id:'o',name:'Example organization',entityEmail:'org@example.edu',tier:4,worktag:'SA12345',president:'President',treasurer:'Treasurer',advisor:'Advisor'};
const settings={tierMax:{4:5000}},p={id:'P',prior:0,purpose:'Education',ack:{},events:[{id:'E',name:'Workshop',type:'Event',start:'2099-06-01',end:'2099-06-01',onCampus:true}],lines:[{id:'L',item:'Lunch',cat:'Event: Food (sample-size)',amount:25,eventId:'E',comment:'Workshop',quote:true,quoteEvidence:{total:25}},{id:'N',item:'Banner',cat:'Admin: Banners',amount:100,comment:'Outreach'}],sheetRef:{tierMax:5000}};
const cells=model.inputs(p,org,settings),requests=model.requests(cells,19),rows=[];
for(const c of cells){rows[c.row]??=[];rows[c.row][c.col]=c.value;}
for(const r of requests){assert.equal(Object.keys(r).length,1);assert.equal(r.updateCells.fields,'userEnteredValue');assert.equal(r.updateCells.range.sheetId,19);assert.equal(r.updateCells.rows.length,1);assert.equal(r.updateCells.rows[0].values.length,1);}
assert.equal(rows[54][12],'Event: Food');assert.equal(rows[95][8],'Banners');assert.equal(rows[140][2],false);assert.equal(rows[141][2],false);assert.equal(rows[142][2],false);
assert.equal(rows[55][8],'','Old sample expense must be cleared');assert.equal(rows[34][4],'','Old sample event must be cleared');
assert.equal(cells.some(c=>c.row===5&&c.col===2),false,'Do not overwrite formulas');assert.equal(cells.some(c=>c.row===54&&c.col===24),false);
let parsed=model.parse(rows,p,org);assert.equal(parsed.proposal.lines[0].cat,p.lines[0].cat);assert.ok(parsed.proposal.lines[0].quoteEvidence);assert.equal(parsed.proposal.lines[1].cat,'Admin: Banners');
rows[54][16]=30;parsed=model.parse(rows,p,org);assert.equal(parsed.proposal.lines[0].amount,30);assert.equal(parsed.proposal.lines[0].quote,false);assert.equal(parsed.proposal.lines[0].quoteEvidence,undefined);
rows[54][16]=-30;assert.throws(()=>model.parse(rows,p,org),/Correct the amount/);rows[54][16]=30;
rows[10][5]='Tier 1 ($1000/semester max)';assert.throws(()=>model.parse(rows,p,org),/Tier or worktag/);rows[10][5]='Tier 4 ($5000/semester max)';
const tooMany={...p,events:Array.from({length:16},()=>p.events[0])};assert.throws(()=>model.inputs(tooMany,org,settings),/15 events/);
const hostile={...p,lines:[{...p.lines[0],item:'=IMPORTXML("https://example.invalid")'}]};const literal=model.requests(model.inputs(hostile,org,settings),19).find(r=>r.updateCells.range.startRowIndex===54&&r.updateCells.range.startColumnIndex===8);assert.equal(literal.updateCells.rows[0].values[0].userEnteredValue.stringValue,hostile.lines[0].item);
console.log('PASS: verified template anchors, safe literal writes, no formula/format edits, stale example clearing, reset submission confirmations, edited amount round-trip, quote invalidation, tier guard and capacity checks');
