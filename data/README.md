# HSK 단어 데이터 — Supabase 시드용

`drkameleon/complete-hsk-vocabulary` (MIT 라이선스, 공개 GitHub 저장소)에서 HSK 2.0 1~6급 단어 전체(4,991개)를 받아와서, 동음이의자(예: 那 → 성씨 "Na"로 잘못 뽑히는 문제 등) 오선별 문제를 자동 보정한 뒤 정리했습니다.

현재 정기 HSK 1~6급 시험은 (2026년 8월 기준) 아직 구버전인 HSK 2.0 기준으로 시행되고 있어서, 이 데이터를 기본으로 잡았습니다. HSK 3.0 급수 정보는 원본 데이터셋에 이미 포함되어 있어 나중에 확장 가능합니다.

## 포함된 파일

- **`schema.sql`** — Supabase에 실행할 테이블 정의 (`words`, `profiles`, `user_word_progress`, `study_logs`) + RLS 정책 + 회원가입 시 자동 프로필 생성 트리거. **가장 먼저 이 파일을 Supabase SQL Editor에서 실행하세요.**
- **`seed_hsk1.sql`** — HSK 1급 단어 150개, **한국어 뜻까지 채워진** 상태로 바로 실행 가능한 INSERT문. schema.sql 다음에 실행하면 바로 학습 화면 테스트가 가능합니다.
- **`hsk2.0_words_all_levels.csv` / `.json`** — HSK 1~6급 전체 4,991개 단어 (한자, 병음, 영어 뜻, 급수, 빈도 등 포함). **`meaning_ko`(한국어 뜻) 컬럼은 1급만 채워져 있고 2~6급은 비어 있습니다.**

## 왜 2~6급 한국어 뜻이 비어있나요?

거의 5,000개 단어를 정확하게 번역하는 건 신뢰성 있게 하려면 검증이 필요한 큰 작업이라, 우선 1급(가장 기초 단어 150개)만 직접 확인해서 채워 넣었습니다. 나머지는 아래 방법 중 하나로 진행하시면 됩니다.

1. **Claude Code에게 이어서 시키기** (추천) — 아래 프롬프트를 그대로 복사해서 Claude Code에 붙여넣으면, 나머지 급수를 배치로 번역하고 Supabase에 넣는 스크립트까지 짜줄 겁니다.
2. **번역 API 사용** — 파파고(Naver) API나 Google Translate API 같은 중국어-한국어 번역에 강한 서비스를 이용해 `meaning_en`을 기준으로 일괄 번역하는 스크립트를 돌리는 방법. API 키가 필요합니다.

## 다음 단계에서 Claude Code에 붙여넣을 프롬프트

```
Supabase words 테이블에 HSK 2~6급 단어(hsk2.0_words_all_levels.csv, meaning_ko 컬럼 비어있음)를
채워 넣으려고 해. 아래 작업을 해줘:

1. hsk2.0_words_all_levels.csv를 읽어서 meaning_ko가 비어있는 행(hsk_level 2~6)에 대해
   한국어 뜻을 채워넣는 스크립트를 작성해줘. (번역 API를 쓸지, 배치로 LLM 호출을 쓸지는 네가 판단해서 제안해줘)
2. 완성된 CSV를 Supabase words 테이블에 upsert하는 import 스크립트도 작성해줘
   (hanzi+pinyin+hsk_level 조합을 고유 키로 사용, 이미 schema.sql에 unique index 있음).
3. 다 끝나면 각 급수별로 몇 개 단어가 들어갔는지 확인하는 쿼리도 같이 실행해줘.
```

## Supabase에 넣는 순서 (지금 바로 할 수 있는 것)

1. Supabase 대시보드 → SQL Editor → `schema.sql` 내용 붙여넣고 실행
2. 이어서 `seed_hsk1.sql` 내용 붙여넣고 실행 → `words` 테이블에 1급 150개가 한국어 뜻과 함께 들어갑니다
3. Table Editor에서 `words` 테이블 확인 → 정상적으로 들어갔는지 체크
4. 이후 프론트엔드(Claude Code 작업)에서 `words` 테이블을 급수별로 조회하는 화면부터 만들어보시면 됩니다

## 참고: 아직 없는 데이터

- **발음 오디오**: 이 데이터셋에는 오디오가 없습니다. TTS API(Azure/Google Cloud/ElevenLabs 등)로 배치 생성하거나, 오디오 없이 우선 텍스트 학습부터 시작하는 것도 방법입니다.
- **예문**: `example_sentence` 컬럼은 schema.sql에 만들어뒀지만 비어있습니다. CC-CEDICT나 Tatoeba 같은 예문 코퍼스에서 나중에 채워 넣으시면 됩니다.
