# 중국어 학습 웹앱 — MVP 기능 목록

**타겟**: 한국어 화자, HSK 급수 기반 학습 / **다중 사용자**(회원가입·로그인 필요) / **핵심 학습 방식**: 단어 플래시카드 + 간격반복(SRS), 발음·성조 듣기 연습

---

## 1. MVP 핵심 기능

### 1.1 계정 시스템
- 이메일/비밀번호 회원가입, 로그인, 로그아웃 (Supabase Auth 기본 기능)
- 온보딩: 첫 로그인 시 현재 HSK 급수(또는 목표 급수) 선택
- 마이페이지: 닉네임, 목표 급수 수정

### 1.2 단어 콘텐츠 (HSK 급수별)
- HSK 1~6급 단어 데이터 (한자, 병음, 성조, 한국어 뜻, 예문 1개, 발음 오디오)
- 급수별 단어 목록 브라우징 화면
- 급수 필터링

### 1.3 학습 플로우 — 플래시카드 + SRS
- 오늘 복습할 단어 큐 생성 (SRS 알고리즘, MVP는 단순화된 Leitner 또는 SM-2 방식 권장)
- 플래시카드: 앞면 한자 → 뒷면 병음/뜻/오디오
- "안다 / 헷갈림 / 모른다" 3단계 응답 → 다음 복습 주기 자동 계산
- 신규 단어와 복습 단어를 하루 학습량 안에서 섞어서 제공

### 1.4 발음·성조 듣기 연습
- 단어별 오디오 재생 (TTS로 사전 생성 또는 녹음 파일)
- 플래시카드 학습 중 자동/수동 재생
- 성조 표시(병음 위 성조 기호 또는 색상 구분)

### 1.5 진도 대시보드
- 오늘 학습/복습 완료 단어 수
- 누적 학습 단어 수, 급수별 진행률
- 연속 학습일(스트릭) — 간단한 카운터 정도만

---

## 2. Supabase 데이터 모델 초안

| 테이블 | 주요 컬럼 |
|---|---|
| `profiles` | id, user_id(FK auth.users), display_name, target_hsk_level, created_at |
| `words` | id, hanzi, pinyin, tone_pattern, meaning_ko, hsk_level, audio_url, example_sentence, example_pinyin, example_meaning_ko |
| `user_word_progress` | id, user_id, word_id, status(new/learning/review/mastered), ease_factor, interval_days, repetitions, next_review_at, last_reviewed_at |
| `study_logs` (선택) | id, user_id, date, words_reviewed, correct_count |

RLS 정책: `user_word_progress`, `study_logs`, `profiles`는 본인 행만 조회/수정 가능하도록 설정 필요.

---

## 3. MVP 범위 밖 (다음 단계로 미룸)
- 한자 쓰기(획순) 연습
- 문장 단위 학습/작문
- 게이미피케이션(배지, 랭킹)
- 소셜/커뮤니티 기능
- 구독·결제
- 다국어 UI, 오프라인 모드

---

## 4. 개발 순서 제안

1. **데이터 기반 다지기** — DB 스키마 확정 및 Supabase 마이그레이션, HSK 단어 데이터 소싱(공개 리스트/CC-CEDICT 등)·시드 스크립트 작성
2. **인증** — 회원가입/로그인/온보딩 플로우
3. **핵심 학습 루프** — 플래시카드 UI + SRS 로직 (가장 중요한 단계)
4. **발음/듣기** — 오디오 소싱(TTS 배치 생성) 및 재생 통합
5. **진도 대시보드** — 통계 화면
6. **폴리싱** — 반응형, 로딩/에러 상태, 빈 상태 처리

각 단계에서: 먼저 저와 상세 스펙(화면 흐름, SRS 로직, 스키마 세부사항)을 정리한 뒤, 그 스펙을 Claude Code에 넘겨 실제 구현을 진행하는 방식을 권장합니다.
