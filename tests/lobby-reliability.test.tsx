import {afterEach,describe,it,expect} from 'vitest';
import {renderToStaticMarkup as render} from 'react-dom/server';
import {io,type Socket} from 'socket.io-client';
import {createApp} from '../server/index';import {Game} from '../server/game';
import {lobbyBlockers,LobbyReadiness} from '../client/LobbyReadiness';
import {storeSeat,readSeatFrom,type SeatStorage} from '../client/seatStorage';
import type {GameView,Seat} from '../shared/types';
const en=(a:string,_b:string)=>a,zh=(_a:string,b:string)=>b;
class Memory implements SeatStorage{data=new Map<string,string>();getItem(k:string){return this.data.get(k)??null}setItem(k:string,v:string){this.data.set(k,v)}removeItem(k:string){this.data.delete(k)}}
const sockets:Socket[]=[];let server:ReturnType<typeof createApp>|undefined;
afterEach(async()=>{sockets.forEach(s=>s.disconnect());sockets.length=0;await server?.close();server=undefined});
const send=(s:Socket,e:string,d:unknown)=>new Promise<any>((r,j)=>s.timeout(2000).emit(e,d,(err:any,v:any)=>err?j(err):r(v)));
async function peer(url:string){const s=io(url,{transports:['websocket'],forceNew:true});sockets.push(s);await new Promise<void>(r=>s.once('connect',r));return s}
async function running(){const game=new Game({reveal:50,nightfall:50,wolves:200,seer:200,witch:200,dawn:50,discussion:50,voting:200,verdict:50},cards=>[...cards]);server=createApp(game);await new Promise<void>(r=>server!.http.listen(0,'127.0.0.1',r));const address=server.http.address() as any;return{url:'http://127.0.0.1:'+address.port,game}}
describe('Classic lobby reliability',()=>{
 it('keeps same-origin tab seats independent while retaining a manual saved-seat fallback',()=>{const shared=new Memory(),a=new Memory(),b=new Memory();const first={code:'ABC234',playerId:'first',token:'one'},second={code:'ABC234',playerId:'second',token:'two'};storeSeat(first,a,shared);expect(readSeatFrom(b)).toBeNull();storeSeat(second,b,shared);expect(readSeatFrom(a)).toEqual(first);expect(readSeatFrom(b)).toEqual(second);expect(readSeatFrom(shared)).toEqual(second)});
 it('names the exact lobby blockers and renders bilingual readiness',()=>{const view={mode:'classic',hostId:'host',youId:'host',players:[{id:'host',name:'Host',connected:true,ready:false},{id:'off',name:'Offline Guest',connected:false,ready:true}]} as GameView;const reasons=lobbyBlockers(view,true,false,en).join(' ');expect(reasons).toContain('2 joined');expect(reasons).toContain('Offline Guest');expect(reasons).toContain('Still needs Ready: Host');expect(render(<LobbyReadiness view={view} connected pending={false} tr={zh}/>)).toContain('尚未点击准备');expect(lobbyBlockers({...view,youId:'off'},false,true,en).join(' ')).toContain('Only the host')});
 it('refuses silent tab takeovers, allows an explicit takeover, and restores a disconnected seat',async()=>{const{url}=await running(),a=await peer(url),b=await peer(url);const made=await send(a,'create',{name:'Host',mode:'classic'});let replaced=false;a.on('replaced',()=>replaced=true);expect(await send(b,'resume',{...made.data,takeover:false})).toEqual({ok:false,error:'seat_in_use'});expect(a.connected).toBe(true);expect(replaced).toBe(false);expect((await send(b,'resume',{...made.data,takeover:true})).ok).toBe(true);await expect.poll(()=>replaced).toBe(true);b.disconnect();const c=await peer(url);expect((await send(c,'resume',{...made.data,takeover:false})).ok).toBe(true)});
 it.each([5,6,7,8])('starts and completes Classic with %i independent clients and denies stale/unready/nonhost starts',async count=>{
  const{url,game}=await running(),peers=await Promise.all(Array.from({length:count},()=>peer(url))),views:GameView[]=[],seats:Seat[]=[];peers.forEach((s,i)=>s.on('state',v=>views[i]=v));seats[0]=(await send(peers[0],'create',{name:'Host',mode:'classic'})).data;
  for(let i=1;i<count;i++)seats[i]=(await send(peers[i],'join',{code:seats[0].code,name:'Guest '+i})).data;
  expect(await send(peers[1],'start',{})).toEqual({ok:false,error:'not_host'});expect(await send(peers[0],'start',{})).toEqual({ok:false,error:'not_ready'});
  for(const s of peers)await send(s,'ready',{ready:true});await send(peers[0],'mode',{mode:'classic'});expect(views[0].players.every(p=>p.ready)).toBe(true);
  const old=peers.at(-1)!;old.disconnect();await expect.poll(()=>views[0].players.at(-1)?.connected).toBe(false);expect((await send(peers[0],'start',{})).ok).toBe(false);
  const recovered=await peer(url);recovered.on('state',v=>views[count-1]=v);await send(recovered,'resume',{...seats.at(-1),takeover:false});peers[count-1]=recovered;
  expect((await send(peers[0],'start',{})).ok).toBe(true);await expect.poll(()=>views.every(v=>v.phase==='witch')).toBe(true);
  const witchIndex=views.findIndex(v=>v.role==='witch'),wolfIds=views.filter(v=>v.role==='werewolf').map(v=>v.youId);await send(peers[witchIndex],'action',{kind:'poison',target:wolfIds[0]});
  if(wolfIds.length===2){await expect.poll(()=>views[0]?.phase).toBe('voting');for(let i=0;i<count;i++){const me=views[i].players.find(p=>p.id===views[i].youId)!;if(me.alive)await send(peers[i],'vote',{target:me.id===wolfIds[1]?'skip':wolfIds[1]})}}
  await expect.poll(()=>views.every(v=>v.phase==='ended'&&v.winner==='village')).toBe(true);expect(game).toBeDefined();
 });
});
