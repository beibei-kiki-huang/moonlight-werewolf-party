import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronDown, Eye, EyeOff, FlaskConical, Hourglass, Languages, MessageCircle, Moon, Send, Shield, Sparkles, Users, Vote, Sunrise } from 'lucide-react';
import type { ChatMessage, GameView, PublicPlayer, Role } from '../shared/types';
import {ParticipantAvatar,participantStyle} from './Participant';
import { phaseScript, type Language, type PublicPhase } from '../shared/publicPhase';
import { isQuickPhraseId, QUICK_PHRASES, QUICK_PHRASE_IDS, type QuickPhraseId } from '../shared/quickChat';

export type Translate = (en: string, zh: string) => string;
export function NightSequence({ phase, language, tr }: { phase: PublicPhase; language: Language; tr: Translate }) {
  const slots = ['nightfall', 'wolves', 'seer', 'witch', 'dawn'];
  const labels = [tr('Nightfall', '入夜'), tr('Wolves', '狼人'), tr('Seer', '预言家'), tr('Witch', '女巫'), tr('Dawn', '黎明')];
  return <section className={`night-sequence ${phase.phase === 'dawn' ? 'is-dawn' : ''}`} aria-label={tr('Public night guidance', '公开夜间引导')}>
    <div className="night-moon" aria-hidden="true">{phase.phase === 'dawn' ? <Sunrise size={38} strokeWidth={1} /> : <Moon size={38} strokeWidth={1} />}</div>
    <p className="eyebrow">{tr('THE VOICE OF THE VILLAGE', '村庄之声')}</p>
    <p className="night-script" role="status">{phaseScript(phase, language)}</p>
    <ol className="night-schedule">{slots.map((slot, i) => <li key={slot} aria-current={phase.phase === slot ? 'step' : undefined}><span />{labels[i]}</li>)}</ol>
    <small>{tr('A fixed nightly ritual. Every stage runs in full, even when a role cannot act.', '固定的夜间流程。即使某身份无法行动，每阶段仍完整进行。')}</small>
  </section>;
}
type RoleName = (role: Role) => string;
const roleIcons = { werewolf: Moon, villager: Shield, seer: Eye, witch: FlaskConical };
const lore: Record<Role, [string, string]> = {
  werewolf: ['The Hunter', '夜行猎手'],
  villager: ['The Ordinary Hero', '平凡的英雄'],
  seer: ['The Divine Oracle', '神谕先知'],
  witch: ['The Keeper of Life and Death', '生死守望者'],
};
const descriptions: Record<Role, [string, string]> = {
  werewolf: ['Hide in plain sight. Hunt with your pack at night, and turn suspicion away by day.', '隐藏你的身份。夜晚与同伴狩猎，白天转移怀疑。'],
  villager: ['Your power is your instinct. Listen closely, find the wolves, and make your vote count.', '你的力量是直觉。仔细倾听、找出狼人、投出关键一票。'],
  seer: ['Look beyond appearances. Each night, learn whether one other player is a werewolf.', '你属于好人阵营。每晚可以查验一名其他存活玩家，得知对方是否属于狼人阵营。利用你掌握的信息，帮助好人找出所有狼人。'],
  witch: ['Two potions. Two chances to change fate. Save a life or take one—choose carefully.', '两瓶药水，两次改变命运的机会。救人或毒杀，请谨慎选择。'],
};
export function Portrait({ role, className = '', decorative = false, name, small = false }: { role: Role; className?: string; decorative?: boolean; name?: string; small?: boolean }) {
  return <img className={`character-portrait ${className}`} src={`/art/v2/${role}-${small ? 120 : 360}.webp`}
    srcSet={small ? undefined : `/art/v2/${role}-360.webp 360w, /art/v2/${role}-720.webp 720w`}
    sizes={small ? undefined : '(max-width: 680px) 340px, 310px'} width={small ? 120 : 360} height={small ? 180 : 540}
    alt={decorative ? '' : name || role} decoding="async" />;
}

export function RoleCard({ view, visible, onToggle, tr, roleName }: { view: GameView; visible: boolean; onToggle: () => void; tr: Translate; roleName: RoleName }) {
  if (!view.role) return null;
  const role = view.role;
  const Icon = roleIcons[role];
  const description = view.mode === 'quick'
    ? role === 'werewolf'
      ? tr('Convince your opponent the wolf is in the center. Your accusation is a decoy; the Villager’s guess decides your fate.', '说服对方狼人藏在中央。你的指认只是伪装，村民的猜测决定胜负。')
      : tr('Is the wolf your opponent or the center card? Guess correctly to win. If you are both Villagers, both must choose center.', '狼人是对方还是中央牌？猜对即可获胜；若两人都是村民，则都需猜中央。')
    : tr(...descriptions[role]);
  return <section className={`character-card ${visible ? `is-revealed role-${role}` : 'is-concealed'}`} aria-label={tr('Your private character card', '你的秘密身份牌')}>
    <div className="card-illustration">
      {visible ? <Portrait role={role} name={tr(`${roleName(role)} character illustration`, `${roleName(role)}身份插画`)} />
        : <button className="card-back" onClick={onToggle} aria-label={tr('Reveal my role', '查看身份')}><span className="back-stars" aria-hidden="true">✧ &nbsp; · &nbsp; ✦</span><span className="moon-seal"><Moon size={64} strokeWidth={.7} /></span><span className="back-wordmark">moonlight</span><span className="back-caption">WEREWOLF PARTY</span><span className="back-invitation"><Eye size={17} />{tr('Tap to reveal', '轻触揭晓身份')}</span></button>}
      {visible && <button className="portrait-hide" onClick={onToggle} aria-label={tr('Hide my private card immediately', '立即隐藏身份')}><EyeOff size={15} /><span>{tr('Hide', '隐藏')}</span></button>}
      <span className="card-corner corner-tl" /><span className="card-corner corner-tr" /><span className="card-corner corner-bl" /><span className="card-corner corner-br" />
      {visible && <span className="portrait-caption"><Icon size={15} />{tr('YOUR SECRET IDENTITY', '你的秘密身份')}</span>}
    </div>
    <div className="card-story">
      <p className="eyebrow"><span className="tiny-star">✦</span>{tr('FOR YOUR EYES ONLY', '仅你可见')}</p>
      <h2>{visible ? roleName(role) : tr('A secret awaits', '秘密静候揭晓')}</h2>
      <p className="character-lore">{visible ? tr(...lore[role]) : tr('The moon has chosen your part in the story.', '月亮已为你选定故事中的身份。')}</p>
      <div className="silver-divider" aria-hidden="true"><span />✧<span /></div>
      <p className="character-ability">{visible ? description : tr('Make sure only you can see your screen. Your role stays hidden until you open this card.', '请确保只有你能看到屏幕。轻触身份牌后，秘密才会揭晓。')}</p>
      {visible ? <button className="button secondary hide-role" onClick={onToggle}><EyeOff size={16} />{tr('Hide my role', '隐藏身份')}</button>
        : <p className="card-privacy-hint"><Shield size={14} />{tr('Your card is private. Even the host cannot see it.', '你的身份保密，房主也无法查看。')}</p>}
      {visible && role === 'werewolf' && view.mode === 'classic' && <div className="private-note"><Moon size={14} />{tr('Your pack: ', '你的狼队：')}{view.players.filter(p => view.wolfTeam?.includes(p.id) && p.id !== view.youId).map(p => p.name).join(', ') || tr('You hunt alone.', '你是独狼。')}</div>}
      {visible && role === 'seer' && !!view.investigations?.length && <div className="private-note">{view.investigations.map(i => <p key={i.day}>{tr(`Night ${i.day}`, `第${i.day}夜`)} · {i.name}: <strong>{i.isWolf ? tr('Werewolf Team', '狼人阵营') : tr('Good Team', '好人阵营')}</strong></p>)}</div>}
    </div>
  </section>;
}

function choiceName(value: string | undefined, view: GameView, tr: Translate) {
  return value === 'skip' ? tr('Abstain', '弃票') : value === 'other'
    ? tr('The other player', '另一名玩家') : value === 'center' ? tr('The center card', '中央身份牌')
    : view.players.find(p => p.id === value)?.name || '';
}
export function VotingPanel({ view, eligible, selected, onSelect, onConfirm, disabled, pending, tr }: {
  view: GameView; eligible: PublicPlayer[]; selected: string; onSelect: (id: string) => void;
  onConfirm: (id: string) => void; disabled: boolean; pending: boolean; tr: Translate;
}) {
  const draft = selected || view.selection || '';
  const changed = !!draft && draft !== view.selection;
  const saved = view.acted && !changed;
  const quick = view.mode === 'quick';
  const runoff=view.phase==='runoff';
  const choices = quick ? [{ id: 'other', name: tr('The other player', '另一名玩家'), note: view.players.find(p => p.id !== view.youId)?.name }, { id: 'center', name: tr('The center card', '中央身份牌'), note: tr('An untouched secret', '无人触碰的秘密') }]
    : [...eligible.map(p => ({ id: p.id, name: p.name, note: tr('At the table', '牌桌上的玩家') })), { id: 'skip', name: tr('Abstain', '弃票'), note: tr('Cast no accusation', '不指认任何玩家') }];
  return <section className="panel voting-panel">
    <div className="section-heading"><span className="section-icon"><Vote size={23} /></span><div><p className="eyebrow">{tr('THE MOMENT OF TRUTH', '真相时刻')}</p><h2>{quick ? tr('Where is the wolf?', '狼人在哪里？') : runoff?tr('Runoff · tied candidates','加赛 · 平票候选人'):tr('Who do you believe?', '你会相信谁？')}</h2></div></div>
    <p className="voting-intro">{quick ? tr('A face across the table, or a card in the dark. Make your accusation.', '是对面的那个人，还是暗藏的中央牌？作出你的指认。') : tr('Choose a suspect, or give the village another night. Your ballot stays secret until the reveal.', '选择嫌疑人，或让村庄再等一夜。揭晓前，你的选票始终保密。')}</p>
    {runoff&&<p>{tr('Only other living players vote. One runoff only; another tie or all abstain means no elimination.','仅平票候选人以外的存活玩家投票。只加赛一次，再次平票或全部弃票则无人出局。')}</p>}<div className="vote-progress" aria-label={tr('Your ballot progress', '你的投票进度')}><span className="complete"><i>1</i>{tr('Choose', '选择')}</span><span className={view.acted ? 'complete' : draft ? 'active' : ''}><i>2</i>{tr('Confirm', '确认')}</span><span className={saved ? 'active' : ''}><i>3</i>{tr('Await reveal', '等待揭晓')}</span></div>
    <div className={`vote-options ${quick ? 'duel-options' : ''}`}>{choices.map(choice => {
      const confirmed = view.acted && view.selection === choice.id;
      const chosen = draft === choice.id;
      return <button type="button" key={choice.id} className={`vote-choice ${choice.id === 'skip' ? 'skip-choice' : ''} ${chosen ? 'is-selected' : ''} ${confirmed ? 'is-confirmed' : ''}`} aria-pressed={chosen} style={participantStyle(view.players.find(p=>p.id===choice.id))} disabled={disabled} onClick={() => onSelect(choice.id)}>
        <span className={`vote-avatar ${choice.id === 'center' ? 'center-avatar' : ''}`}>{choice.id === 'center' ? <Moon size={35} strokeWidth={1} /> : choice.id === 'skip' ? <Shield size={22} /> : quick ? <Users size={30} strokeWidth={1.2} /> : choice.name.slice(0, 1).toUpperCase()}</span>
        <span className="vote-person"><strong>{choice.name}</strong><small>{choice.note}</small></span>
        <span className="vote-check">{chosen || confirmed ? <Check size={17} /> : <span />}</span>
        {(chosen || confirmed) && <span className="vote-choice-state">{confirmed ? tr('CONFIRMED', '已确认') : tr('SELECTED', '已选择')}</span>}
      </button>;
    })}</div>
    <div className={`ballot-receipt ${saved ? 'receipt-confirmed' : ''}`} role="status" aria-live="polite">
      {saved ? <><span className="receipt-icon"><Check size={21} /></span><div><strong>{tr('Your vote is confirmed', '你的投票已确认')}</strong><p>{choiceName(view.selection, view, tr)} · {tr('Waiting for the reveal', '等待揭晓')}</p></div></>
        : <><span className="receipt-icon"><Vote size={21} /></span><div><strong>{draft ? tr('Ready to seal your choice?', '准备确认你的选择？') : tr('Your ballot is still empty', '你还没有投票')}</strong><p>{draft ? `${choiceName(draft, view, tr)} · ${tr('Not confirmed yet', '尚未确认')}` : tr('Select an option above, then confirm below.', '先在上方选择，再点击下方确认。')}</p></div></>}
    </div>
    <button className={`button primary confirm-vote ${saved ? 'confirmed-button' : ''}`} disabled={disabled || !draft || saved} onClick={() => onConfirm(draft)}>{pending ? <Hourglass size={18} /> : saved ? <Check size={18} /> : <Vote size={18} />}{pending ? tr('Saving your ballot…', '正在保存选票…') : saved ? tr('Vote confirmed', '投票已确认') : view.acted ? tr('Confirm new vote', '确认更改投票') : tr('Confirm my vote', '确认投票')}{!saved && !pending && <ArrowRight size={17} />}</button>
    <p className="ballot-footnote"><Shield size={13} />{tr('Your ballot stays private until resolution. All eligible players confirmed? Voting ends immediately. Otherwise it ends at the deadline. Reconfirm changes while voting is open.', '结算前选票保密。所有合格投票者确认后立即结算，否则在倒计时结束时结算。投票开放期间，更改需再次确认。')}</p>
    {view.acted && changed && <p className="previous-vote">{tr('Your saved vote is still: ', '当前已保存的投票仍为：')}{choiceName(view.selection, view, tr)}</p>}
  </section>;
}

export function Outcome({ view, host, disabled, onRematch, tr, roleName, ballots }: { view: GameView; host: boolean; disabled: boolean; onRematch: () => void; tr: Translate; roleName: RoleName; ballots: React.ReactNode }) {
  const draw = view.winner === 'draw';
  const won = !draw && (view.role === 'werewolf') === (view.winner === 'wolves');
  const art: Role = view.winner === 'wolves' ? 'werewolf' : draw ? 'seer' : 'villager';
  const title = draw ? tr('A story unfinished.', '故事，未完待续。') : view.winner === 'village' ? tr('The light prevails.', '曙光，终将到来。') : tr('The wolves reign.', '今夜，群狼加冕。');
  return <section className={`outcome-scene outcome-${view.winner}`}>
    <div className="outcome-hero"><Portrait role={art} decorative className="outcome-art" /><div className="outcome-veil" /><div className="outcome-copy">
      <p className="eyebrow">✦ &nbsp;{draw ? tr('A DRAW UNDER THE MOON', '月下平局') : view.winner === 'village' ? tr('VILLAGE VICTORY', '好人阵营获胜') : tr('WEREWOLF VICTORY', '狼人阵营获胜')}</p>
      <h2>{title}</h2><p className="outcome-poem">{draw ? tr('Neither shadow nor silver claimed this moon. Some mysteries ask for another night.', '银光与暗影，今夜未分高下。有些谜题，值得再等一个夜晚。') : view.winner === 'village' ? tr('Through whispers and doubt, the village found its way back to the light.', '穿过低语与猜疑，村庄终于寻回了光明。') : tr('Behind familiar faces, the wolves kept their secret. The village belongs to the moon.', '熟悉的面孔下，群狼守住了秘密。今夜的村庄，属于月亮。')}</p>
      <div className={`personal-outcome ${won ? 'you-won' : ''}`}><span>{draw ? <Moon size={19} /> : won ? <Sparkles size={19} /> : <Shield size={19} />}</span><div><strong>{draw ? tr('A shared draw', '双方平局') : won ? tr('You won with your faction', '你与阵营一同获胜') : tr('Your faction fell this night', '你的阵营今夜落败')}</strong><small>{draw ? tr('Another gathering. Another chance.', '再度相聚，再续悬念。') : won ? tr('Well played. Your secret became your strength.', '精彩的一局，你的秘密成为了力量。') : tr('Every good mystery deserves a rematch.', '每一场精彩的推理，都值得再来一局。')}</small></div></div>
      {host ? <button className="button primary rematch-button" disabled={disabled} onClick={onRematch}>{tr('Play another night', '再赴月下之约')}<ArrowRight size={18} /></button> : <div className="host-waiting"><Hourglass size={16} />{tr('Waiting for the host to gather everyone again.', '等待房主召集大家开启下一局。')}</div>}
    </div></div>
    <div className="outcome-cast"><div className="cast-heading"><p className="eyebrow">{tr('BEHIND EVERY MASK', '面具之后')}</p><h3>{tr('The secrets we kept', '我们守过的秘密')}</h3></div><div className="reveal-grid">{view.players.map(p => <div key={p.id} className={`reveal-person role-${p.role} ${p.id === view.youId ? 'your-result' : ''}`}><Portrait role={p.role!} small decorative /><div><strong>{p.name}{p.id === view.youId && <small>{tr(' · you', ' · 你')}</small>}</strong><span>{roleName(p.role!)}</span></div></div>)}</div>
      {view.centerRole && <div className="center-reveal"><Portrait role={view.centerRole} small decorative /><div><span>{tr('THE HIDDEN CENTER CARD', '隐藏的中央身份牌')}</span><strong>{roleName(view.centerRole)}</strong></div></div>}
      {view.ballots && <details className="result-ballots"><summary>{tr('See the final ballots', '查看最终投票')}<ChevronDown size={15} /></summary>{ballots}</details>}
    </div>
  </section>;
}

export function ChatMessageContent({ message, language, tr }: { message: ChatMessage; language: Language; tr: Translate }) {
  if (!isQuickPhraseId(message.phraseId)) return <p>{message.text}</p>;
  const phrase = QUICK_PHRASES[message.phraseId];
  const other = language === 'en' ? 'zh' : 'en';
  return <><p lang={language === 'zh' ? 'zh-CN' : 'en'}>{phrase[language]}</p><div className="preset-tools"><span>{tr('Quick Chat', '快捷短语')}</span>
    <details className="phrase-learning"><summary aria-label={tr('See this phrase in Chinese', '查看这句话的英文')} title={tr('See this phrase in Chinese', '查看这句话的英文')}><Languages size={14} /><span>{other === 'zh' ? '中' : 'EN'}</span></summary><p className="phrase-equivalent" lang={other === 'zh' ? 'zh-CN' : 'en'}>{phrase[other]}</p></details>
  </div></>;
}

export function DiscussionChat({ view, canChat, connected, pending, send, sendQuick, language, tr }: { view: GameView; canChat: boolean; connected: boolean; pending: boolean; send: (text: string) => Promise<boolean>; sendQuick: (phraseId: QuickPhraseId) => Promise<boolean>; language: Language; tr: Translate }) {
  const [text, setText] = useState('');
  const [unread, setUnread] = useState(0);
  const list = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const previous = useRef(view.chat.length);
  const picker = useRef<HTMLDetailsElement>(null);
  const sendingQuick = useRef(false);
  const discussion = view.phase === 'discussion' || view.phase === 'tie_discussion' || view.phase === 'last_words';
  const currentSpeaker=view.players.find(p=>p.id===(view.phase==='last_words'?view.lastWordsPlayerId:view.speakerId));
  const waitingTurn=!!view.players.find(p=>p.id===view.youId)?.alive&&(view.phase==='tie_discussion'||view.phase==='discussion'&&view.discussionMode==='structured')&&!canChat;
  const lastId = view.chat.at(-1)?.id;
  useEffect(() => {
    const count = Math.max(0, view.chat.length - previous.current); previous.current = view.chat.length;
    if (nearBottom.current || view.chat.at(-1)?.playerId === view.youId) {
      if (list.current) list.current.scrollTop = list.current.scrollHeight;
      setUnread(0);
    } else setUnread(n => n + (count || 1));
  }, [lastId, view.chat.length, view.youId]);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); const message = text.trim(); if (!message || !canChat || pending) return;
    if (await send(message)) { setText(''); nearBottom.current = true; if (list.current) list.current.scrollTop = list.current.scrollHeight; }
  }
  async function choosePhrase(phraseId: QuickPhraseId) {
    if (!canChat || !connected || pending || sendingQuick.current) return;
    sendingQuick.current = true;
    try {
      if (await sendQuick(phraseId)) { if (picker.current) picker.current.open = false; nearBottom.current = true; }
    } finally { sendingQuick.current = false; }
  }
  return <section className={`panel discussion-chat ${discussion ? 'discussion-open' : ''}`} id="table-chat">
    <div className="chat-heading"><span className="chat-heading-icon"><MessageCircle size={23} /></span><div><p className="eyebrow">{discussion ? tr('EVERY VOICE LEAVES A CLUE', '每句话，都藏着线索') : tr('AROUND THE TABLE', '围坐月下')}</p><h3>{view.phase==='last_words'?tr('Last words','公开遗言'):tr('Table talk', '月下交谈')}</h3></div><span className="chat-live"><i />{tr('LIVE', '实时')}</span></div>
    {discussion && <p className="chat-invitation">{canChat ? tr('Share a theory. Question an alibi. Who do you trust?', '分享推测，质疑证词。你会相信谁？') : waitingTurn?tr(`${currentSpeaker?.name??'Another player'} is speaking. Listen, then share your theory on your turn.`,`${currentSpeaker?.name??'其他玩家'}正在发言。请先倾听，轮到你时分享推理。`):tr('You are watching quietly. Your team’s story continues.', '请安静观战，你的阵营仍在继续故事。')}</p>}
    <div className="conversation" ref={list} role="log" aria-label={tr('Table conversation', '牌桌对话')} aria-live="polite" aria-relevant="additions" onScroll={() => { const el = list.current!; nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 65; if (nearBottom.current) setUnread(0); }}>
      {!view.chat.length && <div className="conversation-empty"><MessageCircle size={30} strokeWidth={1} /><strong>{tr('Break the silence.', '打破沉默。')}</strong><p>{tr('A simple “Who do you suspect?” is a good place to start.', '不妨先问一句：“你在怀疑谁？”')}</p></div>}
      {view.chat.map(m => <div className={`conversation-message ${m.playerId === view.youId ? 'mine' : ''}`} key={m.id} style={participantStyle(view.players.find(p=>p.id===m.playerId))}><ParticipantAvatar player={view.players.find(p=>p.id===m.playerId)??{id:m.playerId,name:m.name}}/><div><strong>{m.name}<small>{m.playerId === view.youId ? tr('you', '你') : ''}</small></strong><ChatMessageContent message={m} language={language} tr={tr} /></div></div>)}
    </div>
    {unread > 0 && <button className="new-messages" onClick={() => { nearBottom.current = true; setUnread(0); if (list.current) list.current.scrollTop = list.current.scrollHeight; }}>{tr(`${unread} new message${unread > 1 ? 's' : ''}`, `${unread}条新消息`)}<ChevronDown size={14} /></button>}
    {canChat && <details className="quick-picker" ref={picker}><summary><Languages size={16} /><span>{tr('Quick Chat', '快捷短语')}</span><ChevronDown size={14} /></summary><p className="quick-hint">{tr('Tap to send in everyone’s language. Typed messages stay as written.', '轻触发送，每人看到自己的语言。手动输入的消息保持原文。')}</p><div className="quick-choices">{QUICK_PHRASE_IDS.map(id => <button type="button" key={id} disabled={!connected || pending} onClick={() => void choosePhrase(id)}>{QUICK_PHRASES[id][language]}</button>)}</div></details>}
    <form className="conversation-compose" onSubmit={submit}><label className="sr-only" htmlFor="table-message">{tr('Message to the table', '发送消息')}</label><textarea id="table-message" rows={2} value={text} onChange={e => setText(e.target.value)} maxLength={300} placeholder={canChat ? tr('What’s your theory?', '说说你的推理…') : waitingTurn?tr('Wait for your turn…','等待轮到你发言…'):tr('Listen for now…', '请安静观战…')} disabled={!canChat || !connected} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void submit(e); } }} /><button className="button primary send-message" aria-label={tr('Send message', '发送消息')} disabled={!canChat || !connected || pending || !text.trim()}><Send size={17} /><span>{tr('Send', '发送')}</span></button></form>
    <p className="chat-compose-hint">{!connected ? tr('Reconnecting to the table…', '正在重新连接牌桌…') : canChat ? tr('Enter to send · Shift + Enter for a new line', '回车发送 · Shift + 回车换行') : tr('Follow the current speaking permissions.', '请按当前阶段的发言权限参与。')}</p>
  </section>;
}
