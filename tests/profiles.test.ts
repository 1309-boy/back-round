import test from 'node:test';
import assert from 'node:assert/strict';
import {completeProfile,applyResult} from '../server/profiles.ts';
import {BALANCE,IDS} from '../shared/data.ts';

test('a nickname-only legacy profile can receive its first match without losing fields or producing NaN',()=>{
  const legacy={uid:'google-player',nickname:'첫 플레이어',updatedAt:1};
  const profile=completeProfile(legacy.uid,legacy);
  assert.equal(profile.nickname,legacy.nickname);
  assert.equal(profile.games,0);
  assert.deepEqual(Object.keys(profile.mastery),IDS);
  const result={winner:0,log:[{characters:['rian','bena'],winner:0}]};
  const won=applyResult(legacy,result,0);
  assert.equal(won.games,1);assert.equal(won.wins,1);assert.equal(won.losses,0);
  assert.equal(won.xp,BALANCE.matchXP+BALANCE.winXP);
  assert.equal(won.mastery.rian.xp,BALANCE.masteryWin);
  assert.equal(won.nickname,legacy.nickname);
  assert.equal((legacy as any).games,undefined);
});

test('completing a profile preserves existing progress and fills newly added characters',()=>{
  const previous={uid:'google-player',nickname:'기존 플레이어',games:12,wins:8,losses:4,xp:1700,mastery:{rian:{xp:750,rounds:10,wins:7}}};
  const profile=completeProfile(previous.uid,previous);
  assert.equal(profile.games,12);assert.equal(profile.xp,1700);assert.deepEqual(profile.mastery.rian,previous.mastery.rian);
  assert.equal(profile.mastery.bena.xp,0);
});
