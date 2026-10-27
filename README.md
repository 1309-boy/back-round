# Back round · Beta 0.1

다섯 캐릭터가 등장하는 탑다운 1:1 웹 대전 게임입니다. 일러스트 영역은 비워 두었습니다.

## 바로 플레이

압축을 풀고 **Back-round-beta.html**을 Chrome 또는 Edge에서 열면 됩니다.

- **훈련소**: 다섯 캐릭터 자유 선택, 표적/AI 전환, 궁극기 충전, 회복, 맵·상대 변경.
- **매치 → AI 연습 경기**: 4승 선취 경기 전체 흐름. 기기 안에 연습 기록을 저장합니다.
- **온라인 매치 / 방 만들기**: 별도의 게임 서버가 연결되어 있어야 합니다.
- 기본 조작은 PC 키보드와 마우스입니다. 터치 기기에서는 화면 왼쪽 드래그로 이동, 오른쪽 터치로 조준하고 하단 스킬 버튼을 사용합니다.

단일 HTML에는 게임 코드가 포함되어 있어 연습에 인터넷이나 설치가 필요하지 않습니다. 브라우저가 다운로드 파일을 미리보기로만 열면, 파일을 저장한 뒤 Chrome/Edge로 직접 여세요.

## 온라인 서버 실행

Node.js **22.12 이상**을 설치한 뒤 이 폴더에서 실행합니다. Windows에서는 `start-server.cmd`를 실행해도 됩니다.

```sh
npm ci
npm run build
npm start
```

브라우저에서 `http://localhost:2567`을 엽니다. 서버가 같은 주소에서 화면과 게임 연결을 함께 제공합니다. 두 브라우저 또는 시크릿 창으로 방을 만들고 방 코드를 입력하면 실제 1:1 대전이 가능합니다. 같은 계정의 자기 자신과는 매칭되지 않습니다.

다른 PC에서 접속하려면 서버의 주소에 접근할 수 있어야 합니다. 공개 서비스에서는 HTTPS/WSS를 지원하는 Node.js 호스팅에 서버를 올리고 화면의 **설정 → 온라인 서버 주소** 또는 `public/config.js`에 서버 주소를 지정하세요. GitHub Pages에는 대전 서버가 포함되지 않습니다.

서버 구조는 Colyseus의 방 관리·재접속을 사용하고, 한 서버 프로세스가 여러 개의 2인 방을 운영합니다. 여러 서버 프로세스로 확장하는 설정은 이 베타에 포함하지 않았습니다. `Dockerfile`도 포함되어 있습니다.

## GitHub → Firebase Hosting 자동 배포

`main`에 변경을 올리면 `.github/workflows/firebase-hosting.yml`이 검사·빌드·테스트 후 Firebase Hosting에 배포합니다. 프로젝트와 사이트를 만들고 GitHub Actions에 프로젝트 ID·사이트 ID·서비스 계정 Secret을 한 번 등록해야 합니다.

설정과 첫 배포 순서는 [FIREBASE_DEPLOY.md](FIREBASE_DEPLOY.md)를 참고하세요. 설정이 없으면 빌드·테스트만 진행하고 배포 대기 사유를 Actions Summary에 표시합니다.

## 구글 로그인과 계정 저장 연결

Firebase 프로젝트의 실제 설정은 포함되어 있지 않습니다. 코드에 로그인과 서버 저장을 구현했지만, 공개 Firebase 프로젝트에 연결한 실사용 인증 테스트는 아직 하지 않았습니다.

1. Firebase에서 Authentication의 **Google** 공급자를 켭니다.
2. 승인된 도메인에 실제 Firebase Hosting 도메인, 게임 서버 도메인, 필요하면 `localhost`를 추가합니다.
3. Firestore 데이터베이스를 생성합니다.
4. `public/config.js`의 `firebase`에 콘솔의 **웹 앱 설정**을 넣습니다.

```js
window.BACKROUND_CONFIG = {
  serverUrl: "https://실제-게임-서버-주소",
  firebase: {
    apiKey: "Firebase 웹 API 키",
    authDomain: "프로젝트.firebaseapp.com",
    projectId: "프로젝트 ID",
    appId: "웹 앱 ID"
  }
};
```

5. 서버 환경에 `FIREBASE_PROJECT_ID`와 Admin SDK의 자격 증명을 설정합니다. 예: 서버에만 보관한 키 파일을 가리키는 `GOOGLE_APPLICATION_CREDENTIALS`. Google Cloud에서는 해당 서비스 계정의 기본 자격 증명을 사용할 수 있습니다.
6. 서버가 화면도 직접 제공한다면 위 웹 앱 설정을 JSON으로 `FIREBASE_WEB_CONFIG`에 넣습니다.
7. 공개 구글 계정 전용 서비스에서는 `ALLOW_GUEST=0`을 사용합니다.

`.env.example`은 설정 안내입니다. 호스팅의 환경변수에 등록하거나, 로컬 Node.js에서 파일을 사용한다면 `node --env-file=.env build/server.mjs`로 시작하세요. 서비스 계정의 **비밀 키는 웹 설정에 넣지 않습니다.**

프로필은 `profiles/{uid}`, 완료 경기는 `matches/{matchId}`에 저장합니다. 클라이언트가 경험치나 승패를 직접 수정하지 못하도록 `firestore.rules`는 직접 접근을 차단하고 서버만 기록합니다. 같은 경기의 중복 보상 지급을 막습니다.

구글 로그인을 연결하지 않은 로컬 서버는 게스트를 지원합니다. 게스트 기록은 서버의 `data/`에 저장합니다. 재시작 후에도 세션을 유지하려면 고정된 `SESSION_SECRET`, 기록을 보존하려면 영구 저장 볼륨을 설정하세요. 오프라인 AI 연습 기록은 별도의 브라우저 기록이며 구글 계정으로 업로드되지 않습니다.

## Firebase Hosting과 대전 서버

Firebase Hosting에는 `dist`의 웹 화면을 자동 배포합니다. Node.js/WebSocket 대전 서버는 별도 호스팅에서 실행합니다. 서버의 `CORS_ORIGINS`와 Firebase Authentication 승인 도메인에 실제 Hosting 주소를 추가하세요. 자세한 연결 방법은 [FIREBASE_DEPLOY.md](FIREBASE_DEPLOY.md)를 참고하세요.

## 조작과 표시

| 입력 | 동작 |
| --- | --- |
| WASD | 이동 |
| 마우스 | 조준 |
| 좌클릭 / 유지 | 스킬 1 |
| 우클릭 | 스킬 2, 칸 시간 정지 해제 |
| 우클릭 유지 | 션의 와이어 이동 |
| Space | 대쉬 |
| Shift | 궁극기, 베나 폭탄 수동 폭파 |
| Esc | 경기 메뉴 |

- 공격 준비 범위: 내 공격 파란색, 상대 공격 빨간색.
- 공격 적중 시 짧은 틱 효과음. 설정에서 끌 수 있습니다.
- 캐릭터 아래 체력과 스테미나. 리안은 체력 위에 민트색 축전 막대.
- 궁극기 준비 시 노란 외곽선.
- 우측 상단 정사각형: 스킬 2 쿨타임이 끝날수록 아래에서 채워집니다.

## 파일 구성

| 경로 | 용도 |
| --- | --- |
| `Back-round-beta.html` | 바로 여는 단일 실행 파일 |
| `src/app.ts`, `src/style.css` | 메뉴·HUD·입력·캐릭터 카드 |
| `src/render.ts` | 단색 맵과 전투 Canvas 렌더러 |
| `shared/data.ts` | 캐릭터·맵·밸런스 수치 |
| `shared/engine.ts` | 서버와 훈련소가 공유하는 전투 규칙 |
| `server/index.ts` | 온라인 방·매칭·판정·재접속 |
| `server/profiles.ts` | 인증·프로필·중복 없는 보상 저장 |
| `public/config.js` | 공개 서버 주소와 Firebase 웹 설정 |
| `tests/` | 규칙, 실제 두 클라이언트 연결, UI 동작 검증 |
| `BETA_RULES.md` | 세부 규칙과 베타에서 정한 수치 |

## 검증

```sh
npm run check
npm test
```

`npm test`는 먼저 빌드합니다. 전투 규칙 테스트, 실제 로컬 WebSocket 클라이언트 두 개를 사용하는 온라인 테스트, DOM 환경의 메뉴·조작 테스트가 포함되어 있습니다. 게임 화면 렌더링도 별도로 검토했습니다. 이번 실행 환경에서는 실제 브라우저의 화면 크기별 시각 검증을 수행하지 못했습니다.

실제 유저 간 네트워크 지연, 구글 로그인, 공개 서버 배포 후의 접속 환경과 장기 밸런스는 추가 플레이 테스트 대상입니다. Firebase Hosting의 실제 배포 여부는 Actions의 Deploy live site 결과로 확인하세요. 워크플로 파일이 있다는 것만으로 Firebase 프로젝트·인증·대전 서버 연결이 완료된 것은 아닙니다.

