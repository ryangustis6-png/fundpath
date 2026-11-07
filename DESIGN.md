# FundPath interface

Reference captured November 7, 2026: https://miamicentral.miamioh.edu/club_signup?view=all . Browser-computed body and heading font: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`. Miami Central also loads an Open Sans stylesheet, but it was not the computed font on the inspected directory page. Use the computed stack; no external font download required.

Observed reference: white header and content surfaces, red campus wordmark, neutral borders, restrained navigation and sans-serif text. Proposed FundPath choices: university red `#c3142d`, white surfaces, warm near-white canvas `#fafafa`, text `#22252b`, muted text `#626670`, borders `#e8e8eb`, 12px corners, 24px section gaps. These spacing/color choices are implementation decisions rather than extracted Miami Central measurements.

Jeff branch reference: `RedHawk Finance (3).html` at commit `34fbf9cda942a803641a58744cc86f80be4fea4a`. Adopt the compact role switch, seven-step organization progress and queue-first review pattern. Preserve FundPath's white/red direction and existing funding logic; do not import Jeff's separate application state, database integration or dark theme.

Each role starts with a short overview, one next action, up to three key figures and a small queue. Detailed eligibility, rules, payloads and history stay on dedicated pages or behind disclosure controls. Labels use sentence case. Expansions of abbreviations apply to display text only; identifiers, exported forms and accounting codes retain their stored values.

Public organization data must show its source and checked time and never overwrite sample financial balances, training status or approvals. ElevenLabs connection state must distinguish not configured, connecting, active, disconnected and failed. Starting microphone audio remains explicit and billable usage is never described as free.
