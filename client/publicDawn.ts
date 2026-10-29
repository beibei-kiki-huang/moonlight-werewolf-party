import type { GameEvent, GameView } from '../shared/types';
export interface DawnCue { id: number; peaceful: boolean }
// Reads only published events, never a victim, potion flag or pending night action.
export function publishedDawn(view: Pick<GameView, 'mode'|'phase'|'day'|'events'>): GameEvent | undefined {
  if (view.mode !== 'classic' || !['dawn','discussion','ended'].includes(view.phase)) return;
  const event = [...view.events].reverse().find(e => e.kind === 'dawn' && e.day === view.day);
  if (!event) return;
  if (view.phase === 'ended' && (view.events.at(-1)?.kind !== 'result' || view.events.at(-2)?.id !== event.id)) return;
  return event;
}
export function publishedDawnCue(view: Pick<GameView, 'mode'|'phase'|'day'|'events'>): DawnCue | undefined {
  if (view.phase !== 'dawn' && view.phase !== 'ended') return;
  const event = publishedDawn(view);
  return event ? {id:event.id,peaceful:!event.players?.length} : undefined;
}
