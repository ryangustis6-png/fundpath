# FundPath

**Miami University ASG funding and student org spending, in one place.**
Built at Redhawk Builds 2026.

Live: https://fundpath-lemon.vercel.app

## The problem

Getting ASG money today means working through Miami Central (tier status), a Canvas treasurer course, a Google Sheet plus a Google Form (the proposal), a 1–2 week email review, a second line-by-line Spend Authorization in Workday, a card pickup at Roudebush Hall, and then tracking receipts with no clear view of what's left. Small mistakes get a proposal denied and restart the clock. The whole thing often takes 1–2 months of a roughly 4-month semester.

## What FundPath does

1. **Proposal = the original budget.** It mirrors the ASG proposal sheet (Steps 1–6). Every line is checked live against ASG's limits and the committee's 7 criteria, with one-click fixes. You can import from or export to the Google Sheet format.
2. **Auto-approval.** If all 7 criteria pass, the proposal is approved instantly. Anything that needs judgment goes to the ASG committee with the reasons already written.
3. **Spend Authorization generated from the approved budget.** There's no duplicate entry. Each line is routed to the right payment method: the card (goods), a contract plus requisition (speakers), or a worktag journal transfer (on-campus rooms). A copy sheet lays out every Workday field.
4. **Second line of review.** The request goes treasurer → advisor → Accounts Payable / ASG. Every line is re-checked against the approved budget and the SEA purchasing rules, which catches anything that slipped past funding approval.
5. **After approval.** Card pickup, the Receipts Questionnaire (who/what/when/where/how/why), closing the authorization to release unspent funds, a live budget-vs-spend ledger, deposits and cash sales, a "who has it now" tracker, eligibility, AI + human Funding Help, and contacts and lead times.

## Where the rules come from

Every flag links to its source in `rules.js`:
- **sourced:** the ASG Club Funding Proposal template (Fall 2025) and the SEA Student Org Finance Training (Canvas course 225476), including its Spend Authorization, receipts, purchasing, contracting, travel and deposit job aids
- **precedent:** past ASG decisions reported by The Miami Student
- **modeled:** placeholders for numbers ASG hasn't published to students (caps for Tiers 1–3 and current window dates); ASG can edit them in Rules & settings

## Run it

It's a static site with no build step:

```bash
npx serve .        # or: python3 -m http.server
```

Optional AI: deploy to Vercel and set `ANTHROPIC_API_KEY`. `api/ai.js` handles the Funding Help answers. Without a key, the app falls back to rule-matched answers.

## Files

| File | What it is |
|---|---|
| `index.html` | Layout and styles |
| `rules.js` | Rules, sources, categories, limits (swap this to update policy) |
| `engine.js` | Proposal checks, second-line spend checks, ledger, deposits, to-dos |
| `data.js` | Demo seed data (fictional orgs and people) |
| `app.js` | UI for the Treasurer, Advisor and ASG/AP roles |
| `api/ai.js` | Vercel function for AI answers |

Demo data lives in the browser (localStorage). "Reset demo data" is in the sidebar.

## Demo run (exec meeting → card, no approvals needed)

1. **Treasurer → Exec meeting.** Click **Start listening** (Chrome/Edge) and run the meeting, or **Play the demo meeting**. Go through every event and item with amounts. Say "FundPath, build our budget."
2. FundPath builds the budget, removes what ASG never funds (SR §19.1), caps anything over a limit, then **asks clarifying questions out loud** (missing quotes, vague items like "supplies", whether food is sample-size, event dates). Answer by voice, buttons or typing.
3. It shows the filled ASG proposal sheet + funding form and how every line gets paid (card Spend Authorization, speaker contract/requisition, journal transfer), then asks "Do you want me to submit it?" Say **yes**.
4. **Straight-through approval:** if every check passes (7/7 criteria with no warnings, events on Miami Central, quotes, tier limit, no debt, treasurer has Workday access, SA matches the budget line for line), the proposal and Spend Authorization are approved with no advisor or ASG step and the card is ready. If FundPath isn't certain about anything, only those items go to the ASG Funding Committee or Accounts Payable, with the reason. ASG can turn straight-through off in Rules & settings.
5. Speaker contracts are still signed by SEA (university policy); FundPath drafts the requisition.

## Other features

- **Talk to FundPath** (button on every page, plus the top search bar): "How much can we still spend?", "What's our food limit?", "Start a meeting", "Submit our proposal", "Where's our spend authorization?", ASG: "Approve the Banking Club authorization".
- **Upload a budget:** drop in the ASG proposal Google Sheet (downloaded as .xlsx) or any Excel/CSV with Item / Category / Amount columns. FundPath reads every row, maps categories, runs every rule, shows what it can fix and what needs you, and can download the fixed budget as Excel. Files are read in the browser, never uploaded. Samples in `samples/`.
- **My club data:** top bar → Demo data / My club. "My club" starts empty: enter your real org (or import your Miami Central events export), then run a meeting or upload your budget. Back up / move between laptops with the .json export.

## Moving to real campus data

Today each workspace lives in the browser (with JSON backup). For every club on campus:
1. Shared database + Miami single sign-on (Vercel Postgres/Supabase + Miami's SSO), so exec boards, advisors and ASG see the same records.
2. Miami Central (CampusGroups) data feed or export for orgs, officers, tiers and registered events.
3. Workday integration account from Miami IT for Submit_Spend_Authorization and balance reports.
4. ASG sign-off on straight-through approval rules.

## Optional environment variables (Vercel)

- `ELEVENLABS_API_KEY` (and optional `ELEVENLABS_VOICE_ID`): FundPath's spoken voice (`/api/tts`) and recorded-meeting transcription (`/api/stt`). Without it, the browser's built-in voice is used.
- `ANTHROPIC_API_KEY`: AI answers in Funding Help.

## Workday

Workday is simulated in this demo. Each Spend Authorization has the exact `Submit_Spend_Authorization` payload FundPath would send (Workday view → Payload) and an EIB CSV export.

## Limits FundPath enforces

Source: ASG Funding Committee Standing Rules 2025–2026 and the ASG proposal template. When they differ, FundPath enforces the stricter one and cites both. Tier IV is $5,000/semester. Speakers are capped at $3,000 (template; SR §11.2 allows $7,000). Food by tier is $500/$750/$1,000. Promotional materials are $150/event, decorations $250/event, organizational materials $600/semester, banners $200/semester, electronics $2,000. See the Rules page for the full list.
