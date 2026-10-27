import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

test('Google accounts keep authentication on server failure and cannot silently become guest or save local account stats',async()=>{
  const dom=new JSDOM('',{url:'https://back-round.web.app'}),w:any=dom.window;
  Object.assign(globalThis,{window:w,location:w.location,localStorage:w.localStorage,sessionStorage:w.sessionStorage});
  const {Account}=await import('../src/profile.ts');
  const oldFetch=globalThis.fetch;
  try{
    const account=new Account();account.auth={currentUser:{uid:'google-a',getIdToken:async()=> 'google-token'}} as any;
    account.useGoogleUser('google-a','Google 플레이어');account.server='https://server.example';
    let requests=0;globalThis.fetch=async()=>{requests++;return new Response(JSON.stringify({error:'server unavailable'}),{status:503});};
    await assert.rejects(account.ensureSession(),/server unavailable/);
    assert.equal(account.token,'google-token');assert.equal(account.guest,false);assert.equal(account.online,false);assert.equal(requests,1);
    assert.equal(account.profile.nickname,'Google 플레이어');
    await assert.rejects(account.rename('새 이름'),/서버/);
    assert.equal(localStorage.getItem('backround.local.profile.v1'),null);
    const profile={uid:'google-a',nickname:'서버 기록',xp:123,games:1,wins:1,losses:0,mastery:{}};
    globalThis.fetch=async()=>new Response(JSON.stringify(profile));
    assert.equal(await account.ensureSession(),'google-token');assert.equal(account.online,true);assert.equal(account.profile.xp,123);
    account.auth={currentUser:null} as any;await assert.rejects(account.ensureSession(),/Google 계정/);
  }finally{globalThis.fetch=oldFetch;dom.window.close();}
});
