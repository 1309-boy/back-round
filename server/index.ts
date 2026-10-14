import { Server,Room,ServerError,type Client } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import express from 'express';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Engine } from '../shared/engine.ts';
import { STEP,IDS } from '../shared/data.ts';
import { Profiles,cleanName } from './profiles.ts';

export const profiles=new Profiles();
export class BackRoundRoom extends Room {
  maxClients=2;engine!:Engine;seats=new Map<string,number>();identities:any[]=[];names:string[]=['플레이어 1','연결 대기'];started=false;paid=false;paying=false;lastSaveAttempt=0;matchId=randomUUID();frames=0;accumulator=0;offline=new Set<number>();selectionTime=0;phase='';limits=new Map<string,any>();
  async onCreate(options:any){this.engine=new Engine({mapIndex:Math.floor(Math.random()*4)});
    if(this.roomName==='private')await this.setPrivate(true);
    this.onMessage('input',(client,data)=>{const seat=this.seats.get(client.sessionId);if(seat===undefined||!this.accept(client,'input',80))return;this.engine.input(seat,data);});
    this.onMessage('action',(client,data)=>{const seat=this.seats.get(client.sessionId);if(seat===undefined||this.offline.size||!this.accept(client,'action',24))return;if(['s1','s2down','s2up','dash','ult'].includes(data?.type))this.engine.command(seat,data.type,data.aim&&Number.isFinite(data.aim.x)&&Number.isFinite(data.aim.y)?data.aim:undefined);});
    this.onMessage('select',(client,data)=>{const seat=this.seats.get(client.sessionId);if(seat===undefined||!IDS.includes(data?.character)||this.clients.length<2)return;this.engine.select(seat,data.character);});
    this.onMessage('ping',(client,data)=>{if(this.accept(client,'ping',3))client.send('pong',data);});
    this.setSimulationInterval(delta=>this.update(delta),1000/60);this.patchRate=null;
  }
  accept(client:Client,kind:string,max:number){const key=client.sessionId+kind,now=Date.now();let record=this.limits.get(key);if(!record||now-record.time>1000){record={time:now,count:0};this.limits.set(key,record);}return ++record.count<=max;}
  async onAuth(client:Client,options:any){try{const auth=await profiles.verify(options.token);if(this.identities.some(a=>a?.uid===auth.uid))throw new Error('같은 계정으로 같은 경기에 두 번 참가할 수 없습니다.');return auth;}catch(e:any){throw new ServerError(401,e.message||'로그인이 필요합니다.');}}
  async onJoin(client:Client,options:any,auth:any){const seat=this.seats.size===0?0:1;this.seats.set(client.sessionId,seat);this.identities[seat]=client.auth||auth;const profile=await profiles.get(this.identities[seat].uid);this.names[seat]=cleanName(profile.nickname);client.send('welcome',{seat,roomId:this.roomId,private:this.roomName==='private'});if(this.clients.length===2){this.started=true;await this.lock();}this.sendSnapshots();}
  async onDrop(client:Client){const seat=this.seats.get(client.sessionId);if(seat===undefined)return;this.offline.add(seat);this.broadcast('connection',{paused:true,name:this.names[seat],seconds:15});try{await this.allowReconnection(client,15);}catch{} }
  onReconnect(client:Client){const seat=this.seats.get(client.sessionId);if(seat===undefined)return;this.offline.delete(seat);client.send('welcome',{seat,roomId:this.roomId,private:this.roomName==='private'});this.broadcast('connection',{paused:this.offline.size>0});this.sendSnapshots();}
  onLeave(client:Client){const seat=this.seats.get(client.sessionId);if(seat===undefined)return;this.offline.delete(seat);if(this.started&&this.engine.state.phase!=='finished'){this.engine.state.phase='finished';this.engine.state.winner=1-seat;this.engine.state.resultReason='상대방 연결 종료';this.sendSnapshots();void this.award();}}
  update(delta:number){if(!this.started||this.offline.size)return;this.accumulator+=Math.min(delta/1000,.2);while(this.accumulator>=STEP){this.engine.tick(STEP);this.accumulator-=STEP;}
    const s=this.engine.state;if(s.phase!==this.phase){this.phase=s.phase;this.selectionTime=0;}if(s.phase==='select'){this.selectionTime+=delta/1000;if(this.selectionTime>30)for(let i=0;i<2;i++)if(!s.players[i].selected)this.engine.select(i,s.players[i].character);}
    if(++this.frames%2===0)this.sendSnapshots();if(s.phase==='finished'&&!this.paid&&!this.paying&&Date.now()-this.lastSaveAttempt>5000)void this.award();
  }
  sendSnapshots(){for(const c of this.clients){const seat=this.seats.get(c.sessionId);if(seat===undefined)continue;const view=this.engine.view(seat);view.you=seat;view.names=this.names;view.connected=this.clients.length;view.paused=this.offline.size>0;view.saved=this.paid;view.selectionRemaining=Math.max(0,30-this.selectionTime);if(view.phase==='select'){const other=1-seat,previous=this.engine.state.log.at(-1)?.characters?.[other]||'rian';view.players[other]={...view.players[other],character:previous,hp:0,maxHp:0};}c.send('state',view);}}
  async award(){if(this.paying||this.paid||this.identities.length<2)return;this.paying=true;this.lastSaveAttempt=Date.now();try{await profiles.award(this.matchId,this.identities.map(a=>a.uid),this.engine.state);this.paid=true;this.broadcast('saved',{ok:true});}catch(e){console.error('Could not save match',this.matchId,(e as Error).message);this.broadcast('saved',{ok:false});}finally{this.paying=false;}}
}
export async function startServer(port=Number(process.env.PORT)||2567){
  const server=new Server({transport:new WebSocketTransport({pingInterval:5000,pingMaxRetries:3,maxPayload:16384}),greet:false,gracefullyShutdown:false,express:app=>{
    app.use((req,res,next)=>{const origin=req.headers.origin,allowed=(process.env.CORS_ORIGINS||'').split(',').filter(Boolean);if(origin&&allowed.length&&!allowed.includes(origin))return res.status(403).json({error:'허용되지 않은 사이트입니다.'});res.setHeader('Access-Control-Allow-Origin',origin||'*');res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');res.setHeader('Access-Control-Allow-Methods','GET,POST,PATCH,OPTIONS');if(req.method==='OPTIONS')return res.sendStatus(204);next();});
    app.use(express.json({limit:'8kb'}));
    app.get('/api/health',(_req,res)=>res.json({ok:true,game:'Back round',version:'0.1.0',firebase:profiles.firebase,guestAllowed:profiles.guestAllowed}));
    const guestLimits=new Map<string,{time:number,count:number}>();
    app.post('/api/guest',async(req,res)=>{const key=req.ip||'unknown',now=Date.now();let r=guestLimits.get(key);if(!r||now-r.time>60000){r={time:now,count:0};guestLimits.set(key,r);}if(++r.count>12)return res.status(429).json({error:'잠시 후 다시 시도해주세요.'});try{res.json(await profiles.guest(cleanName(req.body?.nickname)));}catch(e:any){res.status(403).json({error:e.message});}});
    app.get('/api/profile',async(req,res)=>{try{const auth=await profiles.verify(req.headers.authorization?.replace(/^Bearer /,''));res.json(await profiles.get(auth.uid));}catch(e:any){res.status(401).json({error:e.message});}});
    app.patch('/api/profile',async(req,res)=>{try{const auth=await profiles.verify(req.headers.authorization?.replace(/^Bearer /,''));res.json(await profiles.rename(auth.uid,req.body?.nickname));}catch(e:any){res.status(401).json({error:e.message});}});
    app.get('/config.js',(_req,res)=>{let firebase:any=null;try{const raw=JSON.parse(process.env.FIREBASE_WEB_CONFIG||'null');if(raw?.apiKey)firebase=Object.fromEntries(['apiKey','authDomain','projectId','appId','messagingSenderId','storageBucket'].filter(k=>raw[k]).map(k=>[k,raw[k]]));}catch{}res.type('application/javascript').send(`window.BACKROUND_CONFIG = ${JSON.stringify({firebase})}; window.BACKROUND_CONFIG.serverUrl = window.location.origin;`);});
    app.use(express.static(path.resolve('dist'),{maxAge:0}));
  }});
  server.define('match',BackRoundRoom);server.define('private',BackRoundRoom);await server.listen(port,'0.0.0.0');return server;
}
if(process.env.BACKROUND_TEST!=='1')startServer().then(()=>console.log(`Back round: http://localhost:${Number(process.env.PORT)||2567}`)).catch(err=>{console.error(err);process.exitCode=1;});
