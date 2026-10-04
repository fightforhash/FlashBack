# GCP 프로젝트 접근 권한 설정 가이드

## 파트너에게 GCP 프로젝트 접근 권한 부여하기

Firebase 프로젝트에 다른 사용자를 추가하여 협업할 수 있습니다.

### 방법 1: Firebase Console을 통한 추가 (권장)

1. **Firebase Console 접속**
   - https://console.firebase.google.com 접속
   - 프로젝트 선택: `flashback-25e2f`

2. **프로젝트 설정 열기**
   - 왼쪽 메뉴에서 ⚙️ (톱니바퀴) 아이콘 클릭
   - "Project settings" 선택

3. **사용자 추가**
   - "Users and permissions" 탭 클릭
   - "Add member" 버튼 클릭
   - 파트너의 이메일 주소 입력
   - 역할 선택:
     - **Editor**: 코드 배포, Functions 수정 가능 (일반적으로 이 역할 권장)
     - **Viewer**: 읽기 전용
     - **Owner**: 모든 권한 (신중하게 부여)

4. **초대 전송**
   - "Add" 버튼 클릭
   - 파트너에게 초대 이메일이 전송됩니다

### 방법 2: GCP Console을 통한 추가

1. **GCP Console 접속**
   - https://console.cloud.google.com 접속
   - 프로젝트 선택: `flashback-25e2f`

2. **IAM & Admin 메뉴**
   - 왼쪽 햄버거 메뉴에서 "IAM & Admin" > "IAM" 선택

3. **멤버 추가**
   - 상단 "Grant Access" 버튼 클릭
   - "New principals"에 파트너 이메일 입력
   - "Select a role"에서 역할 선택:
     - **Cloud Functions Developer**: Functions 배포 및 수정
     - **Firebase Admin**: Firebase 전체 관리
     - **Editor**: 프로젝트 전체 편집 권한

4. **저장**
   - "Save" 클릭

### 필요한 권한

파트너가 Functions를 배포하고 수정하려면 다음 권한이 필요합니다:

- **Cloud Functions Developer** 또는
- **Firebase Admin** 또는
- **Editor**

### 로컬 개발 환경 설정

파트너가 로컬에서 개발하려면:

1. **Firebase CLI 설치**
   ```bash
   npm install -g firebase-tools
   ```

2. **로그인**
   ```bash
   firebase login
   ```

3. **프로젝트 선택**
   ```bash
   firebase use flashback-25e2f
   ```

4. **GCP 인증 (Vertex AI 사용을 위해)**
   ```bash
   gcloud auth application-default login
   ```

### 주의사항

- **비용**: GCP 프로젝트의 사용량은 프로젝트 소유자에게 청구됩니다
- **보안**: API 키와 시크릿은 공유하지 마세요. 각자 Firebase Secrets를 설정해야 합니다
- **환경 변수**: 로컬 개발을 위해 `functions/.env` 파일을 각자 설정해야 합니다

### 문제 해결

**"Permission denied" 에러가 발생하는 경우:**
- Firebase Console에서 사용자가 초대를 수락했는지 확인
- GCP Console에서 IAM 권한이 올바르게 설정되었는지 확인
- `firebase login`을 다시 실행

**Vertex AI 인증 오류:**
- `gcloud auth application-default login` 실행
- GCP Console에서 Vertex AI API가 활성화되어 있는지 확인

