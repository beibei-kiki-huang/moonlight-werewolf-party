import {describe,it,expect} from 'vitest';
import {io, type Socket} from 'socket.io-client';
import {createApp} from '../server/index';
import {Game} from '../server/game';
import type{GameView,Reply,Seat}from'../shared/types';
const send=<T=undefined>(s:Socket,event:string,data:unknown)=>new Promise<Reply<T>>((resolve,reject)=>s.timeout(2000).emit(event,data,(err:Error|null,r:Reply<T>)=>err?reject(err):resolve(r)));
describe('Witch private transport recovery',()=>{
 it('does not broadcast potion actions and restores consumed, locked inventory on refresh',async()=>{
  const server=createApp(new Game({reveal:40,nightfall:40,wolves:80,seer:80,witch:1500},cards=>[...cards]));
  await new Promise<void>(resolve=>server.http.listen(0,'127.0.0.1',resolve));const addr=server.http.address() as {port:number};const url=`http://127.0.0.1:${addr.port}`;
  const peers:{s:Socket;view?:GameView;packets:number}[]=[];const seats:Seat[]=[];
  const peer=async()=>{const p={s:io(url,{forceNew:true,transports:['websocket']}),packets:0} as typeof peers[number];peers.push(p);p.s.on('state',(v:GameView)=>{p.view=v;p.packets++});await new Promise<void>((resolve,reject)=>{p.s.once('connect',resolve);p.s.once('connect_error',reject)});return p};
  try{
   const host=await peer();const create=await send<Seat>(host.s,'create',{name:'Wolf',mode:'classic'});if(!create.ok)throw Error(create.error);seats.push(create.data);
   for(const name of ['V1','V2','V3','Seer','Witch']){const p=await peer();const join=await send<Seat>(p.s,'join',{code:create.data.code,name});if(!join.ok)throw Error(join.error);seats.push(join.data)}
   for(const p of peers)await send(p.s,'ready',{ready:true});await send(host.s,'start',{});await expect.poll(()=>peers[5].view?.phase).toBe('witch');
   const before=peers.slice(0,5).map(p=>p.packets);expect((await send(peers[5].s,'action',{kind:'poison',target:seats[1].playerId})).ok).toBe(true);
   await new Promise(resolve=>setTimeout(resolve,20));expect(peers.slice(0,5).map(p=>p.packets)).toEqual(before);
   peers[5].s.disconnect();const replacement=await peer();expect((await send(replacement.s,'resume',seats[5])).ok).toBe(true);
   expect(replacement.view?.role).toBe('witch');expect(replacement.view?.potions).toEqual({heal:true,poison:false});expect(replacement.view?.acted).toBe(true);
   for(const p of peers.slice(0,5)){expect(p.view?.potions).toBeUndefined();expect(p.view?.victim).toBeUndefined()}
   expect(await send(replacement.s,'action',{kind:'heal'})).toEqual({ok:false,error:'already_acted'});
  }finally{peers.forEach(p=>p.s.disconnect());await server.close()}
 },10000);
});
