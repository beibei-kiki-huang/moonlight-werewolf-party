import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup as render} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {GuidedTour} from '../client/demoTour';
import {seerExample,wolfExample} from '../client/demoExamples';
import {RoleCard,VotingPanel,NightSequence} from '../client/presentation';
import type {GameView} from '../shared/types';
const en=(a:string,_b:string)=>a,zh=(_a:string,b:string)=>b;
const view:GameView={code:'ABC234',mode:'classic',day:1,phase:'seer',serverNow:0,deadline:10000,hostId:'self',youId:'self',players:[{id:'self',name:'Seer',alive:true,connected:true,ready:true}],events:[],chat:[],acted:false,role:'seer'};
describe('bounded role examples and wording',()=>{
 it.each(['alex','mei','sam','lin'] as const)('inspects %s once in a separate fictional night, preserving the result through review',target=>{
  const t=new GuidedTour();t.next();t.openSeer();t.selectSeer('skip');expect(t.seerTarget).toBeNull();t.selectSeer(target);expect(t.seerResult).toBeNull();t.confirmSeer();expect(t.seerResult).toBe(target==='alex'?'wolves':'village');
  t.selectSeer(target==='alex'?'mei':'alex');t.confirmSeer();expect(t.seerConfirmed).toBe(target);expect(t.ballot).toBeNull();t.tick(60000);expect(t.step).toBe(1);
  t.seerClueOpen=false;expect(seerExample(t,en)).not.toContain('PRIVATE SAMPLE RESULT');t.seerClueOpen=true;expect(seerExample(t,en)).toContain(target==='alex'?'Werewolf Team':'Good Team');expect(seerExample(t,zh)).toContain(target==='alex'?'狼人阵营':'好人阵营');
  t.next();t.previous();t.openSeer();expect(t.seerConfirmed).toBe(target);expect(t.seerClueOpen).toBe(false);t.resetSeer();expect(t.seerConfirmed).toBeNull();t.replay();expect(t).toEqual(new GuidedTour());
 });
 it.each(['kai','rui','mei','sam','lin'])('resolves valid sample pack choice %s using the existing tie rule',target=>{
  const t=new GuidedTour();t.next();t.openWolf();t.selectWolf('ash');expect(t.wolfTarget).toBeNull();t.selectWolf(target);t.resolveWolf();expect(t.wolfVictim).toBe(target);t.selectWolf(target==='kai'?'rui':'kai');expect(t.wolfTarget).toBe(target);
  expect(wolfExample(t,en)).toContain('Ash');expect(wolfExample(t,en)).toContain('Scripted participants.');expect(wolfExample(t,en)).toContain(target==='kai'?'intended victim':'Scripted random tie-break');t.next();t.previous();t.openWolf();expect(t.wolfResolved).toBe(true);t.resetWolf();expect(t.wolfTarget).toBeNull();t.replay();expect(t).toEqual(new GuidedTour());
 });
 it('keeps real Seer results concealed with the card and uses faction labels in both languages',()=>{
  for(const tr of [en,zh])for(const isWolf of [true,false]){
   const v={...view,investigations:[{day:1,targetId:'other',name:'Private target',isWolf}]};
   expect(render(<RoleCard view={v} visible={false} onToggle={()=>{}} tr={tr} roleName={()=>'Seer'}/>)).not.toContain('Private target');
   expect(render(<RoleCard view={v} visible onToggle={()=>{}} tr={tr} roleName={()=>'Seer'}/>)).toContain(tr(isWolf?'Werewolf Team':'Good Team',isWolf?'狼人阵营':'好人阵营'));
  }
 });
 it('uses explicit-confirmed abstention in Classic and never adds it to Duel',()=>{
  const props={eligible:[],selected:'skip',onSelect:()=>{},onConfirm:()=>{},disabled:false,pending:false,tr:en};
  const classic=render(<VotingPanel {...props} view={{...view,phase:'voting'}}/>);expect(classic).toContain('Abstain');expect(classic).toContain('Not confirmed yet');expect(classic).toContain('Confirm my vote');expect(classic).not.toContain('Skip elimination');
  expect(render(<VotingPanel {...props} selected="" view={{...view,mode:'quick',phase:'voting'}}/>)).not.toContain('Abstain');
 });
 it('uses sunrise only at dawn and never auto-exposes the main clue in voting',()=>{
  expect(render(<NightSequence phase={{mode:'classic',phase:'dawn'}} language="en" tr={en}/>)).toContain('lucide-sunrise');
  expect(render(<NightSequence phase={{mode:'classic',phase:'wolves'}} language="en" tr={en}/>)).not.toContain('lucide-sunrise');
  const source=readFileSync('client/demo.ts','utf8');expect(source).not.toContain('Private sample clue: as the Seer');expect(source).toContain('tour.mainClueOpen ?');
  expect(source).toContain('Return to Main Demo');expect(source).toContain('Try Witch Again');
 });
});
