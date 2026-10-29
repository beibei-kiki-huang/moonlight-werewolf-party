import { describe, expect, it } from 'vitest';
import { Game, GameError, newPlayer, newRoom, type Room } from '../server/game';
import type { Mode } from '../shared/types';
function table(mode: Mode = 'classic') {
  const game = new Game(undefined, cards => [...cards]);
  const room = newRoom('ABC234', mode, newPlayer('Host'), 0);
  for (let i = 1; i < (mode === 'classic' ? 5 : 2); i++) game.join(room, `Guest ${i}`, 0);
  room.players.forEach(p => game.ready(room, p.id, true, 0)); room.discussionMode='open';game.start(room, room.hostId, 0);
  return { game, room };
}
function until(game: Game, room: Room, phase: string) {
  for (let i = 0; room.phase !== phase && i < 30; i++) game.tick(room, room.deadline!);
  expect(room.phase).toBe(phase);
}
describe('confirmed ballots and fixed night ritual', () => {
  it.each(['classic', 'quick'] as Mode[])('resolves %s immediately on the last distinct confirmation, once', mode => {
    const { game, room } = table(mode); until(game, room, 'voting');
    const deadline = room.deadline!, now = deadline - 20_000;
    const target = mode === 'quick' ? 'other' : 'skip';
    const last = room.players.at(-1)!;
    for (const p of room.players.slice(0, -1)) {
      expect(game.vote(room, p.id, target, now)).toBe(false);
      expect(game.vote(room, p.id, target, now + 1)).toBe(false); // retries aren't extra voters
    }
    expect(game.view(room, last.id, now).ballots).toBeUndefined();
    expect(game.view(room, last.id, now).acted).toBe(false);
    expect(game.vote(room, last.id, target, now + 2)).toBe(true);
    expect(room.phase).toBe(mode === 'quick' ? 'ended' : 'verdict');
    const events = [...room.events], ballots = { ...room.ballots };
    expect(game.tick(room, now + 2)).toBe(false); // timer callback in the same turn
    expect(() => game.vote(room, last.id, target, now + 2)).toThrow(new GameError('wrong_phase'));
    game.tick(room, deadline); // a queued callback sees the current phase, never votes twice
    expect(room.events).toEqual(events); expect(room.ballots ?? {}).toEqual(mode === 'quick' ? ballots : {});
    expect(events.filter(e => e.kind === 'no_elimination' || e.kind === 'result')).toHaveLength(1);
  });
  it('excludes eliminated players but waits for offline living players and preserves confirmed revisions', () => {
    const { game, room } = table(); room.players[4].alive = false; until(game, room, 'voting');
    const now = room.deadline! - 20_000; room.players[3].connected = false;
    const wolf = room.players[0], first = room.players[1];
    game.vote(room, first.id, 'skip', now); game.vote(room, first.id, wolf.id, now + 1);
    game.vote(room, room.players[2].id, wolf.id, now); game.vote(room, wolf.id, 'skip', now);
    expect(room.phase).toBe('voting'); expect(room.ballots).toBeUndefined();
    expect(() => game.vote(room, room.players[4].id, 'skip', now)).toThrow(new GameError('unauthorized'));
    game.tick(room, room.deadline!); // offline ballot counts as Skip; 2-v-2 tie
    expect(room.phase).toBe('verdict'); expect(wolf.alive).toBe(true);
    expect(room.ballots).toEqual({ [wolf.id]: 'skip', [first.id]: wolf.id, [room.players[2].id]: wolf.id, [room.players[3].id]: 'skip' });
  });
  it('rejects invalid/late confirmations without falsely completing the ballot set', () => {
    const { game, room } = table(); until(game, room, 'voting');
    const deadline = room.deadline!;
    for (const p of room.players.slice(0, -1)) game.vote(room, p.id, 'skip', deadline - 1);
    const last = room.players.at(-1)!;
    expect(() => game.vote(room, last.id, last.id, deadline - 1)).toThrow(new GameError('invalid_target'));
    expect(() => game.vote(room, last.id, 'skip', deadline)).toThrow(new GameError('wrong_phase'));
    expect(room.phase).toBe('voting'); expect(room.votes[last.id]).toBeUndefined();
    game.tick(room, deadline); expect(room.events.filter(e => e.kind === 'no_elimination')).toHaveLength(1);
  });
  it('keeps every nightly slot and synchronized deadlines across actions, dead roles and successive nights', () => {
    const { game, room } = table(); room.players[3].alive = false; // Seer absent
    for (let day = 1; day <= 2; day++) {
      until(game, room, 'nightfall'); expect(room.day).toBe(day);
      for (const [phase, duration] of [['nightfall', 5000], ['wolves', 25000], ['seer', 15000], ['witch', 20000]] as const) {
        expect(room.phase).toBe(phase);
        const deadline = room.deadline!;
        expect(game.tick(room, deadline - 1)).toBe(false);
        expect(room.players.map(p => game.view(room, p.id, deadline - duration).deadline)).toEqual(room.players.map(() => deadline));
        if (phase === 'wolves') {
          const before = game.view(room, room.players[1].id, 100);
          game.act(room, room.hostId, { kind: 'attack', target: room.players[2].id }, deadline - 1);
          expect(game.view(room, room.players[1].id, 100)).toEqual(before);
          room.attacks = {}; // fixture: keep this ritual test free of deaths
        }
        game.tick(room, deadline);
        const nextDuration = phase === 'nightfall' ? 25000 : phase === 'wolves' ? 15000 : phase === 'seer' ? 20000 : 8000;
        expect(room.deadline).toBe(deadline + nextDuration);
      }
      expect(room.phase).toBe('dawn'); until(game, room, 'voting');
      const now = room.deadline! - 100;
      room.players.filter(p => p.alive).forEach(p => game.vote(room, p.id, 'skip', now));
      expect(room.phase).toBe('verdict');
    }
  });
});
