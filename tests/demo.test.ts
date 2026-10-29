import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { GuidedTour, DEMO_DURATION, SAMPLE_BALLOTS, SAMPLE_PLAYERS } from '../client/demoTour';
import { QUICK_PHRASES } from '../shared/quickChat';

describe('isolated scripted tour', () => {
  it('waits for a gesture, advances the five scenes in sixty seconds and stops at completion', () => {
    const tour = new GuidedTour(); tour.tick(DEMO_DURATION); expect(tour.elapsed).toBe(0);
    tour.start(); tour.tick(9999); expect(tour.step).toBe(0); tour.tick(1); expect(tour.step).toBe(1);
    tour.tick(10000); expect(tour.step).toBe(2); tour.tick(20000); expect(tour.step).toBe(3);
    tour.tick(13000); expect(tour.step).toBe(4); expect(tour.finished).toBe(false);
    tour.tick(7000); expect(tour.finished).toBe(true); tour.tick(99999); expect(tour.elapsed).toBe(DEMO_DURATION);
  });
  it('pauses without losing scene or ballot, and supports Next while paused', () => {
    const tour = new GuidedTour(); tour.start(); tour.tick(42000); tour.select('mei'); tour.togglePause(); tour.tick(30000);
    expect(tour.elapsed).toBe(42000); expect(tour.ballot).toBe('mei'); tour.next(); expect(tour.step).toBe(4); expect(tour.paused).toBe(true);
    tour.togglePause(); tour.tick(7000); expect(tour.finished).toBe(true);
  });
  it('keeps a choice separate from confirmation and prevents editing a sealed sample ballot', () => {
    const tour = new GuidedTour(); tour.select('mei'); expect(tour.selected).toBeNull();
    tour.next(); tour.next(); tour.next(); expect(tour.step).toBe(3); expect(tour.ballot).toBeNull(); tour.confirm(); expect(tour.step).toBe(3);
    tour.select('sam'); expect(tour.confirmed).toBeNull(); tour.confirm(); expect(tour.confirmed).toBe('sam'); expect(tour.step).toBe(4);
    tour.select('alex'); expect(tour.confirmed).toBe('sam');
  });
  it('clears every private sample interaction and returns to a stopped concealed card on Replay', () => {
    const tour = new GuidedTour(); tour.start(); tour.tick(45000); tour.select('lin'); tour.confirm(); tour.cardOpen = true;
    tour.equivalent = true; tour.phrase = 'hello'; tour.phraseSent = true; tour.paused = true;
    tour.replay(); expect(tour).toEqual(new GuidedTour()); expect(tour.revealed).toBe(false); expect(tour.chatVisible).toBe(false);
    tour.tick(5000); expect(tour.elapsed).toBe(0);
  });
  it('Previous and Next pause review and preserve explicit card/chat/ballot state', () => {
    const tour = new GuidedTour(); tour.start(); tour.tick(45000); tour.select('mei'); tour.phrase = 'hello'; tour.equivalent = true;
    tour.previous(); expect(tour.step).toBe(2); expect(tour.paused).toBe(true); tour.tick(99999); expect(tour.step).toBe(2);
    tour.next(); expect(tour.step).toBe(3); expect(tour.ballot).toBe('mei'); expect(tour.sealed).toBeNull(); expect(tour.phrase).toBe('hello'); expect(tour.equivalent).toBe(true);
    tour.confirm(); tour.previous(); expect(tour.sealed).toBe('mei'); tour.select('alex'); expect(tour.sealed).toBe('mei');
    tour.previous(); tour.previous(); tour.previous(); expect(tour.step).toBe(0); expect(tour.revealed).toBe(true);
  });
  it.each(['heal','poison','pass'] as const)('keeps optional Witch %s independent and one-action-only', choice => {
    const tour = new GuidedTour(); tour.next(); tour.openWitch(); expect(tour.witchOpen).toBe(true); expect(tour.paused).toBe(true);
    tour.togglePause(); tour.tick(60000); expect(tour.elapsed).toBe(10000);
    tour.chooseWitch(choice); tour.chooseWitch(choice === 'heal' ? 'poison' : 'heal'); expect(tour.witchChoice).toBe(choice);
    expect(tour.witchDeaths).toEqual(choice === 'heal' ? [] : choice === 'poison' ? ['Kai','Rui'] : ['Kai']);
    expect(tour.witchPotions).toEqual({heal:choice !== 'heal',poison:choice !== 'poison'});
    tour.closeWitch(); tour.next(); tour.previous(); tour.openWitch(); expect(tour.witchChoice).toBe(choice);
    expect(tour.selected).toBeNull(); expect(tour.confirmed).toBeNull();
    tour.resetWitch(); expect(tour.witchChoice).toBeNull(); expect(tour.witchPotions).toEqual({heal:true,poison:true});
    tour.chooseWitch(choice); tour.replay(); expect(tour).toEqual(new GuidedTour());
  });
  it('uses rule-consistent fictional ballots: the only wolf is eliminated regardless of the optional sample choice', () => {
    expect(SAMPLE_PLAYERS.filter(p => p.role === 'werewolf')).toEqual([{id:'alex',name:'Alex',role:'werewolf'}]);
    for (const choice of ['alex','mei','sam','lin','skip']) {
      const counts = Object.values({...SAMPLE_BALLOTS,you:choice}).reduce<Record<string,number>>((acc,id) => ({...acc,[id]:(acc[id]??0)+1}),{});
      expect(counts.alex).toBeGreaterThan(counts.skip ?? 0);
      expect(Object.entries(counts).every(([id,n]) => id === 'alex' || n < counts.alex)).toBe(true);
    }
  });
  it('uses the actual bilingual preset catalogue and has no room, credential, audio or network entry dependency', () => {
    for(const id of ['hello','suspect','explain_again'] as const) { expect(QUICK_PHRASES[id].en).toBeTruthy(); expect(QUICK_PHRASES[id].zh).toBeTruthy(); }
    for(const file of ['client/demo.ts','client/demoTour.ts','demo.html']) {
      const source=readFileSync(file,'utf8');
      expect(source).not.toMatch(/(?:localStorage|sessionStorage|document\.cookie|fetch\s*\(|WebSocket\s*\(|socket\.io-client|from\s+['"].*(?:main|server\/game))/);
    }
    const source=readFileSync('client/demo.ts','utf8'); expect(source).toContain('href="/?welcome=1"'); expect(source).toContain('Not a live multiplayer match');
  });
});
