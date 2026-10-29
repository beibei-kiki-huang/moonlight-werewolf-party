import {useEffect,useRef,useState} from 'react';
import {Shield,Send,Languages} from 'lucide-react';
import type {ErrorCode,GameView,PackSubmission} from '../shared/types';
import {QUICK_PHRASES,QUICK_PHRASE_IDS,type QuickPhraseId} from '../shared/quickChat';
import type {Language} from '../shared/publicPhase';
import {ChatMessageContent,type Translate} from './presentation';
export function PackChat({view,connected,language,tr,send}:{view:GameView;connected:boolean;language:Language;tr:Translate;send:(input:PackSubmission)=>Promise<ErrorCode|'connection'|null>}) {
  const [text,setText]=useState(''),[pending,setPending]=useState(false),[error,setError]=useState<ErrorCode|'connection'|null>(null);
  const busy=useRef(false),retry=useRef<PackSubmission|null>(null),list=useRef<HTMLDivElement>(null),picker=useRef<HTMLDetailsElement>(null);
  const pack=view.packChat;
  useEffect(()=>{if(list.current)list.current.scrollTop=list.current.scrollHeight},[pack?.messages.at(-1)?.id]);
  if(!pack||view.mode!=='classic'||view.phase!=='wolves'||view.role!=='werewolf'||!view.players.find(p=>p.id===view.youId)?.alive)return null;
  async function submit(phraseId?:QuickPhraseId) {
    if(busy.current||!connected||!pack)return;
    const message=text.trim();if(!phraseId&&!message)return;
    const old=retry.current;
    const input:PackSubmission=old?.stageId===pack.stageId && (phraseId ? old.phraseId===phraseId : old.text===message)
      ? old : {stageId:pack.stageId,clientMessageId:crypto.randomUUID(),...(phraseId?{phraseId}:{text:message})};
    busy.current=true;setPending(true);setError(null);retry.current=input;
    try{const failure=await send(input);setError(failure);if(!failure){retry.current=null;if(!phraseId)setText('');if(picker.current)picker.current.open=false}}
    finally{busy.current=false;setPending(false)}
  }
  return <section className="panel pack-chat" aria-label={tr('Wolf Pack private chat','狼队私聊')}>
    <p className="eyebrow"><Shield size={15}/>{tr('PRIVATE · LIVING WOLVES ONLY','私人频道 · 仅存活狼人可见')}</p><h3>{tr('Wolf Pack','狼队私聊')}</h3>
    <p>{tr('Only this Werewolf phase. Messages disappear when it closes. Your attack choice stays separate.','仅在本次狼人行动阶段开放，结束后消息消失。聊天不会改变你的袭击选择。')}</p>
    <div className="conversation" role="log" aria-label={tr('Private pack messages','狼队私人消息')} aria-live="polite" ref={list}>
      {!pack.messages.length&&<p>{tr('Coordinate with your pack.','与狼队同伴商量行动。')}</p>}
      {pack.messages.map(m=><div className="pack-message" key={m.id}><strong>{m.name}</strong><ChatMessageContent message={m} language={language} tr={tr}/></div>)}
    </div>
    <details className="quick-picker" ref={picker}><summary><Languages size={16}/>{tr('Pack Quick Chat','狼队快捷短语')}</summary><div className="quick-choices">{QUICK_PHRASE_IDS.map(id=><button key={id} type="button" disabled={!connected||pending} onClick={()=>void submit(id)}>{QUICK_PHRASES[id][language]}</button>)}</div></details>
    <form className="conversation-compose" onSubmit={e=>{e.preventDefault();void submit()}}><label className="sr-only" htmlFor="pack-message">{tr('Private message to your pack','发送狼队私人消息')}</label><textarea id="pack-message" rows={2} maxLength={300} value={text} disabled={!connected||pending} onChange={e=>setText(e.target.value)} placeholder={tr('Message your living teammates…','对存活同伴说…')} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void submit()}}}/><button className="button primary" disabled={!connected||pending||!text.trim()} aria-label={tr('Send private pack message','发送狼队私聊')}><Send size={17}/>{pending?tr('Sending…','发送中…'):error?tr('Retry','重试'):tr('Send','发送')}</button></form>
    {error&&<p role="status">{error==='rate_limit'?tr('A little slower. Please wait before sending again.','发送过快，请稍候再试。'):tr('Not sent or not confirmed. Retry only while this phase is open.','未发送或尚未确认送达。仅可在本阶段内重试。')}</p>}
    {!connected&&<p>{tr('Reconnecting…','正在重连…')}</p>}
  </section>;
}
