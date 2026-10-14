import { initializeApp } from 'firebase/app';
import { getAuth,GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged,type Auth } from 'firebase/auth';
import { IDS,accountLevel,mastery,BALANCE } from '../shared/data.ts';
declare global {interface Window {BACKROUND_CONFIG?:{serverUrl?:string;firebase?:any};}}
const KEY='backround.local.profile.v1';
export function emptyProfile(){return {nickname:'플레이어',xp:0,games:0,wins:0,losses:0,mastery:Object.fromEntries(IDS.map(id=>[id,{xp:0,rounds:0,wins:0}]))};}
function readLocal(){try{return {...emptyProfile(),...JSON.parse(localStorage.getItem(KEY)||'null')};}catch{return emptyProfile();}}
export class Account {
  profile:any=readLocal();auth:Auth|null=null;token='';guest=false;online=false;onChange:()=>void=()=>{};
  server=(window.BACKROUND_CONFIG?.serverUrl||localStorage.getItem('backround.server')||(/^(localhost|127\.0\.0\.1)$/.test(location.hostname)?location.origin:'')).replace(/\/$/,'');
  constructor(){const config=window.BACKROUND_CONFIG?.firebase;if(config?.apiKey&&config?.projectId){this.auth=getAuth(initializeApp(config));onAuthStateChanged(this.auth,async user=>{if(user){this.token=await user.getIdToken();this.guest=false;await this.refresh().catch(()=>{});}this.onChange();});}
    const guestToken=sessionStorage.getItem('backround.guest.token');if(guestToken){this.token=guestToken;this.guest=true;}
  }
  async login(){if(!this.auth)throw new Error('구글 로그인이 아직 연결되지 않았어요. 기기 기록으로 연습할 수 있어요.');await signInWithPopup(this.auth,new GoogleAuthProvider());this.token=await this.auth.currentUser!.getIdToken();this.guest=false;await this.refresh();}
  async logout(){if(this.auth)await signOut(this.auth);this.token='';this.online=false;this.guest=false;sessionStorage.removeItem('backround.guest.token');this.profile=readLocal();this.onChange();}
  async request(path:string,options:RequestInit={}){if(!this.server)throw new Error('온라인 서버가 연결되지 않았어요. 설정에서 서버 주소를 입력해주세요.');const response=await fetch(this.server+path,{...options,headers:{'Content-Type':'application/json',...(this.token?{Authorization:`Bearer ${this.token}`}:{})},signal:AbortSignal.timeout(8000)});const value=await response.json();if(!response.ok)throw new Error(value.error||'서버에 연결할 수 없어요.');return value;}
  async ensureSession(){if(this.auth?.currentUser){this.token=await this.auth.currentUser.getIdToken();this.guest=false;}
    if(this.token){try{await this.refresh();return this.token;}catch{this.token='';}}
    const result=await this.request('/api/guest',{method:'POST',body:JSON.stringify({nickname:this.profile.nickname})});this.token=result.token;this.guest=true;this.online=true;this.profile=result.profile;sessionStorage.setItem('backround.guest.token',this.token);this.onChange();return this.token;
  }
  async refresh(){if(this.auth?.currentUser)this.token=await this.auth.currentUser.getIdToken();if(!this.token)return;this.profile=await this.request('/api/profile');this.online=true;this.onChange();}
  async rename(name:string){name=name.trim().slice(0,18);if(!name)throw new Error('닉네임을 입력해주세요.');if(this.online&&this.token){this.profile=await this.request('/api/profile',{method:'PATCH',body:JSON.stringify({nickname:name})});}else{this.profile.nickname=name;this.saveLocal();}this.onChange();}
  saveLocal(){localStorage.setItem(KEY,JSON.stringify(this.profile));}
  awardLocal(result:any){const p=readLocal();p.games++;const won=result.winner===0;p.wins+=won?1:0;p.losses+=won?0:1;p.xp+=BALANCE.matchXP+(won?BALANCE.winXP:0);
    for(const r of result.log){const m=p.mastery[r.characters[0]]??={xp:0,rounds:0,wins:0};m.rounds++;m.wins+=r.winner===0?1:0;m.xp+=r.winner===0?BALANCE.masteryWin:BALANCE.masteryLoss;}
    localStorage.setItem(KEY,JSON.stringify(p));if(!this.online)this.profile=p;this.onChange();
  }
  setServer(url:string){url=url.trim().replace(/\/$/,'');if(url){const u=new URL(url);if(!['http:','https:'].includes(u.protocol))throw new Error('http 또는 https 주소를 입력해주세요.');if(location.protocol==='https:'&&u.protocol!=='https:')throw new Error('HTTPS 서버 주소가 필요해요.');}this.server=url;this.token='';this.online=false;this.guest=false;sessionStorage.removeItem('backround.guest.token');localStorage.setItem('backround.server',url);}
}
export {accountLevel,mastery};
