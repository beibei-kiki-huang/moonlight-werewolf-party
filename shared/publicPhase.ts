import type { Mode, Phase, Winner } from './types';

export type Language = 'en' | 'zh';
// Only public phase data is accepted. Never derive a cue from roles, actions or presence.
export interface PublicPhase { mode: Mode; phase: Phase; winner?: Winner }
export function phaseScript({ mode, phase, winner }: PublicPhase, language: Language): string {
  const lines: Record<Phase, [string, string]> = {
    lobby: ['Gather under the moon. Your table is waiting.', '月下集结，准备与好友开局。'],
    reveal: ['Your secret awaits. Open your private card, then keep it close.', '秘密身份等待揭晓。查看你的身份牌，然后守好秘密。'],
    nightfall: ['Night falls. Everyone, close your eyes.', '天黑了，所有人请闭眼。'],
    wolves: ['Werewolves, wake up and choose your victim.', '狼人请睁眼，选择你们的袭击目标。'],
    seer: ['Werewolves, close your eyes. Seer, open your eyes and discover the truth.', '狼人请闭眼。预言家请睁眼，查验隐藏的真相。'],
    witch: ['Seer, close your eyes. Witch, open your eyes and follow your private instructions.', '预言家请闭眼。女巫请睁眼，查看你的私人行动提示。'],
    dawn: ['The sun rises. The village awakens.', '天亮了，村庄苏醒了。'],
    discussion: mode === 'quick' ? ['The table is yours. Discuss where the wolf is hiding.', '开始讨论，找出狼人藏在哪里。'] : ['Everyone, open your eyes. Discuss what the night has left behind.', '所有人请睁眼，讨论昨夜留下的线索。'],
    voting: ["It's time to vote. Choose, then confirm your suspicion.", '投票时间到了。作出选择，然后确认你的指认。'],
    tie_discussion: ['A tied vote. Listen to each tied candidate in seat order.', '投票平票，请按座位顺序听取平票候选人的发言。'],
    runoff: ['Runoff vote. Other living players, choose a tied candidate or abstain.', '开始加赛投票。平票候选人以外的存活玩家，请选择一名平票候选人或弃票。'],
    last_words: ['Final words. Listen to the player leaving the village.', '遗言时间，请听出局玩家最后发言。'],
    verdict: ['The village has spoken. Another night approaches.', '村庄已作出选择，新一轮黑夜即将降临。'],
    ended: winner === 'draw' ? ['A draw under the moon. This story awaits another night.', '月下平局，这个故事等待下一夜继续。'] : winner === 'wolves' ? ['The werewolves win. The night belongs to them.', '狼人阵营获胜，今夜属于群狼。'] : ['The village wins. The truth came to light.', '好人阵营获胜，真相终于浮现。'],
  };
  return lines[phase][language === 'en' ? 0 : 1];
}

// Fixed public outcome cues. Names/roles are displayed from published dawn events.
export function dawnScript(peaceful: boolean, language: Language): string {
  return peaceful
    ? (language === 'zh' ? '天亮了。昨夜是平安夜。' : 'The sun rises. A peaceful night. No players were eliminated.')
    : (language === 'zh' ? '天亮了。昨夜有人出局，请查看黎明结算。' : 'The sun rises. Players were eliminated. See the night results.');
}
