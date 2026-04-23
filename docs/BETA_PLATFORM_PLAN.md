# Beta Platform Plan

## 목표

이 문서는 `Vercel + Supabase`를 기반으로 LoL Draft Lab을 베타 플랫폼으로 출시할 때 필요한 배포 구조와 정책 가드레일을 정리합니다.

## 현재 판단

공개 베타의 핵심은 단순 배포가 아닙니다. 다음 세 가지를 동시에 만족해야 합니다.

1. `Riot 정책`을 위반하지 않는다.
2. `실시간 협업 UX`가 자연스럽다.
3. `개인화와 팀 기능`이 붙어도 구조가 무너지지 않는다.

## 권장 배포 구조

### 1. Vercel

역할:

- 프론트엔드 웹앱 배포
- 베타 랜딩 페이지
- 공유 링크 진입점
- 피드백/대기열 폼

현재 레포는 루트 기준 `npm run build`로 `frontend`를 빌드하도록 맞췄습니다. 그래서 `Root Directory=./`로 가져와도 배포할 수 있습니다.

권장 Vercel 설정:

- Repository: `hyunseung1119/lol`
- Branch: `main`
- Framework Preset: `Other`
- Root Directory: `./`
- Build Command: `npm run build`
- Output Directory: `frontend/dist`

### 2. Supabase

역할:

- `Auth`: 이메일, 매직 링크, 소셜 로그인
- `Postgres`: 드래프트 룸, 이벤트 로그, 선호 챔피언, 팀/조직 데이터
- `Realtime`: 공동 밴픽, 관전자 presence, 룸 동기화
- `Storage`: 향후 피드백 이미지, 리플레이 메모, 공유용 아티팩트

### 3. Draft Engine / Inference Service

현재 FastAPI + Ollama 구조는 로컬 개발에는 적합하지만, 공개 베타에서는 별도 서비스로 분리하는 편이 맞습니다.

권장 순서:

1. 베타 1차: 휴리스틱 엔진 결과만 저장, LLM 설명은 선택 기능
2. 베타 2차: 별도 Python API 또는 GPU 워커로 설명 생성 분리
3. production-key 승인 후: Riot 데이터 수집 파이프라인 추가

## Supabase에서 바로 할 수 있는 것

### 사용자

- 베타 가입과 로그인
- 기본 페르소나 저장
- 선호 챔피언과 역할 저장

### 드래프트 협업

- 드래프트 룸 생성
- 블루/레드 참가자 초대
- 관전자/코치 읽기 전용 참여
- pick/ban 이벤트 로그 저장

### 성장 루프

- 저장한 드래프트 복기
- 피드백 제출
- 팀 단위 드래프트 템플릿 관리
- 베타 유저 활동 데이터 수집

## Riot 정책 체크리스트

공개 베타 전에 반드시 확인해야 할 항목:

- development key로 공개 베타를 운영하지 않는다.
- 제품이 Riot 공식 제품처럼 보이거나 오해를 만들지 않게 한다.
- 실시간 경쟁 우위를 직접 제공하는 오버레이 형태를 피한다.
- 보이는 위치에 법적 고지를 둔다.
- 시각 자산은 Data Dragon/허용된 정적 자산 범위 내에서 사용한다.

현재 방향은 정책상 더 안전한 편입니다.

- 실제 게임 클라이언트 오버레이가 아님
- 사전 시뮬레이션/리뷰 워크스페이스 중심
- 밴픽 결정을 “자동으로 대체”하지 않고 여러 선택지를 제시

## 데이터 분류

### 브라우저에 노출 가능

- Supabase anon key
- 공개 챔피언 카탈로그
- 공개 공유 룸 데이터 중 허용된 읽기 전용 데이터

### 절대 브라우저에 노출하면 안 되는 것

- Riot API key
- Supabase service role key
- 배치 수집용 시크릿
- 관리자 전용 webhook secret

## 필수 환경 변수

프론트:

- `VITE_API_BASE_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

백엔드/수집기:

- `RIOT_API_KEY`
- `RIOT_PLATFORM_ROUTE`
- `RIOT_REGIONAL_ROUTE`
- `FRONTEND_ORIGINS`
- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`

## 추천 릴리즈 단계

### Phase 1

- 개인용 밴픽 시뮬레이터
- 저장/불러오기
- 페르소나 모드
- 피드백 수집

### Phase 2

- 실시간 draft room
- 코치/감독 관전 모드
- 조직/팀 단위 협업

### Phase 3

- patch-aware 실측 데이터
- 계정 연동
- 선수/팀별 챔프풀 기반 추천

## Human practice

// TODO(human): 베타 가입 폼에서 꼭 받아야 하는 최소 정보 5개만 먼저 써보세요.
// TODO(human): 공개 베타에서 “재미”를 만드는 기능과 “정확도”를 만드는 기능을 분리해서 우선순위를 적어보세요.
