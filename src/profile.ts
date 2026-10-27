import { initializeApp } from 'firebase/app';
import { getAuth,GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged,type Auth } from 'firebase/auth';
import { IDS,accountLevel,mastery,BALANCE } from '../shared/data.ts';
declare global {interface Window {BACKROUND_CONFIG?:{serverUrl?:string;firebase?:any};}}
const KEY='backround.local.profile.v1';
export function emptyProfile(){return {nickname:'플레이어',xp:0,games:0,wins:0,losses:0,mastery:Object.fromEntries(IDS.map(id=>[id,{xp:0,rounds:0,wins:0}]))};}
function readLocal(){try{return {...emptyProfile(),...JSON.parse(localStorage.getItem(KEY)||'null')};}catch{return emptyProfile();}}
export class Account {
  profile:any=readLocal();auth:Auth|null=null;token='';guest=false;online=false;syncError='';onChange:()=>void=()=>{};
  server=(localStorage.getItem('backround.server')||window.BACKROUND_CONFIG?.serverUrl||(/^(localhost|127\.0\.0\.1)$/.test(location.hostname)?location.origin:'')).replace(/\/$/,'');
  constructor(){const config=window.BACKROUND_CONFIG?.firebase;
    const guestToken=sessionStorage.getItem('backround.guest.token');if(guestToken){this.token=guestToken;this.guest=true;}
    if(config?.apiKey&&config?.projectId){this.auth=getAuth(initializeApp(config));onAuthStateChanged(this.auth,async user=>{
      if(user){this.useGoogleUser(user.uid,user.displayName);try{this.token=await user.getIdToken();if(this.server)await this.refresh();}catch(e:any){this.syncError=e.message;}}
      else if(!this.guest){this.token='';this.online=false;this.syncError='';this.profile=readLocal();}
      this.onChange();
    });}
  }
  useGoogleUser(uid:string,name:string|null){if(this.profile.uid!==uid)this.profile={...emptyProfile(),uid,nickname:name||'플레이어'};this.guest=false;this.online=false;this.syncError='';sessionStorage.removeItem('backround.guest.token');}
  async login(){if(!this.auth)throw new Error('구글 로그인 설정을 확인해주세요.');try{
    const result=await signInWithPopup(this.auth,new GoogleAuthProvider());this.useGoogleUser(result.user.uid,result.user.displayName);this.token=await result.user.getIdToken();
  }catch(e:any){const messages:Record<string,string>={'auth/popup-blocked':'팝업을 허용한 뒤 다시 로그인해주세요.','auth/popup-closed-by-user':'로그인 창이 닫혔어요.','auth/cancelled-popup-request':'진행 중인 로그인 창을 확인해주세요.','auth/unauthorized-domain':'현재 주소의 로그인 허용 설정이 필요해요.','auth/network-request-failed':'Google 로그인에 연결할 수 없어요. 잠시 후 다시 시도해주세요.'};throw new Error(messages[e.code]||'Google 로그인에 실패했어요. 잠시 후 다시 시도해주세요.');}
    if(this.server)try{await this.refresh();}catch(e:any){this.syncError=e.message;}this.onChange();
  }
  async logout(){if(this.auth)await signOut(this.auth);this.token='';this.online=false;this.syncError='';this.guest=false;sessionStorage.removeItem('backround.guest.token');this.profile=readLocal();this.onChange();}
  async request(path:string,options:RequestInit={}){if(!this.server)throw new Error('온라인 서버가 연결되지 않았어요. 설정에서 서버 주소를 입력해주세요.');const response=await fetch(this.server+path,{...options,headers:{'Content-Type':'application/json',...(this.token?{Authorization:`Bearer ${this.token}`}:{})},signal:AbortSignal.timeout(75000)});const value=await response.json().catch(()=>{throw new Error('서버가 시작 중이거나 응답할 수 없어요. 잠시 후 다시 시도해주세요.');});if(!response.ok)throw new Error(value.error||'서버에 연결할 수 없어요.');return value;}
  async ensureSession(){if(this.auth?.currentUser){this.token=await this.auth.currentUser.getIdToken();this.guest=false;await this.refresh();return this.token;}
    if(this.auth)throw new Error('Google 계정으로 로그인한 후 온라인 경기에 참가해주세요.');
    if(this.token){try{await this.refresh();return this.token;}catch(e){this.online=false;throw e;}}
    const result=await this.request('/api/guest',{method:'POST',body:JSON.stringify({nickname:this.profile.nickname})});this.token=result.token;this.guest=true;this.online=true;this.profile=result.profile;sessionStorage.setItem('backround.guest.token',this.token);this.onChange();return this.token;
  }
  async refresh(){try{if(this.auth?.currentUser)this.token=await this.auth.currentUser.getIdToken();if(!this.token)return;this.profile=await this.request('/api/profile');this.online=true;this.syncError='';this.onChange();}catch(e:any){this.online=false;this.syncError=e.message;this.onChange();throw e;}}
  async rename(name:string){name=name.trim().slice(0,18);if(!name)throw new Error('닉네임을 입력해주세요.');if(this.auth?.currentUser&&!this.online)throw new Error(this.server?'서버에 연결한 후 닉네임을 저장해주세요.':'대전 서버 연결 후 계정 닉네임을 저장할 수 있어요.');if(this.online&&this.token){this.profile=await this.request('/api/profile',{method:'PATCH',body:JSON.stringify({nickname:name})});}else{this.profile.nickname=name;this.saveLocal();}this.onChange();}
  saveLocal(){localStorage.setItem(KEY,JSON.stringify(this.profile));}
  awardLocal(result:any){const p=readLocal();p.games++;const won=result.winner===0;p.wins+=won?1:0;p.losses+=won?0:1;p.xp+=BALANCE.matchXP+(won?BALANCE.winXP:0);
    for(const r of result.log){const m=p.mastery[r.characters[0]]??={xp:0,rounds:0,wins:0};m.rounds++;m.wins+=r.winner===0?1:0;m.xp+=r.winner===0?BALANCE.masteryWin:BALANCE.masteryLoss;}
    localStorage.setItem(KEY,JSON.stringify(p));if(!this.online&&!this.auth?.currentUser)this.profile=p;this.onChange();
  }
  setServer(url:string){url=url.trim().replace(/\/$/,'');if(url){const u=new URL(url);if(!['http:','https:'].includes(u.protocol))throw new Error('http 또는 https 주소를 입력해주세요.');if(location.protocol==='https:'&&u.protocol!=='https:')throw new Error('HTTPS 서버 주소가 필요해요.');}this.server=url;this.syncError='';this.token='';this.online=false;this.guest=false;sessionStorage.removeItem('backround.guest.token');localStorage.setItem('backround.server',url);}
}
export {accountLevel,mastery};

