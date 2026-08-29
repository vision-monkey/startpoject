const settingsModal = document.getElementById("settingsModal");
const modalTitle = document.getElementById("modalTitle");
const intervalGroup = document.getElementById("intervalGroup");
const startBtn = document.getElementById("startBtn");
const levelButtons = document.querySelectorAll(".level-btn");

let selectedLevel = 1;

levelButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    selectedLevel = Number(btn.dataset.level);
    modalTitle.textContent = `HSK ${selectedLevel}급 학습 설정`;
    settingsModal.showModal();
  });
});

const autoOnlyEls = document.querySelectorAll(".auto-only");

function syncIntervalGroupVisibility() {
  const mode = document.querySelector('input[name="mode"]:checked').value;
  const isAuto = mode === "auto";
  intervalGroup.hidden = !isAuto;
  autoOnlyEls.forEach((el) => { el.hidden = !isAuto; });
}

document.querySelectorAll('input[name="mode"]').forEach((input) => {
  input.addEventListener("change", syncIntervalGroupVisibility);
});

syncIntervalGroupVisibility();

startBtn.addEventListener("click", () => {
  const mode = document.querySelector('input[name="mode"]:checked').value;
  const hidePinyin = document.querySelector('input[name="hide"][value="pinyin"]').checked;
  const hideMeaning = document.querySelector('input[name="hide"][value="meaning"]').checked;
  const intervalInput = document.querySelector('input[name="interval"]:checked');
  const interval = intervalInput ? Number(intervalInput.value) : 4;
  const autoSpeak = document.getElementById("autoSpeakCheckbox").checked;

  localStorage.setItem(
    "hskStudySettings",
    JSON.stringify({ hskLevel: selectedLevel, mode, hidePinyin, hideMeaning, interval, autoSpeak })
  );

  window.location.href = "study/";
});
