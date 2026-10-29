import { afterEach, describe, expect, it } from 'vitest';
import { io as connect, type Socket } from 'socket.io-client';
import { createApp } from '../server/index.js';
import { Game } from '../server/game.js';
import type { GameView, Reply, Seat } from '../shared/types.js';

const sockets: Socket[] = [];
let server: ReturnType<typeof createApp> | undefined;
afterEach(async () => { sockets.forEach(s => s.disconnect()); sockets.length = 0; await server?.close(); });
async function client(url: string) {
  const socket = connect(url, { transports: ['websocket'], forceNew: true }); sockets.push(socket);
  await new Promise<void>(resolve => socket.on('connect', resolve)); return socket;
}
function send<T>(socket: Socket, event: string, data: unknown): Promise<Reply<T>> {
  return new Promise(resolve => socket.emit(event, data, resolve));
}
async function running() {
  server = createApp(new Game({ reveal: 50, wolves: 250, seer: 250, witch: 250, dawn: 50, discussion: 50, quickDiscussion: 50, voting: 250, verdict: 50 }, cards => [...cards]));
  await new Promise<void>(resolve => server!.http.listen(0, '127.0.0.1', resolve));
  const address = server.http.address(); if (!address || typeof address === 'string') throw new Error('address');
  return `http://127.0.0.1:${address.port}`;
}
describe('real multiplayer transport', () => {
  it('runs five independent clients through a full game, protecting roles and restoring refreshes', async () => {
    const url = await running(); const peers = await Promise.all(Array.from({ length: 5 }, () => client(url)));
    const views: (GameView | undefined)[] = [];
    peers.forEach((s, i) => s.on('state', v => { views[i] = v; }));
    const created = await send<Seat>(peers[0], 'create', { name: 'Host', mode: 'classic' });
    expect(created.ok).toBe(true); if (!created.ok) return;
    const seat = created.data;
    for (let i = 1; i < 5; i++) expect((await send(peers[i], 'join', { code: seat.code, name: `Friend ${i}` })).ok).toBe(true);
    for (const peer of peers) expect((await send(peer, 'ready', { ready: true })).ok).toBe(true);
    expect((await send(peers[0], 'start', {})).ok).toBe(true);
    await expect.poll(() => views[1]?.phase).toBe('wolves');
    expect(views.every(v => v?.players.every(p => p.role === undefined))).toBe(true);
    expect(views[0]?.role).toBe('werewolf'); expect(views[1]?.wolfTeam).toBeUndefined();
    const denied = await send(peers[1], 'action', { kind: 'attack', target: views[2]!.youId });
    expect(denied).toEqual({ ok: false, error: 'unauthorized' });
    peers[0].disconnect(); const replacement = await client(url);
    replacement.on('state', v => { views[0] = v; });
    expect((await send(replacement, 'resume', seat)).ok).toBe(true);
    expect(views[0]?.youId).toBe(seat.playerId); expect(views[0]?.role).toBe('werewolf');
    // No attacks: the Witch then poisons the known test-dealt wolf through the actual socket API.
    await expect.poll(() => views[4]?.phase, { interval: 25 }).toBe('witch');
    expect(views[1]?.victim).toBeUndefined(); expect(views[1]?.potions).toBeUndefined();
    expect((await send(peers[4], 'action', { kind: 'poison', target: seat.playerId })).ok).toBe(true);
    await expect.poll(() => views[1]?.phase, { interval: 25 }).toBe('ended');
    expect(views.every(v => v?.winner === 'village')).toBe(true);
    expect(views.every(v => v?.players.every(p => !!p.role))).toBe(true);
  });
  it('rejects forged seat tokens, late joins, hostile origins, and secret requests', async () => {
    const url = await running(); const host = await client(url);
    const created = await send<Seat>(host, 'create', { name: 'Host', mode: 'classic' }); if (!created.ok) throw new Error('create');
    const attacker = await client(url);
    expect(await send(attacker, 'resume', { ...created.data, token: '0'.repeat(64) })).toEqual({ ok: false, error: 'unauthorized' });
    expect(await send(attacker, 'start', {})).toEqual({ ok: false, error: 'room_missing' });
    const peers = [host];
    for (let i = 0; i < 4; i++) { const p = await client(url); peers.push(p); await send(p, 'join', { code: created.data.code, name: `Guest ${i}` }); }
    for (const p of peers) await send(p, 'ready', { ready: true });
    await send(host, 'start', {});
    expect(await send(attacker, 'join', { code: created.data.code, name: 'Late' })).toEqual({ ok: false, error: 'started' });
    const hostile = connect(url, { transports: ['websocket'], extraHeaders: { Origin: 'https://evil.example' }, reconnection: false }); sockets.push(hostile);
    await new Promise<void>(resolve => hostile.once('connect_error', () => resolve())); expect(hostile.connected).toBe(false);
  });
  it('only permits the latest tab to control a seat', async () => {
    const url = await running(); const old = await client(url); let replaced = false;
    old.on('replaced', () => { replaced = true; });
    const created = await send<Seat>(old, 'create', { name: 'Host', mode: 'classic' }); if (!created.ok) throw new Error('create');
    const next = await client(url); expect((await send(next, 'resume', created.data)).ok).toBe(true);
    await expect.poll(() => replaced).toBe(true); expect(old.connected).toBe(false);
    expect((await send(next, 'ready', { ready: true })).ok).toBe(true);
  });
  it('completes a two-device duel and keeps guesses secret until both see the result', async () => {
    const url = await running(); const wolf = await client(url), villager = await client(url);
    let wolfView: GameView | undefined, villagerView: GameView | undefined;
    wolf.on('state', v => { wolfView = v; }); villager.on('state', v => { villagerView = v; });
    const result = await send<Seat>(wolf, 'create', { name: 'Moon', mode: 'quick' }); if (!result.ok) throw new Error('create');
    await send(villager, 'join', { code: result.data.code, name: 'Star' });
    await send(wolf, 'ready', { ready: true }); await send(villager, 'ready', { ready: true }); await send(wolf, 'start', {});
    expect(wolfView?.role).toBe('werewolf'); expect(villagerView?.role).toBe('villager');
    expect(wolfView?.centerRole).toBeUndefined();
    await expect.poll(() => villagerView?.phase, { interval: 25 }).toBe('voting');
    await send(villager, 'vote', { target: 'other' });
    expect(wolfView?.selection).toBeUndefined(); expect(wolfView?.ballots).toBeUndefined();
    await expect.poll(() => villagerView?.phase, { interval: 25 }).toBe('ended');
    expect(wolfView?.winner).toBe('village'); expect(villagerView?.winner).toBe('village');
    expect(wolfView?.centerRole).toBe('villager'); expect(villagerView?.ballots?.[villagerView.youId]).toBe('other');
  });
});
