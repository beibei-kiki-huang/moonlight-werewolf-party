import assert from 'node:assert/strict';
import {io} from 'socket.io-client';
const url=(process.argv[2]??'').replace(/\/+$/,'');if(!url||!/^https?:\/\//.test(url))throw Error('Provide a game URL');
const counts=process.argv.slice(3).map(Number);if(!counts.length)counts.push(5,6,8);
const sockets=[];
const delay=ms=>new Promise(r=>setTimeout(r,ms));
function send(s,event,data,denied=false){return new Promise((r,j)=>s.timeout(15000).emit(event,data,(e,a)=>{if(e)return j(e);if(denied){assert.equal(a.ok,false);return r(a)}if(!a.ok)return j(Error(event+': '+a.error));r(a.data)}))}
async function peer(){const socket=io(url,{forceNew:true,transports:['websocket']});sockets.push(socket);const p={socket,view:null};socket.on('state',v=>p.view=v);await new Promise((r,j)=>{socket.once('connect',r);socket.once('connect_error',j)});return p}
async function wait(peers,predicate,label,ms=180000){const end=Date.now()+ms;while(!peers.every(p=>p.view&&predicate(p.view))){if(Date.now()>end)throw Error('Timeout '+label);await delay(80)}}
async function table(count){
 const peers=await Promise.all(Array.from({length:count},peer)),seats=[];
 seats.push(await send(peers[0].socket,'create',{name:`QA-Turn-${count}-1`,mode:'classic'}));
 for(let i=1;i<count;i++)seats.push(await send(peers[i].socket,'join',{code:seats[0].code,name:`QA-Turn-${count}-${i+1}`}));
 await wait(peers,v=>v.players.length===count,'lobby');
 assert(peers.every(p=>p.view.discussionMode==='structured'&&p.view.turnSeconds===45));
 await send(peers[1].socket,'discussion_settings',{discussionMode:'open',turnSeconds:30},true);
 await send(peers[0].socket,'discussion_settings',{discussionMode:'structured',turnSeconds:30});
 for(const p of peers)await send(p.socket,'ready',{ready:true});
 await send(peers[0].socket,'start',{});await wait(peers,v=>v.phase==='reveal','start');
 assert(peers.every(p=>p.view.players.every(x=>!x.role)));
 const wolves=peers.filter(p=>p.view.role==='werewolf'),witch=peers.find(p=>p.view.role==='witch'),seer=peers.find(p=>p.view.role==='seer');
 await wait(peers,v=>v.phase==='wolves','wolves');assert(peers.every(p=>p.view.deadline-p.view.serverNow>59000&&p.view.deadline-p.view.serverNow<=60000),'Every role slot must retain its full 60-second clock');
 const nightDeadline=peers[0].view.deadline;assert(peers.every(p=>p.view.deadline===nightDeadline));
 // No attacks submitted: the server must choose an eligible random target at the fixed deadline.
 await wait(peers,v=>v.phase==='seer','seer');assert(peers.every(p=>p.view.deadline-p.view.serverNow>59000&&p.view.deadline-p.view.serverNow<=60000),'Every role slot must retain its full 60-second clock');
 await send(seer.socket,'action',{kind:'inspect',target:wolves[0].view.youId});
 assert.equal(seer.view.investigations.at(-1).isWolf,true);
 assert(peers.filter(p=>p!==seer).every(p=>p.view.investigations===undefined));
 await wait(peers,v=>v.phase==='witch','witch');assert(peers.every(p=>p.view.deadline-p.view.serverNow>59000&&p.view.deadline-p.view.serverNow<=60000),'Every role slot must retain its full 60-second clock');
 const victim=witch.view.victim;assert(victim&&witch.view.players.find(p=>p.id===victim)?.alive);assert(!wolves.some(p=>p.view.youId===victim));
 assert(peers.filter(p=>p!==witch).every(p=>p.view.victim===undefined&&p.view.potions===undefined));
 await send(witch.socket,'action',wolves.length===1?{kind:'heal'}:{kind:'poison',target:wolves[0].view.youId});
 await wait(peers,v=>v.phase==='dawn','dawn');
 const deaths=peers[0].view.events.findLast(e=>e.kind==='dawn').players.map(p=>p.name);
 assert.equal(deaths.length,wolves.length===1?0:2);
 for(const p of peers){const e=p.view.events.findLast(e=>e.kind==='dawn');assert.deepEqual(e.players.map(x=>x.name),deaths);assert(!JSON.stringify(e).match(/heal|poison|victim|potion/))}
 await wait(peers,v=>v.phase==='discussion','discussion');
 let turnCount=0,refreshed=false;
 while(peers[0].view.phase==='discussion'){
  const v=peers[0].view,token=v.turnId,current=peers.find(p=>p.view.youId===v.speakerId),outsider=peers.find(p=>p!==current);
  assert(current);assert(current.view.players.find(x=>x.id===current.view.youId).alive);
  assert(peers.every(p=>p.view.turnId===token&&p.view.deadline===v.deadline));
  if(turnCount===0){
   assert.equal((await send(outsider.socket,'chat',{text:'Out of turn must fail',turnId:token},true)).error,'unauthorized');
   assert.equal((await send(outsider.socket,'quick_chat',{phraseId:'hello',turnId:token},true)).error,'unauthorized');
  }
  if(!refreshed){
   const index=peers.indexOf(current),deadline=v.deadline,color=current.view.players.find(x=>x.id===current.view.youId).colorIndex;
   current.socket.disconnect();await delay(100);const replacement=await peer();await send(replacement.socket,'resume',{...seats[index],takeover:false});peers[index]=replacement;
   assert.equal(replacement.view.turnId,token);assert.equal(replacement.view.deadline,deadline);assert.equal(replacement.view.players.find(x=>x.id===replacement.view.youId).colorIndex,color);refreshed=true;
  }
  const speaker=peers.find(p=>p.view.youId===v.speakerId);
  await send(speaker.socket,'quick_chat',{phraseId:'hear_everyone',turnId:token});
  await send(speaker.socket,'chat',{text:'我的发言 — My turn.',turnId:token});
  await send(speaker.socket,'finish_speaking',{turnId:token});
  await send(speaker.socket,'chat',{text:'Stale turn must fail',turnId:token},true);
  turnCount++;
 }
 await wait(peers,v=>v.phase==='voting','vote',5000);
 assert.equal(turnCount,peers[0].view.players.filter(x=>x.alive).length);
 const remainingWolf=peers.find(p=>p.view.role==='werewolf'&&p.view.players.find(x=>x.id===p.view.youId).alive),living=peers.filter(p=>p.view.players.find(x=>x.id===p.view.youId).alive),deadline=peers[0].view.deadline;
 for(const p of living)await send(p.socket,'vote',{target:p===remainingWolf?'skip':remainingWolf.view.youId});
 await wait(peers,v=>v.phase==='last_words','last words',5000);assert(Date.now()<deadline);
 assert(peers.every(p=>p.view.lastWordsPlayerId===remainingWolf.view.youId));
 const lastWordsDeadline=remainingWolf.view.deadline;assert(lastWordsDeadline-Date.now()>28000);
 await delay(11000); // Existing spam limits remain intact; do not confuse them with turn authorization.
 await send(remainingWolf.socket,'chat',{text:'Final words / 公开遗言',turnId:remainingWolf.view.turnId});
 for(const p of peers.filter(p=>p!==remainingWolf))await send(p.socket,'chat',{text:'No interruption',turnId:p.view.turnId},true);
 // Verify automatic 30-second expiry rather than using Finish early.
 await wait(peers,v=>v.phase==='ended','automatic last words expiry',40000);
 assert(peers.every(p=>p.view.winner==='village'&&p.view.events.filter(e=>e.kind==='result').length===1));
 console.log(`PASS structured ${count}: real start, fixed night/fallback attack, private Seer/Witch, dawn, ${turnCount} turns, stale/out-of-turn denial, reconnect/colors, early ballots, 30-second last words and shared victory.`);
}
const beat=setInterval(()=>console.log('Structured public checks follow normal authoritative timers…'),30000);
try{await Promise.all(counts.map(table));console.log('ALL STRUCTURED PUBLIC CHECKS PASSED.')}finally{clearInterval(beat);sockets.forEach(s=>s.disconnect())}
