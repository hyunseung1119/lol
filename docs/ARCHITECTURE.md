# Architecture

## Product framing

이 프로젝트는 단순한 “카운터 추천 사이트”가 아닙니다. 목표는 다음 두 가지를 동시에 만족하는 드래프트 워크스페이스를 만드는 것입니다.

1. 일반 유저에게는 현재 패치 기준의 실전형 추천을 준다.
2. 코치·감독·프로 유저에게는 설명 가능한 드래프트 근거를 제공한다.

핵심 설계는 `scoring engine + explanation LLM` 분리입니다.

- `draft engine`: 추천 점수와 예상 승률 계산
- `LLM`: 사람이 바로 읽을 수 있는 한국어 설명 생성

이 분리를 두는 이유는 정확도와 신뢰도 때문입니다. 승률과 조합 평가는 결정론적이고 재현 가능해야 하고, LLM은 해설과 요약에만 쓰는 편이 제품 품질이 훨씬 안정적입니다.

## System layers

### 1. Champion data layer

- Data Dragon 한국어 챔피언 데이터 사용
- 초상화, 태그, 기본 스탯, 챔피언 이름 제공
- 현재 MVP에서는 정적 카탈로그를 로컬에 스냅샷으로 유지

### 2. Draft state layer

- 블루/레드 밴 5개
- 블루/레드 픽 5개
- 현재 턴과 현재 행동 타입
- 포지션 초점과 선호 챔피언

### 3. Draft scoring engine

현재 엔진은 휴리스틱 기반입니다.

- 역할 적합도
- 우리 팀 시너지
- 상대 조합 대응력
- 패치 편향
- 선호 챔피언 보정
- 페르소나 보정

이 값을 합쳐 `recommendation_score`와 `estimated_win_rate`를 계산합니다.

### 4. Explanation layer

- `gemma4:e4b`를 Ollama로 호출
- 현재 드래프트 상태와 1순위 추천을 전달
- 4문장 이내 한국어 코치 스타일 요약 반환

### 5. UI layer

- LoL 밴픽에 영감을 받은 5:5 보드
- 챔피언 검색, 태그 필터, 포지션 필터
- 추천 패널과 팀 프로필
- 페르소나 모드별 pain/value 설명

## Runtime flow

1. 프론트가 `/api/meta`와 `/api/champions`를 호출한다.
2. 유저가 밴/픽을 진행한다.
3. 프론트가 현재 드래프트 상태를 `/api/draft/analyze`로 보낸다.
4. 백엔드가 조합 점수를 계산한다.
5. 백엔드가 상위 추천을 LLM에 전달해 설명을 생성한다.
6. 프론트가 추천 카드와 팀 프로필을 렌더링한다.

## Beta deployment split

공개 베타는 로컬 구조를 그대로 Vercel에 올리는 방식으로는 완성되지 않습니다. 역할을 분리해야 합니다.

- `Vercel`: 프론트엔드 호스팅
- `Supabase`: 사용자, 드래프트 룸, 이벤트 로그, 선호 챔피언, 피드백
- `Draft Engine Service`: Python API 또는 추후 GPU 워커

즉, 베타 배포에서 `Vercel`은 UI/협업 레이어, `Supabase`는 데이터/실시간 레이어, 별도 엔진 서비스는 분석 레이어입니다.

## Why Supabase fits

Supabase가 이 프로젝트와 잘 맞는 이유는 세 가지입니다.

1. `Auth + RLS`로 드래프트 룸 접근 제어를 빠르게 만들 수 있습니다.
2. `Realtime Broadcast / Presence / Postgres Changes`로 공동 밴픽 룸과 관전 상태를 만들 수 있습니다.
3. `Postgres` 스키마 위에서 프로 팀, 코치, 일반 유저 기능을 점진적으로 확장하기 쉽습니다.

## Riot policy guardrails

이 프로젝트는 Riot 정책 때문에 제품 방향을 명확히 지켜야 합니다.

- Riot 게임/제품과 스타일이나 기능이 지나치게 유사하면 안 됩니다.
- 실시간 경쟁 우위를 주는 도구가 되면 안 됩니다.
- 공개 베타에 development key를 쓰면 안 됩니다.
- 제품 내에 보이는 법적 고지가 필요합니다.

그래서 현재 방향은 `실시간 오버레이`가 아니라 `드래프트 시뮬레이션/리뷰 워크스페이스`입니다.

## Next technical milestones

- Supabase Auth 연동
- 공유형 draft room 저장
- Realtime presence와 pick/ban sync
- Riot production key 승인 후 패치/티어별 실측 데이터 수집
- learned scorer 또는 hybrid scorer로 업그레이드

## Human practice

// TODO(human): 현재 휴리스틱에서 어떤 항목이 “게임 감각”이고 어떤 항목이 “데이터 근거”인지 직접 분류해보세요.
// TODO(human): 드래프트 룸을 “개인용”, “팀용”, “공개 공유용”으로 나누면 정책과 RLS가 어떻게 달라져야 할지 적어보세요.
