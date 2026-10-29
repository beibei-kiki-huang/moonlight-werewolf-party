// Fictional presentation data only. This module cannot import the game, credentials or transport.
export const DEMO_DURATION = 60_000;
export const DEMO_BOUNDARIES = [0, 10_000, 20_000, 40_000, 53_000] as const;
export type DemoChoice = 'alex' | 'mei' | 'sam' | 'lin' | 'skip';
export const SAMPLE_PLAYERS = [
  { id: 'you', name: 'You', role: 'seer' }, { id: 'alex', name: 'Alex', role: 'werewolf' },
  { id: 'mei', name: 'Mei', role: 'villager' }, { id: 'sam', name: 'Sam', role: 'villager' }, { id: 'lin', name: 'Lin', role: 'witch' },
] as const;
export const SAMPLE_BALLOTS = { alex: 'skip', mei: 'alex', sam: 'alex', lin: 'alex' } as const;
export class GuidedTour {
  elapsed = 0; started = false; paused = false;
  cardOpen: boolean | null = null; phrase: 'hello' | 'suspect' | 'explain_again' = 'suspect';
  phraseSent = false; equivalent = false; selected: DemoChoice | null = null; confirmed: DemoChoice | null = null;
  get finished() { return this.elapsed >= DEMO_DURATION; }
  get step() { return DEMO_BOUNDARIES.filter(t => this.elapsed >= t).length - 1; }
  get revealed() { return this.cardOpen ?? this.elapsed >= 3000; }
  get chatVisible() { return this.phraseSent || this.elapsed >= 23_000; }
  get ballot() { return this.selected ?? (this.elapsed >= 43_000 ? 'alex' : null); }
  get sealed() { return this.confirmed ?? (this.elapsed >= 48_000 ? this.ballot : null); }
  start() { this.started = true; }
  tick(ms: number) {
    if (this.started && !this.paused && !this.finished && Number.isFinite(ms) && ms > 0) this.elapsed = Math.min(DEMO_DURATION, this.elapsed + ms);
  }
  next() { this.started = true; this.elapsed = DEMO_BOUNDARIES[this.step + 1] ?? DEMO_DURATION; }
  togglePause() { if (this.started && !this.finished) this.paused = !this.paused; }
  select(choice: DemoChoice) { if (this.step === 3 && !this.sealed) this.selected = choice; }
  confirm() { if (this.step === 3 && this.ballot && !this.sealed) { this.confirmed = this.ballot; this.elapsed = 53_000; } }
  replay() {
    this.elapsed = 0; this.started = false; this.paused = false; this.cardOpen = null;
    this.phrase = 'suspect'; this.phraseSent = false; this.equivalent = false; this.selected = null; this.confirmed = null;
  }
}
