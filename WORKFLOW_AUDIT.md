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
6. Live ElevenLabs is optional and untested with a real account. Enable the session-only billing opt-in and supply a public demo agent ID only after checking billing. Never enter an API key. Normal demo playback uses no ElevenLabs requests. Browser speech recognition may use the browser provider's service.

## Verification

- `node workflow.test.cjs`: account allocation, spending, repeated sweep, role/pickup guards, all role/view template renders; compliant proposal → simulated authorization → mandatory AP → pickup; duplicate submission and mismatch guards; failing proposal → Treasury.
- Browser smoke test in installed Edge: app boot, AP portal, balances, Treasury, meeting and responsive capture; no uncaught browser exceptions. Browser checks used a temporary local static server and no paid service calls.
- JavaScript syntax and whitespace checks.
- Live ElevenLabs connection, microphone, billing, Google/Workday submission, institutional policies, multi-user access and real bank balances are not verified by these tests.

## Implementation notes and limits

`workflow.js` extends the existing static app after `features.js` to preserve import, meeting, advisor, help, Workday export and other routes. No backend migration or new institutional policy was introduced. Existing prototype limitations remain: localStorage, no authentication, modeled policies, manually entered balances, finite browser storage, browser voice support, and keyword extraction that requires student review. This branch demonstrates the requested roles and transitions, not a production financial system.

ElevenLabs integration follows the official JavaScript SDK lifecycle and uses pinned `@elevenlabs/client@1.35.0` from esm.sh. Reference: https://elevenlabs.io/docs/eleven-agents/libraries/java-script . The optional live provider has no submission or AP decision tools; its transcript messages cannot confirm submissions or enter approved budget lines.

Browser smoke test is reproducible with Playwright 1.62.1 installed: run `node browser.test.cjs` (uses installed Edge on Windows, Playwright Chromium elsewhere). Runtime tests need only Node: `node workflow.test.cjs`. The smoke test saves a local, ignored screenshot and never starts a live ElevenLabs session.
