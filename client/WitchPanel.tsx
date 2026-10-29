import { FlaskConical, Heart, Check } from 'lucide-react';
import type { Action, GameView } from '../shared/types';
import type { Translate } from './presentation';

export function WitchPanel({ view, disabled, target, onTarget, onConfirm, onPass, tr }: {
  view: GameView; disabled: boolean; target: string; onTarget: (id: string) => void;
  onConfirm: (action: Action) => void; onPass: () => void; tr: Translate;
}) {
  if (view.mode !== 'classic' || view.phase !== 'witch' || view.role !== 'witch' || !view.players.find(p => p.id === view.youId)?.alive) return null;
  const locked = view.acted, heal = view.potions?.heal === true, poison = view.potions?.poison === true;
  const eligible = view.players.filter(p => p.alive && p.id !== view.youId);
  const validPoison = poison && eligible.some(p => p.id === target);
  const victim = view.players.find(p => p.id === view.victim && p.alive);
  const status = (available: boolean) => !view.potions ? tr('Unavailable', '暂不可用') : !available ? tr('Used · unavailable this match', '已使用 · 本局不可再用') : locked ? tr('Available · locked for tonight', '尚未使用 · 今晚行动已锁定') : tr('Available · once per match', '可用 · 整局仅一次');
  return <section className="panel action-panel witch-inventory" aria-label={tr('Your private Witch inventory', '你的女巫私人药水')}>
    <p className="eyebrow">{tr('YOUR PRIVATE NIGHT ACTION', '你的私人夜间行动')}</p><h2>{tr('A life in the balance', '生死之间')}</h2>
    <p>{tr('Use at most one potion tonight, or pass. Each potion can be used once per match.', '每晚最多使用一瓶药，或选择不使用。解药和毒药在整局各只能使用一次。')}</p>
    {locked && <p className="witch-lock" role="status"><Check size={17}/>{tr('Your action is confirmed. Inventory is locked until the next night.', '行动已确认，今晚无法再次操作。')}</p>}
    <div className={`potion-row potion-heal ${!heal ? 'potion-used' : ''}`}><div><Heart size={21}/><strong>{tr('Healing potion', '解药')}</strong><span>{status(heal)}</span>
      {heal && !locked && <span>{victim ? tr(`Under attack: ${victim.name}`, `被袭击的玩家：${victim.name}`) : tr('Unavailable tonight: no wolf victim.', '今晚无可救目标，解药仍保留。')}</span>}</div>
      <button className="button secondary" disabled={disabled || locked || !heal || !victim} onClick={() => onConfirm({kind:'heal'})}>{tr('Save', '使用解药')}</button></div>
    <div className={`potion-row potion-poison ${!poison ? 'potion-used' : ''}`}><div><FlaskConical size={21}/><strong>{tr('Poison potion', '毒药')}</strong><span>{status(poison)}</span><span>{tr('Target one other living player.', '目标须为一名其他存活玩家。')}</span></div></div>
    {poison && !locked && <><div className="target-grid" aria-label={tr('Eligible poison targets', '可使用毒药的目标')}>{eligible.map(p => <button key={p.id} className={`target ${target === p.id ? 'chosen' : ''}`} disabled={disabled} aria-pressed={target === p.id} onClick={() => onTarget(p.id)}><span className="avatar">{p.name.slice(0,1).toUpperCase()}</span><span>{p.name}</span></button>)}</div></>}
    <button className="button danger" disabled={disabled || locked || !validPoison} onClick={() => onConfirm({kind:'poison',target})}><FlaskConical size={16}/>{tr('Use poison', '使用毒药')}</button>
    <button className="text-button pass" disabled={disabled || locked} onClick={onPass}>{tr('Pass tonight', '今晚不使用药水')}</button>
  </section>;
}
