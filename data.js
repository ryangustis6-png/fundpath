// Demo seed. Organizations and people are fictional; rules and process mirror Miami's real ASG + SEA materials.
function seedState() {
  const S = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  const ok = { hub: true, terms: true, module: true, moduleDate: "2026-08-26", access: "approved" };
  const E = (id, type, name, start, end, x = {}) => ({ id, type, name, start, end, ...x });
  const Lx = (id, eventId, item, cat, amount, comment = "", x = {}) => ({ id, eventId, item, cat, amount, comment, quote: false, ...x });
  const ack = { hub: true, itemized: true, quotes: true, noGuarantee: true };
  const SL = (id, lineRef, desc, expense, unit, memo, vendor, x = {}) => ({ id, lineRef, desc, expense, qty: 1, unit, memo, vendor, cashAdvance: false, ...x });
  return {
    v: 4, role: "treasurer", orgId: "o1", settings: S,
    orgs: [
      { id: "o1", name: "Redhawk Entrepreneurs Club", entityEmail: "rhentrepreneurs@miamioh.edu", tier: 4, redBrick: true, worktag: "SA10482",
        president: "Jordan Patel", presidentEmail: "pateljr@miamioh.edu", treasurer: "Ryan G.", treasurerEmail: "treasurer.rhec@miamioh.edu", advisor: "Dr. M. Alvarez",
        hub: ["Speaker Series", "Founder Speaker Night", "Chicago Finance Trek", "Fall Pitch Night"], readiness: ok, agencyBalance: 640, penalty: false,
        mission: "help Miami students learn to evaluate, start and finance new ventures through speakers, workshops and pitch competitions" },
      { id: "o2", name: "Miami Robotics Society", entityEmail: "robotics@miamioh.edu", tier: 3, redBrick: true, worktag: "SA10311", president: "Avery Kim", presidentEmail: "kimav@miamioh.edu", treasurer: "Sam Ortiz", treasurerEmail: "ortizs@miamioh.edu", advisor: "Dr. L. Chen",
        hub: ["Regional Robotics Showcase"], readiness: ok, agencyBalance: 1200, penalty: false, mission: "build hands-on engineering skills through robotics design and competition" },
      { id: "o3", name: "Oxford Food Recovery Network", entityEmail: "foodrecovery@miamioh.edu", tier: 2, redBrick: true, worktag: "SA10577", president: "Riley Brooks", presidentEmail: "brooksr@miamioh.edu", treasurer: "Dana Lee", treasurerEmail: "leed@miamioh.edu", advisor: "Prof. K. Owens",
        hub: ["Campus Food Waste Teach-in"], readiness: ok, agencyBalance: 300, penalty: false, mission: "reduce campus food waste and educate students on food insecurity" },
      { id: "o4", name: "Latin Dance Collective", entityEmail: "latindance@miamioh.edu", tier: 2, redBrick: true, worktag: "SA10690", president: "Sofia Ramos", presidentEmail: "ramoss@miamioh.edu", treasurer: "Mateo Cruz", treasurerEmail: "cruzm@miamioh.edu", advisor: "Dr. P. Vega",
        hub: ["Salsa Night Workshop"], readiness: { hub: true, terms: true, module: true, moduleDate: "2026-10-30", access: "pending" }, agencyBalance: 90, penalty: false, mission: "teach and celebrate Latin dance traditions" },
      { id: "o5", name: "Pre-Law Society", entityEmail: "prelaw@miamioh.edu", tier: 3, redBrick: true, worktag: "SA10205", president: "Chris Nolan", presidentEmail: "nolanc@miamioh.edu", treasurer: "Priya Shah", treasurerEmail: "shahp@miamioh.edu", advisor: "Dr. J. Burke",
        hub: ["Law School Admissions Panel"], readiness: ok, agencyBalance: 2100, penalty: false, mission: "prepare students for law school admissions and legal careers" },
      { id: "o6", name: "Outdoor Adventure Club", entityEmail: "outdoors@miamioh.edu", tier: 2, redBrick: true, worktag: "SA10433", president: "Tess Morgan", presidentEmail: "morgant@miamioh.edu", treasurer: "Eli Ford", treasurerEmail: "forde@miamioh.edu", advisor: "Dr. R. Hale",
        hub: ["Winter Backcountry Trip"], readiness: ok, agencyBalance: 450, penalty: false, mission: "teach outdoor leadership and Leave No Trace skills" },
      { id: "o7", name: "Indie Game Dev Guild", entityEmail: "gamedev@miamioh.edu", tier: 4, redBrick: true, worktag: "SA10118", president: "Noah Price", presidentEmail: "pricen@miamioh.edu", treasurer: "Lena Wu", treasurerEmail: "wul@miamioh.edu", advisor: "Dr. S. Park",
        hub: ["Game Jam 48"], readiness: ok, agencyBalance: 800, penalty: true, mission: "teach game design and programming through collaborative projects" }
    ],
    proposals: [
      { id: "P-1101", orgId: "o1", semester: "Fall 2026", status: "draft", created: "2026-11-02", prior: 0, ack: { hub: true, itemized: true, quotes: false, noGuarantee: true },
        purpose: "Speakers and a trip.",
        events: [E("E1", "Event", "Speaker Series", "2026-09-01", "2026-12-11", { allSemester: true }), E("E2", "Event", "Founders Speaker Night", "2026-12-03", ""), E("E3", "Trip", "Chicago Trek", "2026-12-19", "2026-12-21", { hotelPeople: 8, hotelNights: 2, flightPeople: 0 })],
        lines: [
          Lx("L1", "E1", "Weekly speaker honoraria (4 alumni speakers)", "Event: Guest Speaker", 1300, "Four alumni speakers on deal process, credit and venture financing"),
          Lx("L2", "E2", "Founder keynote fee", "Event: Guest Speaker", 1800, "Keynote from a Cincinnati founder, open to all students"),
          Lx("L3", "E2", "Catered dinner", "Event: Food", 1100, "Dinner for about 80 attendees"),
          Lx("L4", "E2", "Reception wine", "Event: Other", 300, "Wine for the reception"),
          Lx("L9", "E2", "Reception refreshments, cups and ice", "Event: Other", 150, ""),
          Lx("L5", "E3", "Hotel (4 rooms × 2 nights)", "Trip: Hotel", 1200, "Downtown hotel near the firms we're visiting"),
          Lx("L6", "", "Club subscriptions (Canva, website, PitchBook EDU)", "Admin Item", 300, "Design and research tools used at weekly meetings"),
          Lx("L7", "", "Misc", "Marketing", 200, ""),
          Lx("L8", "", "Space heater for outdoor pitch events", "Capital Item", 270, "Kept for future outdoor events")
        ], journalPaid: {} },
      { id: "P-1001", orgId: "o2", semester: "Fall 2026", status: "approved", decidedBy: "FundPath auto-approval", decidedAt: "2026-09-12", submittedAt: "2026-09-12", prior: 0, ack,
        purpose: "Open robotics showcase with hands-on build stations for any Miami student, tied to our engineering-skills mission.",
        events: [E("E1", "Event", "Regional Robotics Showcase", "2026-12-05", "")],
        lines: [
          Lx("R1", "E1", "Build kits and parts for intro stations", "Event: Other", 900, "Servo kits and sensors used at the open build stations", { quote: true }),
          Lx("R2", "E1", "Showcase lunch", "Event: Food", 750, "Boxed lunch for visitors and volunteers"),
          Lx("R3", "E1", "Showcase refreshments and supplies", "Event: Other", 300, "Drinks, cups and ice for visitors"),
          Lx("R4", "E1", "Shriver Center multipurpose room", "Event: Space Fee", 400, "Room for the showcase floor"),
          Lx("R5", "E1", "Posters and flyers", "Event: Marketing", 200, "")
        ], journalPaid: {} },
      { id: "P-3001", orgId: "o3", semester: "Fall 2026", status: "approved", decidedBy: "FundPath auto-approval", decidedAt: "2026-09-20", submittedAt: "2026-09-20", prior: 0, ack,
        purpose: "Teach-in on food insecurity and how students can run food recovery shifts.",
        events: [E("E1", "Event", "Campus Food Waste Teach-in", "2026-11-30", "")],
        lines: [Lx("F1", "E1", "Recovered-food lunch", "Event: Food", 450, "Lunch for teach-in attendees"), Lx("F2", "E1", "Teach-in posters", "Event: Marketing", 200, ""), Lx("F3", "E1", "Reusable serving trays", "Capital Item", 180, "")], journalPaid: {} },
      { id: "P-4001", orgId: "o4", semester: "Fall 2026", status: "review", submittedAt: "2026-11-04", prior: 0, ack,
        purpose: "Beginner salsa instruction.",
        events: [E("E1", "Event", "Salsa Night Workshop", "2026-12-04", "")],
        lines: [Lx("D1", "E1", "Guest instructor", "Event: Entertainer", 400, "Two-hour beginner workshop"), Lx("D2", "E1", "Studio rental", "Event: Space Fee", 300, ""), Lx("D3", "E1", "Event t-shirts", "Event: Other", 600, "")], journalPaid: {} },
      { id: "P-5001", orgId: "o5", semester: "Fall 2026", status: "approved", decidedBy: "FundPath auto-approval", decidedAt: "2026-09-18", submittedAt: "2026-09-18", prior: 0, ack,
        purpose: "Admissions panel covering LSAT strategy, personal statements and law school financing, open to all students.",
        events: [E("E1", "Event", "Law School Admissions Panel", "2026-12-02", "")],
        lines: [Lx("PL1", "E1", "Panel travel stipends (3 deans)", "Event: Guest Speaker", 900, "Travel for three admissions deans"), Lx("PL2", "E1", "Reception food", "Event: Food", 600, "Food for about 70 attendees"), Lx("PL3", "E1", "Printed programs", "Event: Marketing", 150, "")], journalPaid: {} },
      { id: "P-6001", orgId: "o6", semester: "Fall 2026", status: "returned", submittedAt: "2026-10-28", decidedAt: "2026-10-30", decidedBy: "ASG Funding Committee", notes: "Trip falls during winter break. Move it before Dec 19 or drop the travel lines and resubmit.", prior: 0, ack,
        purpose: "Week-long Leave No Trace leadership trip with certification for trip leaders.",
        events: [E("E1", "Trip", "Winter Backcountry Trip", "2027-01-04", "2027-01-09", { hotelPeople: 12, hotelNights: 5 })],
        lines: [Lx("W1", "E1", "Van rental", "Trip: Other Travel", 900, "One 12-passenger van"), Lx("W2", "E1", "Cabins", "Trip: Hotel", 1400, "Park cabins, 5 nights", { quote: true })], journalPaid: {} },
      { id: "P-7001", orgId: "o7", semester: "Fall 2026", status: "review", submittedAt: "2026-11-05", prior: 0, ack,
        purpose: "48-hour game jam open to all majors with mentors and a public showcase.",
        events: [E("E1", "Event", "Game Jam 48", "2026-12-11", "")],
        lines: [Lx("G1", "E1", "Meals for 48 hours", "Event: Food", 1000, "Meals for about 120 participants"), Lx("G2", "E1", "Benton Hall lab + AV", "Event: Space Fee", 600, "Lab space for the jam"), Lx("G3", "", "VR headsets for the club", "Capital Item", 900, "Kept for future jams", { quote: false })], journalPaid: {} }
    ],
    spend: [
      { id: "SA-2001", kind: "SA", orgId: "o2", fund: "ASG", status: "review", descr: "ADD FUNDS", cardLast4: "4417", start: "2026-11-02", end: "2026-12-18", created: "2026-11-03",
        justification: "Funds for the Regional Robotics Showcase on Dec 5 per our approved ASG proposal: build kits from SparkFun, boxed lunches from Jimmy John's, reception supplies from Kroger, and room fee. No clothing with Miami's name or logo.",
        proofBudget: true, proofFunds: true,
        lines: [
          SL("a", "R2", "Showcase lunch", "SC0282 Student Hospitality (Food)", 600, "Jimmy John's boxed lunches for 150 visitors", "Jimmy John's"),
          SL("b", "R3", "Showcase refreshments and supplies", "SC0309 Supplies - Office (Event Supplies/Decorations)", 300, "2 cases Bud Light + soda, cups and ice for the reception", "Kroger"),
          SL("c", "R4", "Room rental", "SC0399 Facility (on-campus rental)", 400, "Shriver Center room rental", "Shriver Center"),
          SL("d", "", "VR headset for the demo table", "SC0309 Supplies - Office (Event Supplies/Decorations)", 450, "Meta Quest for demos", "Best Buy"),
          SL("e", "R1", "Build kits and parts", "SC0309 Supplies - Office (Event Supplies/Decorations)", 900, "Servo kits and sensors", "SparkFun")
        ], history: [{ at: "2026-11-03", who: "Sam Ortiz", action: "Submitted" }, { at: "2026-11-05", who: "Dr. L. Chen (advisor)", action: "Approved" }] },
      { id: "SA-3001", kind: "SA", orgId: "o3", fund: "ASG", status: "advisor", descr: "NEW CARD", start: "2026-11-06", end: "2026-12-18", created: "2026-11-06",
        justification: "New card for the Campus Food Waste Teach-in on Nov 30: lunch from a local caterer and posters from Miami Print Services. No clothing with Miami's name or logo.",
        proofBudget: true, proofFunds: true,
        lines: [SL("a", "F1", "Recovered-food lunch", "SC0282 Student Hospitality (Food)", 450, "Lunch for teach-in attendees", "Oxford caterer"), SL("b", "F2", "Teach-in posters", "SC0335 Advertising", 200, "Posters around campus", "Staples Print")],
        history: [{ at: "2026-11-06", who: "Dana Lee", action: "Submitted" }] },
      { id: "SA-5001", kind: "SA", orgId: "o5", fund: "ASG", status: "active", descr: "NEW CARD", start: "2026-10-01", end: "2026-12-18", created: "2026-10-01", cardLast4: "2290",
        justification: "Card for the Law School Admissions Panel: reception food and printed programs. No clothing with Miami's name or logo.", proofBudget: true, proofFunds: true,
        lines: [SL("a", "PL2", "Reception food", "SC0282 Student Hospitality (Food)", 600, "Reception food", "Oxford caterer"), SL("b", "PL3", "Printed programs", "SC0337 Printing and Copying", 150, "Programs", "Miami Print Services")],
        history: [{ at: "2026-10-01", who: "Priya Shah", action: "Submitted" }, { at: "2026-10-02", who: "Dr. J. Burke (advisor)", action: "Approved" }, { at: "2026-10-05", who: "Accounts Payable", action: "Approved; card loaded" }, { at: "2026-10-07", who: "Priya Shah", action: "Picked up card" }] }
    ],
    txns: [
      { id: "T-5101", orgId: "o5", saId: "SA-5001", lineRef: "PL3", date: "2026-10-20", merchant: "Miami Print Services", amount: 142.5, receiptDone: true, q: { who: "Priya Shah", what: "120 printed programs", when: "2026-10-20", where: "Miami Print Services", how: "Org card ending 2290", why: "Admissions panel programs" }, file: "programs_receipt.pdf" },
      { id: "T-5102", orgId: "o5", saId: "SA-5001", lineRef: "PL2", date: "2026-10-28", merchant: "Oxford caterer", amount: 560, receiptDone: false, q: {}, file: "" }
    ],
    deposits: [
      { id: "DP-11", orgId: "o1", source: "Card reader settlement", payType: "Visa/MC/Discover/Debit", rc: "RC0244", amount: 420, received: "2026-10-15", deposited: "2026-10-15", recorded: "2026-10-16", receipt: "settlement_1015.jpg", memo: "Fall Pitch Night ticket sales" },
      { id: "DP-12", orgId: "o1", source: "PNC deposit", payType: "Check (includes cash)", rc: "RC0244", amount: 310, received: "2026-11-03", deposited: "2026-11-05", recorded: "", receipt: "pnc_1105.jpg", memo: "Member dues" }
    ],
    threads: [
      { id: "Q-71", orgId: "o1", status: "answered", subject: "Can we buy pizza for a general meeting?", created: "2026-10-28",
        msgs: [
          { from: "user", who: "Ryan G.", text: "Can we buy pizza for a general meeting?" },
          { from: "ai", who: "FundPath AI", text: "Food falls under 'Event: Food' and counts toward your tier's food limit ($1,000 for Tier 4). The meeting has to be listed on the HUB under the exact name you use in the proposal.", rules: ["LIMFOOD", "HUBMATCH"] },
          { from: "user", who: "Ryan G.", text: "Sent to an ASG liaison.", system: true },
          { from: "asg", who: "ASG Financial Services · asgfunding@miamioh.edu", text: "Correct. List the meeting on the HUB, use 'Event: Food', and keep the semester total under your food limit." }
        ] },
      { id: "Q-74", orgId: "o3", status: "open", subject: "Member paid sales tax on supplies", created: "2026-11-06",
        msgs: [
          { from: "user", who: "Dana Lee", text: "A member bought supplies with their own card and paid sales tax. Can we reimburse that?" },
          { from: "ai", who: "FundPath AI", text: "Reimbursements are a last resort, so contact Accounts Payable first. Student orgs are tax-exempt in certain states, and the exemption forms are on the AP website.", rules: ["REIMB"] },
          { from: "user", who: "Dana Lee", text: "Asked for an ASG liaison.", system: true }
        ] }
    ],
    log: []
  };
}
