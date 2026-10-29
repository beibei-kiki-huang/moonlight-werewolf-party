// Fixed, public and role-independent. IDs are stable across interface languages.
export const QUICK_PHRASES = {
  hello: { en: 'Hi everyone!', zh: '大家好！' },
  nice_to_meet_you: { en: 'Nice to meet you!', zh: '很高兴认识大家！' },
  suspect: { en: 'Who do you suspect?', zh: '你怀疑谁？' },
  why: { en: 'Why do you think so?', zh: '你为什么这样想？' },
  suspicious: { en: "I think you're suspicious!", zh: '我觉得你很可疑！' },
  trust_me: { en: 'Do you trust me?', zh: '你相信我吗？' },
  explain_again: { en: 'Could you explain again?', zh: '可以再解释一下吗？' },
  hear_everyone: { en: "Let's hear from everyone.", zh: '我们听听每个人的想法。' },
  good_game: { en: 'Good game!', zh: '这局很精彩！' },
  another_round: { en: 'One more round?', zh: '再来一局吗？' },
} as const;
export type QuickPhraseId = keyof typeof QUICK_PHRASES;
export const QUICK_PHRASE_IDS = Object.keys(QUICK_PHRASES) as QuickPhraseId[];
export function isQuickPhraseId(value: unknown): value is QuickPhraseId {
  return typeof value === 'string' && Object.hasOwn(QUICK_PHRASES, value);
}
