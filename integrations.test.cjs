const assert=require('node:assert/strict'),central=require('./api/central'),quotes=require('./api/quotes'),connections=require('./api/connections');
const html='<h2><a href="/student_community?club_id=35700">Miami University Banking Club</a></h2><img alt="Red Brick Rewards Fall 2026 Tier 1"><p id="club_35700"><strong>Mission</strong><br>Hands-on financial education.</p><h2><a href="/student_community?club_id=42">Another Group</a></h2><p id="club_42">Mission A different mission.</p>';
const groups=central.parseDirectory(html);assert.equal(groups.length,2);assert.equal(groups[0].tier,1);assert.equal(groups[1].tier,null);assert.equal(groups[0].mission,'Hands-on financial education.');
const request={start:'2099-06-01',end:'2099-06-03',quantity:2};
const offer={supplier:'Supplier',title:'Hotel rooms',total:400,currency:'USD',sourceUrl:'https://www.hilton.com/offer',...request};
const response=(o,citations=[{url:offer.sourceUrl,cited_text:'Total for requested rooms: $400.'}])=>({content:[{type:'text',text:JSON.stringify({offers:[o]}),citations}]});
assert.equal(quotes.offersFromResponse(response(offer),request).length,1);
for(const bad of [{...offer,total:999},{...offer,start:'2099-05-01'},{...offer,sourceUrl:'javascript:alert(1)'},{...offer,sourceUrl:'https://hilton.com.attacker.invalid/offer'}])assert.equal(quotes.offersFromResponse(response(bad),request).length,0);
assert.equal(quotes.offersFromResponse(response(offer,[]),request).length,0);
const res=()=>({code:200,status(n){this.code=n;return this},json(data){this.data=data;return this},setHeader(){}});
(async()=>{const oldEnabled=process.env.QUOTE_RESEARCH_ENABLED,oldFetch=global.fetch;process.env.QUOTE_RESEARCH_ENABLED='false';let calls=0;global.fetch=async()=>{calls++;throw Error('No provider calls allowed')};
try{const r=res();await quotes({method:'POST',headers:{},body:{}},r);assert.equal(r.code,501);assert.equal(calls,0);const config=res();await connections({method:'GET'},config);assert.equal(config.data.billingVerified,false);assert.equal(config.data.paidServicesEnabled,false);assert.ok(!('apiKey' in config.data));
 const previous={};for(const name of ['ANTHROPIC_API_KEY','ELEVENLABS_API_KEY','QUOTE_RESEARCH_ENABLED','QUOTE_RESEARCH_ACCESS_CODE'])previous[name]=process.env[name];
 try{process.env.ANTHROPIC_API_KEY='mock-key';process.env.ELEVENLABS_API_KEY='mock-key';process.env.QUOTE_RESEARCH_ENABLED='true';process.env.QUOTE_RESEARCH_ACCESS_CODE='mock-code-at-least-twelve';
  for(const name of ['ai','tts','stt','quotes']){const locked=res();await require('./api/'+name)({method:'POST',headers:{},body:{}},locked);assert.equal(locked.code,501);assert.match(locked.data.error,/paused/);}assert.equal(calls,0);
 }finally{for(const [name,value] of Object.entries(previous))if(value===undefined)delete process.env[name];else process.env[name]=value;}
}
finally{global.fetch=oldFetch;if(oldEnabled===undefined)delete process.env.QUOTE_RESEARCH_ENABLED;else process.env.QUOTE_RESEARCH_ENABLED=oldEnabled;}
console.log('PASS: campus parser, tier isolation, cited prices, date matching, URL restrictions, default-off provider calls and secret-free status');})().catch(e=>{console.error(e);process.exitCode=1});
