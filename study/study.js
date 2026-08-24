const { createClient } = supabase;
const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const messageEl = document.getElementById("message");
const progressEl = document.getElementById("progress");
const sceneEl = document.getElementById("scene");
const controlsEl = document.getElementById("controls");
const flashcardEl = document.getElementById("flashcard");
const hanziEl = document.getElementById("hanzi");
const pinyinEl = document.getElementById("pinyin");
const meaningEl = document.getElementById("meaning");
const pinyinWrap = document.querySelector('.maskable[data-field="pinyin"]');
const meaningWrap = document.querySelector('.maskable[data-field="meaning"]');
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const speakBtn = document.getElementById("speakBtn");
const speakHintEl = document.getElementById("speakHint");

function loadSettings() {
  const defaults = { mode: "manual", hidePinyin: false, hideMeaning: true, interval: 4, autoSpeak: false };
  try {
    const raw = localStorage.getItem("hskStudySettings");
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

const settings = loadSettings();

let words = [];
let currentIndex = 0;
let autoRevealTimer = null;
let autoAdvanceTimer = null;
let renderGen = 0;

function clearAutoTimers() {
  clearTimeout(autoRevealTimer);
  clearTimeout(autoAdvanceTimer);
  autoRevealTimer = null;
  autoAdvanceTimer = null;
}

function applyMasks() {
  pinyinWrap.classList.toggle("masked", settings.hidePinyin);
  meaningWrap.classList.toggle("masked", settings.hideMeaning);
}

function revealAll() {
  pinyinWrap.classList.remove("masked");
  meaningWrap.classList.remove("masked");
}

function scheduleAuto() {
  if (settings.mode !== "auto") return;
  const gen = renderGen;

  autoRevealTimer = setTimeout(() => {
    revealAll();

    if (settings.autoSpeak) {
      // Wait for the pronunciation to actually finish before advancing,
      // instead of a fixed timer that could cut it off mid-playback.
      playCurrentWord(() => {
        if (gen !== renderGen) return;
        autoAdvanceTimer = setTimeout(() => {
          if (gen === renderGen) goToNext();
        }, 500);
      });
    } else {
      autoAdvanceTimer = setTimeout(goToNext, 1000);
    }
  }, settings.interval * 1000);
}

document.querySelectorAll(".mask").forEach((maskEl) => {
  maskEl.addEventListener("click", () => {
    maskEl.closest(".maskable").classList.remove("masked");
  });
});

function currentWord() {
  return words[currentIndex];
}

function canSpeak(word) {
  return !!(word && (word.audio_url || Speech.hasVoice()));
}

function updateSpeakButton() {
  const word = currentWord();
  const available = canSpeak(word);
  speakBtn.disabled = !available;
  speakHintEl.classList.toggle("hidden", available);
}

function playCurrentWord(onDone) {
  const word = currentWord();
  if (!canSpeak(word)) {
    if (onDone) onDone();
    return;
  }
  speakBtn.classList.add("playing");
  Speech.speak(word, {
    onEnd: () => {
      speakBtn.classList.remove("playing");
      if (onDone) onDone();
    },
  });
}

speakBtn.addEventListener("click", () => playCurrentWord());

Speech.init(() => {
  if (words.length > 0) updateSpeakButton();
});

function showMessage(text, isError) {
  messageEl.textContent = text;
  messageEl.classList.toggle("err", isError);
  messageEl.classList.remove("hidden");
  sceneEl.classList.add("hidden");
  controlsEl.classList.add("hidden");
  progressEl.classList.add("hidden");
}

function showCard() {
  messageEl.classList.add("hidden");
  sceneEl.classList.remove("hidden");
  controlsEl.classList.remove("hidden");
  progressEl.classList.remove("hidden");
  renderCurrentCard();
}

function renderCurrentCard() {
  renderGen++;
  clearAutoTimers();
  Speech.stop();
  speakBtn.classList.remove("playing");

  const word = words[currentIndex];
  hanziEl.textContent = word.hanzi;
  pinyinEl.textContent = word.pinyin;
  meaningEl.textContent = word.meaning_ko || word.meaning_en || "";
  applyMasks();
  updateSpeakButton();

  progressEl.textContent = `${currentIndex + 1} / ${words.length}`;
  prevBtn.disabled = currentIndex === 0;
  nextBtn.disabled = currentIndex === words.length - 1;

  scheduleAuto();
}

function goToPrev() {
  if (currentIndex > 0) {
    currentIndex--;
    renderCurrentCard();
  }
}

function goToNext() {
  if (currentIndex < words.length - 1) {
    currentIndex++;
    renderCurrentCard();
  }
}

prevBtn.addEventListener("click", goToPrev);
nextBtn.addEventListener("click", goToNext);

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") goToPrev();
  if (e.key === "ArrowRight") goToNext();
});

window.addEventListener("pagehide", () => Speech.stop());

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function loadWords() {
  try {
    const { data, error } = await client
      .from("words")
      .select("*")
      .eq("hsk_level", 1);

    if (error) throw error;

    if (!data || data.length === 0) {
      showMessage("표시할 단어가 없습니다.", false);
      return;
    }

    words = shuffle(data);
    currentIndex = 0;
    showCard();
  } catch (err) {
    showMessage("단어를 불러오지 못했습니다: " + err.message, true);
  }
}

loadWords();
