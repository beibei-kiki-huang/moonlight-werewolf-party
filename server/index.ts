import express from 'express';
import helmet from 'helmet';
import { createServer } from 'node:http';
import { randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server, type Socket } from 'socket.io';
import { z } from 'zod';
import { Game, GameError, newPlayer, newRoom, type Room } from './game.js';
import type { ErrorCode, Reply } from '../shared/types.js';
import { isQuickPhraseId } from '../shared/quickChat.js';

const nameSchema = z.string().trim().min(2).max(20).regex(/^[^\p{Cc}\p{Cf}<>]+$/u);
const codeSchema = z.string().trim().toUpperCase().regex(/^[A-HJ-NP-Z2-9]{6}$/);
const idSchema = z.string().uuid();
const modeSchema = z.enum(['classic', 'quick']);
const packSchema = z.union([
  z.object({stageId:idSchema,clientMessageId:idSchema,text:z.string().trim().min(1).max(300)}).strict(),
  z.object({stageId:idSchema,clientMessageId:idSchema,phraseId:z.string().refine(isQuickPhraseId)}).strict(),
]);
const actionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('attack'), target: idSchema }),
  z.object({ kind: z.literal('inspect'), target: idSchema }),
  z.object({ kind: z.literal('poison'), target: idSchema }),
  z.object({ kind: z.literal('heal') }), z.object({ kind: z.literal('pass') }),
]);
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
type Session = { room: Room; playerId: string };

// Each room is intentionally owned by this one Node process. No hidden state is sent to Socket.IO rooms.
export function createApp(game = new Game()) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'], connectSrc: ["'self'", 'ws:', 'wss:'], fontSrc: ["'self'"],
      objectSrc: ["'none'"], frameAncestors: ["'none'"], upgradeInsecureRequests: [] },
  } : false }));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'moonlight', version: '0.1.0' }));
  const http = createServer(app);
  const io = new Server(http, {
    maxHttpBufferSize: 16_384,
    allowRequest(req, callback) {
      try { callback(null, !req.headers.origin || new URL(req.headers.origin).host === req.headers.host); }
      catch { callback(null, false); }
    },
  });
  const rooms = new Map<string, Room>();
  const credentials = new Map<string, string>();
  const connections = new Map<string, string>();
  const limits = new Map<string, { count: number; reset: number }>();
  function limit(key: string, max: number, window: number) {
    const now = Date.now(); let value = limits.get(key);
    if (!value || value.reset <= now) { value = { count: 0, reset: now + window }; limits.set(key, value); }
    if (++value.count > max) throw new GameError('rate_limit');
  }
  function emitViews(room: Room) {
    const now = Date.now();
    for (const p of room.players) {
      const connection = connections.get(p.id);
      if (connection) io.to(connection).emit('state', game.view(room, p.id, now));
    }
  }
  function emitPrivate(room: Room, playerId: string, includePack = false) {
    for (const p of room.players) {
      if (p.id !== playerId && !(includePack && p.role === 'werewolf')) continue;
      const connection = connections.get(p.id);
      if (connection) io.to(connection).emit('state', game.view(room, p.id, Date.now()));
    }
  }
  function getSession(socket: Socket): Session {
    const { code, playerId } = socket.data;
    const room = rooms.get(code);
    if (!room) throw new GameError('room_missing');
    if (connections.get(playerId) !== socket.id) throw new GameError('unauthorized');
    game.player(room, playerId);
    if (game.tick(room, Date.now())) emitViews(room);
    return { room, playerId };
  }
  function bind(socket: Socket, room: Room, playerId: string) {
    // A socket must never hold two seats or receive two private projections.
    if (socket.data.playerId && socket.data.playerId !== playerId) throw new GameError('unauthorized');
    const oldId = connections.get(playerId);
    connections.set(playerId, socket.id); socket.data.code = room.code; socket.data.playerId = playerId;
    if (oldId && oldId !== socket.id) {
      io.to(oldId).emit('replaced'); io.sockets.sockets.get(oldId)?.disconnect(true);
    }
    game.player(room, playerId).connected = true; room.allOfflineSince = null;
    game.touch(room, Date.now()); emitViews(room);
  }
  function unbound(socket: Socket) {
    if (socket.data.playerId) throw new GameError('unauthorized');
  }
  io.on('connection', socket => {
    const forwarded = socket.handshake.headers['x-forwarded-for'];
    const ip = process.env.NODE_ENV === 'production' && typeof forwarded === 'string'
      ? forwarded.split(',').at(-1)!.trim() : socket.handshake.address;
    function handle<T>(event: string, schema: z.ZodType<T>, fn: (data: T) => unknown) {
      socket.on(event, (input: unknown, ack?: (result: Reply<unknown>) => void) => {
        if (typeof ack !== 'function') return;
        try {
          limit(`socket:${socket.id}`, 70, 10_000);
          const result = schema.safeParse(input);
          if (!result.success) throw new GameError('invalid');
          ack({ ok: true, data: fn(result.data) });
        } catch (error) {
          const code: ErrorCode = error instanceof GameError ? error.code : 'invalid';
          // No request payloads, tokens, roles, or game internals in logs/errors.
          ack({ ok: false, error: code });
        }
      });
    }
    handle('create', z.object({ name: nameSchema, mode: modeSchema }), ({ name, mode }) => {
      unbound(socket); limit(`create:${ip}`, 12, 600_000);
      if (rooms.size >= 300) throw new GameError('capacity');
      let code: string;
      do { code = Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join(''); } while (rooms.has(code));
      const player = newPlayer(name); const room = newRoom(code, mode, player, Date.now());
      const token = randomBytes(32).toString('hex'); credentials.set(player.id, token);
      rooms.set(code, room); bind(socket, room, player.id);
      return { code, playerId: player.id, token };
    });
    handle('join', z.object({ name: nameSchema, code: codeSchema }), ({ name, code }) => {
      unbound(socket); limit(`join:${ip}`, 60, 60_000);
      const room = rooms.get(code); if (!room) throw new GameError('room_missing');
      const player = game.join(room, name, Date.now()); const token = randomBytes(32).toString('hex');
      credentials.set(player.id, token); bind(socket, room, player.id);
      return { code, playerId: player.id, token };
    });
    handle('resume', z.object({ code: codeSchema, playerId: idSchema, token: z.string().regex(/^[a-f0-9]{64}$/) }), ({ code, playerId, token }) => {
      limit(`resume:${ip}`, 120, 60_000);
      const room = rooms.get(code); if (!room) throw new GameError('room_missing');
      const secret = credentials.get(playerId);
      if (!secret || !room.players.some(p => p.id === playerId) || !timingSafeEqual(Buffer.from(token), Buffer.from(secret))) throw new GameError('unauthorized');
      if (game.tick(room, Date.now())) emitViews(room);
      bind(socket, room, playerId); return undefined;
    });
    function command<T>(event: string, schema: z.ZodType<T>, fn: (session: Session, data: T) => void) {
      handle(event, schema, data => { const session = getSession(socket); fn(session, data); emitViews(session.room); });
    }
    command('ready', z.object({ ready: z.boolean() }), ({ room, playerId }, { ready }) => game.ready(room, playerId, ready, Date.now()));
    command('mode', z.object({ mode: modeSchema }), ({ room, playerId }, { mode }) => game.changeMode(room, playerId, mode, Date.now()));
    command('start', z.object({}), ({ room, playerId }) => game.start(room, playerId, Date.now()));
    handle('action', actionSchema, action => {
      const { room, playerId } = getSession(socket); game.act(room, playerId, action, Date.now());
      // No public event, counter, or broadcast reveals that a hidden action happened.
      emitPrivate(room, playerId, action.kind === 'attack');
    });
    handle('vote', z.object({ target: z.union([idSchema, z.literal('skip'), z.literal('other'), z.literal('center')]) }), ({ target }) => {
      const { room, playerId } = getSession(socket);
      if (game.vote(room, playerId, target, Date.now())) emitViews(room);
      else emitPrivate(room, playerId);
    });
    handle('pack_chat', packSchema, input => {
      const {room,playerId}=getSession(socket),now=Date.now();
      game.assertPackAccess(room,playerId,now);
      limit(`pack_chat:${playerId}`,5,10_000);
      const reply=game.packMessage(room,playerId,input,now);
      if (!reply.duplicate) for (const player of room.players) {
        if (!game.canPackChat(room,player.id,now)) continue;
        const connection=connections.get(player.id);
        if (connection) io.to(connection).emit('pack_state',game.packState(room,player.id,now));
      }
      return reply;
    });
    command('chat', z.object({ text: z.string().trim().min(1).max(300) }), ({ room, playerId }, { text }) => {
      limit(`chat:${playerId}`, 5, 10_000); game.chat(room, playerId, text, Date.now());
    });
    command('quick_chat', z.object({ phraseId: z.string().max(40).refine(isQuickPhraseId) }).strict(), ({ room, playerId }, { phraseId }) => {
      limit(`chat:${playerId}`, 5, 10_000); game.quickChat(room, playerId, phraseId, Date.now());
    });
    command('rematch', z.object({}), ({ room, playerId }) => game.rematch(room, playerId, Date.now()));
    command('remove', z.object({ playerId: idSchema }), ({ room, playerId }, data) => {
      game.remove(room, playerId, data.playerId, Date.now()); credentials.delete(data.playerId);
      const target = connections.get(data.playerId);
      if (target) { io.to(target).emit('removed'); io.sockets.sockets.get(target)?.disconnect(true); }
      connections.delete(data.playerId);
    });
    socket.on('disconnect', () => {
      const { playerId, code } = socket.data;
      if (connections.get(playerId) !== socket.id) return;
      connections.delete(playerId);
      const room = rooms.get(code); if (!room) return;
      const player = room.players.find(p => p.id === playerId); if (player) player.connected = false;
      if (room.players.every(p => !p.connected)) room.allOfflineSince = Date.now();
      game.touch(room, Date.now()); emitViews(room);
    });
  });
  const ticker = setInterval(() => {
    const now = Date.now();
    for (const [code, room] of rooms) {
      if ((room.allOfflineSince !== null && now - room.allOfflineSince > 600_000)
        || ((room.phase === 'lobby' || room.phase === 'ended') && now - room.lastActivity > 7_200_000)) {
        for (const p of room.players) {
          const connection = connections.get(p.id);
          if (connection) { io.to(connection).emit('expired'); io.sockets.sockets.get(connection)?.disconnect(true); }
          credentials.delete(p.id); connections.delete(p.id);
        }
        rooms.delete(code); continue;
      }
      if (game.tick(room, now)) emitViews(room);
    }
    for (const [key, value] of limits) if (value.reset <= now) limits.delete(key);
  }, 250);
  ticker.unref();
  const clientPath = path.resolve(process.cwd(), 'dist/client');
  app.use(express.static(clientPath, { index: false }));
  app.get('/', (_req, res) => res.sendFile(path.join(clientPath, 'index.html')));
  return { app, http, io, rooms, close: async () => { clearInterval(ticker); await new Promise<void>(resolve => io.close(() => resolve())); } };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createApp();
  const port = Number(process.env.PORT || 3001);
  server.http.listen(port, '0.0.0.0', () => console.log(`Moonlight listening on port ${port}`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { void server.close().then(() => process.exit(0)); });
}
