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
  witchOpen = false; witchChoice: 'heal'|'poison'|'pass'|null = null;
  get finished() { return this.elapsed >= DEMO_DURATION; }
  get step() { return DEMO_BOUNDARIES.filter(t => this.elapsed >= t).length - 1; }
  get revealed() { return this.cardOpen === true; }
  get chatVisible() { return this.phraseSent; }
  get ballot() { return this.selected; }
  get sealed() { return this.confirmed; }
  get witchPotions() { return {heal:this.witchChoice !== 'heal',poison:this.witchChoice !== 'poison'}; }
  get witchDeaths(): string[] | undefined { return this.witchChoice === null ? undefined : this.witchChoice === 'heal' ? [] : this.witchChoice === 'poison' ? ['Kai','Rui'] : ['Kai']; }
  start() { this.started = true; this.paused = false; }
  tick(ms: number) {
    if (!this.started || this.paused || this.witchOpen || this.finished || !Number.isFinite(ms) || ms <= 0) return;
    const before = this.elapsed;
    this.elapsed = Math.min(DEMO_DURATION, this.elapsed + ms);
    // Scripted events commit explicit local state once; reviewing never rewinds consumption or choices.
    if (before < 3000 && this.elapsed >= 3000 && this.cardOpen === null) this.cardOpen = true;
    if (before < 23_000 && this.elapsed >= 23_000) this.phraseSent = true;
    if (before < 43_000 && this.elapsed >= 43_000 && this.selected === null) this.selected = 'alex';
    if (before < 48_000 && this.elapsed >= 48_000 && this.confirmed === null) this.confirmed = this.selected ?? 'alex';
  }
  next() { this.started = true; this.paused = true; this.witchOpen = false; this.elapsed = DEMO_BOUNDARIES[this.step + 1] ?? DEMO_DURATION; }
  previous() { if (this.step === 0) return; this.started = true; this.paused = true; this.witchOpen = false; this.elapsed = DEMO_BOUNDARIES[this.step - 1]; }
  togglePause() { if (this.started && !this.finished && !this.witchOpen) this.paused = !this.paused; }
  select(choice: DemoChoice) { if (this.step === 3 && !this.sealed) this.selected = choice; }
  confirm() { if (this.step === 3 && this.ballot && !this.sealed) { this.confirmed = this.ballot; this.paused = true; this.elapsed = 53_000; } }
  openWitch() { if (this.step === 1) { this.witchOpen = true; this.paused = true; } }
  closeWitch() { this.witchOpen = false; this.paused = true; }
  chooseWitch(choice: 'heal'|'poison'|'pass') { if (this.witchOpen && this.witchChoice === null) this.witchChoice = choice; }
  resetWitch() { this.witchChoice = null; this.paused = true; }
  replay() {
    this.elapsed = 0; this.started = false; this.paused = false; this.cardOpen = null;
    this.phrase = 'suspect'; this.phraseSent = false; this.equivalent = false; this.selected = null; this.confirmed = null;
    this.witchOpen = false; this.witchChoice = null;
  }
}
