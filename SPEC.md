# Moonlight — Werewolf Party · MVP specification

Updated October 28, 2026. Build order: real multiplayer Classic → public test → two-player Quick → Chinese → polish. No purchases are authorized.

## Product

Private browser party game, no player accounts or installs. Shareable six-character codes and links, 2–20 character unique nicknames, 5–8-player Classic, required two-player Quick follow-up. English and Simplified Chinese, independently selected per device. Mobile-first moonlit blue/purple interface, private tap-to-reveal role cards, concise phase instructions. Basic discussion chat enables remote play; live voice chat, advanced chat, and elaborate animation are deferred. Optional public browser narration and quiet synthesized ambience are available.

## Classic

| Players | Wolves | Villagers | Seer | Witch |
| --- | --- | --- | --- | --- |
| 5 | 1 | 2 | 1 | 1 |
| 6 | 1 | 3 | 1 | 1 |
| 7 | 2 | 3 | 1 | 1 |
| 8 | 2 | 4 | 1 | 1 |

Everyone ready and online → host starts → role reveal (30s) → nightfall (5s) → wolves (25s) → Seer (15s) → Witch (20s) → dawn (8s) → discussion (120s) → secret vote (up to 30s) → verdict (8s) → repeat or results. Night slots retain fixed duration even when their role is dead. Server owns deadlines. Alive-at-night-start actors act before simultaneous dawn deaths.

- Wolves know living/dead teammates and see private team target selections. Each may revise a target until the deadline. Unique plurality attacks a living non-wolf; tied or absent selections mean no attack.
- Seer checks one other living player each night: wolf or not wolf. One confirmed investigation per night, private history.
- Witch has one heal and one poison per game, at most one potion per night. Can heal herself. Knows the wolf victim only while heal remains. Poison targets another living player and cannot be healed. Passing consumes no potion. Confirmed actions cannot be changed.
- Everyone alive can vote another living player or Skip; select locally, then explicitly confirm; confirmed choices can be replaced while voting is open. All living seats confirming resolves immediately; otherwise the server deadline resolves. Offline living seats count, eliminated seats do not. Missing vote = Skip. Unique leader must exceed Skip to be eliminated; otherwise nobody dies. Reveal ballots at resolution. Exact eliminated roles become public.
- After all dawn deaths together and each verdict: no living players = draw; no living wolves = village; wolves >= other living players = wolves. Three consecutive full night/day cycles without deaths = draw. Eliminated team members share their team's win.
- Dead players read public events/chat but cannot act or chat. Roles and public event recap revealed at end. Host can return everyone to lobby for rematch, roles reshuffle on start.

## Quick follow-up (exactly two players)

Moonlight Duel: shuffle one wolf and two villagers; deal one to each player, one hidden in center. No Seer, Witch, killing, or parity victory. Reveal (30s) → discussion (90s) → accusation (up to 30s, or until both players confirm) → result. Each chooses "other player" or "center". If a player is wolf, the sole villager's correct accusation wins village; otherwise wolf wins. Wolf's accusation is a decoy. If both are villagers, both must choose center for village victory. Missing accusation is incorrect. Reveal all three cards at results. This is a lighter deduction duel, not balanced Classic. Three/four-player Quick is deferred to reduce rule/implementation branches.

## Reliability and privacy

- One server keeps rooms in memory. Browser refresh resumes seat using a random private browser credential; room code and nickname cannot reclaim a seat. Same browser/storage only; no cross-device seat recovery. Latest connection controls a seat; older tab displays takeover notice.
- Server validates actor identity, role, alive status, phase, target, and deadline. Per-player projections only; never send full game state to a browser. No hidden action participation counts/timing changes. Secrets excluded from public chat/events/errors/logs.
- Online ready players required to start. Late joining locked. Lobby host may remove a seat. During matches, disconnected seats stay and default actions apply. Host absence does not stop automated gameplay. Host migration/server restart recovery deferred. Server restart ends rooms; client explains room expiration. All-offline rooms expire after ten minutes. Idle lobbies expire after two hours.
- Random six-character collision-checked codes, unguessable seat tokens, bounded chat/names, create/join/action rate limits, duplicate/late action rejection, HTTPS in production. No host access to secrets.

## Architecture and hosting

React/TypeScript/Vite client; Node/TypeScript/Express/Socket.IO single server serving built client. No database, Redis, AI API, login provider, or paid dependencies. One deployment/one origin. Render Free is first choice; free service supports WebSockets, idles after 15min without inbound traffic (including socket traffic), cold start ~1min, and may restart. Railway trial is credit limited ($5/30 days, then $1/month free credit). Koyeb Free sleeps after an idle hour. Avoid splitting frontend/backend for this deadline. Paid hosting only with explicit future approval.

Sources checked October 28, 2026: https://render.com/docs/free ; https://render.com/docs/websocket ; https://docs.railway.com/pricing/free-trial ; https://www.koyeb.com/docs/run-and-scale/scale-to-zero

User will sign into GitHub/Render. Connected deployment plugins are administrator-disabled; use standard account/browser/CLI deployment instead. Never store credentials in source, publish private roles, or purchase hosting.

## Delivery and acceptance

Oct 28: engine, private views, real socket room lifecycle, whole Classic match, early deployment preparation. Oct 29: cross-device public test, reconnect/privacy tests, two-player duel, Chinese, responsive layout. Oct 30: fixes, playtests, screenshots and submission; aim feature freeze noon PT and submit by 8pm before the stated 11:59pm PT deadline.

Acceptance: 5–8 independent sessions complete Classic over actual sockets; both factions and draw rules resolve correctly; unauthorized payloads contain no secret roles/actions; refresh restores exactly the same seat; ties and absent actors cannot stall; two independent sessions complete Quick; public HTTPS URL works on separate devices. Test timer lengths may be shortened only in automated engine test configuration, never by a player-facing debug command.

## Deferred

Advanced restart recovery, host migration, 3–4-player Quick, live voice/video chat, paid AI narration/bots, spectators/ghost chat, public matchmaking, accounts/ranking, custom roles/timers, elaborate animation. First simplify decoration if time becomes tight, not security or complete gameplay.

## Optional sound and public night guidance

Every Classic night includes the same full-length nightfall/wolves/Seer/Witch sequence, even for eliminated roles. Only authorized living players see their own action controls. Other seats get a neutral waiting screen. Public narration, text, and ambience depend only on phase, day, mode, deadline and public winner, never hidden role ownership, completion, actions or victims. Dawn results retain the existing simultaneous resolution and victory rules.

Each device must explicitly Enable Sound. Narration uses its interface language and matching native browser voices, with written guidance if unavailable or blocked. Mute and separate narration/background toggles are available; background volume is quiet and adjustable. Original ambience is synthesized locally with Web Audio. Phase changes, disconnects and hidden tabs cancel stale cues. Refresh requires activation again. No audio may block or advance gameplay.
