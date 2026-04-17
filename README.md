# Eonezom Frontend

Eonezom 프론트엔드 프로젝트입니다.

## 시작하기

개발 서버 실행:

```bash
npm run dev
```

프로덕션 빌드:

```bash
npm run build
```

서비스 워커만 별도 빌드:

```bash
npm run build:sw
```

## 폴더 구조

```text
eonezom-frontend/
├── app/                       # App Router 엔트리
│   ├── layout.tsx             # 루트 레이아웃
│   ├── (auth)/                # 인증 라우트 그룹
│   └── (main)/                # 메인 라우트 그룹
│       └── page.tsx           # 메인 페이지
├── providers/
│   └── query-provider.tsx     # TanStack Query Provider
├── workers/
│   ├── register-pwa.tsx       # 서비스 워커 등록 컴포넌트
│   └── sw.ts                  # 서비스 워커 소스
├── public/                    # 정적 리소스
│   ├── manifest.json          # PWA 매니페스트
│   ├── sw.js                  # 빌드된 서비스 워커
│   ├── icons/                 # PWA 아이콘
│   └── images/                # 이미지 리소스
├── styles/
│   ├── reset.css              # CSS 리셋
│   └── globals.css            # 전역 스타일
├── components/
│   ├── common/                # 공통 UI 컴포넌트
│   └── layout/                # 레이아웃 컴포넌트
├── hooks/                     # 커스텀 훅
├── store/                     # 전역 상태 관리
├── utils/                     # 유틸 함수
├── types/                     # 공통 타입 정의
├── constants/                 # 상수 정의
├── serwist.config.mjs         # Serwist 설정
├── next.config.mjs            # Next.js 설정
├── tsconfig.json              # TypeScript 설정
└── package.json               # 의존성 및 스크립트
```

## 네이밍 컨벤션

| 대상 | 컨벤션 | 예시 |
| --- | --- | --- |
| 컴포넌트 | PascalCase | `ProductCard`, `AnalysisResult` |
| 변수 / 함수 | camelCase | `isAnalysing`, `fetchProductData()` |
| 상수 | UPPER_CASE | `MAX_IMAGE_SIZE`, `API_ENDPOINT` |
| 이미지 / CSS / 파일 | kebab-case | `main-logo.png`, `global-style.css` |
| Hooks | use + Pascal | `useAnalysis`, `useIntersectionObserver` |

## 함수 및 로직 컨벤션

| 대상 | 컨벤션 | 예시 |
| --- | --- | --- |
| 이벤트 핸들러 | 내부 로직 `handle___` / Props 전달 `on___` | 부모 `onDetailClick={handleDetailClick}`<br />자식 `function ExampleCard({ onDetailClick })` |
| 데이터 Fetch | 조회 `get___` / 생성 `post___` / 수정 `update___` / 삭제 `delete___` | `getProductList`, `postScanAnalysis`, `updateUserNickname`, `deleteHistoryItem` |
| Boolean 변수 | `is___` / `has___` / `should___` 접두사 사용 | `isAnalysing`, `isModalOpen`, `hasScanHistory`, `hasError`, `shouldShowGuide`, `shouldRefetch` |
| 정규표현식 | `___Regex` 접미사 사용 | `emailRegex`, `productCodeRegex`, `imageExtensionRegex` |

## 브랜치 전략 및 PR 컨벤션

이슈 생성 후 `create branch` 기능을 사용합니다.

- Main: 배포용(Production)
- 브랜치 형식: `유형/#이슈번호-기능명`
  - 예시: `Feat/#51-스캔-기능-추가`
  - 예시: `Fix/#15-로그인-에러-수정`

PR 제목 형식:

- `#이슈번호 유형: 작업 내용`
  - 예시: `#51 Feat: 화장품 다중 스캔 기능 추가`
  - 예시: `#15 Fix: 로그인시 리다이렉트 주소 관련 에러 수정`

## 커밋 메시지 컨벤션

| 유형 | 의미 |
| --- | --- |
| Feat | 새로운 기능 추가 |
| Fix | 버그 수정 |
| Style | UI 디자인 및 CSS 수정 |
| Refactor | 코드 리팩토링 |
| Docs | 문서 수정(README 등) |
| Perf | 성능 향상 |
| Chore | 패키지 설치 및 프로젝트 설정 변경 |

## 코드 스타일

### 가독성 규칙

- 가독성을 위해 한 줄에 하나의 문장 작성
- 주석은 설명하려는 구문에 맞춰 들여쓰기
- 연산자 사이에는 공백 추가
- 콤마 다음 값은 공백 추가
- 문장 종료 시 세미콜론 작성

### 블록 구문

- 한 줄짜리 블록이라도 중괄호를 생략하지 않고 명확히 줄 바꿈하여 작성

### 함수

- 함수 표현식(`const fnName = () => {}`)과 화살표 함수 사용

### 태그 네이밍

- 컴포넌트 태그 생성 시 전체 영역은 `Container`
- 특정 영역 묶음은 `{Name}Area`
- 별다른 의미가 없는 태그는 프래그먼트(`<>`) 사용

### 폴더 / 파일 네이밍

- 폴더는 camelCase 기본
- 컴포넌트 폴더만 PascalCase 허용
- 파일은 컴포넌트인 경우에만 `.tsx` 사용, 그 외는 `.ts` 사용
