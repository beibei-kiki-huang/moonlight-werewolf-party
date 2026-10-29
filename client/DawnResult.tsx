import { Sun } from 'lucide-react';
import type { GameEvent, Role } from '../shared/types';
import type { Translate } from './presentation';
export function DawnResult({ event, tr, roleName }: { event: GameEvent; tr: Translate; roleName: (role: Role) => string }) {
  if (event.kind !== 'dawn') return null;
  return <section className={`panel dawn-result ${event.players?.length ? 'dawn-losses' : 'dawn-peaceful'}`} aria-label={tr('Authoritative night results', '黎明结算')}>
    <p className="eyebrow"><Sun size={17}/>{tr(`DAWN ${event.day} · NIGHT RESULTS`, `第${event.day}天 · 黎明结算`)}</p>
    <h2>{event.players?.length ? tr('Eliminated during the night', '昨夜出局的玩家') : tr('A peaceful night.', '昨夜是平安夜。')}</h2>
    {event.players?.length ? <ul>{event.players.map((p,i) => <li key={i}><strong>{p.name}</strong><span>{roleName(p.role)}</span></li>)}</ul> : <p>{tr('No players were eliminated.', '无人出局。')}</p>}
  </section>;
}
