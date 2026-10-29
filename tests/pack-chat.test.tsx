import {afterEach,describe,expect,it} from 'vitest';
import {randomUUID} from 'node:crypto';
import {io,type Socket} from 'socket.io-client';
import {renderToStaticMarkup as render} from 'react-dom/server';
import {Game,GameError,newRoom,newPlayer,type Room} from '../server/game';
import {createApp} from '../server/index';
import {PackChat} from '../client/PackChat';
import type {GameView,PackChatState,PackSubmission,Phase,Seat} from '../shared/types';
function setup(count=7){const game=new Game(undefined,cards=>[...cards]),room=newRoom('ABC234','classic',newPlayer('Host'),0);for(let i=1;i<count;i++)game.join(room,'Peer '+i,0);room.players.forEach(p=>game.ready(room,p.id,true,0));room.discussionMode='open';game.start(room,room.hostId,0);while((room.phase as Phase)!=='wolves')game.tick(room,room.deadline!);return{game,room}}
function input(game:Game,room:Room,id=room.hostId,text='private canary'):{stageId:string;clientMessageId:string;text:string}{return{stageId:game.packState(room,id,0)!.stageId,clientMessageId:randomUUID(),text}}
const en=(a:string,_b:string)=>a,zh=(_a:string,b:string)=>b;
describe('current-stage Pack Chat rules and privacy',()=>{
 it('shares only with living pack members, separately from all public history and metadata',()=>{
  const{game,room}=setup();const other=room.players[2],before=game.view(room,other.id,1),revision=room.revision,deadline=room.deadline;
  game.packMessage(room,room.hostId,input(game,room),1);expect(game.packState(room,room.players[1].id,1)?.messages).toHaveLength(1);
  expect(game.view(room,other.id,1)).toEqual(before);expect(room.chat).toEqual([]);expect(room.revision).toBe(revision);expect(room.deadline).toBe(deadline);
  for(const p of room.players.slice(2))expect(game.view(room,p.id,1).packChat).toBeUndefined();
 });
 it.each(['lobby','reveal','nightfall','seer','witch','dawn','discussion','voting','verdict','ended'] as Phase[])('rejects sends, reads and duplicate retries during %s',phase=>{
  const{game,room}=setup(),message=input(game,room);game.packMessage(room,room.hostId,message,1);room.phase=phase;
  expect(game.packState(room,room.hostId,1)).toBeUndefined();expect(()=>game.packMessage(room,room.hostId,message,1)).toThrow(GameError);
 });
 it('rejects dead wolves, one-wolf packs, non-wolves, unbound identities and the deadline itself',()=>{
  const{game,room}=setup(),message=input(game,room);
  for(const id of [room.players[2].id,room.players[5].id,room.players[6].id,'forged'])expect(()=>game.packMessage(room,id,message,1)).toThrow(GameError);
  room.players[1].alive=false;expect(()=>game.packMessage(room,room.players[1].id,message,1)).toThrow(GameError);expect(game.packState(room,room.players[1].id,1)).toBeUndefined();expect(game.packState(room,room.hostId,1)).toBeUndefined();
  room.players[1].alive=true;expect(()=>game.packMessage(room,room.hostId,message,room.deadline!)).toThrow(GameError);expect(game.packState(room,room.hostId,room.deadline!)).toBeUndefined();
 });
 it('deduplicates per sender, rejects nonce-content conflicts, and bounds both history and receipts',()=>{
  const{game,room}=setup(),message=input(game,room),first=game.packMessage(room,room.hostId,message,1);
  expect(game.packMessage(room,room.hostId,message,1)).toEqual({...first,duplicate:true});expect(()=>game.packMessage(room,room.hostId,{...message,text:'changed'},1)).toThrow(GameError);
  game.packMessage(room,room.players[1].id,message,1);expect(game.packState(room,room.hostId,1)?.messages).toHaveLength(2);
  for(let i=0;i<58;i++)game.packMessage(room,room.hostId,input(game,room,room.hostId,'message '+i),1);
  expect(game.packState(room,room.hostId,1)?.messages).toHaveLength(30);expect(()=>game.packMessage(room,room.hostId,input(game,room),1)).toThrow(new GameError('rate_limit'));
  expect(game.packMessage(room,room.hostId,message,1)).toEqual({...first,duplicate:true});
 });
 it('clears history at phase exit, next night and rematch, and rejects stale stage IDs',()=>{
  const{game,room}=setup(),old=input(game,room);game.packMessage(room,room.hostId,old,1);game.tick(room,room.deadline!);expect(game.view(room,room.hostId,0).packChat).toBeUndefined();
  while(room.phase!=='voting')game.tick(room,room.deadline!);for(const p of room.players)game.vote(room,p.id,'skip',room.deadline!-1);while((room.phase as Phase)!=='wolves')game.tick(room,room.deadline!);
  expect(game.packState(room,room.hostId,0)?.messages).toEqual([]);expect(()=>game.packMessage(room,room.hostId,old,0)).toThrow(new GameError('wrong_phase'));
  room.phase='ended';game.rematch(room,room.hostId,0);room.players.forEach(p=>game.ready(room,p.id,true,0));room.discussionMode='open';game.start(room,room.hostId,0);while((room.phase as Phase)!=='wolves')game.tick(room,room.deadline!);
  expect(game.packState(room,room.hostId,0)?.messages).toEqual([]);expect(()=>game.packMessage(room,room.hostId,old,0)).toThrow(GameError);
 });
 it('renders presets per recipient language, escapes free text, and never renders for other roles/phases',()=>{
  const{game,room}=setup(),draft=input(game,room);game.packMessage(room,room.hostId,{stageId:draft.stageId,clientMessageId:randomUUID(),phraseId:'hello'},1);game.packMessage(room,room.hostId,{...draft,text:'<img src=x onerror=alert(1)>'},1);
  const view=game.view(room,room.hostId,1),props={view,connected:true,language:'en' as const,tr:en,send:async()=>null};
  expect(render(<PackChat {...props}/>)).toContain('Hi everyone!');expect(render(<PackChat {...props} language="zh" tr={zh}/>)).toContain('大家好！');expect(render(<PackChat {...props}/>)).toContain('&lt;img');expect(render(<PackChat {...props}/>)).not.toContain('<img src=x');
  expect(render(<PackChat {...props} view={{...view,role:'villager'}}/>)).toBe('');expect(render(<PackChat {...props} view={{...view,phase:'seer'}}/>)).toBe('');
 });
});
let server:ReturnType<typeof createApp>|undefined;const sockets:Socket[]=[];
afterEach(async()=>{sockets.forEach(s=>s.disconnect());sockets.length=0;await server?.close();server=undefined});
const send=(s:Socket,e:string,d:unknown)=>new Promise<any>((r,j)=>s.timeout(1500).emit(e,d,(error:any,reply:any)=>error?j(error):r(reply)));
async function connected(url:string){const s=io(url,{forceNew:true,transports:['websocket']});sockets.push(s);await new Promise<void>((r,j)=>{s.once('connect',r);s.once('connect_error',j)});return s}
async function network(count=8,deadWolf=false){
 const game=new Game({reveal:100,nightfall:100,wolves:20000,seer:10000,witch:100,dawn:100,discussion:100,voting:1000,verdict:100},cards=>[...cards]);server=createApp(game);await new Promise<void>(r=>server!.http.listen(0,'127.0.0.1',r));const address=server.http.address() as any,url='http://127.0.0.1:'+address.port;
 const peers=await Promise.all(Array.from({length:count},()=>connected(url))),views:GameView[]=[],packets:string[][]=peers.map(()=>[]),packs:PackChatState[][]=peers.map(()=>[]),seats:Seat[]=[];
 peers.forEach((s,i)=>{s.on('state',v=>views[i]=v);s.on('pack_state',v=>packs[i].push(v));s.io.engine.on('packet',packet=>{if(packet.type==='message')packets[i].push(String(packet.data))})});
 seats[0]=(await send(peers[0],'create',{name:'Host',mode:'classic',discussionMode:'open'})).data;
 for(let i=1;i<count;i++)seats[i]=(await send(peers[i],'join',{code:seats[0].code,name:'Peer '+i})).data;
 for(const s of peers)await send(s,'ready',{ready:true});await send(peers[0],'start',{});const room=server.rooms.get(seats[0].code)!;
 if(deadWolf){room.players[2].role='werewolf';room.players[2].alive=false} // extra dead-pack fixture, not a production distribution
 await expect.poll(()=>views.every(v=>v.phase==='wolves')).toBe(true);
 return{game,room,url,peers,views,packets,packs,seats};
}
describe('Pack Chat independent sockets and packet gate',()=>{
 it('sends no content, metadata or extra packets to non-wolves or a dead wolf; private reconnect and phase closure are enforced',async()=>{
  const n=await network(8,true),{peers,views,packets,packs,seats,room}=n,stageId=views[0].packChat!.stageId;
  const before=packets.map(p=>p.length),payload={stageId,clientMessageId:randomUUID(),text:'PACK_CANARY_731_<script>'};
  const first=await send(peers[0],'pack_chat',payload);expect(first.ok).toBe(true);await expect.poll(()=>packs[1].length).toBe(1);
  for(let i=2;i<peers.length;i++){expect(packets[i]).toHaveLength(before[i]);expect(packs[i]).toEqual([]);expect(views[i].packChat).toBeUndefined();expect(packets[i].join('')).not.toContain('PACK_CANARY_731')}
  expect(room.chat).toEqual([]);expect(room.attacks).toEqual({});const deadline=room.deadline;
  expect(await send(peers[0],'pack_chat',payload)).toEqual({ok:true,data:{...first.data,duplicate:true}});expect(packs[1]).toHaveLength(1);expect(room.deadline).toBe(deadline);
  const newer=await connected(n.url);let restored:GameView|undefined;newer.on('state',v=>restored=v);expect((await send(newer,'resume',seats[1])).ok).toBe(true);await expect.poll(()=>restored?.packChat?.messages.length).toBe(1);expect(restored?.packChat?.messages[0].text).toBe(payload.text);
  room.deadline=Date.now()-1;expect((await send(newer,'pack_chat',{...payload,clientMessageId:randomUUID()})).ok).toBe(false);await expect.poll(()=>restored?.phase).toBe('seer');expect(restored?.packChat).toBeUndefined();expect((await send(newer,'pack_chat',payload)).ok).toBe(false);
  expect(peers.slice(2).every((_,i)=>!packets[i+2].join('').includes('PACK_CANARY_731'))).toBe(true);
 });
 it('rejects forged identities, non-wolves, dead wolves, malformed messages and unauthorized reconnects',async()=>{
  const n=await network(),payload={stageId:n.views[0].packChat!.stageId,clientMessageId:randomUUID(),text:'secret'};
  for(let i=2;i<n.peers.length;i++)expect((await send(n.peers[i],'pack_chat',payload))).toEqual({ok:false,error:'unauthorized'});
  for(const extra of [{playerId:n.views[0].youId},{role:'werewolf'},{code:n.seats[0].code},{phraseId:'hello'}])expect((await send(n.peers[0],'pack_chat',{...payload,...extra}))).toEqual({ok:false,error:'invalid'});
  expect(await send(n.peers[0],'pack_chat',{...payload,text:' '.repeat(5)})).toEqual({ok:false,error:'invalid'});expect(await send(n.peers[0],'pack_chat',{...payload,text:'x'.repeat(301)})).toEqual({ok:false,error:'invalid'});
  const outsider=await connected(n.url);expect((await send(outsider,'pack_chat',payload)).ok).toBe(false);expect(await send(outsider,'resume',{...n.seats[0],token:'0'.repeat(64)})).toEqual({ok:false,error:'unauthorized'});
  n.room.players[1].alive=false;expect(await send(n.peers[1],'pack_chat',payload)).toEqual({ok:false,error:'unauthorized'});expect(n.game.view(n.room,n.room.players[1].id,Date.now()).packChat).toBeUndefined();
 });
 it('deduplicates concurrent retries and denies old-stage packets after a rematch or dead-seat reconnect',async()=>{
  const n=await network(7),stageId=n.views[0].packChat!.stageId,payload={stageId,clientMessageId:randomUUID(),text:'once only'};
  const replies=await Promise.all(Array.from({length:3},()=>send(n.peers[0],'pack_chat',payload)));
  expect(replies.every(r=>r.ok)).toBe(true);expect(replies.filter(r=>!r.data.duplicate)).toHaveLength(1);expect(new Set(replies.map(r=>r.data.messageId)).size).toBe(1);await expect.poll(()=>n.packs[1].length).toBe(1);
  n.room.players[1].alive=false;const dead=await connected(n.url);let deadView:GameView|undefined;dead.on('state',v=>deadView=v);expect((await send(dead,'resume',n.seats[1])).ok).toBe(true);expect(deadView?.packChat).toBeUndefined();expect((await send(dead,'pack_chat',payload)).ok).toBe(false);
  n.room.phase='ended';n.room.deadline=null;expect((await send(n.peers[0],'rematch',{})).ok).toBe(true);
  for(let i=0;i<n.peers.length;i++)expect((await send(i===1?dead:n.peers[i],'ready',{ready:true})).ok).toBe(true);expect((await send(n.peers[0],'start',{})).ok).toBe(true);
  await expect.poll(()=>n.views[0].phase).toBe('wolves');expect(n.views[0].packChat?.messages).toEqual([]);expect(n.views[0].packChat?.stageId).not.toBe(stageId);expect(await send(n.peers[0],'pack_chat',payload)).toEqual({ok:false,error:'wrong_phase'});
 });
 it('rate limits privately, supports validated presets and preserves public-chat permissions',async()=>{
  const n=await network(7),stageId=n.views[0].packChat!.stageId;
  for(let i=0;i<5;i++)expect((await send(n.peers[0],'pack_chat',{stageId,clientMessageId:randomUUID(),phraseId:'hello'})).ok).toBe(true);
  expect(await send(n.peers[0],'pack_chat',{stageId,clientMessageId:randomUUID(),text:'sixth'})).toEqual({ok:false,error:'rate_limit'});
  expect(n.game.packState(n.room,n.seats[0].playerId,Date.now())?.messages.every(m=>m.phraseId==='hello'&&m.text==='Hi everyone!')).toBe(true);
  expect(await send(n.peers[0],'chat',{text:'public night leak'})).toEqual({ok:false,error:'wrong_phase'});expect(await send(n.peers[0],'quick_chat',{phraseId:'hello'})).toEqual({ok:false,error:'wrong_phase'});expect(n.room.chat).toEqual([]);
  expect(await send(n.peers[1],'pack_chat',{stageId,clientMessageId:randomUUID(),phraseId:'__proto__'})).toEqual({ok:false,error:'invalid'});
 });
});
