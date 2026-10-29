# Final release verification — October 28, 2026 (Pacific)

Application release: `6fecf9bc157b85593abcde5712c1164d66485d39`
Render deploy: `dep-dbhe6q0u01pc73a6rgf0` (Live)
Stable rollback: `pre-submission-final-20261028` → `745847e`
Homepage bundle: `/assets/main-BWUgypso.js`
Demo bundle: `/assets/demo-vPsWPjas.js`

## Completed

- 86/86 automated tests; TypeScript and production build; compiled-demo graph and all four submission-item checks pass.
- Normal-clock public acceptance: five independent Classic and two independent Duel Socket.IO clients complete full matches, private projections/ballots, synchronized phases, immediate confirmed-vote resolution and identical results. Public free text, Quick Chat, 28 bilingual audio clips and attribution checks pass. See public-acceptance.log. These are network clients, not seven human testers.
- Separate demo entry contains only fictional fixtures/public phrases; no game transport, room APIs or credential storage in its compiled dependency graph. In a production-style local server, one real seat remains connected while another tab opens/replays/exits the tour; logs remain at one client and one room, with no additional create/resume/connect.
- English/Chinese UI, persistent scripted/not-live labels, role reveal, condensed public phases, bilingual recipient views, optional equivalents, draft versus confirmed sample vote, consistent result, Next, Pause/Resume, Exit and full Replay reset verified through browser UI.
- The automatic Chinese tour reaches exactly 60/60 and finishes without browser warnings/errors. Demo implementation began 2026-10-29 05:55:55 UTC; final public acceptance passed by 06:16:06 UTC, within the four-hour limit.
- Desktop and 390px/320px mobile viewports reviewed locally and publicly, with no horizontal overflow. Temporary viewport overrides reset. These are viewport checks, not proof of behavior on every physical phone.
- Complete original-version notices for 93 installed runtime packages, including both fonts, icons/Feather portions, plus music and narration. Main game/demo link the shipped notice file.
- Server, shared rules/protocol, character illustrations, package dependencies and hosting architecture unchanged. Only the demo-return landing path skips automatic saved-seat resumption; ordinary refresh recovery is preserved.
- Title, clean public URL, actual 1200×800 (3:2) JPEG cover, and 460-character description validated. No Handshake form submitted.

## Remaining manual work

1. Complete the five-to-six-person mixed-language test with a Werewolf beginner and physical phones (HUMAN_PLAYTEST.md).
2. Observe a genuinely idle cold start when no active users/connections keep the public server warm. Warm availability was checked; no other players were disconnected or server shutdown forced for this measurement. Free-host approximately one-minute wake-up and restart room loss remain disclosed.
3. Review eligibility, contest terms, cover/description and Showcase setting; submit manually and retain confirmation before October 30, 2026, 11:59 PM Pacific (target 8 PM).

Feature freeze: no further product features; allow only critical defects found by validation and required submission/compliance fixes.
