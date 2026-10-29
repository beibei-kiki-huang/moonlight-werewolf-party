import { phaseScript, type Language, type PublicPhase } from '../shared/publicPhase';

export interface PublicScene extends PublicPhase { code: string; day: number; deadline: number | null }
export type VoiceStatus = 'off' | 'ready' | 'no-voice' | 'unsupported' | 'error';
export interface SpeechPort {
  voices(): SpeechSynthesisVoice[];
  cancel(): void;
  speak(text: string, language: string, voice: SpeechSynthesisVoice, done: () => void, failed: () => void): void;
}
export function browserSpeech(): SpeechPort | null {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return null;
  return {
    voices: () => window.speechSynthesis.getVoices(),
    cancel: () => window.speechSynthesis.cancel(),
    speak(text, language, voice, done, failed) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language; utterance.voice = voice; utterance.rate = .94; utterance.volume = .8;
      utterance.onend = done; utterance.onerror = failed;
      window.speechSynthesis.speak(utterance);
    },
  };
}
// A phase key deliberately excludes roles, actions, connection counts, and player IDs.
export class PublicNarrator {
  private key = '';
  private generation = 0;
  status: VoiceStatus = 'off';
  constructor(private speech: SpeechPort | null, private changed: (status: VoiceStatus) => void, private duck: (value: boolean) => void = () => {}) {}
  update(scene: PublicScene | null, language: Language, active: boolean, retryMissing = false) {
    const key = scene && active ? `${scene.code}/${scene.day}/${scene.phase}/${scene.deadline}/${scene.winner ?? ''}/${language}` : '';
    if (key === this.key && !(retryMissing && this.status === 'no-voice')) return;
    this.stop(); this.key = key;
    if (!key || !scene) return;
    if (!this.speech) return this.report('unsupported');
    const locale = language === 'zh' ? 'zh-CN' : 'en';
    let voices: SpeechSynthesisVoice[];
    try { voices = this.speech.voices(); } catch { return this.report('error'); }
    const matching = voices.filter(v => language === 'zh' ? /^zh(?:[-_]CN|[-_]Hans)?$/i.test(v.lang) : /^en(?:[-_]|$)/i.test(v.lang));
    const voice = matching.find(v => v.localService) ?? matching[0];
    if (!voice) return this.report('no-voice');
    const generation = this.generation;
    this.report('ready'); this.duck(true);
    try {
      this.speech.speak(phaseScript(scene, language), locale, voice,
        () => { if (generation === this.generation) this.duck(false); },
        () => { if (generation === this.generation) { this.duck(false); this.report('error'); } });
    } catch { this.duck(false); this.report('error'); }
  }
  stop() {
    this.generation++; this.key = '';
    try { this.speech?.cancel(); } catch { /* Written guidance remains available. */ }
    this.duck(false); this.report('off');
  }
  private report(status: VoiceStatus) { if (status !== this.status) { this.status = status; this.changed(status); } }
}

// Original quiet oscillator/noise soundscape: generated locally, no recordings or downloads.
export class MoonAmbience {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private nodes: (OscillatorNode | AudioBufferSourceNode)[] = [];
  private graph: AudioNode[] = [];
  private key = '';
  private volume = .35;
  private ducked = false;
  async unlock(): Promise<boolean> {
    try {
      this.context ??= new AudioContext();
      if (this.context.state === 'suspended') await this.context.resume();
      return this.context.state === 'running';
    } catch { return false; }
  }
  update(scene: PublicScene | null, active: boolean, volume: number) {
    this.volume = volume;
    const key = scene && active ? `${scene.code}/${scene.day}/${scene.phase}/${scene.deadline}/${scene.winner ?? ''}` : '';
    if (key === this.key) { this.level(); return; }
    this.stop();
    const ctx = this.context;
    if (!key || !scene || !ctx || ctx.state !== 'running') return;
    this.key = key;
    try {
      const master = ctx.createGain(); this.master = master; master.gain.value = 0; master.connect(ctx.destination); this.graph.push(master);
      const night = ['nightfall', 'wolves', 'seer', 'witch'].includes(scene.phase);
      const base = scene.phase === 'voting' ? 110 : night ? 82.41 : scene.phase === 'discussion' ? 146.83 : 130.81;
      for (const frequency of [base, base * 1.5]) {
        const oscillator = ctx.createOscillator(), gain = ctx.createGain();
        oscillator.type = 'sine'; oscillator.frequency.value = frequency; gain.gain.value = .15;
        oscillator.connect(gain); gain.connect(master); oscillator.start(); this.nodes.push(oscillator); this.graph.push(oscillator, gain);
      }
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), samples = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * .15;
      const breeze = ctx.createBufferSource(), filter = ctx.createBiquadFilter();
      breeze.buffer = buffer; breeze.loop = true; filter.type = 'lowpass'; filter.frequency.value = night ? 340 : 500;
      breeze.connect(filter); filter.connect(master); breeze.start(); this.nodes.push(breeze); this.graph.push(breeze, filter);
      if (scene.phase === 'ended') {
        // Same short motif for the public outcome on every device; never personalized by role.
        const notes = scene.winner === 'wolves' ? [220, 261.63, 329.63] : scene.winner === 'draw' ? [220, 293.66, 330] : [261.63, 329.63, 392];
        notes.forEach((frequency, i) => {
          const tone = ctx.createOscillator(), gain = ctx.createGain(), start = ctx.currentTime + i * .55;
          tone.frequency.value = frequency; gain.gain.value = 0;
          gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(.28, start + .1); gain.gain.exponentialRampToValueAtTime(.001, start + 2);
          tone.connect(gain); gain.connect(master); tone.start(start); tone.stop(start + 2.1); this.nodes.push(tone); this.graph.push(tone, gain);
        });
      }
      this.level();
    } catch { this.stop(); }
  }
  duck(value: boolean) { this.ducked = value; this.level(); }
  private level() {
    if (this.master && this.context) this.master.gain.setTargetAtTime(this.volume * (this.ducked ? .025 : .1), this.context.currentTime, .2);
  }
  stop() {
    this.key = '';
    const ctx = this.context, oldNodes = this.nodes, oldGraph = this.graph;
    this.nodes = []; this.graph = []; this.master = null;
    if (!ctx) return;
    const gain = oldGraph[0] as GainNode | undefined;
    try { gain?.gain.setTargetAtTime(0, ctx.currentTime, .08); } catch { /* A closed audio device is harmless. */ }
    oldNodes.forEach(node => { try { node.stop(ctx.currentTime + .3); } catch { /* Short motifs may already have ended. */ } });
    setTimeout(() => oldGraph.forEach(node => { try { node.disconnect(); } catch { /* Already disconnected. */ } }), 350);
  }
  dispose() { this.stop(); void this.context?.close().catch(() => {}); this.context = null; }
}
