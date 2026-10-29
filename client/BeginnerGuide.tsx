import type { Translate } from './presentation';

export function BeginnerGuide({ tr }: { tr: Translate }) {
  const steps = [
    [tr('Gather your friends', '邀请好友'), tr('Create a private room or join with its code. Classic needs 5–8; Duel needs 2. Everyone selects Ready.', '创建私人房间，或输入房间号加入。经典模式5–8人，对决2人。所有人点击准备。')],
    [tr('Keep your role secret', '守好秘密身份'), tr('Open your private card, read your goal and ability, then hide it. Even the host cannot see your secret.', '查看自己的身份、目标与能力，再隐藏身份牌。房主也看不到你的秘密。')],
    [tr('Follow the moon', '跟随阶段引导'), tr('Phases advance automatically. Use your private controls when offered; otherwise wait for the next phase.', '昼夜阶段自动推进。出现私人操作时按提示行动，其余时间静候下一阶段。')],
    [tr('Talk across languages', '跨越语言交流'), tr('Use bilingual Quick Chat or type your theory. Presets appear in each recipient’s language; typed chat stays as written.', '用双语快捷短语或文字讨论推理。短语按每位接收者的语言显示，手动输入不自动翻译。')],
    [tr('Choose, then confirm', '选择后确认投票'), tr('Selecting is only a draft. Confirm your vote before the deadline; results are automatic. The host can start a rematch.', '选中仅是草稿。倒计时结束前确认投票，胜负自动结算，房主可开启下一局。')],
  ];
  return <section className="beginner-guide" aria-label={tr('Five-step beginner guide', '五步新手指南')}>
    <p className="eyebrow">{tr('YOUR FIRST NIGHT · FIVE SIMPLE STEPS', '初次入夜 · 五步即玩')}</p>
    <h2>{tr('Everyone gets to play.', '每个人，都能参与。')}</h2>
    <p className="guide-intro">{tr('No one sits out to moderate. The host starts the game; Moonlight guides the rounds.', '无需有人退出游戏担任主持。房主开始游戏，Moonlight 引导每一轮。')}</p>
    <ol>{steps.map(([title, body], i) => <li key={i}><span className="guide-number" aria-hidden="true">{i + 1}</span><div><h3>{title}</h3><p>{body}</p></div></li>)}</ol>
    <p className="guide-goals"><strong>{tr('Classic goals: ', '经典胜负：')}</strong>{tr('The village eliminates all wolves. Wolves win when they equal or outnumber the other living players.', '村庄消灭所有狼人则获胜；存活狼人数量达到或超过其他存活玩家则狼人获胜。')}</p>
    <p className="guide-goals"><strong>{tr('Duel goal: ', '对决目标：')}</strong>{tr('Find the wolf: your opponent or the center card. If both players are villagers, both must choose center.', '判断狼人在对方还是中央牌。若两人都是村民，两人都需选择中央牌。')}</p>
  </section>;
}
