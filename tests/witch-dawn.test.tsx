import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup as render } from 'react-dom/server';
import { DURATIONS, Game, GameError, newPlayer, newRoom } from '../server/game';
import type { GameView, Role, GameEvent, ErrorCode } from '../shared/types';
import { phaseScript } from '../shared/publicPhase';
import { WitchPanel } from '../client/WitchPanel';
import { DawnResult } from '../client/DawnResult';
import { publishedDawn, publishedDawnCue } from '../client/publicDawn';
import { PublicNarrator, narrationCues, type RecordingPort, type PublicScene } from '../client/audio';
import { RoleCard } from '../client/presentation';
const en=(a:string,_b:string)=>a, zh=(_a:string,b:string)=>b;
const name=(role:Role)=>({werewolf:'狼人',villager:'村民',seer:'预言家',witch:'女巫'})[role];
function setup(){const game=new Game(DURATIONS,cards=>[...cards]);const wolf=newPlayer('Wolf');const room=newRoom('ABC234','classic',wolf,0);for(const n of ['V1','V2','V3','Seer','Witch'])game.join(room,n,0);for(const p of room.players)game.ready(room,p.id,true,0);room.discussionMode='open';game.start(room,wolf.id,0);return{game,room,wolf,witch:room.players[5]}}
function until(s:ReturnType<typeof setup>,phase:string){for(let i=0;s.room.phase!==phase&&i<30;i++)s.game.tick(s.room,s.room.deadline!);expect(s.room.phase).toBe(phase)}
function act(s:ReturnType<typeof setup>,id:string,a:Parameters<Game['act']>[2]){s.game.act(s.room,id,a,s.room.deadline!-1)}
function nextNight(s:ReturnType<typeof setup>){until(s,'voting');for(const p of s.room.players.filter(p=>p.alive))s.game.vote(s.room,p.id,'skip',s.room.deadline!-1);until(s,'wolves')}
function invalid(fn:()=>void,code:ErrorCode){expect(fn).toThrowError(new GameError(code))}
describe('Witch and authoritative dawn regression',()=>{
 it('cannot reuse either potion across nights, combine them, or poison self; pass leaves both intact',()=>{
  const s=setup();until(s,'witch');invalid(()=>act(s,s.witch.id,{kind:'poison',target:s.witch.id}),'invalid_target');expect(s.witch.poison).toBe(true);
  act(s,s.witch.id,{kind:'poison',target:s.room.players[1].id});invalid(()=>act(s,s.witch.id,{kind:'heal'}),'already_acted');until(s,'dawn');nextNight(s);
  act(s,s.wolf.id,{kind:'attack',target:s.witch.id});until(s,'witch');invalid(()=>act(s,s.witch.id,{kind:'poison',target:s.room.players[2].id}),'invalid_target');
  act(s,s.witch.id,{kind:'heal'});until(s,'dawn');expect(s.witch.alive).toBe(true);nextNight(s);act(s,s.wolf.id,{kind:'attack',target:s.witch.id});until(s,'witch');invalid(()=>act(s,s.witch.id,{kind:'heal'}),'invalid_target');
  const p=setup();until(p,'witch');act(p,p.witch.id,{kind:'pass'});expect([p.witch.heal,p.witch.poison]).toEqual([true,true]);invalid(()=>act(p,p.witch.id,{kind:'poison',target:p.wolf.id}),'already_acted');
 });
 it('publishes identical cause-free peaceful events for no attack and a successful heal',()=>{
  const a=setup(),b=setup();until(a,'witch');act(a,a.witch.id,{kind:'pass'});until(a,'dawn');
  until(b,'wolves');act(b,b.wolf.id,{kind:'attack',target:b.witch.id});until(b,'witch');act(b,b.witch.id,{kind:'heal'});until(b,'dawn');
  expect(a.room.events.at(-1)).toEqual(b.room.events.at(-1));expect(a.room.events.at(-1)?.players).toEqual([]);
  for(const p of b.room.players.filter(p=>p!==b.witch)){const v=b.game.view(b.room,p.id,0);expect(v.potions).toBeUndefined();expect(v.victim).toBeUndefined()}
 });
 it('deduplicates overlapping attack and poison deaths and includes terminal night results',()=>{
  const a=setup();until(a,'wolves');act(a,a.wolf.id,{kind:'attack',target:a.room.players[1].id});until(a,'witch');act(a,a.witch.id,{kind:'poison',target:a.room.players[1].id});until(a,'dawn');expect(a.room.events.at(-1)?.players?.map(p=>p.name)).toEqual(['V1']);
  const b=setup();until(b,'wolves');act(b,b.wolf.id,{kind:'attack',target:b.witch.id});until(b,'witch');act(b,b.witch.id,{kind:'poison',target:b.wolf.id});b.game.tick(b.room,b.room.deadline!);
  expect(b.room.phase).toBe('ended');expect(b.room.winner).toBe('village');const v=b.game.view(b.room,b.witch.id,0);expect(publishedDawn(v)?.players?.map(p=>p.name)).toEqual(['Wolf','Witch']);expect(publishedDawnCue(v)?.peaceful).toBe(false);
 });
 it.each(['dead','absent','spent'] as const)('keeps fixed public slots and guidance with %s special roles',condition=>{
  const s=setup();if(condition==='dead'){s.room.players[4].alive=false;s.witch.alive=false}else if(condition==='absent'){s.room.players[4].role=undefined;s.witch.role=undefined}else{s.witch.heal=false;s.witch.poison=false}
  let stageStarted=s.room.deadline!;until(s,'nightfall');for(const [phase,duration] of [['nightfall',5000],['wolves',25000],['seer',15000],['witch',20000]] as const){expect(s.room.phase).toBe(phase);expect(s.room.deadline!-stageStarted).toBe(duration);expect(s.game.tick(s.room,s.room.deadline!-1)).toBe(false);expect(s.game.view(s.room,s.wolf.id,s.room.deadline!-duration).deadline).toBe(s.room.deadline);const baseline=phaseScript({mode:'classic',phase},'zh');expect(baseline).toBe(phaseScript({...s.game.view(s.room,s.witch.id,0),phase},'zh'));stageStarted=s.room.deadline!;s.game.tick(s.room,stageStarted)}
 });
 it('renders both spent potions and locks every private action after confirmation',()=>{
  const s=setup();until(s,'witch');s.witch.poison=false;act(s,s.witch.id,{kind:'pass'});const view=s.game.view(s.room,s.witch.id,0);
  const html=render(<WitchPanel view={view} disabled={false} target={s.wolf.id} onTarget={()=>{}} onConfirm={()=>{}} onPass={()=>{}} tr={zh}/>);
  expect(html).toContain('解药');expect(html).toContain('毒药');expect(html).toContain('已使用 · 本局不可再用');expect(html).toContain('尚未使用 · 今晚行动已锁定');expect(html.match(/disabled=""/g)).toHaveLength(3);expect(html).not.toContain('target-grid');
  expect(render(<WitchPanel view={{...view,role:'villager'}} disabled={false} target="" onTarget={()=>{}} onConfirm={()=>{}} onPass={()=>{}} tr={en}/>)).toBe('');
 });
 it('shows no-victim healing unavailability without consuming the available potion',()=>{
  const s=setup();until(s,'witch');const view=s.game.view(s.room,s.witch.id,0);const html=render(<WitchPanel view={view} disabled={false} target="" onTarget={()=>{}} onConfirm={()=>{}} onPass={()=>{}} tr={zh}/>);
  expect(html).toContain('今晚无可救目标，解药仍保留。');expect(view.potions?.heal).toBe(true);expect(html).not.toContain('>Witch</span>');
 });
 it('never derives a dawn cue from private night data or repeats old dawn on a voting victory',()=>{
  const dawn:GameEvent={id:2,kind:'dawn',day:1,players:[]};const base={mode:'classic' as const,day:1,events:[dawn],phase:'witch' as const,victim:'Secret',potions:{heal:false,poison:false}};
  expect(publishedDawn(base)).toBeUndefined();expect(publishedDawnCue(base)).toBeUndefined();
  expect(publishedDawnCue({...base,phase:'dawn'})).toEqual({id:2,peaceful:true});
  const end={...base,phase:'ended' as const,events:[dawn,{id:3,kind:'elimination' as const,day:1,players:[]},{id:4,kind:'result' as const,day:1,winner:'village' as const}]};expect(publishedDawn(end)).toBeUndefined();
  const html=render(<DawnResult event={dawn} tr={zh} roleName={name}/>);expect(html).toContain('昨夜是平安夜。');expect(html).not.toMatch(/解药|毒药|女巫/);
 });
 it('uses the requested Chinese Seer wording without renaming the Villager role',()=>{
  const s=setup();const view=s.game.view(s.room,s.room.players[4].id,0);const html=render(<RoleCard view={view} visible onToggle={()=>{}} tr={zh} roleName={name}/>);
  expect(html).toContain('你属于好人阵营。每晚可以查验一名其他存活玩家，得知对方是否属于狼人阵营。利用你掌握的信息，帮助好人找出所有狼人。');expect(name('villager')).toBe('村民');
 });
 it('queues terminal dawn then victory once, and cancels stale continuations',()=>{
  const callbacks:{done:()=>void;failed:()=>void}[]=[];const urls:string[]=[];const duck=vi.fn();
  const recordings:RecordingPort={play:(url,_volume,done,failed)=>{urls.push(url);callbacks.push({done,failed});return{stop:vi.fn(),setVolume:vi.fn()}}};
  const narrator=new PublicNarrator(null,()=>{},duck,recordings);const scene:PublicScene={code:'ABC234',mode:'classic',phase:'ended',day:1,deadline:null,winner:'village',dawn:{id:2,peaceful:false}};
  narrator.update(scene,'zh',true);expect(urls).toEqual(['/audio/narration/zh/dawn-deaths.m4a']);narrator.update({...scene},'zh',true);expect(urls).toHaveLength(1);
  callbacks[0].done();expect(urls[1]).toBe('/audio/narration/zh/ended-village.m4a');callbacks[0].done();expect(urls).toHaveLength(2);narrator.stop();callbacks[1].done();expect(urls).toHaveLength(2);expect(duck).toHaveBeenLastCalledWith(false);
  narrator.update(scene,'en',true);narrator.update(scene,'en',false);callbacks[2].done();expect(urls).toHaveLength(3);
  expect(narrationCues({...scene,phase:'witch'},'zh')).toHaveLength(1);
 });
});
