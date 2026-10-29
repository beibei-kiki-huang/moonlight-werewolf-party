# Moonlight acceptance tests

## Verified October 28, 2026

- Latest suite: 102 automated rules/privacy/socket/presentation/audio/demo tests; TypeScript and production build checks. Earlier counts below are historical checkpoints.
- Public beta deployed successfully on Render Free: https://moonlight-werewolf-party.onrender.com/
- Five independent public WebSocket clients completed Classic with normal timers: private roles, Seer investigation, synchronized phases, discussion chat, secret voting, elimination and identical village victory.
- Two independent public WebSocket clients completed Quick with normal timers, hidden accusations and matching final result/center-card reveal.
- Browser creation/join/readiness, same-browser refresh recovery, hidden card after refresh, per-device Chinese, live chat, and timeout outcomes verified locally. Public browser room creation verified.
- Desktop screenshots reviewed. Public mobile lobby verified at 390px with no horizontal overflow. Actual physical-phone/group usability testing remains recommended.
- Production dependency audit reported zero known vulnerabilities.

Run the public playtest again with `node scripts/verify-public.mjs https://moonlight-werewolf-party.onrender.com`. It creates its own disposable rooms and uses ordinary player commands, never a role/timer override.

## Automated verification

Run `npm test` and `npm run build`. Tests use short injected engine timers only; the public game has fixed normal durations. There is no player-accessible timer, role, or win override.

## Separate-device test (after public deployment)

1. On a computer, create a Classic room as the host. Send the invitation to four other browser profiles/devices. Each should show the same player list and code.
2. Verify duplicate names are rejected and starting with fewer than five players or an unready/offline player is unavailable.
3. Everyone selects Ready. Host starts. Each player opens their own private role card, then hides it. Other living roles must stay hidden in player lists and received network messages. A host has no extra access.
4. Observe nightfall and every fixed night stage, including after Seer/Witch elimination. Only the proper living role can act. Wolves see fellow wolves and pack selections. Seer information stays private. Witch alone sees an attack victim while heal remains.
5. Refresh one device after role reveal. Verify the same name, role, investigations/potions, phase and countdown return. The role card should be hidden again initially.
6. Send a discussion message. Verify it appears on other devices. Dead players cannot send during discussion; chat is unavailable during night actions.
7. Choose without confirming: no ballot is submitted. Confirm from every surviving device: the final distinct confirmation must resolve immediately on every client. Leave one living player unconfirmed/offline to verify deadline fallback. Duplicate or late confirmations must not resolve again. Votes must not appear to others before resolution. Check the same elimination and revealed role everywhere. A tie/Skip result must advance without eliminating anyone.
8. Continue until one faction wins; verify every device agrees and all roles are revealed. Host opens a rematch; everyone readies and gets a new secret deal.
9. Create a Moonlight Duel with two devices. Confirm a third cannot join. Finish reveal, discussion and accusations. Both screens should agree on winner and reveal the center card.
10. Switch one device to Chinese mid-match. Other devices should keep their language, and the game must not reset.

## Reliability checks

- Disconnect a player temporarily. Others keep playing; the seat stays reserved. Reconnect in the original browser to restore it.
- Open the same seat in a second tab. The older tab must stop controlling it and show the takeover message.
- Host goes offline during a match. Timers continue. Rematch needs the host to return; no automatic migration in this version.
- Restart server. Old clients should explain that the room expired; they must not show a stale game as live. Create a fresh room.
- Leave a room entirely offline for ten minutes: it should expire. Idle lobby/result rooms expire after two hours.

## Responsive review

Check a 390px phone viewport, a narrow 320px viewport, and desktop. Ensure controls are reachable, names wrap, role cards stay hidden until opened, chat can expand on phones, and no horizontal scrolling appears. Check Chinese instructions and reduced-motion mode.

## Known MVP limitations

The free server can sleep or restart, which ends rooms. Refresh recovery is same-browser only. No automatic host migration, voice chat, device-to-device seat transfers, or three/four-player Quick. Two-player Duel is a light bluffing game; Classic is the main social deduction experience.

## Flow/audio regression checks (October 28 update)

- P0 passed 52 tests and a production build before audio work started; saved in commit `aa56453`. Pre-change rollback tag: `pre-flow-narrator-20261028`.
- At this checkpoint: 58 tests, including actual independent Socket.IO clients in both modes. Checks immediate completion, duplicate confirms, secret packet delivery, offline timeout, dead-seat exclusion, invalid targets, fixed slots, repeated nights, opt-in audio, language changes, delayed/missing voices, cancellation and sound-source cleanup.
- Sound must remain off until Enable Sound on each page load. Check Mute/Unmute, separate narration/background toggles, quiet volume, EN/Chinese public cues, language change, tab hiding, reconnect and refresh. No microphone or paid service is involved.
- Browser speech voices and autoplay behavior depend on the device. Verify that written guidance and gameplay continue if speech is missing or reports an error. Automated audio checks validate API behavior and cancellation; they do not establish subjective audibility or quality on every physical phone.
- Local browser review: two independent origins plus three socket seats traversed nightfall, wolf/Seer/Witch actions and dawn. Private wolf targeting and Witch healing remained absent from the other browser's controls. Chinese chat synchronized; refresh restored the seat, concealed its card and required sound activation again. Phone widths 390px/320px had no horizontal overflow; chat input stayed 16px. Native speech failure displayed written guidance and did not interrupt phases.
- Two-browser full Classic and Duel runs passed locally. Draft choices did not submit; confirmed receipt stayed private; final confirmation advanced both screens immediately with roughly 40 seconds remaining. Both received the same public village result and different appropriate personal results. The Duel rematch returned both seats to the lobby with secrets cleared. Browser console reported no warnings/errors during the review.

## Cross-Language Quick Chat — October 28

- Rollback tag `pre-quick-chat-20261028` saves commit `623a8fb` before changes.
- All 75 automated tests and the production build pass. The 17 new cases cover the exact approved catalogue, unknown/inherited IDs, canonical sender/fallback, mixed and capped history, all chat permission phases, dead discussion senders, local language rendering, collapsed equivalents, equal suggestions across roles, offline/pending controls, independent Classic/Duel connections, refresh recovery, shared rate limits and forged payload rejection.
- Independent English/Chinese browser seats verified both directions, ordinary text unchanged, retained typed draft after a preset, local-only learning expansion, history re-rendering on language switch, and same-seat/history recovery after refresh.
- Mobile widths 390px and 320px verified without horizontal overflow; all ten phrase buttons kept at least 44px tap height. Equivalent-language text starts collapsed. No browser warnings/errors during review.
- Existing gameplay, private roles, night actions, confirmed voting, narration and illustrations remain covered by the full regression suite. Public acceptance now exercises Quick Chat and free text alongside full Classic and Duel matches with normal production clocks.
- Full two-browser Duel completed after sending a preset during discussion. Quick Chat disappeared and free-text sending was disabled during voting; both clients received the same immediate village result after the final confirmation. The results screen restored normal chat permissions.

## Approved recordings and atmosphere refinement (October 28)

- Rollback checkpoint: `pre-approved-audio-20261028` (`26d2a69`). No game, protocol, dependency or hosting changes.
- At this audio checkpoint: **80 tests**; TypeScript and production build pass. Prior regression sections above record earlier checkpoints.
- New checks cover all 28 EN/Chinese clip paths, script parity, AAC headers, fixed phase duration budgets, total asset budget and license notices. Mocked Web Audio tests cover opt-in, cached assets, live volume without repeated narration, ducking without restarting music, stale-load cancellation, clip failure with one native fallback, unavailable audio and improved Mandarin locale matching.
- Independent local EN/Chinese browser seats plus three socket seats traverse fixed Classic night slots. The Chinese Witch sees her private controls while the English wolf sees a neutral screen. Narration settings show no native fallback/error during playback. Separate sliders remain usable on mobile; no horizontal overflow at 390px. Browser API checks cannot guarantee subjective audio quality or autoplay behavior on every physical phone.
- Public acceptance must be rerun after deploying: normal-clock Classic and Duel with independent clients, private projections, chat, synchronized night/day, early confirmed voting and victory. The acceptance script also checks deployed music, bilingual narration files and attribution.

## Final homepage and isolated demo

- Baseline rollback: `pre-submission-final-20261028` (`745847e`). Server, rules, protocol, character art and dependencies unchanged.
- Six tour tests cover gesture-only start, exact 60-second sequence, pause/resume/Next, selection versus confirmation, sealed ballots, complete Replay cleanup, fictional rule-consistent outcomes and transport/storage-free entry sources.
- `node scripts/verify-demo-build.mjs` inspects the compiled demo dependency graph for game transport, credential storage and room APIs; validates shipped notices and all four submission artifacts. Static script/font/image loading is allowed.
- Local production-style browser testing verifies an existing seat stays online while another same-origin tab opens, replays and exits the demo. Server logs show one connected client and one room, with no extra connection/resume/create. The saved seat remains explicitly resumable on the return landing page.
- English/Chinese homepage and demo, mobile 390px/320px, separate draft/confirmed sample votes, optional equivalent translations, and Next/Pause/Replay are reviewed through the UI. Public acceptance is run after deployment against matching built bundles and full Classic/Duel production clocks.
- Human validation with 5–6 independent mixed-language people and a Werewolf beginner remains a separate manual task, not substituted by QA sockets or the scripted tour.


## Final Witch/dawn/demo regression — October 29

- 102 tests pass: original rules, sockets, refresh recovery, privacy, chat, audio and demo cases, plus explicit potion consumption, spent-potion reuse, one action per night, pass, absent/dead/spent role timing, deduplicated deaths, peaceful/terminal dawn and queued narrator cancellation.
- Real independent socket reconnection restores the Witch's private locked inventory without exposing it to other players. Server sources and protocol are unchanged.
- The 32 fixed bilingual recordings match their manifests and published scripts, remain within timing/loading budgets, and preserve existing attribution.
- Previous/Next preserve selections and pause playback; Replay clears all state; the separate fictional Witch exercise verifies all three actions. Compiled demo remains isolated from multiplayer transport and credential storage.
- Local production-style UI checks cover private Witch confirmation and refresh, neutral waiting on another English client, peaceful dawn, terminal-night results, mobile layouts and both demo languages. Final normal-clock public Classic/Duel acceptance is recorded after deployment.

## Stage 1 role fidelity and terminology — October 29

- Baseline checkpoint: pre-role-examples-20261029 (submission-final-20261029).
- Independently passed 114 tests, TypeScript/production build and compiled demo isolation before any Pack Chat implementation.
- Browser checks: both Seer factions, hide/reopen and fresh-example retry; Werewolf agreement/tie, teammate identity and valid targets; Witch retry/return; explicit Abstain confirmation with Previous preserving the ballot. Chinese 390px and English 320px have no overflow or browser warnings/errors.
- Stage 1 does not alter server, protocol, attack resolution, voting payloads, role distribution, audio or artwork. Main-story clues are hidden until explicitly opened. Duel still has no abstention.
