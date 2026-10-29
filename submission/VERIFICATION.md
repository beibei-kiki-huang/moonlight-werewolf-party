# Final frozen release verification — October 29, 2026 (Pacific)

Application release: `224583fd10fcb4e821838efda6f28a3098e05164`
Render deploy: `dep-dbhfashbgsac73b8bajg` (Live)
Rollback: `pre-demo-witch-refinement-20261028` → `67d05b7`
Homepage bundle: `/assets/main-CJM7RpmP.js`
Demo bundle: `/assets/demo-DA3Juj7M.js`

## Completed

- 102/102 automated tests; TypeScript and production build; compiled-demo isolation and all four submission-item checks pass. Socket tests require local networking permission; the restricted repeat timed out, and the permitted full repeat passed.
- A delayed second Render rollout of the same commit interrupted initial acceptance rooms; fresh-room checks below ran after the final deployment settled.
- Normal-clock public acceptance: five independent Classic and two independent Duel Socket.IO clients complete full matches with private projections, secret ballots, synchronized phases, immediate all-confirmed voting, identical results, free text and Quick Chat. See public-acceptance.log. These are network clients, not seven human testers.
- An additional five public clients verify fixed Witch timing, private potion/victim filtering, locked once-per-match inventory, actual simultaneous deaths and terminal-night village victory. See public-witch.log.
- Production-style local browser match: Chinese Witch heals herself on night one; English independent wolf client sees only neutral Witch guidance. Refresh restores spent healing and locked poison inventory. Peaceful dawn appears in both languages. Both browser voters confirm Skip and resolve immediately. Next night spent healing stays disabled; poison eliminates the wolf alongside the attacked Witch. Both clients show actual dawn eliminations and consistent victory, without cause or potion details. No browser errors.
- Absent/dead/spent special-role slots, potion reuse, pass, invalid/composite targets, death deduplication and published-only dawn sourcing are covered by regression/privacy tests. Classic engine, role distribution, win conditions, fixed timing and protocol are unchanged.
- Public Chinese 390px and English 320px demos have no horizontal overflow. Previous/Next pause, preserve state and keep the optional fictional Witch example separate; Heal/Poison/Pass outcomes and full Replay reset verified. The unattended English tour reaches 60/60. Desktop and phone-sized local game layouts checked. These viewport checks do not replace testing physical phones.
- Narrator clips use neutral fixed public role cues. Published dawn outcome precedes terminal victory narration; cancellation, non-overlap, opt-in, mute, ducking and failure fallback tested. All 32 bilingual recordings and the existing licensed piano excerpt serve publicly.
- Separate compiled demo has no multiplayer transport, room API or credential storage. No added accounts, dependencies, paid services, architecture changes or character-art changes.
- Complete notices for 93 installed runtime packages, fonts, icons/Feather portions, music and narration are shipped and linked. Existing attribution and licenses retained.
- Title, clean public URL, actual 1200×800 (3:2) JPEG cover and 460-character description validated. No Handshake form submitted.

## Remaining manual work

1. Complete the five-to-six-person mixed-language session with a Werewolf beginner and physical phones (HUMAN_PLAYTEST.md).
2. Observe a genuinely idle cold start when no active users/connections keep the server warm. No public shutdown was forced. Free-host wake-up and restart room loss remain disclosed.
3. Review eligibility, contest terms, cover/description and Showcase setting; submit manually and retain confirmation before October 30, 2026, 11:59 PM Pacific (target 8 PM).

Feature freeze: no further gameplay or UX features; only critical defects and required submission/compliance fixes.
