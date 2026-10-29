# Final release verification — October 29, 2026

Application commit: 0fd60b56f5d90a1028720dda44823dadc39472aa
Render Free Live deployment: dep-dbhqchnb9u1s73aajekg
Public URL: https://moonlight-werewolf-party.onrender.com/
Rollback: pre-classic-reliability-20261029 (prior frozen source/package at 0b6d591).
Final application checkpoint: stage7-conversation-release-20261029.

## Passed release gates

- 165 automated tests across 19 files, including independent real sockets, 19 Pack security cases, potion consumption, simultaneous/peaceful/terminal dawn, dead/absent roles, fixed night timing, refresh, vote privacy, early resolution, role examples, localization and audio.
- Production type/build checks and isolated demo bundle audit passed. Original notices ship publicly; no additional runtime dependency, paid service or backend architecture change.
- Public full Structured Classic matches with 5, 6 and 8 independent authenticated clients. Default/host settings, random fallback attack, private Seer result, healing/poison, authoritative dawn, living seat-order speakers, stale/out-of-turn denial, reconnect/color stability, early ballots, automatic full 30-second last words and shared victory passed.
- Public full Open Classic matches with 5 and 7 clients; simultaneous living chat, private ballots and immediate final-confirmation victory passed. The seven-player scenario verified agreed/private selections, random tied-leading attack, authorized pack refresh/closure, simultaneous attack/poison dawn, and zero additional packets to outsiders during private sends.
- Public two-client Duel completed with unchanged accusation rules and shared results. Public terminal-dawn five-client match passed: correct deaths and victory, no public cause/potion disclosure.
- All 34 bilingual AAC announcements, approved licensed piano excerpt, attribution and exact locally tested homepage/demo bundles are publicly available.

## Browser UI evidence

The earlier public browser reproduction showed a new invite tab silently replacing an active saved host seat. The fix uses per-tab automatic recovery and requires explicit takeover. Actual browser UI starts were verified at 5/6/7/8 seats after the fix; a five-browser match completed before proceeding to later stages. The lobby names missing Ready/offline seats, count and host restrictions.

Final local browser Classic completed through healing → peaceful dawn → structured speakers → synchronized typed bilingual chat → confirmed ballots → last words → victory. Host mode/time selection, explicit mobile recovery and English/Chinese locked inventory were checked. Real Seer inspection displayed a prominent private Werewolf finding, recovered after refresh, and switched to Chinese; an outsider had no result region. The test fixture extended action windows only for manual inspection; deployed timers remain normal.

390px and 320px browser layouts, typing/Enter, Chinese text, scrollable conversation and reduced 320×400 keyboard-sized viewport were verified with no horizontal overflow. The private drawer does not overlay chat. Public English/Chinese browser Duel separately verified role reveal, recipient-language presets, original free text and mobile layout. These are controlled QA clients, not independent human participants or physical phone testing.

## Release bundles

- Homepage: assets/main-BhQ8t9AM.js
- Guided Demo: assets/demo-0xgLvCIy.js

## Checkpoints

- stage1-classic-reliable-20261029
- stage2-discussion-20261029
- stage3-private-results-20261029
- stage4-compact-identity-20261029
- stage5-participant-colors-20261029
- stage6-attack-resolution-20261029
- stage7-conversation-release-20261029

## Remaining human steps and honest limits

Complete HUMAN_PLAYTEST.md with 5–6 independent English/Chinese players, a beginner and physical phones (including actual keyboards/IME). Use 7–8 people for human Pack Chat validation. Prior real two-person playtests were reported by the creator; automated clients are not a substitute for group usability validation.

An idle cold start was not timed. Render Free can take about a minute to wake; restart/redeploy loses in-memory rooms. Same-browser refresh recovers only an existing server room. No host migration, persistent accounts/messages or voice chat.

The release is feature-frozen. Review the four entry items and contest terms, submit manually, and save the receipt. No submission has been made by the agent.
