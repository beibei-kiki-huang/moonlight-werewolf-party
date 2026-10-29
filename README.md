# Moonlight — Play Beyond Borders

A bilingual, moderator-free multiplayer Werewolf game for friends. Each player joins from their own browser with a nickname and a six-character code. No player accounts, installs, AI services, or payments are needed.

**Public beta:** https://moonlight-werewolf-party.onrender.com/ · Hosted on Render Free.

## What works

- Classic for 5–8: server-assigned private roles, wolf team targeting, Seer investigations, Witch heal/poison, synchronized night/day timers, discussion, secret votes, elimination, automatic faction victory and draws.
- Two-player Moonlight Duel: hidden center card, timed discussion, secret accusations, automatic results.
- Refresh recovery in the same browser, private reconnect snapshots, duplicate-tab takeover, ready lobby, rematches, basic text chat, English / Simplified Chinese, responsive dark interface.
- Cross-Language Quick Chat: ten fixed English/Chinese phrases appear in each recipient’s interface language. Optional per-message language controls reveal the equivalent phrase; free text stays as written.
- Role privacy is enforced on the server. Browsers never receive the complete room state. Private actions and votes are sent only to authorized players; the public receives no submission counters.
- Choose a vote locally, then confirm it. The final living player's confirmation resolves voting immediately in both modes; otherwise the deadline applies. A confirmed vote remains valid until a replacement is confirmed while voting is still open. Offline living seats count; eliminated seats do not.
- Classic has a shared five-second nightfall, fixed wolf/Seer/Witch slots, neutral waiting screens, and public dawn results. Hidden action completion never shortens a night slot.
- Optional prerecorded English/Simplified Chinese narration and quiet licensed piano music. Enable Sound explicitly on each device; narration and music have separate toggles and volume sliders. Browser speech is a fallback; written public guidance is always available. Audio never advances or blocks gameplay.

## Run locally

Requires Node.js 22+ and npm.

```sh
npm ci
npm run build
npm start
```

Open http://localhost:3001. For phones on the same Wi-Fi, open `http://YOUR_COMPUTER_LAN_IP:3001` and keep the server running. For development with live updates, use `npm run dev` and open http://localhost:5173.

Each player should use a separate browser profile/device. A second tab in the same profile intentionally resumes the same seat. To test a second player on one computer, use a private window or another browser.

## Deploy free on Render

1. Put this source in a GitHub repository. No secrets are required or included.
2. Sign into https://dashboard.render.com/ and choose **New → Web Service**.
3. Select the repository (or supply its public Git repository URL).
4. Runtime **Node**, build command **`npm ci --include=dev && npm run build`**, start command **`npm start`**. Build tools must be included even with `NODE_ENV=production`.
5. Choose **Free**, one instance. Do not select a paid plan or persistent disk.
6. Add `NODE_ENV=production` and `NODE_VERSION=24.13.0`. Render sets `PORT` automatically.
7. Health check: `/api/health`. Deploy and open the HTTPS URL Render provides.

The supplied `render.yaml` also declares the Free plan. No database, storage add-on, API key, or separate frontend service is needed. If an account setup asks for a paid resource, stop and review before accepting.

Free hosting has cold starts (about a minute on Render) and can restart. **Rooms live in this one server's memory. A restart/redeploy ends all active rooms.** Browser refresh recovery works while the room's server remains running. Automatic host migration is deferred: the host must return in their original browser to start/rematch. Timed active matches continue without the host.

## Test

```sh
npm test
npm run build
```

To run the public acceptance playtest with real clients and normal phase timers:

```sh
node scripts/verify-public.mjs https://moonlight-werewolf-party.onrender.com
```

Tests cover 5–8-player deals, permissions, private projections, self-healing, poison, simultaneous deaths, parity, ties, absent votes, draws, rematches, every two-player accusation outcome, and a complete game with five independently connected Socket.IO clients. Network tests need permission to listen on localhost.

See [TESTING.md](TESTING.md) for the cross-device acceptance checklist and [SPEC.md](SPEC.md) for exact game rules and scope.

## Architecture

`server/game.ts` owns the rules and returns a filtered view for each player. `server/index.ts` owns anonymous seat credentials, input validation, rate limiting, connections, deadlines, and room expiry. `shared/types.ts` defines the public protocol. `client/main.tsx` renders the player's view and submits requests; it cannot assign roles, advance time, or decide a winner.

Role cards are shuffled with Node's cryptographic random generator. Seat recovery uses a random 256-bit credential saved in browser storage, never a nickname or room code. The newest authenticated tab takes over a seat. Code is useful for joining a lobby, not for recovering a role. Clearing browser storage or switching devices loses access to the previous seat.

Use one server instance. Horizontal scaling and durable game recovery are out of scope for the deadline. Messages are plain text rendered by React; chat history is bounded and disappears with the room. Public state intentionally excludes hidden action participation signals, private ballots until resolution, Witch victim information for other roles, and other living players' roles.

## Scope notes

No simulated multiplayer, publicly available debug role assignment, client-side secret game state, paid dependencies, live voice/video chat, AI bots, accounts, matchmaking, or rankings. Three/four-player Quick variants and advanced restart recovery are deferred.

## Illustrated edition

The presentation update adds four original character portraits, a private collectible-style reveal, clear draft/confirmed ballot states, illustrated victory screens, expanded mobile discussion, and brief reduced-motion-aware transitions. No server, protocol, gameplay, dependency, or hosting architecture changes. See [design/README.md](design/README.md) for assets, prompts, optimization and the pre-redesign rollback checkpoint.

## Flow and sound update

Rollback tag: `pre-flow-narrator-20261028` points to the working illustrated edition before this update. Commit `aa56453` separately checkpoints the tested P0 vote/night changes before audio.

`shared/publicPhase.ts` contains the bilingual public script. `client/audio.ts` accepts only public scene metadata; it cannot see roles, investigations, potions, victims or vote confirmations. All night slots and scripts play even if the role is eliminated. Audio is optional. Approved recordings are served as static assets with the game, with native browser speech as a fallback. No service credentials, runtime voice models or paid APIs are used. Autoplay behavior varies across platforms. Refresh retains sound preferences but requires Enable Sound again. Hidden/disconnected tabs stop current cues; returning uses the current phase rather than replaying a backlog.

## Cross-Language Quick Chat

Rollback checkpoint: `pre-quick-chat-20261028` (working commit `623a8fb`). The ten approved pairs live in `shared/quickChat.ts`. Clients send a phrase ID; the server validates it and supplies a canonical English fallback. Each recipient renders the phrase using their own interface language. Existing message fields remain compatible with older clients.

Quick Chat uses the same temporary room history, sender identity, phase/alive permissions, 80-message cap and shared five-messages-per-ten-seconds quota as free text. It adds no role-based suggestions, target parameters, translation service, accounts or permanent messaging. The learning view expands locally and does not send or modify messages. Sending a preset retains the typed draft. Ordinary chat remains untranslated.

This is the competition proof of concept for **Moonlight — Play Beyond Borders**, a future game-first space for cross-cultural connection. Matchmaking, accounts, friend requests, persistent messages and live voice remain outside this MVP.

## Approved sound refinement

Rollback tag: `pre-approved-audio-20261028` at `26d2a69`. The user approved both MeloTTS preview voices and the softer piano direction after rejecting synthesized drones/heartbeat/noise. Those synthesized backgrounds have been removed.

The 32 short AAC narration clips use the fixed public phase announcements and published dawn outcomes in English and Simplified Chinese. They were rendered offline from MIT-licensed MeloTTS models; neither models nor renderer are game dependencies. The approved 26-second excerpt of **Evening Fall (Piano)** by **Kevin MacLeod** is licensed **CC BY 4.0**, with attribution and modification notice in Audio settings and `public/audio/CREDITS.txt`. Model notices, the narration manifest and the offline reproduction recipe are retained.

One approved piano recording is reused with quiet phase-based levels, reduced further during discussion and ducked during narration. Results use a brief excerpt and faction-specific spoken cue, rather than introducing unreviewed music. Public phase accents vary subtly from crimson/charcoal through silver-blue and muted gold to warm discussion and burgundy voting. Existing illustrations are unchanged.

Sound remains off until a user gesture on every page load. Music defaults off; saved settings are local. Cues cancel on phase/language change, mute, hidden tab or disconnect. Delayed loads cannot start stale narration, announcements do not overlap, and failed loads never delay the server. Only public phase metadata selects recordings, colors and levels. The full audio pack is under 3 MB and loads on demand.

## Final competition entry

Rollback checkpoint: `pre-submission-final-20261028` at stable build `745847e`. The homepage explains the bilingual value and includes a five-step beginner guide. The original game rules, role artwork, server and protocol remain unchanged.

`/demo.html` is a clearly labeled, 60-second fictional tour with Previous, Next, Pause/Resume, Exit and Replay. It is a separate Vite entry, never mounts the real App, and never opens a multiplayer connection or accesses seat storage. The small shared module contains only public Quick Chat phrases and static styles/font loading. The returning `/?welcome=1` landing route deliberately avoids automatic saved-seat takeover; normal refresh/resume behavior is unchanged. A demo is not evidence of live multiplayer; the actual game remains independently tested.

No new dependency or paid service was added. Complete installed-version notices are shipped at `/THIRD_PARTY_NOTICES.txt` and linked in both entries. Reproduce notices with `node scripts/collect-notices.mjs`. After `npm test` and `npm run build`, run `node scripts/verify-demo-build.mjs` to check the separate dependency graph, notices and submission items.

The manual entry package is in `submission/`. It contains the title, public URL, 3:2 cover, 460-character description, judge instructions and human test checklist. No form is submitted automatically. Free-host cold starts, room loss on server restart and uncompleted human group validation remain disclosed.


## Final Witch, dawn and demo refinement

Rollback: `pre-demo-witch-refinement-20261028` at `67d05b7`. Classic engine, role balance, deadlines, protocol, artwork and dependencies remain unchanged. Both private potion statuses stay visible after confirmation and refresh, with all further actions locked for that night. Prominent dawn summaries use only published server events, including on terminal-night victory screens. Fixed public Witch guidance never announces potion availability. Dawn narration queues the outcome before victory without controlling gameplay.

Previous and Next pause the isolated demo for review and preserve choices. Replay resets the tour and the optional, clearly separate fictional one-night Witch example. Heal, Poison and Pass have consistent example outcomes; resetting explicitly starts a fresh example. Public phase colors are stronger, and Simplified Chinese faction/role terminology is standardized.


## Independently verified role examples and gated Pack Chat

Stage 1 checkpoint: `stage1-role-examples-20261029` (`0b4c419`), verified independently with 114 tests and English/Chinese browser checks. Baseline rollback: `pre-role-examples-20261029` / `submission-final-20261029`. Seer results use faction names; Classic voting uses Abstain / 弃票 while retaining the skip payload. Separate fictional one-night Seer and Werewolf examples pause the tour, preserve review state, and never connect to multiplayer. Private sample clues reopen on request.

Pack Chat is a separately gated addition, using the existing Node/Socket.IO service. It opens only for two or more living wolves before the current Werewolf deadline (currently seven/eight-player Classic). It has its own private event route, ephemeral history and stage ID; no public-message fan-out or activity counters. The dedicated 19-case test group covers authorization, phase exit, dead recipients, forged payloads, concurrent duplicates, bounded storage, rate limits, reconnect and rematch. Presets render per recipient language; free text stays as written. The fixed 60-second Werewolf stage is unchanged. Valid attack votes use a unique leader or a cryptographically random tied leader; no valid votes trigger a cryptographically random eligible target. The Witch can heal that selected victim.

Run the normal public Classic/Duel checks with `node scripts/verify-public.mjs URL` and the seven-player Pack Chat match with `node scripts/verify-pack-public.mjs URL` after the hosting rollout settles. The seven-player check verifies zero outsider packets during private sends, normal deadlines, current-stage recovery, closed-phase rejection, tied attacks, public dawn results and full victory.

## Final staged gameplay release (October 29)

Rollback: `pre-classic-reliability-20261029`. Independent invite tabs now keep separate seats; passive resume cannot replace an active connection. The lobby names every readiness or connection blocker. Classic starts/completes with 5, 6, 7 and 8 independent network clients.

Classic defaults to Structured Discussion (45 seconds per living seat, host choices 30/45/60). The current speaker alone can send public text/presets or finish early; server tokens reject stale and out-of-turn sends. Daytime elimination grants the voted-out player a 30-second last-words window before victory resolution. No last words follow night deaths. Open Discussion preserves simultaneous living-player chat. Both settings lock at start; Duel remains unchanged.

Initial reveal retains the full original painting. Later Classic identity access is collapsed, with owner-only investigation history, potion inventory and pack identities inside. Private Seer findings use large faction labels/icons; Witch gold/silver stock stays locked after confirmation. Eight stable seat accents identify the roster, public conversation, current speaker and authorized pack messages. Daytime conversation leads the layout; public history and dawn recap are collapsible after dawn.

Attack resolution always selects one eligible target when living wolves and non-wolves exist: agreed or unique leading target, cryptographically random tied leader, or a cryptographically random eligible fallback with no valid votes. Healing can prevent that attack. Public night timing, private actions, simultaneous deaths, daytime vote ties and win rules are preserved.

Run `node scripts/verify-structured-public.mjs URL` for full 5/6/8-player matches covering fallback attacks, Seer/Witch privacy, authoritative dawn, seat-order turns, refresh/colors, out-of-turn/stale denial, early ballots and automatic 30-second last words. The existing seven-player Pack check completes the remaining Classic count, and the normal check covers Open Classic plus Duel. These are explicit QA scripts using ordinary credentials, with no deployed debug routes.

## Final integrated rules, mobile and communication pass

Rollback: `pre-integrated-improvements-20261029`; Phase A: `integrated-phase-a-20261029`; Phase B: `integrated-phase-b-20261029`; Phase C: `integrated-phase-c-20261029`. Classic wolves/Seer/Witch each receive a fixed 60 seconds, independent of role availability or completion. Daytime abstentions no longer compete with candidates: one unique positive leader is eliminated. Initial tied leaders each speak for 60 seconds in seat order; then only other living players vote among tied candidates or Abstain. One runoff only. A second tie/all abstain/no eligible voters yields no elimination. All daytime eliminations receive 30 seconds of last words in both discussion modes; night deaths get none. Duel rules and timing remain unchanged.

The Witch's legacy 20px icon grid no longer receives sentence copy. Full-width descriptions, target confirmation, gold/silver inventories and action locks were checked on actual private action screens at desktop and 320/375/390/430px. Mobile reveal art is 36svh, and role/faction/essential instructions fit even a 320×568 viewport. Public phase/speaker timing stays visible in a compact sticky strip, chat grows to its content then scrolls, voting is compact, and results prioritize faction/personal outcome/rematch. Room/audio and detailed results remain accessible. Identity expansion is controlled by the player and persists across phases.

All ten Quick Chat IDs now have EN/ZH/KO/JA/ES equivalents. Each recipient chooses chat language separately from the EN/ZH interface/narrator. Equivalent translations remain collapsed, presets retain canonical server text/IDs, free text remains unchanged, and Pack access/history/routes are unchanged. Preferences persist per tab with a device default. No external translation service or runtime inference was added. Free-text translation is explicitly deferred; `docs/TRANSLATION_ASSESSMENT.md` records free-tier/mobile/privacy findings, terminology and the future gate.

A public browser check additionally found a refresh transport race. Automatic recovery now permits the existing authenticated takeover path for an actual reload or an already-bound reconnect. Fresh invitation navigation stays passive; a denied copied invitation clears only its own tab credential, preserving the original owner and explicit saved-seat fallback. Two focused tests cover this distinction and the same secret role surviving an old connection still being active. Repeated actual browser refreshes recovered without a seat-in-use alert; opening a new invitation left the owner connected.
