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
const nextBtn = document.getElementById("next-btn");
const imageStep = document.getElementById("image-step");
const imageGrid = document.getElementById("image-grid");
const regenerateImagesBtn = document.getElementById("regenerate-images-btn");
const confirmImagesBtn = document.getElementById("confirm-images-btn");

const templateInput = document.getElementById("template-input");
const durationInput = document.getElementById("duration-input");
const voiceList = document.getElementById("voice-list");
const voicePreview = document.getElementById("voice-preview");
const saveTemplateBtn = document.getElementById("save-template-btn");
const resetTemplateBtn = document.getElementById("reset-template-btn");
const settingsStatus = document.getElementById("settings-status");

const PREVIEW_TEXT = "Hey! This is a quick preview of this narrator voice for autoshort.";
let selectedVoiceId = "";

let currentVoiceScript = "";
let currentVisualStyle = "";
let currentShowName = "";
let selectedImages = new Set();
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
      const isImageStepVisible = btn.dataset.tab === "generate" && !imageStep.hidden;
      mainEl.classList.toggle("wide", btn.dataset.tab === "settings" || isImageStepVisible);
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
  selectedVoiceId = localStorage.getItem(VOICE_STORAGE_KEY) || "";
  voiceList.innerHTML = "";

  addVoiceCard({ voice_id: "", name: "Par défaut", tag: "Adam" });

  try {
    const res = await fetch(`${WORKER_URL}/voices`);
    const data = await res.json();
    (data.voices || []).forEach(addVoiceCard);
  } catch {
    // only the default card stays if the voice list can't be fetched
  }
}

function addVoiceCard(voice) {
  const card = document.createElement("div");
  card.className = "voice-card" + (selectedVoiceId === voice.voice_id ? " selected" : "");
  card.dataset.voiceId = voice.voice_id;

  const info = document.createElement("div");
  info.className = "voice-card-info";
  info.innerHTML = `<strong>${voice.name}</strong><span>${voice.tag || ""}</span>`;

  const previewBtn = document.createElement("button");
  previewBtn.type = "button";
  previewBtn.className = "voice-preview-btn";
  previewBtn.textContent = "▶";
  previewBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    playVoicePreview(voice.voice_id, previewBtn);
  });

  card.appendChild(info);
  card.appendChild(previewBtn);

  card.addEventListener("click", () => {
    selectedVoiceId = voice.voice_id;
    document.querySelectorAll(".voice-card").forEach((c) => c.classList.remove("selected"));
    card.classList.add("selected");
  });

  voiceList.appendChild(card);
}

async function playVoicePreview(voiceId, btn) {
  btn.disabled = true;
  btn.textContent = "…";
  try {
    const res = await fetch(`${WORKER_URL}/generate-audio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: PREVIEW_TEXT, voiceId: voiceId || undefined }),
    });
    if (!res.ok) throw new Error("preview failed");
    const blob = await res.blob();
    voicePreview.src = URL.createObjectURL(blob);
    voicePreview.hidden = false;
    await voicePreview.play();
  } catch {
    speakWithBrowser(PREVIEW_TEXT);
  } finally {
    btn.disabled = false;
    btn.textContent = "▶";
  }
}

saveTemplateBtn.addEventListener("click", () => {
  localStorage.setItem(TEMPLATE_STORAGE_KEY, templateInput.value);
  localStorage.setItem(DURATION_STORAGE_KEY, durationInput.value || DEFAULT_DURATION);
  if (selectedVoiceId) {
    localStorage.setItem(VOICE_STORAGE_KEY, selectedVoiceId);
  } else {
    localStorage.removeItem(VOICE_STORAGE_KEY);
  }
  settingsStatus.textContent = "Template enregistré.";
  setTimeout(() => (settingsStatus.textContent = ""), 2000);
});

resetTemplateBtn.addEventListener("click", () => {
  templateInput.value = defaultTemplate;
  durationInput.value = DEFAULT_DURATION;
  localStorage.removeItem(TEMPLATE_STORAGE_KEY);
  localStorage.removeItem(DURATION_STORAGE_KEY);
  localStorage.removeItem(VOICE_STORAGE_KEY);
  loadVoices();
  settingsStatus.textContent = "Template réinitialisé.";
  setTimeout(() => (settingsStatus.textContent = ""), 2000);
});

clearBtn.addEventListener("click", () => {
  promptInput.value = "";
  resultSection.hidden = true;
  audioWrapper.hidden = true;
  audioPlayer.removeAttribute("src");
  nextBtn.hidden = true;
  imageStep.hidden = true;
  status.textContent = "";
  durationEstimate.textContent = "";
  currentVoiceScript = "";
  currentVisualStyle = "";
  currentShowName = "";
  selectedImages = new Set();
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
  nextBtn.hidden = true;
  imageStep.hidden = true;

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
    currentVisualStyle = data.visualStyle || "";
    currentShowName = data.showName || "";
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
    nextBtn.hidden = false;
  }
});

nextBtn.addEventListener("click", () => {
  imageStep.hidden = false;
  document.querySelector("main").classList.add("wide");
  nextBtn.scrollIntoView({ behavior: "smooth", block: "nearest" });
  if (imageGrid.children.length === 0) {
    generateImages();
  }
});

regenerateImagesBtn.addEventListener("click", generateImages);

confirmImagesBtn.addEventListener("click", () => {
  if (selectedImages.size === 0) {
    status.textContent = "Sélectionne au moins une image avant de valider.";
    return;
  }
  status.textContent = `${selectedImages.size} image(s) sélectionnée(s) pour le montage.`;
});

async function generateImages() {
  imageGrid.innerHTML = "";
  selectedImages = new Set();
  regenerateImagesBtn.disabled = true;
  confirmImagesBtn.disabled = true;
  status.textContent = "Génération des images en cours...";

  try {
    const stylePrompt = currentVisualStyle || currentVoiceScript || promptInput.value;
    const res = await fetch(`${WORKER_URL}/generate-images`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: stylePrompt, showName: currentShowName }),
    });

    const data = await res.json();
    if (!res.ok) {
      const details = data.details ? ` — ${data.details}` : "";
      throw new Error((data.error || "Erreur de génération d'images") + details);
    }

    (data.images || []).forEach((src, i) => addImageCard(src, i));
    status.textContent = "";
  } catch (err) {
    status.textContent = `Erreur images : ${err.message}`;
  } finally {
    regenerateImagesBtn.disabled = false;
    confirmImagesBtn.disabled = false;
  }
}

function addImageCard(src, index) {
  const card = document.createElement("div");
  card.className = "image-card";

  const img = document.createElement("img");
  img.src = src;
  img.alt = `Image proposée ${index + 1}`;

  const badge = document.createElement("span");
  badge.className = "image-check";
  badge.textContent = "✓";

  card.appendChild(img);
  card.appendChild(badge);

  card.addEventListener("click", () => {
    if (selectedImages.has(index)) {
      selectedImages.delete(index);
      card.classList.remove("selected");
    } else {
      selectedImages.add(index);
      card.classList.add("selected");
    }
  });

  imageGrid.appendChild(card);
}

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
