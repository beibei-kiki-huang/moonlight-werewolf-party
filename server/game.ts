import { randomInt, randomUUID } from 'node:crypto';
import type { Action, ChatMessage, ErrorCode, GameEvent, GameView, Investigation, Mode, Phase, Role, Winner } from '../shared/types.js';
import { isQuickPhraseId, QUICK_PHRASES } from '../shared/quickChat.js';

export class GameError extends Error {
  constructor(public code: ErrorCode) { super(code); }
}
export interface Player {
  id: string; name: string; connected: boolean; ready: boolean; alive: boolean; role?: Role;
  heal: boolean; poison: boolean; investigations: Investigation[];
}
export interface Room {
  code: string; mode: Mode; hostId: string; players: Player[]; phase: Phase; day: number;
  revision: number; deadline: number | null; createdAt: number; lastActivity: number; allOfflineSince: number | null;
  attacks: Record<string, string>; inspected: Set<string>; witchAction?: Action; victim: string | null;
  votes: Record<string, string>; ballots?: Record<string, string>; winner?: Winner; centerRole?: Role;
  events: GameEvent[]; chat: ChatMessage[]; deathThisCycle: boolean; quietCycles: number;
}
export type Durations = Partial<Record<Phase, number>> & { quickDiscussion?: number };
export const DURATIONS: Durations = {
  reveal: 30_000, nightfall: 5_000, wolves: 25_000, seer: 15_000, witch: 20_000, dawn: 8_000,
  discussion: 120_000, quickDiscussion: 90_000, voting: 30_000, verdict: 8_000,
};
export const DISTRIBUTIONS: Record<number, Role[]> = {
  5: ['werewolf', 'villager', 'villager', 'seer', 'witch'],
  6: ['werewolf', 'villager', 'villager', 'villager', 'seer', 'witch'],
  7: ['werewolf', 'werewolf', 'villager', 'villager', 'villager', 'seer', 'witch'],
  8: ['werewolf', 'werewolf', 'villager', 'villager', 'villager', 'villager', 'seer', 'witch'],
};
function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(i + 1); [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
const fail = (code: ErrorCode): never => { throw new GameError(code); };
export function newPlayer(name: string): Player {
  return { id: randomUUID(), name, connected: true, ready: false, alive: true, heal: true, poison: true, investigations: [] };
}
export function newRoom(code: string, mode: Mode, host: Player, now: number): Room {
  return {
    code, mode, hostId: host.id, players: [host], phase: 'lobby', day: 0, revision: 0,
    deadline: null, createdAt: now, lastActivity: now, allOfflineSince: null,
    attacks: {}, inspected: new Set(), victim: null, votes: {}, events: [], chat: [], deathThisCycle: false, quietCycles: 0,
  };
}
export class Game {
  constructor(private durations: Durations = DURATIONS, private deal: (cards: Role[]) => Role[] = shuffle) {}
  player(room: Room, id: string): Player { return room.players.find(p => p.id === id) ?? fail('unauthorized'); }
  touch(room: Room, now: number) { room.revision++; room.lastActivity = now; }
  host(room: Room, id: string) { if (room.hostId !== id) fail('not_host'); }
  join(room: Room, name: string, now: number): Player {
    if (room.phase !== 'lobby') fail('started');
    if (room.players.length >= (room.mode === 'classic' ? 8 : 2)) fail('room_full');
    if (room.players.some(p => p.name.toLocaleLowerCase() === name.toLocaleLowerCase())) fail('name_taken');
    const player = newPlayer(name); room.players.push(player); this.touch(room, now); return player;
  }
  ready(room: Room, id: string, ready: boolean, now: number) {
    if (room.phase !== 'lobby') fail('wrong_phase');
    this.player(room, id).ready = ready; this.touch(room, now);
  }
  remove(room: Room, id: string, target: string, now: number) {
    this.host(room, id);
    if (room.phase !== 'lobby') fail('wrong_phase');
    if (id === target) fail('invalid_target');
    this.player(room, target); room.players = room.players.filter(p => p.id !== target); this.touch(room, now);
  }
  changeMode(room: Room, id: string, mode: Mode, now: number) {
    this.host(room, id);
    if (room.phase !== 'lobby') fail('wrong_phase');
    if (mode === 'quick' && room.players.length > 2) fail('room_full');
    room.mode = mode; room.players.forEach(p => p.ready = false); this.touch(room, now);
  }
  start(room: Room, id: string, now: number) {
    this.host(room, id);
    if (room.phase !== 'lobby') fail('wrong_phase');
    const count = room.players.length;
    if (room.mode === 'classic' ? count < 5 || count > 8 : count !== 2) fail('not_ready');
    if (room.players.some(p => !p.connected || !p.ready)) fail('not_ready');
    const cards = this.deal(room.mode === 'classic' ? DISTRIBUTIONS[count] : ['werewolf', 'villager', 'villager']);
    room.centerRole = room.mode === 'quick' ? cards[2] : undefined;
    room.players.forEach((p, i) => { p.role = cards[i]; p.alive = true; p.heal = true; p.poison = true; p.investigations = []; });
    room.day = 1; room.events = []; room.chat = []; room.votes = {}; room.ballots = undefined;
    room.winner = undefined; room.quietCycles = 0; room.deathThisCycle = false;
    this.event(room, { kind: 'start', day: 1 }); this.phase(room, 'reveal', now); this.touch(room, now);
  }
  private event(room: Room, event: Omit<GameEvent, 'id'>) { room.events.push({ ...event, id: room.events.length + 1 }); }
  private phase(room: Room, phase: Phase, now: number) {
    room.phase = phase;
    room.deadline = phase === 'lobby' || phase === 'ended' ? null : now +
      (room.mode === 'quick' && phase === 'discussion' ? this.durations.quickDiscussion ?? 90_000 : this.durations[phase] ?? 1000);
  }
  private actor(room: Room, id: string, phase: Phase, role: Role | null, now: number): Player {
    if (room.phase !== phase || room.deadline === null || now >= room.deadline) fail('wrong_phase');
    const player = this.player(room, id);
    if (!player.alive || (role && player.role !== role)) fail('unauthorized');
    return player;
  }
  private target(room: Room, id: string | undefined, actor: string): Player {
    const target = room.players.find(p => p.id === id && p.alive && p.id !== actor);
    return target ?? fail('invalid_target');
  }
  act(room: Room, id: string, action: Action, now: number) {
    if (action.kind === 'attack') {
      this.actor(room, id, 'wolves', 'werewolf', now);
      const target = this.target(room, action.target, id);
      if (target.role === 'werewolf') fail('invalid_target');
      room.attacks[id] = target.id;
    } else if (action.kind === 'inspect') {
      const player = this.actor(room, id, 'seer', 'seer', now);
      if (room.inspected.has(id)) fail('already_acted');
      const target = this.target(room, action.target, id);
      player.investigations.push({ day: room.day, targetId: target.id, name: target.name, isWolf: target.role === 'werewolf' });
      room.inspected.add(id);
    } else {
      const player = this.actor(room, id, 'witch', 'witch', now);
      if (room.witchAction) fail('already_acted');
      if (action.kind === 'heal') {
        if (!player.heal || !room.victim) fail('invalid_target');
        player.heal = false; room.witchAction = { kind: 'heal' };
      } else if (action.kind === 'poison') {
        if (!player.poison) fail('invalid_target');
        const target = this.target(room, action.target, id);
        player.poison = false; room.witchAction = { kind: 'poison', target: target.id };
      } else if (action.kind === 'pass') room.witchAction = { kind: 'pass' };
      else fail('invalid');
    }
    this.touch(room, now);
  }
  vote(room: Room, id: string, target: string, now: number) {
    this.actor(room, id, 'voting', null, now);
    if (room.mode === 'quick') {
      if (target !== 'other' && target !== 'center') fail('invalid_target');
    } else if (target !== 'skip') this.target(room, target, id);
    room.votes[id] = target;
    // Every living seat counts, including offline seats and the Duel's decoy voter.
    // Synchronous resolution changes the phase before another packet/timer can act.
    const resolved = room.players.filter(p => p.alive).every(p => Object.hasOwn(room.votes, p.id))
      && this.resolveVoting(room, now);
    this.touch(room, now); return resolved;
  }
  chat(room: Room, id: string, text: string, now: number) {
    this.appendChat(room, id, { text }, now);
  }
  quickChat(room: Room, id: string, phraseId: string, now: number) {
    if (!isQuickPhraseId(phraseId)) return fail('invalid');
    // The server supplies the fallback, never a client's translation or identity.
    this.appendChat(room, id, { text: QUICK_PHRASES[phraseId].en, phraseId }, now);
  }
  private appendChat(room: Room, id: string, message: Pick<ChatMessage, 'text' | 'phraseId'>, now: number) {
    const player = this.player(room, id);
    if (room.phase !== 'lobby' && room.phase !== 'discussion' && room.phase !== 'ended') fail('wrong_phase');
    if (room.phase === 'discussion' && !player.alive) fail('unauthorized');
    room.chat.push({ id: randomUUID(), playerId: id, name: player.name, ...message });
    room.chat = room.chat.slice(-80); this.touch(room, now);
  }
  rematch(room: Room, id: string, now: number) {
    this.host(room, id); if (room.phase !== 'ended') fail('wrong_phase');
    room.players.forEach(p => { p.role = undefined; p.alive = true; p.ready = false; p.investigations = []; });
    room.day = 0; room.winner = undefined; room.centerRole = undefined;
    room.attacks = {}; room.inspected = new Set(); room.witchAction = undefined; room.victim = null;
    room.votes = {}; room.ballots = undefined; room.events = []; room.chat = [];
    this.phase(room, 'lobby', now); this.touch(room, now);
  }
  private finish(room: Room, winner: Winner, now: number) {
    room.winner = winner; this.phase(room, 'ended', now); this.event(room, { kind: 'result', day: room.day, winner });
  }
  private victory(room: Room, now: number): boolean {
    const alive = room.players.filter(p => p.alive);
    const wolves = alive.filter(p => p.role === 'werewolf').length;
    if (alive.length === 0) this.finish(room, 'draw', now);
    else if (wolves === 0) this.finish(room, 'village', now);
    else if (wolves >= alive.length - wolves) this.finish(room, 'wolves', now);
    else return false;
    return true;
  }
  private plurality(votes: string[]): string | null {
    const totals = new Map<string, number>();
    votes.forEach(v => totals.set(v, (totals.get(v) ?? 0) + 1));
    const sorted = [...totals].sort((a, b) => b[1] - a[1]);
    return sorted.length && (sorted.length === 1 || sorted[0][1] > sorted[1][1]) ? sorted[0][0] : null;
  }
  private resolveVoting(room: Room, now: number): boolean {
    if (room.phase !== 'voting') return false;
    const eligible = room.players.filter(p => p.alive);
    room.ballots = Object.fromEntries(eligible.map(p => [p.id, room.votes[p.id] ?? (room.mode === 'quick' ? 'missing' : 'skip')]));
    if (room.mode === 'quick') {
      const correct = room.centerRole === 'werewolf' ? 'center' : 'other';
      this.finish(room, eligible.filter(p => p.role === 'villager').every(p => room.votes[p.id] === correct) ? 'village' : 'wolves', now);
    } else {
      const target = this.plurality(Object.values(room.ballots));
      if (target && target !== 'skip') {
        const player = this.player(room, target); player.alive = false; room.deathThisCycle = true;
        this.event(room, { kind: 'elimination', day: room.day, players: [{ name: player.name, role: player.role! }] });
      } else this.event(room, { kind: 'no_elimination', day: room.day });
      room.quietCycles = room.deathThisCycle ? 0 : room.quietCycles + 1;
      if (!this.victory(room, now)) {
        if (room.quietCycles >= 3) this.finish(room, 'draw', now);
        else this.phase(room, 'verdict', now);
      }
    }
    return true;
  }
  tick(room: Room, now: number): boolean {
    if (room.deadline === null || now < room.deadline) return false;
    if (room.mode === 'quick') {
      if (room.phase === 'reveal') this.phase(room, 'discussion', now);
      else if (room.phase === 'discussion') { room.votes = {}; this.phase(room, 'voting', now); }
      else if (room.phase === 'voting') this.resolveVoting(room, now);
      this.touch(room, now); return true;
    }
    switch (room.phase) {
      case 'reveal':
      case 'verdict': {
        if (room.phase === 'verdict') room.day++;
        room.attacks = {}; room.inspected = new Set(); room.witchAction = undefined; room.victim = null;
        room.votes = {}; room.ballots = undefined; room.deathThisCycle = false;
        this.phase(room, 'nightfall', now); break;
      }
      case 'nightfall': this.phase(room, 'wolves', now); break;
      case 'wolves': {
        room.victim = this.plurality(Object.values(room.attacks)); this.phase(room, 'seer', now); break;
      }
      case 'seer': this.phase(room, 'witch', now); break;
      case 'witch': {
        const deaths = new Set<string>();
        if (room.victim && room.witchAction?.kind !== 'heal') deaths.add(room.victim);
        if (room.witchAction?.kind === 'poison' && room.witchAction.target) deaths.add(room.witchAction.target);
        const killed = room.players.filter(p => deaths.has(p.id)); killed.forEach(p => p.alive = false);
        room.deathThisCycle = killed.length > 0;
        this.event(room, { kind: 'dawn', day: room.day, players: killed.map(p => ({ name: p.name, role: p.role! })) });
        if (!this.victory(room, now)) this.phase(room, 'dawn', now);
        break;
      }
      case 'dawn': this.phase(room, 'discussion', now); break;
      case 'discussion': room.votes = {}; room.ballots = undefined; this.phase(room, 'voting', now); break;
      case 'voting': this.resolveVoting(room, now); break;
    }
    this.touch(room, now); return true;
  }
  view(room: Room, id: string, now: number): GameView {
    const you = this.player(room, id);
    const view: GameView = {
      code: room.code, mode: room.mode, phase: room.phase, day: room.day,
      serverNow: now, deadline: room.deadline, hostId: room.hostId, youId: id,
      players: room.players.map(p => ({ id: p.id, name: p.name, connected: p.connected, ready: p.ready, alive: p.alive,
        ...((!p.alive || room.phase === 'ended') && p.role ? { role: p.role } : {}),
      })),
      events: room.events.map(e => ({ ...e, players: e.players?.map(p => ({ ...p })) })),
      chat: room.chat.map(m => ({ ...m })), acted: false,
    };
    if (you.role) view.role = you.role;
    if (you.role === 'werewolf') {
      view.wolfTeam = room.players.filter(p => p.role === 'werewolf').map(p => p.id);
      if (room.phase === 'wolves' && you.alive) {
        view.wolfSelections = { ...room.attacks }; view.selection = room.attacks[id]; view.acted = !!room.attacks[id];
      }
    }
    if (you.role === 'seer') {
      view.investigations = you.investigations.map(i => ({ ...i }));
      if (room.phase === 'seer') view.acted = room.inspected.has(id);
    }
    if (you.role === 'witch') {
      view.potions = { heal: you.heal, poison: you.poison };
      if (room.phase === 'witch' && you.alive) {
        if (you.heal) view.victim = room.victim;
        view.acted = !!room.witchAction;
      }
    }
    if (room.phase === 'voting') { view.selection = room.votes[id]; view.acted = !!room.votes[id]; }
    if (room.ballots) view.ballots = { ...room.ballots };
    if (room.winner) view.winner = room.winner;
    if (room.phase === 'ended' && room.centerRole) view.centerRole = room.centerRole;
    return view;
  }
}
