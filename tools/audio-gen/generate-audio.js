// Local-only script. Generates Chinese pronunciation mp3s for the
// Supabase `words` table via Google Cloud Text-to-Speech, uploads
// them to Supabase Storage, and writes the public URL back to
// words.audio_url. Never deployed — see ../../.gitignore and
// ../../.vercelignore.
//
// Usage:
//   npm run generate                # process every row with audio_url IS NULL
//   npm run generate -- --limit=5   # only process the first 5 (for a quick test)

const path = require("path");
const { TextToSpeechClient } = require("@google-cloud/text-to-speech");
const { createClient } = require("@supabase/supabase-js");

const PROJECT_ROOT = path.join(__dirname, "..", "..");
require("dotenv").config({ path: path.join(PROJECT_ROOT, ".env.local") });

if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(
    PROJECT_ROOT,
    process.env.GOOGLE_APPLICATION_CREDENTIALS
  );
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "word-audio";
const REQUEST_DELAY_MS = 200;
const MAX_RETRIES = 3;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requireEnv() {
  const missing = [];
  if (!SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) missing.push("GOOGLE_APPLICATION_CREDENTIALS");
  if (missing.length) {
    console.error(`.env.local에 다음 값이 없습니다: ${missing.join(", ")}`);
    process.exit(1);
  }
}

async function withRetry(fn, { retries = MAX_RETRIES, baseDelayMs = 800, label }) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      console.warn(`  ⚠ ${label} 실패 (시도 ${attempt}/${retries}): ${err.message}`);
      if (attempt < retries) await sleep(baseDelayMs * attempt);
    }
  }
  throw lastErr;
}

async function pickChineseVoice(ttsClient) {
  const [result] = await ttsClient.listVoices({ languageCode: "cmn-CN" });
  const voices = result.voices || [];
  if (voices.length === 0) {
    throw new Error("cmn-CN 음성을 찾을 수 없습니다.");
  }

  const femaleOf = (tier) => voices.filter((v) => v.name.includes(tier) && v.ssmlGender === "FEMALE");

  const chosen =
    femaleOf("Neural2")[0] ||
    femaleOf("Wavenet")[0] ||
    voices.find((v) => v.ssmlGender === "FEMALE") ||
    voices[0];

  console.log(
    `사용 가능한 cmn-CN 음성 ${voices.length}개 중 선택: ${chosen.name} (${chosen.ssmlGender})`
  );
  return chosen;
}

async function ensureBucket(supabase) {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw error;

  if (buckets.some((b) => b.name === BUCKET)) {
    console.log(`버킷 '${BUCKET}' 이미 존재함`);
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: "2MB",
    allowedMimeTypes: ["audio/mpeg"],
  });
  if (createError) throw createError;
  console.log(`버킷 '${BUCKET}' 생성 완료 (public read)`);
}

async function processWord(ttsClient, supabase, voice, word) {
  const [response] = await ttsClient.synthesizeSpeech({
    input: { text: word.hanzi },
    voice: { languageCode: "cmn-CN", name: voice.name },
    audioConfig: { audioEncoding: "MP3" },
  });

  const fileName = `word-${word.id}.mp3`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, response.audioContent, { contentType: "audio/mpeg", upsert: true });
  if (uploadError) throw new Error(`업로드 실패: ${uploadError.message}`);

  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName);

  const { error: updateError } = await supabase
    .from("words")
    .update({ audio_url: publicUrlData.publicUrl })
    .eq("id", word.id);
  if (updateError) throw new Error(`DB 업데이트 실패: ${updateError.message}`);
}

async function main() {
  requireEnv();

  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : null;
  const hskArg = process.argv.find((a) => a.startsWith("--hsk="));
  const hskLevel = hskArg ? Number(hskArg.split("=")[1]) : null;

  const ttsClient = new TextToSpeechClient();
  const voice = await pickChineseVoice(ttsClient);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  await ensureBucket(supabase);

  let query = supabase
    .from("words")
    .select("id, hanzi")
    .is("audio_url", null)
    .order("id", { ascending: true });
  if (hskLevel) query = query.eq("hsk_level", hskLevel);
  if (limit) query = query.limit(limit);

  const { data: words, error } = await query;
  if (error) throw error;

  console.log(`처리 대상 (audio_url이 비어있는 단어): ${words.length}개\n`);

  let done = 0;
  const failed = [];

  for (const word of words) {
    try {
      await withRetry(() => processWord(ttsClient, supabase, voice, word), {
        label: `${word.hanzi} (id=${word.id})`,
      });
      done++;
      console.log(`${done}/${words.length} 완료 (${word.hanzi})`);
    } catch (err) {
      failed.push({ word, message: err.message });
      console.error(`✗ ${word.hanzi} (id=${word.id}) 최종 실패: ${err.message}`);
    }
    await sleep(REQUEST_DELAY_MS);
  }

  console.log(`\n총 ${words.length}개 중 성공 ${done}개, 실패 ${failed.length}개`);
  if (failed.length) {
    console.log(
      "실패한 단어:",
      failed.map((f) => `${f.word.hanzi}(id=${f.word.id})`).join(", ")
    );
  }
}

main().catch((err) => {
  console.error("스크립트 실행 중 오류:", err);
  process.exit(1);
});
