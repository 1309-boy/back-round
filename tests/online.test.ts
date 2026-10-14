import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {Client} from '@colyseus/sdk';
import {matchMaker} from '@colyseus/core';
const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function until(test:()=>boolean,timeout=7000){const start=Date.now();while(!test()){if(Date.now()-start>timeout)throw new Error('Timed out waiting for online state');await delay(25);}}
test('two real online clients join, select, move, damage, forfeit and save verified results',{timeout:20000},async()=>{
  process.env.BACKROUND_TEST='1';process.env.ALLOW_GUEST='1';const dataDir=await mkdtemp(path.join(tmpdir(),'backround-'));process.env.DATA_DIR=dataDir;
  const {startServer,profiles}=await import('../server/index.ts');const server=await startServer(0);const port=(server.transport as any).server.address().port,url=`http://127.0.0.1:${port}`;const rooms:any[]=[];
  try{
    const guest=async(name:string)=>{const r=await fetch(url+'/api/guest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nickname:name})});return r.json();};
    const a=await guest('테스터 A'),b=await guest('테스터 B'),c=await guest('랜덤 대기');
    const health=await (await fetch(url+'/api/health')).json();assert.equal(health.ok,true);
    const ca=new Client(url),cb=new Client(url),cc=new Client(url);const ra=await ca.create('private',{token:a.token});rooms.push(ra);(matchMaker.getLocalRoomById(ra.roomId) as any).engine.state.mapIndex=0;let av:any,bv:any;ra.onMessage('state',s=>av=s);ra.onMessage('welcome',()=>{});ra.onMessage('saved',()=>{});ra.onMessage('connection',()=>{});
    const queue=await cc.joinOrCreate('match',{token:c.token});rooms.push(queue);queue.onMessage('welcome',()=>{});queue.onMessage('state',()=>{});assert.notEqual(queue.roomId,ra.roomId);
    const rb=await cb.joinById(ra.roomId,{token:b.token});rooms.push(rb);rb.onMessage('state',s=>bv=s);rb.onMessage('welcome',()=>{});rb.onMessage('saved',()=>{});rb.onMessage('connection',()=>{});
    await until(()=>av?.connected===2&&bv?.connected===2);assert.equal(av.you,0);assert.equal(bv.you,1);
    ra.send('select',{character:'bena'});rb.send('select',{character:'rian'});try{await until(()=>av?.phase==='fight'&&bv?.phase==='fight');}catch(e){throw new Error(`Selection did not start: ${JSON.stringify({a:av&&{phase:av.phase,time:av.phaseTime,selected:av.players.map(p=>p.selected),you:av.you},b:bv&&{phase:bv.phase,time:bv.phaseTime,selected:bv.players.map(p=>p.selected),you:bv.you}})}`);}
    const start=av.players[0].x;ra.send('input',{x:1,y:0,aimX:1110,aimY:380});await delay(400);ra.send('input',{x:0,y:0,aimX:1110,aimY:380});await delay(100);assert.ok(av.players[0].x>start+40);
    const hp=av.players[1].hp;ra.send('action',{type:'s1',aim:{x:1110,y:380}});await until(()=>av.players[1].hp<hp,3500);assert.equal(Math.round(av.players[1].hp),Math.round(hp-20));
    // Client-provided damage/state data is ignored: only known action/input messages exist.
    ra.send('action',{type:'setHp',amount:0,target:1});await delay(100);assert.ok(av.players[1].hp>0);
    await rb.leave();await until(()=>av.phase==='finished');assert.equal(av.winner,0);await until(()=>av.saved===true);
    const profile=await(await fetch(url+'/api/profile',{headers:{Authorization:`Bearer ${a.token}`}})).json();assert.equal(profile.games,1);assert.equal(profile.wins,1);assert.equal(profile.nickname,'테스터 A');
    const denied=await fetch(url+'/api/profile',{headers:{Authorization:`Bearer ${a.token.slice(0,-2)}XX`}});assert.equal(denied.status,401);
  }finally{for(const r of rooms)try{if(r.connection.isOpen)await r.leave();}catch{}await server.gracefullyShutdown(false);await profiles.queue;await rm(dataDir,{recursive:true,force:true});}
});
