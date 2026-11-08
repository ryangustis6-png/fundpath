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
