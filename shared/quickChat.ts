// Fixed, public and role-independent. IDs are stable across interface languages.
export const QUICK_PHRASES = {
  hello: { en: 'Hi everyone!', zh: '大家好！', ko: "안녕하세요, 여러분!", ja: "みなさん、こんにちは！", es: "¡Hola a todos!" },
  nice_to_meet_you: { en: 'Nice to meet you!', zh: '很高兴认识大家！', ko: "만나서 반가워요!", ja: "みなさん、はじめまして！", es: "¡Mucho gusto!" },
  suspect: { en: 'Who do you suspect?', zh: '你怀疑谁？', ko: "누구를 의심하나요?", ja: "誰を疑っていますか？", es: "¿De quién sospechas?" },
  why: { en: 'Why do you think so?', zh: '你为什么这样想？', ko: "왜 그렇게 생각하나요?", ja: "どうしてそう思いますか？", es: "¿Por qué piensas eso?" },
  suspicious: { en: "I think you're suspicious!", zh: '我觉得你很可疑！', ko: "당신이 수상한 것 같아요!", ja: "あなたが怪しいと思います！", es: "¡Creo que actúas de forma sospechosa!" },
  trust_me: { en: 'Do you trust me?', zh: '你相信我吗？', ko: "나를 믿나요?", ja: "私を信じますか？", es: "¿Confías en mí?" },
  explain_again: { en: 'Could you explain again?', zh: '可以再解释一下吗？', ko: "다시 설명해 주실래요?", ja: "もう一度説明してもらえますか？", es: "¿Puedes explicarlo otra vez?" },
  hear_everyone: { en: "Let's hear from everyone.", zh: '我们听听每个人的想法。', ko: "모든 사람의 이야기를 들어 봐요.", ja: "みんなの意見を聞きましょう。", es: "Escuchemos a todos." },
  good_game: { en: 'Good game!', zh: '这局很精彩！', ko: "좋은 게임이었어요!", ja: "いい勝負でした！", es: "¡Buena partida!" },
  another_round: { en: 'One more round?', zh: '再来一局吗？', ko: "한 판 더 할까요?", ja: "もう一回遊びませんか？", es: "¿Otra partida?" },
} as const;
export type QuickPhraseId = keyof typeof QUICK_PHRASES;
export const QUICK_PHRASE_IDS = Object.keys(QUICK_PHRASES) as QuickPhraseId[];
export function isQuickPhraseId(value: unknown): value is QuickPhraseId {
  return typeof value === 'string' && Object.hasOwn(QUICK_PHRASES, value);
}

export const CHAT_LANGUAGES = ['en','zh','ko','ja','es'] as const;
export type ChatLanguage = typeof CHAT_LANGUAGES[number];
export const CHAT_LANGUAGE_NAMES:Record<ChatLanguage,string> = {en:'English',zh:'简体中文',ko:'한국어',ja:'日本語',es:'Español'};
export function isChatLanguage(value:unknown):value is ChatLanguage{return typeof value==='string'&&CHAT_LANGUAGES.includes(value as ChatLanguage)}
export function phraseText(id:QuickPhraseId,language:unknown){return QUICK_PHRASES[id][isChatLanguage(language)?language:'en']}
