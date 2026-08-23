// Shared pronunciation helper — Web Speech API (SpeechSynthesis) with an
// audio_url fallback path for when pre-generated TTS/audio files exist.
// No API keys, no server: everything runs client-side in the browser.
const Speech = (() => {
  const supported = "speechSynthesis" in window;
  const FEMALE_NAME_HINTS = [
    "female", "yaoyao", "huihui", "tingting", "ting-ting",
    "mei", "xiaoxiao", "ya-ling", "sin-ji",
  ];

  let rate = 0.85;
  let voices = [];
  let selectedVoice = null;
  let currentAudio = null;
  let onVoicesReady = null;

  function pickChineseVoice(list) {
    const zhVoices = list.filter((v) => v.lang && v.lang.toLowerCase().startsWith("zh"));
    if (zhVoices.length === 0) return null;

    const exact = zhVoices.filter((v) => v.lang.toLowerCase() === "zh-cn");
    const pool = exact.length ? exact : zhVoices;

    const female = pool.find((v) =>
      FEMALE_NAME_HINTS.some((hint) => v.name.toLowerCase().includes(hint))
    );
    return female || pool[0];
  }

  function refreshVoices() {
    if (!supported) return;
    const list = window.speechSynthesis.getVoices();
    if (list.length === 0) return;
    voices = list;
    selectedVoice = pickChineseVoice(voices);
    if (onVoicesReady) onVoicesReady();
  }

  function init(callback) {
    onVoicesReady = callback || null;
    if (!supported) return;
    refreshVoices();
    window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
    // Some browsers populate the voice list without ever firing
    // voiceschanged, so poll once shortly after as a fallback.
    setTimeout(refreshVoices, 300);
  }

  function hasVoice() {
    return !!selectedVoice;
  }

  function setRate(newRate) {
    rate = newRate;
  }

  function stop() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
    if (supported) window.speechSynthesis.cancel();
  }

  function speakWithSynthesis(text, { onStart, onEnd } = {}) {
    if (!supported || !selectedVoice) {
      if (onEnd) onEnd();
      return;
    }
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "zh-CN";
      utterance.voice = selectedVoice;
      utterance.rate = rate;
      utterance.onstart = () => { if (onStart) onStart(); };
      utterance.onend = () => { if (onEnd) onEnd(); };
      utterance.onerror = () => { if (onEnd) onEnd(); };
      window.speechSynthesis.speak(utterance);
    } catch {
      if (onEnd) onEnd();
    }
  }

  // word: { hanzi, audio_url }
  function speak(word, callbacks = {}) {
    stop();
    const { onStart, onEnd } = callbacks;

    if (word.audio_url) {
      currentAudio = new Audio(word.audio_url);
      currentAudio.addEventListener("ended", () => { currentAudio = null; if (onEnd) onEnd(); });
      currentAudio.addEventListener("error", () => {
        currentAudio = null;
        speakWithSynthesis(word.hanzi, callbacks);
      });
      if (onStart) onStart();
      currentAudio.play().catch(() => {
        currentAudio = null;
        speakWithSynthesis(word.hanzi, callbacks);
      });
      return;
    }

    speakWithSynthesis(word.hanzi, callbacks);
  }

  return {
    init,
    speak,
    stop,
    setRate,
    hasVoice,
    get isSupported() { return supported; },
  };
})();
