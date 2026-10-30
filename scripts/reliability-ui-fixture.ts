// Local UI-only fixture: deterministic fictional roles and shortened setup clocks.
// Never imported by the application or used in deployment.
import {createApp} from '../server/index';
import {Game} from '../server/game';
import {io} from 'socket.io-client';
const game=new Game({reveal:3000,nightfall:1000,wolves:1500,seer:1500,witch:120000,dawn:3000,discussion:120000,last_words:30000},cards=>['witch',...cards.filter(r=>r!=='witch')]);
const server=createApp(game);server.http.listen(3253,'0.0.0.0',()=>console.log('LOCAL FICTIONAL UI FIXTURE http://127.0.0.1:3253/'));
const joined=new Set<string>(),peers:any[]=[];
const emit=(s:any,e:string,d:any)=>new Promise<any>((r,j)=>s.timeout(3000).emit(e,d,(err:any,a:any)=>err?j(err):r(a)));
setInterval(async()=>{for(const room of server.rooms.values()){
 if(room.phase==='lobby'&&!joined.has(room.code)){joined.add(room.code);for(let i=1;i<5;i++){const s=io('http://127.0.0.1:3253',{transports:['websocket'],forceNew:true});const p:any={s};peers.push(p);s.on('state',(v:any)=>p.v=v);await new Promise<void>(r=>s.once('connect',r));await emit(s,'join',{code:room.code,name:['','Fictional Wolf','Fictional Alex','Fictional Lin','Fictional Seer'][i]});await emit(s,'ready',{ready:true})}console.log('Fictional peers ready in',room.code)}
 for(const p of peers){const v=p.v;if(v?.code!==room.code)continue;const key=v.phase+':'+v.day+':'+v.turnId;if(p.done===key)continue;
 if(v.phase==='wolves'&&v.role==='werewolf'){p.done=key;await emit(p.s,'action',{kind:'attack',target:v.players.find((x:any)=>x.name==='Fictional Alex').id})}
 if(v.phase==='seer'&&v.role==='seer'){p.done=key;await emit(p.s,'action',{kind:'inspect',target:v.players.find((x:any)=>x.name==='Fictional Wolf').id})}
 if(v.phase==='discussion'&&v.speakerId===v.youId){p.done=key;await emit(p.s,'finish_speaking',{turnId:v.turnId})}
 if(v.phase==='voting'&&v.players.find((x:any)=>x.id===v.youId).alive){p.done=key;await emit(p.s,'vote',{target:room.players[0].id})}
 }
}},300);
