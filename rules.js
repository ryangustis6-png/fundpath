// FundPath rules file. Every rule says where it comes from.
// kind: "sourced"   = official ASG / SEA material
//       "precedent" = past ASG decisions reported by The Miami Student
//       "modeled"   = placeholder until ASG publishes the number
// When the Funding Committee Standing Rules and the ASG proposal template give different limits,
// FundPath enforces the stricter one and cites both.
const SRC = {
  sr: { label: "ASG Funding Committee Standing Rules 2025–2026 (updated Sep 16, 2025)", url: "https://miamiohasg.com/funding-1" },
  proposal: { label: "ASG Club Funding Proposal template (Fall 2025)", url: "https://miamiohasg.com/funding-1" },
  training: { label: "SEA Student Org Finance Training (Canvas 225476)", url: "https://miamioh.instructure.com/courses/225476" },
  sa: { label: "SEA training · Create Spend Authorization job aid (AP)", url: "https://miamioh.instructure.com/courses/225476" },
  receipts: { label: "SEA training · Submit Receipt & Close Spend Authorization", url: "https://miamioh.instructure.com/courses/225476" },
  restrict: { label: "SEA training · Purchase Restrictions", url: "https://miamioh.instructure.com/courses/225476" },
  contract: { label: "SEA training · Contracting", url: "https://miamioh.instructure.com/courses/225476" },
  travel: { label: "SEA training · Transportation & Hertz Quick Guide", url: "https://miamioh.instructure.com/courses/225476" },
  deposits: { label: "SEA training · eMarket, Deposits, Record Cash Sale", url: "https://miamioh.instructure.com/courses/225476" },
  announce: { label: "SEA announcement · Balances, Moving Expenses, ASG Funds", url: "https://miamioh.instructure.com/courses/225476" },
  breaks: { label: "The Miami Student – New funding policy raises concerns", url: "https://miamistudent.net/new-funding-policy-raises-concerns/" },
  none: null
};
const R = (title, kind, stage, src, cite, text) => ({ title, kind, stage, src, cite, text });
const RULES = {
  // ---------- Eligibility ----------
  UNDERGRAD: R("80% undergraduate membership", "sourced", "Eligibility", SRC.sr, "SR §3.2", "Membership must be at least 80% undergraduates. Travel and conference fees are funded only for undergraduates, and groups whose members get academic credit for participating aren't funded."),
  ENTITY:    R("Submit from the entity account", "sourced", "Eligibility", SRC.sr, "SR §5.1.1", "Funding applications must come from the organization's entity account. Submissions from personal accounts are denied a hearing."),
  ELIGINFO:  R("Step 1 club info complete", "sourced", "Eligibility", SRC.proposal, "Proposal Step 1", "Organization, entity email, tier, president, treasurer, advisor and SA1#### worktag must be filled in and accurate (committee criterion 1)."),
  TIERMAX:   R("Tier semester maximum", "sourced", "Eligibility", SRC.proposal, "Proposal template · SR §10.1–10.1.1", "Global cap is $10,000 per cycle (SR §10.1), adjusted by Red Brick Rewards tier (SR §10.1.1). The Fall 2025 template sets Tier IV at $5,000 per semester, including money already received this semester. Tiers I–III are modeled until ASG publishes them."),
  TRAINING:  R("Treasurer is Workday-authorized", "sourced", "Eligibility", SRC.training, "SEA training §7.2", "Only the treasurer can spend: listed on Miami Central, accepted position terms, completed the Workday access module this year, and the access request was approved by SEA."),
  DEBT:      R("Debt relief penalties", "sourced", "Eligibility", SRC.sr, "SR §15.1", "Debt under $150 is forgiven. $150–$499: 25% penalty. $500–$2,499: 50% penalty. $2,500 or more: no ASG funding while in debt. ASG funds can't be requested to pay off debt."),
  DEFICIT:   R("No deficit for more than a semester", "sourced", "Eligibility", SRC.sr, "SR §17.1–17.3", "No negative balances. Orgs that keep a deficit for more than one semester when applications are due aren't eligible that cycle."),
  SWEEP:     R("Spend at least 75% of approved funds", "sourced", "Eligibility", SRC.sr, "SR §15.4", "Orgs must spend 75% of funds approved in a cycle. Spending less means a 25% reduction in the next cycle unless ASG granted a sweep exemption."),
  // ---------- Proposal ----------
  DEADLINE:  R("Application deadline", "sourced", "Proposal", SRC.sr, "SR §5.3–5.4 · Proposal template", "No applications after the deadline set by the Secretary of Finance, technical issues included. Fall has 2 funding cycles and spring has 3; spring cycle 3 covers the first 50 days of the next fall (SR §3.4)."),
  HUBMATCH:  R("Event registered on Miami Central (exact name)", "sourced", "Proposal", SRC.sr, "SR §6.2.1 · Proposal Step 2", "Each event must be registered on Miami Central (formerly the Hub) before the hearing, and the proposal name must exactly match the listing. Unregistered events aren't heard."),
  ITEMIZED:  R("Itemized budget", "sourced", "Proposal", SRC.sr, "SR §5.2 · Proposal criterion 2", "Every request needs an itemized list of specific expenses."),
  EVENTCRIT: R("Event funding criteria (25% each)", "sourced", "Proposal", SRC.sr, "SR §6.7–6.7.1", "Event requests get 25% for each criterion met: on campus, educational, open to all (free to Miami students, same-day), and spending history (2+ semesters of responsible spending). If short of 100%, a service event or a Thu–Sat late-night event (after 8 PM) can add 25% each, up to 100%."),
  QUOTES3P:  R("Written quotes for every third party", "sourced", "Proposal", SRC.sr, "SR §6.2", "Written quotes are required for all third parties hired (speakers, DJs, videographers, bus lines, etc.). Without them, none of that event's expenses are approved."),
  QUOTES:    R("Quotes for hotels, flights, items over $1,000", "sourced", "Proposal", SRC.proposal, "Proposal template", "Quotes are required for hotels, flights and any item over $1,000."),
  CAPITAL:   R("Capital items", "sourced", "Proposal", SRC.sr, "SR §8.1–8.3", "Capital items are tangible goods kept at least a year that the org needs. The org must have an office or storage space for them, and any item over $300 needs a written estimate or online quote."),
  ADMIN:     R("Administrative funding", "sourced", "Proposal", SRC.sr, "SR §9.1–9.3 · Proposal template", "Admin funding covers basic operating costs. The standing rules allow up to $1,500 per cycle and the template caps admin at $1,000; FundPath enforces $1,000. Mandatory conferences need proof they're required, and only required members are funded."),
  LIMFOOD:   R("Food limit (by tier)", "sourced", "Proposal", SRC.proposal, "Proposal template · SR §19.1", "Food limit by tier: $500, $750 or $1,000 per semester. Food is only funded when it's educational and sample-size. Food for large events, banquets or galas isn't funded."),
  LIMSPEAK:  R("Speakers", "sourced", "Proposal", SRC.proposal, "Proposal template ($3,000) · SR §11.2 ($7,000)", "Speakers and honorariums: the template caps them at $3,000 per semester regardless of tier, and the standing rules at $7,000. FundPath enforces $3,000."),
  LIMDECOR:  R("Decorations $250 per event", "sourced", "Proposal", SRC.sr, "SR §11.3", "No more than $250 in decorative materials (streamers, centerpieces, tablecloths, balloons) per event."),
  LIMPROMO:  R("Promotional materials $150 per event", "sourced", "Proposal", SRC.sr, "SR §11.4", "No more than $150 in promotional materials (paper, flyers, handouts) per event."),
  LIMCRAFT:  R("Crafting supplies $50 per event", "sourced", "Proposal", SRC.sr, "SR §11.6", "No more than $50 in crafting supplies (scissors, glue, markers) per event."),
  LIMSOUND:  R("Sound & recording $5,000 per event", "sourced", "Proposal", SRC.sr, "SR §11.7", "No more than $5,000 in sound and recording contracts per event."),
  LIMFLIGHT: R("Airfare $200 per person", "sourced", "Proposal", SRC.sr, "SR §11.5 ($200) · template ($300)", "Round-trip airfare: the standing rules allow up to $200 per person per event and the template allows $300; FundPath enforces $200. Flights for contracted third parties can be funded at full cost."),
  LIMHOTEL:  R("Hotel limit", "sourced", "Proposal", SRC.sr, "SR §11.5–11.5.1 · template", "Hotels: up to $130 per room per night with 4 people per room (rounded up), and the template allows up to $50 per person per night. FundPath enforces whichever is lower."),
  LIMPAPER:  R("Paper supplies $450 per semester", "sourced", "Proposal", SRC.sr, "SR §11.8", "Admin paper supplies (flyers, posters, printer paper not tied to an event) are capped at $450 per semester."),
  LIMBANNER: R("Banners $200 per semester", "sourced", "Proposal", SRC.sr, "SR §11.9", "Banners are capped at $200 per semester; the highest tier is exempt."),
  LIMOFFICE: R("Office supplies $200 per semester", "sourced", "Proposal", SRC.sr, "SR §11.10", "Office supplies (pens, scissors, printer ink, office storage) are capped at $200 per semester."),
  LIMORGMAT: R("Organizational materials $600", "sourced", "Proposal", SRC.sr, "SR §11.11", "Website domains, email servers, software and programming are capped at $600."),
  LIMSTORE:  R("Storage $1,000", "sourced", "Proposal", SRC.sr, "SR §11.12 · template", "Storage materials for ASG-funded capital items (when no on-campus storage exists) are capped at $1,000."),
  LIMCAP:    R("Capital category caps", "sourced", "Proposal", SRC.sr, "SR §11.12–11.19", "Capital caps: recreational electronics $1,500 (gaming orgs only), electronics $2,000, musical instruments $750 (music orgs only), costumes $1,000, lab materials $1,000 (lab orgs only), athletic $2,000, board games $750, construction/tools $1,500."),
  NOTFUNDED: R("Items not funded", "sourced", "Proposal", SRC.sr, "SR §19.1", "Not funded: apparel (including t-shirts), textbooks, registration for non-mandatory members, events where alcohol can be served, food for large events/banquets/galas, items ASG or the King Library Tech Exchange already provides, payments to Miami students or staff, tickets, items outside the org's purpose, and business cards, name tags or other personal ID items."),
  PROHIBITED:R("Prohibited purchases", "sourced", "Proposal", SRC.restrict, "SEA Purchase Restrictions", "Never purchasable: alcohol, tobacco, anything illegal, gambling or adult entertainment, or anything that conflicts with university policy or Trademarks & Licensing."),
  FUNDRAISE: R("Charging admission = fundraiser", "sourced", "Proposal", SRC.sr, "SR §6.4, §12", "Events that charge Miami students admission are fundraisers. Disclose this when requesting, report sales, and repay ASG before profiting."),
  OVERNIGHT: R("Overnight trips get a live hearing", "sourced", "Proposal", SRC.sr, "SR §13.1–13.6", "Overnight trip requests are heard live, separately from event/capital/admin requests. They need an itemized itinerary and must have a charitable non-profit purpose, major professional or educational value, or 6+ hours of service per day. Priority order: service, then travel, lodging, everything else."),
  BREAKTRIP: R("No trips over university breaks", "precedent", "Proposal", SRC.breaks, "ASG precedent", "ASG has declined to fund trips that take place over winter, spring or summer break."),
  CUTBACK:   R("Equal percentage cutback", "sourced", "Proposal", SRC.sr, "SR §6.6", "If requests exceed the budget, every org gets the same percentage reduction (except as the reward system or debt relief says)."),
  SENATE:    R("Committee recommends, Senate approves", "sourced", "Proposal", SRC.sr, "SR §3.1", "Committee decisions are recommendations forwarded to the Student Senate for final approval. FundPath's automatic approvals are F&A recommendations that go to Senate the same way."),
  PURPOSE:   R("Fits ASG's and the org's purpose", "sourced", "Proposal", SRC.proposal, "Proposal criteria 6–7 · SR §6.1", "Events should promote education, be open to all students, be held on the Oxford campus, and promote the university. Larger lines need a justification."),
  // ---------- Spend (second line) ----------
  FUNDSFIRST:R("No spending before approval", "sourced", "Spend", SRC.announce, "SEA announcement", "Tier status doesn't grant money. Requested ASG money can't be spent until the proposal is approved, and nothing can be bought without funds to cover it."),
  SAMATCH:   R("Spend only what was approved", "sourced", "Spend", SRC.sr, "SR §16.3–16.4 · SEA Purchase Restrictions", "Funds can't be repurposed or spent on unapproved items, and no item can go over its approved amount. Every Spend Authorization line must trace back to an approved line."),
  ONEFUND:   R("One fund per authorization", "sourced", "Spend", SRC.sa, "AP job aid", "All items on one Spend Authorization must use the same accounting: Agency FD9001/PRG100 or ASG FD1000/PRG040."),
  CASHADV:   R("Never request a cash advance", "sourced", "Spend", SRC.sa, "AP job aid", "'Cash Advance Requested' must never be checked. Requests that check it are returned and start over."),
  JUSTIFY:   R("Justification + proof of budget", "sourced", "Spend", SRC.sa, "AP job aid", "The justification lists vendors, event details and whether any clothing has Miami's name/logo, plus the card's last 4 digits when adding funds. Proof of budget is attached."),
  PROOFFUNDS:R("Proof of funds attached", "sourced", "Spend", SRC.announce, "SEA announcement", "Attach a balance-report screenshot and any quotes."),
  JUNE1:     R("No Spend Authorizations after June 1", "sourced", "Spend", SRC.sa, "AP job aid", "The fiscal year ends June 30, so no Spend Authorizations are accepted after June 1."),
  JOURNAL:   R("On-campus charges aren't card purchases", "sourced", "Spend", SRC.sa, "AP job aid", "Charges from other Miami offices (Armstrong rooms, Rec Center, MUPD) are journal transfers paid with the worktag, not the card."),
  CONTRACT:  R("Services need an SEA-reviewed contract", "sourced", "Spend", SRC.contract, "SEA Contracting", "Speakers, entertainers and other services need an SEA-approved contract at least a month ahead, plus indemnification/insurance. They're paid by requisition, not the card."),
  PAYMIAMI:  R("No payments to Miami students or staff", "sourced", "Spend", SRC.sr, "SR §19.1", "Payments for services to Miami students or staff aren't funded."),
  RENTAL:    R("Rental driver rules", "sourced", "Spend", SRC.travel, "Hertz Quick Guide", "Drivers aged 18–20 must use Hertz; Enterprise blocks drivers under 21. Van drivers must be 21 or older and complete van safety training."),
  LICENSING: R("Miami name/logo on clothing", "sourced", "Spend", SRC.restrict, "SEA Purchase Restrictions", "Clothing with Miami's name or logo must follow Trademarks & Licensing and be disclosed in the justification."),
  // ---------- Close-out ----------
  RECEIPTS:  R("Receipts Questionnaire", "sourced", "Close-out", SRC.receipts, "Submit Receipt job aid", "Every card transaction needs a receipt plus Who, What, When, Where, How and Why."),
  CLOSESA:   R("Close the Spend Authorization", "sourced", "Close-out", SRC.receipts, "Submit Receipt job aid", "Close the Spend Authorization once every receipt is in. This releases the encumbered funds."),
  AUDIT:     R("Spending audits", "sourced", "Close-out", SRC.sr, "SR §16", "Auditors check spending against the approved application. Misallocated funds lead to sanctions, and orgs have 5 business days to answer a Notice of Investigation."),
  // ---------- Deposits ----------
  CASHSALE:  R("Record the cash sale within 24 hours", "sourced", "Deposits", SRC.deposits, "SEA training §8.7–8.9", "Record the cash sale in Workday with the receipt photo within 24 hours, or the money isn't assigned to the org."),
  AMEX:      R("American Express is a separate cash sale", "sourced", "Deposits", SRC.deposits, "SEA training §8.9", "Record Visa/MC/Discover/Debit together and American Express separately."),
  ORC938:    R("Deposit timing (ORC 9.38)", "sourced", "Deposits", SRC.deposits, "SEA training §8.8", "Deposits over $1,000 are due the next business day. Smaller deposits are due within 3 business days."),
  PROCESSOR: R("Only eMarket and SEA card readers", "sourced", "Deposits", SRC.deposits, "SEA training §8.7", "PayPal, Venmo, Square and other processors aren't allowed."),
  GIFTS:     R("Gifts go through Advancement", "sourced", "Deposits", SRC.deposits, "SEA training §8.10–8.12", "Donations use RC0330 and go through University Advancement."),
};
Object.keys(RULES).forEach(k => { RULES[k].id = k; });

// Categories: ASG proposal categories, extended with the Standing Rules' categorical caps.
// cap: { key, amt, per: "event" | "semester" }   route: how Workday pays it
const SC = { speaker: "SC0346 Facilitators, Instructors, and Speakers", food: "SC0282 Student Hospitality (Food)", promo: "SC0335 Advertising", print: "SC0337 Printing and Copying", supplies: "SC0309 Supplies - Office (Event Supplies/Decorations)", space: "SC0399 Facility (on-campus rental)", hotel: "SC0278 Off Campus Lodging", flight: "SC0276 Student Travel", trans: "SC0281 Transportation", fuel: "Car Fuel", dues: "SC0336 Dues and Membership", events: "SC0497 Events - Students", reg: "SC0271 Conference Registration Fees" };
const CATS = {
  "Event: Guest Speaker":       { sec: "event", group: "speakers", sc: SC.speaker, route: "contract", third: true, rule: "LIMSPEAK" },
  "Event: Entertainer / DJ":    { sec: "event", group: "entertain", sc: SC.speaker, route: "contract", third: true },
  "Event: Sound & recording":   { sec: "event", group: "sound", sc: SC.events, route: "contract", third: true, cap: { key: "sound", amt: 5000, per: "event", rule: "LIMSOUND" } },
  "Event: Space Fee":           { sec: "event", group: "space", sc: SC.space, route: "journal" },
  "Event: Food (sample-size)":  { sec: "event", group: "food", sc: SC.food, route: "card", rule: "LIMFOOD" },
  "Event: Promotional materials": { sec: "event", group: "promo", sc: SC.promo, route: "card", cap: { key: "promo", amt: 150, per: "event", rule: "LIMPROMO" } },
  "Event: Decorations":         { sec: "event", group: "decor", sc: SC.supplies, route: "card", cap: { key: "decor", amt: 250, per: "event", rule: "LIMDECOR" } },
  "Event: Crafting supplies":   { sec: "event", group: "craft", sc: SC.supplies, route: "card", cap: { key: "craft", amt: 50, per: "event", rule: "LIMCRAFT" } },
  "Event: Other":               { sec: "event", group: "other", sc: SC.supplies, route: "card" },
  "Trip: Hotel":                { sec: "trip", group: "hotel", sc: SC.hotel, route: "card", quote: true },
  "Trip: Flight":               { sec: "trip", group: "flight", sc: SC.flight, route: "card", quote: true },
  "Trip: Gas":                  { sec: "trip", group: "gas", sc: SC.fuel, route: "card" },
  "Trip: Charter bus":          { sec: "trip", group: "bus", sc: SC.trans, route: "po", third: true },
  "Trip: Registration (mandatory)": { sec: "trip", group: "reg", sc: SC.reg, route: "card" },
  "Admin: Organizational materials": { sec: "admin", group: "admin", sc: SC.dues, route: "card", cap: { key: "orgmat", amt: 600, per: "semester", rule: "LIMORGMAT" } },
  "Admin: Paper supplies":      { sec: "admin", group: "admin", sc: SC.print, route: "card", cap: { key: "paper", amt: 450, per: "semester", rule: "LIMPAPER" } },
  "Admin: Office supplies":     { sec: "admin", group: "admin", sc: SC.supplies, route: "card", cap: { key: "office", amt: 200, per: "semester", rule: "LIMOFFICE" } },
  "Admin: Banners":             { sec: "admin", group: "admin", sc: SC.print, route: "card", cap: { key: "banner", amt: 200, per: "semester", rule: "LIMBANNER", tier4exempt: true } },
  "Admin: Mandatory conference":{ sec: "admin", group: "admin", sc: SC.reg, route: "card" },
  "Admin: Storage":             { sec: "admin", group: "storage", sc: SC.supplies, route: "card", cap: { key: "storage", amt: 1000, per: "semester", rule: "LIMSTORE" } },
  "Capital: Electronics":       { sec: "capital", group: "capital", sc: SC.supplies, route: "card", capital: true, cap: { key: "elec", amt: 2000, per: "semester", rule: "LIMCAP" } },
  "Capital: Recreational electronics": { sec: "capital", group: "capital", sc: SC.supplies, route: "card", capital: true, cap: { key: "recelec", amt: 1500, per: "semester", rule: "LIMCAP" } },
  "Capital: Musical instruments": { sec: "capital", group: "capital", sc: SC.supplies, route: "card", capital: true, cap: { key: "music", amt: 750, per: "semester", rule: "LIMCAP" } },
  "Capital: Costumes":          { sec: "capital", group: "capital", sc: SC.supplies, route: "card", capital: true, cap: { key: "costume", amt: 1000, per: "semester", rule: "LIMCAP" } },
  "Capital: Lab materials":     { sec: "capital", group: "capital", sc: SC.supplies, route: "card", capital: true, cap: { key: "lab", amt: 1000, per: "semester", rule: "LIMCAP" } },
  "Capital: Athletic":          { sec: "capital", group: "capital", sc: SC.supplies, route: "card", capital: true, cap: { key: "athletic", amt: 2000, per: "semester", rule: "LIMCAP" } },
  "Capital: Board games":       { sec: "capital", group: "capital", sc: SC.supplies, route: "card", capital: true, cap: { key: "games", amt: 750, per: "semester", rule: "LIMCAP" } },
  "Capital: Construction & tools": { sec: "capital", group: "capital", sc: SC.supplies, route: "card", capital: true, cap: { key: "tools", amt: 1500, per: "semester", rule: "LIMCAP" } },
  "Capital: Other":             { sec: "capital", group: "capital", sc: SC.supplies, route: "card", capital: true }
};

const DEFAULT_SETTINGS = {
  semester: "Fall 2026", cycle: "Cycle 2",
  window: { open: "2026-10-01", close: "2026-11-15" },
  tierMax: { 1: 1000, 2: 2000, 3: 3500, 4: 5000 },
  tierFood: { 1: 500, 2: 500, 3: 750, 4: 1000 },
  globalCycle: 10000, admin: 1000, adminSR: 1500, speakers: 3000, speakersSR: 7000,
  hotelPerRoomNight: 130, perRoom: 4, hotelPerPerson: 50, flightPerPerson: 200, quoteOver: 1000, capitalQuoteOver: 300,
  justifyOver: 250, saCutoff: "2027-06-01",
  advisorPreauth: true,
  breaks: [
    { name: "Thanksgiving break", start: "2026-11-25", end: "2026-11-29" },
    { name: "Winter break", start: "2026-12-19", end: "2027-01-25" },
    { name: "Spring break", start: "2027-03-13", end: "2027-03-21" },
    { name: "Summer break", start: "2027-05-16", end: "2027-08-23" }
  ]
};

const PROHIBITED_WORDS = ["alcohol", "beer", "wine", "liquor", "vodka", "whiskey", "tequila", "keg", "kegs", "bud light", "busch", "natty", "white claw", "hard seltzer", "champagne", "margarita", "tobacco", "cigar", "cigarette", "vape", "juul", "hookah", "lottery", "casino", "gambling", "poker chips", "betting"];
const NOTFUNDED_WORDS = [["shirt", "apparel"], ["shirts", "apparel"], ["t-shirt", "apparel"], ["tshirt", "apparel"], ["t shirts", "apparel"], ["hoodie", "apparel"], ["hoodies", "apparel"], ["jersey", "apparel"], ["jerseys", "apparel"], ["quarter zip", "apparel"], ["textbook", "textbooks"], ["textbooks", "textbooks"], ["business cards", "business cards"], ["business card", "business cards"], ["name tags", "name tags"], ["nametags", "name tags"], ["tickets", "tickets"], ["ticket", "tickets"], ["banquet", "banquet food"], ["gala", "gala food"], ["formal", "formal"], ["bar", "a location where alcohol is served"], ["brewery", "a location where alcohol is served"], ["pub", "a location where alcohol is served"], ["brick street", "a location where alcohol is served"]];
const ONCAMPUS = ["armstrong", "shriver", "rec center", "recreation center", "mupd", "benton", "farmer school", "goggin", "millett", "king library", "campus dining", "cole service"];
const VAGUE = ["misc", "miscellaneous", "various", "stuff", "tbd", "other", "supplies", "things", "general"];
