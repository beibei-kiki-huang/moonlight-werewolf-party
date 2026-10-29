import { describe, expect, it } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import manifest from '../design/approved-audio/narration-manifest.json';
import { phaseScript } from '../shared/publicPhase';
import { narrationUrl } from '../client/audio';
import type { Mode, Phase, Winner } from '../shared/types';

describe('shipped approved audio assets', () => {
  it('covers every public cue in both languages, matches written guidance and fits fixed night clocks', () => {
    let total = statSync('public/audio/evening-fall-piano.m4a').size;
    for (const language of ['en', 'zh'] as const) {
      expect(Object.keys(manifest[language])).toHaveLength(14);
      for (const [key, entry] of Object.entries(manifest[language])) {
        const scene = { mode: (key === 'discussion-quick' ? 'quick' : 'classic') as Mode, phase: (key.startsWith('discussion') ? 'discussion' : key.startsWith('ended') ? 'ended' : key) as Phase, winner: key.startsWith('ended') ? key.slice(6) as Winner : undefined };
        expect(entry.text).toBe(phaseScript(scene, language));
        const path = `public${narrationUrl(scene, language)}`;
        expect(statSync(path).size).toBe(entry.bytes); total += entry.bytes;
        const limit = scene.phase === 'nightfall' ? 5 : scene.phase === 'seer' ? 15 : scene.phase === 'witch' ? 20 : ['dawn','verdict'].includes(scene.phase) ? 8 : 30;
        expect(entry.duration).toBeLessThan(limit);
        expect(readFileSync(path).subarray(4, 8).toString()).toBe('ftyp');
      }
    }
    expect(total).toBeLessThan(3_000_000);
  });
  it('ships the music attribution and model notice with the game', () => {
    expect(readFileSync('public/audio/CREDITS.txt','utf8')).toContain('Kevin MacLeod');
    expect(readFileSync('public/audio/CREDITS.txt','utf8')).toContain('https://creativecommons.org/licenses/by/4.0/');
    expect(readFileSync('public/audio/MELOTTS-LICENSE.txt','utf8')).toContain('MyShell.ai');
  });
});
