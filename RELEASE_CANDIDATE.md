# Moonlight — October 30 reliability release candidate

Historical pre-deployment assessment of 1633675. The creator subsequently approved deployment, public acceptance passed, and final copy/demo refinements followed. This document records the original gate; it is not the current deployment-status report.

Status: LOCAL CANDIDATE ONLY. Not merged, pushed, or deployed. Production remains frozen at `1c56b86` (application `cba5360`). No translation integration, provider calls, billing changes, dependencies, role balance, attack resolution, voting scoring, or win-condition changes.

## Diagnosis and evidence

Reviewed `/Users/kiki/Downloads/Moonlight-Audit-Report.md` (October 30 independent read-only audit). The separate full Claude black-box report was not located; the detailed user-supplied findings were used alongside source inspection and independent local/network reproduction. Baseline probes reproduce missing host migration, a disconnected speaker retaining the floor, 60-second night stages, accepted bidi controls, zero submitted votes labeled abstentions, and center-wolf victory after a missing Duel guess. These last two are presentation gaps, not scoring defects.

## Changes

- Host recovery: 20 seconds offline in lobby/results only. Stable first connected seat wins. Early reconnect cancels; late reconnect cannot reclaim authority. Every host command still checks current server host ID. Ready states, seats and room code persist; a public bilingual transfer notice accompanies the changed host. No active-game migration.
- Structured/tie/last-words speaking: five-second offline grace, bounded by the original speaking deadline. Reconnect does not extend the turn. Server tick and existing turn tokens prevent stale or duplicate advancement. Online last words remain 30 seconds; an offline last-words speaker uses the requested five-second grace.
- Classic Werewolf/Seer/Witch stages: exactly 45,000 ms each. All public stages remain fixed regardless of living/absent roles, confirmed actions, or consumed potions. The same deadline is projected to every seat, including eliminated players. Duel timing is untouched. Existing recordings never state the old duration; their public, role-neutral script stays unchanged. Bilingual rules/night guidance now state 45 seconds.
- Voting explanations distinguish no submitted ballots, all explicit abstentions, partial abstentions plus missing ballots, runoff ties and no eligible runoff voters. Existing internal `skip` and resolution rules are retained. Resolved history records submission IDs to label missing ballots accurately; no pending-ballot metadata is published.
- Unknown room codes say to check the code; an explicit expiration notification says expired; connection failures retain connection wording. A missing room after a restart is indistinguishable from another missing room without persistent state, so the app does not invent a restart diagnosis.
- Duel center-wolf defeat now explains that neither seated player was a wolf and both Villagers needed correct center guesses; missing guesses remain incorrect. Classic result headings omit center-card references.
- Prominent bilingual elimination notice, correct spectator vs living last-words listener copy, and separate last-words speaking state.
- Witch Pass uses the same intentional confirmation dialog pattern as potions. Cancel sends no action; confirmed pass locks the night inventory without consuming potions. Server one-action/one-use protections are unchanged.
- Public/Pack chat reject invisible formatting and bidi controls. English/Chinese/Korean/Japanese/Spanish, emoji including joined families/occupations, punctuation and ordinary line breaks are preserved. No untrusted HTML rendering.
- Small accessibility improvements: icon labels, public phase live region, rules/confirmation focus entry/trap/restoration, targeted 12px informational text. Reduced-motion rules are unchanged.

## Verification

- Frozen original: **205/205 tests passed** on the untouched source.
- Candidate: **247/247 tests passed**, TypeScript clean, production build clean, demo-build isolation check passed.
- Recovery transport tests use real local sockets: a real 20-second lobby migration, former-host rejection, removal/start, results migration/rematch, authenticated early refresh, five-second speaker skip, stale turn rejection, and unsafe-text rejection with no private delivery.
- Complete normal-timer local Classic: 5, 6 and 8-client Structured matches; 7-client Open/Pack match; additional 5-client Open match. Exact 45-second state deadlines and all three scheduled stages checked. Seer/Witch privacy, accurate dawn, speaking permissions, reconnect/colors, confirmed ballots, last words and shared village victories passed.
- Complete normal-timer local two-client Duel passed with hidden guesses and center-card reveal. Center-wolf/missing-vote scoring and both result languages additionally covered by engine/presentation tests.
- Existing runoff tests complete independent 5/6/7/8-client games with accelerated test clocks; do not confuse these with the separate normal-timer acceptance above.
- Existing Pack/privacy suites cover authorized/unauthorized/dead seats, duplicates, reconnection, stage expiry/rematches and packet isolation. Normal-timer seven-client acceptance observed zero additional outsider packets for private messages. Night clocks never shorten on actions.
- Browser UI (in-app browser, not physical iPhone): two real browser seats demonstrated host closure -> bilingual transfer -> host controls -> authorized refresh. Rules dialog focus enters, wraps both directions and restores. Witch Pass cancel/confirm tested EN/ZH; inventory lock verified. Eliminated player's temporary last-words and later spectator states observed; no night action controls after elimination.
- Actual browser viewport widths 320/375/390/430: Witch locked inventory and eliminated-player notice fit with scrollWidth equal to viewport width. A first eliminated-view measurement targeted the wrong active tab (1280px); it was discarded and rerun with explicit measured-width assertions.
- Browser Witch/elimination review uses a **fictional local fixture** with deterministic roles and diagnostic phase clocks. It does not establish 45-second timing or constitute public/physical acceptance; those clocks are tested separately above. Fixture script is not part of the application build.
- Public unchanged production: health and demo HTTP200, controlled create/join succeeded. Earlier frozen public Classic/Duel acceptance remains applicable. New candidate has **not** received public production acceptance because it is not deployed.
- No new physical iPhone acceptance is claimed. Previously accepted experimental Safari display checks remain recorded in the separate translation prototype; they do not certify this candidate.

Initial test attempts that lacked local network permissions could not open servers; rerun with network access. Two new test polls initially used default one-second windows shorter than their arranged phases; adjusted the harness bounds, not gameplay, and the final complete suite passes. No outstanding failing functional tests.

## Deferred and remaining limitations

1. **Render reverse-proxy shape unverified.** Existing app does not expose/log incoming headers. Client-visible headers cannot establish the server's incoming chain. No diagnostic deployment or IP logging added. Existing last-hop extraction, per-socket/per-seat limits and room creation/join limits remain unchanged. Successful public create/join does not prove cross-IP bucket isolation. Do not replace it with blind leftmost-header trust or disable limits.
2. Early victory indication during last words deferred: an authoritative pending outcome adds engine state/projection and needs extra validation. Keep the existing 30-second online last-words opportunity and victory transition.
3. Physical Safari/Chrome checks for these new changes remain user review; browser widths are simulation. Full accessibility refactor, tab arrow navigation and global typography changes deferred.
4. Free single-process hosting still loses rooms on restart and may cold-start. Host migration cannot recover a restarted server. A deployment restarts the process and ends active rooms.
5. Experimental free-text translation remains isolated and NO-GO for production, as before. No model calls, API credentials, paid fallbacks or billing settings are introduced here.

## Release recommendation and next steps

**GO for an explicitly approved controlled deployment of this complete candidate**, followed immediately by public Classic/Duel/Pack/recovery acceptance. Do not advertise it as live before then. If approval or verification time is unavailable, submit the already verified frozen public game and existing submission-final-20261029 package. No submission action has been taken.

After approval: deploy the exact candidate commit; run public acceptance and inspect mobile UI; refresh the live submission verification/fingerprint; freeze. If a gate fails, restore the original frozen commit. Do not release partial changes or merge the experimental translator.
