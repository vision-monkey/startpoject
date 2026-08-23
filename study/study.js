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
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

let words = [];
let currentIndex = 0;
let flipped = false;

function showMessage(text, isError) {
  messageEl.textContent = text;
  messageEl.className = isError ? "err" : "";
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
  const word = words[currentIndex];
  hanziEl.textContent = word.hanzi;
  pinyinEl.textContent = word.pinyin;
  meaningEl.textContent = word.meaning_ko || word.meaning_en || "";

  flipped = false;
  flashcardEl.classList.remove("flipped");

  progressEl.textContent = `${currentIndex + 1} / ${words.length}`;
  prevBtn.disabled = currentIndex === 0;
  nextBtn.disabled = currentIndex === words.length - 1;
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

flashcardEl.addEventListener("click", () => {
  flipped = !flipped;
  flashcardEl.classList.toggle("flipped", flipped);
});

prevBtn.addEventListener("click", goToPrev);
nextBtn.addEventListener("click", goToNext);

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") goToPrev();
  if (e.key === "ArrowRight") goToNext();
});

async function loadWords() {
  try {
    const { data, error } = await client
      .from("words")
      .select("*")
      .eq("hsk_level", 1)
      .order("frequency", { ascending: true, nullsFirst: false })
      .order("id", { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      showMessage("표시할 단어가 없습니다.", false);
      return;
    }

    words = data;
    currentIndex = 0;
    showCard();
  } catch (err) {
    showMessage("단어를 불러오지 못했습니다: " + err.message, true);
  }
}

loadWords();
