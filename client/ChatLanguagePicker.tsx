import {CHAT_LANGUAGES,CHAT_LANGUAGE_NAMES,type ChatLanguage}from'../shared/quickChat';import type{Translate}from'./presentation';
export function ChatLanguagePicker({language,onChange,tr,privateChannel=false}:{language:ChatLanguage;onChange?:(language:ChatLanguage)=>void;tr:Translate;privateChannel?:boolean}){
 if(!onChange)return null;
 const id=privateChannel?'pack-chat-language':'public-chat-language';
 return <div className="chat-language-picker"><label htmlFor={id}>{tr('Chat language','聊天语言')}</label><select id={id} value={language} onChange={e=>onChange(e.target.value as ChatLanguage)}>{CHAT_LANGUAGES.map(code=><option key={code} value={code}>{CHAT_LANGUAGE_NAMES[code]}</option>)}</select><small>{tr('Predefined phrases only · interface & narration stay EN / 中文','仅预设短语 · 界面与旁白仍为中英文')}</small></div>;
}
