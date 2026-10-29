export type CharacterId = 'rian' | 'bena' | 'khan' | 'sean' | 'winston';
export const W = 1280, H = 760, R = 15, STEP = 1 / 60;
export const BALANCE = {
  dashCost: 40, maxStamina: 100, staminaTick: 0.1, staminaPerTick: 2,
  dashDuration: 0.12, dashAfterInvulnerability: 0.15, dashSpeed: 1000, dashCooldown: 0.3,
  regenDelay: 5, regenPerSecond: 4, ultimateMax: 100,
  ultimateHit: 12, ultimateDodge: 14, stopContact: 64, seanLinkWidth: 24, grappleSpeed: 2.6,
  masteryWin: 100, masteryLoss: 45, matchXP: 100, winXP: 60,
};
export const CHARACTERS: Record<CharacterId, any> = {
  rian: { id:'rian', name:'리안', en:'RIAN', role:'근거리', difficulty:4, color:'#79ead3', hp:178, speed:224,
    damage:28, range:106, windup:0.2, cd1:1, cd2:3, tagline:'중력을 거스르는 검', concept:'중력 초능력자 소년. 전기가 흐르는 둔탁한 검을 사용한다.',
    skills:[
      {name:'축전검', key:'LMB', text:'선딜레이 동안 캐릭터를 따라오는 범위로 전방을 벤다. 공격 후 전체 범위의 잔상을 잠시 남긴다. 전기는 자동으로 최대 10초 축적되며 공격 시 모두 소비한다. 기본 28 + 축전량에 따라 최대 26 피해. 선딜레이 0.2초 · 쿨타임 1초.'},
      {name:'중력 편향', key:'RMB', text:'우클릭을 누르면 경로와 끌어오기 가능 여부를 미리 보고, 떼면 발동한다. 마우스 방향을 동서남북으로 나눠 벽 앞까지 0.1초 동안 이동한다. 상대를 정확히 클릭하면 시야가 열린 경우 내 앞으로 끌어온다. 쿨타임 3초 · 끌어오기 성공 시 5초.'},
      {name:'벡터 붕괴', key:'SHIFT', text:'상대 위치에서 마우스를 향한 동서남북 방향으로 상대를 벽 앞까지 0.1초 동안 강제 이동시킨다. 이동 중 스턴. 유리 방벽을 파괴한다. 직접 피해는 없다.'}
    ]},
  bena: { id:'bena', name:'베나', en:'BENA', role:'원거리', difficulty:5, color:'#cb98fc', hp:143, speed:228,
    damage:20, range:900, windup:0, projectileSpeed:1400, cd1:1, cd2:5, tagline:'위치를 뒤바꾸는 한 발', concept:'상대와 위치를 바꾸는 초능력자 소녀. 권총을 사용한다.',
    skills:[
      {name:'위상 탄환', key:'LMB', text:'마우스 방향으로 탄환을 발사해 20 피해를 준다. 선딜레이 없이 즉시 발사 · 탄속 1400 · 쿨타임 1초.'},
      {name:'위치 교환', key:'RMB', text:'상대를 정확히 클릭하면 서로 위치를 바꾼다. 설치한 내 폭탄과도 교환할 수 있다. 쿨타임 5초. 대쉬 무적 중인 상대에게는 실패한다.'},
      {name:'제로 아워', key:'SHIFT', text:'현재 위치에 10초 후 폭발하는 폭탄을 설치한다. 반경 180 · 피해 92. Shift를 다시 누르면 최대 0.8초 후 폭발한다. 폭발 0.8초 전부터 범위를 표시한다.'}
    ]},
  khan: { id:'khan', name:'칸', en:'KHAN', role:'암살자', difficulty:4, color:'#ff897e', hp:151, speed:230,
    damage:19, range:95, windup:0.1, cd1:0.9, cd2:12, tagline:'정지된 순간의 칼날', concept:'시간을 멈추는 남자. 카타나 형태의 검을 사용한다.',
    skills:[
      {name:'순간 베기', key:'LMB', text:'선딜레이 동안 캐릭터를 따라오는 범위로 전방을 베어 19 피해를 준다. 공격 후 전체 범위의 잔상을 잠시 남긴다. 선딜레이 0.1초 · 쿨타임 0.9초.'},
      {name:'시간 정지', key:'RMB', text:'최대 5초 동안 상대와 상대 소유 공격의 시간을 멈춘다. 중심 거리 64 이내에서 발동하면 정지 중 공격 가능. 멀리서 발동하면 스킬1의 선딜레이가 모두 끝난 뒤, 공격 판정 직전에 해제된다. 최대 정지 시간 5초는 유지된다. 사용 시 접촉 범위를 잠시 표시한다. 재입력으로 해제. 발동 시 쿨타임 12초가 시작되며, 조기 해제 시 미사용 시간을 추가로 뺀다.'},
      {name:'리와인드', key:'SHIFT', text:'현재 라운드의 3초 전으로 양쪽 위치·체력·스테미나·쿨타임과 전장 상태를 되돌린다. 선딜레이 중이던 공격은 복원하지 않는다. 자신의 궁극기 게이지는 소모된 상태로 유지한다.'}
    ]},
  sean: { id:'sean', name:'션', en:'SEAN', role:'중거리', difficulty:5, color:'#72b9ff', hp:162, speed:225,
    damage:34, range:1200, windup:0.2, cd1:1.5, cd2:6, tagline:'전장을 잇는 푸른 선', concept:'와이어 앵커와 디스크를 사용하는 사이버펑크 시대의 군인.',
    skills:[
      {name:'링크 디스크', key:'LMB', text:'디스크 2개를 벽에 박으면 0.2초 후 연결되어 34 피해를 준다. 연결은 명중하거나 2초가 지나면 사라진다. 연결 폭 24. 두 번째 디스크부터 쿨타임 1.5초. 벽을 직접 클릭하면 중간 벽을 뚫고 해당 위치에 부착한다.'},
      {name:'와이어 앵커', key:'RMB HOLD', text:'벽으로 앵커를 쏜다. 우클릭 유지 시 이동속도 2.6배로 끌려간다. 떼거나 이동이 가로막히면 해제. 부착 전에 놓으면 쿨타임 3초 환급. 쿨타임 6초.'},
      {name:'헥사 네트', key:'SHIFT', text:'0.1초마다 조준 방향으로 노란 디스크 6개를 발사한다. 모두 부착되면 0.2초 뒤 서로 연결되어 교차하는 선마다 15 피해. 같은 벽면에 붙은 디스크끼리는 연결하지 않는다. 한 번 판정 후 소멸한다.'}
    ]},
  winston: { id:'winston', name:'휘스턴', en:'WHISTON', role:'탱커', difficulty:2, color:'#edc874', hp:213, speed:220,
    damage:19, range:250, windup:0.1, cd1:1.5, cd2:5, tagline:'깨지는 순간까지 지배한다', concept:'유리벽을 만드는 초능력자 마피아 보스.',
    skills:[
      {name:'글라스 러시', key:'LMB', text:'전방에 폭 108의 유리벽을 만든다. 0.1초 후 앞으로 날아가 상대를 밀어내며 19 피해를 준다. 사거리 250. 양쪽 모두 벽을 걸어서 통과할 수 없다. 쿨타임 1.5초.'},
      {name:'클리어 가드', key:'RMB', text:'3초 동안 유지되는 유리 방벽을 만든다. 일반 공격을 2회 차단하면 파괴된다. 총알은 소멸하고 디스크·앵커는 내구도 1을 깎고 관통한다. 공격 시작점과 대상 사이의 근거리 공격을 막는다. 궁극기는 방벽을 파괴하고 피해를 준다. 쿨타임 5초.'},
      {name:'브레이크 포인트', key:'SHIFT', text:'폭 250의 거대한 유리벽을 밀어 보내 48 피해를 준다. 사거리 680. 벽의 중점이 지형에 닿으면 부서지며 반경 125 안에 추가 30 피해를 준다.'}
    ]}
};
export const IDS = Object.keys(CHARACTERS) as CharacterId[];
export const BONUS = {
  rian: {label:'공격력', stat:'damage', amount:0.05, text:'공격력 +5%'},
  bena: {label:'이동속도', stat:'speed', amount:0.015, text:'이동속도 +1.5% (최대 +6%)'},
  khan: {label:'스테미나', stat:'stamina', amount:0.08, text:'스테미나 회복 +8% (최대치 100 유지)'},
  sean: {label:'체력 재생', stat:'regen', amount:0.15, text:'체력 재생 +15%'},
  winston: {label:'체력', stat:'hp', amount:0.08, text:'최대 체력 +8%'}
};
export interface Wall { id:string; x:number; y:number; w:number; h:number; jump:boolean }
const bounds:Wall[] = [
  {id:'top',x:0,y:0,w:W,h:36,jump:false},{id:'bottom',x:0,y:H-36,w:W,h:36,jump:false},
  {id:'left',x:0,y:0,w:36,h:H,jump:false},{id:'right',x:W-36,y:0,w:36,h:H,jump:false}
];
const wall=(id:string,x:number,y:number,w:number,h:number,jump=false):Wall=>{
  // Keep solid walls on the same center line; rendering and collision share this rectangle.
  if(!jump){if(w<h){x-=8;w+=16;}else{y-=8;h+=16;}}
  return {id,x,y,w,h,jump};
};
export const MAPS = [
  {name:'교차점',en:'CROSSPOINT',walls:[...bounds,wall('a',440,190,20,140,true),wall('b',820,430,20,140,true),wall('c',540,290,200,20),wall('d',540,450,200,20),wall('e',300,520,140,20,true),wall('f',840,220,140,20,true)]},
  {name:'분기',en:'BRANCH',walls:[...bounds,wall('a',380,160,20,240),wall('b',880,360,20,240),wall('c',550,210,180,20,true),wall('d',550,530,180,20,true),wall('e',560,370,160,20,true)]},
  {name:'릴레이',en:'RELAY',walls:[...bounds,wall('a',300,200,150,20,true),wall('b',830,540,150,20,true),wall('c',520,300,20,160,true),wall('d',740,300,20,160,true),wall('e',830,200,150,20,true),wall('f',300,540,150,20,true)]},
  {name:'프랙처',en:'FRACTURE',walls:[...bounds,wall('a',360,160,20,180,true),wall('b',900,420,20,180,true),wall('c',360,500,220,20),wall('d',700,240,220,20),wall('e',630,330,20,100,true)]}
];
export function mastery(xp:number){let level=1,need=150;while(xp>=need){xp-=need;level++;need=150+50*(level-1);}return {level,xp,need};}
export function accountLevel(xp:number){let level=1,need=250;while(xp>=need){xp-=need;level++;need=250+100*(level-1);}return {level,xp,need};}

