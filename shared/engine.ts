import { W,H,R,STEP,BALANCE as B,CHARACTERS,IDS,BONUS,MAPS,type CharacterId } from './data.ts';
import { clamp,distance,toward,cardinal,circleRect,inside,pointSegment,rayRect,raySegment,ends,circleBarrier,intersectsShape,raycast,wallFace,freePosition } from './geometry.ts';

const copy=<T>(v:T):T=>JSON.parse(JSON.stringify(v));
export type Action='s1'|'s2down'|'s2up'|'dash'|'ult';
export type Input={x:number;y:number;aimX:number;aimY:number};
export class Engine {
  state:any; inputs:Input[]; history:any[]=[]; nextId=1; frozenView:any=null; hits:any[]=[]; dodges=new Set<string>();
  practice:boolean; bot:boolean; botClock=0; historyClock=0; random:()=>number;
  constructor(options:any={}) {
    this.practice=!!options.practice;this.bot=!!options.bot;this.random=options.random||Math.random;
    this.inputs=[{x:0,y:0,aimX:1100,aimY:380},{x:0,y:0,aimX:180,aimY:380}];
    this.state={time:0,round:1,phase:'select',phaseTime:0,scores:[0,0],mapIndex:options.mapIndex??0,players:[],attacks:[],projectiles:[],discs:[],links:[],bombs:[],barriers:[],effects:[],stop:null,log:[],winner:-1,sequence:0,notice:'',resultReason:''};
    for(let i=0;i<2;i++)this.state.players.push(this.makePlayer(i,options.characters?.[i]||IDS[i],{}));
    if(this.practice){this.state.phase='fight';this.state.players.forEach((p:any)=>p.selected=true);this.recordHistory(true);}
  }
  id(){return this.nextId++;}
  makePlayer(i:number,character:CharacterId,bonus:any){const c=CHARACTERS[character];return {id:i,character,name:c.name,x:i===0?170:1110,y:380,angle:i===0?0:Math.PI,hp:c.hp*(1+(bonus.hp||0)),maxHp:c.hp*(1+(bonus.hp||0)),speed:c.speed*(1+Math.min(.06,bonus.speed||0)),stamina:100,ult:0,cd1:0,cd2:0,dashCd:0,cd2Max:c.cd2,charge:0,regenWait:5,staminaClock:0,stun:0,invulnerable:0,dash:0,dashDir:{x:1,y:0},motion:null,grapple:null,held2:false,selected:false,bonus:copy(bonus),lastDamage:0,discGroup:null,burst:null,localTime:0};}
  get walls(){return MAPS[this.state.mapIndex].walls;}
  get glass(){return this.state.barriers.filter((g:any)=>!g.dead);}
  frozen(i:number){return !!this.state.stop&&this.state.stop.owner!==i;}
  enemy(p:any){return this.state.players[1-p.id];}
  multiplier(p:any){return 1+(p.bonus.damage||0);}
  input(i:number,data:any){if(!this.inputs[i]||!data||typeof data!=='object')return;this.inputs[i]={x:clamp(Number(data.x)||0,-1,1),y:clamp(Number(data.y)||0,-1,1),aimX:clamp(Number(data.aimX)||0,0,W),aimY:clamp(Number(data.aimY)||0,0,H)};}
  choices(i:number){return this.state.round===1||this.state.round===7?IDS:IDS.filter(id=>id!==this.state.players[i].character);}
  select(i:number,id:CharacterId){if(this.state.phase!=='select'||!IDS.includes(id)||this.state.players[i].selected)return false;
    const old=this.state.players[i];if(this.state.round>1&&this.state.round<7&&id!==old.character){const b=BONUS[id];old.bonus[b.stat]=(old.bonus[b.stat]||0)+b.amount;}
    const bonus=this.state.round===7?{}:old.bonus;this.state.players[i]=this.makePlayer(i,id,bonus);this.state.players[i].selected=true;
    if(this.state.players.every((p:any)=>p.selected)){this.state.phase='countdown';this.state.phaseTime=3;}
    return true;
  }
  resetRound(){const s=this.state;s.round++;s.mapIndex=Math.floor(this.random()*MAPS.length);s.phase='select';s.phaseTime=0;s.stop=null;this.frozenView=null;this.history=[];this.clearField();s.players=s.players.map((p:any,i:number)=>this.makePlayer(i,p.character,s.round===7?{}:p.bonus));this.dodges.clear();}
  clearField(){for(const k of ['attacks','projectiles','discs','links','bombs','barriers','effects'])this.state[k]=[];}
  effect(kind:string,x:number,y:number,extra:any={}){this.state.effects.push({id:this.id(),kind,x,y,life:.38,...extra});this.state.sequence++;}
  aim(p:any){const input=this.inputs[p.id];return {x:input.aimX,y:input.aimY};}
  aimDir(p:any){return toward(p,this.aim(p));}
  command(i:number,action:Action,aim?:any){
    const s=this.state,p=s.players[i];if(aim)this.input(i,{...this.inputs[i],aimX:aim.x,aimY:aim.y});
    if(action==='s2up'){p.held2=false;if(p.grapple){if(p.grapple.stage==='flying')p.cd2=Math.max(0,p.cd2-3);p.grapple=null;}return true;}
    if(s.phase!=='fight'||p.hp<=0||this.frozen(i)||p.stun>0||p.motion)return false;
    if(action==='s2down'&&p.character==='khan'&&s.stop?.owner===i){this.endStop();return true;}
    if(action==='ult'&&p.character==='bena'){const bomb=s.bombs.find((b:any)=>b.owner===i);if(bomb){bomb.fuse=Math.min(.8,bomb.fuse);return true;}}
    if(p.dash>0)return false;
    if(action==='dash'){
      if(p.stamina<B.dashCost||p.dashCd>1e-9)return false;
      p.stamina-=B.dashCost;p.dashCd=B.dashCooldown;p.dash=B.dashDuration;p.invulnerable=B.dashDuration+B.dashAfterInvulnerability;
      const input=this.inputs[i];p.dashDir=(input.x||input.y)?toward({x:0,y:0},input):this.aimDir(p);p.grapple=null;
      this.effect('dash',p.x,p.y,{owner:i,dx:p.dashDir.x,dy:p.dashDir.y});return true;
    }
    if(action==='s1'){
      if(p.cd1>0)return false;
      if(s.stop?.owner===i&&!s.stop.canAttack)this.endStop();
      this.skill1(p);return true;
    }
    if(action==='s2down'){
      if(p.cd2>0)return false;
      p.held2=true;return this.skill2(p);
    }
    if(action==='ult'){
      if(p.ult<100)return false;
      if(s.stop?.owner===i&&!s.stop.canAttack)this.endStop();
      p.ult=0;p.regenWait=B.regenDelay;this.ultimate(p);return true;
    }return false;
  }
  skill1(p:any){const c=CHARACTERS[p.character as CharacterId],d=this.aimDir(p);p.angle=Math.atan2(d.y,d.x);p.regenWait=B.regenDelay;
    if(p.character==='sean'){this.launchDisc(p,false);return;}
    p.cd1=c.cd1;
    const a:any={id:this.id(),owner:p.id,x:p.x,y:p.y,dx:d.x,dy:d.y,windup:c.windup,total:c.windup,damage:c.damage*this.multiplier(p),ultimate:false};
    if(p.character==='rian'||p.character==='khan'){a.kind='sector';a.radius=c.range;a.angle=p.character==='rian'?1:.86;a.type='melee';a.followOwner=true;if(p.character==='rian'){a.damage+=(p.charge/10)*26*this.multiplier(p);p.charge=0;}}
    if(p.character==='bena'){a.kind='line';a.width=10;a.end=this.attackRayEnd(p,d,c.range,true);a.type='bullet';}
    if(p.character==='winston'){a.kind='line';a.width=108;a.end=this.attackRayEnd(p,d,c.range,false);a.type='wall';a.barrier=this.newMovingWall(p,false,d);}
    this.state.attacks.push(a);
  }
  skill2(p:any){const q=this.enemy(p),aim=this.aim(p),d=this.aimDir(p),c=CHARACTERS[p.character as CharacterId];
    p.cd2=c.cd2;p.cd2Max=c.cd2;
    if(p.character==='rian'){
      if(distance(aim,q)<=R+5){
        if(this.blockBetween(p,q,false)||q.invulnerable>0){this.effect('blocked',q.x,q.y);return true;}
        const v=toward(p,q),target={x:p.x+v.x*(R*2+8),y:p.y+v.y*(R*2+8)};
        if(!freePosition(target,this.walls,this.glass))return true;
        this.force(q,target,.1);p.cd2=5;p.cd2Max=5;this.effect('pull',q.x,q.y,{end:target,owner:p.id});
      }else{const v=cardinal(p,aim),end=this.motionEnd(p,v,false);this.force(p,end,.1,false);}
    }
    if(p.character==='bena'){
      const bomb=this.state.bombs.find((b:any)=>b.owner===p.id&&distance(aim,b)<22);
      if(bomb){if(freePosition(bomb,this.walls,this.glass)){const old={x:p.x,y:p.y};p.x=bomb.x;p.y=bomb.y;bomb.x=old.x;bomb.y=old.y;this.effect('swap',p.x,p.y,{owner:p.id});}else{p.cd2=0;}return true;}
      if(distance(aim,q)>R+5){p.cd2=0;return false;}
      if(q.invulnerable>0){this.dodge(q,`swap-${this.id()}`);return true;}
      if(!freePosition(q,this.walls,this.glass)||!freePosition(p,this.walls,this.glass)){p.cd2=0;return false;}
      const old={x:p.x,y:p.y};p.x=q.x;p.y=q.y;q.x=old.x;q.y=old.y;p.grapple=null;q.grapple=null;this.effect('swap',p.x,p.y,{owner:p.id});this.effect('swap',q.x,q.y,{owner:p.id});
    }
    if(p.character==='khan'){
      if(this.state.stop){p.cd2=0;return false;}
      this.effect('contact',p.x,p.y,{owner:p.id,radius:B.stopContact,life:.65});
      if(q.invulnerable>0){this.dodge(q,`stop-${this.id()}`);return true;}
      this.frozenView=copy(this.state);this.state.stop={owner:p.id,remaining:5,canAttack:distance(p,q)<=B.stopContact};
      this.effect('stop',p.x,p.y,{owner:p.id,life:.5});
    }
    if(p.character==='sean'){
      const hit=raycast(p,d,this.walls);p.grapple={id:this.id(),stage:'flying',x:p.x,y:p.y,end:{x:hit.x,y:hit.y},dx:d.x,dy:d.y,hitGlass:[]};
    }
    if(p.character==='winston'){
      const pos={x:p.x+d.x*48,y:p.y+d.y*48};if(this.walls.some(w=>circleRect(pos,4,w))){p.cd2=0;return false;}
      this.state.barriers.push({id:this.id(),owner:p.id,...pos,dx:d.x,dy:d.y,width:132,thickness:10,hp:2,life:3,kind:'shield',dead:false});
      this.effect('shield',pos.x,pos.y,{owner:p.id});
    }return true;
  }
  ultimate(p:any){const s=this.state,q=this.enemy(p),d=this.aimDir(p);
    if(p.character==='rian'){
      const dir=cardinal(q,this.aim(p));const end=this.motionEnd(q,dir,true);this.force(q,end,.1);this.effect('gravity',q.x,q.y,{end,owner:p.id,life:.3});
    }
    if(p.character==='bena')s.bombs.push({id:this.id(),owner:p.id,x:p.x,y:p.y,fuse:10,radius:180,damage:92*this.multiplier(p)});
    if(p.character==='khan')this.rewind(p.id);
    if(p.character==='sean')p.burst={remaining:6,timer:0,group:this.id()};
    if(p.character==='winston'){
      const a={id:this.id(),owner:p.id,x:p.x,y:p.y,dx:d.x,dy:d.y,kind:'line',width:250,end:this.attackRayEnd(p,d,680,false),windup:.25,total:.25,type:'wall',ultimate:true,damage:48*this.multiplier(p),barrier:this.newMovingWall(p,true,d)};s.attacks.push(a);
    }
  }
  newMovingWall(p:any,ultimate:boolean,d:any){const g={id:this.id(),owner:p.id,x:p.x+d.x*42,y:p.y+d.y*42,dx:d.x,dy:d.y,width:ultimate?250:108,thickness:10,life:3,hp:9999,kind:'moving',active:false,ultimate,damage:(ultimate?48:CHARACTERS.winston.damage)*this.multiplier(p),travel:0,maxTravel:ultimate?680:CHARACTERS.winston.range,speed:ultimate?570:480,hit:[],dead:false};this.state.barriers.push(g);return g.id;}
  attackRayEnd(p:any,d:any,range:number,glass:boolean){const hit=raycast(p,d,this.walls),length=Math.min(range,distance(p,hit));let end={x:p.x+d.x*length,y:p.y+d.y*length};if(glass)for(const g of this.glass){const[a,b]=ends(g),t=raySegment(p,end,a,b);if(t!==null)end={x:p.x+(end.x-p.x)*t,y:p.y+(end.y-p.y)*t};}return end;}
  force(p:any,to:any,duration:number,stun=true){p.motion={from:{x:p.x,y:p.y},to:{x:to.x,y:to.y},duration,elapsed:0};if(stun){p.stun=Math.max(p.stun,duration);this.cancelWindups(p.id);}p.grapple=null;p.dash=0;}
  cancelWindups(owner:number){this.state.attacks=this.state.attacks.filter((a:any)=>a.owner!==owner);this.state.barriers=this.state.barriers.filter((g:any)=>g.owner!==owner||g.kind!=='moving'||g.active);}
  motionEnd(p:any,d:any,ultimate:boolean){const hit=raycast(p,d,this.walls,R+1);let end={x:hit.x,y:hit.y};
    for(const g of this.glass){const[a,b]=ends(g),t=raySegment(p,end,a,b);if(t!==null){if(ultimate){g.dead=true;this.effect('shatter',g.x,g.y);}else{end={x:p.x+(end.x-p.x)*t-d.x*(R+7),y:p.y+(end.y-p.y)*t-d.y*(R+7)};}}}return end;
  }
  endStop(){const stop=this.state.stop;if(!stop)return;const p=this.state.players[stop.owner];p.cd2=Math.max(0,p.cd2-Math.max(0,stop.remaining));p.cd2Max=12;this.state.stop=null;this.frozenView=null;this.effect('resume',p.x,p.y,{owner:p.id,life:.45});}
  rewind(owner:number){const entry=[...this.history].reverse().find(h=>h.time<=this.state.time-3)||this.history[0];if(!entry){this.state.players[owner].ult=0;return;}
    const old=this.state,snap=copy(entry.state);for(const key of ['players','projectiles','discs','links','bombs','barriers'])old[key]=snap[key];old.attacks=[];
    old.barriers=old.barriers.filter((g:any)=>g.kind!=='moving'||g.active);
    old.stop=snap.stop;old.players[owner].ult=0;old.effects=[];this.hits=[];this.dodges.clear();
    if(old.stop)this.frozenView=copy(entry.frozenView||old);else this.frozenView=null;
    this.history=[];this.recordHistory(true);this.effect('rewind',W/2,H/2,{owner,life:.65});old.notice='3초 전으로 되감기';
  }
  launchDisc(p:any,ultimate:boolean,groupOverride?:number){
    const aim=this.aim(p),d=this.aimDir(p);let hit:any;
    const targetWall=this.walls.find(w=>inside(aim,w));
    if(targetWall)hit={x:aim.x,y:aim.y,wall:targetWall,face:wallFace(aim,targetWall)};
    else hit=raycast(p,d,this.walls);
    let group:number;
    if(ultimate)group=groupOverride!;
    else if(p.discGroup!==null){group=p.discGroup;p.discGroup=null;p.cd1=CHARACTERS.sean.cd1;}
    else{group=this.id();p.discGroup=group;}
    this.state.discs.push({id:this.id(),group,owner:p.id,ultimate,x:p.x,y:p.y,start:{x:p.x,y:p.y},end:{x:hit.x,y:hit.y},face:hit.face,attached:false,speed:2200,hitGlass:[]});
  }
  blockBetween(a:any,b:any,consume:boolean,ultimate=false,attackId?:number){
    if(this.walls.some(w=>rayRect(a,b,w)!==null))return true;
    for(const g of this.glass){const[e1,e2]=ends(g);if(raySegment(a,b,e1,e2)!==null){if(ultimate){g.dead=true;this.effect('shatter',g.x,g.y);continue;}if(consume&&g.kind==='shield')this.damageGlass(g,attackId);return true;}}return false;
  }
  damageGlass(g:any,attackId?:number){if(g.dead)return;if(attackId!==undefined){g.blockedIds??=[];if(g.blockedIds.includes(attackId))return;g.blockedIds.push(attackId);}g.hp--;this.effect('glasshit',g.x,g.y);if(g.hp<=0){g.dead=true;this.effect('shatter',g.x,g.y);}}
  dodge(p:any,key:string|number){const k=`${p.id}:${key}`;if(this.dodges.has(k))return;this.dodges.add(k);p.ult=Math.min(100,p.ult+B.ultimateDodge);this.effect('dodge',p.x,p.y,{owner:p.id});}
  damage(owner:number,target:number,amount:number,key:any,ultimate=false,origin?:any,melee=false){
    const p=this.state.players[target];if(p.invulnerable>0&&!ultimate){this.dodge(p,key);return false;}
    if(origin&&melee&&this.blockBetween(origin,p,true,ultimate,Number(key)))return false;
    this.hits.push({owner,target,amount,key,ultimate});return true;
  }
  resolveHits(){
    for(const h of this.hits){const p=this.state.players[h.target],owner=this.state.players[h.owner];p.hp-=h.amount;p.lastDamage=h.amount;p.regenWait=5;if(!h.ultimate)owner.ult=Math.min(100,owner.ult+B.ultimateHit);this.effect('hit',p.x,p.y,{owner:h.owner,target:h.target,amount:Math.round(h.amount),life:.5});}
    this.hits=[];
    const dead=this.state.players.map((p:any)=>p.hp<=0);if(!dead.some(Boolean))return;
    if(this.state.stop)this.endStop();
    if(this.practice){for(let i=0;i<2;i++)if(dead[i]){const old=this.state.players[i];this.state.players[i]=this.makePlayer(i,old.character,{});this.state.players[i].selected=true;this.effect('respawn',this.state.players[i].x,380,{owner:i});}return;}
    let winner:number,reason='KO';if(dead[0]&&dead[1]){const [a,b]=this.state.players;if(Math.abs(a.lastDamage-b.lastDamage)<1e-9){winner=this.random()<.5?0:1;reason='동시 사망 · 같은 최종 피해 · 무작위 판정';}else{winner=a.lastDamage<b.lastDamage?0:1;reason='동시 사망 · 최종 피해량 비교';}}else winner=dead[0]?1:0;
    this.finishRound(winner,reason);
  }
  finishRound(winner:number,reason:string){const s=this.state;s.scores[winner]++;s.log.push({round:s.round,winner,characters:s.players.map((p:any)=>p.character),reason});s.resultReason=reason;s.winner=winner;
    if(s.scores[winner]>=4){s.phase='finished';s.phaseTime=0;}else{s.phase='roundEnd';s.phaseTime=3;}s.stop=null;this.frozenView=null;
  }
  move(p:any,dx:number,dy:number,dashing=false){const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/6)),sx=dx/steps,sy=dy/steps;let blocked=false;
    for(let j=0;j<steps;j++){const old={x:p.x,y:p.y};let next={x:p.x+sx,y:p.y};if(this.canStand(next,dashing))p.x=next.x;else blocked=true;next={x:p.x,y:p.y+sy};if(this.canStand(next,dashing))p.y=next.y;else blocked=true;if(p.x===old.x&&p.y===old.y)break;}return !blocked;
  }
  canStand(p:any,dash=false){return p.x>=R+20&&p.x<=W-R-20&&p.y>=R+20&&p.y<=H-R-20&&!this.walls.some(w=>(!dash||!w.jump)&&circleRect(p,R,w))&&!this.glass.some(g=>circleBarrier(p,R,g));}
  landDash(p:any){if(this.canStand(p))return;const d=p.dashDir;for(let k=1;k<=50;k++){for(const sign of [1,-1]){const next={x:p.x+d.x*k*3*sign,y:p.y+d.y*k*3*sign};if(this.canStand(next)){p.x=next.x;p.y=next.y;return;}}}}
  tick(dt=STEP){
    const s=this.state;s.time+=dt;s.effects=s.effects.filter((e:any)=>{e.life-=dt;return e.life>0;});
    if(s.phase==='countdown'){s.phaseTime-=dt;if(s.phaseTime<=0){s.phase='fight';s.phaseTime=0;this.history=[];this.recordHistory(true);}return;}
    if(s.phase==='roundEnd'){s.phaseTime-=dt;if(s.phaseTime<=0)this.resetRound();return;}
    if(s.phase!=='fight')return;
    if(s.stop){s.stop.remaining-=dt;if(s.stop.remaining<=0)this.endStop();}
    if(this.bot)this.botTick(dt);
    for(const p of s.players){if(this.frozen(p.id))continue;p.localTime+=dt;p.dashCd=Math.max(0,p.dashCd-dt);p.cd1=Math.max(0,p.cd1-dt);p.cd2=Math.max(0,p.cd2-dt);p.stun=Math.max(0,p.stun-dt);p.invulnerable=Math.max(0,p.invulnerable-dt);p.regenWait=Math.max(0,p.regenWait-dt);p.staminaClock+=dt;
      while(p.staminaClock>=B.staminaTick-1e-9){p.stamina=Math.min(100,p.stamina+B.staminaPerTick*(1+(p.bonus.stamina||0)));p.staminaClock-=B.staminaTick;}
      if(p.regenWait<=0)p.hp=Math.min(p.maxHp,p.hp+B.regenPerSecond*(1+(p.bonus.regen||0))*dt);
      if(p.character==='rian')p.charge=Math.min(10,p.charge+dt);
      if(p.burst){p.burst.timer-=dt;if(p.burst.timer<=0){this.launchDisc(p,true,p.burst.group);p.burst.remaining--;p.burst.timer+=.1;if(!p.burst.remaining)p.burst=null;}}
      if(p.motion){const m=p.motion;m.elapsed+=dt;const t=Math.min(1,m.elapsed/m.duration);p.x=m.from.x+(m.to.x-m.from.x)*t;p.y=m.from.y+(m.to.y-m.from.y)*t;if(t>=1)p.motion=null;continue;}
      if(p.stun>0)continue;
      if(p.dash>0){const used=Math.min(dt,p.dash);this.move(p,p.dashDir.x*B.dashSpeed*used,p.dashDir.y*B.dashSpeed*used,true);p.dash=Math.max(0,p.dash-dt);if(!p.dash)this.landDash(p);continue;}
      if(p.grapple){this.updateGrapple(p,dt);continue;}
      const input=this.inputs[p.id],len=Math.hypot(input.x,input.y)||1;this.move(p,input.x/Math.max(1,len)*p.speed*dt,input.y/Math.max(1,len)*p.speed*dt);p.angle=Math.atan2(input.aimY-p.y,input.aimX-p.x);
    }
    this.updateAttacks(dt);this.updateProjectiles(dt);this.updateDiscs(dt);this.updateLinks(dt);this.updateBombs(dt);this.updateBarriers(dt);this.resolveHits();
    this.historyClock+=dt;if(this.historyClock>=.05){this.historyClock=0;this.recordHistory();}
  }
  updateAttacks(dt:number){const s=this.state;for(const a of s.attacks){if(this.frozen(a.owner))continue;if(a.followOwner){const owner=s.players[a.owner];a.x=owner.x;a.y=owner.y;}a.windup-=dt;if(a.windup>1e-9)continue;a.dead=true;
      if(a.type==='melee'){const q=s.players[1-a.owner];if(intersectsShape(a,q))this.damage(a.owner,q.id,a.damage,a.id,a.ultimate,a,true);this.effect('slash',a.x,a.y,{owner:a.owner,dx:a.dx,dy:a.dy,radius:a.radius,angle:a.angle});}
      if(a.type==='bullet')s.projectiles.push({id:a.id,owner:a.owner,x:a.x+a.dx*19,y:a.y+a.dy*19,dx:a.dx,dy:a.dy,speed:980,damage:a.damage,remaining:900});
      if(a.type==='wall'){const g=s.barriers.find((g:any)=>g.id===a.barrier);if(g&&!g.dead)g.active=true;}
    }s.attacks=s.attacks.filter((a:any)=>!a.dead);
  }
  updateProjectiles(dt:number){const s=this.state;for(const b of s.projectiles){if(this.frozen(b.owner))continue;const end={x:b.x+b.dx*b.speed*dt,y:b.y+b.dy*b.speed*dt};let collision:any=null;
      for(const w of this.walls){const t=rayRect(b,end,w);if(t!==null&&(!collision||t<collision.t))collision={t,type:'wall'};}
      for(const g of this.glass){const[a,c]=ends(g),t=raySegment(b,end,a,c);if(t!==null&&(!collision||t<collision.t))collision={t,type:'glass',g};}
      const q=s.players[1-b.owner];const v=toward(b,end),proj=(q.x-b.x)*v.x+(q.y-b.y)*v.y,dist=distance(b,end);if(pointSegment(q,b,end)<=R+3&&proj>=-R){const t=clamp((proj-R)/dist,0,1);if(!collision||t<collision.t)collision={t,type:'player',q};}
      if(collision){if(collision.type==='player')this.damage(b.owner,collision.q.id,b.damage,b.id);if(collision.type==='glass'&&collision.g.kind==='shield')this.damageGlass(collision.g,b.id);b.dead=true;}
      b.x=end.x;b.y=end.y;b.remaining-=b.speed*dt;if(b.remaining<=0)b.dead=true;
    }s.projectiles=s.projectiles.filter((b:any)=>!b.dead);
  }
  passGlass(a:any,b:any,projectile:any){for(const g of this.glass){if(g.kind!=='shield'||projectile.hitGlass.includes(g.id))continue;const[e1,e2]=ends(g);if(raySegment(a,b,e1,e2)!==null){projectile.hitGlass.push(g.id);this.damageGlass(g,projectile.id);}}}
  updateDiscs(dt:number){const s=this.state;for(const d of s.discs){if(d.attached||this.frozen(d.owner))continue;const dir=toward(d,d.end),travel=Math.min(distance(d,d.end),d.speed*dt),next={x:d.x+dir.x*travel,y:d.y+dir.y*travel};this.passGlass(d,next,d);d.x=next.x;d.y=next.y;if(distance(d,d.end)<1)d.attached=true;}
    const groups=new Set<number>(s.discs.map((d:any)=>d.group));for(const group of groups){const discs=s.discs.filter((d:any)=>d.group===group),first=discs[0];if(first.linked||!discs.every((d:any)=>d.attached)||discs.length!==(first.ultimate?6:2))continue;
      discs.forEach((d:any)=>d.linked=true);const lines:any[]=[];for(let i=0;i<discs.length;i++)for(let j=i+1;j<discs.length;j++){if(first.ultimate&&discs[i].face===discs[j].face)continue;lines.push({x:discs[i].x,y:discs[i].y,end:{x:discs[j].x,y:discs[j].y},kind:'line',width:B.seanLinkWidth});}
      s.links.push({id:this.id(),group,owner:first.owner,ultimate:first.ultimate,lines,windup:.2,life:2,damage:(first.ultimate?15:34)*this.multiplier(s.players[first.owner])});
    }
  }
  updateLinks(dt:number){const s=this.state;for(const l of s.links){if(this.frozen(l.owner))continue;if(l.windup>0){l.windup-=dt;continue;}const q=s.players[1-l.owner];const crossing=l.lines.filter((line:any)=>intersectsShape(line,q)).length;
      if(l.ultimate){for(const line of l.lines)for(const g of this.glass){const[a,b]=ends(g);if(raySegment(line,line.end,a,b)!==null)g.dead=true;}if(crossing)this.damage(l.owner,q.id,l.damage*crossing,l.id,true);l.dead=true;this.effect('network',0,0,{lines:l.lines,life:.35,owner:l.owner});}
      else if(crossing){if(this.damage(l.owner,q.id,l.damage,l.id))l.dead=true;}
      l.life-=dt;if(l.life<=0)l.dead=true;if(l.dead)s.discs=s.discs.filter((d:any)=>d.group!==l.group);
    }s.links=s.links.filter((l:any)=>!l.dead);
  }
  updateBombs(dt:number){const s=this.state;for(const b of s.bombs){if(this.frozen(b.owner))continue;b.fuse-=dt;if(b.fuse>0)continue;b.dead=true;
      for(const g of this.glass)if(distance(g,b)<=b.radius+g.width/2){g.dead=true;this.effect('shatter',g.x,g.y);}
      const q=s.players[1-b.owner];if(distance(q,b)<=b.radius+R)this.damage(b.owner,q.id,b.damage,b.id,true,b,true);this.effect('explosion',b.x,b.y,{radius:b.radius,owner:b.owner,life:.55});
    }s.bombs=s.bombs.filter((b:any)=>!b.dead);
  }
  updateBarriers(dt:number){const s=this.state;for(const g of s.barriers){if(g.dead||this.frozen(g.owner))continue;g.life-=dt;if(g.life<=0){g.dead=true;continue;}if(g.kind!=='moving'||!g.active)continue;
      const step=g.speed*dt,old={x:g.x,y:g.y},next={x:g.x+g.dx*step,y:g.y+g.dy*step};
      if(this.walls.some(w=>rayRect(old,next,w)!==null)){
        g.dead=true;this.effect('shatter',g.x,g.y,{width:g.width,life:.5});if(g.ultimate){const q=s.players[1-g.owner];if(distance(q,g)<=125+R)this.damage(g.owner,q.id,30*this.multiplier(s.players[g.owner]),`break-${g.id}`,true);this.effect('explosion',g.x,g.y,{radius:125,owner:g.owner,life:.4});}continue;
      }
      for(const shield of this.glass){if(shield.id===g.id||shield.kind!=='shield')continue;const [a,b]=ends(g),[c,d]=ends(shield);if(raySegment(a,b,c,d)!==null||circleBarrier(next,8,shield)){if(g.ultimate){shield.dead=true;this.effect('shatter',shield.x,shield.y);}else{this.damageGlass(shield,g.id);g.dead=true;}}}
      if(g.dead)continue;g.x=next.x;g.y=next.y;g.travel+=step;
      const q=s.players[1-g.owner];if(circleBarrier(q,R+step,g)){
        if(q.invulnerable>0&&!g.ultimate)this.dodge(q,g.id);
        else{if(!g.hit.includes(q.id)){if(this.damage(g.owner,q.id,g.damage,g.id,g.ultimate)){g.hit.push(q.id);}}
          const desired={x:q.x+g.dx*(step+4),y:q.y+g.dy*(step+4)};
          if(!this.walls.some(w=>circleRect(desired,R,w))){q.x=desired.x;q.y=desired.y;}q.stun=Math.max(q.stun,.06);this.cancelWindups(q.id);
        }
      }
      if(g.travel>=g.maxTravel)g.dead=true;
    }s.barriers=s.barriers.filter((g:any)=>!g.dead);
  }
  updateGrapple(p:any,dt:number){const g=p.grapple;if(!p.held2){p.grapple=null;return;}if(g.stage==='flying'){const dir=toward(g,g.end),travel=Math.min(distance(g,g.end),2000*dt),end={x:g.x+dir.x*travel,y:g.y+dir.y*travel};this.passGlass(g,end,g);g.x=end.x;g.y=end.y;if(distance(g,g.end)<1)g.stage='attached';}
    else{const dir=toward(p,g.end);if(distance(p,g.end)<R+12){p.grapple=null;return;}const clear=this.move(p,dir.x*p.speed*B.grappleSpeed*dt,dir.y*p.speed*B.grappleSpeed*dt);if(!clear)p.grapple=null;}
  }
  recordHistory(force=false){if(this.state.phase!=='fight'&&!force)return;const state=copy(this.state);state.effects=[];state.log=[];this.history.push({time:this.state.time,state,frozenView:this.frozenView?copy(this.frozenView):null});while(this.history.length>1&&this.history[0].time<this.state.time-3.3)this.history.shift();}
  view(i:number){if(this.frozen(i)&&this.frozenView){const snap=copy(this.frozenView);snap.effects=snap.effects.filter((e:any)=>e.kind!=='contact');snap.effects.push(...copy(this.state.effects.filter((e:any)=>e.kind==='contact')));snap.frozen=true;snap.stop={...this.state.stop};snap.phase=this.state.phase;return snap;}return {...copy(this.state),frozen:false};}
  botTick(dt:number){const s=this.state,p=s.players[1],q=s.players[0];if(this.frozen(1)||p.stun>0)return;this.botClock+=dt;const dist=distance(p,q),dir=toward(p,q),ranged=p.character==='bena'||p.character==='sean',desired=ranged?310:75;
    const side=Math.sin(s.time*1.4),tow=dist>desired?1:dist<desired-50?-.7:0;let mx=dir.x*tow-dir.y*side*.5,my=dir.y*tow+dir.x*side*.5;
    if(!this.canStand({x:p.x+mx*38,y:p.y+my*38})){mx=-dir.y;my=dir.x;if(!this.canStand({x:p.x+mx*38,y:p.y+my*38})){mx=dir.y;my=-dir.x;}}
    const aim=p.character==='sean'?{x:clamp(q.x+Math.cos(s.time*2)*220,20,W-20),y:Math.sin(s.time*2)>0?10:H-10}:q;
    this.input(1,{x:mx,y:my,aimX:aim.x,aimY:aim.y});
    if(this.botClock>.18){this.botClock=0;if(dist<(ranged?700:130))this.command(1,'s1');if(p.cd2<=0&&dist<260)this.command(1,'s2down');if(p.grapple&&distance(p,q)<100)this.command(1,'s2up');if(p.ult>=100&&dist<400)this.command(1,'ult');
      const threat=s.attacks.some((a:any)=>a.owner===0&&intersectsShape(a,p));if(threat&&p.stamina>=B.dashCost)this.command(1,'dash');}
  }
}

