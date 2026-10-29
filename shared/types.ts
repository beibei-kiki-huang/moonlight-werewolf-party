import type { QuickPhraseId } from './quickChat';
export type Role = 'werewolf' | 'villager' | 'seer' | 'witch';
export type Mode = 'classic' | 'quick';
export type Phase = 'lobby' | 'reveal' | 'nightfall' | 'wolves' | 'seer' | 'witch' | 'dawn' | 'discussion' | 'voting' | 'verdict' | 'ended';
export type Winner = 'village' | 'wolves' | 'draw';
export type ErrorCode = 'invalid' | 'room_missing' | 'room_full' | 'name_taken' | 'started' | 'unauthorized' | 'not_host' | 'not_ready' | 'wrong_phase' | 'invalid_target' | 'already_acted' | 'rate_limit' | 'capacity';
export interface PublicPlayer { id: string; name: string; connected: boolean; ready: boolean; alive: boolean; role?: Role }
export interface GameEvent { id: number; kind: 'start' | 'dawn' | 'elimination' | 'no_elimination' | 'result'; day: number; players?: { name: string; role: Role }[]; winner?: Winner }
export interface ChatMessage { id: string; playerId: string; name: string; text: string; phraseId?: QuickPhraseId }
export interface Investigation { day: number; targetId: string; name: string; isWolf: boolean }
export interface GameView {
  code: string; mode: Mode; phase: Phase; day: number; serverNow: number; deadline: number | null;
  hostId: string; youId: string; players: PublicPlayer[]; events: GameEvent[]; chat: ChatMessage[];
  role?: Role; wolfTeam?: string[]; wolfSelections?: Record<string, string>; investigations?: Investigation[];
  potions?: { heal: boolean; poison: boolean }; victim?: string | null; acted: boolean; selection?: string;
  ballots?: Record<string, string>; winner?: Winner; centerRole?: Role;
}
export interface Seat { code: string; playerId: string; token: string }
export type Reply<T = undefined> = { ok: true; data: T } | { ok: false; error: ErrorCode };
export type Action = { kind: 'attack' | 'inspect' | 'heal' | 'poison' | 'pass'; target?: string };
