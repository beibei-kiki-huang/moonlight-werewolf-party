import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MoonAmbience, PublicNarrator, type PublicScene, type SpeechPort, type RecordingPort, narrationUrl, selectVoice } from '../client/audio';
import { SoundControls } from '../client/SoundControls';
import { NightSequence } from '../client/presentation';
import { phaseScript } from '../shared/publicPhase';

const scene: PublicScene = { code: 'ABC234', mode: 'classic', phase: 'wolves', day: 1, deadline: 100_000 };
const en = (en: string, _zh: string) => en, zh = (_en: string, zh: string) => zh;
function speech() {
  const lines: { text: string; language: string; done: () => void; failed: () => void }[] = [];
  const voices = [{ lang: 'en-US', localService: true }, { lang: 'zh-CN', localService: true }] as SpeechSynthesisVoice[];
  const port: SpeechPort = { voices: () => voices, cancel: vi.fn(), speak: (text, language, _voice, done, failed) => { lines.push({ text, language, done, failed }); } };
  return { lines, voices, port };
}
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('public bilingual narrator', () => {
  it('does not speak without opt-in; narrates each public phase once and cancels stale speech', () => {
    const { port, lines } = speech(), duck = vi.fn(), status = vi.fn();
    const narrator = new PublicNarrator(port, status, duck);
    narrator.update(scene, 'en', false); expect(lines).toHaveLength(0);
    narrator.update(scene, 'en', true); expect(lines).toHaveLength(1);
    narrator.update({ ...scene }, 'en', true); expect(lines).toHaveLength(1);
    narrator.update({ ...scene, phase: 'seer', deadline: 115_000 }, 'en', true);
    expect(lines).toHaveLength(2); expect(port.cancel).toHaveBeenCalledTimes(2);
    expect(lines[1].text).toContain('Seer');
    duck.mockClear(); lines[0].failed(); expect(duck).not.toHaveBeenCalled(); // old callbacks cannot affect a new phase
    lines[1].done(); expect(duck).toHaveBeenLastCalledWith(false);
    narrator.update(scene, 'en', false); expect(narrator.status).toBe('off');
    expect(port.cancel).toHaveBeenCalledTimes(3);
  });
  it('uses the selected language, retries delayed voices, and handles unsupported/failed speech', () => {
    const { port, lines, voices } = speech(); voices.length = 0;
    const narrator = new PublicNarrator(port, () => {});
    narrator.update(scene, 'zh', true); expect(narrator.status).toBe('no-voice'); expect(lines).toHaveLength(0);
    voices.push({ lang: 'en-US', localService: true } as SpeechSynthesisVoice);
    narrator.update(scene, 'zh', true, true); expect(lines).toHaveLength(0); // no wrong-language fallback
    voices.push({ lang: 'zh-CN', localService: true } as SpeechSynthesisVoice);
    narrator.update(scene, 'zh', true, true); expect(lines[0].language).toBe('zh-CN'); expect(lines[0].text).toContain('狼人请睁眼');
    lines[0].failed(); expect(narrator.status).toBe('error');
    narrator.update(scene, 'en', true); expect(lines[1].text).toContain('Werewolves');
    const unsupported = new PublicNarrator(null, () => {}); unsupported.update(scene, 'en', true); expect(unsupported.status).toBe('unsupported');
    const broken = new PublicNarrator({ ...port, speak: () => { throw Error('blocked'); } }, () => {});
    expect(() => broken.update(scene, 'en', true)).not.toThrow(); expect(broken.status).toBe('error');
  });
  it('never derives public guidance or narration from role ownership, survival, choices, or completion', () => {
    const { port, lines } = speech(), narrator = new PublicNarrator(port, () => {});
    const livingWolf = { ...scene, role: 'werewolf', acted: false, players: [{ name: 'SecretAlice', alive: true }], victim: 'hidden' };
    const deadWitch = { ...scene, role: 'witch', acted: true, players: [{ name: 'SecretBob', alive: false }], victim: null };
    narrator.update(livingWolf, 'en', true); narrator.update(deadWitch, 'en', true);
    expect(lines).toHaveLength(1);
    expect(phaseScript(livingWolf, 'en')).toBe(phaseScript(deadWitch, 'en'));
    expect(renderToStaticMarkup(<NightSequence phase={livingWolf} language="en" tr={en} />)).toBe(renderToStaticMarkup(<NightSequence phase={deadWitch} language="en" tr={en} />));
    expect(lines[0].text).not.toMatch(/SecretAlice|SecretBob|hidden/);
    for (const phase of ['nightfall', 'wolves', 'seer', 'witch', 'dawn', 'voting'] as const) {
      expect(phaseScript({ mode: 'classic', phase }, 'en')).toBeTruthy();
      expect(phaseScript({ mode: 'classic', phase }, 'zh')).toMatch(/[\u4e00-\u9fff]/);
    }
    const outcome = { ...scene, phase: 'ended' as const, winner: 'wolves' as const, deadline: null };
    expect(phaseScript({ ...outcome, ...{ role: 'werewolf' } }, 'en')).toBe(phaseScript({ ...outcome, ...{ role: 'villager' } }, 'en'));
  });
  it('starts with explicit Enable Sound and offers separate narration/background settings in both languages', () => {
    const english = renderToStaticMarkup(<SoundControls scene={scene} language="en" connected tr={en} />);
    expect(english).toContain('Enable Sound'); expect(english).toContain('aria-pressed="false"');
    expect(english).toContain('Phase narration'); expect(english).toContain('Background ambience');
    expect(english).toContain('Werewolves, wake up'); expect(english).not.toContain('autoplay');
    const chinese = renderToStaticMarkup(<SoundControls scene={scene} language="zh" connected tr={zh} />);
    expect(chinese).toContain('启用声音'); expect(chinese).toContain('狼人请睁眼');
  });
});
function audioContext() {
  const sources: any[] = [], gains: any[] = [];
  const param = () => ({ value: 0, setTargetAtTime: vi.fn() });
  const node = () => ({ connect: vi.fn(), disconnect: vi.fn() });
  const context = { state: 'running', currentTime: 0, destination: {}, resume: vi.fn(async () => {}), close: vi.fn(async () => {}),
    decodeAudioData: vi.fn(async () => ({ duration: 26 })),
    createGain: () => { const n = { ...node(), gain: param() }; gains.push(n); return n; },
    createBufferSource: () => { const n = { ...node(), start: vi.fn(), stop: vi.fn(), onended: null, buffer: null, loop: false }; sources.push(n); return n; },
  };
  vi.stubGlobal('AudioContext', vi.fn(function() { return context; }));
  const fetcher = vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })); vi.stubGlobal('fetch', fetcher);
  return { context, sources, gains, fetcher };
}
describe('approved recorded sound', () => {
  it('plays only after activation, retains the piano across phases and ducks without restarting', async () => {
    vi.useFakeTimers(); const { context, sources, gains, fetcher } = audioContext(); const available = vi.fn();
    const music = new MoonAmbience(available); music.update(scene, false, .35);
    expect(fetcher).not.toHaveBeenCalled(); expect(sources).toHaveLength(0);
    expect(await music.unlock()).toBe(true); music.update(scene, true, .35); await vi.advanceTimersByTimeAsync(0);
    expect(fetcher).toHaveBeenCalledOnce(); expect(sources).toHaveLength(1); expect(sources[0].loop).toBe(true);
    music.update({ ...scene, phase: 'voting' }, true, .4); expect(sources).toHaveLength(1);
    const normal = gains[0].gain.setTargetAtTime.mock.lastCall[0]; music.duck(true);
    expect(gains[0].gain.setTargetAtTime.mock.lastCall[0]).toBeLessThan(normal); music.duck(false);
    expect(gains[0].gain.setTargetAtTime.mock.lastCall[0]).toBe(normal);
    music.update(scene, false, .4); expect(sources[0].stop).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(200); expect(sources[0].disconnect).toHaveBeenCalledOnce();
    music.dispose(); expect(context.close).toHaveBeenCalledOnce();
  });
  it('does not play stale recordings after mute and reports failed music without affecting game state', async () => {
    vi.useFakeTimers(); const { sources, fetcher } = audioContext();
    let resolve!: (value: any) => void; fetcher.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    const music = new MoonAmbience(); await music.unlock(); const done = vi.fn(), failed = vi.fn();
    const clip = music.recordings().play('/audio/narration/zh/wolves.m4a', .8, done, failed);
    await vi.advanceTimersByTimeAsync(0); clip.stop();
    resolve({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) }); await vi.advanceTimersByTimeAsync(0);
    expect(sources).toHaveLength(0); expect(done).not.toHaveBeenCalled(); expect(failed).not.toHaveBeenCalled(); music.dispose();
    const available = vi.fn(), bad = new MoonAmbience(available); await bad.unlock(); fetcher.mockResolvedValueOnce({ ok: false } as any);
    bad.update(scene, true, .35); await vi.advanceTimersByTimeAsync(0); expect(available).toHaveBeenCalledWith(false); bad.dispose();
  });
  it('cancels recorded cues, changes volume without a repeat, and falls back only once for the current phase', () => {
    const { port, lines } = speech(); const clips: any[] = [];
    const recording: RecordingPort = { play: (url, volume, done, failed) => { const c = { url, volume, done, failed, stop: vi.fn(), setVolume: vi.fn() }; clips.push(c); return c; } };
    const duck = vi.fn(), narrator = new PublicNarrator(port, () => {}, duck, recording);
    narrator.update(scene, 'zh', false); expect(clips).toHaveLength(0);
    narrator.update(scene, 'zh', true); expect(clips[0].url).toBe('/audio/narration/zh/wolves.m4a'); expect(lines).toHaveLength(0);
    narrator.update(scene, 'zh', true, false, .4); expect(clips).toHaveLength(1); expect(clips[0].setVolume).toHaveBeenLastCalledWith(.4);
    narrator.update({ ...scene, phase: 'seer' }, 'zh', true); expect(clips[0].stop).toHaveBeenCalledOnce();
    clips[0].failed(); expect(lines).toHaveLength(0);
    clips[1].failed(); clips[1].failed(); expect(lines).toHaveLength(1); expect(lines[0].text).toContain('预言家');
    narrator.stop(); duck.mockClear(); lines[0].done(); expect(duck).not.toHaveBeenCalled();
    narrator.update(scene, 'en', true, false, 0); expect(clips).toHaveLength(2);
  });
  it('matches Mandarin locale variants without selecting Cantonese or arbitrary novelty voices', () => {
    const voices = [{ name: 'Eddy', lang: 'zh_CN', localService: true, default: false, voiceURI: 'eddy' }, { name: 'Tingting', lang: 'zh-Hans-CN', localService: true, default: false, voiceURI: 'tingting' }, { name: 'Sinji', lang: 'zh-HK', default: true, localService: true, voiceURI: 'sinji' }] as SpeechSynthesisVoice[];
    expect(selectVoice(voices, 'zh')?.name).toBe('Tingting'); expect(selectVoice([voices[2]], 'zh')).toBeUndefined();
    expect(narrationUrl({ mode: 'quick', phase: 'discussion' }, 'en')).toBe('/audio/narration/en/discussion-quick.m4a');
    expect(narrationUrl({ mode: 'classic', phase: 'ended', winner: 'wolves' }, 'zh')).toContain('ended-wolves');
  });
  it('fails quietly if audio cannot be unlocked', async () => {
    vi.stubGlobal('AudioContext', class { constructor() { throw Error('unavailable'); } });
    const music = new MoonAmbience(); expect(await music.unlock()).toBe(false);
    expect(() => music.update(scene, true, .35)).not.toThrow(); music.dispose();
  });
});
