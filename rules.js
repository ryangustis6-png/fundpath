// FundPath rules file. Every rule says where it comes from.
// kind: "sourced"   = Miami / ASG / SEA material (proposal template, SEA Canvas training, Miami pages)
//       "precedent" = past ASG decisions reported by The Miami Student
//       "modeled"   = placeholder until ASG publishes the number (the ASG module in Canvas is locked)
const SRC = {
  proposal: { label: "ASG Club Funding Proposal template (Fall 2025)", url: "https://miamiohasg.com/funding-1" },
  training: { label: "SEA Student Org Finance Training (Canvas course 225476)", url: "https://miamioh.instructure.com/courses/225476" },
  sa: { label: "SEA training · Create Spend Authorization job aid (AP)", url: "https://miamioh.instructure.com/courses/225476" },
  receipts: { label: "SEA training · Submit Receipt & Close Spend Authorization", url: "https://miamioh.instructure.com/courses/225476" },
  restrict: { label: "SEA training · Purchase Restrictions", url: "https://miamioh.instructure.com/courses/225476" },
  contract: { label: "SEA training · Contracting", url: "https://miamioh.instructure.com/courses/225476" },
  travel: { label: "SEA training · Transportation Rentals & Hertz Quick Guide", url: "https://miamioh.instructure.com/courses/225476" },
  deposits: { label: "SEA training · eMarket, Deposits, Record Cash Sale", url: "https://miamioh.instructure.com/courses/225476" },
  announce: { label: "SEA announcement · Balances, Moving Expenses, ASG Funds (Oct 2024)", url: "https://miamioh.instructure.com/courses/225476" },
  sealOld: { label: "Miami Student Activities – Finances", url: "https://www.miamioh.edu/student-life/student-activities/finances" },
  guide22: { label: "The Miami Student – How ASG funds student orgs (2022)", url: "https://miamistudent.net/article/2022/11/from-0-to-12500-a-comprehensive-guide-on-how-asg-funds-student-organizations" },
  breaks: { label: "The Miami Student – New funding policy raises concerns", url: "https://miamistudent.net/new-funding-policy-raises-concerns/" },
  none: null
};

const RULES = {
  // ---- Eligibility (Proposal Step 1) ----
  ELIGINFO:  { title: "Step 1 club info complete", kind: "sourced", stage: "Proposal", src: SRC.proposal,
    text: "Organization, entity email, tier status, president, treasurer, advisor and SA1#### worktag must all be filled in and accurate (committee criterion 1)." },
  TIERMAX:   { title: "Tier semester maximum", kind: "sourced", stage: "Proposal", src: SRC.proposal,
    text: "Total ASG funding per semester is capped by Red Brick Rewards tier (Tier 4 = $5,000/semester). Limits are per semester and include funding already received. Caps for Tiers 1–3 are modeled until ASG publishes them." },
  TRAINING:  { title: "Treasurer is Workday-authorized", kind: "sourced", stage: "Eligibility", src: SRC.training,
    text: "Only the treasurer can spend: listed on the Hub, accepted position terms, completed the Workday access module this academic year, and had the access request approved by SEA (not automatic)." },
  PENALTY:   { title: "Spending-history penalty (25%)", kind: "sourced", stage: "Proposal", src: SRC.guide22,
    text: "Orgs with ASG-imposed penalties for poor spending history lose 25% of their funding." },
  // ---- Proposal rules ----
  DEADLINE:  { title: "Proposal window", kind: "sourced", stage: "Proposal", src: SRC.proposal,
    text: "Proposals are only accepted while the semester window is open (Fall 2025 ran Aug 25, 8:00 a.m. – Nov 2, 11:59 p.m.). The current window dates are set by ASG." },
  HUBMATCH:  { title: "Events listed on the HUB (exact name)", kind: "sourced", stage: "Proposal", src: SRC.proposal,
    text: "Events and trips must be listed on the HUB to be eligible, and the name must exactly match the HUB listing (committee criterion 3)." },
  ITEMIZED:  { title: "Budget must be itemized", kind: "sourced", stage: "Proposal", src: SRC.proposal,
    text: "Budgets must be broken down into specific expenses. Vague lines like 'misc' or 'supplies' without detail fail committee criterion 2." },
  QUOTES:    { title: "Quotes for hotels, flights and items over $1,000", kind: "sourced", stage: "Proposal", src: SRC.proposal,
    text: "Quotes are required for hotel, flight, and any item over $1,000." },
  LIMFOOD:   { title: "Food limit (by tier)", kind: "sourced", stage: "Proposal", src: SRC.proposal,
    text: "Food limit depends on tier: $500, $750 or $1,000 per semester." },
  LIMADMIN:  { title: "Admin limit $1,000", kind: "sourced", stage: "Proposal", src: SRC.proposal,
    text: "Admin items (basic operating costs, goods not kept more than a year) are capped at $1,000 per semester regardless of tier." },
  LIMSTORE:  { title: "Storage limit $1,000", kind: "sourced", stage: "Proposal", src: SRC.proposal,
    text: "Storage is capped at $1,000 per semester regardless of tier." },
  LIMSPEAK:  { title: "Guest speaker limit $3,000", kind: "sourced", stage: "Proposal", src: SRC.proposal,
    text: "Guest speakers are capped at $3,000 per semester regardless of tier." },
  LIMHOTEL:  { title: "Hotel up to $50/person/night", kind: "sourced", stage: "Proposal", src: SRC.proposal,
    text: "Hotel funding is limited to $50 per person per night." },
  LIMFLIGHT: { title: "Flights up to $300/person", kind: "sourced", stage: "Proposal", src: SRC.proposal,
    text: "Flight funding is limited to $300 per person for a round trip." },
  CAPITAL:   { title: "Capital vs admin items", kind: "sourced", stage: "Proposal", src: SRC.proposal,
    text: "Capital items are tangible goods kept and stored more than a year; admin items are basic operating costs and goods not kept more than a year." },
  PURPOSE:   { title: "Fits ASG's and the org's purpose", kind: "sourced", stage: "Proposal", src: SRC.proposal,
    text: "Committee criteria 6–7: the budget must fit the purpose of ASG funding and the organization's purpose. FundPath requires a justification on larger lines; the committee can still spot-check." },
  PROHIBITED:{ title: "Prohibited purchases", kind: "sourced", stage: "Proposal", src: SRC.restrict,
    text: "Never purchasable with student org funds: alcohol, tobacco, anything illegal under Ohio/federal law, gambling or adult entertainment, anything conflicting with university policy or Trademarks & Licensing. Workday's 'Food and Dining Alcohol' category is not allowed." },
  BREAKTRIP: { title: "No trips over university breaks", kind: "precedent", stage: "Proposal", src: SRC.breaks,
    text: "ASG has declined to fund trips that take place over winter, spring or summer break." },
  FUNDSFIRST:{ title: "No spending before approval", kind: "sourced", stage: "Spend", src: SRC.announce,
    text: "Tier status doesn't grant money. An org can't spend ASG-requested money until its proposal is approved, and can't pay for anything it doesn't have funds to cover ('no money means no spending')." },
  // ---- Spend Authorization (second line) ----
  SAMATCH:   { title: "Spend must match the approved budget", kind: "sourced", stage: "Spend", src: SRC.restrict,
    text: "ASG and university-designated funds (FD1000 / PRG040) must follow the approved budget and its restrictions. Each line must trace to an approved proposal line and stay within what's left on it." },
  ONEFUND:   { title: "One fund per authorization", kind: "sourced", stage: "Spend", src: SRC.sa,
    text: "All items on one Spend Authorization must use the same accounting (Agency FD9001/PRG100 or ASG FD1000/PRG040)." },
  CASHADV:   { title: "Never request a cash advance", kind: "sourced", stage: "Spend", src: SRC.sa,
    text: "'Cash Advance Requested' must never be checked. Student org cash-advance requests are returned and approval restarts." },
  JUSTIFY:   { title: "Full justification + proof of budget", kind: "sourced", stage: "Spend", src: SRC.sa,
    text: "Justification must detail expected vendors, event details, whether any clothing carries Miami's name/logo, and last 4 digits of the card when adding funds. Proof of budget is attached to the header." },
  PROOFFUNDS:{ title: "Proof of funds attached", kind: "sourced", stage: "Spend", src: SRC.announce,
    text: "Attach a screenshot of the balance report and any quotes when creating a Spend Authorization." },
  JUNE1:     { title: "No Spend Authorizations after June 1", kind: "sourced", stage: "Spend", src: SRC.sa,
    text: "The fiscal year ends June 30; no Spend Authorizations are accepted after June 1 and all must be closed by then. Org fiscal year runs July 1 – May 31." },
  JOURNAL:   { title: "On-campus charges aren't card purchases", kind: "sourced", stage: "Spend", src: SRC.sa,
    text: "Inter-university charges (Armstrong rooms, Rec Center, MUPD, etc.) are journal transfers paid with the program worktag. They don't go on the Multi-Use card or a card request." },
  LICENSING: { title: "Miami name/logo on clothing", kind: "sourced", stage: "Spend", src: SRC.restrict,
    text: "Clothing with Miami's name or logo must comply with University Trademarks & Licensing and must be disclosed in the Spend Authorization justification." },
  CONTRACT:  { title: "Services need an SEA-reviewed contract", kind: "sourced", stage: "Spend", src: SRC.contract,
    text: "Services by a person or company (speakers, entertainers, consultants) need a contract reviewed and approved by SEA before signing, set up at least one month before the service, with indemnification/insurance for anyone coming on campus. Payment is a requisition, not the card." },
  PAYMIAMI:  { title: "No payments to Miami students, staff or faculty", kind: "sourced", stage: "Spend", src: SRC.sealOld,
    text: "Miami staff, faculty and students may not be paid by student organizations; their services are volunteer." },
  RENTAL:    { title: "Rental driver age rules", kind: "sourced", stage: "Spend", src: SRC.travel,
    text: "Drivers 18–20 must use Hertz (named card via Spend Authorization); Enterprise blocks under-21 drivers. 12–15 passenger and cargo vans need drivers 21+ who completed Risk Management van training (AP denies the SA otherwise)." },
  REIMB:     { title: "Reimbursement is a last resort", kind: "sourced", stage: "Spend", src: SRC.training,
    text: "Paying out of pocket should be a last resort; contact Accounts Payable first if it's unavoidable." },
  // ---- Close-out ----
  RECEIPTS:  { title: "Receipts Questionnaire for every charge", kind: "sourced", stage: "Close-out", src: SRC.receipts,
    text: "Each card transaction needs a receipt and answers to Who, What, When, Where, How and Why. Don't submit the questionnaire until every receipt is attached." },
  CLOSESA:   { title: "Close the Spend Authorization", kind: "sourced", stage: "Close-out", src: SRC.receipts,
    text: "After all receipts are in, close the Spend Authorization in 'My Spend Authorizations' to release encumbered funds." },
  NEGBAL:    { title: "Negative balances fixed by semester end", kind: "sourced", stage: "Close-out", src: SRC.announce,
    text: "An organization must make up any negative account balance by the end of the semester." },
  // ---- Collecting money ----
  CASHSALE:  { title: "Record the cash sale within 24 hours", kind: "sourced", stage: "Deposits", src: SRC.deposits,
    text: "After a reader settlement or PNC deposit, record the cash sale in Workday with the receipt photo within 24 hours. Unrecorded money isn't assigned to the org." },
  AMEX:      { title: "American Express is a separate cash sale", kind: "sourced", stage: "Deposits", src: SRC.deposits,
    text: "Visa/Mastercard/Discover/Debit are recorded together; American Express must be a separate cash sale." },
  ORC938:    { title: "Deposit timing (ORC 9.38)", kind: "sourced", stage: "Deposits", src: SRC.deposits,
    text: "Deposits over $1,000 by the next business day; $1,000 or less within three business days if safeguarded." },
  PROCESSOR: { title: "Only eMarket and SEA card readers", kind: "sourced", stage: "Deposits", src: SRC.deposits,
    text: "Online collection must use Miami's eMarket (Nelnet). PayPal, Venmo, Square and other processors or card swipes are prohibited." },
  GIFTS:     { title: "Gifts go through Advancement", kind: "sourced", stage: "Deposits", src: SRC.deposits,
    text: "Donations use revenue category RC0330 and University Advancement (Give to Miami / Move In Miami), with donor names and addresses for tax receipts." }
};
Object.keys(RULES).forEach(k => { RULES[k].id = k; });

// Proposal categories (from the ASG proposal template) with Workday mapping and payment route.
const CATS = {
  "Event: Guest Speaker": { group: "speakers", sc: "SC0346 Facilitators, Instructors, and Speakers", route: "contract", event: true },
  "Event: Entertainer":   { group: "entertainers", sc: "SC0346 Facilitators, Instructors, and Speakers", route: "contract", event: true },
  "Event: Space Fee":     { group: "space", sc: "SC0399 Facility (on-campus rental)", route: "journal", event: true },
  "Event: Marketing":     { group: "marketing", sc: "SC0335 Advertising", route: "card", event: true },
  "Event: Food":          { group: "food", sc: "SC0282 Student Hospitality (Food)", route: "card", event: true },
  "Event: Other":         { group: "other", sc: "SC0309 Supplies - Office (Event Supplies/Decorations)", route: "card", event: true },
  "Trip: Hotel":          { group: "hotel", sc: "SC0278 Off Campus Lodging", route: "card", trip: true },
  "Trip: Gas":            { group: "gas", sc: "Car Fuel", route: "card", trip: true },
  "Trip: Flight":         { group: "flight", sc: "SC0276 Student Travel", route: "card", trip: true },
  "Trip: Other Travel":   { group: "othertravel", sc: "SC0281 Transportation", route: "card", trip: true },
  "Capital Item":         { group: "capital", sc: "SC0309 Supplies (capital item, kept > 1 yr)", route: "card" },
  "Admin Item":           { group: "admin", sc: "SC0336 Dues and Membership", route: "card" },
  "Marketing":            { group: "marketing", sc: "SC0337 Printing and Copying", route: "card" },
  "Banners":              { group: "banners", sc: "SC0337 Printing and Copying", route: "card" },
  "Storage":              { group: "storage", sc: "SC0338 Facility (licenses and permits)", route: "card" }
};

const DEFAULT_SETTINGS = {
  semester: "Fall 2026",
  window: { open: "2026-08-24", close: "2026-11-15" },
  tierMax: { 1: 1000, 2: 2000, 3: 3500, 4: 5000 },
  tierFood: { 1: 500, 2: 500, 3: 750, 4: 1000 },
  admin: 1000, storage: 1000, speakers: 3000, hotelPerNight: 50, flightPerPerson: 300, quoteOver: 1000,
  justifyOver: 250,
  saCutoff: "2027-06-01",
  breaks: [
    { name: "Thanksgiving break", start: "2026-11-25", end: "2026-11-29" },
    { name: "Winter break", start: "2026-12-19", end: "2027-01-25" },
    { name: "Spring break", start: "2027-03-13", end: "2027-03-21" },
    { name: "Summer break", start: "2027-05-16", end: "2027-08-23" }
  ]
};

const PROHIBITED_WORDS = ["alcohol", "beer", "wine", "liquor", "vodka", "whiskey", "tequila", "rum ", "keg", "kegs", "bud light", "busch", "natty", "white claw", "seltzer (hard)", "hard seltzer", "champagne", "tobacco", "cigar", "cigarette", "vape", "juul", "hookah", "lottery", "casino", "gambling", "poker chips", "betting"];
const CASHLIKE_WORDS = ["gift card", "visa gift", "venmo", "cash prize", "cash"];
const ONCAMPUS = ["armstrong", "shriver", "rec center", "recreation center", "mupd", "benton", "farmer school", "goggin", "millett", "king library", "miami university dining", "campus dining", "cole service"];
const VAGUE = ["misc", "miscellaneous", "various", "stuff", "tbd", "other", "supplies", "things", "general"];
