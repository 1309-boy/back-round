import test from 'node:test';
import assert from 'node:assert/strict';
import {Engine} from '../shared/engine.ts';
import {BALANCE as B,CHARACTERS,STEP,IDS} from '../shared/data.ts';
import {rianAimPreview} from '../shared/rian-aim.ts';
const game=(character='rian')=>{const e=new Engine({characters:[character,'bena']});e.state.phase='fight';const[p,q]=e.state.players;p.x=140;p.y=650;q.x=210;q.y=650;e.input(0,{x:0,y:0,aimX:900,aimY:650});return e;};
const run=(e:Engine,time:number)=>{for(let i=0;i<Math.round(time/STEP);i++)e.tick();};

test('all base health pools are about 35% larger, preserving their order',()=>{
  const before=[132,106,112,120,158];IDS.forEach((id,i)=>assert.ok(Math.abs(CHARACTERS[id].hp/before[i]-1.35)<.005));
});
test('both melee telegraphs and impact origins follow moving casters during windup',()=>{
  for(const character of ['rian','khan']){const e=game(character),[p,q]=e.state.players,c=CHARACTERS[character as 'rian'];q.x=p.x+c.range+25;
    e.input(0,{x:1,y:0,aimX:900,aimY:650});e.command(0,'s1');e.tick();assert.equal(e.state.attacks[0].x,p.x);assert.equal(e.state.attacks[0].y,p.y);
    run(e,c.windup);assert.equal(q.hp,q.maxHp-c.damage);assert.ok(e.state.effects.some((f:any)=>f.kind==='slash'&&f.x>140));
  }
});
test('time-stopped melee windups do not follow or advance until released',()=>{
  const e=game('khan');e.state.players[1]=e.makePlayer(1,'rian',{});const q=e.state.players[1];q.x=210;q.y=650;e.command(1,'s1');const a=e.state.attacks[0];e.command(0,'s2down');run(e,.2);assert.equal(a.x,210);assert.equal(a.windup,.2);
});
test('Khan contact threshold is 64 and cast indicator expires for both views',()=>{
  for(const delta of [64,65]){const e=game('khan'),[p,q]=e.state.players;q.x=p.x+delta;e.command(0,'s2down');assert.equal(e.state.stop.canAttack,delta===64);for(const seat of [0,1])assert.equal(e.view(seat).effects.find((f:any)=>f.kind==='contact').radius,64);run(e,.7);for(const seat of [0,1])assert.ok(!e.view(seat).effects.some((f:any)=>f.kind==='contact'));}
});
test('Rian forced movement ultimate ignores dash protection without a dodge reward',()=>{
  const e=game(),[p,q]=e.state.players;p.ult=100;q.invulnerable=1;e.command(0,'ult',{x:1100,y:650});assert.ok(q.motion);assert.ok(q.stun>0);assert.equal(q.ult,0);
});
test('Bena bomb, Sean ultimate links and Winston ultimate wall hit through dash',()=>{
  const bomb=game('bena'),[p,q]=bomb.state.players;p.ult=100;q.invulnerable=2;bomb.command(0,'ult');bomb.command(0,'ult');run(bomb,.85);assert.equal(q.hp,q.maxHp-92);assert.equal(q.ult,0);
  const net=game('sean'),target=net.state.players[1];target.invulnerable=2;net.state.links.push({id:990,owner:0,ultimate:true,group:99,windup:0,life:2,damage:15,lines:[{x:100,y:650,end:{x:400,y:650},kind:'line',width:B.seanLinkWidth}]});net.tick();assert.equal(target.hp,target.maxHp-15);assert.equal(target.ult,0);
  const wall=game('winston'),[w,t]=wall.state.players;w.ult=100;t.invulnerable=2;wall.command(0,'ult');run(wall,.4);assert.equal(t.hp,t.maxHp-48);assert.ok(t.x>210);assert.equal(t.ult,0);
});
test('Sean ordinary links hit the expanded edge and use their visible width',()=>{
  const e=game('sean'),q=e.state.players[1];q.y=676;e.command(0,'s1',{x:10,y:650});e.command(0,'s1',{x:1270,y:650});assert.equal(e.state.players[0].cd1,1.5);run(e,.55);assert.equal(e.state.links[0].lines[0].width,24);run(e,.25);assert.equal(q.hp,q.maxHp-34);
});
test('Winston ordinary wall has lower damage and limited travel, without changing ultimate',()=>{
  const e=game('winston');e.command(0,'s1');const g=e.state.barriers[0];assert.equal(g.damage,19);assert.equal(g.maxTravel,250);run(e,.9);assert.equal(e.state.barriers.length,0);assert.equal(e.state.players[1].hp,e.state.players[1].maxHp-19);
});
test('dash cooldown freezes and rewinds with the rest of the character timers',()=>{
  const e=game('khan');e.state.players[1].dashCd=.3;e.command(0,'s2down');run(e,.2);assert.equal(e.state.players[1].dashCd,.3);e.command(0,'s2down');e.history=[];e.recordHistory(true);run(e,3);e.state.players[0].ult=100;e.command(0,'ult');assert.equal(e.state.players[1].dashCd,.3);
});
test('Rian preview selects cardinal travel, matches collision endpoint and marks obstructed pulls',()=>{
  const e=game(),p=e.state.players[0];for(const aim of [{x:1000,y:600},{x:100,y:20},{x:0,y:700},{x:150,y:759}]){const preview=rianAimPreview(e.state,0,aim);assert.equal(preview.kind,'move');assert.deepEqual(preview.end,e.motionEnd(p,preview.direction,false));}
  let preview=rianAimPreview(e.state,0,e.state.players[1]);assert.equal(preview.kind,'pull');assert.equal(preview.blocked,false);
  e.state.barriers.push({id:1,x:180,y:650,dx:1,dy:0,width:100,thickness:10,kind:'shield',hp:2});assert.equal(rianAimPreview(e.state,0,e.state.players[1]).blocked,true);e.state.barriers=[];p.x=400;p.y=240;e.state.players[1].x=500;e.state.players[1].y=240;assert.equal(rianAimPreview(e.state,0,e.state.players[1]).blocked,true);
});
