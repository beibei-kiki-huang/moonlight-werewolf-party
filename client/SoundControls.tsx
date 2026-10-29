import { useEffect, useRef, useState } from 'react';
import { SlidersHorizontal, Volume2, VolumeX } from 'lucide-react';
import { phaseScript, type Language } from '../shared/publicPhase';
import { browserSpeech, MoonAmbience, PublicNarrator, type PublicScene, type VoiceStatus } from './audio';
import type { Translate } from './presentation';

interface Preferences { narration: boolean; background: boolean; volume: number; narrationVolume: number }
function preferences(): Preferences {
  try {
    const saved = JSON.parse(localStorage.getItem('moonlight.audio') || '{}');
    return { narration: saved.narration !== false, background: saved.background === true, narrationVolume: typeof saved.narrationVolume === 'number' && Number.isFinite(saved.narrationVolume) ? Math.max(0, Math.min(1, saved.narrationVolume)) : .8, volume: typeof saved.volume === 'number' && Number.isFinite(saved.volume) ? Math.max(0, Math.min(1, saved.volume)) : .35 };
  } catch { return { narration: true, background: false, volume: .35, narrationVolume: .8 }; }
}
export function SoundControls({ scene, language, connected, tr, clockOffset = 0 }: { scene: PublicScene; language: Language; connected: boolean; tr: Translate; clockOffset?: number }) {
  const [enabled, setEnabled] = useState(false), [muted, setMuted] = useState(false);
  const [prefs, setPrefs] = useState(preferences), [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('off');
  const [audioReady, setAudioReady] = useState<boolean | null>(null), [visible, setVisible] = useState(true);
  const [musicAvailable, setMusicAvailable] = useState<boolean | null>(null);
  const narrator = useRef<PublicNarrator | null>(null), ambience = useRef<MoonAmbience | null>(null);
  const current = useRef({ scene, language, connected, enabled, muted, prefs, visible, clockOffset });
  current.current = { scene, language, connected, enabled, muted, prefs, visible, clockOffset };
  useEffect(() => {
    const music = new MoonAmbience(setMusicAvailable); ambience.current = music;
    const voice = new PublicNarrator(browserSpeech(), setVoiceStatus, value => music.duck(value), music.recordings()); narrator.current = voice;
    const visibility = () => { setVisible(!document.hidden); if (document.hidden) { voice.stop(); music.stop(); } };
    const voices = () => {
      const c = current.current;
      voice.update(c.scene, c.language, c.connected && c.enabled && !c.muted && c.visible && c.prefs.narration && (c.scene.deadline === null || c.scene.deadline > Date.now() + c.clockOffset), true, c.prefs.narrationVolume);
    };
    visibility(); document.addEventListener('visibilitychange', visibility);
    window.speechSynthesis?.addEventListener('voiceschanged', voices);
    return () => { document.removeEventListener('visibilitychange', visibility); window.speechSynthesis?.removeEventListener('voiceschanged', voices); voice.stop(); music.dispose(); narrator.current = null; ambience.current = null; };
  }, []);
  useEffect(() => { try { localStorage.setItem('moonlight.audio', JSON.stringify(prefs)); } catch { /* Preferences are optional. */ } }, [prefs]);
  useEffect(() => {
    const active = enabled && !muted && connected && visible && (scene.deadline === null || scene.deadline > Date.now() + clockOffset);
    narrator.current?.update(scene, language, active && prefs.narration, false, prefs.narrationVolume);
    ambience.current?.update(scene, active && prefs.background && audioReady === true, prefs.volume);
  }, [scene.code, scene.day, scene.phase, scene.deadline, scene.winner, scene.mode, language, connected, enabled, muted, visible, prefs, audioReady, clockOffset]);
  function enable() {
    setEnabled(true); setMuted(false);
    // Speak/resume from the explicit gesture for mobile autoplay policies.
    narrator.current?.update(scene, language, connected && prefs.narration && (scene.deadline === null || scene.deadline > Date.now() + clockOffset), false, prefs.narrationVolume);
    void ambience.current?.unlock().then(setAudioReady);
  }
  function toggleMute() {
    if (muted) { enable(); } else { setMuted(true); narrator.current?.stop(); ambience.current?.stop(); }
  }
  const fallback = voiceStatus === 'no-voice' || voiceStatus === 'unsupported' || voiceStatus === 'error';
  return <section className="sound-panel" aria-label={tr('Optional sound', '可选声音')}>
    <div className="sound-toolbar"><button type="button" className="sound-toggle" onClick={enabled ? toggleMute : enable} aria-pressed={enabled && !muted}>{enabled && !muted ? <Volume2 size={17} /> : <VolumeX size={17} />}{!enabled ? tr('Enable Sound', '启用声音') : muted ? tr('Unmute', '取消静音') : tr('Mute', '静音')}</button>
      <span className="sound-caption">{tr('Optional · this device only', '可选 · 仅此设备')}</span>
      <details className="sound-settings"><summary><SlidersHorizontal size={16} />{tr('Audio settings', '声音设置')}</summary><div className="sound-options">
        <label><input type="checkbox" checked={prefs.narration} onChange={e => setPrefs({ ...prefs, narration: e.target.checked })} />{tr('Phase narration', '阶段旁白')}</label>
        <label><input type="checkbox" checked={prefs.background} onChange={e => setPrefs({ ...prefs, background: e.target.checked })} />{tr('Background ambience', '背景音乐')}</label>
        <label className="audio-volume">{tr('Narration volume', '旁白音量')}<input type="range" min="0" max="1" step="0.05" value={prefs.narrationVolume} onChange={e => setPrefs({ ...prefs, narrationVolume: Number(e.target.value) })} /></label>
        <label className="audio-volume">{tr('Background volume', '背景音量')}<input type="range" min="0" max="1" step="0.05" value={prefs.volume} onChange={e => setPrefs({ ...prefs, volume: Number(e.target.value) })} /></label>
        <p>{tr('Recorded narration follows your interface language. Browser speech is a backup if a clip fails. Sound never delays the game.', '录制旁白随界面语言切换；音频无法播放时使用浏览器备用语音。声音不会延迟游戏。')}</p>
        {enabled && prefs.background && (audioReady === false || musicAvailable === false) && <p role="status">{tr('Music could not load or play. The game continues normally.', '音乐暂无法加载或播放，游戏照常进行。')}</p>}
        <p className="audio-credit">{tr('Music: ', '音乐：')}<a href="https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100235" target="_blank" rel="noreferrer">Evening Fall (Piano) — Kevin MacLeod</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>. {tr('Excerpt, level adjustment and fades.', '节选、音量调整及淡入淡出。')}</p>
      </div></details>
    </div>
    <p className="narrator-caption"><span>{tr('VILLAGE NARRATOR', '村庄旁白')}</span>{phaseScript(scene, language)}</p>
    {enabled && !muted && voiceStatus === 'ready' && <p className="audio-fallback" role="status">{tr('Using browser backup narration.', '正在使用浏览器备用旁白。')}</p>}
    {enabled && !muted && fallback && <p className="audio-fallback" role="status">{tr('A voice for this language is unavailable or could not start. Follow the written guidance; gameplay continues normally.', '当前语言语音不可用或未能启动。请跟随文字引导，游戏照常进行。')}</p>}
  </section>;
}
