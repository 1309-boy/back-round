import test from 'node:test';
import assert from 'node:assert/strict';
import {Engine} from '../shared/engine.ts';
import {CHARACTERS,STEP,MAPS,R} from '../shared/data.ts';
import {drawArena} from '../src/render.ts';
const game=(character='khan')=>{const e=new Engine({characters:[character,'bena'],mapIndex:0});e.state.phase='fight';const[p,q]=e.state.players;p.x=140;p.y=650;q.x=220;q.y=650;e.input(0,{x:0,y:0,aimX:q.x,aimY:q.y});return e;};
const run=(e:Engine,time:number)=>{for(let i=0;i<Math.round(time/STEP);i++)e.tick();};

test('non-contact stop keeps opponent input, cooldown and visible health frozen until impact',()=>{
  const e=game(),[p,q]=e.state.players;q.cd1=2;e.input(1,{x:1,y:0,aimX:p.x,aimY:p.y});e.command(0,'s2down');e.command(0,'s1');
  run(e,.05);assert.equal(q.x,220);assert.equal(q.cd1,2);assert.equal(e.view(1).frozen,true);assert.equal(e.view(1).players[1].hp,q.maxHp);assert.equal(e.command(1,'dash'),false);
  run(e,.05);assert.equal(e.state.stop,null);assert.equal(q.x,220);assert.equal(q.hp,q.maxHp-19);assert.equal(e.view(1).frozen,false);assert.ok(Math.abs(p.cd2-7)<.001);e.tick();assert.ok(q.x>220);assert.ok(q.cd1<2);
});
test('manual release and five-second expiry still override an unfinished windup',()=>{
  const e=game();e.command(0,'s2down');e.command(0,'s1');e.command(0,'s2down');assert.equal(e.state.stop,null);assert.equal(e.state.attacks.length,1);
  const natural=game();natural.command(0,'s2down');run(natural,4.95);natural.command(0,'s1');run(natural,.05);assert.equal(natural.state.stop,null);assert.equal(natural.state.attacks.length,1);
});
test('cancelled windup never releases time stop or creates a melee afterimage',()=>{
  const e=game();e.command(0,'s2down');e.command(0,'s1');e.cancelWindups(0);run(e,.2);assert.ok(e.state.stop);assert.equal(e.state.players[1].hp,e.state.players[1].maxHp);assert.ok(!e.state.effects.some((f:any)=>f.kind==='slash'));
});
test('Bena spawns a faster bullet immediately and cannot fire again before one second',()=>{
  const e=game('bena');e.state.players[1].x=1000;e.command(0,'s1',{x:1000,y:650});assert.equal(e.state.attacks.length,0);assert.equal(e.state.projectiles.length,1);const bullet=e.state.projectiles[0],x=bullet.x;e.tick();assert.ok(Math.abs(bullet.x-x-1400*STEP)<.001);
  assert.equal(e.command(0,'s1'),false);run(e,.9);assert.equal(e.command(0,'s1'),false);run(e,.1);assert.equal(e.command(0,'s1'),true);
});
test('Khan and Winston increased cooldowns reject early recasts and then become ready',()=>{
  for(const [id,cd] of [['khan',.9],['winston',1.5]] as const){const e=game(id);e.command(0,'s1');assert.equal(e.state.players[0].cd1,cd);run(e,cd-.1);assert.equal(e.command(0,'s1'),false);run(e,.12);assert.equal(e.command(0,'s1'),true);}
});
test('solid walls are visibly wider using the same geometry that blocks a dash',()=>{
  for(const map of MAPS)for(const w of map.walls)assert.equal(Math.min(w.w,w.h),w.jump?20:36);
  const e=game(),p=e.state.players[0];p.x=580;p.y=250;e.input(0,{x:0,y:1,aimX:580,aimY:500});e.command(0,'dash');run(e,.15);assert.ok(p.y<=282-R);assert.ok(e.canStand(p));
  const jump=game(),j=jump.state.players[0];j.x=400;j.y=240;jump.input(0,{x:1,y:0,aimX:600,aimY:240});jump.command(0,'dash');run(jump,.15);assert.ok(j.x>460+R);assert.ok(jump.canStand(j));
});
test('successful dodge creates one stationary character afterimage, not a new damage source',()=>{
  const e=game(),p=e.state.players[0];e.command(0,'dash');assert.ok(!e.state.effects.some((f:any)=>f.kind==='dodge'));run(e,.05);e.damage(1,0,20,'one');e.damage(1,0,20,'one');e.resolveHits();const ghosts=e.state.effects.filter((f:any)=>f.kind==='dodge');assert.equal(ghosts.length,1);const g=ghosts[0];assert.equal(g.character,'khan');assert.equal(g.x,p.x);assert.equal(g.life,.45);const origin=g.x;run(e,.1);assert.equal(g.x,origin);assert.notEqual(p.x,origin);assert.equal(p.hp,p.maxHp);run(e,.4);assert.ok(!e.state.effects.some((f:any)=>f.kind==='dodge'));
});
test('melee afterimage renders the entire original sector and expires without repeated damage',()=>{
  for(const id of ['rian','khan'] as const){const e=game(id);e.command(0,'s1');const a={...e.state.attacks[0]};run(e,CHARACTERS[id].windup);const slash=e.state.effects.find((f:any)=>f.kind==='slash');assert.ok(slash);assert.equal(slash.radius,a.radius);assert.equal(slash.angle,a.angle);
    const fills:any[]=[];let path:any[]=[];const ctx:any=new Proxy({canvas:{width:1280,height:760},beginPath(){path=[];},moveTo(...v:any[]){path.push(['move',...v]);},arc(...v:any[]){path.push(['arc',...v]);},closePath(){path.push(['close']);},fill(){fills.push([...path]);}},{get(t:any,k){return k in t?t[k]:()=>{};}});
    const view=e.view(0);view.players=[];view.effects=[slash];drawArena(ctx,view,0);assert.ok(fills.some(p=>p.some((v:any)=>v[0]==='move'&&v[1]===a.x&&v[2]===a.y)&&p.some((v:any)=>v[0]==='arc'&&v[3]===a.radius)&&p.some((v:any)=>v[0]==='close')));
    const hp=e.state.players[1].hp;e.state.players[0].x+=40;run(e,.3);assert.equal(e.state.players[1].hp,hp);assert.equal(slash.x,a.x);assert.ok(!e.state.effects.some((f:any)=>f.kind==='slash'));
  }
});
