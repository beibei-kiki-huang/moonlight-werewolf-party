import { afterEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { io, type Socket } from 'socket.io-client';
import { Game, GameError, newPlayer, newRoom } from '../server/game';
import { createApp } from '../server/index';
import { ChatMessageContent, DiscussionChat } from '../client/presentation';
import { isQuickPhraseId, QUICK_PHRASES, QUICK_PHRASE_IDS } from '../shared/quickChat';
import type { ChatMessage, GameView, Phase, Reply, Seat } from '../shared/types';

const en = (en: string, _zh: string) => en, zh = (_en: string, zh: string) => zh;
const message: ChatMessage = { id: 'm1', playerId: 'p1', name: 'Moon', text: QUICK_PHRASES.explain_again.en, phraseId: 'explain_again' };
function fixture() { const game = new Game(); const player = newPlayer('Moon'); return { game, player, room: newRoom('ABC234', 'classic', player, 0) }; }
describe('Quick Chat catalogue, permissions and presentation', () => {
  it('contains exactly the ten approved English/Chinese pairs and rejects inherited/unknown IDs', () => {
    expect(Object.values(QUICK_PHRASES).map(p => [p.en, p.zh])).toEqual([
      ['Hi everyone!', '大家好！'], ['Nice to meet you!', '很高兴认识大家！'],
      ['Who do you suspect?', '你怀疑谁？'], ['Why do you think so?', '你为什么这样想？'],
      ["I think you're suspicious!", '我觉得你很可疑！'], ['Do you trust me?', '你相信我吗？'],
      ['Could you explain again?', '可以再解释一下吗？'], ["Let's hear from everyone.", '我们听听每个人的想法。'],
      ['Good game!', '这局很精彩！'], ['One more round?', '再来一局吗？'],
    ]);
    for (const id of ['__proto__', 'constructor', 'toString', 'wolf_victim', '', null, 7]) expect(isQuickPhraseId(id)).toBe(false);
    const { game, room, player } = fixture();
    expect(() => game.quickChat(room, player.id, '__proto__', 0)).toThrow(new GameError('invalid'));
    expect(room.chat).toEqual([]);
  });
  it.each(['lobby', 'discussion', 'ended'] as Phase[])('uses the same allowed %s chat path, canonical fallback, sender and history cap', phase => {
    const { game, room, player } = fixture(); room.phase = phase;
    game.chat(room, player.id, '自由发言 stays unchanged', 1);
    for (let i = 0; i < 81; i++) game.quickChat(room, player.id, 'hello', i + 2);
    expect(room.chat).toHaveLength(80);
    expect(room.chat.every(m => m.text === 'Hi everyone!' && m.phraseId === 'hello' && m.playerId === player.id && m.name === player.name)).toBe(true);
    expect(new Set(room.chat.map(m => m.id)).size).toBe(80);
  });
  it.each(['reveal', 'nightfall', 'wolves', 'seer', 'witch', 'dawn', 'voting', 'verdict'] as Phase[])('rejects Quick Chat and free text during %s', phase => {
    const { game, room, player } = fixture(); room.phase = phase;
    expect(() => game.quickChat(room, player.id, 'suspect', 1)).toThrow(new GameError('wrong_phase'));
    expect(() => game.chat(room, player.id, 'test', 1)).toThrow(new GameError('wrong_phase'));
    expect(room.chat).toEqual([]);
  });
  it('rejects dead discussion senders and unbound identities without modifying hidden actions or votes', () => {
    const { game, room, player } = fixture(); room.phase = 'discussion'; player.alive = false;
    expect(() => game.quickChat(room, player.id, 'trust_me', 1)).toThrow(new GameError('unauthorized'));
    player.alive = true;
    expect(() => game.quickChat(room, 'forged', 'trust_me', 1)).toThrow(new GameError('unauthorized'));
    game.quickChat(room, player.id, 'trust_me', 1);
    expect(room.phase).toBe('discussion'); expect(room.votes).toEqual({}); expect(room.attacks).toEqual({}); expect(room.inspected.size).toBe(0);
  });
  it('localizes the primary sentence per recipient and keeps the other language collapsed by default', () => {
    for (const [language, tr, primary, alternate] of [['en', en, 'Could you explain again?', '可以再解释一下吗？'], ['zh', zh, '可以再解释一下吗？', 'Could you explain again?']] as const) {
      const html = renderToStaticMarkup(<ChatMessageContent message={message} language={language} tr={tr} />);
      expect(html).toContain(`<p lang="${language === 'en' ? 'en' : 'zh-CN'}">${primary}</p>`);
      expect(html).toContain('class="phrase-learning"'); expect(html).not.toContain(' open');
      expect(html).toContain(alternate); expect(html.indexOf(alternate)).toBeGreaterThan(html.indexOf('<details'));
    }
    const free = renderToStaticMarkup(<ChatMessageContent message={{ ...message, phraseId: undefined, text: '<script>原文</script>' }} language="en" tr={en} />);
    expect(free).toBe('<p>&lt;script&gt;原文&lt;/script&gt;</p>');
    const unknown = { ...message, phraseId: 'future_id' } as unknown as ChatMessage;
    expect(renderToStaticMarkup(<ChatMessageContent message={unknown} language="zh" tr={zh} />)).toBe('<p>Could you explain again?</p>');
  });
  it('offers all ten phrases equally across roles, disables offline/pending sends, and preserves the free-text composer', () => {
    const { game, room, player } = fixture(); room.phase = 'discussion';
    const props = { view: game.view(room, player.id, 0), canChat: true, connected: true, pending: false, send: async () => true, sendQuick: async () => true, language: 'en' as const, tr: en };
    const render = (overrides = {}) => renderToStaticMarkup(<DiscussionChat {...props} {...overrides} />);
    const html = render(); expect(html).toContain('textarea'); expect(html.match(/type="button"/g)).toHaveLength(10);
    expect(render({ view: { ...props.view, role: 'witch', acted: true, victim: 'secret' } })).toBe(render({ view: { ...props.view, role: 'werewolf', acted: false } }));
    expect(render({ canChat: false })).not.toContain('class="quick-picker"');
    expect(render({ connected: false }).match(/type="button" disabled=""/g)).toHaveLength(10);
    expect(render({ pending: true }).match(/type="button" disabled=""/g)).toHaveLength(10);
  });
});

const sockets: Socket[] = [];
let app: ReturnType<typeof createApp> | undefined;
afterEach(async () => { sockets.forEach(s => s.disconnect()); sockets.length = 0; await app?.close(); app = undefined; });
const send = <T,>(s: Socket, event: string, payload: unknown): Promise<Reply<T>> => new Promise(resolve => s.emit(event, payload, resolve));
async function connected(url: string) {
  const socket = io(url, { forceNew: true, transports: ['websocket'] }); sockets.push(socket);
  await new Promise<void>(resolve => socket.once('connect', resolve)); return socket;
}
describe('Quick Chat through independent multiplayer clients', () => {
  it.each(['classic', 'quick'] as const)('synchronizes mixed %s history, per-language display and refresh recovery without role leaks', async mode => {
    app = createApp(); await new Promise<void>(resolve => app!.http.listen(0, '127.0.0.1', resolve));
    const address = app.http.address(); if (!address || typeof address === 'string') throw Error('address');
    const url = `http://127.0.0.1:${address.port}`, a = await connected(url), b = await connected(url);
    let av: GameView | undefined, bv: GameView | undefined;
    a.on('state', v => av = v); b.on('state', v => bv = v);
    const made = await send<Seat>(a, 'create', { name: 'Moon', mode }); if (!made.ok) throw Error('create');
    const joined = await send<Seat>(b, 'join', { code: made.data.code, name: '星星' }); if (!joined.ok) throw Error('join');
    expect((await send(a, 'quick_chat', { phraseId: 'explain_again' })).ok).toBe(true);
    expect((await send(b, 'chat', { text: '自由发言, no translation.' })).ok).toBe(true);
    await expect.poll(() => [av?.chat.length, bv?.chat.length]).toEqual([2, 2]);
    expect(av!.chat).toEqual(bv!.chat); expect(av!.chat[1].phraseId).toBeUndefined();
    expect(renderToStaticMarkup(<ChatMessageContent message={av!.chat[0]} language="en" tr={en} />)).toContain('<p lang="en">Could you explain again?</p>');
    expect(renderToStaticMarkup(<ChatMessageContent message={bv!.chat[0]} language="zh" tr={zh} />)).toContain('<p lang="zh-CN">可以再解释一下吗？</p>');
    expect((await send(a, 'quick_chat', { phraseId: 'unknown' }))).toEqual({ ok: false, error: 'invalid' });
    expect((await send(a, 'quick_chat', { phraseId: 'hello', name: 'Forged', text: 'Hidden role', target: joined.data.playerId }))).toEqual({ ok: false, error: 'invalid' });
    b.disconnect(); const resumed = await connected(url); resumed.on('state', v => bv = v);
    expect((await send(resumed, 'resume', joined.data)).ok).toBe(true);
    await expect.poll(() => bv?.chat.length).toBe(2); expect(bv!.chat[0].phraseId).toBe('explain_again');
    // Both command types spend the same quota: 1 existing + 4 = 5; changing type cannot bypass it.
    for (let i = 0; i < 4; i++) expect((await send(a, i % 2 ? 'chat' : 'quick_chat', i % 2 ? { text: 'ordinary' } : { phraseId: 'hello' })).ok).toBe(true);
    expect(await send(a, 'quick_chat', { phraseId: 'hello' })).toEqual({ ok: false, error: 'rate_limit' });
    expect(await send(a, 'chat', { text: 'ordinary' })).toEqual({ ok: false, error: 'rate_limit' });
    const room = app.rooms.get(made.data.code)!;
    // Fixture phases exercise the real socket permission gate, never a deployed debug endpoint.
    for (const p of room.players) { p.role = p.id === made.data.playerId ? 'werewolf' : 'villager'; }
    room.phase = 'wolves'; room.deadline = Date.now() + 60_000;
    expect(await send(resumed, 'quick_chat', { phraseId: 'suspect' })).toEqual({ ok: false, error: 'wrong_phase' });
    room.phase = 'discussion'; room.deadline = Date.now() + 60_000; room.players[1].alive = false;
    expect(await send(resumed, 'quick_chat', { phraseId: 'suspect' })).toEqual({ ok: false, error: 'unauthorized' });
    room.players[1].alive = true;
    expect((await send(resumed, 'quick_chat', { phraseId: 'suspect' })).ok).toBe(true);
    await expect.poll(() => av?.chat.at(-1)?.phraseId).toBe('suspect');
    expect(av!.players.every(p => p.role === undefined)).toBe(true); expect(bv!.players.every(p => p.role === undefined)).toBe(true);
    expect(bv!.wolfTeam).toBeUndefined(); expect(bv!.victim).toBeUndefined(); expect(bv!.investigations).toBeUndefined();
    expect(QUICK_PHRASE_IDS).toHaveLength(10);
  });
});
