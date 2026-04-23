# LoL Draft Lab

한국어 기반 `5:5 League of Legends 드래프트 추천 서비스`입니다. 현재 패치 기준의 밴픽 보드, 페르소나별 설명, 로컬 LLM 요약을 한 화면에서 다룹니다.

핵심 원칙은 단순합니다.

- 승률 계산은 `LLM`이 아니라 `드래프트 엔진`이 담당합니다.
- `LLM`은 추천 이유를 한국어로 설명하는 레이어로만 사용합니다.
- 공개 베타는 `Vercel + Supabase`를 중심으로 설계하되, Riot 정책과 API 키 제약을 먼저 지킵니다.

## 현재 기능

- 5:5 토너먼트 밴픽 순서 시뮬레이션
- 한국어 챔피언 검색
- 포지션 필터, 태그 필터, 추천/선호 필터
- 일반 유저, 프로, 복귀 유저, 신규 유저, 코치, 감독 페르소나 모드
- 챔피언 추천 Top 5 / 밴 추천 Top 5
- 블루/레드 예상 승률, 팀 프로필, LLM 요약
- Data Dragon 기반 챔피언 초상화와 한국어 데이터

## 아키텍처

- `frontend/`: React + Vite 드래프트 UI
- `backend/`: FastAPI + 로컬 휴리스틱 드래프트 엔진 + Ollama 설명 레이어
- `supabase/`: 베타 플랫폼용 스키마와 RLS 정책
- `docs/ARCHITECTURE.md`: 제품/시스템 구조
- `docs/BETA_PLATFORM_PLAN.md`: Vercel + Supabase 배포 계획과 Riot 정책 고려사항
- `docs/PERSONAS.md`: 타깃 사용자별 고충과 제품 가치

## 로컬 실행

### 1. 환경 변수

루트의 `.env.example`을 참고해서 필요한 값만 로컬에 설정합니다.

중요:

- `RIOT_API_KEY`는 저장소에 커밋하지 않습니다.
- 공개 베타에는 development key를 절대 사용하지 않습니다.

### 2. 백엔드

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 3. 프론트엔드

```powershell
cd frontend
npm install
npm run dev
```

### 4. Ollama

```powershell
ollama run gemma4:e4b
```

## API

- `GET /api/health`
- `GET /api/meta`
- `GET /api/champions`
- `POST /api/draft/analyze`
- `GET /api/riot/status`

## 배포 방향

현재 구조에서 현실적인 베타 배포 분리는 아래와 같습니다.

- `Vercel`: 프론트엔드, 랜딩, 대기열, 공유 링크
- `Supabase`: Auth, Postgres, Realtime, Storage
- `Draft Engine`: 추후 별도 Python 서비스 또는 GPU 워커

`Vercel`에는 현재 프론트 빌드를 루트 기준으로 올릴 수 있게 `package.json`을 추가했습니다. `Root Directory=./`로 가져오더라도 `npm run build`가 `frontend`를 빌드하도록 맞춰둔 상태입니다.

## 학습 포인트

// TODO(human): 추천 엔진 점수식을 직접 한 번 바꿔보고, 특정 조합에서 왜 추천이 바뀌는지 로그를 비교해보세요.
// TODO(human): Supabase 마이그레이션에서 어떤 정책이 `anon`에게 열리고 어떤 정책이 `authenticated`에만 열리는지 직접 읽어보세요.
