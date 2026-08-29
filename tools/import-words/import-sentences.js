// Local-only script. Reads data/sentences.json (Claude-authored everyday
// conversational sentences) and upserts them into Supabase's `sentences`
// table. Never deployed — see ../../.gitignore and ../../.vercelignore.
//
// Usage:
//   node import-sentences.js

const fs = require("fs");
const path = require("path");
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

async function main() {
  requireEnv();

  const jsonPath = path.join(PROJECT_ROOT, "data", "sentences.json");
  const sentences = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  console.log(`sentences.json: ${sentences.length}개`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data, error } = await supabase
    .from("sentences")
    .upsert(sentences, { onConflict: "hanzi,pinyin" })
    .select("id");

  if (error) {
    console.error("업서트 실패:", error.message);
    process.exit(1);
  }

  console.log(`${data.length}개 행 upsert 완료`);
}

main().catch((err) => {
  console.error("스크립트 실행 중 오류:", err);
  process.exit(1);
});
