import { describe, expect, it } from 'vitest';
import { DISTRIBUTIONS, Game, GameError, newPlayer, newRoom, type Room } from '../server/game.js';

function setup(count = 5) {
  const game = new Game(undefined, cards => [...cards]);
  const room = newRoom('ABC234', 'classic', newPlayer('Player 1'), 0);
  for (let i = 1; i < count; i++) game.join(room, `Player ${i + 1}`, 0);
  room.players.forEach(p => game.ready(room, p.id, true, 0));
  room.discussionMode='open';game.start(room, room.hostId, 0);
  return { game, room, role: (name: string) => room.players.find(p => p.role === name)! };
}
function step(game: Game, room: Room) { game.tick(room, room.deadline!); }
function until(game: Game, room: Room, phase: string) {
  for (let i = 0; room.phase !== phase && i < 20; i++) step(game, room);
  expect(room.phase).toBe(phase);
}
function code(fn: () => void, value: string) { expect(fn).toThrowError(new GameError(value as GameError['code'])); }

describe('Classic game', () => {
  it.each([5, 6, 7, 8])('deals correct roles for %i independent seats', count => {
    const { room } = setup(count);
    expect(room.players.map(p => p.role).sort()).toEqual([...DISTRIBUTIONS[count]].sort());
    expect(new Set(room.players.map(p => p.id)).size).toBe(count);
  });
  it('requires host and everyone ready/connected', () => {
    const game = new Game(); const room = newRoom('ABC234', 'classic', newPlayer('Host'), 0);
    for (let i = 0; i < 4; i++) game.join(room, `Guest ${i}`, 0);
    code(() => game.start(room, room.players[1].id, 0), 'not_host');
    code(() => game.start(room, room.hostId, 0), 'not_ready');
    room.players.forEach(p => p.ready = true); room.players[1].connected = false;
    code(() => game.start(room, room.hostId, 0), 'not_ready');
  });
  it('never exposes other living roles, investigations, or witch information to villagers or host', () => {
    const { game, room, role } = setup(7); until(game, room, 'wolves');
    const wolf = role('werewolf'), villager = role('villager'), witch = role('witch'), seer = role('seer');
    game.act(room, wolf.id, { kind: 'attack', target: villager.id }, room.deadline! - 1);
    const wolfView = game.view(room, wolf.id, 0);
    expect(wolfView.wolfTeam).toHaveLength(2); expect(wolfView.wolfSelections?.[wolf.id]).toBe(villager.id);
    const publicView = game.view(room, villager.id, 0);
    expect(publicView.players.every(p => p.role === undefined)).toBe(true);
    expect(publicView.wolfTeam).toBeUndefined(); expect(publicView.wolfSelections).toBeUndefined();
    step(game, room);
    game.act(room, seer.id, { kind: 'inspect', target: wolf.id }, room.deadline! - 1);
    expect(game.view(room, seer.id, 0).investigations?.[0].isWolf).toBe(true);
    expect(game.view(room, wolf.id, 0).investigations).toBeUndefined();
    step(game, room);
    expect(game.view(room, witch.id, 0).victim).toBe(villager.id);
    expect(game.view(room, villager.id, 0).victim).toBeUndefined();
    expect(game.view(room, wolf.id, 0).potions).toBeUndefined();
  });
  it('rejects wrong roles, own targets, teammate targets, repeat investigation and late actions', () => {
    const { game, room, role } = setup(7); until(game, room, 'wolves');
    const wolf = role('werewolf'), villager = role('villager'), seer = role('seer');
    code(() => game.act(room, villager.id, { kind: 'attack', target: seer.id }, room.deadline! - 1), 'unauthorized');
    code(() => game.act(room, wolf.id, { kind: 'attack', target: wolf.id }, room.deadline! - 1), 'invalid_target');
    const teammate = room.players.filter(p => p.role === 'werewolf')[1];
    code(() => game.act(room, wolf.id, { kind: 'attack', target: teammate.id }, room.deadline! - 1), 'invalid_target');
    code(() => game.act(room, wolf.id, { kind: 'attack', target: seer.id }, room.deadline!), 'wrong_phase');
    step(game, room);
    game.act(room, seer.id, { kind: 'inspect', target: villager.id }, room.deadline! - 1);
    code(() => game.act(room, seer.id, { kind: 'inspect', target: wolf.id }, room.deadline! - 1), 'already_acted');
  });
  it('allows Witch self-heal once and keeps fixed night durations', () => {
    const { game, room, role } = setup(); until(game, room, 'wolves');
    const witch = role('witch'), wolf = role('werewolf');
    const deadline = room.deadline;
    game.act(room, wolf.id, { kind: 'attack', target: witch.id }, room.deadline! - 1);
    expect(room.deadline).toBe(deadline); step(game, room); step(game, room);
    game.act(room, witch.id, { kind: 'heal' }, room.deadline! - 1);
    code(() => game.act(room, witch.id, { kind: 'poison', target: wolf.id }, room.deadline! - 1), 'already_acted');
    step(game, room); expect(witch.alive).toBe(true); expect(witch.heal).toBe(false);
    until(game, room, 'witch'); expect(game.view(room, witch.id, 0).victim).toBeUndefined();
    code(() => game.act(room, witch.id, { kind: 'heal' }, room.deadline! - 1), 'invalid_target');
  });
  it('resolves attacked Witch poison simultaneously and awards village victory', () => {
    const { game, room, role } = setup(); until(game, room, 'wolves');
    const wolf = role('werewolf'), witch = role('witch');
    game.act(room, wolf.id, { kind: 'attack', target: witch.id }, room.deadline! - 1);
    step(game, room); step(game, room);
    game.act(room, witch.id, { kind: 'poison', target: wolf.id }, room.deadline! - 1); step(game, room);
    expect(wolf.alive).toBe(false); expect(witch.alive).toBe(false);
    expect(room.winner).toBe('village'); expect(room.phase).toBe('ended');
  });
  it('awards wolves at parity only after all night deaths', () => {
    const { game, room, role } = setup(); const wolf = role('werewolf');
    room.players.filter(p => p.role !== 'werewolf').slice(0, 2).forEach(p => p.alive = false);
    until(game, room, 'wolves');
    const target = room.players.find(p => p.alive && p.role !== 'werewolf')!;
    game.act(room, wolf.id, { kind: 'attack', target: target.id }, room.deadline! - 1);
    step(game, room); step(game, room); step(game, room);
    expect(room.winner).toBe('wolves');
  });
  it('handles simultaneous extinction as a draw before faction victory', () => {
    const { game, room, role } = setup(); const wolf = role('werewolf'), witch = role('witch');
    room.players.filter(p => p !== wolf && p !== witch).forEach(p => p.alive = false);
    until(game, room, 'wolves'); game.act(room, wolf.id, { kind: 'attack', target: witch.id }, room.deadline! - 1);
    step(game, room); step(game, room);
    game.act(room, witch.id, { kind: 'poison', target: wolf.id }, room.deadline! - 1); step(game, room);
    expect(room.winner).toBe('draw');
  });
  it('ties wolf attacks without killing and keeps ballots private until resolution', () => {
    const { game, room } = setup(7); until(game, room, 'wolves');
    const wolves = room.players.filter(p => p.role === 'werewolf'); const villagers = room.players.filter(p => p.role === 'villager');
    wolves.forEach((p, i) => game.act(room, p.id, { kind: 'attack', target: villagers[i].id }, room.deadline! - 1));
    step(game, room); expect(room.victim).toBeNull(); until(game, room, 'voting');
    game.vote(room, villagers[0].id, wolves[0].id, room.deadline! - 1);
    expect(game.view(room, wolves[0].id, 0).ballots).toBeUndefined();
    expect(game.view(room, wolves[0].id, 0).selection).toBeUndefined(); step(game, room);
    expect(room.players.every(p => p.alive)).toBe(true); // six absent ballots beat one accusation
    expect(room.ballots?.[villagers[0].id]).toBe(wolves[0].id);
  });
  it('tied daytime leaders do not eliminate; a unique leader can win without an absolute majority', () => {
    const { game, room } = setup(); until(game, room, 'voting');
    const p = room.players;
    [p[2].id, p[2].id, p[0].id, p[0].id, 'skip'].forEach((target, i) => game.vote(room, p[i].id, target, room.deadline! - 1));
    step(game, room); expect(p.every(p => p.alive)).toBe(true);
    until(game, room, 'voting');
    [p[2].id, p[0].id, p[0].id, p[1].id, 'skip'].forEach((target, i) => game.vote(room, p[i].id, target, room.deadline! - 1));
    step(game, room); expect(p[0].alive).toBe(false); expect(room.winner).toBe('village');
  });
  it('does not stall with no actions; draws after three quiet full cycles', () => {
    const { game, room } = setup();
    for (let i = 0; i < 40 && room.phase !== 'ended'; i++) step(game, room);
    expect(room.winner).toBe('draw'); expect(room.day).toBe(3);
  });
  it('dead players cannot act or discuss, and a rematch erases secrets', () => {
    const { game, room, role } = setup(); const villager = role('villager'); villager.alive = false;
    until(game, room, 'discussion'); code(() => game.chat(room, villager.id, 'spoiler', room.deadline! - 1), 'unauthorized');
    until(game, room, 'voting'); code(() => game.vote(room, villager.id, 'skip', room.deadline! - 1), 'unauthorized');
    for (let i = 0; i < 40 && room.phase !== 'ended'; i++) step(game, room);
    game.rematch(room, room.hostId, 1_000_000);
    expect(room.phase).toBe('lobby'); expect(game.view(room, villager.id, 0).role).toBeUndefined();
    expect(room.players.every(p => !p.role && !p.ready && p.alive)).toBe(true);
  });
});
