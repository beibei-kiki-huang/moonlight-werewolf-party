import assert from 'node:assert/strict';
import { io } from 'socket.io-client';

// An explicit, real-network acceptance test. Never imported by the deployed app.
// Uses ordinary player credentials and normal production timers; no debug endpoints.
const url = process.argv[2];
if (!url || !/^https?:\/\//.test(url)) throw new Error('Usage: node scripts/verify-public.mjs https://YOUR_GAME_URL');
const sockets = [];
function emit(socket, event, data) {
  return new Promise((resolve, reject) => socket.timeout(15_000).emit(event, data, (error, reply) => {
    if (error) reject(error); else if (!reply.ok) reject(new Error(`${event}: ${reply.error}`)); else resolve(reply.data);
  }));
}
async function peer() {
  const socket = io(url, { forceNew: true, transports: ['websocket'] }); sockets.push(socket);
  const state = { socket, view: null };
  socket.on('state', view => { state.view = view; });
  await new Promise((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); });
  return state;
}
async function waitFor(peers, phase, timeout = 300_000) {
  const until = Date.now() + timeout;
  while (!peers.every(p => p.view?.phase === phase)) {
    if (Date.now() > until) throw new Error(`Timed out waiting for ${phase}`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
async function waitChat(peers, predicate) {
  const until = Date.now() + 10_000;
  while (!peers.every(p => predicate(p.view?.chat ?? []))) {
    if (Date.now() > until) throw new Error('Timed out waiting for synchronized chat');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
async function table(mode, count) {
  const peers = await Promise.all(Array.from({ length: count }, peer));
  const seat = await emit(peers[0].socket, 'create', { name: `QA-${mode}-1`, mode });
  for (let i = 1; i < count; i++) await emit(peers[i].socket, 'join', { code: seat.code, name: `QA-${mode}-${i + 1}` });
  await emit(peers[0].socket, 'quick_chat', { phraseId: 'hello' });
  await waitChat(peers, chat => chat.at(-1)?.phraseId === 'hello');
  assert(peers.every(p => p.view.chat.at(-1)?.phraseId === 'hello' && p.view.chat.at(-1)?.text === 'Hi everyone!'));
  for (const p of peers) await emit(p.socket, 'ready', { ready: true });
  await emit(peers[0].socket, 'start', {}); await waitFor(peers, 'reveal', 10_000);
  assert(peers.every(p => p.view.players.length === count && p.view.players.every(other => !other.role)));
  assert(peers.every(p => p.view.players.filter(other => other.id === p.view.youId).length === 1));
  for (const p of peers) {
    if (p.view.role !== 'werewolf') assert.equal(p.view.wolfTeam, undefined);
    if (p.view.role !== 'seer') assert.equal(p.view.investigations, undefined);
    if (p.view.role !== 'witch') { assert.equal(p.view.potions, undefined); assert.equal(p.view.victim, undefined); }
    assert.equal(p.view.centerRole, undefined);
  }
  console.log(`${mode}: ${count} real public clients joined; private projections verified.`);
  return { peers, seat };
}
async function classic() {
  const { peers } = await table('classic', 5);
  const wolf = peers.find(p => p.view.role === 'werewolf');
  await waitFor(peers, 'nightfall');
  assert(peers.every(p => p.view.deadline === peers[0].view.deadline));
  await waitFor(peers, 'wolves');
  await waitFor(peers, 'seer');
  const seer = peers.find(p => p.view.role === 'seer');
  await emit(seer.socket, 'action', { kind: 'inspect', target: wolf.view.youId });
  assert.equal(seer.view.investigations[0].isWolf, true);
  await waitFor(peers, 'discussion');
  await emit(peers[0].socket, 'chat', { text: 'Public network acceptance test.' });
  await waitChat(peers, chat => chat.at(-1)?.text === 'Public network acceptance test.');
  assert(peers.every(p => p.view.chat.at(-1).text === 'Public network acceptance test.'));
  await emit(peers[1].socket, 'quick_chat', { phraseId: 'explain_again' });
  await waitChat(peers, chat => chat.at(-1)?.phraseId === 'explain_again');
  assert(peers.every(p => p.view.chat.at(-1)?.phraseId === 'explain_again' && p.view.chat.at(-1)?.text === 'Could you explain again?'));
  assert(peers.every(p => p.view.chat.at(-2)?.text === 'Public network acceptance test.' && !p.view.chat.at(-2)?.phraseId));
  console.log('classic: synchronized night and dawn; private Seer result, free text and Quick Chat verified.');
  await waitFor(peers, 'voting');
  for (const p of peers.slice(0, -1)) await emit(p.socket, 'vote', { target: p === wolf ? 'skip' : wolf.view.youId });
  assert(peers.every(p => p.view.ballots === undefined));
  const deadline = peers[0].view.deadline;
  const last = peers.at(-1);
  await emit(last.socket, 'vote', { target: last === wolf ? 'skip' : wolf.view.youId });
  await waitFor(peers, 'ended', 5_000);
  assert(Date.now() < deadline);
  assert(peers.every(p => p.view.winner === 'village' && p.view.players.every(other => !!other.role)));
  console.log('PASS classic: secret votes, elimination, and identical village victory across five public clients.');
}
async function quick() {
  const { peers } = await table('quick', 2);
  await waitFor(peers, 'discussion');
  await emit(peers[0].socket, 'quick_chat', { phraseId: 'trust_me' });
  await emit(peers[1].socket, 'chat', { text: '你好 — free text stays original.' });
  await waitChat(peers, chat => chat.length === 2);
  assert(peers.every(p => p.view.chat[0]?.phraseId === 'trust_me' && p.view.chat[1]?.text === '你好 — free text stays original.' && !p.view.chat[1]?.phraseId));
  await waitFor(peers, 'voting');
  const wolfPresent = peers.some(p => p.view.role === 'werewolf');
  await emit(peers[0].socket, 'vote', { target: wolfPresent ? 'other' : 'center' });
  assert(peers.every(p => p.view.ballots === undefined && !p.view.centerRole));
  const deadline = peers[0].view.deadline;
  await emit(peers[1].socket, 'vote', { target: wolfPresent ? 'other' : 'center' });
  await waitFor(peers, 'ended', 5_000);
  assert(Date.now() < deadline);
  assert(peers.every(p => p.view.winner === 'village' && !!p.view.centerRole));
  console.log('PASS quick: both public clients completed the duel with identical results and center-card reveal.');
}
const heartbeat = setInterval(() => console.log('Public playtest is following normal game timers…'), 45_000);
try {
  const response = await fetch(`${url}/api/health`); assert.equal(response.status, 200);
  assert.equal((await response.json()).status, 'ok');
  await Promise.all([classic(), quick()]); console.log('ALL PUBLIC ACCEPTANCE CHECKS PASSED.');
} finally { clearInterval(heartbeat); sockets.forEach(s => s.disconnect()); }
