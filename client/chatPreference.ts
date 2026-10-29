import{isChatLanguage,type ChatLanguage}from'../shared/quickChat';
interface StorageLike{getItem(key:string):string|null;setItem(key:string,value:string):void}
export function readChatPreference(stores:Array<()=>StorageLike>=[()=>sessionStorage,()=>localStorage]):ChatLanguage|null{for(const get of stores)try{const language=get().getItem('moonlight.chatLanguage');if(isChatLanguage(language))return language}catch{}return null}
export function saveChatPreference(language:ChatLanguage,stores:Array<()=>StorageLike>=[()=>sessionStorage,()=>localStorage]){for(const get of stores)try{get().setItem('moonlight.chatLanguage',language)}catch{}}
