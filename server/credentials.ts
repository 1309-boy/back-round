import {cert} from 'firebase-admin/app';

export function credentialFromJson(raw:string,projectId:string){
  const fail=(code:string,detail:string):never=>{throw new Error(`FIREBASE_ADMIN_JSON [${code}] ${detail}`);};
  let value:any;
  try{value=JSON.parse(raw.replace(/^\uFEFF/,'').trim());if(typeof value==='string')value=JSON.parse(value);}
  catch{return fail('JSON_FORMAT','JSON 형식이 아닙니다. firebase-admin.json 파일의 처음 { 부터 마지막 } 까지 전체 내용을 입력해주세요.');}
  if(!value||typeof value!=='object'||Array.isArray(value))return fail('JSON_OBJECT','서비스 계정 JSON 객체가 필요합니다.');
  if(value.type!=='service_account')return fail('SERVICE_ACCOUNT','서비스 계정 키 파일이 아닙니다. Firebase 웹 앱 설정이나 파일 이름을 입력하면 안 됩니다.');
  if(value.project_id!==projectId)return fail('PROJECT_MISMATCH','서비스 계정 키의 project_id가 서버의 FIREBASE_PROJECT_ID와 다릅니다.');
  if(typeof value.client_email!=='string'||!value.client_email.endsWith('.iam.gserviceaccount.com'))return fail('CLIENT_EMAIL','서비스 계정 이메일이 없거나 올바르지 않습니다.');
  if(typeof value.private_key!=='string'||!value.private_key.includes('-----BEGIN PRIVATE KEY-----')||!value.private_key.includes('-----END PRIVATE KEY-----'))return fail('PRIVATE_KEY_MISSING','비밀키가 없거나 일부만 입력됐습니다. 다운로드한 JSON 파일 전체를 입력해주세요.');
  // Accept a JSON string that escaped its PEM line breaks one extra time.
  value.private_key=value.private_key.replace(/\\n/g,'\n');
  try{return cert(value);}catch{return fail('PRIVATE_KEY_FORMAT','비밀키 PEM 형식을 읽을 수 없습니다. 파일의 내용을 수정하지 말고 전체를 다시 복사해주세요.');}
}
