# Moonlight acceptance tests

## Automated verification

Run `npm test` and `npm run build`. Tests use short injected engine timers only; the public game has fixed normal durations. There is no player-accessible timer, role, or win override.

## Separate-device test (after public deployment)

1. On a computer, create a Classic room as the host. Send the invitation to four other browser profiles/devices. Each should show the same player list and code.
2. Verify duplicate names are rejected and starting with fewer than five players or an unready/offline player is unavailable.
3. Everyone selects Ready. Host starts. Each player opens their own private role card, then hides it. Other living roles must stay hidden in player lists and received network messages. A host has no extra access.
4. Observe each fixed night stage. Only the proper living role can act. Wolves see fellow wolves and pack selections. Seer information stays private. Witch alone sees an attack victim while heal remains.
5. Refresh one device after role reveal. Verify the same name, role, investigations/potions, phase and countdown return. The role card should be hidden again initially.
6. Send a discussion message. Verify it appears on other devices. Dead players cannot send during discussion; chat is unavailable during night actions.
7. Vote from every surviving device. Votes must not appear to others before resolution. Check the same elimination and revealed role everywhere. A tie/Skip result must advance without eliminating anyone.
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
