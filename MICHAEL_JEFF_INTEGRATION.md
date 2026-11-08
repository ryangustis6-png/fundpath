# Michael meeting + Jeff workflow

The app entry point is Jeff's supplied `FundPath (1).html`, with three additions at the end: `public-config.js`, `meeting-bridge.js`, and `meeting-bridge.css`. `jeff-reference.html` preserves the attachment exactly. All original downstream functions remain unchanged. The bridge replaces meeting intake and budget review, validates the intake before submission, and creates a draft Spend Authorization on automatic approval. Workday submission, advisor/AP demo processing, card pickup, receipts, and ASG audit remain Jeff's workflow.

## Meeting

The same Michael agent is used: `agent_8901m6w3h3tpf5fr9qsgkkwr8gc2`. A live session starts only when someone clicks Start meeting with ElevenLabs. It uses microphone audio and ElevenLabs credits. There is no browser API key. The public agent must allow the hosting origin and emit user/agent transcript events. Private agents require a separate authenticated signed-URL endpoint. No agent configuration or billing setting is changed by this integration.

Team speech becomes budget input; agent suggestions are retained separately. End meeting keeps the transcript. Create budget draft ends the session and builds the draft. Navigation cancels pending sessions and closes an active microphone connection. Notes and sample meetings are available without a provider call.

## Funding

Checks use the rules already included in Jeff's attachment; this is not a verified connection to institutional ASG approval or Workday. Budget drafts remove prohibited purchases and purchases requiring clothing/trademark review, cap known funding allowances, and disclose the changes and excluded costs. They never fabricate officer information, a Miami Central listing, or quote evidence. Missing fields, quotes, invalid categories/amounts, uncertain itemization, and review flags block automatic submission. The user reviews the lines and explicitly chooses Submit proposal to ASG. Automatic approval and Spend Authorization creation are local demo state. Workday, AP, cards, and audit retain the attachment's live/mock behavior.

## Verification

`npm run test:browser` runs the combined workflow with a mocked ElevenLabs SDK. It checks transcript separation, session shutdown, funding caps, prohibited expense exclusions, explicit submission, automatic demo approval and authorization creation, downstream Workday/AP/card/receipt screens, blocked invalid drafts, three responsive widths, and unchanged original reference source. It never starts a real ElevenLabs conversation.

The original Michael modules remain available in the repository for reference, but the new entry point no longer loads that interface. The previous `browser.test.cjs` targets the old interface; the package script now selects `meeting-bridge.test.cjs`.

## Club presets and supplied files

The organization selector has Banking Club (SA10472), Personal Finance Club (SA10384), and Pickleball Club (SA10314), each Tier IV. Every fresh club run opens on the ElevenLabs meeting page. The selected club persists after reload, and switching clubs preserves their separate data. Restart demo now clears all previous demo runs across all three clubs, including archived runs, submitted proposals, ASG/AP decisions, card statuses, notices, applied receipts, and uploaded receipt bytes. It then recreates the three preset clubs with no approvals or cards and returns to the selected club’s meeting page. Personal Finance’s original source proposal and Pickleball’s optional receipt library remain built-in, unapproved and unapplied.

Personal Finance's source workbook contributes eight budget rows totaling $2,645.95. Requested amounts and categories are preserved, including its $200 venue fee, even though the spoken-meeting intake is limited to eight named categories. The source's historical spending notes are not treated as new expenses or preapproved funding. The user explicitly supplied the treasurer display name Ninos Aneer; the workbook spells Ninos Ameer and supplies ameern@miamioh.edu. The display follows the user's name and retains the published-in-source contact email. Review saved funding proposal opens the populated proposal; submission and approval stay simulated.

Six supplied receipt files are embedded as a Pickleball-only library. They are not added to the actual receipt list or subtracted until Apply receipt is selected after ASG demo approval. Each source can be applied once per run; its original document is saved in IndexedDB. The full totals sum to $944.58 and already include the listed tips. Mac & Joes shows a printed $106.53 total, plus the $30 tip identified in the filename, for $136.53. Canva's invoice date is October 1; its filename is October 2. Bodega's full invoice amount is preserved; a refund note from Personal Finance's separate workbook is not applied to Pickleball. Banking and Personal Finance receive no sample receipt seeds and retain ordinary uploads, including JPEG autofill.

`club-workspaces.test.cjs` verifies the three presets, meeting-first entry, source proposal total and approval/authorization, receipt isolation and deduplication, exact remaining balance, saved file bytes, uploads, club-specific restart, reload and responsive widths. `build-demo.cjs` embeds every local script and the receipt files into the standalone HTML preview.

## Accounts Payable and pickup

`ap-workflow.js` makes prepared authorizations visible to AP immediately after ASG demo approval. The earlier queue required `sa.workday`, hiding requests until the optional Workday submission. Prepared requests are explicitly labeled as demo requests that have not been submitted to Workday. AP may approve or deny either prepared or submitted requests. Only the AP role can decide, and denial requires a nonblank reason. Decisions are saved with timestamps; a denial preserves the request and ASG approval, sends an in-app notice, and lets the organization create a revised authorization without losing the earlier decision.

AP approval marks the card ready and notifies that organization to collect it at Roudebush Hall. It never marks a card picked up automatically. AP can mark physical pickup (optionally saving four card digits), or the organization can confirm pickup from its Card step. `ap-workflow.test.cjs` covers denial validation, notices, revision and history, approval, both pickup routes, role restrictions, multiple clubs and responsive layout. These remain local demo actions; no approval email or real card-loading request is sent.


`demo-reset.test.cjs` verifies empty ASG/AP queues after restart, receipt-file deletion, no stale cards or approvals after reload, blocked stale asynchronous saves, and fresh ASG/AP approval before a new card becomes available.
