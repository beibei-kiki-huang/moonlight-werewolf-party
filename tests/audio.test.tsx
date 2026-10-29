import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MoonAmbience, PublicNarrator, type PublicScene, type SpeechPort } from '../client/audio';
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
describe('original optional ambience', () => {
  it('creates no sound before activation and cleans up sources on mute/phase change/disposal', async () => {
    vi.useFakeTimers();
    const sources: { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }[] = [];
    const node = () => ({ connect: vi.fn(), disconnect: vi.fn() });
    const parameter = () => ({ value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), setTargetAtTime: vi.fn() });
    const source = () => { const n = { ...node(), start: vi.fn(), stop: vi.fn(), frequency: parameter() }; sources.push(n); return n; };
    const close = vi.fn(async () => {}), resume = vi.fn(async () => {});
    const context = { state: 'running', currentTime: 0, sampleRate: 1000, destination: {}, resume, close,
      createGain: () => ({ ...node(), gain: parameter() }), createOscillator: source, createBufferSource: source,
      createBiquadFilter: () => ({ ...node(), frequency: parameter() }), createBuffer: () => ({ getChannelData: () => new Float32Array(2000) }) };
    const constructor = vi.fn(function() { return context; }); vi.stubGlobal('AudioContext', constructor);
    const music = new MoonAmbience(); music.update(scene, false, .35); expect(constructor).not.toHaveBeenCalled();
    expect(await music.unlock()).toBe(true); expect(sources).toHaveLength(0);
    music.update(scene, true, .35); expect(sources).toHaveLength(3);
    music.update({ ...scene }, true, .4); expect(sources).toHaveLength(3); // private packets/volume changes don't restart
    music.update({ ...scene, phase: 'voting' }, true, .4); expect(sources).toHaveLength(6);
    expect(sources.slice(0, 3).every(n => n.stop.mock.calls.length === 1)).toBe(true);
    music.update(scene, false, .4); expect(sources.every(n => n.stop.mock.calls.length === 1)).toBe(true);
    await vi.advanceTimersByTimeAsync(400); expect(sources.every(n => n.disconnect.mock.calls.length === 1)).toBe(true);
    music.dispose(); expect(close).toHaveBeenCalledOnce();
  });
  it('fails quietly when the device cannot create or resume audio', async () => {
    vi.stubGlobal('AudioContext', class { constructor() { throw Error('unavailable'); } });
    const music = new MoonAmbience(); expect(await music.unlock()).toBe(false);
    expect(() => music.update(scene, true, .35)).not.toThrow(); music.dispose();
  });
});
