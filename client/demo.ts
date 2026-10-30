// Separate browser entry: no React App, game engine, socket, seat storage, API or audio imports.
import { GuidedTour, SAMPLE_PLAYERS, SAMPLE_BALLOTS, demoNightCaption, type DemoChoice } from './demoTour';
import { seerExample, wolfExample } from './demoExamples';
import { QUICK_PHRASES } from '../shared/quickChat';
import './styles.css';
import './polish.css';
import './demo.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/cormorant-garamond/latin-400.css';
import '@fontsource/cormorant-garamond/latin-500.css';

let language = new URLSearchParams(location.search).get('lang') === 'zh' ? 'zh' : 'en';
const tour = new GuidedTour();
const root = document.getElementById('demo-root')!;
const tr = (en: string, zh: string) => language === 'zh' ? zh : en;
const esc = (text: string) => text.replace(/[&<>"']/g, value => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[value]!);
const roles = { seer: ['Seer', '预言家'], werewolf: ['Werewolf', '狼人'], villager: ['Villager', '村民'], witch: ['Witch', '女巫'] };
const name = (id: string) => id === 'you' ? tr('You', '你') : id === 'skip' ? tr('Abstain', '弃票') : SAMPLE_PLAYERS.find(p => p.id === id)?.name ?? id;
const titles = () => [tr('A secret, just for you.', '只属于你的秘密。'), tr('The village guides itself.', '村庄，自有引导。'), tr('One phrase. Two languages.', '一句话，两种语言。'), tr('Choose. Then confirm.', '先选择，再确认。'), tr('The truth comes to light.', '真相，终将浮现。')];
const captions = () => [
  tr('A fictional five-player Classic round. Your sample role is the Seer: discover whether one other player is a wolf each night.', '一轮虚构的五人经典对局。你的示例身份是预言家：每晚查验一位其他玩家是否为狼人。'),
  demoNightCaption(language === 'zh' ? 'zh' : 'en'),
  tr('Two sample recipients see the same phrase in English and Chinese. Live Quick Chat also supports Korean, Japanese and Spanish; typed text stays original.', '两位示例接收者分别看到同一句短语的中英文。真实快捷短语还支持韩语、日语和西班牙语；手动输入保持原文。'),
  tr('Selecting is a draft. Confirm to submit. Real votes remain private until resolution; everyone confirming ends voting immediately.', '选中只是草稿，确认才会提交。真实选票在结算前保密；所有存活玩家确认后立即结算。'),
  tr('The sample village eliminated its only wolf. The three other village-team players voted for Alex, so the outcome stays consistent with your sample vote.', '示例好人阵营通过投票放逐了唯一狼人。其余三位好人阵营玩家都投给 Alex，因此你选择任何示例选票，结果都符合规则。'),
];
root.innerHTML = `<header class="demo-header"><a class="demo-brand" href="/?welcome=1">☾ <span>moonlight<small>PLAY BEYOND BORDERS</small></span></a><nav><button id="language" class="language-button" type="button"></button><a id="exit" class="demo-exit" href="/?welcome=1"></a></nav></header>
<main class="demo-shell"><aside class="demo-notice"><strong id="demo-label"></strong><p id="demo-warning"></p></aside>
<div class="demo-progress"><span id="step-counter"></span><span id="clock"></span></div><progress id="progress" max="60000" value="0"></progress>
<nav class="demo-controls" aria-label="Tour controls"><span id="sticky-label" class="demo-sticky-label"></span><button id="start" class="button primary" type="button"></button><button id="previous" class="button secondary" type="button"></button><button id="pause" class="button secondary" type="button"></button><button id="next" class="button secondary" type="button"></button><button id="replay" class="button secondary" type="button"></button><a id="controls-exit" class="button secondary" href="/?welcome=1"></a></nav><div class="demo-intro"><p class="eyebrow" id="step-name"></p><h1 id="headline" tabindex="-1"></h1><p id="caption"></p></div>
<section id="scene" class="demo-scene"></section>
<div class="demo-status" id="status" role="status" aria-live="polite"></div>

<p class="demo-footnote" id="footnote"></p></main><footer class="demo-footer"><a href="/THIRD_PARTY_NOTICES.txt" id="credits"></a></footer>`;
const el = (id: string) => document.getElementById(id)!;
let renderKey = '', uiKey = ''; 
function roleScene() {
  return `<div class="demo-role"><div class="demo-portrait">${tour.revealed ? `<img src="/art/v2/seer-360.webp" width="240" height="360" alt="${tr('Sample Seer illustration', '示例预言家插画')}"/><span>${tr('SAMPLE ROLE', '示例身份')}</span>` : `<button id="reveal-card" class="demo-card-back" type="button"><span>☾</span>${tr('Reveal sample role', '揭晓示例身份')}</button>`}</div><div><p class="eyebrow">${tr('FICTIONAL CARD · NOT A REAL SEAT', '虚构身份牌 · 非真实座位')}</p><h2>${tour.revealed ? tr('The Seer', '预言家') : tr('A secret awaits', '秘密静候揭晓')}</h2><p>${tour.revealed ? tr('You are on the village team. Each night, inspect one other living player’s faction. Find the wolves together.', '你属于好人阵营。每晚可以查验一名其他存活玩家，得知对方是否属于狼人阵营。利用你掌握的信息，帮助好人找出所有狼人。') : tr('Tap the card, or watch the scripted reveal. In a real match, your card stays concealed until you open it.', '轻触身份牌，或观看脚本揭晓。真实对局中，只有主动查看才会打开身份牌。')}</p>${tour.revealed ? `<p class="demo-private">${tr('Real roles are private—even from the host.', '真实身份保密，房主也无法查看。')}</p><button id="hide-card" class="button secondary" type="button">${tr('Hide sample card', '隐藏示例牌')}</button>` : ''}</div></div>`;
}
function mainClue() {
  return `<button class="button secondary" id="main-clue" aria-expanded="${tour.mainClueOpen}">${tour.mainClueOpen ? tr('Hide private clue','隐藏私人线索') : tr('Reopen private sample clue','查看私人示例线索')}</button>${tour.mainClueOpen ? `<aside class="demo-private"><strong>${tr('MAIN STORY · PRIVATE SCRIPTED CLUE','主线故事 · 私人脚本线索')}</strong><p>Alex · ${tr('Werewolf Team','狼人阵营')}</p></aside>` : ''}`;
}
function nightScene() {
  const slot = Math.min(4, Math.floor((tour.elapsed - 10_000) / 2000));
  const labels = [tr('Nightfall', '入夜'), tr('Werewolves', '狼人'), tr('Seer', '预言家'), tr('Witch', '女巫'), tr('Dawn', '黎明')];
  const lines = [tr('Night falls. Everyone, close your eyes.', '天黑了，所有人请闭眼。'), tr('Werewolves, wake up and choose your victim.', '狼人请睁眼，选择袭击目标。'), tr('Seer, open your eyes and discover the truth.', '预言家请睁眼，查验隐藏的真相。'), tr('Witch, follow your private instructions.', '女巫请睁眼，查看你的私人行动提示。'), tr('The sun rises. A peaceful sample night.', '天亮了，示例中昨夜是平安夜。')];
  return `<div class="demo-night"><div class="demo-moon" aria-hidden="true">${slot===4?'☀':'☾'}</div><p class="eyebrow">${tr('PUBLIC GUIDANCE · CONDENSED', '公开引导 · 已压缩时长')}</p><h2>${lines[slot]}</h2><ol class="demo-night-steps">${labels.map((label, i) => `<li ${i === slot ? 'aria-current="step"' : ''}>${label}</li>`).join('')}</ol><p>${tr('Every night stage runs in full. Your private controls appear only on your turn.','夜间阶段按固定时长进行，只有轮到你时才显示私人操作。')}</p><div class="demo-example-links"><button id="open-seer" class="button secondary">${tr('Try Seer · optional','体验预言家 · 可选')}</button><button id="open-wolf" class="button secondary">${tr('Try Werewolf · optional','体验狼人 · 可选')}</button><button id="open-witch" class="button secondary">${tr('Try Witch · optional','体验女巫 · 可选')}</button></div>${mainClue()}</div>`;
}
function witchScene() {
  const potions = tour.witchPotions, locked = tour.witchChoice !== null, deaths = tour.witchDeaths;
  const state = (available: boolean) => !available ? tr('Used · unavailable', '已使用 · 不可再用') : locked ? tr('Not used · locked for this night', '尚未使用 · 本晚已锁定') : tr('Available · once per match', '可用 · 整局一次');
  return `<section class="demo-witch" aria-label="${tr('Separate fictional Witch example','独立虚构女巫示例')}"><p class="eyebrow">${tr('OPTIONAL · SEPARATE FICTIONAL WITCH EXAMPLE', '可选体验 · 独立虚构女巫示例')}</p><h2>${tr('One night. One choice.', '一夜，一次选择。')}</h2><p>${tr('This is a separate example, not your Seer storyline or a live match. Playback is paused. The wolves target Kai; Rui is another eligible living player.', '这是独立示例，不属于预言家主线，也不是真实对局。主线已暂停。本例中狼人袭击 Kai，Rui 是另一名可选的存活玩家。')}</p>
  <div class="demo-potions"><section class="demo-potion gold"><h3>${tr('Healing potion','解药')}</h3><p>${state(potions.heal)}</p><button class="button secondary" id="witch-heal" ${locked ? 'disabled' : ''}>${tr('Heal Kai','使用解药救 Kai')}</button></section><section class="demo-potion silver"><h3>${tr('Poison potion','毒药')}</h3><p>${state(potions.poison)}</p><button class="button secondary" id="witch-poison" ${locked ? 'disabled' : ''}>${tr('Poison Rui','对 Rui 使用毒药')}</button></section></div>
  <button class="button secondary" id="witch-pass" ${locked ? 'disabled' : ''}>${tr('Pass · use neither potion','今晚不使用药水')}</button>
  ${locked ? `<p class="demo-private">${tr('Choice confirmed. At most one potion per night; a spent potion cannot be used again in this example.', '行动已确认，每晚最多使用一瓶药。已使用的药水在本例中不可再次使用。')}</p><section class="demo-example-dawn"><h3>${tr('Example public dawn result','示例公开黎明结算')}</h3><p>${deaths?.length ? tr('Eliminated: ','昨夜出局：') + deaths.map(esc).join(language === 'zh' ? '、' : ', ') : tr('A peaceful night. No players were eliminated.','昨夜是平安夜。')}</p></section><button id="reset-witch" class="button secondary">${tr('Try Witch Again','再试一次女巫')}</button>` : ''}
  <button class="button secondary" id="close-witch">${tr('Return to Main Demo','返回主演示')}</button><p class="demo-footnote">${tr('Your choice changes only this fictional example. Public dawn results never identify the cause. Reset starts a new example; it does not restore spent potions in a real match.', '你的选择仅影响此虚构示例，公开黎明结算不说明出局原因。重置代表全新示例，不会恢复真实对局中已使用的药水。')}</p></section>`;
}
function chatScene() {
  const phrase = QUICK_PHRASES[tour.phrase];
  return `<div class="demo-chat-choices"><span>${tr('Choose a sample Quick Chat phrase:', '选择示例快捷短语：')}</span>${(['hello','suspect','explain_again'] as const).map(id => `<button type="button" id="phrase-${id}" class="demo-chip" aria-pressed="${tour.phrase === id}">${esc(QUICK_PHRASES[id][language === 'zh' ? 'zh' : 'en'])}</button>`).join('')}</div><div class="demo-recipients">${(['en','zh'] as const).map(lang => `<section class="demo-chat-view"><p class="eyebrow">${lang === 'en' ? tr('ALEX · ENGLISH RECIPIENT · SAMPLE', 'ALEX · 英文接收者 · 示例') : tr('MEI · CHINESE RECIPIENT · SAMPLE', 'MEI · 中文接收者 · 示例')}</p><h2>${lang === 'en' ? 'Table talk' : '月下交谈'}</h2><div class="demo-message"><strong>${tr('You · sample', '你 · 示例')}</strong><p lang="${lang === 'zh' ? 'zh-CN' : 'en'}">${tour.chatVisible ? esc(phrase[lang]) : tr('A sample message arrives shortly…', '示例消息即将送达…')}</p><small>${tr('Quick Chat · same predefined message', '快捷短语 · 同一句预设消息')}</small>${tour.chatVisible && tour.equivalent ? `<p class="demo-equivalent" lang="${lang === 'en' ? 'zh-CN' : 'en'}">${esc(phrase[lang === 'en' ? 'zh' : 'en'])}</p>` : ''}</div></section>`).join('')}</div><button id="equivalent" class="button secondary" type="button" aria-expanded="${tour.equivalent}">${tour.equivalent ? tr('Hide equivalent phrases', '隐藏对应翻译') : tr('Show equivalent phrases', '展开对应翻译')}</button><p class="demo-private">${tr('Optional learning view. Ten presets in the real game; typed messages are not automatically translated.', '可选语言学习视图。真实游戏包含十条短语，手动输入的消息不会自动翻译。')}</p>`;
}
function votingScene() {
  const ballot = tour.ballot;
  return `${mainClue()}<div class="demo-votes">${(['alex','mei','sam','lin','skip'] as const).map(id => `<button type="button" class="demo-vote ${ballot === id ? 'chosen' : ''}" id="vote-${id}" aria-pressed="${ballot === id}" ${tour.sealed ? 'disabled' : ''}>${esc(name(id))}<small>${ballot === id ? tour.sealed ? tr('CONFIRMED', '已确认') : tr('SELECTED · DRAFT', '已选择 · 草稿') : tr('Sample choice', '示例选项')}</small></button>`).join('')}</div><p class="demo-receipt">${tour.sealed ? tr('Sample ballot confirmed. The scripted result follows shortly.', '示例选票已确认，脚本结果即将揭晓。') : ballot ? tr('Selected only. Confirm to seal your sample vote.', '已选中，尚未提交。请确认示例选票。') : tr('Choose a suspect, then confirm. A scripted choice appears if you only watch.', '先选择嫌疑人，再确认。仅观看时，脚本会展示一次选择。')}</p><button id="confirm-vote" class="button primary" type="button" ${!ballot || tour.sealed ? 'disabled' : ''}>${tour.sealed ? tr('Sample vote confirmed', '示例投票已确认') : tr('Confirm sample vote', '确认示例投票')}</button><p class="demo-footnote">${tr('Other sample ballots are scripted and stay hidden until the result. This screen never submits a real vote.', '其他示例选票由脚本预设，结算前保持隐藏。此屏幕不会提交真实选票。')}</p><details class="demo-footnote"><summary>${tr('Classic voting & tied votes','经典投票与平票规则')}</summary><p>${tr('Abstentions do not compete. One unique positive leader is eliminated, even one vote against all abstentions. Initial tied leaders each speak for 60 seconds in seat order. Other living players then vote once among those candidates or Abstain. A second tie, all abstain or no eligible runoff voters means no elimination. Daytime elimination gives 30 seconds of last words before victory; night deaths have none.','弃票不与候选人竞争。唯一最高票者即使只有一票也出局。首次平票候选人按座位各发言60秒，其他存活玩家再在候选人中加赛投票一次或弃票。再次平票、全部弃票或无合格加赛投票者则无人出局。白天出局后有30秒遗言再结算胜负，夜间出局没有遗言。')}</p></details>`;
}
function resultScene() {
  const ballot = tour.sealed ?? 'skip';
  return `<div class="demo-result"><img src="/art/v2/villager-360.webp" width="180" height="270" alt="${tr('Village victory illustration', '好人阵营获胜插画')}"/><div><p class="eyebrow">${tr('SCRIPTED SAMPLE RESULT', '脚本示例结果')}</p><h2>${tr('The light prevails.', '曙光，终将到来。')}</h2><p>${tr('Village victory. Alex, the only Werewolf, received the most votes and was eliminated.', '好人阵营获胜。唯一狼人 Alex 获得最高票并被放逐。')}</p><a class="button primary" href="/?welcome=1">${tr('Play with friends', '与好友一起玩')} →</a></div></div><div class="demo-results-list">${SAMPLE_PLAYERS.map(p => `<span>${esc(name(p.id))} · ${tr(...roles[p.role] as [string,string])}</span>`).join('')}</div><p class="demo-footnote">${tr('Revealed sample ballots:', '示例投票揭晓：')} ${esc(name('you'))} → ${esc(name(ballot))}; ${Object.entries(SAMPLE_BALLOTS).map(([id, target]) => `${name(id)} → ${name(target)}`).join('; ')}.</p><p>${tr('Real matches reshuffle roles on rematch. This tour used fictional data only.', '真实对局再来一局时会重新发牌。本演示只使用虚构数据。')}</p>`;
}
function render() {
  const nextUIKey = JSON.stringify([Math.floor(tour.elapsed / 1000), language, tour.started, tour.paused, tour.cardOpen, tour.phrase, tour.phraseSent, tour.equivalent, tour.selected, tour.confirmed, tour.witchOpen, tour.witchChoice, tour.seerOpen, tour.wolfOpen, tour.seerTarget, tour.seerConfirmed, tour.seerClueOpen, tour.mainClueOpen, tour.wolfTarget, tour.wolfResolved]);
  if (nextUIKey === uiKey) return;
  uiKey = nextUIKey;
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  el('language').textContent = language === 'en' ? 'EN / 中' : '中 / EN'; el('language').setAttribute('aria-label', tr('Switch to Chinese', '切换英文'));
  el('controls-exit').textContent = tr('Exit', '退出');
  el('previous').textContent = tr('Previous', '上一步'); (el('previous') as HTMLButtonElement).disabled = tour.step === 0;
  el('exit').textContent = tr('Exit demo', '退出演示');
  el('demo-label').textContent = tr('GUIDED DEMO · SCRIPTED SAMPLE EVENTS', '引导演示 · 脚本示例事件');
  el('demo-warning').textContent = tr('Not a live multiplayer match. No real players or rooms. Gameplay is condensed into 60 seconds.', '非真实多人对局，没有真实玩家或房间。流程压缩为60秒。');
  el('sticky-label').textContent = tr('SCRIPTED DEMO · NOT LIVE MULTIPLAYER', '脚本演示 · 非真实多人对局');
  el('step-counter').textContent = tr(`Step ${tour.step + 1} of 5`, `第 ${tour.step + 1} / 5 步`);
  el('clock').textContent = `${Math.floor(tour.elapsed / 1000)} / 60 ${tr('seconds', '秒')}`;
  (el('progress') as HTMLProgressElement).value = tour.elapsed; el('progress').setAttribute('aria-label',tr('Guided demo progress','演示进度'));
  const phases = ['reveal', ['nightfall','wolves','seer','witch','dawn'][Math.min(4,Math.floor((tour.elapsed-10_000)/2000))], 'discussion','voting','ended'];
  root.dataset.phase = tour.seerOpen ? 'seer' : tour.wolfOpen ? 'wolves' : tour.witchOpen ? 'witch' : phases[tour.step];
  el('step-name').textContent = [tr('YOUR SECRET', '你的秘密'),tr('AUTOMATED PHASES','自动阶段'),tr('CROSS-LANGUAGE QUICK CHAT','跨语言快捷短语'),tr('SECRET BALLOT','秘密投票'),tr('THE REVEAL','真相揭晓')][tour.step];
  el('headline').textContent = titles()[tour.step]; el('caption').textContent = captions()[tour.step];
  el('start').textContent = tr('Start guided demo', '开始引导演示'); el('start').hidden = tour.started;
  el('pause').textContent = tour.paused ? tr('Resume', '继续') : tr('Pause', '暂停'); (el('pause') as HTMLButtonElement).disabled = !tour.started || tour.finished || tour.exampleOpen;
  el('next').textContent = tr('Next', '下一步'); (el('next') as HTMLButtonElement).disabled = tour.finished;
  el('replay').textContent = tr('Replay', '重播');
  el('footnote').textContent = tr('Everything here is fictional and stays on this page. No connection to a live room. Previous and Next pause for review; Resume continues playback. No sound required.', '所有内容均为虚构，仅在本页展示，不连接真实房间。上一步与下一步会暂停播放，点击继续后自动推进。无需声音。');
  el('language').setAttribute('aria-label', tr('Switch to Chinese', '切换英文'));
  root.querySelector('.demo-controls')?.setAttribute('aria-label',tr('Tour controls','演示控制'));
  el('credits').textContent = tr('Credits & licenses', '署名与许可');
  const status = tour.finished ? tr('Demo complete. Play with friends or replay.', '演示完成。可与好友开局或重播。') : tour.paused ? tr('Demo paused.', '演示已暂停。') : !tour.started ? tr('Ready when you are. Start the tour or use Next.', '准备就绪，点击开始或下一步。') : titles()[tour.step];
  if (el('status').textContent !== status) el('status').textContent = status;
  const key = JSON.stringify([tour.step,language,tour.revealed,tour.step === 1 ? Math.min(4,Math.floor((tour.elapsed-10_000)/2000)) : '',tour.phrase,tour.chatVisible,tour.equivalent,tour.ballot,tour.sealed,tour.witchOpen,tour.witchChoice,tour.seerOpen,tour.wolfOpen,tour.seerTarget,tour.seerConfirmed,tour.seerClueOpen,tour.mainClueOpen,tour.wolfTarget,tour.wolfResolved]);
  if (key !== renderKey) {
    const activeId = el('scene').contains(document.activeElement) ? document.activeElement?.id : '';
    el('scene').innerHTML = tour.seerOpen ? seerExample(tour,tr) : tour.wolfOpen ? wolfExample(tour,tr) : tour.witchOpen ? witchScene() : [roleScene,nightScene,chatScene,votingScene,resultScene][tour.step](); renderKey = key;
    if (activeId) document.getElementById(activeId)?.focus({preventScroll:true});
  }
}
root.addEventListener('click', event => {
  const button = (event.target as HTMLElement).closest('button'); if (!button || button.disabled) return;
  if (button.id === 'language') language = language === 'en' ? 'zh' : 'en';
  else if (button.id === 'start') tour.start();
  else if (button.id === 'pause') tour.togglePause();
  else if (button.id === 'next') tour.next();
  else if (button.id === 'previous') tour.previous();
  else if (button.id === 'main-clue') tour.mainClueOpen = !tour.mainClueOpen;
  else if (button.id === 'open-seer') tour.openSeer();
  else if (button.id === 'open-wolf') tour.openWolf();
  else if (button.id === 'close-example') tour.closeExamples();
  else if (button.id.startsWith('seer-target-')) tour.selectSeer(button.id.slice(12) as DemoChoice);
  else if (button.id === 'seer-confirm') tour.confirmSeer();
  else if (button.id === 'seer-clue') tour.seerClueOpen = !tour.seerClueOpen;
  else if (button.id === 'seer-reset') tour.resetSeer();
  else if (button.id.startsWith('wolf-target-')) tour.selectWolf(button.id.slice(12));
  else if (button.id === 'wolf-resolve') tour.resolveWolf();
  else if (button.id === 'wolf-reset') tour.resetWolf();
  else if (button.id === 'open-witch') tour.openWitch();
  else if (button.id === 'close-witch') tour.closeWitch();
  else if (button.id === 'reset-witch') tour.resetWitch();
  else if (button.id.startsWith('witch-')) tour.chooseWitch(button.id.slice(6) as 'heal'|'poison'|'pass');
  else if (button.id === 'replay') tour.replay();
  else if (button.id === 'reveal-card') tour.cardOpen = true;
  else if (button.id === 'hide-card') tour.cardOpen = false;
  else if (button.id === 'equivalent') tour.equivalent = !tour.equivalent;
  else if (button.id.startsWith('phrase-')) { tour.phrase = button.id.slice(7) as typeof tour.phrase; tour.phraseSent = true; }
  else if (button.id.startsWith('vote-')) tour.select(button.id.slice(5) as DemoChoice);
  else if (button.id === 'confirm-vote') tour.confirm();
  render(); if (button.id === 'next' || button.id === 'previous') el('headline').focus({preventScroll:true});
});
let previous = performance.now();
let timer: ReturnType<typeof setInterval> | null = null;
const startTimer = () => { if (timer !== null) return; previous = performance.now(); timer = setInterval(() => { const now = performance.now(); if (!document.hidden) tour.tick(now - previous); previous = now; render(); }, 200); };
startTimer();
const visibility = () => { previous = performance.now(); if (document.hidden && tour.started && !tour.finished) { tour.paused = true; render(); } };
document.addEventListener('visibilitychange', visibility);
window.addEventListener('pagehide', () => { if (timer !== null) clearInterval(timer); timer = null; });
window.addEventListener('pageshow', startTimer);
render();
