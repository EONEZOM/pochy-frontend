<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## 에이전트 작업 규칙

### 기본 규칙
- 모든 답변은 한국어로 작성합니다.
- 파일 읽기/수정은 가능한 한 도구(`ReadFile`, 패치 등) 기반으로 수행합니다.
- `api/generated/**` 생성 파일은 직접 수정하지 않습니다.
- API 스키마 변경 이슈는 OpenAPI 원본 수정 후 클라이언트 재생성을 우선합니다.

### 컴포넌트 작업 규칙
- 컴포넌트 작업은 반드시 공통 컴포넌트를 우선합니다.
- 신규 UI는 먼저 `components/common/**` 또는 기존 공용 컴포넌트 확장으로 해결을 시도합니다.
- 페이지/도메인 전용 컴포넌트는 공통화가 불가능한 경우에만 생성합니다.

### 네이밍 컨벤션
- 컴포넌트: PascalCase (`ProductCard`)
- 변수/함수: camelCase (`isAnalysing`, `fetchProductData`)
- 상수: UPPER_CASE (`MAX_IMAGE_SIZE`)
- 이미지/CSS/일반 파일: kebab-case (`main-logo.png`)
- 훅: `use` + PascalCase (`useAnalysis`)

### 함수/로직 컨벤션
- 이벤트 핸들러: 내부 로직 `handle___`, props 전달 `on___`
- 데이터 함수: 조회 `get___`, 생성 `post___`, 수정 `update___`, 삭제 `delete___`
- boolean 네이밍: `is___`, `has___`, `should___`
- 정규식 네이밍: `___Regex`

### 코드 스타일
- 한 줄 한 문장 원칙으로 가독성을 우선합니다.
- 연산자/콤마 뒤 공백을 지키고 문장 끝 세미콜론을 사용합니다.
- 한 줄짜리 블록도 중괄호를 생략하지 않습니다.
- 함수는 화살표 함수 표현식(`const fn = () => {}`)을 우선합니다.

### 폴더/파일 규칙
- 폴더명은 camelCase를 기본으로 합니다.
- 컴포넌트 폴더는 PascalCase를 허용합니다.
- 컴포넌트 파일만 `.tsx`, 그 외 로직 파일은 `.ts`를 사용합니다.

### 브랜치/PR/커밋 컨벤션
- 브랜치: `유형/#이슈번호-기능명` (예: `Feat/#51-스캔-기능-추가`)
- PR 제목: `#이슈번호 유형: 작업 내용`
- 커밋 타입: `Feat`, `Fix`, `Style`, `Refactor`, `Docs`, `Perf`, `Chore`

### 인증/API 규칙
- 액세스 토큰은 `Authorization: Bearer <token>`로 전달합니다.
- 리프레시 토큰은 쿠키 기반 흐름을 유지합니다.
- 인증 실패 재시도 로직은 무한 재시도를 방지하도록 구현합니다.

### 검증 규칙
- 의미 있는 변경 후 편집 파일 기준으로 린트 확인을 수행합니다.
- 인증/네트워크 동작 수정 시 `npm run build`로 최종 검증합니다.
