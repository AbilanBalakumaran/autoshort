const WORKER_URL = "https://autoshort-2ym.pages.dev";
const TEMPLATE_STORAGE_KEY = "autoshort-template";
const DURATION_STORAGE_KEY = "autoshort-duration";
const VOICE_STORAGE_KEY = "autoshort-voice";
const DEFAULT_DURATION = 16;
const WORDS_PER_SECOND = 35 / 16;

const form = document.getElementById("prompt-form");
const promptInput = document.getElementById("prompt");
const resultSection = document.getElementById("result");
const scriptOutput = document.getElementById("script-output");
const durationEstimate = document.getElementById("duration-estimate");
const status = document.getElementById("status");
const clearBtn = document.getElementById("clear-btn");
const audioPlayer = document.getElementById("audio-player");
const audioWrapper = document.getElementById("audio-wrapper");
const generateAudioBtn = document.getElementById("generate-audio-btn");

const templateInput = document.getElementById("template-input");
const durationInput = document.getElementById("duration-input");
const voiceSelect = document.getElementById("voice-select");
const previewVoiceBtn = document.getElementById("preview-voice-btn");
const voicePreview = document.getElementById("voice-preview");
const saveTemplateBtn = document.getElementById("save-template-btn");
const resetTemplateBtn = document.getElementById("reset-template-btn");
const settingsStatus = document.getElementById("settings-status");

let voicesById = {};

let currentVoiceScript = "";
let defaultTemplate = "";

initTabs();
initSettings();

function initTabs() {
  const tabButtons = document.querySelectorAll(".tab-btn");
  const mainEl = document.querySelector("main");
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".tab-panel").forEach((panel) => {
        panel.hidden = panel.id !== `tab-${btn.dataset.tab}`;
      });
      mainEl.classList.toggle("wide", btn.dataset.tab === "settings");
    });
  });
}

async function initSettings() {
  try {
    const res = await fetch(`${WORKER_URL}/default-template`);
    const data = await res.json();
    defaultTemplate = data.template || "";
  } catch {
    defaultTemplate = "";
  }

  const saved = localStorage.getItem(TEMPLATE_STORAGE_KEY);
  templateInput.value = saved || defaultTemplate;

  const savedDuration = localStorage.getItem(DURATION_STORAGE_KEY);
  durationInput.value = savedDuration || DEFAULT_DURATION;

  await loadVoices();
}

async function loadVoices() {
  try {
    const res = await fetch(`${WORKER_URL}/voices`);
    const data = await res.json();

    (data.voices || []).forEach((v) => {
      voicesById[v.voice_id] = v;
      const option = document.createElement("option");
      option.value = v.voice_id;
      option.textContent = `${v.name}${v.category ? " · " + v.category : ""}`;
      voiceSelect.appendChild(option);
    });

    const savedVoice = localStorage.getItem(VOICE_STORAGE_KEY);
    if (savedVoice && voicesById[savedVoice]) {
      voiceSelect.value = savedVoice;
    }
  } catch {
    // keep only the "Par défaut" option if the voice list can't be fetched
  }
}

previewVoiceBtn.addEventListener("click", () => {
  const voice = voicesById[voiceSelect.value];
  if (!voice || !voice.preview_url) return;
  voicePreview.src = voice.preview_url;
  voicePreview.play();
});

saveTemplateBtn.addEventListener("click", () => {
  localStorage.setItem(TEMPLATE_STORAGE_KEY, templateInput.value);
  localStorage.setItem(DURATION_STORAGE_KEY, durationInput.value || DEFAULT_DURATION);
  if (voiceSelect.value) {
    localStorage.setItem(VOICE_STORAGE_KEY, voiceSelect.value);
  } else {
    localStorage.removeItem(VOICE_STORAGE_KEY);
  }
  settingsStatus.textContent = "Template enregistré.";
  setTimeout(() => (settingsStatus.textContent = ""), 2000);
});

resetTemplateBtn.addEventListener("click", () => {
  templateInput.value = defaultTemplate;
  durationInput.value = DEFAULT_DURATION;
  voiceSelect.value = "";
  localStorage.removeItem(TEMPLATE_STORAGE_KEY);
  localStorage.removeItem(DURATION_STORAGE_KEY);
  localStorage.removeItem(VOICE_STORAGE_KEY);
  settingsStatus.textContent = "Template réinitialisé.";
  setTimeout(() => (settingsStatus.textContent = ""), 2000);
});

clearBtn.addEventListener("click", () => {
  promptInput.value = "";
  resultSection.hidden = true;
  audioWrapper.hidden = true;
  audioPlayer.removeAttribute("src");
  status.textContent = "";
  durationEstimate.textContent = "";
  currentVoiceScript = "";
  promptInput.focus();
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const prompt = promptInput.value.trim();
  if (!prompt) return;

  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  status.textContent = "Génération du script en cours...";
  resultSection.hidden = true;
  audioWrapper.hidden = true;
  audioPlayer.removeAttribute("src");

  try {
    const template = localStorage.getItem(TEMPLATE_STORAGE_KEY) || undefined;
    const duration = Number(localStorage.getItem(DURATION_STORAGE_KEY)) || DEFAULT_DURATION;

    const res = await fetch(`${WORKER_URL}/generate-prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: prompt, template, duration }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Erreur inconnue");
    }

    scriptOutput.textContent = data.voiceScript || "(aucun script vocal extrait)";
    currentVoiceScript = data.voiceScript || "";
    resultSection.hidden = false;
    durationEstimate.textContent = currentVoiceScript
      ? `Durée estimée : ~${estimateDuration(currentVoiceScript)}s`
      : "";
    status.textContent = "";
  } catch (err) {
    status.textContent = `Erreur : ${err.message}`;
  } finally {
    button.disabled = false;
  }
});

generateAudioBtn.addEventListener("click", async () => {
  if (!currentVoiceScript) return;

  generateAudioBtn.disabled = true;
  status.textContent = "Génération de l'audio...";
  audioWrapper.hidden = true;

  try {
    const voiceId = localStorage.getItem(VOICE_STORAGE_KEY) || undefined;
    const audioRes = await fetch(`${WORKER_URL}/generate-audio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: currentVoiceScript, voiceId }),
    });

    if (!audioRes.ok) throw new Error("ElevenLabs indisponible");

    const audioBlob = await audioRes.blob();
    audioPlayer.src = URL.createObjectURL(audioBlob);
    audioWrapper.hidden = false;
    status.textContent = "";
  } catch {
    status.textContent = "Audio ElevenLabs indisponible, lecture via la voix du navigateur.";
    speakWithBrowser(currentVoiceScript);
  } finally {
    generateAudioBtn.disabled = false;
  }
});

function estimateDuration(text) {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.round(wordCount / WORDS_PER_SECOND);
}

function speakWithBrowser(text) {
  if (!("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 1.1;
  window.speechSynthesis.speak(utterance);
}
