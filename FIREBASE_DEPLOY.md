# GitHub → Firebase Hosting 자동 배포

`main` 브랜치에 푸시하면 `.github/workflows/firebase-hosting.yml`이 의존성 설치 → 타입 검사 → 빌드·31개 테스트 → Firebase Hosting의 live 채널 배포를 수행합니다. Actions의 Run workflow로도 실행할 수 있습니다.

## 1. Firebase 프로젝트와 Hosting 사이트 준비

1. [Firebase 콘솔](https://console.firebase.google.com/)에서 Back round용 프로젝트를 만들거나 선택합니다. 프로젝트 설정 → 일반에서 **프로젝트 ID**를 확인합니다.
2. **Hosting**에서 사이트를 만들고 **사이트 ID**를 확인합니다. 사이트 ID는 `https://사이트ID.web.app`의 `사이트ID` 부분입니다. 프로젝트 표시 이름과 혼동하지 마세요.
3. 프로젝트에 Hosting 사이트가 없다면 먼저 생성해야 합니다. 콘솔에서 만들거나, Firebase CLI에 로그인한 뒤 아래 명령을 실행합니다. 대문자 값은 실제 값으로 바꿉니다.

```sh
firebase hosting:sites:create SITE_ID --project PROJECT_ID
```

다른 앱을 운영 중인 프로젝트를 사용한다면 Back round용 사이트를 따로 만들고 그 사이트 ID를 입력합니다. 이 워크플로는 입력한 한 사이트만 배포합니다.

## 2. 배포용 서비스 계정 키 준비

Google Cloud 콘솔 → **IAM 및 관리자 → 서비스 계정**에서 해당 Firebase 프로젝트를 선택하고 배포용 계정을 만듭니다. 이 live 정적 사이트 배포에는 **Firebase Hosting Admin**, **API Keys Viewer**, **Service Usage Viewer** 역할을 부여합니다. 해당 계정 → 키 → 키 추가 → 새 키 만들기 → JSON으로 키를 받습니다.

키 JSON은 GitHub 저장소 파일이나 `public/config.js`에 넣지 않고 다음 단계의 **Actions Secret**으로 등록합니다. 기존 게임 서버용 Admin SDK 계정을 그대로 쓴다면 Hosting 배포에 필요한 역할도 갖고 있어야 합니다.

## 3. GitHub에 세 값 등록

[저장소 설정](https://github.com/1309-boy/back-round/settings/secrets/actions) → **Secrets and variables → Actions**에서 등록합니다.

| 탭 | 이름 | 값 |
| --- | --- | --- |
| Variables → New repository variable | `FIREBASE_PROJECT_ID` | Firebase 프로젝트 ID |
| Variables → New repository variable | `FIREBASE_HOSTING_SITE` | Hosting 사이트 ID, `.web.app` 없이 입력 |
| Secrets → New repository secret | `FIREBASE_SERVICE_ACCOUNT` | 배포용 서비스 계정 JSON 파일의 전체 내용 |

이름은 대소문자까지 같아야 합니다. 서비스 계정 키와 프로젝트 ID는 같은 프로젝트의 값이어야 합니다.

## 4. 첫 배포

[Actions](https://github.com/1309-boy/back-round/actions) → **Deploy Back round to Firebase Hosting** → **Run workflow** → `main`을 선택해 실행합니다. 이후 `main`에 푸시할 때마다 자동으로 배포됩니다.

- 세 설정 중 빠진 값이 있으면 빌드·테스트만 하고 배포를 건너뜁니다. Actions Summary에 **no Firebase deployment was made**와 빠진 설정 이름이 표시됩니다. 성공 표시만으로 배포됐다고 판단하지 마세요.
- 설정을 추가·수정하는 것만으로 실행되지는 않습니다. **Run workflow**를 누르거나 새 커밋을 푸시하세요.
- 배포 성공 시 Actions Summary 및 Deploy live site 로그에서 공개 주소를 확인할 수 있습니다.
- `Site not found`라면 사이트를 먼저 생성했는지, 사이트 ID와 프로젝트가 맞는지 확인합니다.
- 권한 오류라면 위 서비스 계정의 역할과 키를 확인합니다. `serviceusage.services.get` 오류에는 **Service Usage Viewer** 역할이 필요합니다. 키를 다시 발급할 필요는 없습니다.

## 5. 구글 로그인·온라인 대전 연결

Hosting 배포만으로 Node.js 대전 서버가 실행되지는 않습니다. 현재 서버는 별도의 Node.js/WebSocket 호스팅에서 실행해야 합니다.

1. Firebase 웹 앱을 등록하고 Authentication의 Google 공급자를 켭니다. Firestore는 `(default)` 데이터베이스를 프로덕션 모드로 만듭니다.
2. `public/config.js`의 `firebase`에 Firebase **웹 앱 설정**을, `serverUrl`에 실제 게임 서버의 HTTPS 주소를 넣고 `main`에 커밋합니다. 변경은 Hosting으로 자동 배포됩니다.
3. Firebase Authentication 승인 도메인에 실제 사용하는 `SITE_ID.web.app` 및 `SITE_ID.firebaseapp.com`을 추가합니다.
4. 게임 서버의 `CORS_ORIGINS`에 `https://SITE_ID.web.app`을 추가합니다. 여러 주소를 쓰면 쉼표로 구분하고 끝에 `/`는 붙이지 않습니다.
5. 서버에는 별도로 `FIREBASE_PROJECT_ID`, Admin SDK 자격 증명 및 `ALLOW_GUEST=0`을 설정합니다. 자세한 실행 방법은 README를 참고합니다.

이 워크플로는 **Hosting만** 배포합니다. Firestore 규칙, Authentication 공급자, 게임 서버 배포는 별도입니다. 구글 로그인과 프로필 API까지 확인하려면 게임 서버도 연결되어 있어야 합니다.

기존 GitHub Pages 자동 배포 워크플로는 Firebase Hosting 워크플로로 교체되었습니다. 이전 Pages 배포본은 GitHub 설정에서 별도로 중지하기 전까지 남아 있을 수 있습니다.

## 공식 참고 문서

- https://firebase.google.com/docs/hosting/github-integration
- https://firebase.google.com/docs/hosting/multisites
- https://github.com/FirebaseExtended/action-hosting-deploy/blob/main/docs/service-account.md
