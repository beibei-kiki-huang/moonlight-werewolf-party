import { describe, expect, it } from 'vitest';
import { Game, GameError, newPlayer, newRoom, type Room } from '../server/game.js';
import type { Role } from '../shared/types.js';

function setup(cards: Role[]) {
  const game = new Game(undefined, () => [...cards]); const room = newRoom('ABC234', 'quick', newPlayer('Luna'), 0);
  game.join(room, 'Sol', 0); room.players.forEach(p => game.ready(room, p.id, true, 0)); room.discussionMode='open';game.start(room, room.hostId, 0);
  return { game, room };
}
const step = (game: Game, room: Room) => game.tick(room, room.deadline!);
describe('two-player Moonlight Duel', () => {
  it.each([
    [['werewolf', 'villager', 'villager'], 'other', 'village'],
    [['werewolf', 'villager', 'villager'], 'center', 'wolves'],
    [['villager', 'werewolf', 'villager'], 'other', 'village'],
    [['villager', 'werewolf', 'villager'], 'center', 'wolves'],
  ] as [Role[], string, string][])('resolves villager guess %s / %s', (cards, guess, winner) => {
    const { game, room } = setup(cards); step(game, room); expect(room.phase).toBe('discussion');
    expect(room.deadline).toBe(120_000); // role reveal ends at 30s, then 90s discussion
    step(game, room); const villager = room.players.find(p => p.role === 'villager')!;
    const wolf = room.players.find(p => p.role === 'werewolf')!;
    game.vote(room, villager.id, guess, room.deadline! - 1); game.vote(room, wolf.id, 'center', room.deadline! - 1);
    step(game, room); expect(room.winner).toBe(winner); expect(room.phase).toBe('ended');
  });
  it.each([
    ['center', 'center', 'village'], ['center', 'other', 'wolves'], ['other', 'center', 'wolves'], ['other', 'other', 'wolves'],
  ])('requires both villagers to guess center when center holds wolf: %s %s', (a, b, winner) => {
    const { game, room } = setup(['villager', 'villager', 'werewolf']); step(game, room); step(game, room);
    game.vote(room, room.players[0].id, a, room.deadline! - 1); game.vote(room, room.players[1].id, b, room.deadline! - 1);
    step(game, room); expect(room.winner).toBe(winner);
  });
  it('treats missing guesses as incorrect, never uses Classic parity or skips, and locks out a third player', () => {
    const { game, room } = setup(['werewolf', 'villager', 'villager']);
    expect(room.winner).toBeUndefined(); expect(game.view(room, room.hostId, 0).centerRole).toBeUndefined();
    step(game, room); step(game, room);
    expect(() => game.vote(room, room.hostId, 'skip', room.deadline! - 1)).toThrow(new GameError('invalid_target'));
    step(game, room); expect(room.winner).toBe('wolves'); expect(game.view(room, room.hostId, 0).centerRole).toBe('villager');
    game.rematch(room, room.hostId, 200_000);
    expect(() => game.join(room, 'Third', 200_000)).toThrow(new GameError('room_full'));
  });
  it('keeps the other player and center role hidden through the final vote', () => {
    const { game, room } = setup(['villager', 'villager', 'werewolf']); step(game, room); step(game, room);
    const before = game.view(room, room.players[1].id, 123);
    game.vote(room, room.hostId, 'center', room.deadline! - 1);
    const after = game.view(room, room.players[1].id, 123);
    expect(after).toEqual(before); expect(after.centerRole).toBeUndefined();
    expect(after.players.every(p => p.role === undefined)).toBe(true);
  });
});
