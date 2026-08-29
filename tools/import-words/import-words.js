// Local-only script. Reads data/hsk2.0_words_all_levels.csv, merges in
// Claude-written Korean glosses from data/meaning_ko_hsk{N}.json, and
// upserts the rows into Supabase's `words` table for one HSK level at
// a time. Never deployed — see ../../.gitignore and ../../.vercelignore.
//
// Usage:
//   node import-words.js --hsk=2

const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const { createClient } = require("@supabase/supabase-js");

const PROJECT_ROOT = path.join(__dirname, "..", "..");
require("dotenv").config({ path: path.join(PROJECT_ROOT, ".env.local") });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function requireEnv() {
  const missing = [];
  if (!SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missing.length) {
    console.error(`.env.local에 다음 값이 없습니다: ${missing.join(", ")}`);
    process.exit(1);
  }
}

function loadCsvRowsForLevel(level) {
  const csvPath = path.join(PROJECT_ROOT, "data", "hsk2.0_words_all_levels.csv");
  const text = fs.readFileSync(csvPath, "utf-8");
  const rows = parse(text, { columns: true, skip_empty_lines: true, bom: true });
  return rows.filter((r) => r.hsk_level === String(level));
}

function loadTranslations(level) {
  const jsonPath = path.join(PROJECT_ROOT, "data", `meaning_ko_hsk${level}.json`);
  if (!fs.existsSync(jsonPath)) {
    console.error(`번역 파일이 없습니다: ${jsonPath}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
}

function toIntOrNull(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

async function main() {
  requireEnv();

  const hskArg = process.argv.find((a) => a.startsWith("--hsk="));
  if (!hskArg) {
    console.error("--hsk=N 인자가 필요합니다 (예: --hsk=2)");
    process.exit(1);
  }
  const level = Number(hskArg.split("=")[1]);

  const rows = loadCsvRowsForLevel(level);
  const translations = loadTranslations(level);

  console.log(`HSK${level}: CSV ${rows.length}개, 번역 파일 ${Object.keys(translations).length}개`);

  const missing = [];
  const payload = rows.map((r) => {
    const key = `${r.hanzi}|${r.pinyin}`;
    const meaning_ko = translations[key];
    if (!meaning_ko) missing.push(key);
    return {
      hanzi: r.hanzi,
      traditional: r.traditional || null,
      pinyin: r.pinyin,
      pinyin_numeric: r.pinyin_numeric || null,
      hsk_level: level,
      frequency: toIntOrNull(r.frequency),
      pos: r.pos || null,
      meaning_en: r.meaning_en || null,
      meaning_ko: meaning_ko || null,
      classifiers: r.classifiers || null,
    };
  });

  if (missing.length) {
    console.error(`번역이 없는 단어 ${missing.length}개가 있습니다. 임포트를 중단합니다:`);
    console.error(missing.join(", "));
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Chunk the upsert (Supabase/PostgREST caps a single request's returned
  // rows at ~1000, so large levels like HSK6 need multiple batches).
  const CHUNK_SIZE = 500;
  let upserted = 0;
  for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
    const chunk = payload.slice(i, i + CHUNK_SIZE);
    const { data, error } = await supabase
      .from("words")
      .upsert(chunk, { onConflict: "hanzi,pinyin,hsk_level" })
      .select("id");

    if (error) {
      console.error(`업서트 실패 (행 ${i}~${i + chunk.length}):`, error.message);
      process.exit(1);
    }
    upserted += data.length;
    console.log(`  ${Math.min(i + CHUNK_SIZE, payload.length)}/${payload.length} upsert 진행`);
  }

  console.log(`HSK${level}: ${upserted}개 행 upsert 완료`);
}

main().catch((err) => {
  console.error("스크립트 실행 중 오류:", err);
  process.exit(1);
});
