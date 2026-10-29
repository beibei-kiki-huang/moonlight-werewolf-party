import { dawnScript, phaseScript, type Language, type PublicPhase } from '../shared/publicPhase';

import type { DawnCue } from './publicDawn';
export interface PublicScene extends PublicPhase { code: string; day: number; deadline: number | null; dawn?: DawnCue }
export type VoiceStatus = 'off' | 'recorded' | 'ready' | 'no-voice' | 'unsupported' | 'error';
export interface SpeechPort {
  voices(): SpeechSynthesisVoice[]; cancel(): void; setVolume?(value: number): void;
  speak(text: string, language: string, voice: SpeechSynthesisVoice, done: () => void, failed: () => void, volume?: number): void;
}
export interface Playback { stop(): void; setVolume(value: number): void }
export interface RecordingPort { play(url: string, volume: number, done: () => void, failed: () => void): Playback }
const clamp = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
export function narrationKey(scene: PublicPhase): string {
  return scene.phase === 'ended' ? `ended-${scene.winner ?? 'draw'}` : scene.phase === 'discussion' ? `discussion-${scene.mode}` : scene.phase;
}
export function narrationUrl(scene: PublicPhase, language: Language) { return `/audio/narration/${language}/${narrationKey(scene)}.m4a`; }
export function narrationCues(scene: PublicScene, language: Language): {url:string;text:string}[] {
  const normal = {url:narrationUrl(scene,language),text:phaseScript(scene,language)};
  if (!scene.dawn || scene.mode !== 'classic' || !['dawn','ended'].includes(scene.phase)) return [normal];
  const outcome = {url:`/audio/narration/${language}/dawn-${scene.dawn.peaceful ? 'peaceful' : 'deaths'}.m4a`,text:dawnScript(scene.dawn.peaceful,language)};
  return scene.phase === 'ended' ? [outcome,normal] : [outcome];
}
export function selectVoice(voices: SpeechSynthesisVoice[], language: Language) {
  const locale = (voice: SpeechSynthesisVoice) => voice.lang.replaceAll('_', '-').toLowerCase();
  const matching = voices.filter(v => language === 'en' ? /^en(?:-|$)/.test(locale(v)) : /^(?:zh(?:-hans)?(?:-cn|-sg)?|cmn(?:-hans)?(?:-cn)?)$/.test(locale(v)));
  // Locale and spoken-language voices take priority over arbitrary enumeration order.
  return matching.sort((a, b) => {
    const score = (v: SpeechSynthesisVoice) => (language === 'zh' && /cn|hans/.test(locale(v)) ? 8 : 0) + (/tingting|xiaoxiao|yunxi|samantha|daniel/i.test(v.name ?? '') ? 4 : 0) + (v.default ? 2 : 0) + (v.localService ? 1 : 0);
    return score(b) - score(a);
  })[0];
}
export function browserSpeech(): SpeechPort | null {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return null;
  let current: SpeechSynthesisUtterance | null = null;
  return {
    voices: () => window.speechSynthesis.getVoices(),
    cancel: () => { current = null; window.speechSynthesis.cancel(); },
    setVolume: value => { if (current) current.volume = clamp(value); },
    speak(text, language, voice, done, failed, volume = .8) {
      const utterance = new SpeechSynthesisUtterance(text); current = utterance;
      utterance.lang = voice.lang.replaceAll('_', '-') || language; utterance.voice = voice;
      utterance.rate = language.startsWith('zh') ? .98 : .94; utterance.volume = clamp(volume);
      utterance.onend = done; utterance.onerror = failed; window.speechSynthesis.speak(utterance);
    },
  };
}
// The phase key and filenames contain only public information, never role/action data.
export class PublicNarrator {
  private key = ''; private generation = 0; private playback: Playback | null = null; private volume = .8;
  status: VoiceStatus = 'off';
  constructor(private speech: SpeechPort | null, private changed: (status: VoiceStatus) => void, private duck: (value: boolean) => void = () => {}, private recording: RecordingPort | null = null) {}
  update(scene: PublicScene | null, language: Language, active: boolean, retryMissing = false, volume = .8) {
    this.volume = clamp(volume); this.playback?.setVolume(this.volume); this.speech?.setVolume?.(this.volume);
    const key = scene && active && this.volume > 0 ? `${scene.code}/${scene.day}/${scene.phase}/${scene.phase==='discussion'?'discussion':scene.deadline}/${scene.winner ?? ''}/${scene.dawn?.id ?? ''}/${scene.dawn?.peaceful ?? ''}/${language}` : '';
    if (key === this.key && !(retryMissing && this.status === 'no-voice')) return;
    this.stop(); this.key = key;
    if (!key || !scene) return;
    const generation = this.generation;
    const cues = narrationCues(scene,language);
    const play = (index: number) => {
      if (generation !== this.generation) return;
      const cue = cues[index];
      if (!cue) { this.playback = null; this.duck(false); return; }
      let completed = false, fellBack = false;
      const next = () => { if (completed || generation !== this.generation) return; completed = true; this.playback = null; play(index + 1); };
      const fallback = () => {
        if (generation !== this.generation || completed || fellBack) return;
        fellBack = true;
        let voice: SpeechSynthesisVoice | undefined;
        try { voice = this.speech ? selectVoice(this.speech.voices(), language) : undefined; }
        catch { this.report('error'); next(); return; }
        if (!voice || !this.speech) { this.report(this.speech ? 'no-voice' : 'unsupported'); next(); return; }
        this.report('ready');
        try { this.speech.speak(cue.text, language === 'zh' ? 'zh-CN' : 'en', voice, next, () => { if (generation === this.generation) { this.report('error'); next(); } }, this.volume); }
        catch { this.report('error'); next(); }
      };
      this.duck(true);
      if (this.recording) {
        this.report('recorded');
        try { const handle = this.recording.play(cue.url, this.volume, next, fallback); if (!completed && generation === this.generation) this.playback = handle; else handle.stop(); }
        catch { fallback(); }
      } else fallback();
    };
    play(0);
  }

  stop() {
    this.generation++; this.key = ''; this.playback?.stop(); this.playback = null;
    try { this.speech?.cancel(); } catch { /* Text guidance remains available. */ }
    this.duck(false); this.report('off');
  }
  private report(status: VoiceStatus) { if (status !== this.status) { this.status = status; this.changed(status); } }
}

// One unlocked browser audio context. Only the approved piano recording is used;
// rejected heartbeat/noise/drone synthesis has been removed.
export class MoonAmbience {
  private context: AudioContext | null = null;
  private buffers = new Map<string, Promise<AudioBuffer>>();
  private music: AudioBufferSourceNode | null = null; private gain: GainNode | null = null;
  private key = ''; private room = ''; private generation = 0; private volume = .35; private factor = .8; private ducked = false;
  private ending: ReturnType<typeof setTimeout> | undefined;
  constructor(private available: (value: boolean) => void = () => {}) {}
  async unlock(): Promise<boolean> {
    try { this.context ??= new AudioContext(); if (this.context.state === 'suspended') await this.context.resume(); return this.context.state === 'running'; }
    catch { return false; }
  }
  private load(url: string): Promise<AudioBuffer> {
    const cached = this.buffers.get(url); if (cached) return cached;
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 6000);
    const context = this.context!;
    const promise = fetch(url, { signal: controller.signal }).then(r => { if (!r.ok) throw Error('audio unavailable'); return r.arrayBuffer(); })
      .then(data => context.decodeAudioData(data)).catch(error => { this.buffers.delete(url); throw error; }).finally(() => clearTimeout(timeout));
    this.buffers.set(url, promise); return promise;
  }
  recordings(): RecordingPort {
    return { play: (url, volume, done, failed) => {
      let stopped = false, source: AudioBufferSourceNode | null = null, gain: GainNode | null = null, level = clamp(volume);
      const cleanup = () => { source?.disconnect(); gain?.disconnect(); };
      void (async () => {
        try {
          if (!await this.unlock()) throw Error('audio unavailable');
          const buffer = await this.load(url); if (stopped) return;
          const context = this.context!; source = context.createBufferSource(); gain = context.createGain();
          source.buffer = buffer; gain.gain.value = level; source.connect(gain); gain.connect(context.destination);
          source.onended = () => { cleanup(); if (!stopped) { stopped = true; done(); } }; source.start();
        } catch { if (!stopped) { stopped = true; cleanup(); failed(); } }
      })();
      return { stop() { stopped = true; if (source) { source.onended = null; try { source.stop(); } catch {} } cleanup(); }, setVolume(value) { level = clamp(value); if (gain) gain.gain.value = level; } };
    } };
  }
  update(scene: PublicScene | null, active: boolean, volume: number) {
    this.volume = clamp(volume);
    if (!scene || !active || !this.volume) { this.stop(); return; }
    this.factor = scene.phase === 'discussion' ? .35 : scene.phase === 'dawn' ? .5 : scene.phase === 'wolves' || scene.phase === 'voting' ? 1 : .8;
    const key = `${scene.code}/${scene.day}/${scene.phase}/${scene.deadline}`;
    if (key === this.key) { this.level(); return; }
    if (this.music && this.room === scene.code && scene.phase !== 'ended') { this.key = key; this.level(); return; }
    this.stop(); this.key = key; this.room = scene.code;
    const context = this.context; if (!context || context.state !== 'running') { this.key = ''; return; }
    const generation = this.generation;
    void this.load('/audio/evening-fall-piano.m4a').then(buffer => {
      if (generation !== this.generation) return;
      const source = context.createBufferSource(), gain = context.createGain();
      this.music = source; this.gain = gain; source.buffer = buffer; source.loop = scene.phase !== 'ended'; gain.gain.value = 0;
      source.connect(gain); gain.connect(context.destination); source.start(); this.level(); this.available(true);
      if (scene.phase === 'ended') this.ending = setTimeout(() => this.stop(), 6000);
    }).catch(() => { if (generation === this.generation) this.available(false); });
  }
  duck(value: boolean) { this.ducked = value; this.level(); }
  private level() { if (this.gain && this.context) this.gain.gain.setTargetAtTime(this.volume * this.factor * (this.ducked ? .18 : 1), this.context.currentTime, .25); }
  stop() {
    this.generation++; this.key = ''; this.room = ''; clearTimeout(this.ending);
    const source = this.music, gain = this.gain; this.music = null; this.gain = null;
    if (source && this.context) {
      try { gain?.gain.setTargetAtTime(0, this.context.currentTime, .03); source.stop(this.context.currentTime + .12); } catch {}
      setTimeout(() => { source.disconnect(); gain?.disconnect(); }, 160);
    }
  }
  dispose() { this.stop(); void this.context?.close().catch(() => {}); this.context = null; this.buffers.clear(); }
}
