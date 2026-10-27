import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {credentialFromJson} from '../server/credentials.ts';
const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}});
const valid={type:'service_account',project_id:'test-project',client_email:'game@test-project.iam.gserviceaccount.com',private_key:privateKey};
test('credential parser accepts a complete key, BOM, quoted JSON and double-escaped PEM newlines',()=>{
 for(const raw of [JSON.stringify(valid),'\uFEFF'+JSON.stringify(valid),JSON.stringify(JSON.stringify(valid)),JSON.stringify({...valid,private_key:privateKey.replace(/\n/g,'\\n')})]) assert.ok(credentialFromJson(raw,'test-project'));
});
test('credential errors identify the invalid field without including any credential value',()=>{
 const cases:[string,string][]=[['secret-value-not-json','JSON_FORMAT'],['null','JSON_OBJECT'],[JSON.stringify({apiKey:'sensitive-web-key'}),'SERVICE_ACCOUNT'],[JSON.stringify({...valid,project_id:'private-wrong-project'}),'PROJECT_MISMATCH'],[JSON.stringify({...valid,client_email:''}),'CLIENT_EMAIL'],[JSON.stringify({...valid,private_key:'sensitive-truncated-key'}),'PRIVATE_KEY_MISSING'],[JSON.stringify({...valid,private_key:'-----BEGIN PRIVATE KEY-----\\nbroken-secret\\n-----END PRIVATE KEY-----'}),'PRIVATE_KEY_FORMAT']];
 for(const [raw,code] of cases)assert.throws(()=>credentialFromJson(raw,'test-project'),(e:Error)=>{assert.ok(e.message.includes('['+code+']'));for(const secret of ['secret-value-not-json','sensitive-web-key','private-wrong-project','sensitive-truncated-key','broken-secret',privateKey])assert.ok(!e.message.includes(secret));return true;});
});
