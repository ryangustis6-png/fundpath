# Seven-step ASG workflow audit and demo guide

Audited main commit: `ab7831c968fcd22aa8baeb91cd78de3db253e70d` (November 7, 2026).
Implementation branch: `feat/seven-step-asg-demo`. No changes or merges to main.

| Step | Latest main findings | Feature branch behavior | Real-world dependencies |
| --- | --- | --- | --- |
| 1. Meeting → budget/proposal | Browser dictation, optional ElevenLabs TTS/STT, deterministic transcript extraction, clarifying questions, sheet/form previews. No conversational agent session. | Optional public ElevenLabs conversational session, transcript callbacks, student-only budget extraction; existing scripted/local meeting preserved. Live ElevenLabs is OFF each page load and requires explicit billing opt-in. | Public demo agent ID, transcript events, microphone permission, network access and verified billing allowance. Extraction remains the existing rule/keyword engine, not a new general-purpose LLM extractor. |
| 2. Org edits/submits | Editable proposal, spreadsheet import/export, voice confirmation. Submission wording could imply Google integration. | Edits preserved; meeting and manual submission explicitly simulate submission. Duplicate approved meeting submission blocked. | Google Sheets/Forms ownership, official field mapping, authorization, and human-controlled external submission adapter. No actual Google file or form is submitted. |
| 3. ASG review | Auto-approval and combined ASG committee review; some failing proposals blocked from review. Reduced awards could auto-approve. | Fully compliant full awards can auto-approve in demo; warnings, failures and partial funding require Treasury review. Secretary can adjust line awards, approve, return, or deny with reason. Negative/excess awards blocked. | Campus validation of all existing rules, modeled limits and current windows; actual institutional authority. No Senate or institution approval is fabricated. |
| 4. Matching authorization | Generation existed, often manual; meeting generated simulated Workday records. | Approved manual/Treasury proposals generate authorizations and simulated routing. Meeting routing preserved with explicit simulation wording. Exact remaining approved card amounts checked at AP action. Contract and journal routes preserved. | Official Workday schema, authentication, integration account, document attachments and human approval before external submission. Existing exported payloads are illustrative, not verified Workday contracts. |
| 5. AP final decision | Combined ASG/AP role; straight-through could approve and fund cards without AP. | Dedicated Roudebush Hall AP portal, advisory rules-based AI recommendation, human approve/reject/return, role and state guards. Removed meeting AP bypass. | SSO, server-side authorization and durable multi-user audit trail; role switches are demo controls only. |
| 6. Physical pickup | Treasurer pickup confirmation already existed. | Preserved with organization/status guards. AP approval precedes pickup. | Physical pickup and institutional card issuance remain manual. The app records confirmation only. |
| 7. Receipts/balances/sweep | Receipt filename and questionnaire only; aggregate card balance mixed funding types; no Agency sweep. | Bounded receipt bytes persist locally and can be downloaded; ASG card, Agency card and actual Agency account shown separately; account debited at approved allocation; unused Agency funds returned once on sweep or close. | Bank/Workday balance feeds, secure receipt storage, reconciliation, approved semester calendar, scheduled job and access control. Sweeps here are explicit AP simulations, not scheduled bank operations. |

## Demo walkthrough

1. Treasurer → Exec meeting → Play the demo meeting, or use browser listening. Answer questions and edit before submitting if needed. All institutional submissions are simulated.
2. Say yes to simulate submission. Compliant full awards proceed; uncertain/partial/denied cases go to Secretary of Treasury → Proposal review. A Secretary decision generates the card authorization automatically.
3. Switch to Roudebush Hall AP. Read the recommendation and fields, then make the human decision. Nothing automatically approves AP.
4. Treasurer → Card & receipts → record physical pickup, transactions and receipts. New receipt attachments must be PNG/JPEG/WebP/PDF under 2 MB. They are stored in this browser and JSON backups; older seed receipts only contain filenames.
5. Card & Agency balances separates the two cards from the Agency account. For Agency requests use Spend Authorization → Agency card, advisor routing if configured, then human AP. AP → Card balances & sweep → select organization → simulate semester end. Only unused allocated Agency funds return; repeated sweeps do not duplicate credits.
6. Live ElevenLabs remains untested with a real account and is paused by the current no-charge policy. Use pasted notes or the sample. Do not change the shared paid-services lock without separate billing verification and authorization. Never enter an API key in the browser.

## Verification

- `node workflow.test.cjs`: account allocation, spending, repeated sweep, role/pickup guards, all role/view template renders; compliant proposal → simulated authorization → mandatory AP → pickup; duplicate submission and mismatch guards; failing proposal → Treasury.
- Browser smoke test in installed Edge: app boot, AP portal, balances, Treasury, meeting and responsive capture; no uncaught browser exceptions. Browser checks used a temporary local static server and no paid service calls.
- JavaScript syntax and whitespace checks.
- Live ElevenLabs connection, microphone, billing, Google/Workday submission, institutional policies, multi-user access and real bank balances are not verified by these tests.

## Implementation notes and limits

`workflow.js` extends the existing static app after `features.js` to preserve import, meeting, advisor, help, Workday export and other routes. No backend migration or new institutional policy was introduced. Existing prototype limitations remain: localStorage, no authentication, modeled policies, manually entered balances, finite browser storage, browser voice support, and keyword extraction that requires student review. This branch demonstrates the requested roles and transitions, not a production financial system.

ElevenLabs integration follows the official JavaScript SDK lifecycle and uses pinned `@elevenlabs/client@1.35.0` from esm.sh. Reference: https://elevenlabs.io/docs/eleven-agents/libraries/java-script . The optional live provider has no submission or AP decision tools; its transcript messages cannot confirm submissions or enter approved budget lines.

Browser smoke test is reproducible with Playwright 1.62.1 installed: run `node browser.test.cjs` (uses installed Edge on Windows, Playwright Chromium elsewhere). Runtime tests need only Node: `node workflow.test.cjs`. The smoke test saves a local, ignored screenshot and never starts a live ElevenLabs session.

## Interface and live connections update

The Michael branch now uses sentence-case display text, Miami Central’s browser-verified system sans-serif font stack, a white/red interface, compact role overviews and expandable review forms. Jeff’s compact role switch, progress rail and queue pattern informed the redesign; his separate application/database was not copied.

Campus & voice can query the public Miami Central organization directory. The response includes names, missions, published tiers, source links and checked time. It does not read private rosters, verify events, change sample eligibility or fetch financial balances. Public Banking Club data currently differs from the sample Tier 4 organization; the reference result is kept separate.

ElevenLabs can use a public agent ID saved through Campus & voice or the optional server variable `ELEVENLABS_AGENT_ID`. Live use still requires a session-only billing opt-in and an explicit Connect action. Role switching disconnects the agent. Only student transcript messages can confirm a demo submission. The connection lifecycle was tested with a simulated SDK; a real account/agent and its domain allowlist still need verification. No subscription or free-credit entitlement is assumed.

Find quotes collects item, destination, exact dates, full quantity and requirements. The optional server searches source domains using Anthropic web search and only accepts price candidates with matching date fields, safe source URLs and dollar amounts in native citation evidence. The user reviews the supplier source and conditions before attaching a research record. Attached research always requires Treasury review; it is not a booking, availability guarantee or vendor-issued document. If no verifiable price is found, the app says so. Spoken quote claims and one-click fixes no longer fabricate attachments.

Live quote research is disabled until an administrator configures `ANTHROPIC_API_KEY`, a supported `ANTHROPIC_MODEL` (defaults to the app’s existing `claude-sonnet-5-5`), `QUOTE_RESEARCH_ENABLED=true` and a `QUOTE_RESEARCH_ACCESS_CODE` at least 12 characters long in Vercel. The code is entered per search and is never stored in the workspace. Add project-level rate/spend limits and authentication before using this prototype widely; the in-process throttle is not a durable distributed rate limiter. No paid provider calls were made during development. API keys are never browser fields or repository files.

Validation: original workflow tests; public directory parser and real public Banking Club response; cited-price/date/source validation; all role/navigation browser renders; no uppercase display words on the overview; 390/768/1440-pixel layouts; mocked voice connect/transcript/disconnect and quote-provider-disabled behavior. Real date-specific hotel/car availability and paid provider behavior remain untested until configured.

## Jeff-style guided iteration — November 7, 2026

The supplied HTML is a visual reference only. Its separate store, cloud database code and policy model were not imported. `journey.js` and `journey.css` replace the presentation around the existing FundPath state, evaluators and action handlers. Nick's feedback informed larger sans-serif text, fewer boxes, clearer next actions and removal of automatic read-aloud; it introduced no funding policy changes. Source attachments and private screenshot/contact details are not included in the repository.

1. Meeting: one notes/sample screen, then one question at a time. Existing local extraction generates an editable draft. The supplied ElevenLabs public agent is saved; live voice is paused, so the voice-first production path remains a dependency.
2. Organization review: profile, individual events, individual event expenses, individual other expenses, final acknowledgements and explicit demo submit. Continue moves through the items before the next section. Full original proposal sheet, imports, exports and fixes remain available.
3. Funding decision: a separate status screen; unchanged modeled evaluator auto-approves only compliant full awards. Exceptions, denials and partial awards remain Treasury decisions in a queue with one selected proposal at a time.
4. Authorization: a separate read-only summary of the automatically generated, matching authorization. Workday submission is simulated. Agency and other payment routes remain in the existing spending tools.
5. Payment review: organization sees status. Accounts payable opens one request with its advisory recommendation and makes the final decision. The Continue controls never approve a payment.
6. Pickup: organization records physical collection only after AP approval. The application does not issue a real card.
7. Receipts: next missing receipt, dedicated purchase and receipt screens, then separate balances. Existing actual file attachment storage, ASG/Agency separation, allocation deduction and idempotent semester-end sweep remain intact.

### No-charge boundary

`public-config.js` locks paid services off. AI, quote research, speech and transcription endpoints return 501 before any provider request, even with credentials and research flags set. Live agent and recording UI actions are also paused. This protects activity initiated by this revision; it does not inspect or cancel subscriptions or usage elsewhere in the user's ElevenLabs account. No paid service calls were made while building or testing.

### Verified

- Workflow unit tests: allocation, charges, Agency sweep exactly once, role guards, compliant and noncompliant proposal routes, authorization matching, duplicate prevention, mandatory human AP and guarded pickup.
- Integration tests: public-directory provenance, source-backed offer parser, wrong-date/unsupported-price/host rejection, secret-free configuration and all four paid endpoints locked with mock credentials configured.
- Browser tests in installed Edge: every retained role/view, seven guided steps, five proposal sections, one item at a time, focused reviewer requests, sentence case, white theme under dark OS preference, 18px sans-serif body, 390/768/1440px widths, expandable mobile progress, public profile isolation, then a full UI path from submit through human AP, pickup, purchase, actual receipt bytes and updated balance. All external requests were blocked and none were attempted.

### Still required for a live institutional service

Verified no-charge ElevenLabs account/agent settings, a suitable protected live research provider, approved current institutional policy configuration, Miami-authenticated roles, shared durable storage and receipt protection, authorized Miami Central/Workday/Google integrations, and real card/account feeds. Public campus profiles alone do not prove eligibility or available funds. Main-branch changes and existing PR merge conflicts need team review; no merge or main-branch write is performed by this iteration.

## Exec-team sheet review addition

The user supplied the Banking Club example workbook again and requested a separate editable copy for each website user/draft. Its section/input anchors match the connected Club Funding Proposal template; neither the uploaded workbook nor private Drive file identifiers are committed to this public repository.

`sheets.js` implements per-user Google authorization and Picker selection, native copy creation in the user's own Drive, verified edit access, input-only filling, native readback and explicit exec-review confirmation before demo submit. Revisions create a new copy, preserving earlier team edits. Failed fills retain an honest incomplete-copy link. Formula/format cells are not rewritten, old sample data is cleared and submission/committee confirmations are reset. Tier/worktag changes require explicit profile verification; unfamiliar categories still encounter the existing evaluator. Quote evidence is invalidated when its expense changes. A last read blocks submission when collaborators edit after confirmation. No public sharing, ownership transfer, Google Form submission or Workday submission occurs.

Live site configuration is still missing: Google OAuth client, restricted Picker key and project number. The connected Drive tool in this chat is not the website's Google authorization. A local-demo review remains available and is labeled as local rather than a shared Google Sheet. No real Google copies or paid calls were created in these tests.

Verification includes the model tests plus real browser actions against a mocked Google network boundary: two separate new IDs, no write to source or previous copy, verified fill/readback, imported team price changes, blocked stale confirmation, reviewed current value in the AP-bound authorization and no token in browser storage. The complete local UI flow also passes with exec review, mandatory human AP, physical pickup confirmation, purchase, actual receipt bytes and balance reconciliation.

## Superseding simplification and spend-rejection fix

The user canceled the Google Sheet requirement. `simple-flow.js` replaces the layered sheet/review scripts with meeting -> budget list -> Accept/Edit; those scripts are no longer loaded. No review checkbox or per-item approval is required. Existing auto-approval criteria and mandatory human AP remain unchanged. The budget table preserves supplier totals and hotel caps and labels unverified quotes honestly. `api/free-quotes.js` provides a default-off, free-plan-only Firecrawl adapter, with deterministic source/date/location/quantity/full-price checks and no paid fallback. Live provider credentials remain a dependency. Voice controls use the user's explicitly authorized ElevenLabs credits; testing uses a mocked SDK only.

`spend-repair.js` fixes denied requests being read-only and returned AP requests cycling through the wrong workflow. Owner/role/status guards allow a treasurer to reopen their rejected or returned request, retain prior AP rejection history, restore matching approved lines and resubmit the same request. The request remains pending a new human AP decision. Browser verification reproduces a rejected mismatched authorization, corrects it, resubmits, verifies no duplicate authorization, preserves the rejection reason and obtains a fresh human approval. It also verifies one-click compliant funding and exception routing, editing, mocked voice transcript -> draft, no sheet gate, no per-item checkboxes and responsive layout.
