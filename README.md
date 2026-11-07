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
