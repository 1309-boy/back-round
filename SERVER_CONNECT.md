# Back round 로그인 / 대전 서버 연결 상태

프런트엔드: https://back-round.web.app/

Firebase 프로젝트 `back-round`의 Google 로그인 및 허용 도메인이 설정되어 있고,
웹 앱의 공개 SDK 설정은 `public/config.js`에 반영했습니다.
Firestore `(default)`는 서울(`asia-northeast3`)에 준비되어 있습니다.
클라이언트 직접 읽기/쓰기를 금지하는 Firestore 규칙을 유지하고, 경기 기록은 서버에서만 저장합니다.

## 무료 베타 서버 배포 준비

`render.yaml`은 Singapore 리전의 무료 Docker 웹 서비스 1개를 정의합니다.
GitHub main의 검사 통과 후 자동 배포하며 `/api/health`로 상태를 확인합니다.
게스트 접속은 끄고 Google 로그인만 허용합니다.

실제 배포에 남은 작업:

1. Render 계정 로그인 및 `1309-boy/back-round` 저장소의 Blueprint 연결.
2. 게임 서버 전용 Google 서비스 계정 생성. Hosting 배포 계정과 분리합니다.
   필요한 역할은 `roles/datastore.user`(게임 프로필/경기 기록 읽기·쓰기),
   `roles/firebaseauth.viewer`(로그인 토큰의 취소/사용 중지 여부 확인)입니다.
3. 해당 계정 JSON을 Render의 비밀 환경 변수 `FIREBASE_ADMIN_JSON`에 등록.
   키는 채팅, GitHub 소스, `public/config.js`에 넣지 않습니다.
   기존 `GOOGLE_APPLICATION_CREDENTIALS` 비밀 파일 방식도 지원합니다.
4. 배포된 서버의 실제 HTTPS URL을 확인한 다음 `public/config.js`의 `serverUrl`에 반영.
5. 실제 Google 로그인과 두 계정의 1:1 참가/경기 기록 저장을 검증.

Firebase 웹 설정은 공개 클라이언트 설정입니다. 서비스 계정 비밀키와 다릅니다.
Render 무료 서비스는 15분간 트래픽이 없으면 중지되고 다음 연결에서 약 1분간 시작 시간이 필요합니다.
클라이언트 요청 제한 시간은 이 시작 시간을 고려해 75초입니다.
무료 서비스의 로컬 파일은 영구 저장소가 아니므로 공식 기록은 Firestore에 저장합니다.

## 코드 검증

`npm run check`와 `npm test`로 타입, 전투 규칙, 실제 두 WebSocket 클라이언트,
Firebase 프런트엔드 Origin의 CORS, 로그인 유지, 불완전한 기존 프로필 복구를 검사합니다.

현재 서버 URL은 배포 후 확인하기 전까지 비워 두었습니다.
Google 로그인만 완료된 상태와 서버 프로필까지 연결된 상태를 화면에서 구분합니다.
