# FundPath

**Miami University ASG funding and student org spending, in one place.**
Built at Redhawk Builds 2026.

Feature work is reviewed in draft pull request https://github.com/ryangustis6-png/fundpath/pull/2 . A previously deployed site may show an older revision; these changes do not promote a production deployment.

## Guided demo iteration

The organization starts with one **Continue** action. Jeff's supplied numbered rail and compact role switch guide the seven-step process on white surfaces with red actions, larger sans-serif text and sentence-case labels. Each proposal section, event and expense gets its own screen. Purchase entry and receipt upload also have dedicated screens. The full sheet, imports, exports, Agency requests and other existing tools remain in **More tools**. Reviewers choose one request before seeing its decision controls.

**No paid services are enabled.** The supplied ElevenLabs agent ID is saved, but live calls, transcription, speech generation, hosted model requests and quote research are paused by the shared `PAID_SERVICES_ENABLED = false` setting in `public-config.js`. Backend endpoints reject provider work even if environment credentials exist. No billing or subscription settings are changed. This does not verify or cancel any existing subscription outside FundPath. Use pasted notes or the sample meeting; draft extraction uses the existing local rules, not a live model. Quote estimates are never represented as verified supplier offers.

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

Hosted AI is paused for this no-charge iteration. Funding Help uses its existing local rule-matched fallback.

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

## Demo run (human AP approval required)

See [WORKFLOW_AUDIT.md](WORKFLOW_AUDIT.md) for the seven-step audit, demo walkthrough, verification and remaining integration dependencies. Every institutional submission and balance change is simulated. AP always makes the final decision in the dedicated Roudebush Hall portal.

Live ElevenLabs, hosted AI and quote research are locked off in this revision. The supplied agent ID remains saved. The built-in meeting demo works without provider requests.

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

- `ELEVENLABS_API_KEY` (and optional `ELEVENLABS_VOICE_ID`): reserved for future explicitly authorized speech and transcription. Paused in this iteration, even with credentials.
- `ANTHROPIC_API_KEY`: reserved for future explicitly authorized hosted answers and research. Paused in this iteration, even with credentials. Local answers remain available.

## Workday

Workday is simulated in this demo. Each Spend Authorization has the exact `Submit_Spend_Authorization` payload FundPath would send (Workday view → Payload) and an EIB CSV export.

## Limits FundPath enforces

Source: ASG Funding Committee Standing Rules 2025–2026 and the ASG proposal template. When they differ, FundPath enforces the stricter one and cites both. Tier IV is $5,000/semester. Speakers are capped at $3,000 (template; SR §11.2 allows $7,000). Food by tier is $500/$750/$1,000. Promotional materials are $150/event, decorations $250/event, organizational materials $600/semester, banners $200/semester, electronics $2,000. See the Rules page for the full list.

## Campus, voice and quote research

Open **More tools → Campus & voice** for source-labeled public Miami Central reference information and the saved agent identifier. Read **[WORKFLOW_AUDIT.md](WORKFLOW_AUDIT.md)** for the workflow and remaining dependencies. Existing quote research keeps its source and date checks, but live research is paused to honor the no-charge constraint. No hotel/car prices or attachments are invented.

## Editable Google review copies

After reviewing the individual budget items, the user reaches **Exec-team sheet review** before any demo submission. With Google configured, each website user connects their own Google account, chooses their proposal template/example once per session, and creates a new filled native copy. The copy is created in that user's Drive root, with edit capability verified. The template is never written to. The website does not publish the copy or transfer ownership. The owner can use Google Sheets' own sharing controls for the exec team.

The native cell mapping was checked against the user-supplied Banking Club example and the connected native template. It preserves formulas, validation, layout and formatting and clears prior example inputs and submission/committee confirmations. The template's original policy text is retained as source material; its dates and policy version must be checked against current institutional guidance. Oversized drafts are stopped before copying.

After team edits, **Read back the team's edits** imports current values into FundPath and rechecks the budget. Changed prices/items invalidate old quote evidence. The user confirms exec review explicitly. Submission re-reads a connected sheet and stops if it changed after confirmation. Local draft changes also invalidate the confirmation. No Google Form or Workday request is sent.

Site setup requires public `GOOGLE_CLIENT_ID`, origin-restricted `GOOGLE_PICKER_API_KEY` and `GOOGLE_PROJECT_NUMBER` from the same Google project, enabled Drive/Sheets/Picker APIs and permitted website origins. No client secret, service-account key or refresh token belongs in this app. The browser requests only `drive.file`; access tokens stay in memory and are never stored with the workspace. No Google project, billing account or paid service is created by this code change. Until configured, the interface clearly says no live sheet exists and offers Excel download and an explicitly labeled local-demo review.

References: [Google user token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model), [Picker setup](https://developers.google.com/workspace/drive/picker/guides/web-picker-sample), [native file copies](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/copy), [Sheets batch updates](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/batchUpdate).
