import { randomInt, randomUUID } from 'node:crypto';
import type { Action, ChatMessage, ErrorCode, GameEvent, GameView, Investigation, Mode, Phase, Role, Winner, DiscussionMode, PackChatState, PackSubmission, VoteRound } from '../shared/types.js';
import { CLASSIC_NIGHT_ACTION_MS, TIE_SPEAKING_MS, LAST_WORDS_MS } from '../shared/rules.js';
import { isQuickPhraseId, QUICK_PHRASES } from '../shared/quickChat.js';
import { safeChatText } from '../shared/chatText.js';

export class GameError extends Error {
  constructor(public code: ErrorCode) { super(code); }
}
export interface Player {
  colorIndex:number;id: string; name: string; connected: boolean; ready: boolean; alive: boolean; role?: Role;
  heal: boolean; poison: boolean; investigations: Investigation[];
}
export interface Room {
  code: string; mode: Mode; hostId: string; players: Player[]; phase: Phase; day: number;
  revision: number; deadline: number | null; createdAt: number; lastActivity: number; allOfflineSince: number | null;
  attacks: Record<string, string>; inspected: Set<string>; witchAction?: Action; victim: string | null;
  votes: Record<string, string>; ballots?: Record<string, string>; winner?: Winner; centerRole?: Role;
  tiedCandidates:string[];voteHistory:VoteRound[];
  discussionMode:DiscussionMode;turnSeconds:30|45|60;speakingOrder:string[];speakerIndex:number;turnId?:string;lastWordsId?:string;
  events: GameEvent[]; chat: ChatMessage[]; deathThisCycle: boolean; quietCycles: number;
}
export type Durations = Partial<Record<Phase, number>> & { quickDiscussion?: number };
export const DURATIONS: Durations = {
  reveal: 30_000, nightfall: 5_000, wolves: CLASSIC_NIGHT_ACTION_MS, seer: CLASSIC_NIGHT_ACTION_MS, witch: CLASSIC_NIGHT_ACTION_MS, dawn: 8_000,
  discussion: 120_000, tie_discussion:TIE_SPEAKING_MS,runoff:30_000,last_words:LAST_WORDS_MS, quickDiscussion: 90_000, voting: 30_000, verdict: 8_000,
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
  return { colorIndex:0,id: randomUUID(), name, connected: true, ready: false, alive: true, heal: true, poison: true, investigations: [] };
}
export function newRoom(code: string, mode: Mode, host: Player, now: number): Room {
  return {
    code, mode, hostId: host.id, players: [host], phase: 'lobby', day: 0, revision: 0,
    deadline: null, createdAt: now, lastActivity: now, allOfflineSince: null,
    tiedCandidates:[],voteHistory:[],discussionMode:'structured',turnSeconds:45,speakingOrder:[],speakerIndex:0,
    attacks: {}, inspected: new Set(), victim: null, votes: {}, events: [], chat: [], deathThisCycle: false, quietCycles: 0,
  };
}
export class Game {
  // Private, bounded current-stage storage; never part of public Room chat/events/revisions.
  private packStores = new WeakMap<Room, PackChatState & { receipts: Map<string, ChatMessage> }>();
  private offlineHosts = new WeakMap<Room, { id: string; since: number }>();
  private offlineSpeakers = new WeakMap<Room, { turnId: string; since: number }>();
  constructor(private durations: Durations = DURATIONS, private deal: (cards: Role[]) => Role[] = shuffle, private chooseIndex:(size:number)=>number=randomInt) {}
  player(room: Room, id: string): Player { return room.players.find(p => p.id === id) ?? fail('unauthorized'); }
  touch(room: Room, now: number) { room.revision++; room.lastActivity = now; }
  host(room: Room, id: string) { if (room.hostId !== id) fail('not_host'); }
  connectionChanged(room: Room, id: string, connected: boolean, now: number) {
    // Expire any elapsed grace/deadline before a late reconnect can cancel it.
    this.tick(room, now);
    this.player(room, id).connected = connected;
    this.tick(room, now);
    this.touch(room, now);
  }
  // Public connection recovery only. Night actions never affect these timers.
  private recoverConnections(room: Room, now: number): boolean {
    let changed = false;
    const host = this.player(room, room.hostId);
    if ((room.phase === 'lobby' || room.phase === 'ended') && !host.connected) {
      let pending = this.offlineHosts.get(room);
      if (!pending || pending.id !== host.id) {
        pending = { id: host.id, since: now }; this.offlineHosts.set(room, pending);
      }
      if (now >= pending.since + 20_000) {
        const successor = room.players.find(p => p.connected && p.id !== host.id);
        if (successor) {
          room.hostId = successor.id; this.offlineHosts.delete(room);
          this.event(room, { kind: 'host_transfer', day: room.day, hostName: successor.name });
          changed = true;
        }
      }
    } else this.offlineHosts.delete(room);
    const speaking = room.mode === 'classic' && (room.phase === 'tie_discussion' || room.phase === 'last_words' || room.phase === 'discussion' && room.discussionMode === 'structured');
    const speakerId = room.phase === 'last_words' ? room.lastWordsId : room.speakingOrder[room.speakerIndex];
    const speaker = speaking ? room.players.find(p => p.id === speakerId) : undefined;
    if (speaker && !speaker.connected && room.turnId && room.deadline !== null && now < room.deadline) {
      let pending = this.offlineSpeakers.get(room);
      if (!pending || pending.turnId !== room.turnId) {
        pending = { turnId: room.turnId, since: now }; this.offlineSpeakers.set(room, pending);
      }
      if (now >= pending.since + 5_000) {
        this.offlineSpeakers.delete(room);
        if (room.phase === 'last_words') this.completeVerdict(room, now);
        else this.advanceSpeaker(room, now);
        changed = true;
      }
    } else this.offlineSpeakers.delete(room);
    return changed;
  }
  join(room: Room, name: string, now: number): Player {
    if (room.phase !== 'lobby') fail('started');
    if (room.players.length >= (room.mode === 'classic' ? 8 : 2)) fail('room_full');
    if (room.players.some(p => p.name.toLocaleLowerCase() === name.toLocaleLowerCase())) fail('name_taken');
    const player = newPlayer(name);player.colorIndex=Array.from({length:8},(_,i)=>i).find(i=>!room.players.some(p=>p.colorIndex===i))??0; room.players.push(player); this.touch(room, now); return player;
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
    if(room.mode===mode)return;
    room.mode = mode; room.players.forEach(p => p.ready = false); this.touch(room, now);
  }
  configureDiscussion(room:Room,id:string,discussionMode:DiscussionMode,turnSeconds:30|45|60,now:number){
    this.host(room,id);if(room.phase!=='lobby')fail('wrong_phase');if(room.mode!=='classic')fail('unauthorized');
    if(!['structured','open'].includes(discussionMode)||![30,45,60].includes(turnSeconds))fail('invalid');
    if(room.discussionMode===discussionMode&&room.turnSeconds===turnSeconds)return;
    room.discussionMode=discussionMode;room.turnSeconds=turnSeconds;room.players.forEach(p=>p.ready=false);this.touch(room,now);
  }
  canPublicChat(room:Room,id:string,now:number){
    const p=room.players.find(p=>p.id===id);if(!p)return false;
    if(room.phase==='lobby'||room.phase==='ended')return true;
    if(room.deadline===null||now>=room.deadline)return false;
    if(room.phase==='last_words')return id===room.lastWordsId;
    if(room.phase==='tie_discussion')return p.alive&&room.speakingOrder[room.speakerIndex]===id;
    return room.phase==='discussion' && p.alive && (room.mode==='quick'||room.discussionMode==='open'||room.speakingOrder[room.speakerIndex]===id);
  }
  private beginDiscussion(room:Room,now:number){
    this.phase(room,'discussion',now);
    if(room.discussionMode==='structured'){
      room.speakingOrder=room.players.filter(p=>p.alive).map(p=>p.id);room.speakerIndex=0;
      room.deadline=now+room.turnSeconds*1000;room.turnId=randomUUID();
    }
  }
  private advanceSpeaker(room:Room,now:number){
    do{room.speakerIndex++}while(room.speakerIndex<room.speakingOrder.length&&!room.players.find(p=>p.id===room.speakingOrder[room.speakerIndex])?.alive);
    if(room.speakerIndex>=room.speakingOrder.length){
      room.votes={};room.ballots=undefined;
      if(room.phase==='tie_discussion'){this.phase(room,'runoff',now);if(!this.eligibleVoters(room).length)this.resolveVoting(room,now)}
      else this.phase(room,'voting',now);
    } else{room.deadline=now+(room.phase==='tie_discussion'?(this.durations.tie_discussion??TIE_SPEAKING_MS):room.turnSeconds*1000);room.turnId=randomUUID()}
  }
  finishSpeaking(room:Room,id:string,turnId:string,now:number){
    if(room.mode!=='classic'||!['discussion','tie_discussion','last_words'].includes(room.phase)||(room.phase==='discussion'&&room.discussionMode!=='structured')||room.deadline===null||now>=room.deadline||turnId!==room.turnId)fail('wrong_phase');
    if(!this.canPublicChat(room,id,now))fail('unauthorized');
    if(room.phase==='last_words')this.completeVerdict(room,now);else this.advanceSpeaker(room,now);this.touch(room,now);
  }
  private completeVerdict(room:Room,now:number){
    if(!this.victory(room,now)){if(room.quietCycles>=3)this.finish(room,'draw',now);else this.phase(room,'verdict',now)}
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
    room.tiedCandidates=[];room.voteHistory=[];
    room.winner = undefined; room.quietCycles = 0; room.deathThisCycle = false;
    this.event(room, { kind: 'start', day: 1 }); this.phase(room, 'reveal', now); this.touch(room, now);
  }
  private event(room: Room, event: Omit<GameEvent, 'id'>) { room.events.push({ ...event, id: room.events.length + 1 }); }
  private phase(room: Room, phase: Phase, now: number) {
    this.packStores.delete(room);
    if(!['discussion','tie_discussion','last_words'].includes(phase))room.turnId=undefined;
    if(phase!=='last_words')room.lastWordsId=undefined;
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
    if(!['voting','runoff'].includes(room.phase))fail('wrong_phase');
    this.actor(room, id, room.phase, null, now);
    if(!this.eligibleVoters(room).some(p=>p.id===id))fail('unauthorized');
    if (room.mode === 'quick') {
      if (target !== 'other' && target !== 'center') fail('invalid_target');
    } else if (target !== 'skip') {this.target(room, target, id);if(room.phase==='runoff'&&!room.tiedCandidates.includes(target))fail('invalid_target')}
    room.votes[id] = target;
    // Every living seat counts, including offline seats and the Duel's decoy voter.
    // Synchronous resolution changes the phase before another packet/timer can act.
    const resolved = this.eligibleVoters(room).every(p => Object.hasOwn(room.votes, p.id))
      && this.resolveVoting(room, now);
    this.touch(room, now); return resolved;
  }
  chat(room: Room, id: string, text: string, now: number, turnId?:string) {
    this.appendChat(room, id, { text }, now,turnId);
  }
  canPackChat(room: Room, id: string, now: number) {
    const player=room.players.find(p=>p.id===id);
    return room.mode==='classic' && room.phase==='wolves' && room.deadline!==null && now<room.deadline
      && player?.alive===true && player.role==='werewolf' && room.players.filter(p=>p.alive && p.role==='werewolf').length>=2;
  }
  assertPackAccess(room: Room, id: string, now: number) {
    this.actor(room,id,'wolves','werewolf',now);
    if (!this.canPackChat(room,id,now)) fail('unauthorized');
  }
  private packStore(room: Room) {
    let store=this.packStores.get(room);
    if (!store) { store={stageId:randomUUID(),messages:[],receipts:new Map()}; this.packStores.set(room,store); }
    return store;
  }
  packState(room: Room, id: string, now: number): PackChatState | undefined {
    if (!this.canPackChat(room,id,now)) return;
    const store=this.packStore(room);
    return {stageId:store.stageId,messages:store.messages.map(m=>({...m}))};
  }
  packMessage(room: Room, id: string, input: PackSubmission, now: number) {
    // Re-authorize before duplicate lookup, including retries from an earlier night/rematch.
    this.assertPackAccess(room,id,now);
    const store=this.packStore(room);
    if (store.stageId!==input.stageId) fail('wrong_phase');
    const phraseId=input.phraseId;
    if (phraseId!==undefined && !isQuickPhraseId(phraseId)) fail('invalid');
    if ((input.text===undefined)===(phraseId===undefined)) fail('invalid');
    const text=phraseId===undefined ? input.text!.trim() : QUICK_PHRASES[phraseId].en;
    if (!text || text.length>300 || !safeChatText(text) || !/^[0-9a-f-]{36}$/i.test(input.clientMessageId)) fail('invalid');
    const key=id+'/'+input.clientMessageId, existing=store.receipts.get(key);
    if (existing) {
      if (existing.text!==text || existing.phraseId!==phraseId) fail('invalid');
      return {messageId:existing.id,duplicate:true};
    }
    if (store.receipts.size>=60) fail('rate_limit');
    const player=this.player(room,id),message:ChatMessage={id:randomUUID(),playerId:id,name:player.name,text,...(phraseId?{phraseId}:{})};
    store.receipts.set(key,message);store.messages.push(message);store.messages=store.messages.slice(-30);
    return {messageId:message.id,duplicate:false};
  }
  quickChat(room: Room, id: string, phraseId: string, now: number,turnId?:string) {
    if (!isQuickPhraseId(phraseId)) return fail('invalid');
    // The server supplies the fallback, never a client's translation or identity.
    this.appendChat(room, id, { text: QUICK_PHRASES[phraseId].en, phraseId }, now,turnId);
  }
  private appendChat(room: Room, id: string, message: Pick<ChatMessage, 'text' | 'phraseId'>, now: number,turnId?:string) {
    if (!safeChatText(message.text)) fail('invalid');
    const player = this.player(room, id);
    if(!['lobby','discussion','tie_discussion','last_words','ended'].includes(room.phase))fail('wrong_phase');
    if(!this.canPublicChat(room,id,now))fail('unauthorized');
    if(room.mode==='classic'&&(room.phase==='tie_discussion'||room.phase==='last_words'||room.phase==='discussion'&&room.discussionMode==='structured')&&turnId!==room.turnId)fail('wrong_phase');
    room.chat.push({ id: randomUUID(), playerId: id, name: player.name, ...message });
    room.chat = room.chat.slice(-80); this.touch(room, now);
  }
  rematch(room: Room, id: string, now: number) {
    this.host(room, id); if (room.phase !== 'ended') fail('wrong_phase');
    room.players.forEach(p => { p.role = undefined; p.alive = true; p.ready = false; p.investigations = []; });
    room.day = 0; room.winner = undefined; room.centerRole = undefined;
    room.attacks = {}; room.inspected = new Set(); room.witchAction = undefined; room.victim = null;
    room.votes = {}; room.ballots = undefined; room.events = []; room.chat = [];room.tiedCandidates=[];room.voteHistory=[];
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
  private resolveAttack(room:Room):string|null {
    const wolves=room.players.filter(p=>p.alive&&p.role==='werewolf');
    const eligible=room.players.filter(p=>p.alive&&p.role!=='werewolf').map(p=>p.id);
    if(!wolves.length||!eligible.length)return null;
    const totals=new Map<string,number>();
    for(const wolf of wolves){const target=room.attacks[wolf.id];if(eligible.includes(target))totals.set(target,(totals.get(target)??0)+1)}
    let candidates=eligible;
    if(totals.size){const highest=Math.max(...totals.values());candidates=[...totals].filter(([,n])=>n===highest).map(([id])=>id)}
    return candidates.length===1?candidates[0]:candidates[this.chooseIndex(candidates.length)];
  }
  private plurality(votes: string[]): string | null {
    const totals = new Map<string, number>();
    votes.forEach(v => totals.set(v, (totals.get(v) ?? 0) + 1));
    const sorted = [...totals].sort((a, b) => b[1] - a[1]);
    return sorted.length && (sorted.length === 1 || sorted[0][1] > sorted[1][1]) ? sorted[0][0] : null;
  }
  private eligibleVoters(room:Room) {
    return room.players.filter(p=>p.alive&&(room.phase!=='runoff'||!room.tiedCandidates.includes(p.id)));
  }
  private resolveVoting(room: Room, now: number): boolean {
    if (!['voting','runoff'].includes(room.phase)) return false;
    const runoff=room.phase==='runoff',eligible=this.eligibleVoters(room);
    room.ballots=Object.fromEntries(eligible.map(p=>[p.id,room.votes[p.id]??(room.mode==='quick'?'missing':'skip')]));
    if(room.mode==='quick') {
      const correct=room.centerRole==='werewolf'?'center':'other';
      this.finish(room,eligible.filter(p=>p.role==='villager').every(p=>room.votes[p.id]===correct)?'village':'wolves',now);
      return true;
    }
    room.voteHistory.push({day:room.day,round:runoff?'runoff':'initial',ballots:{...room.ballots},submitted:eligible.filter(p=>room.votes[p.id]!==undefined).map(p=>p.id)});
    const totals=new Map<string,number>();
    for(const target of Object.values(room.ballots))if(target!=='skip')totals.set(target,(totals.get(target)??0)+1);
    const highest=Math.max(0,...totals.values());
    const leaders=room.players.filter(p=>p.alive&&totals.get(p.id)===highest).map(p=>p.id);
    if(leaders.length>1&&!runoff){
      room.tiedCandidates=leaders;this.event(room,{kind:'tie',day:room.day,candidates:[...leaders]});
      this.phase(room,'tie_discussion',now);room.speakingOrder=[...leaders];room.speakerIndex=0;room.turnId=randomUUID();
      room.deadline=now+(this.durations.tie_discussion??TIE_SPEAKING_MS);
      return true;
    }
    const target=leaders.length===1?leaders[0]:null;
    if(target){
      const player=this.player(room,target);player.alive=false;room.deathThisCycle=true;
      this.event(room,{kind:'elimination',day:room.day,players:[{name:player.name,role:player.role!}]});
    }else {
      const submitted = eligible.filter(p => room.votes[p.id] !== undefined).length;
      this.event(room,{kind:'no_elimination',day:room.day,reason:!eligible.length?'no_eligible':highest===0?(submitted===0?'no_ballots':submitted===eligible.length?'abstained':'partial_abstention'):'runoff_tie'});
    }
    room.quietCycles=room.deathThisCycle?0:room.quietCycles+1;
    if(target){this.phase(room,'last_words',now);room.lastWordsId=target;room.turnId=randomUUID()}
    else this.completeVerdict(room,now);
    return true;
  }
  tick(room: Room, now: number): boolean {
    const recovered = this.recoverConnections(room, now);
    if (room.deadline === null || now < room.deadline) {
      if (recovered) this.touch(room, now);
      return recovered;
    }
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
        room.votes = {}; room.ballots = undefined; room.tiedCandidates=[];room.deathThisCycle = false;
        this.phase(room, 'nightfall', now); break;
      }
      case 'nightfall': this.phase(room, 'wolves', now); break;
      case 'wolves': {
        room.victim = this.resolveAttack(room); this.phase(room, 'seer', now); break;
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
      case 'dawn': this.beginDiscussion(room,now); break;
      case 'discussion': if(room.discussionMode==='structured')this.advanceSpeaker(room,now);else{room.votes={};room.ballots=undefined;this.phase(room,'voting',now)}break;
      case 'tie_discussion': this.advanceSpeaker(room,now);break;
      case 'runoff': this.resolveVoting(room,now);break;
      case 'last_words': this.completeVerdict(room,now);break;
      case 'voting': this.resolveVoting(room, now); break;
    }
    this.touch(room, now); return true;
  }
  view(room: Room, id: string, now: number): GameView {
    const you = this.player(room, id);
    const view: GameView = {
      code: room.code, mode: room.mode, phase: room.phase, day: room.day,
      serverNow: now, deadline: room.deadline, hostId: room.hostId, youId: id,
      players: room.players.map(p => ({ colorIndex:p.colorIndex,id: p.id, name: p.name, connected: p.connected, ready: p.ready, alive: p.alive,
        ...((!p.alive || room.phase === 'ended') && p.role ? { role: p.role } : {}),
      })),
      events: room.events.map(e => ({ ...e, candidates:e.candidates?[...e.candidates]:undefined, players: e.players?.map(p => ({ ...p })) })),
      chat: room.chat.map(m => ({ ...m })), acted: false,
    };
    if(room.mode==='classic'){
      view.discussionMode=room.discussionMode;view.turnSeconds=room.turnSeconds;
      view.voteHistory=room.voteHistory.map(r=>({...r,ballots:{...r.ballots},submitted:r.submitted?[...r.submitted]:undefined}));
      if(['tie_discussion','runoff'].includes(room.phase))view.tiedCandidates=[...room.tiedCandidates];
      if(room.phase==='tie_discussion'||room.phase==='discussion'&&room.discussionMode==='structured'){
        view.speakerId=room.speakingOrder[room.speakerIndex];view.nextSpeakerId=room.speakingOrder.slice(room.speakerIndex+1).find(id=>room.players.find(p=>p.id===id)?.alive);view.turnId=room.turnId;
      }
      if(room.phase==='last_words'){view.lastWordsPlayerId=room.lastWordsId;view.turnId=room.turnId}
    }
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
    if (room.phase === 'voting'||room.phase==='runoff') { view.selection = room.votes[id]; view.acted = !!room.votes[id]; }
    if (room.ballots) view.ballots = { ...room.ballots };
    if (room.winner) view.winner = room.winner;
    const pack=this.packState(room,id,now); if (pack) view.packChat=pack;
    if (room.phase === 'ended' && room.centerRole) view.centerRole = room.centerRole;
    return view;
  }
}
