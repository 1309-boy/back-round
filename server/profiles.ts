import { randomBytes,createHmac,timingSafeEqual } from 'node:crypto';
import { mkdir,readFile,writeFile,rename } from 'node:fs/promises';
import path from 'node:path';
import { initializeApp,applicationDefault,cert,getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { BALANCE,IDS } from '../shared/data.ts';
export function cleanName(value:any){return String(value||'플레이어').replace(/[<>\u0000-\u001f]/g,'').trim().slice(0,18)||'플레이어';}
export function newProfile(uid:string,nickname='플레이어'){return {uid,nickname:cleanName(nickname),xp:0,games:0,wins:0,losses:0,mastery:Object.fromEntries(IDS.map(id=>[id,{xp:0,rounds:0,wins:0}])),updatedAt:Date.now()};}
export function completeProfile(uid:string,value:any){const defaults=newProfile(uid);return {...defaults,...value,uid,mastery:{...defaults.mastery,...value?.mastery}};}
export function applyResult(profile:any,result:any,index:number){const out=completeProfile(profile.uid,structuredClone(profile));out.games++;const won=result.winner===index;out.wins+=won?1:0;out.losses+=won?0:1;out.xp+=BALANCE.matchXP+(won?BALANCE.winXP:0);
  for(const round of result.log){const id=round.characters[index];if(!IDS.includes(id))continue;const m=out.mastery[id]??={xp:0,rounds:0,wins:0};m.rounds++;const win=round.winner===index;m.wins+=win?1:0;m.xp+=win?BALANCE.masteryWin:BALANCE.masteryLoss;}
  out.updatedAt=Date.now();return out;
}
export class Profiles {
  firebase:boolean; secret:string; memory=new Map<string,any>(); saved=new Set<string>(); dataDir:string; queue:Promise<any>=Promise.resolve();
  constructor(){this.firebase=!!process.env.FIREBASE_PROJECT_ID;this.secret=process.env.SESSION_SECRET||randomBytes(32).toString('hex');this.dataDir=process.env.DATA_DIR||path.resolve('data');
    if(this.firebase&&!getApps().length){let credential=applicationDefault();if(process.env.FIREBASE_ADMIN_JSON){try{const value=JSON.parse(process.env.FIREBASE_ADMIN_JSON);if(value.project_id!==process.env.FIREBASE_PROJECT_ID)throw new Error();credential=cert(value);}catch{throw new Error('FIREBASE_ADMIN_JSON 설정 또는 프로젝트 ID를 확인해주세요.');}}initializeApp({credential,projectId:process.env.FIREBASE_PROJECT_ID});}
  }
  get guestAllowed(){return process.env.ALLOW_GUEST==='1'||(!this.firebase&&process.env.ALLOW_GUEST!=='0');}
  sign(payload:string){return createHmac('sha256',this.secret).update(payload).digest('base64url');}
  async guest(name:string){if(!this.guestAllowed)throw new Error('구글 로그인이 필요합니다.');const uid='guest_'+randomBytes(16).toString('hex'),payload=Buffer.from(JSON.stringify({uid,exp:Date.now()+30*86400000})).toString('base64url'),token=`${payload}.${this.sign(payload)}`;await this.set(uid,newProfile(uid,name));return {token,profile:await this.get(uid)};}
  async verify(token:any){if(typeof token!=='string'||token.length>12000)throw new Error('로그인이 필요합니다.');
    if(token.split('.').length===2&&this.guestAllowed){const[payload,sig]=token.split('.'),expected=this.sign(payload);if(sig.length!==expected.length||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))throw new Error('세션이 만료되었습니다.');const data=JSON.parse(Buffer.from(payload,'base64url').toString());if(data.exp<Date.now())throw new Error('세션이 만료되었습니다.');return {uid:data.uid,guest:true};}
    if(this.firebase){const info=await getAuth().verifyIdToken(token,true);return {uid:info.uid,guest:false,name:info.name};}throw new Error('인증 설정을 확인해주세요.');
  }
  async get(uid:string){if(this.firebase&&!uid.startsWith('guest_')){const ref=getFirestore().collection('profiles').doc(uid);return getFirestore().runTransaction(async tx=>{const doc=await tx.get(ref),profile=completeProfile(uid,doc.data());if(!doc.exists||['xp','games','wins','losses','mastery'].some(key=>doc.get(key)===undefined))tx.set(ref,profile);return profile;});}
    if(this.memory.has(uid))return structuredClone(this.memory.get(uid));try{return JSON.parse(await readFile(path.join(this.dataDir,uid+'.json'),'utf8'));}catch{return newProfile(uid);}
  }
  async set(uid:string,profile:any){if(this.firebase&&!uid.startsWith('guest_')){await getFirestore().collection('profiles').doc(uid).set(profile);return;}this.memory.set(uid,structuredClone(profile));await mkdir(this.dataDir,{recursive:true});const file=path.join(this.dataDir,uid+'.json');const temp=file+'.'+randomBytes(4).toString('hex')+'.tmp';await writeFile(temp,JSON.stringify(profile));await rename(temp,file);}
  async rename(uid:string,name:string){const work=this.queue.then(async()=>{if(this.firebase&&!uid.startsWith('guest_')){const db=getFirestore(),ref=db.collection('profiles').doc(uid);return db.runTransaction(async tx=>{const doc=await tx.get(ref),profile=completeProfile(uid,doc.data());profile.nickname=cleanName(name);profile.updatedAt=Date.now();tx.set(ref,profile);return profile;});}const p=await this.get(uid);p.nickname=cleanName(name);await this.set(uid,p);return p;});this.queue=work.catch(()=>{});return work;}
  async award(matchId:string,uids:string[],result:any){
    const work=this.queue.then(async()=>{if(this.saved.has(matchId))return;const db=this.firebase?getFirestore():null;
      if(db){await db.runTransaction(async tx=>{const marker=db.collection('matches').doc(matchId),existing=await tx.get(marker);if(existing.exists)return;const refs=uids.map(uid=>uid.startsWith('guest_')?null:db.collection('profiles').doc(uid));const docs=await Promise.all(refs.map(ref=>ref?tx.get(ref):null));refs.forEach((ref,i)=>{if(ref)tx.set(ref,applyResult(docs[i]?.exists?docs[i]!.data():newProfile(uids[i]),result,i));});tx.set(marker,{uids,winner:result.winner,scores:result.scores,log:result.log,endedAt:Date.now()});});}
      for(let i=0;i<uids.length;i++){if(db&&!uids[i].startsWith('guest_'))continue;const p=await this.get(uids[i]);p.matchIds??=[];if(p.matchIds.includes(matchId))continue;const next=applyResult(p,result,i);next.matchIds=[...p.matchIds,matchId].slice(-300);await this.set(uids[i],next);}
      this.saved.add(matchId);
    });this.queue=work.catch(()=>{});return work;
  }
}

