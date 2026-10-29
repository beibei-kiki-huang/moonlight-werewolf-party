import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {io} from 'socket.io-client';
// Explicit real-network QA using ordinary player credentials and unchanged production clocks.
const url=(process.argv[2]??'').replace(/\/+$/,'');if(!url||!/^https?:\/\//.test(url))throw Error('Pass the public game URL.');
const peers=[],sockets=[];const delay=ms=>new Promise(r=>setTimeout(r,ms));
const send=(p,event,data)=>new Promise((resolve,reject)=>p.socket.timeout(10000).emit(event,data,(e,r)=>e?reject(e):resolve(r)));
const ok=async(p,e,d)=>{const r=await send(p,e,d);assert(r.ok,`${e}: ${r.error}`);return r.data};
async function connect(p={}){p.socket=io(url,{forceNew:true,transports:['websocket']});sockets.push(p.socket);p.packets??=[];p.updates??=[];p.socket.on('state',v=>p.view=v);p.socket.on('pack_state',pack=>{p.updates.push(pack);if(p.view?.packChat?.stageId===pack.stageId)p.view.packChat=pack});await new Promise((r,j)=>{p.socket.once('connect',r);p.socket.once('connect_error',j)});p.socket.io.engine.on('packet',packet=>{if(packet.type==='message')p.packets.push(String(packet.data))});return p}
async function wait(phase){const until=Date.now()+300000;while(!peers.every(p=>p.view?.phase===phase)){if(Date.now()>until)throw Error('Timeout '+phase);await delay(50)}}
const heartbeat=setInterval(()=>console.log('Seven-player acceptance is following normal phase timers…'),30000);
try{
 for(let i=0;i<7;i++){const p=await connect();peers.push(p);p.seat=await ok(p,i?'join':'create',i?{code:peers[0].seat.code,name:'Pack-QA-'+(i+1)}:{name:'Pack-QA-1',mode:'classic',discussionMode:'open'});await ok(p,'ready',{ready:true})}
 await ok(peers[0],'start',{});await wait('reveal');const wolves=peers.filter(p=>p.view.role==='werewolf'),seer=peers.find(p=>p.view.role==='seer'),witch=peers.find(p=>p.view.role==='witch'),villagers=peers.filter(p=>p.view.role==='villager');assert.equal(wolves.length,2);
 await wait('wolves');await delay(100);const stageId=wolves[0].view.packChat.stageId,deadline=wolves[0].view.deadline,outsiders=peers.filter(p=>!wolves.includes(p)),counts=outsiders.map(p=>p.packets.length);
 const message={stageId,clientMessageId:randomUUID(),text:'Private pack acceptance canary.'};const first=await ok(wolves[0],'pack_chat',message);await ok(wolves[1],'pack_chat',{stageId,clientMessageId:randomUUID(),phraseId:'why'});const duplicate=await ok(wolves[0],'pack_chat',message);assert.equal(duplicate.messageId,first.messageId);assert(duplicate.duplicate);await delay(100);
 assert.deepEqual(outsiders.map(p=>p.packets.length),counts);assert(outsiders.every(p=>!p.view.packChat));assert(wolves.every(p=>p.view.packChat.messages.length===2&&p.view.deadline===deadline));assert(peers.every(p=>p.view.chat.length===0));
 console.log('PASS public pack privacy: only two living wolves received messages; outsiders received no additional packets; presets, duplicate suppression and unchanged deadlines verified.');
 await ok(wolves[0],'action',{kind:'attack',target:villagers[0].view.youId});await ok(wolves[1],'action',{kind:'attack',target:villagers[1].view.youId});
 wolves[1].socket.disconnect();await connect(wolves[1]);await ok(wolves[1],'resume',wolves[1].seat);assert.equal(wolves[1].view.packChat.messages.length,2);
 await wait('seer');assert(peers.every(p=>!p.view.packChat));assert.equal((await send(wolves[1],'pack_chat',message)).ok,false);await ok(seer,'action',{kind:'inspect',target:wolves[0].view.youId});assert.equal(seer.view.investigations.at(-1).isWolf,true);assert(peers.filter(p=>p!==seer).every(p=>!p.view.investigations));
 await wait('witch');const attackVictim=witch.view.victim;assert([villagers[0].view.youId,villagers[1].view.youId].includes(attackVictim));await ok(witch,'action',{kind:'poison',target:wolves[0].view.youId});
 await wait('discussion');const dawn=peers[0].view.events.find(e=>e.kind==='dawn');assert.deepEqual(dawn.players.map(p=>p.name).sort(),[wolves[0].view.youId,attackVictim].map(id=>witch.view.players.find(p=>p.id===id).name).sort());
 await ok(villagers.at(-1),'quick_chat',{phraseId:'hello'});await delay(100);assert(peers.every(p=>p.view.chat.length===1&&!JSON.stringify(p.view).includes(message.text)));
 console.log('PASS public pack closure: authorized refresh recovered current-night history; Seer/Witch/day states expose none; tied attacks selected one valid leading target; published dawn matches the attack and poison eliminations.');
 await wait('voting');const living=peers.filter(p=>p.view.players.find(x=>x.id===p.view.youId).alive),end=living[0].view.deadline;
 for(const p of living.slice(0,-1))await ok(p,'vote',{target:p===wolves[1]?'skip':wolves[1].view.youId});assert(peers.every(p=>!p.view.ballots));const last=living.at(-1);await ok(last,'vote',{target:last===wolves[1]?'skip':wolves[1].view.youId});await wait('last_words');assert(Date.now()<end);await ok(wolves[1],'finish_speaking',{turnId:wolves[1].view.turnId});await wait('ended');assert(peers.every(p=>p.view.winner==='village'&&!p.view.packChat));
 console.log('ALL SEVEN-PLAYER PACK ACCEPTANCE CHECKS PASSED: full Classic match completed with identical victory, private ballots and immediate final-confirmation resolution.');
}finally{clearInterval(heartbeat);sockets.forEach(s=>s.disconnect())}
