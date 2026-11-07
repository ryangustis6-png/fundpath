const vm = require('node:vm'), fs=require('node:fs'), assert=require('node:assert/strict');
const context=vm.createContext({console, Date, Math, setTimeout:()=>{}, clearTimeout:()=>{}, URL, Blob,
  window:{scrollTo(){},addEventListener(){},location:{hash:''}}, location:{hash:''},
  document:{addEventListener(){},querySelector(){return null},querySelectorAll(){return []}},
  localStorage:{getItem(){return null},setItem(){}}, navigator:{},});
for (const file of ['rules.js','engine.js','data.js','importer.js','app.js','features.js','workflow.js']) vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
vm.runInContext(`
S=seedState(); S.mode='demo'; render=()=>{}; toast=()=>{};
const org=S.orgs[0]; S.orgId=org.id; org.agencyBalance=640;
S.spend=[]; S.txns=[]; S.deposits=[];
const agency={id:'SA-9999',kind:'SA',orgId:org.id,fund:'Agency',status:'review',lines:[{qty:1,unit:200}],history:[]}; S.spend.push(agency);
if(cardBalances(S,org.id).agencyAccount!==640) throw Error('Pending request must not allocate');
agency.status='approved';
if(cardBalances(S,org.id).agencyAccount!==440 || cardBalances(S,org.id).agencyCard!==200) throw Error('Allocation');
S.txns.push({id:'T-9999',saId:agency.id,orgId:org.id,amount:50});
if(cardBalances(S,org.id).agencyCard!==150) throw Error('Card spend');
S.role='treasurer'; A.sweepAgency(); if(agency.sweptAt) throw Error('Unauthorized sweep');
S.role='ap'; A.sweepAgency(); A.sweepAgency();
if(cardBalances(S,org.id).agencyAccount!==590 || cardBalances(S,org.id).agencyCard!==0) throw Error('Sweep must return unused funds once');
const before=agency.status; S.role='asg'; A.apApprove({id:agency.id}); if(agency.status!==before) throw Error('Treasury may not approve AP');
S.role='treasurer'; A.pickup({id:agency.id}); if(agency.status!==before) throw Error('Closed card may not be picked up');
// Render all roles/views against realistic seed data; this catches broken navigation and templates.
S=seedState(); S.mode='demo';
for(const [role,nav] of Object.entries(NAV)) { S.role=role; for(const [view] of nav){ UI.view=view; UI.saId=null; const html=VIEWS[view](); if(typeof html!=='string') throw Error('Invalid view '+view); } }
`,context);
assert.ok(true); console.log('PASS: allocation, charges, sweep idempotency, role guards, pickup guards, every role/view render');
vm.runInContext(`
S=seedState(); S.mode='demo'; S.role='treasurer'; S.orgId=S.orgs[0].id; S.proposals=[]; S.spend=[]; S.txns=[];
S.settings.window={open:'2000-01-01',close:'2099-12-31'}; S.settings.saCutoff='2099-12-31';
const draft={id:'P-9000',orgId:S.orgId,semester:S.settings.semester,status:'draft',prior:0,ack:{hub:true,itemized:true,quotes:true,noGuarantee:true},purpose:'Support our student organization educational mission through campus outreach and recruitment.',events:[],lines:[{id:'L-9000',item:'Printed club recruitment banner',cat:'Admin: Banners',amount:150,comment:'Campus outreach for our student educational organization'}],journalPaid:{}};
S.proposals.push(draft);
const evaluated=evaluateProposal(draft,ORG(),S.settings); if(!evaluated.auto) throw Error(JSON.stringify(evaluated.flags));
A.submitProposal(); if(draft.status!=='approved' || S.spend.length!==1 || S.spend[0].status!=='review') throw Error('Auto approval must route to AP');
A.submitProposal(); if(S.spend.length!==1) throw Error('Repeated submission created duplicate');
const generated=S.spend[0]; if(!matchesApprovedCardBudget(generated,S)) throw Error('Generated authorization mismatch');
generated.lines[0].unit=149; if(matchesApprovedCardBudget(generated,S)) throw Error('Mismatch accepted'); generated.lines[0].unit=150;
S.role='asg'; A.apApprove({id:generated.id}); if(generated.status!=='review') throw Error('Treasury bypassed AP');
S.role='ap'; A.apApprove({id:generated.id}); if(generated.status!=='approved' || !generated.humanAPDecision) throw Error('AP approval failed');
S.role='treasurer'; A.pickup({id:generated.id}); if(generated.status!=='active') throw Error('Pickup failed');
S.proposals=[]; S.spend=[]; const blocked=JSON.parse(JSON.stringify(draft)); blocked.status='draft'; blocked.lines[0].amount=999999; S.proposals.push(blocked); A.submitProposal(); if(blocked.status!=='review' || S.spend.length) throw Error('Noncompliant submission not routed to Treasury');
`,context);
console.log('PASS: compliant proposal → simulated authorization → mandatory AP → pickup; duplicate and mismatch guards; noncompliant Treasury routing');

vm.runInContext(`
if (liveElevenLabsEnabled !== false) throw Error('Live billing opt-in must default off');
A.startAgent();
if (conversationStarting || liveConversation) throw Error('Disabled agent attempted connection');
const overspend=JSON.parse(JSON.stringify(agency)); overspend.status='review'; overspend.lines=[{id:'L',qty:1,unit:99999,desc:'Office pencils',memo:'Office pencils'}]; overspend.fund='Agency'; overspend.sweptAt=null; overspend.sweepAmount=0;
if(!evaluateSpend(overspend,S).flags.some(f=>f.rule==='FUNDSFIRST' && f.level==='deny')) throw Error('Agency over-allocation accepted');
`,context);
console.log('PASS: live ElevenLabs disabled on load; Agency over-allocation blocked');
