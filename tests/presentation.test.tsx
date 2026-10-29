import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DiscussionChat, Outcome, RoleCard, VotingPanel } from '../client/presentation';
import type { GameView, Role } from '../shared/types';

const en = (english: string) => english;
const zh = (_english: string, chinese: string) => chinese;
const names = (role: Role) => ({ werewolf: 'Werewolf', villager: 'Villager', seer: 'Seer', witch: 'Witch' })[role];
function view(role: Role = 'werewolf'): GameView {
  return { code: 'ABC234', mode: 'classic', phase: 'reveal', day: 1, serverNow: 0, deadline: 30_000,
    hostId: 'self', youId: 'self', role, players: [
      { id: 'self', name: 'Luna', connected: true, ready: true, alive: true },
      { id: 'other', name: 'Sol', connected: true, ready: true, alive: true },
    ], events: [], chat: [], acted: false, wolfTeam: role === 'werewolf' ? ['self', 'other'] : undefined };
}

describe('illustrated interface privacy and feedback', () => {
  it.each(['werewolf', 'villager', 'seer', 'witch'] as Role[])('keeps %s artwork and private details out of a concealed card', role => {
    const state = view(role); state.investigations = [{ day: 1, targetId: 'other', name: 'Secret investigation', isWolf: true }];
    const html = renderToStaticMarkup(<RoleCard view={state} visible={false} onToggle={() => {}} tr={en} roleName={names} />);
    expect(html).toContain('Reveal my role'); expect(html).not.toContain(`/art/${role}`);
    expect(html).not.toContain('Your pack:'); expect(html).not.toContain('Secret investigation');
    expect(html).not.toContain('is-revealed');
  });
  it.each(['werewolf', 'villager', 'seer', 'witch'] as Role[])('reveals only the authorized %s portrait with readable text', role => {
    const html = renderToStaticMarkup(<RoleCard view={view(role)} visible onToggle={() => {}} tr={en} roleName={names} />);
    expect(html).toContain(`/art/${role}-360.webp`); expect(html).toContain('Hide my role');
    expect(html).toContain(`<h2>${names(role)}</h2>`);
    for (const other of ['werewolf', 'villager', 'seer', 'witch']) if (other !== role) expect(html).not.toContain(`/art/${other}-`);
  });
  it('distinguishes an unconfirmed draft from a saved vote and allows a new draft without hiding the saved receipt', () => {
    const state = { ...view('villager'), phase: 'voting' as const };
    const props = { view: state, eligible: state.players.slice(1), onSelect: () => {}, onConfirm: () => {}, disabled: false, pending: false, tr: en };
    const draft = renderToStaticMarkup(<VotingPanel {...props} selected="other" />);
    expect(draft).toContain('Not confirmed yet'); expect(draft).toContain('Confirm my vote'); expect(draft).not.toContain('Your vote is confirmed');
    state.acted = true; state.selection = 'other';
    const saved = renderToStaticMarkup(<VotingPanel {...props} selected="other" />);
    expect(saved).toContain('Your vote is confirmed'); expect(saved).toContain('Waiting for the reveal');
    expect(saved).toContain('is-confirmed');
    const changed = renderToStaticMarkup(<VotingPanel {...props} selected="skip" />);
    expect(changed).toContain('Confirm new vote'); expect(changed).toContain('Your saved vote is still:');
    expect(changed).not.toContain('Your vote is confirmed');
  });
  it('uses only neutral choices in a secret Duel ballot, never another player’s character image', () => {
    const state = { ...view(), mode: 'quick' as const, phase: 'voting' as const };
    const html = renderToStaticMarkup(<VotingPanel view={state} eligible={[]} selected="center" onSelect={() => {}} onConfirm={() => {}} disabled={false} pending={false} tr={en} />);
    expect(html).toContain('The center card'); expect(html).toContain('The other player'); expect(html).not.toContain('/art/');
  });
  it('preserves Chinese vote confirmation and keeps discussion open with safely escaped text', () => {
    const state = { ...view('villager'), phase: 'discussion' as const, acted: true, selection: 'other', chat: [{ id: '1', playerId: 'other', name: 'Sol', text: '<img src=x onerror=alert(1)>' }] };
    const vote = renderToStaticMarkup(<VotingPanel view={state} eligible={state.players.slice(1)} selected="other" onSelect={() => {}} onConfirm={() => {}} disabled={false} pending={false} tr={zh} />);
    expect(vote).toContain('你的投票已确认'); expect(vote).toContain('等待揭晓');
    const chat = renderToStaticMarkup(<DiscussionChat view={state} canChat connected pending={false} send={async () => true} tr={zh} />);
    expect(chat).toContain('discussion-open'); expect(chat).toContain('月下交谈'); expect(chat).toContain('textarea');
    expect(chat).toContain('&lt;img'); expect(chat).not.toContain('<img src=x');
  });
  it.each([
    ['werewolf', 'wolves', 'You won with your faction'],
    ['werewolf', 'village', 'Your faction fell this night'],
    ['villager', 'village', 'You won with your faction'],
    ['villager', 'wolves', 'Your faction fell this night'],
    ['seer', 'draw', 'A shared draw'],
  ] as const)('presents the correct personal result for %s / %s', (role, winner, text) => {
    const state = { ...view(role), phase: 'ended' as const, winner };
    state.players[0].role = role; state.players[1].role = 'villager';
    const html = renderToStaticMarkup(<Outcome view={state} host disabled={false} onRematch={() => {}} tr={en} roleName={names} ballots={null} />);
    expect(html).toContain(text); expect(html).toContain('Play another night'); expect(html).toContain('The secrets we kept');
    const guest = renderToStaticMarkup(<Outcome view={state} host={false} disabled={false} onRematch={() => {}} tr={en} roleName={names} ballots={null} />);
    expect(guest).not.toContain('Play another night'); expect(guest).toContain('Waiting for the host');
  });
});
