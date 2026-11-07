// Demo seed. People and most orgs are fictional; rules and process mirror Miami's real ASG + SEA materials.
const DEMO_MEETING = [
  ["President", "Alright, let's lock our Cycle 2 ASG budget before the deadline."],
  ["VP Programming", "For Speaker Meetings, we're bringing in three alumni speakers at $500 each for honoraria. We already have written quotes from all three, and it's in Farmer, free and open to all students."],
  ["Treasurer", "Speaker Meetings is on December 2nd."],
  ["VP Programming", "We might add a fourth speaker from Jefferies for Speaker Meetings, $400."],
  ["VP Education", "The Valuation Workshop is December 4th in Farmer, open to everyone, and it's a hands-on modeling session. We want sample-size snacks for about $250 so people stay through the case study."],
  ["VP Marketing", "Flyers and posters for the Valuation Workshop, $120."],
  ["VP Education", "We'll also need about $100 of supplies for the Valuation Workshop."],
  ["VP Education", "And tablecloths and table decorations for the Valuation Workshop, about $80."],
  ["Treasurer", "For the club in general, we need software subscriptions like Canva and PitchBook for $450."],
  ["President", "We also need a new banner for the involvement fair, $150."],
  ["Treasurer", "And a printer for the club office for $280, we have an Amazon quote."],
  ["VP Social", "Can we get club t-shirts for about $600?"],
  ["VP Social", "And drinks at Brick Street for Club Socials, $300."],
  ["President", "Okay FundPath, build our budget."]
];
// Scripted answers the demo playback gives to FundPath's clarifying questions
const DEMO_ANSWERS = { quote: ["VP Programming", "Yes, Jefferies sent the quote in writing."], itemize: ["VP Education", "Financial calculators and printed case packets for the workshop."], food: ["VP Education", "Yes, sample-size, during the session."], date: ["Treasurer", "Not set yet."], hub: ["President", "No, drop it."] };

// Empty workspace for a real club: no fake orgs, proposals or spending
function seedReal() {
  const S = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  return { v: 5, mode: "real", role: "treasurer", orgId: null, settings: S, orgs: [], proposals: [], spend: [], txns: [], deposits: [], threads: [], log: [], meeting: { transcript: [], built: null, stage: "idle", pipe: [] } };
}
function seedState() {
  const S = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  const ok = { hub: true, terms: true, module: true, moduleDate: "2026-08-26", access: "approved" };
  const E = (id, name, start, x = {}) => ({ id, type: "Event", name, start, end: "", onCampus: true, educational: true, openToAll: true, service: false, lateNight: false, admission: false, travelers: 0, nights: 0, ...x });
  const Lx = (id, eventId, item, cat, amount, comment = "", x = {}) => ({ id, eventId, item, cat, amount, comment, quote: false, ...x });
  const ack = { hub: true, itemized: true, quotes: true, noGuarantee: true };
  const SL = (id, lineRef, desc, expense, unit, memo, vendor) => ({ id, lineRef, desc, expense, qty: 1, unit, memo, vendor, cashAdvance: false });
  const org = (id, name, email, tier, worktag, pres, treas, advisor, hub, mission, x = {}) => ({ id, name, entityEmail: email, tier, redBrick: true, worktag, president: pres[0], presidentEmail: pres[1], treasurer: treas[0], treasurerEmail: treas[1], advisor, hub, mission, readiness: ok, agencyBalance: 500, undergradPct: 100, debt: 0, priorSpendPct: 90, spendHistory: true, hasStorage: true, deficitSemesters: 0, ...x });
  return {
    v: 5, role: "treasurer", orgId: "o1", settings: S,
    orgs: [
      org("o1", "Miami University Banking Club", "mucbc@miamioh.edu", 4, "SA10472", ["Alex R.", "alexr@miamioh.edu"], ["Ryan G.", "ryang@miamioh.edu"], "Xi Lu",
        ["Speaker Meetings", "Valuation Workshop", "Club Socials", "Club Meeting"], "prepare Miami students for careers in investment banking and finance through speakers, technical training and networking", { agencyBalance: 640 }),
      org("o2", "Miami Robotics Society", "robotics@miamioh.edu", 3, "SA10311", ["Avery Kim", "kimav@miamioh.edu"], ["Sam Ortiz", "ortizs@miamioh.edu"], "Dr. L. Chen", ["Regional Robotics Showcase"], "build hands-on engineering skills through robotics design and competition"),
      org("o3", "Oxford Food Recovery Network", "foodrecovery@miamioh.edu", 2, "SA10577", ["Riley Brooks", "brooksr@miamioh.edu"], ["Dana Lee", "leed@miamioh.edu"], "Prof. K. Owens", ["Campus Food Waste Teach-in"], "reduce campus food waste and educate students on food insecurity"),
      org("o4", "Latin Dance Collective", "latindance@miamioh.edu", 2, "SA10690", ["Sofia Ramos", "ramoss@miamioh.edu"], ["Mateo Cruz", "cruzm@miamioh.edu"], "Dr. P. Vega", ["Salsa Night Workshop"], "teach and celebrate Latin dance traditions", { readiness: { hub: true, terms: true, module: true, moduleDate: "2026-10-30", access: "pending" } }),
      org("o5", "Pre-Law Society", "prelaw@miamioh.edu", 3, "SA10205", ["Chris Nolan", "nolanc@miamioh.edu"], ["Priya Shah", "shahp@miamioh.edu"], "Dr. J. Burke", ["Law School Admissions Panel"], "prepare students for law school admissions and legal careers"),
      org("o6", "Outdoor Adventure Club", "outdoors@miamioh.edu", 2, "SA10433", ["Tess Morgan", "morgant@miamioh.edu"], ["Eli Ford", "forde@miamioh.edu"], "Dr. R. Hale", ["Winter Backcountry Trip"], "teach outdoor leadership and Leave No Trace skills"),
      org("o7", "Indie Game Dev Guild", "gamedev@miamioh.edu", 4, "SA10118", ["Noah Price", "pricen@miamioh.edu"], ["Lena Wu", "wul@miamioh.edu"], "Dr. S. Park", ["Game Jam 48"], "teach game design and programming through collaborative projects", { debt: 620 })
    ],
    proposals: [
      { id: "P-1001", orgId: "o2", semester: "Fall 2026", cycle: "Cycle 1", status: "approved", decidedBy: "FundPath auto-approval", decidedAt: "2026-09-12", submittedAt: "2026-09-12", prior: 0, ack,
        purpose: "Open robotics showcase with hands-on build stations for any Miami student, tied to our engineering-skills mission.",
        events: [E("E1", "Regional Robotics Showcase", "2026-12-05")],
        lines: [Lx("R1", "E1", "Build kits and parts for intro stations", "Event: Other", 900, "Servo kits and sensors used at the open build stations", { quote: true }), Lx("R2", "E1", "Sample-size snacks for visitors", "Event: Food (sample-size)", 600, "Sample-size snacks during the educational demos"), Lx("R3", "E1", "Showcase refreshments and supplies", "Event: Other", 300, "Drinks, cups and ice for visitors"), Lx("R4", "E1", "Shriver Center multipurpose room", "Event: Space Fee", 400, "Room for the showcase floor"), Lx("R5", "E1", "Posters and flyers", "Event: Promotional materials", 150, "")], journalPaid: {} },
      { id: "P-3001", orgId: "o3", semester: "Fall 2026", cycle: "Cycle 1", status: "approved", decidedBy: "FundPath auto-approval", decidedAt: "2026-09-20", submittedAt: "2026-09-20", prior: 0, ack,
        purpose: "Teach-in on food insecurity and how students can run food recovery shifts.",
        events: [E("E1", "Campus Food Waste Teach-in", "2026-11-30")],
        lines: [Lx("F1", "E1", "Sample-size recovered-food tasting", "Event: Food (sample-size)", 450, "Sample-size tasting during the teach-in"), Lx("F2", "E1", "Teach-in posters", "Event: Promotional materials", 150, "")], journalPaid: {} },
      { id: "P-4001", orgId: "o4", semester: "Fall 2026", cycle: "Cycle 2", status: "review", submittedAt: "2026-11-04", prior: 0, ack,
        purpose: "Beginner salsa instruction open to all students.",
        events: [E("E1", "Salsa Night Workshop", "2026-12-04", { lateNight: true })],
        lines: [Lx("D1", "E1", "Guest instructor", "Event: Entertainer / DJ", 400, "Two-hour beginner workshop", { quote: true }), Lx("D2", "E1", "Studio rental", "Event: Space Fee", 300, ""), Lx("D3", "E1", "Practice shoes for members", "Event: Other", 600, "")], journalPaid: {} },
      { id: "P-5001", orgId: "o5", semester: "Fall 2026", cycle: "Cycle 1", status: "approved", decidedBy: "FundPath auto-approval", decidedAt: "2026-09-18", submittedAt: "2026-09-18", prior: 0, ack,
        purpose: "Admissions panel open to all students covering LSAT strategy and law school financing.",
        events: [E("E1", "Law School Admissions Panel", "2026-12-02")],
        lines: [Lx("PL1", "E1", "Panel travel stipends (3 deans)", "Event: Guest Speaker", 900, "Travel for three admissions deans", { quote: true }), Lx("PL2", "E1", "Sample-size reception snacks", "Event: Food (sample-size)", 600, "Sample-size snacks during the Q&A"), Lx("PL3", "E1", "Printed programs", "Event: Promotional materials", 150, "")], journalPaid: {} },
      { id: "P-6001", orgId: "o6", semester: "Fall 2026", cycle: "Cycle 2", status: "returned", submittedAt: "2026-10-28", decidedAt: "2026-10-30", decidedBy: "ASG Funding Committee", notes: "Trip falls during winter break and overnight trips need a live hearing with an itinerary (SR §13). Move it or drop the travel lines.", prior: 0, ack,
        purpose: "Leave No Trace leadership trip with certification for trip leaders.",
        events: [{ ...E("E1", "Winter Backcountry Trip", "2027-01-04"), type: "Trip", end: "2027-01-09", travelers: 12, nights: 5 }],
        lines: [Lx("W1", "E1", "Cabins", "Trip: Hotel", 1400, "Park cabins, 5 nights", { quote: true })], journalPaid: {} },
      { id: "P-7001", orgId: "o7", semester: "Fall 2026", cycle: "Cycle 2", status: "review", submittedAt: "2026-11-05", prior: 0, ack,
        purpose: "48-hour game jam open to all majors with mentors and a public showcase.",
        events: [E("E1", "Game Jam 48", "2026-12-11", { lateNight: true })],
        lines: [Lx("G1", "E1", "Sample-size snacks for jam check-ins", "Event: Food (sample-size)", 800, "Sample-size snacks at mentor check-ins"), Lx("G2", "E1", "Benton Hall lab + AV", "Event: Space Fee", 600, "Lab space for the jam"), Lx("G3", "", "VR headsets for game testing", "Capital: Recreational electronics", 900, "Used for testing student VR games", { quote: true })], journalPaid: {} }
    ],
    spend: [
      { id: "SA-2001", kind: "SA", orgId: "o2", fund: "ASG", status: "review", descr: "ADD FUNDS", cardLast4: "4417", start: "2026-11-02", end: "2026-12-18", created: "2026-11-03",
        justification: "Funds for the Regional Robotics Showcase on Dec 5 per our approved ASG proposal: build kits from SparkFun, snacks from Kroger, reception supplies, and room fee. No clothing with Miami's name or logo.",
        proofBudget: true, proofFunds: true, wd: { status: "Submitted", id: "SA-0091882" },
        lines: [SL("a", "R2", "Sample-size snacks for visitors", "SC0282 Student Hospitality (Food)", 600, "Kroger snack trays, sample-size portions", "Kroger"), SL("b", "R3", "Showcase refreshments and supplies", "SC0309 Supplies - Office (Event Supplies/Decorations)", 300, "2 cases Bud Light + soda, cups and ice for the reception", "Kroger"), SL("c", "R4", "Room rental", "SC0399 Facility (on-campus rental)", 400, "Shriver Center room rental", "Shriver Center"), SL("d", "", "VR headset for the demo table", "SC0309 Supplies - Office (Event Supplies/Decorations)", 450, "Meta Quest for demos", "Best Buy"), SL("e", "R1", "Build kits and parts", "SC0309 Supplies - Office (Event Supplies/Decorations)", 900, "Servo kits and sensors", "SparkFun")],
        history: [{ at: "2026-11-03", who: "Sam Ortiz", action: "Submitted" }, { at: "2026-11-05", who: "Dr. L. Chen (advisor)", action: "Approved" }] },
      { id: "SA-3001", kind: "SA", orgId: "o3", fund: "ASG", status: "advisor", descr: "NEW CARD", start: "2026-11-06", end: "2026-12-18", created: "2026-11-06",
        justification: "New card for the Campus Food Waste Teach-in on Nov 30: tasting from a local caterer and posters from Staples Print. No clothing with Miami's name or logo.", proofBudget: true, proofFunds: true, wd: { status: "Submitted", id: "SA-0091907" },
        lines: [SL("a", "F1", "Sample-size recovered-food tasting", "SC0282 Student Hospitality (Food)", 450, "Sample-size tasting", "Oxford caterer"), SL("b", "F2", "Teach-in posters", "SC0335 Advertising", 150, "Posters around campus", "Staples Print")],
        history: [{ at: "2026-11-06", who: "Dana Lee", action: "Submitted" }] },
      { id: "SA-5001", kind: "SA", orgId: "o5", fund: "ASG", status: "active", descr: "NEW CARD", start: "2026-10-01", end: "2026-12-18", created: "2026-10-01", cardLast4: "2290",
        justification: "Card for the Law School Admissions Panel: sample-size reception snacks and printed programs. No clothing with Miami's name or logo.", proofBudget: true, proofFunds: true, wd: { status: "Approved", id: "SA-0090455" },
        lines: [SL("a", "PL2", "Sample-size reception snacks", "SC0282 Student Hospitality (Food)", 600, "Reception snacks", "Oxford caterer"), SL("b", "PL3", "Printed programs", "SC0335 Advertising", 150, "Programs", "Miami Print Services")],
        history: [{ at: "2026-10-01", who: "Priya Shah", action: "Submitted" }, { at: "2026-10-05", who: "Accounts Payable", action: "Approved; card loaded" }, { at: "2026-10-07", who: "Priya Shah", action: "Picked up card" }] }
    ],
    txns: [
      { id: "T-5101", orgId: "o5", saId: "SA-5001", lineRef: "PL3", date: "2026-10-20", merchant: "Miami Print Services", amount: 142.5, receiptDone: true, q: { who: "Priya Shah", what: "Printed programs", when: "2026-10-20", where: "Miami Print Services", how: "Org card ending 2290", why: "Admissions panel" }, file: "programs.pdf" },
      { id: "T-5102", orgId: "o5", saId: "SA-5001", lineRef: "PL2", date: "2026-10-28", merchant: "Oxford caterer", amount: 560, receiptDone: false, q: {}, file: "" }
    ],
    deposits: [
      { id: "DP-11", orgId: "o1", source: "Card reader settlement", payType: "Visa/MC/Discover/Debit", rc: "RC0244", amount: 420, received: "2026-10-15", deposited: "2026-10-15", recorded: "2026-10-16", receipt: "settlement_1015.jpg", memo: "Member dues" }
    ],
    meeting: { transcript: [], built: null },
    threads: [
      { id: "Q-71", orgId: "o1", status: "answered", subject: "Can we buy pizza for a general meeting?", created: "2026-10-28",
        msgs: [{ from: "user", who: "Ryan G.", text: "Can we buy pizza for a general meeting?" }, { from: "ai", who: "FundPath AI", text: "Usually not. ASG only funds food when it's educational and sample-size, and never for large events, banquets or galas (SR §19.1). Your Tier IV food limit is $1,000 per semester.", rules: ["LIMFOOD", "NOTFUNDED"] }, { from: "user", who: "Ryan G.", text: "Sent to ASG Financial Services.", system: true }, { from: "asg", who: "ASG Financial Services · asgfunding@miamioh.edu", text: "Correct. A regular member meeting with pizza won't be funded. A sample-size tasting at an open educational event can be." }] },
      { id: "Q-74", orgId: "o3", status: "open", subject: "Member paid sales tax on supplies", created: "2026-11-06",
        msgs: [{ from: "user", who: "Dana Lee", text: "A member bought supplies with their own card and paid sales tax. Can we reimburse that?" }, { from: "ai", who: "FundPath AI", text: "Reimbursements are a last resort, so contact Accounts Payable first. Student orgs are tax-exempt in certain states, and the forms are on the AP website.", rules: ["SAMATCH"] }, { from: "user", who: "Dana Lee", text: "Sent to ASG Financial Services.", system: true }] }
    ],
    log: []
  };
}
