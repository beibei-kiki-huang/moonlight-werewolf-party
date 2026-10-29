# Moonlight — Play Beyond Borders: competition-readiness review

Reviewed October 28, 2026 (Pacific). Assessment only: no application, gameplay, dependency, hosting or deployment changes. Baseline commit: `745847e30fc571216eaad74c4b546ee32d66e3be`.

## Recommendation

Conditionally ready for submission. Stop cosmetic work. The largest remaining opportunity is letting a solo judge understand the bilingual, moderator-free value without recruiting a group. Recommend exactly two product improvements: an isolated Guided Demo and a small positioning/quick-start copy pass. Human testing, licensing notices and submission packaging are release work, not additional product features.

The judging criteria are equally weighted. Execution has substantial automated/network evidence; Creativity needs the cross-language angle made visible; Usefulness needs mixed-language human evidence; Polish needs a clear first visit more than further decoration. This is a qualitative assessment, not a predicted judging score.

## Evidence and limits

- Public homepage, health endpoint and audio credits returned HTTP 200. Homepage serves `/assets/index-CDAcbgi2.js`, matching the approved baseline. Observed warm response times were roughly 0.1–0.3 seconds, not a cold-start measurement or uptime guarantee.
- Latest completed verification on this same build: 80 automated tests, TypeScript and production build passed; five independent public Socket.IO clients completed Classic and two completed Duel using normal clocks. Evidence: `test-results/approved-audio/VERIFICATION.md` and `public-acceptance.log`. These are network clients, not seven human testers. The creator has separately reported real two-person Duel playtests.
- Source review: server assigns roles and validates actions/votes; per-seat snapshots filter secrets; hidden night action/ballot updates are targeted; all living confirmations resolve voting synchronously; fixed night slots continue regardless of role survival. Audio/colors use public phase metadata. No new privacy defect identified in this review; this is not an external security audit.
- Joining, role abilities, fixed phase guidance, vote draft/confirmation and win conditions already have bilingual instructions. The rules dialog is comprehensive but dense. Role cards correctly distinguish Duel abilities from Classic.
- Current mobile homepage has no horizontal overflow at 320px or 390px. At 390×844, the hero and nickname form occupy the initial screen; mode/start controls require scrolling. Prior checks cover role cards, chat and audio controls. Actual phone keyboard, background-tab and speaker behavior still need human checks.
- Current homepage says “Good friends. Dark secrets.” / “好友相聚。秘密暗藏。” It does not foreground bilingual play, automated moderation or Quick Chat. No solo demo exists.
- No final submission package or completed-entry receipt was found locally. The inspected submission form was blank; this does not establish whether an earlier entry exists elsewhere.

## Ranked remaining issues

Severity: P0 must be closed to enter successfully; P1 materially weakens the entry or release confidence; P2 minor cleanup.

| Rank | Severity | Issue | Expected competition impact | Risk of addressing |
|---|---|---|---|---|
| 1 | P0 | Final cover, description, URL, eligibility review and submission receipt not verified complete | An otherwise strong game may not be entered | Low; manual packaging/review, no game changes |
| 2 | P1 | Solo judge cannot reach a playable loop | Very high across Execution, Creativity and Value: the strongest work stays unseen | Low–medium for isolated demo; low for recorded fallback |
| 3 | P1 | No documented 5–6-person mixed-language beginner playtest | High for Value, guidance and real-phone confidence | Low code risk; requires recruiting and time |
| 4 | P1 | Differentiation is absent from the first screen | High for Creativity and Value; looks like a conventional Werewolf game | Low: copy and CTA placement only |
| 5 | P1 | Free-host cold starts and in-memory room loss | High first-impression/reliability risk | High to eliminate within current constraints; low to disclose and provide a recording |
| 6 | P1 | Complete font/icon/library notices are not consolidated in the shipped public assets | Release compliance gap; avoid claiming blanket rights clearance | Low: retain exact installed-version notices; no new assets required |
| 7 | P2 | Testing documentation retains historic “58/current” and “75” counts above the latest 80-test section | Modest reviewer confusion | Very low: documentation cleanup |

No paid hosting, persistent storage, host migration or architecture work is recommended before the deadline. Do not represent a warm health response as proof of cold-start reliability.

## Product improvement 1: a genuinely separate Guided Demo

Recommendation: approve only a bounded version. Budget approximately 3 hours implementation plus 1 hour validation. This is an estimate, not a guarantee. If the safety checks cannot pass within that budget, use a recorded walkthrough instead. Do not sacrifice the human group test.

Smallest safe approach: a standalone static `demo.html` and small local script/styles served by the existing static-file handler. Use original optimized portraits and fictional fixtures. Do not mount `App`, import its socket lifecycle, alter the engine, open `/socket.io`, call room APIs, or read/write anonymous seat storage. No accounts, AI opponents, runtime translation or extra dependencies.

Persistent label in both languages: **“Guided Demo — scripted sample events. Not a live multiplayer match. Gameplay is condensed.”** Label fictional people as samples; do not present sample activity as real online players. Never use a real room code or live room snapshot. The sample is a presentation tour, not a new game mode or evidence that multiplayer works.

| Approximate time | Experience |
|---|---|
| 0–10s | Explain the label; tap to reveal a sample Seer card and its actual faction-inspection ability |
| 10–20s | Show a condensed public night/dawn sequence; explain that real phases are synchronized and moderation is automatic |
| 20–40s | Send one preset; show the same phrase in labeled English and Chinese recipient views; expand the optional equivalent. Explain that free text stays as typed |
| 40–53s | Select a sample suspect, then explicitly confirm. Other sample ballots are scripted and remain hidden until the sample result |
| 53–60s | Reveal a rule-consistent result and all sample roles. Offer Replay Demo and a separate Play with Friends link |

Pause/Next/Exit available; no required audio, typing, nickname or room creation. One viewport language toggle is sufficient; the bilingual message comparison is illustrative. No role/action completion signals should be added to production screens. Sample outcomes must agree with the shown ballots and existing rules.

Acceptance: demonstrate zero room/network game calls; preserve a real seat while opening/replaying/exiting the demo; no timer/callback survives exit; both languages, keyboard controls and 320/390px screens work; the actual multiplayer game retains its full passing regression/public checks. Serving this page from Render still has Render's cold start: the demo does not solve hosting availability.

Fallback: a captioned ~60-second walkthrough of the actual build, with cuts labeled as condensed and English/Chinese views identified. Capture controlled test rooms; use only consented participants or clearly identified QA sample seats. Demonstrate production multiplayer separately from the scripted tour. Keep the live URL as the project URL. Provide an accessible recording link where the form permits; an independently accessible existing free video account can provide a hosting-independent backup, subject to account availability and licensing. No new account or service has been created.

## Product improvement 2: positioning and quick-start copy

Preserve the layout, artwork and brand. Put the value and solo-review CTA in the hero, before the room form. Suggested English copy:

> Moonlight — Play Beyond Borders
>
> A bilingual Werewolf game, without a moderator.
>
> Join friends in English or 简体中文. Secret roles, guided rounds and automatic results. Quick Chat appears in each player's language.
>
> No accounts · Classic 5–8 · Duel 2

Suggested Simplified Chinese:

> Moonlight — Play Beyond Borders
>
> 跨越语言，一起推理。
>
> 无需主持人的中英双语狼人杀。秘密身份、昼夜流程与胜负自动处理；快捷短语按每位玩家的界面语言显示。
>
> 无需注册 · 经典模式5–8人 · 月光对决2人

Primary actions: Play with Friends and Try the 60-second Demo (or Watch the Walkthrough if the demo is cut). Keep ordinary create/join controls.

Within this same small copy pass, start the existing How to Play dialog with a short summary: create/join and Ready → read your private card and follow phase prompts → discuss, choose and confirm a secret vote. State the faction win goals immediately. Keep the detailed role/rule sections below. The host starts/rematches; no person must sit out as moderator.

Do not claim automatic translation of typed chat, fluency improvement, public discovery or a completed social platform. Ten fixed phrases are the honest proof of concept; complex mixed-language strategy remains unvalidated. No separate onboarding system is proposed.

## Real-player validation: 5–6 independent testers, 45–60 minutes

Recruit two English-preferring, two Chinese-preferring and one bilingual tester; optionally a sixth. Include at least one Werewolf beginner, actual iPhone Safari and Android Chrome, a laptop and at least two networks. The creator observes without coaching or occupying an additional controlled seat.

Four people can test two Duel pairs but **cannot validate Classic**, whose minimum is five. Keep that Classic gap open until five or six independent people complete it.

- [ ] First impression: each person explains what Moonlight offers and how many players it needs. If implemented, a solo person completes the labeled demo and understands that sample opponents are scripted.
- [ ] One tester hosts; others join by invitation and manual code. After the service wakes, everyone reaches the same ready lobby within two minutes without creator assistance. Record any cold-start wait separately.
- [ ] Begin Classic. Everyone reveals/hides their own card; the beginner explains their faction goal and next action. No unauthorized seat sees another living role or private action. Check private Seer/Witch information and neutral waiting screens when applicable.
- [ ] English and Chinese users exchange presets in both directions; each sees their selected language. Optional equivalent expands locally. Typed chat remains unchanged. Check Chinese IME, phone keyboard, scrolling and send controls.
- [ ] Refresh one seat; temporarily disconnect another. Same browser restores the same seat, role and phase, with card concealed. Others continue. Narration/music remain independently optional and never block a turn.
- [ ] Choose a vote without confirming: it remains a draft. Everyone confirms: all clients advance immediately to the same result. In another available voting phase or Duel, leave one unconfirmed to check deadline fallback. Ties/missing actions are also covered by existing automated tests; do not expose debug overrides to force outcomes.
- [ ] Complete Classic to a natural victory/draw, agree on outcome and final roles, and use rematch. Run Duel in pairs; each player explains opponent-versus-center and the both-villagers condition. Confirm result agreement and normal chat permissions.
- [ ] Debrief privately: “What confused you?”, “Did presets help you participate across languages?”, and “Would you play again?” Record observations and exact failures, not invented satisfaction statistics.

Record device/browser/language/network, task, expected/actual behavior and whether coaching was needed. Pass gates: no secret leakage, contradictory outcomes or stuck matches; all testers can join/confirm independently; beginner can explain goal and action; no blocked controls on physical phones. Treat small-group findings as qualitative evidence, not proof of language-learning effectiveness.

## Hosting, rights and submission audit

**Hosting:** retain the one Render Free service. Official docs describe idle spin-down after 15 minutes without inbound HTTP/WebSocket messages, approximately one-minute wake-up and possible restarts. Current rooms are in memory and disappear on restart/redeploy. Browser refresh recovery is not server restart recovery. Before freeze, schedule one true cold visit after idle while no test session is keeping it active; do not terminate other players' rooms to test this. Keep a recording in submission materials and a concise first-load note. Do not promise always-on availability or install a keep-alive workaround.

**Art/audio:** four production portraits were generated for this project; source images, project-specific prompts and own-reference refinements are retained. OpenAI's terms assign output rights as between the user and OpenAI to the extent allowed by law, but do not guarantee uniqueness or third-party clearance. Describe the art as AI-assisted, not hand-painted by a human or guaranteed exclusive. Music has documented CC BY 4.0 source/attribution/modifications; narration has the shipped MeloTTS notices and no reference voice cloning. Keep music credit in any video containing it. No newly sourced media is needed.

**Notice gap:** the installed DM Sans and Cormorant packages contain SIL OFL notices; Lucide contains ISC/Feather notices. The checked frontend bundle and public asset tree do not carry a consolidated complete notice file; inspected WOFF metadata contains copyright and a license URL, not the full license text. Before final release, retain complete applicable installed-version font/icon and bundled-library notices in a shipped Third-Party Notices document. This is a small compliance task, not permission to add or replace media. No code/assets changed during this audit.

**Official entry:** the rules specify title, cover, description and project URL; deadline October 30, 2026, 11:59 PM Pacific. The live form additionally shows a 500-character description, a preferred 3:2 cover at least 1200px wide, and Showcase sharing as necessary for challenge entry. Showcase was checked in the inspected blank form. Confirm entrant eligibility and review terms personally, including the promotional rights requested. Submit manually and retain the confirmation. Do not confuse a deployed game or a private GitHub repository with a completed entry.

Submission package to finalize:

- Title: **Moonlight — Play Beyond Borders**.
- URL: https://moonlight-werewolf-party.onrender.com/ (no temporary room-code link).
- Cover: current actual game screenshot, preferably discussion with expanded bilingual Quick Chat; export 1200×800 or larger at 3:2. Existing archived 1280×720 screenshots meet width but need a suitable 3:2 cover export. Do not use a promotional mockup as evidence of functionality.
- Description draft (415 characters):

> Moonlight — Play Beyond Borders is a bilingual, moderator-free Werewolf game for friends. Join a private room on your phone or computer—no accounts. Secret roles, synchronized phases and confirmed voting run automatically. Ten Quick Chat phrases appear in each player’s English or Chinese interface. Built with OpenAI; I learned to protect private roles while keeping devices in sync. Classic: 5–8 players. Duel: 2.

- Captioned short walkthrough/backup, relevant asset credits, concise judge instructions, and honest known limitations. Do not include seat tokens, personal conversations or real private roles in uncontrolled screenshots.
- Update the verification summary to the final tested commit and remove misleading historical “current” counts. Source code remains private unless separately authorized; the form asks for a playable URL.

## Freeze and submission sequence

October 29: if approved, checkpoint the current baseline; finish copy, time-box the demo (or switch to recording), and conduct the human group test. Complete notices and submission materials. Re-run regression/build and public Classic/Duel after final product changes.

October 30 by noon Pacific: feature freeze. Accept only fixes for joining, privacy, synchronization, blocked actions, completion or required release/submission compliance. No more music, art, animations, roles, modes, architecture or social features. If a late feature fails, revert that feature to the checkpoint, not the stable game.

After freeze: record final commit/build, verify public link in a fresh browser and on a phone, check credits and all submission fields, keep the tested build stable through judging, and manually submit by **8 PM Pacific** for a buffer. Save receipt and final cover/description. The official deadline remains **11:59 PM Pacific, October 30**. No P0 entry gaps or known gameplay/privacy blockers may remain; explicitly acknowledge the retained free-host limitations.

## Primary sources

- [Official challenge rules](https://go.joinhandshake.com/rs/390-ZTF-353/images/%5BAI_Skills_Studio_Challenge%5D_Contest_Official_Rules.pdf?version=0)
- [Official submission form](https://app.joinhandshake.com/learn/create-a-multiplayer-game-8d7d59b5/submit), inspected signed-in without editing or publishing.
- [Render Free limits](https://render.com/docs/free)
- [OpenAI Terms of Use: content](https://openai.com/policies/terms-of-use/)
- [Music licensing](https://incompetech.com/music/royalty-free/licenses/) and [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- [MeloTTS license](https://github.com/myshell-ai/MeloTTS/blob/main/LICENSE)
- [SIL OFL](https://openfontlicense.org/open-font-license-official-text/) and [Lucide license](https://lucide.dev/license)
