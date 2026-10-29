import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { io, type Socket } from 'socket.io-client';
import { ArrowRight, Check, ChevronRight, Copy, Eye, EyeOff, FlaskConical, Globe2, Heart, Info, Link, LogOut, MessageCircle, Moon, Send, Shield, Sparkles, Users, Vote, Wifi, WifiOff, X } from 'lucide-react';
import type { PackChatState, PackSubmission, Action, ErrorCode, GameEvent, GameView, Mode, Reply, Role, Seat } from '../shared/types';
import './styles.css';
import './polish.css';
import './flow.css';
import './quick-chat.css';
import './atmosphere.css';
import './submission.css';
import { BeginnerGuide } from './BeginnerGuide';
import {tabSeat,savedSeat as readSavedSeat,storeSeat,clearSeat} from './seatStorage';
import {ParticipantAvatar} from './Participant';
import {IdentityPanel} from './IdentityPanel';
import {SeerNightResult,PackAttackSummary} from './PrivateActions';
import {DiscussionSettings,DayControls,maySpeak} from './DayControls';
import {LobbyReadiness,lobbyBlockers} from './LobbyReadiness';
import { PackChat } from './PackChat';
import { WitchPanel } from './WitchPanel';
import { DawnResult } from './DawnResult';
import { publishedDawn, publishedDawnCue } from './publicDawn';
import './refinement.css';
import { DiscussionChat, NightSequence, Outcome, Portrait, RoleCard, VotingPanel } from './presentation';
import { SoundControls } from './SoundControls';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/cormorant-garamond/latin-400.css';
import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/latin-400-italic.css';

type Lang = 'en' | 'zh';
const errors: Record<ErrorCode, [string, string]> = {
  seat_in_use: ['This seat is active in another tab. Join with a new nickname, or explicitly Resume to take control.', '此座位正在另一标签页使用。你可以用新昵称加入，或主动点击恢复来接管原座位。'],
  invalid: ['Please check your details and try again.', '请检查输入后重试。'],
  room_missing: ['This room has expired or the server restarted. Please create a new room.', '房间已过期或服务器已重启，请创建新房间。'],
  room_full: ['This table is full. Quick Mode seats exactly two.', '房间已满。快速模式仅限两人。'],
  name_taken: ['That nickname is already at the table.', '此昵称已被使用。'],
  started: ['This game has started. Join the next round.', '游戏已经开始，请等待下一局。'],
  unauthorized: ['This seat or action is unavailable. Your private seat can only be restored in the original browser.', '此座位或操作不可用。请使用原来的浏览器恢复座位。'],
  not_host: ['Only the room host can do this.', '只有房主可以执行此操作。'],
  not_ready: ['Classic needs 5–8 players; Quick needs 2. Everyone must be online and ready.', '经典模式需5–8人，快速模式需2人。所有玩家需在线并准备。'],
  wrong_phase: ['That phase has ended. Follow the current instructions.', '此阶段已结束，请按照当前提示操作。'],
  invalid_target: ['Choose an eligible player or an available potion.', '请选择有效目标或可用药水。'],
  already_acted: ['Your action is already confirmed for tonight.', '你今晚的行动已确认。'],
  rate_limit: ['A little slower, moonwalker. Please wait a moment.', '请稍候再试。'],
  capacity: ['The server is full right now. Please try again shortly.', '服务器暂时已满，请稍后重试。'],
};
function storedLanguage(): Lang { try { return localStorage.getItem('moonlight.lang') === 'zh' ? 'zh' : 'en'; } catch { return 'en'; } }
const icons = { werewolf: Moon, villager: Shield, seer: Eye, witch: FlaskConical };
const roleNames: Record<Role, [string, string]> = { werewolf: ['Werewolf', '狼人'], villager: ['Villager', '村民'], seer: ['Seer', '预言家'], witch: ['Witch', '女巫'] };
const roleDescriptions: Record<Role, [string, string]> = {
  werewolf: ['Hide in plain sight. Hunt with your pack at night, and turn suspicion away by day.', '隐藏你的身份。夜晚与同伴狩猎，白天转移怀疑。'],
  villager: ['Your power is your instinct. Listen closely, find the wolves, and make your vote count.', '你的力量是直觉。仔细倾听、找出狼人、投出关键一票。'],
  seer: ['Look beyond appearances. Each night, learn whether one other player is a werewolf.', '你属于好人阵营。每晚可以查验一名其他存活玩家，得知对方是否属于狼人阵营。利用你掌握的信息，帮助好人找出所有狼人。'],
  witch: ['Two potions. Two chances to change fate. Save a life or take one—choose carefully.', '两瓶药水，两次改变命运的机会。救人或毒杀，请谨慎选择。'],
};

function App() {
  const [lang, setLang] = useState<Lang>(storedLanguage);
  const tr = (en: string, zh: string) => lang === 'en' ? en : zh;
  const roleName = (role: Role) => roleNames[role][lang === 'en' ? 0 : 1];
  const socket = useRef<Socket | null>(null);
  const seatRef = useRef<Seat | null>(tabSeat());
  const [savedSeat, setSavedSeat] = useState(seatRef.current || readSavedSeat());
  const [view, setView] = useState<GameView | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ErrorCode | 'connection' | 'replaced' | 'removed' | null>(null);
  const [toast, setToast] = useState('');
  const [tab, setTab] = useState<'create' | 'join'>(() => new URLSearchParams(location.search).has('room') ? 'join' : 'create');
  const [name, setName] = useState(() => { try { return localStorage.getItem('moonlight.name') || ''; } catch { return ''; } });
  const [code, setCode] = useState(() => (new URLSearchParams(location.search).get('room') || '').toUpperCase());
  const [mode, setMode] = useState<Mode>('classic');
  const [rules, setRules] = useState(false);
  const [roleVisible, setRoleVisible] = useState(false);
  const [target, setTarget] = useState('');
  const [confirm, setConfirm] = useState<Action | null>(null);
  const [now, setNow] = useState(Date.now());
  const offset = useRef(0);
  const currentRole = useRef<string>('');
  const takeover=useRef(false);
  useEffect(() => { try { localStorage.setItem('moonlight.lang', lang); } catch {} document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN'; }, [lang]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(timer); }, []);
  useEffect(() => { setTarget(''); setConfirm(null); }, [view?.phase, view?.day]);
  useEffect(() => {
    if (!view?.code) return;
    // Load the same four public portraits for every seat, regardless of its secret role.
    for (const role of ['werewolf', 'villager', 'seer', 'witch']) { const image = new Image(); image.src = `/art/v2/${role}-360.webp`; }
  }, [view?.code]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 3000); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setRules(false); setConfirm(null); } };
    window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape);
  }, []);
  useEffect(() => {
    const s = io({ autoConnect: false, reconnection: true }); socket.current = s;
    s.on('connect', () => {
      setConnected(true); setConnecting(false);
      const seat = seatRef.current;
      if (seat) s.timeout(10_000).emit('resume', {...seat,takeover:takeover.current}, (err: Error | null, result: Reply) => {
        if (err) { setError('connection'); return; }
        if (!result.ok) {
          setError(result.error);
          if (result.error === 'room_missing' || result.error === 'unauthorized') {
            clearSeat(seatRef.current);seatRef.current = null; setSavedSeat(null); setView(null);
          }
        } else setError(null);
        takeover.current=false;
      });
    });
    s.on('pack_state', (pack: PackChatState) => {
      setView(current => current?.phase === 'wolves' && current.role === 'werewolf' && current.packChat?.stageId === pack.stageId
        ? {...current,packChat:pack} : current);
    });
    s.on('disconnect', () => { setConnected(false); setPending(false); });
    s.on('connect_error', () => { setConnecting(false); setError('connection'); });
    s.on('state', (state: GameView) => {
      offset.current = state.serverNow - Date.now();
      const identity = `${state.code}:${state.role || 'lobby'}`;
      if (currentRole.current !== identity) { currentRole.current = identity; setRoleVisible(false); }
      setView(state); setConnecting(false);
    });
    for (const event of ['replaced', 'removed', 'expired'] as const) s.on(event, () => {
      s.disconnect(); setError(event === 'expired' ? 'room_missing' : event); setView(null);
      if (event !== 'replaced') { clearSeat(seatRef.current);seatRef.current = null; setSavedSeat(null); }
    });
    const requestedRoom = new URLSearchParams(location.search).get('room')?.toUpperCase();
    // Returning from the isolated demo is a landing visit, never a seat takeover.
    const landingOnly = new URLSearchParams(location.search).get('welcome') === '1';
    if (!landingOnly && seatRef.current && (!requestedRoom || requestedRoom === seatRef.current.code)) { setConnecting(true); s.connect(); }
    else seatRef.current = null;
    return () => { s.disconnect(); socket.current = null; };
  }, []);
  function request<T = undefined>(event: string, data: unknown): Promise<T | null> {
    const s = socket.current;
    if (!s?.connected) { setError('connection'); return Promise.resolve(null); }
    setPending(true); setError(null);
    return new Promise(resolve => {
      s.timeout(10_000).emit(event, data, (err: Error | null, result: Reply<T>) => {
        setPending(false);
        if (err) { setError('connection'); resolve(null); }
        else if (!result.ok) { setError(result.error); resolve(null); }
        else resolve(result.data);
      });
    });
  }
  function sendPack(input: PackSubmission): Promise<ErrorCode | 'connection' | null> {
    const s=socket.current;
    if(!s?.connected)return Promise.resolve('connection');
    return new Promise(resolve=>s.timeout(4000).emit('pack_chat',input,(err:Error|null,result:Reply)=>resolve(err?'connection':result.ok?null:result.error)));
  }
  async function enter(event: React.FormEvent) {
    event.preventDefault(); if (pending || connecting) return;
    setConnecting(true); setError(null); seatRef.current = null;
    const s = socket.current!;
    s.disconnect(); s.connect();
    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => { cleanup(); reject(new Error('timeout')); }, 15_000);
        const cleanup = () => { clearTimeout(timeout); s.off('connect', success); s.off('connect_error', failure); };
        const success = () => { cleanup(); resolve(); }; const failure = () => { cleanup(); reject(new Error('connection')); };
        s.once('connect', success); s.once('connect_error', failure);
      });
      const seat = await request<Seat>(tab, tab === 'create' ? { name: name.trim(), mode } : { name: name.trim(), code: code.trim().toUpperCase() });
      if (seat) {
        seatRef.current = seat; setSavedSeat(seat);
        try { storeSeat(seat); localStorage.setItem('moonlight.name', name.trim()); } catch { setToast(tr('Browser storage unavailable: keep this tab open.', '浏览器无法保存座位，请勿关闭此页面。')); }
        history.replaceState(null, '', `?room=${seat.code}`);
      }
    } catch { setError('connection'); }
    finally { setConnecting(false); }
  }
  function resume() {
    if (!savedSeat) return; setError(null); seatRef.current = savedSeat;takeover.current=true;
    try{storeSeat(savedSeat)}catch{}
    setConnecting(true); socket.current!.disconnect(); socket.current!.connect();
    history.replaceState(null, '', `?room=${savedSeat.code}`);
  }
  function home() {
    socket.current?.disconnect(); seatRef.current = null; setView(null); setError(null); setConnecting(false);
    history.replaceState(null, '', '/');
  }
  async function copyRoom(link: boolean) {
    const value = link ? `${location.origin}/?room=${view!.code}` : view!.code;
    try { await navigator.clipboard.writeText(value); setToast(tr(link ? 'Invitation link copied' : 'Room code copied', link ? '邀请链接已复制' : '房间号已复制')); }
    catch { setToast(tr(`Share this code: ${view!.code}`, `分享房间号：${view!.code}`)); }
  }
  function eventText(event: GameEvent): string {
    const people = event.players?.map(p => lang === 'zh' ? `${p.name}（${roleName(p.role)}）` : `${p.name} · ${roleName(p.role)}`).join(lang === 'zh' ? '、' : ', ');
    if (event.kind === 'start') return tr('The cards are dealt. The village holds its breath.', '身份已分配，村庄屏息以待。');
    if (event.kind === 'dawn') return event.players?.length ? tr(`Dawn ${event.day}: ${people} did not survive the night.`, `第${event.day}天，昨夜出局：${people}。`) : tr(`Dawn ${event.day}: everyone survived the night.`, `第${event.day}天：昨夜是平安夜。`);
    if (event.kind === 'elimination') return tr(`The village eliminated ${people}.`, `村庄投票放逐了 ${people}。`);
    if (event.kind === 'no_elimination') return tr('The vote was inconclusive. Nobody was eliminated.', '投票未产生明确结果，无人出局。');
    return event.winner === 'draw' ? tr('The moon witnessed a draw.', '月亮见证了一场平局。') : event.winner === 'village' ? tr('The village wins. The truth came to light.', '好人阵营获胜，真相终于浮现。') : tr('The werewolves win. The night belongs to them.', '狼人阵营获胜，黑夜属于它们。');
  }
  const phaseNames = {
    lobby: tr('The gathering', '集结'), reveal: tr('Your secret awaits', '你的秘密身份'), nightfall: tr('Night falls', '夜幕降临'), wolves: tr('The wolves awaken', '狼人睁眼'),
    seer: tr('A glimpse of truth', '窥见真相'), witch: tr('A choice of fate', '命运的抉择'), dawn: tr('Morning breaks', '黎明到来'),
    discussion: tr('Speak. Listen. Suspect.', '发言、倾听、推理'), voting: tr('Let your vote speak', '投出你的一票'),
    last_words:tr('Final words','遗言时间'),
    verdict: tr('The village has spoken', '村庄已作出选择'), ended: tr('Every secret, revealed', '揭晓所有秘密'),
  };
  const me = view?.players.find(p => p.id === view.youId);
  const isHost = !!view && view.hostId === view.youId;
  const isNight = !!view && ['nightfall', 'wolves', 'seer', 'witch'].includes(view.phase);
  const stageLabels = view?.mode === 'quick'
    ? [tr('Secret', '身份'), tr('Discussion', '讨论'), tr('Vote', '投票')]
    : [tr('Secret', '身份'), tr('Night', '夜晚'), tr('Discussion', '讨论'), tr('Vote', '投票')];
  const currentStage = !view || view.phase === 'reveal' ? 0 : view.mode === 'quick'
    ? view.phase === 'discussion' ? 1 : 2
    : isNight || view.phase === 'dawn' ? 1 : view.phase === 'discussion' ? 2 : 3;
  const seconds = view?.deadline ? Math.max(0, Math.ceil((view.deadline - now - offset.current) / 1000)) : 0;
  const disabled = pending || !connected || seconds === 0;
  const eligible = view?.players.filter(p => p.alive && p.id !== view.youId && !(view.phase === 'wolves' && view.wolfTeam?.includes(p.id))) || [];
  const myTurn = !!view && !!me?.alive && ((view.phase === 'wolves' && view.role === 'werewolf') || (view.phase === 'seer' && view.role === 'seer') || (view.phase === 'witch' && view.role === 'witch'));
  const canChat = !!view && maySpeak(view);
  const showChat = !!view && !isNight && view.phase !== 'reveal';
  function discussionChat() {
    return view ? <DiscussionChat view={view} canChat={!!canChat} connected={connected} pending={pending} language={lang} tr={tr} send={async text => (await request('chat', { text,...(view.turnId?{turnId:view.turnId}:{}) })) !== null} sendQuick={async phraseId => (await request('quick_chat', { phraseId,...(view.turnId?{turnId:view.turnId}:{}) })) !== null} /> : null;
  }

  function targetButtons(forPoison = false) {
    return <div className="target-grid">{eligible.map(p => <button key={p.id} className={`target ${target === p.id ? 'chosen' : ''}`} disabled={disabled || (view?.acted && view.phase !== 'wolves' && view.phase !== 'voting')} onClick={() => setTarget(p.id)}>
      <span className="avatar">{p.name.slice(0, 1).toUpperCase()}</span><span>{p.name}</span>{target === p.id && <Check size={16} />}
      {!forPoison && view?.phase === 'wolves' && Object.entries(view.wolfSelections || {}).some(([id, pick]) => id !== view.youId && pick === p.id) && <small>{tr('Pack choice', '同伴选择')}</small>}
    </button>)}</div>;
  }
  function roleCard() {
    return view?.role ? <RoleCard view={view} visible={roleVisible} onToggle={() => setRoleVisible(!roleVisible)} tr={tr} roleName={roleName} /> : null;
  }
  function ballotList() {
    if (!view?.ballots) return null;
    return <div className="ballot-list">{Object.entries(view.ballots).map(([id, pick]) => <div key={id}><span>{view.players.find(p => p.id === id)?.name}</span><ChevronRight size={14} /><strong>{pick === 'skip' ? tr('Abstain', '弃票') : pick === 'other' ? tr('Other player', '另一名玩家') : pick === 'center' ? tr('Center', '中央牌') : pick === 'missing' ? tr('No accusation', '未指认') : view.players.find(p => p.id === pick)?.name}</strong></div>)}</div>;
  }
  function actionPanel() {
    if (!view || !me) return null;
    if (view.phase === 'ended') return <Outcome view={view} host={isHost} disabled={pending || !connected} onRematch={() => void request('rematch', {})} tr={tr} roleName={roleName} ballots={ballotList()} />;
    if (view.phase === 'reveal') return <div className="reveal-guidance"><Sparkles size={17} /><p>{tr('Your story begins with a secret. Open your card, then keep it close.', '故事始于一个秘密。揭开身份，再将它藏好。')}</p></div>;
    if (isNight) {
      if (!myTurn) return <section className="panel instruction night-wait"><Moon size={32} /><p className="eyebrow">{tr('THE VILLAGE SLEEPS', '村庄沉睡中')}</p><h2>{tr('Keep your secrets close', '守好你的秘密')}</h2><p>{tr('Rest beneath the moon. Follow the public guidance and wait for dawn. No action is needed on this screen.', '在月光下静候。跟随公开引导，等待黎明。此屏幕无需操作。')}</p></section>;
      if (view.phase === 'witch') return <WitchPanel view={view} disabled={disabled} target={target} onTarget={setTarget} onConfirm={setConfirm} onPass={() => void request('action', {kind:'pass'})} tr={tr} />;
      if(view.phase==='seer'&&view.acted)return <SeerNightResult view={view} tr={tr}/>;
      if (view.acted && view.phase !== 'wolves') return <section className="panel instruction"><Check size={30} /><h2>{tr('Your choice is sealed', '行动已确认')}</h2><p>{tr('Your private action is confirmed. The night continues until the timer ends.', '你的秘密行动已确认，倒计时结束后夜晚继续。')}</p></section>;
      return <section className="panel action-panel"><p className="eyebrow">{tr('YOUR NIGHT ACTION', '你的夜间行动')}</p><h2>{view.phase === 'wolves' ? tr('Choose your prey', '选择狩猎目标') : tr('Who hides behind the mask?', '谁藏在面具之后？')}</h2><p>{view.phase === 'wolves' ? tr('Choose a living non-wolf. Your pack sees your choice. You may change it until the timer ends; tied leaders are chosen randomly. With no valid votes, the server chooses an eligible target.', '选择一名存活的好人阵营玩家。同伴可以看到你的选择。倒计时结束前可更改，最高票平票时随机选一名；无人提交有效选择时，随机选择可袭击的玩家。') : tr('Inspect one other living player. You will privately learn whether they are a werewolf. Confirm carefully: one check per night.', '查验一名其他存活玩家，秘密得知其是否属于狼人阵营。每晚只能确认一次。')}</p>{targetButtons()}{view.phase==='wolves'&&<PackAttackSummary view={view} selected={target} tr={tr}/>}
        <button className="button primary" disabled={disabled || !target} onClick={() => void request('action', { kind: view.phase === 'wolves' ? 'attack' : 'inspect', target })}>{view.phase === 'wolves' ? tr('Confirm target', '确认目标') : tr('Reveal the truth', '查验身份')}<ArrowRight size={16} /></button>
        {view.acted && <p className="saved"><Check size={14} />{tr('Saved: ', '已保存：')}{view.players.find(p => p.id === view.selection)?.name}</p>}
      </section>;
    }
    if (view.phase === 'dawn') return null;
    if (view.phase === 'voting' && me.alive) return <VotingPanel view={view} eligible={eligible} selected={target} onSelect={setTarget} onConfirm={value => void request('vote', { target: value })} disabled={disabled} pending={pending} tr={tr} />;
    if(view.phase==='last_words'||view.phase==='discussion'&&view.mode==='classic'&&view.discussionMode==='structured')return <DayControls view={view} seconds={seconds} disabled={disabled} tr={tr} onFinish={()=>void request('finish_speaking',{turnId:view.turnId})}/>;
    if (view.phase === 'discussion') return <section className="panel instruction"><MessageCircle size={30} /><p className="eyebrow">{tr('THE FLOOR IS YOURS', '现在轮到你们发言')}</p><h2>{me.alive ? tr('Every story has a loose thread', '每个故事都有破绽') : tr('Your voice rests. Your team plays on.', '你已出局，队友仍在奋战。')}</h2><p>{me.alive ? tr('Share what you know. Ask a question. Watch who changes their story. Use the table chat or talk together aloud.', '分享线索、提出问题、留意改口的人。使用聊天区或直接语音讨论。') : tr('Follow the discussion quietly. Your faction can still win for you.', '请安静观战，你仍与自己的阵营共享胜利。')}</p><div className="notice">{view.mode === 'quick' ? tr('The wolf could be the other player—or the untouched center card. Bluffing is part of the game.', '狼人可能是另一名玩家，也可能是中央牌。大胆推理与伪装。') : tr('Voting starts automatically when the discussion ends.', '讨论结束后自动开始投票。')}</div></section>;
    const last = [...view.events].reverse().find(e => e.kind === (view.phase === 'dawn' ? 'dawn' : 'elimination') || (view.phase === 'verdict' && e.kind === 'no_elimination'));
    return <section className="panel instruction"><Moon size={30} /><h2>{phaseNames[view.phase]}</h2><p>{last ? eventText(last) : tr('Stay with the table. The next phase begins shortly.', '下一阶段即将开始，请稍候。')}</p>{view.phase === 'voting' && !me.alive && <p>{tr('Eliminated players do not vote.', '出局玩家无法投票。')}</p>}{ballotList()}</section>;
  }
  return <>
    <header className="site-header"><button className="brand" onClick={() => { if (!view) home(); }} aria-label="Moonlight"><span className="brand-mark"><Moon size={23} strokeWidth={1.5} /></span><span>moonlight<span className="brand-sub">WEREWOLF PARTY</span></span></button>
      <nav><button className="header-button" aria-label={tr('How to play', '玩法说明')} onClick={() => setRules(true)}><Info size={16} /><span>{tr('How to play', '玩法说明')}</span></button><button className="language-button" onClick={() => setLang(lang === 'en' ? 'zh' : 'en')} aria-label={tr('Switch to Chinese', '切换英文')}><Globe2 size={15} />{lang === 'en' ? 'EN / 中' : '中 / EN'}</button>{view && <button className="icon-button" onClick={home} title={tr('Home · your seat is saved', '返回首页 · 座位已保存')}><LogOut size={17} /></button>}</nav>
    </header>
    {error && <div className="error-banner" role="alert"><span>{error === 'connection' ? tr('Connection interrupted. We’re trying to reconnect. Free hosting may take a minute to wake up.', '连接中断，正在尝试重连。免费服务器唤醒可能需要一分钟。') : error === 'replaced' ? tr('This seat is open in another tab. Use that tab, or resume here to take control.', '此座位已在另一标签页打开。请使用该页面，或在此恢复。') : error === 'removed' ? tr('The host removed your seat from the lobby.', '房主已将你的座位移出大厅。') : errors[error][lang === 'en' ? 0 : 1]}</span><button className="icon-button" onClick={() => setError(null)} aria-label={tr('Dismiss', '关闭')}><X size={16} /></button></div>}
    {!view ? <main className="landing">
      <section className="hero"><div className="hero-art" aria-hidden="true"><div className="moon-disc" /><span className="star s1">✦</span><span className="star s2">✧</span><span className="star s3">✦</span><div className="mountain back" /><div className="mountain front" /><div className="moon-reflection" /></div>
        <span className="pill"><span className="status-dot" />{tr('MOONLIGHT — PLAY BEYOND BORDERS', 'MOONLIGHT — PLAY BEYOND BORDERS')}</span>
        <h1 className="positioning-title">{tr('Play Beyond', '跨越语言，')}<br /><em>{tr('Borders.', '一起推理。')}</em></h1>
        <p className="hero-promise">{tr('A bilingual Werewolf game, without a moderator.', '无需主持人的中英双语狼人杀。')}</p>
        <p className="hero-copy">{tr('Quick Chat appears in each player’s English or Chinese interface; typed chat stays as written.', '快捷短语按每位玩家的中英文界面显示，手动输入保持原文。')}</p>
        <div className="hero-actions"><a className="button primary" href={`/demo.html?lang=${lang}`}>{tr('Try the 60-second demo', '体验60秒演示')}<ArrowRight size={16} /></a><a className="button secondary" href="#join-table">{tr('Play with friends', '与好友一起玩')}</a></div>
        <p className="demo-disclosure">{tr('Scripted tour · no other players needed · not a live match', '脚本演示 · 无需其他玩家 · 非真实对局')}</p>
        <div className="hero-meta"><span><Users size={16} />{tr('Classic 5–8 · Duel 2', '经典5–8人 · 对决2人')}</span><span><Shield size={15} />{tr('No accounts. Just friends.', '无需账号，好友即玩。')}</span></div>
      </section>
      <section className="entry-card" id="join-table"><p className="eyebrow">{tr('YOUR TABLE IS WAITING', '准备与好友开局')}</p><h2>{tr('Gather under the moon', '月下集结')}</h2><p className="muted">{tr('Bring your friends. Keep your poker face.', '带上好友，藏好心事。')}</p>
        <div className="tabs" role="tablist"><button role="tab" aria-selected={tab === 'create'} className={tab === 'create' ? 'active' : ''} onClick={() => setTab('create')}>{tr('Create a room', '创建房间')}</button><button role="tab" aria-selected={tab === 'join'} className={tab === 'join' ? 'active' : ''} onClick={() => setTab('join')}>{tr('Join friends', '加入好友')}</button></div>
        <form onSubmit={enter}><label htmlFor="nickname">{tr('Your nickname', '你的昵称')}</label><input id="nickname" value={name} onChange={e => setName(e.target.value)} minLength={2} maxLength={20} placeholder={tr('What should we call you?', '大家怎么称呼你？')} required autoComplete="nickname" />
          {tab === 'join' ? <><label htmlFor="room-code">{tr('Room code', '房间号')}</label><input id="room-code" className="code-input" value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 6))} placeholder="ABC234" minLength={6} maxLength={6} required autoComplete="off" autoCapitalize="characters" spellCheck={false} /></> : <><label>{tr('Choose your story', '选择模式')}</label><div className="mode-options"><button type="button" className={mode === 'classic' ? 'mode selected' : 'mode'} onClick={() => setMode('classic')}><Moon size={20} /><span><strong>{tr('Classic', '经典模式')}</strong><small>{tr('5–8 players · The full mystery', '5–8人 · 完整推理体验')}</small></span>{mode === 'classic' && <Check size={16} />}</button><button type="button" className={mode === 'quick' ? 'mode selected' : 'mode'} onClick={() => setMode('quick')}><Users size={20} /><span><strong>{tr('Moonlight Duel', '月光对决')}</strong><small>{tr('2 players · One quick secret', '2人 · 一夜的秘密')}</small></span>{mode === 'quick' && <Check size={16} />}</button></div></>}
          <button type="submit" className="button primary full" disabled={pending || connecting}>{connecting || pending ? tr('Finding your table…', '正在寻找牌桌…') : tab === 'create' ? tr('Create my room', '创建我的房间') : tr('Join the table', '加入牌桌')}<ArrowRight size={18} /></button>
        </form><p className="entry-footnote"><Link size={13} />{tr('Private room. Share a code. Play anywhere.', '私人房间，分享号码，随时开局。')}</p>
        {savedSeat && <button className="resume-button" disabled={connecting} onClick={resume}>{tr(`Resume your table · ${savedSeat.code}`, `恢复你的牌桌 · ${savedSeat.code}`)}<ArrowRight size={14} /></button>}
      </section>
      <BeginnerGuide tr={tr} />
      <section className="cast-preview"><div className="cast-preview-heading"><div><p className="eyebrow">{tr('FOUR FACES OF THE NIGHT', '黑夜的四张面孔')}</p><h2>{tr('Everyone has another side.', '每个人，都有另一面。')}</h2></div><p>{tr('One village. Four roles. A thousand ways to keep a secret.', '一座村庄，四种身份，千百种守住秘密的方式。')}</p></div><div className="cast-preview-grid">{(Object.keys(roleNames) as Role[]).map(role => <div className={`cast-preview-card role-${role}`} key={role}><Portrait role={role} decorative /><div><span>{tr('THE', '身份')}</span><h3>{roleName(role)}</h3></div></div>)}</div></section>
      <section className="landing-bottom"><div><span className="section-kicker">01 / {tr('THE GATHERING', '集结')}</span><h3>{tr('One link. Everyone in.', '一条链接，好友齐聚。')}</h3><p>{tr('Join on your phone or computer. No downloads, no sign-ups.', '手机电脑都能加入，无需下载或注册。')}</p></div><div><span className="section-kicker">02 / {tr('THE SECRET', '秘密')}</span><h3>{tr('A role only you know.', '只有你知道的身份。')}</h3><p>{tr('The night has its own rules. Your private card shows the way.', '黑夜自有规则，你的身份牌将指引行动。')}</p></div><div><span className="section-kicker">03 / {tr('THE REVEAL', '揭晓')}</span><h3>{tr('Trust your instincts.', '相信你的直觉。')}</h3><p>{tr('Talk it through, cast your vote, and see who fooled whom.', '讨论推理，投出一票，看看谁骗过了谁。')}</p></div></section>
    </main> : <main className={`game-shell phase-${view.phase} ${view.winner ? `result-${view.winner}` : ''}`}>
      <div className="table-heading"><div><p className="eyebrow">{view.mode === 'classic' ? tr('CLASSIC · 5–8 PLAYERS', '经典模式 · 5–8人') : tr('MOONLIGHT DUEL · 2 PLAYERS', '月光对决 · 2人')}</p><h1>{phaseNames[view.phase]}</h1></div><div className="room-code-block"><span>{tr('ROOM', '房间')}</span><button onClick={() => void copyRoom(false)}>{view.code}<Copy size={14} /></button><button className="icon-button" onClick={() => void copyRoom(true)} title={tr('Copy invitation link', '复制邀请链接')}><Link size={16} /></button></div></div>
      {!connected && <div className="notice reconnect"><WifiOff size={18} />{tr('Reconnecting… your seat and role are saved in this browser. Actions are disabled until connected.', '正在重连…此浏览器已保存你的座位与身份，连接恢复前无法操作。')}</div>}
      <SoundControls scene={{ code: view.code, mode: view.mode, day: view.day, phase: view.phase, deadline: view.deadline, winner: view.winner, dawn: publishedDawnCue(view) }} language={lang} connected={connected} tr={tr} clockOffset={offset.current} />
      {view.phase !== 'lobby' && view.phase !== 'ended' && <div className="phase-bar"><div className="phase-steps">{stageLabels.map((label, i) => <span key={label} className={currentStage === i ? 'current' : ''}><i>{i + 1}</i>{label}</span>)}</div><div className={`timer ${seconds <= 10 ? 'urgent' : ''}`} aria-label={tr('Time remaining', '剩余时间')}>{view.mode === 'classic' && <small>{tr(`DAY ${view.day}`, `第${view.day}天`)}</small>}<span>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</span></div></div>}
      {view.mode === 'classic' && (isNight || view.phase === 'dawn') && <NightSequence phase={view} language={lang} tr={tr} />}
      <div className="game-grid"><div className="main-column">
        {view.phase === 'lobby' ? <section className="panel lobby-panel"><div className="lobby-moon"><Moon size={38} strokeWidth={1} /></div><p className="eyebrow">{tr('A FEW FRIENDS. A LITTLE SUSPICION.', '好友相聚，推理开局。')}</p><h2>{tr('Make room for mystery', '集结好友，准备开局')}</h2><p>{tr('Share your invitation. Everyone chooses Ready, then the host begins the story.', '分享邀请，所有玩家点击准备后，由房主开始游戏。')}</p>
          <button className="button secondary" onClick={() => void copyRoom(true)}><Copy size={16} />{tr('Copy invitation link', '复制邀请链接')}</button>
          <div className="lobby-composition">{view.mode === 'classic' ? <><span><Moon size={17} />{view.players.length >= 7 ? '2' : '1'} {tr('Werewolf', '狼人')}</span><span><Eye size={17} />1 {tr('Seer', '预言家')}</span><span><FlaskConical size={17} />1 {tr('Witch', '女巫')}</span><span><Shield size={17} />{tr('Remaining villagers', '其余为村民')}</span></> : <span>{tr('1 Werewolf + 2 Villagers · one card hidden in the center', '1张狼人 + 2张村民 · 一张牌藏在中央')}</span>}</div>
          <div className="lobby-actions"><button className={`button ${me?.ready ? 'secondary' : 'primary'}`} disabled={pending || !connected} onClick={() => void request('ready', { ready: !me?.ready })}>{me?.ready ? <Check size={18} /> : <Shield size={18} />}{me?.ready ? tr('Ready · undo', '已准备 · 取消') : tr('I’m ready', '我准备好了')}</button>{isHost && <button className="button primary" disabled={lobbyBlockers(view,connected,pending,tr).length>0} onClick={() => void request('start', {})}>{tr('Begin the story', '开始故事')}<ArrowRight size={17} /></button>}</div>
          <LobbyReadiness view={view} connected={connected} pending={pending} tr={tr}/>
          {isHost&&view.mode==='classic'&&<DiscussionSettings view={view} disabled={pending||!connected} tr={tr} onChange={(discussionMode,turnSeconds)=>void request('discussion_settings',{discussionMode,turnSeconds})}/>}
          {isHost && <div className="host-settings"><label htmlFor="lobby-mode">{tr('Game mode', '游戏模式')}</label><select id="lobby-mode" value={view.mode} disabled={pending || !connected} onChange={e => void request('mode', { mode: e.target.value })}><option value="classic">{tr('Classic · 5–8 players', '经典模式 · 5–8人')}</option><option value="quick" disabled={view.players.length > 2}>{tr('Moonlight Duel · 2 players', '月光对决 · 2人')}</option></select></div>}
          <p className="small muted">{tr('Refresh restores your seat. If the host leaves, return in the same browser. Server restarts end rooms in this early version.', '刷新可恢复座位。房主离线后需使用原浏览器返回。本测试版本在服务器重启后会结束房间。')}</p>
        </section> : <>{publishedDawn(view) && <DawnResult event={publishedDawn(view)!} tr={tr} roleName={roleName} />}<div className="phase-scene" key={`${view.day}-${view.phase}`}>{actionPanel()}</div>{seconds > 0 && view.phase === 'wolves' && view.packChat && <PackChat key={view.code+view.packChat.stageId} view={view} connected={connected} language={lang} tr={tr} send={sendPack}/>} {['discussion','last_words'].includes(view.phase) && discussionChat()}{view.phase==='reveal'&&roleCard()}{view.mode==='quick'&&view.phase!=='reveal'&&view.phase!=='ended'&&(view.phase==='discussion'?<details className="private-pocket"><summary><EyeOff size={16}/>{tr('Your private character card','你的秘密身份牌')}</summary>{roleCard()}</details>:roleCard())}{view.phase !== 'ended' && view.phase !== 'reveal' && !!view.events.length && <section className="panel journal"><p className="eyebrow">{tr('THE STORY SO FAR', '故事进展')}</p>{view.events.slice(-4).map(event => <p key={event.id}>{eventText(event)}</p>)}</section>}{view.phase === 'ended' && <section className="panel journal"><p className="eyebrow">{tr('A NIGHT TO REMEMBER', '今夜回顾')}</p>{view.events.map(event => <p key={event.id}>{eventText(event)}</p>)}</section>}</>}
      </div><aside className="side-column">{view.mode==='classic'&&!['lobby','reveal','ended'].includes(view.phase)&&<IdentityPanel key={`${view.code}/${view.day}/${view.phase}`} view={view} tr={tr} roleName={roleName} description={view.role?roleDescriptions[view.role][lang==='en'?0:1]:''}/>}<section className="panel players-panel"><div className="panel-title"><h3><Users size={17} />{tr('At the table', '牌桌上的玩家')}</h3><span>{view.players.length}/{view.mode === 'classic' ? 8 : 2}</span></div><div className="player-list">{view.players.map(p => <div className={`player-row ${!p.alive ? 'eliminated' : ''}`} key={p.id}><ParticipantAvatar player={p}><i className={p.connected?'online-dot':'offline-dot'}/></ParticipantAvatar><div><strong>{p.name}{p.id === view.youId && <small> {tr('(you)', '(你)')}</small>}</strong><span>{view.phase==='lobby' ? `${p.id===view.hostId?tr('Host · ','房主 · '):''}${!p.connected?tr('Offline','已离线'):p.ready?tr('Ready','已准备'):tr('Not ready','未准备')}` : p.role ? roleName(p.role) : p.id === view.hostId ? tr('Host', '房主') : p.connected ? tr('At the table', '已入座') : tr('Reconnecting', '等待重连')}{!p.alive && ` · ${tr('Eliminated', '已出局')}`}</span></div>{view.phase === 'lobby' && p.ready && <Check className="ready-check" size={17} />}{view.phase === 'lobby' && isHost && p.id !== view.youId && <button className="icon-button remove-player" title={tr('Remove from lobby', '移出大厅')} disabled={pending || !connected} onClick={() => void request('remove', { playerId: p.id })}><X size={14} /></button>}</div>)}</div><div className="connection-status">{connected ? <Wifi size={13} /> : <WifiOff size={13} />}{connected ? tr('Live · synchronized with the table', '实时 · 已与牌桌同步') : tr('Connection interrupted', '连接已中断')}</div></section>
        {showChat && !['discussion','last_words'].includes(view.phase) && discussionChat()}
        {isNight && <div className="night-note"><Moon size={18} /><p>{tr('Night actions stay private. The table chat returns at dawn.', '夜间行动保密，黎明后恢复聊天。')}</p></div>}
      </aside></div>
    </main>}
    <footer className="site-footer"><span>moonlight <span className="footer-star">✦</span> {tr('Some secrets are better shared.', '有些秘密，值得一起揭开。')}</span><span>{tr('Made for nights together', '为相聚的夜晚而作')} · <a href="/THIRD_PARTY_NOTICES.txt" target="_blank" rel="noreferrer">{tr('Credits & licenses', '署名与许可')}</a></span></footer>
    {toast && <div className="toast" role="status"><Check size={16} />{toast}</div>}
    {rules && <div className="modal-backdrop" onClick={() => setRules(false)}><section className="modal rules-modal" role="dialog" aria-modal="true" aria-labelledby="rules-title" onClick={e => e.stopPropagation()}><button className="modal-close icon-button" onClick={() => setRules(false)} aria-label={tr('Close rules', '关闭规则')}><X size={20} /></button><p className="eyebrow">{tr('A FIELD GUIDE TO THE NIGHT', '夜晚生存指南')}</p><h2 id="rules-title">{tr('Everyone has a secret', '人人都有秘密')}</h2><BeginnerGuide tr={tr} /><p>{tr('Classic · 5–8 friends. The village must eliminate every wolf. Wolves win when they equal or outnumber the other living players.', '经典模式 · 5–8位好友。好人阵营需找出并消灭所有狼人；存活狼人数量达到或超过其他存活玩家时，狼人阵营获胜。')}</p><div className="rules-roles">{(Object.keys(roleNames) as Role[]).map(role => { const Icon = icons[role]; return <div key={role}><Icon size={24} /><div><h3>{roleName(role)}</h3><p>{roleDescriptions[role][lang === 'en' ? 0 : 1]}</p></div></div>; })}</div><h3>{tr('How the night works', '夜间规则')}</h3><p>{tr('Wolves choose a non-wolf; tied leading wolf targets are chosen randomly; with no valid votes, an eligible target is chosen randomly. The Seer checks one other player. The Witch may heal the wolf victim (including herself) OR poison another player, using each potion once per game. Deaths resolve together at dawn. Night slots always keep the same length.', '狼人选择好人阵营的目标，最高票平票时随机选一名；无人提交有效选择时，随机选择可袭击的玩家。预言家查验一人。女巫可救下被狼人袭击者（包括自己），或毒杀另一人。每瓶药整局仅可用一次，每夜最多一瓶。所有死亡在黎明同时结算，夜间阶段时长固定。')}</p><h3>{tr('Talk, then vote', '先讨论，再投票')}</h3><p>{tr('Classic defaults to seat-order discussion, 45 seconds each (host can choose 30/45/60). Only the current speaker can chat or finish early; timed turns advance automatically. Structured daytime eliminations get 30-second last words, then victory resolves. Open Discussion allows all living players to chat for 2 minutes. Night deaths have no last words. Secret voting lasts up to 30 seconds and ends as soon as every living player confirms. Changes must be confirmed while voting is open. A unique leading player must beat Abstain to be eliminated; ties mean no elimination. Missing ballots count as Abstain. Eliminated roles are revealed. Dead players watch quietly. Three full cycles without any deaths, or everyone dying together, is a draw.', '经典模式默认按座位轮流发言，每人45秒（房主开局前可选30/45/60秒）。只有当前发言者可以发送消息或提前结束，超时自动轮换。轮流发言模式的白天投票出局者有30秒遗言，之后结算胜负。自由讨论模式中所有存活玩家可同时讨论2分钟。夜间出局没有遗言。秘密投票最多30秒，所有存活玩家确认后立即结算。投票开放期间，更改需再次确认。唯一最高票玩家且票数超过弃票时出局，否则无人出局。未投票视为弃票。出局身份公开，出局玩家安静观战。连续三个完整昼夜无人死亡，或所有人同时死亡，则为平局。')}</p><h3>{tr('The cast', '身份配置')}</h3><p>{tr('5 players: 1 wolf, 2 villagers, Seer, Witch. 6: add a villager. 7: 2 wolves, 3 villagers, Seer, Witch. 8: add a villager.', '5人：1狼、2村民、预言家、女巫。6人：增加1村民。7人：2狼、3村民、预言家、女巫。8人：增加1村民。')}</p><h3>{tr('Moonlight Duel · 2 players', '月光对决 · 2人')}</h3><p>{tr('Deal 1 wolf and 2 villagers between two players and a hidden center card. Discuss for 90 seconds, then guess: other player or center. If a player is the wolf, the Villager’s correct guess wins; the wolf’s guess is a decoy. If neither player is a wolf, both must choose center. Missing guesses are incorrect. No night kills or Seer. A light bluffing duel; Classic is the fuller experience.', '将1张狼人牌与2张村民牌分给两位玩家及中央暗牌。讨论90秒后，指认狼人位于另一名玩家或中央。若玩家中有狼人，唯一村民猜对则好人阵营获胜，否则狼人阵营获胜；狼的指认为伪装。若两人都是村民，两人都猜中央才获胜。未指认视为错误。没有夜杀或预言家，是轻量的两人推理体验。')}</p><h3>{tr('Stay connected', '保持连接')}</h3><p>{tr('Refresh in the same browser to restore your seat. Room codes cannot recover someone else’s role. Keep the host’s tab available for rematches. Free servers may take a minute to wake; a server restart ends active rooms in this MVP.', '使用原浏览器刷新可恢复座位。房间号无法恢复他人身份。请房主保留页面以便再来一局。免费服务器唤醒可能需一分钟，本版本服务器重启将结束房间。')}</p><button className="button primary full" onClick={() => setRules(false)}>{tr('I’m ready for the moon', '准备迎接月光')}<ArrowRight size={17} /></button></section></div>}
    {confirm && <div className="modal-backdrop"><section className="modal confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title"><FlaskConical size={28} /><h2 id="confirm-title">{confirm.kind === 'heal' ? tr('Use your healing potion?', '使用解药？') : tr('Use your poison potion?', '使用毒药？')}</h2><p>{tr('This potion can only be used once per game. You cannot change this action after confirming.', '此药整局只能使用一次。确认后无法更改行动。')}</p>{confirm.kind === 'poison' && <p className="private-note">{tr('Target: ', '目标：')}{view?.players.find(p => p.id === confirm.target)?.name}</p>}<div className="confirm-actions"><button className="button secondary" onClick={() => setConfirm(null)}>{tr('Go back', '返回')}</button><button className="button primary" disabled={disabled} onClick={() => { void request('action', confirm); setConfirm(null); }}>{tr('Confirm potion', '确认用药')}</button></div></section></div>}
  </>;
}

createRoot(document.getElementById('root')!).render(<App />);
