const { createClient } = supabase;
const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const messageEl = document.getElementById("message");
const progressEl = document.getElementById("progress");
const sceneEl = document.getElementById("scene");
const controlsEl = document.getElementById("controls");
const hanziEl = document.getElementById("hanzi");
const pinyinEl = document.getElementById("pinyin");
const meaningEl = document.getElementById("meaning");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const speakBtn = document.getElementById("speakBtn");
const speakHintEl = document.getElementById("speakHint");

let sentences = [];
let currentIndex = 0;

document.querySelectorAll(".mask").forEach((maskEl) => {
  maskEl.addEventListener("click", () => {
    maskEl.closest(".maskable").classList.remove("masked");
  });
});

function currentSentence() {
  return sentences[currentIndex];
}

function canSpeak(sentence) {
  return !!(sentence && (sentence.audio_url || Speech.hasVoice()));
}

function updateSpeakButton() {
  const available = canSpeak(currentSentence());
  speakBtn.disabled = !available;
  speakHintEl.classList.toggle("hidden", available);
}

function playCurrentSentence() {
  const sentence = currentSentence();
  if (!canSpeak(sentence)) return;
  speakBtn.classList.add("playing");
  Speech.speak(sentence, {
    onEnd: () => speakBtn.classList.remove("playing"),
  });
}

speakBtn.addEventListener("click", playCurrentSentence);

Speech.init(() => {
  if (sentences.length > 0) updateSpeakButton();
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
  Speech.stop();
  speakBtn.classList.remove("playing");

  const sentence = sentences[currentIndex];
  hanziEl.textContent = sentence.hanzi;
  pinyinEl.textContent = sentence.pinyin;
  meaningEl.textContent = sentence.meaning_ko;
  document.querySelector('.maskable[data-field="pinyin"]').classList.remove("masked");
  document.querySelector('.maskable[data-field="meaning"]').classList.add("masked");
  updateSpeakButton();

  progressEl.textContent = `${currentIndex + 1} / ${sentences.length}`;
  prevBtn.disabled = currentIndex === 0;
  nextBtn.disabled = currentIndex === sentences.length - 1;
}

function goToPrev() {
  if (currentIndex > 0) {
    currentIndex--;
    renderCurrentCard();
  }
}

function goToNext() {
  if (currentIndex < sentences.length - 1) {
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

async function loadSentences() {
  try {
    const { data, error } = await client.from("sentences").select("*");

    if (error) throw error;

    if (!data || data.length === 0) {
      showMessage("표시할 문장이 없습니다.", false);
      return;
    }

    sentences = shuffle(data);
    currentIndex = 0;
    showCard();
  } catch (err) {
    showMessage("문장을 불러오지 못했습니다: " + err.message, true);
  }
}

loadSentences();
