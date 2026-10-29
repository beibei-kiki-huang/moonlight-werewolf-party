# Frozen staged release verification — October 29, 2026 (Pacific)

Application release: `89f40ed898ac68f4aaf79c415d393e958710160b`
Render deploy: `dep-dbhg1qou01pc73a8ma7g` (Live)
Baseline rollback: `pre-role-examples-20261029` → `1ca1b85`
Independent Stage 1: `stage1-role-examples-20261029` → `0b4c419`
Main bundle: `/assets/main-T1sUPyEm.js`
Demo bundle: `/assets/demo-C3Ddbqh2.js`

## Completed

- Stage 1 independently passed 114 tests, TypeScript/build/demo isolation and bilingual desktop/mobile browser checks before Stage 2 implementation. Stage 1 left the Classic engine/protocol unchanged.
- Stage 2 passed 133 total tests including 19 dedicated security tests. Repeated complete regression, production build and compiled-demo isolation checks passed before deployment.
- Pack security: server-bound identity and living-role/phase/deadline authorization, strict schemas, forged/unbound clients and tokens, non-wolves/dead wolves, concurrent duplicate retries, conflicting nonce content, bounded history/receipts, private rate limits, preset validation, escaped text, current-phase reconnect, dead-seat reconnect, phase boundary, stale night/rematch IDs and unchanged public-chat permissions.
- Packet-level local tests assert no extra message-data packets or private fields/canary text to non-wolves and a dead-wolf fixture during legitimate sends. Private sends use pack_chat / pack_state rather than public broadcast. Only current authorized recipients receive history; every phase transition clears it.
- Two independent browser teammates plus six socket guests exercised an eight-player local Classic fixture. English/Chinese text and localized presets arrived correctly, ordinary text stayed unchanged, refresh recovered only current-night private history, attack selection remained usable, and closing the phase removed chat/history even after refresh. The fixture extends review time; production remains 25 seconds.
- Public normal-clock five-player Classic and Duel completed with private projections/ballots, synchronized stages, immediate final confirmation and identical victory. See public-acceptance.log.
- Public seven-player Classic verified two-wolf private delivery with zero outsider packets, validated presets/duplicates, current-stage refresh, phase closure rejection, unchanged attack ties, private Seer results, actual dawn elimination, public chat separation and full village victory. See public-pack.log.
- An additional five public clients verified correct one-use Witch inventory, fixed deadline, private filtering, simultaneous night eliminations and victory at dawn. See public-witch.log.
- Bilingual role demos: Good/Werewolf Seer results, one confirmed investigation per fictional night, hide/reopen, retry, teammate recognition, valid targets, agreement/tie outcomes, preserved Previous/Next review, explicit Abstain confirmation, Witch return/retry and Replay reset. Main voting does not auto-open the Seer clue. Fictional participant disclosure remains visible.
- Chinese 390px and English 320px layouts have no horizontal overflow. Desktop checks and browser warning/error checks passed. These are viewport checks, not physical-phone or human-group certification.
- Attack-resolution rules, role distribution, win conditions, fixed public night timing/narration, public chat permissions, original artwork, bilingual support, existing licensed audio, dependencies and hosting remain unchanged. Hunter remains roadmap-only.
- Complete license/attribution notices are shipped and linked; all 32 narration files and licensed piano asset serve publicly. No new paid service or dependency.
- All four submission items validated: title, public URL, original 1200×800 JPEG cover and 460-character description. ZIP integrity checked. No form submitted.

## Remaining manual work

1. Mixed-language human Classic/Duel testing with a beginner and physical phones; seven/eight people additionally exercise Pack Chat. Use HUMAN_PLAYTEST.md. Automated clients do not substitute for this.
2. Observe an actually idle cold start. No public shutdown was forced. Render Free wake-up and in-memory room loss on restart/redeploy remain documented; refresh recovery is limited to surviving rooms.
3. Review eligibility/terms, cover/description and Showcase setting. Submit manually and retain confirmation before October 30, 2026, 11:59 PM Pacific (target 8 PM).

Release freeze: no more product features; only critical defects or required submission/compliance corrections. Authorized recipients can retain their own copies of previously received messages; the game supplies no closed-phase history.
