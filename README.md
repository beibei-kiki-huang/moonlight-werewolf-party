# Moonlight — Werewolf Party

A real multiplayer Werewolf game for friends. Each player joins from their own browser with a nickname and a six-character code. No player accounts, installs, AI services, or payments are needed.

**Public beta:** https://moonlight-werewolf-party.onrender.com/ · Hosted on Render Free.

## What works

- Classic for 5–8: server-assigned private roles, wolf team targeting, Seer investigations, Witch heal/poison, synchronized night/day timers, discussion, secret votes, elimination, automatic faction victory and draws.
- Two-player Moonlight Duel: hidden center card, timed discussion, secret accusations, automatic results.
- Refresh recovery in the same browser, private reconnect snapshots, duplicate-tab takeover, ready lobby, rematches, basic text chat, English / Simplified Chinese, responsive dark interface.
- Role privacy is enforced on the server. Browsers never receive the complete room state. Private actions and votes are sent only to authorized players; the public receives no submission counters.

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

No simulated multiplayer, publicly available debug role assignment, client-side secret game state, paid dependencies, voice/video, AI bots, accounts, matchmaking, or rankings. Three/four-player Quick variants and advanced restart recovery are deferred.

## Illustrated edition

The presentation update adds four original character portraits, a private collectible-style reveal, clear draft/confirmed ballot states, illustrated victory screens, expanded mobile discussion, and brief reduced-motion-aware transitions. No server, protocol, gameplay, dependency, or hosting architecture changes. See [design/README.md](design/README.md) for assets, prompts, optimization and the pre-redesign rollback checkpoint.
