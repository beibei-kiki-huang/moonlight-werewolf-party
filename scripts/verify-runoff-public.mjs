import assert from 'node:assert/strict';
import {io} from 'socket.io-client';
const url=(process.argv[2]??'').replace(/\/+$/,'');if(!url||!/^https?:\/\//.test(url))throw Error('Provide a game URL');
const counts=process.argv.slice(3).map(Number);if(!counts.length)counts.push(5,8);
const sockets=[];
const delay=ms=>new Promise(r=>setTimeout(r,ms));
function send(s,event,data,denied=false){return new Promise((r,j)=>s.timeout(15000).emit(event,data,(e,a)=>{if(e)return j(e);if(denied){assert.equal(a.ok,false);return r(a)}if(!a.ok)return j(Error(event+': '+a.error));r(a.data)}))}
async function peer(){const socket=io(url,{forceNew:true,transports:['websocket']});sockets.push(socket);const p={socket,view:null,packetCount:0};socket.on('state',v=>p.view=v);await new Promise((r,j)=>{socket.once('connect',r);socket.once('connect_error',j)});socket.io.engine.on('packet',packet=>{if(packet.type==='message')p.packetCount++});return p}
async function wait(peers,predicate,label,ms=180000){const end=Date.now()+ms;while(!peers.every(p=>p.view&&predicate(p.view))){if(Date.now()>end)throw Error('Timeout '+label);await delay(80)}}
async function table(count){
 const peers=await Promise.all(Array.from({length:count},peer)),seats=[];
 seats.push(await send(peers[0].socket,'create',{name:`QA-Turn-${count}-1`,mode:'classic'}));
 for(let i=1;i<count;i++)seats.push(await send(peers[i].socket,'join',{code:seats[0].code,name:`QA-Turn-${count}-${i+1}`}));
 await wait(peers,v=>v.players.length===count,'lobby');
 assert(peers.every(p=>p.view.discussionMode==='structured'&&p.view.turnSeconds===45));
 await send(peers[1].socket,'discussion_settings',{discussionMode:'open',turnSeconds:30},true);
 await send(peers[0].socket,'discussion_settings',{discussionMode:count===5?'open':'structured',turnSeconds:30});
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
 if(count===5){await wait(peers,v=>v.phase==='voting','Open discussion deadline',130000)}
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
 if(count!==5)assert.equal(turnCount,peers[0].view.players.filter(x=>x.alive).length);
 const remainingWolf=peers.find(p=>p.view.role==='werewolf'&&p.view.players.find(x=>x.id===p.view.youId).alive),living=peers.filter(p=>p.view.players.find(x=>x.id===p.view.youId).alive),good=living.find(p=>p!==remainingWolf),deadline=peers[0].view.deadline;
 for(const p of living)await send(p.socket,'vote',{target:p===remainingWolf?good.view.youId:p===good?remainingWolf.view.youId:'skip'});
 await wait(peers,v=>v.phase==='tie_discussion','tie discussion',5000);assert(Date.now()<deadline);
 const candidates=peers[0].view.tiedCandidates;assert.deepEqual(candidates,peers[0].view.players.filter(p=>[remainingWolf.view.youId,good.view.youId].includes(p.id)).map(p=>p.id));
 const first=peers.find(p=>p.view.youId===peers[0].view.speakerId),firstDeadline=first.view.deadline;
 assert(firstDeadline-first.view.serverNow>59000&&firstDeadline-first.view.serverNow<=60000);
 await send(living.find(p=>p!==first).socket,'chat',{text:'Must not interrupt',turnId:first.view.turnId},true);
 await send(first.socket,'finish_speaking',{turnId:first.view.turnId});
 await wait(peers,v=>v.phase==='tie_discussion'&&v.speakerId!==first.view.youId,'second candidate',5000);
 const secondDeadline=peers[0].view.deadline;assert(secondDeadline-peers[0].view.serverNow>59000&&secondDeadline-peers[0].view.serverNow<=60000);
 // Exercise the full server timeout of the other candidate's 60-second turn.
 await wait(peers,v=>v.phase==='runoff','automatic runoff',70000);
 const voters=living.filter(p=>!candidates.includes(p.view.youId));assert(voters.length>1);assert(peers.every(p=>!p.view.ballots));
 await send(remainingWolf.socket,'vote',{target:'skip'},true);
 const before=remainingWolf.packetCount,runoffDeadline=peers[0].view.deadline;
 await send(voters[0].socket,'vote',{target:remainingWolf.view.youId});await delay(100);assert.equal(remainingWolf.packetCount,before,'no private confirmation packets may reach a candidate');
 // One positive vote must defeat all remaining abstentions.
 for(const p of voters.slice(1))await send(p.socket,'vote',{target:'skip'});
 await wait(peers,v=>v.phase==='last_words','last words',5000);assert(Date.now()<runoffDeadline);
 assert(peers.every(p=>p.view.lastWordsPlayerId===remainingWolf.view.youId&&p.view.voteHistory.at(-1).round==='runoff'));
 const lastWordsDeadline=remainingWolf.view.deadline;assert(lastWordsDeadline-Date.now()>28000);
 await send(remainingWolf.socket,'chat',{text:'Runoff last words / 加赛遗言',turnId:remainingWolf.view.turnId});
 for(const p of peers.filter(p=>p!==remainingWolf))await send(p.socket,'chat',{text:'No interruption',turnId:p.view.turnId},true);
 await wait(peers,v=>v.phase==='ended','automatic last words expiry',40000);
 assert(peers.every(p=>p.view.winner==='village'&&p.view.events.filter(e=>e.kind==='result').length===1));
 console.log(`PASS runoff ${count}: fixed 60-second night, private actions, initial tied leaders, candidate-only turns, full 60-second timeout, noncandidate ballots, zero outsider receipt packets, one positive runoff vote against abstentions, last words and identical victory.`);

}
const beat=setInterval(()=>console.log('Structured public checks follow normal authoritative timers…'),30000);
try{await Promise.all(counts.map(table));console.log('ALL PUBLIC RUNOFF CHECKS PASSED.')}finally{clearInterval(beat);sockets.forEach(s=>s.disconnect())}
