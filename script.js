const WORKER_URL = "https://autoshort-2ym.pages.dev";
const TEMPLATE_STORAGE_KEY = "autoshort-template";
const DURATION_STORAGE_KEY = "autoshort-duration";
const VOICE_STORAGE_KEY = "autoshort-voice";
const DEFAULT_DURATION = 16;
const WORDS_PER_SECOND = 35 / 16;

const ICONS = {
  speaker:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>',
  film:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z"/><path d="m6.2 5.3 3.1 3.9"/><path d="m12.4 3.4 3.1 4"/><rect x="3" y="11" width="18" height="10" rx="2"/></svg>',
  folder:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>',
  refresh:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>',
  trash:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  download:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  grip:
    '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>',
  chevronRight:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
  copy:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  swap:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 2 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
};

function iconLabel(iconName, label) {
  return `<span class="icon">${ICONS[iconName]}</span><span>${label}</span>`;
}

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
const uploadInput = document.getElementById("upload-input");
const uploadBtn = document.getElementById("upload-btn");
const regenerateImagesBtn = document.getElementById("regenerate-images-btn");
const confirmImagesBtn = document.getElementById("confirm-images-btn");
const montageBtn = document.getElementById("montage-btn");
const montageCanvas = document.getElementById("montage-canvas");
const montageResult = document.getElementById("montage-result");
const montagePreview = document.getElementById("montage-preview");
const montageDownload = document.getElementById("montage-download");
const timelineStep = document.getElementById("timeline-step");
const timelineList = document.getElementById("timeline-list");
const metadataStep = document.getElementById("metadata-step");
const titlesList = document.getElementById("titles-list");
const descriptionOutput = document.getElementById("description-output");
const tagsOutput = document.getElementById("tags-output");
const copyDescriptionBtn = document.getElementById("copy-description-btn");
const copyTagsBtn = document.getElementById("copy-tags-btn");
const debugLog = document.getElementById("debug-log");

function log(msg) {
  debugLog.hidden = false;
  const time = new Date().toLocaleTimeString();
  debugLog.textContent += `[${time}] ${msg}\n`;
  debugLog.scrollTop = debugLog.scrollHeight;
}

window.addEventListener("error", (e) => log(`Erreur JS globale : ${e.message}`));
window.addEventListener("unhandledrejection", (e) => log(`Promesse rejetée : ${e.reason?.message || e.reason}`));

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
let currentCharacters = [];
let currentRealEntities = [];
let selectedImages = []; // ordered array of image URLs, order = order in the video
let defaultTemplate = "";

initButtons();
initTabs();
initSettings();

function initButtons() {
  generateAudioBtn.innerHTML = iconLabel("speaker", "Générer l'audio");
  nextBtn.innerHTML = `<span>Suivant</span><span class="icon">${ICONS.chevronRight}</span>`;
  uploadBtn.innerHTML = iconLabel("folder", "Ajouter depuis ma galerie");
  regenerateImagesBtn.innerHTML = iconLabel("refresh", "Régénérer");
  montageBtn.innerHTML = iconLabel("film", "Générer le montage");
  montageDownload.innerHTML = iconLabel("download", "Télécharger la vidéo");
  copyDescriptionBtn.innerHTML = iconLabel("copy", "Copier la description");
  copyTagsBtn.innerHTML = iconLabel("copy", "Copier les tags");
  updateConfirmLabel();
}

function updateConfirmLabel() {
  confirmImagesBtn.textContent = `Valider la sélection (${selectedImages.length})`;
}

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
  previewBtn.innerHTML = ICONS.play;
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
  currentCharacters = [];
  currentRealEntities = [];
  selectedImages = [];
  imageGrid.innerHTML = "";
  timelineStep.hidden = true;
  timelineList.innerHTML = "";
  montageBtn.hidden = true;
  montageResult.hidden = true;
  metadataStep.hidden = true;
  updateConfirmLabel();
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
  montageBtn.hidden = true;
  montageResult.hidden = true;
  metadataStep.hidden = true;
  selectedImages = [];
  imageGrid.innerHTML = "";
  timelineStep.hidden = true;
  timelineList.innerHTML = "";
  updateConfirmLabel();

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
    currentCharacters = data.characters || [];
    currentRealEntities = data.realEntities || [];
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

uploadBtn.addEventListener("click", () => uploadInput.click());

uploadInput.addEventListener("change", () => {
  [...uploadInput.files].forEach((file) => {
    const url = URL.createObjectURL(file);
    selectedImages.push(url);
    addImageCard(url);
  });
  uploadInput.value = "";
  updateConfirmLabel();
});

confirmImagesBtn.addEventListener("click", () => {
  if (selectedImages.length === 0) {
    status.textContent = "Sélectionne au moins une image avant de valider.";
    return;
  }
  status.textContent = `${selectedImages.length} image(s) sélectionnée(s) pour le montage.`;
  montageBtn.hidden = false;
  timelineStep.hidden = false;
  renderTimeline();
  montageBtn.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

montageBtn.addEventListener("click", generateMontage);

copyDescriptionBtn.addEventListener("click", () => copyToClipboard(descriptionOutput.value, copyDescriptionBtn, "Copier la description"));
copyTagsBtn.addEventListener("click", () => copyToClipboard(tagsOutput.value, copyTagsBtn, "Copier les tags"));

async function copyToClipboard(text, btn, label) {
  try {
    await navigator.clipboard.writeText(text);
    btn.innerHTML = iconLabel("copy", "Copié !");
    setTimeout(() => (btn.innerHTML = iconLabel("copy", label)), 1500);
  } catch {
    status.textContent = "Impossible de copier automatiquement, sélectionne le texte manuellement.";
  }
}

async function generateImages() {
  regenerateImagesBtn.disabled = true;
  confirmImagesBtn.disabled = true;
  status.textContent = "Génération des images en cours...";

  try {
    const stylePrompt = currentVisualStyle || currentVoiceScript || promptInput.value;

    const res = await fetch(`${WORKER_URL}/generate-images`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: stylePrompt,
        showName: currentShowName,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      const details = data.details ? ` — ${data.details}` : "";
      throw new Error((data.error || "Erreur de génération d'images") + details);
    }

    const images = [...new Set(data.images || [])];

    // On the very first batch, pre-select up to 5 images so the user doesn't
    // have to click each one manually.
    if (selectedImages.length === 0) {
      selectedImages.push(...images.slice(0, 5));
    }

    imageGrid.innerHTML = "";

    // Keep previously selected images visible so a "Régénérer" click doesn't lose picks.
    selectedImages.forEach((src) => addImageCard(src));
    images.forEach((src) => {
      if (!selectedImages.includes(src)) addImageCard(src);
    });

    updateConfirmLabel();
    if (!timelineStep.hidden) renderTimeline();
    status.textContent = "";
  } catch (err) {
    status.textContent = `Erreur images : ${err.message}`;
  } finally {
    regenerateImagesBtn.disabled = false;
    confirmImagesBtn.disabled = false;
  }
}

function addImageCard(src) {
  const card = document.createElement("div");
  card.className = "image-card" + (selectedImages.includes(src) ? " selected" : "");

  const img = document.createElement("img");
  img.src = src;
  img.alt = "Image proposée";

  const badge = document.createElement("span");
  badge.className = "image-check";
  badge.textContent = "✓";

  card.appendChild(img);
  card.appendChild(badge);

  card.addEventListener("click", () => {
    const i = selectedImages.indexOf(src);
    if (i !== -1) {
      selectedImages.splice(i, 1);
      card.classList.remove("selected");
    } else {
      selectedImages.push(src);
      card.classList.add("selected");
    }
    updateConfirmLabel();
    if (!timelineStep.hidden) renderTimeline();
  });

  imageGrid.appendChild(card);
}

function syncGridSelection() {
  imageGrid.querySelectorAll(".image-card").forEach((card) => {
    const src = card.querySelector("img").src;
    card.classList.toggle("selected", selectedImages.includes(src));
  });
}

let draggedSrc = null;

function renderTimeline() {
  timelineList.innerHTML = "";

  const words = (currentVoiceScript || "").trim().split(/\s+/).filter(Boolean);
  const totalSeconds = currentVoiceScript ? estimateDuration(currentVoiceScript) : 0;
  const perImageSeconds = selectedImages.length > 0 ? totalSeconds / selectedImages.length : 0;

  selectedImages.forEach((src, index) => {
    const row = document.createElement("div");
    row.className = "timeline-row" + (src === draggedSrc ? " dragging" : "");
    row.dataset.src = src;

    const handle = document.createElement("div");
    handle.className = "timeline-handle";
    handle.innerHTML = ICONS.grip;
    handle.title = "Glisser pour réordonner";
    handle.addEventListener("pointerdown", (e) => startDrag(e, src));

    const thumb = document.createElement("img");
    thumb.src = src;
    thumb.className = "timeline-thumb";

    const startS = (index * perImageSeconds).toFixed(1);
    const endS = ((index + 1) * perImageSeconds).toFixed(1);
    const wordsForImage = getWordsForSegment(words, index, selectedImages.length);

    const info = document.createElement("div");
    info.className = "timeline-info";
    info.innerHTML = `<strong>Image ${index + 1}</strong><span>${startS}s – ${endS}s</span><p>${
      wordsForImage || "(pas de texte associé)"
    }</p>`;

    const controls = document.createElement("div");
    controls.className = "timeline-controls";

    const replaceBtn = document.createElement("button");
    replaceBtn.type = "button";
    replaceBtn.className = "timeline-action-btn";
    replaceBtn.innerHTML = ICONS.swap;
    replaceBtn.title = "Remplacer l'image";
    replaceBtn.addEventListener("click", () => replaceImage(index));

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "timeline-action-btn";
    removeBtn.innerHTML = ICONS.trash;
    removeBtn.title = "Retirer l'image";
    removeBtn.addEventListener("click", () => {
      selectedImages.splice(index, 1);
      renderTimeline();
      syncGridSelection();
      updateConfirmLabel();
    });

    controls.append(replaceBtn, removeBtn);
    row.append(handle, thumb, info, controls);
    timelineList.appendChild(row);
  });
}

function moveImage(from, to) {
  const [item] = selectedImages.splice(from, 1);
  selectedImages.splice(to, 0, item);
  renderTimeline();
}

// Pointer Events unify mouse (desktop drag) and touch (mobile press-and-drag
// from the handle) into a single implementation.
function startDrag(e, src) {
  e.preventDefault();
  draggedSrc = src;
  renderTimeline();

  const onPointerMove = (moveEvent) => {
    const el = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
    const targetRow = el?.closest(".timeline-row");
    if (!targetRow) return;

    const targetSrc = targetRow.dataset.src;
    if (!targetSrc || targetSrc === draggedSrc) return;

    const from = selectedImages.indexOf(draggedSrc);
    const to = selectedImages.indexOf(targetSrc);
    if (from !== -1 && to !== -1 && from !== to) {
      moveImage(from, to);
    }
  };

  const onPointerUp = () => {
    draggedSrc = null;
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    document.removeEventListener("pointercancel", onPointerUp);
    renderTimeline();
  };

  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", onPointerUp);
  document.addEventListener("pointercancel", onPointerUp);
}

function replaceImage(index) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file) return;
    selectedImages[index] = URL.createObjectURL(file);
    renderTimeline();
    syncGridSelection();
  });
  input.click();
}

function getWordsForSegment(words, index, totalImages) {
  if (words.length === 0 || totalImages === 0) return "";
  const perImage = words.length / totalImages;
  const start = Math.round(index * perImage);
  const end = Math.round((index + 1) * perImage);
  return words.slice(start, end).join(" ");
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

async function generateMontage() {
  debugLog.textContent = "";
  log("Clic sur Générer le montage");

  if (selectedImages.length === 0 || !audioPlayer.src) {
    status.textContent = "Il faut au moins une image et un audio généré avant le montage.";
    log("Bloqué : pas d'image sélectionnée ou pas d'audio généré");
    return;
  }

  montageBtn.disabled = true;
  status.textContent = "Chargement des images...";
  log("Chargement des images sélectionnées...");

  try {
    const imageUrls = [...selectedImages];
    const images = await Promise.all(imageUrls.map(loadImage));
    log(`${images.length} image(s) chargée(s)`);

    await document.fonts.load('700 90px "Obelix Pro"');
    log("Police Obelix Pro chargée");

    status.textContent = "Chargement de l'audio...";
    const audioBlob = await fetch(audioPlayer.src).then((r) => r.blob());
    log(`Audio récupéré (${audioBlob.size} octets)`);
    const audioBuffer = await new AudioContext().decodeAudioData(await audioBlob.arrayBuffer());
    log(`Audio décodé (${audioBuffer.duration.toFixed(1)}s)`);

    const finalBlob = await renderMontageWithFFmpeg(
      images,
      audioBuffer,
      audioBlob,
      currentVoiceScript,
      (msg) => {
        status.textContent = msg;
        log(msg);
      }
    );
    log(`Vidéo assemblée (${finalBlob.size} octets)`);

    montagePreview.src = URL.createObjectURL(finalBlob);
    montageDownload.href = URL.createObjectURL(finalBlob);
    montageDownload.download = "autoshort.mp4";
    montageResult.hidden = false;
    montageResult.scrollIntoView({ behavior: "smooth", block: "nearest" });

    status.textContent = "Génération de la fiche technique...";
    await generateMetadata();
    log("Terminé");
    status.textContent = "";
  } catch (err) {
    const message = err?.message || err || "erreur inconnue";
    status.textContent = `Erreur montage : ${message}`;
    log(`ERREUR : ${message}`);
    if (err?.stack) log(err.stack);
  } finally {
    montageBtn.disabled = false;
  }
}

async function generateMetadata() {
  try {
    const res = await fetch(`${WORKER_URL}/generate-metadata`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: currentVoiceScript }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Erreur fiche technique");
    }

    titlesList.innerHTML = "";
    (data.titles || []).forEach((title) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "title-item";
      item.textContent = title;
      item.addEventListener("click", () => copyToClipboard(title, item, title));
      titlesList.appendChild(item);
    });

    descriptionOutput.value = data.description || "";
    tagsOutput.value = data.tags || "";
    metadataStep.hidden = false;
  } catch (err) {
    status.textContent = `Erreur fiche technique : ${err.message}`;
  }
}

let ffmpegInstance = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.src = src;
    el.onload = resolve;
    el.onerror = () => reject(new Error(`Impossible de charger ${src}`));
    document.head.appendChild(el);
  });
}

// Loaded as classic UMD <script> tags (not ESM dynamic import) for maximum
// mobile browser compatibility.
async function getFFmpeg() {
  if (ffmpegInstance) {
    log("FFmpeg déjà chargé, réutilisation");
    return ffmpegInstance;
  }

  if (!window.FFmpegWASM) {
    log("Téléchargement de @ffmpeg/ffmpeg (UMD)...");
    await loadScript("https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js");
    log("@ffmpeg/ffmpeg chargé");
  }
  if (!window.FFmpegUtil) {
    log("Téléchargement de @ffmpeg/util (UMD)...");
    await loadScript("https://unpkg.com/@ffmpeg/util@0.12.1/dist/umd/index.js");
    log("@ffmpeg/util chargé");
  }

  const { FFmpeg } = window.FFmpegWASM;
  const { toBlobURL } = window.FFmpegUtil;

  const ffmpeg = new FFmpeg();
  ffmpeg.on("log", ({ message }) => log(`ffmpeg: ${message}`));

  log("Téléchargement du coeur ffmpeg (wasm, ~30 Mo)...");
  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });
  log("Coeur ffmpeg chargé");

  ffmpegInstance = ffmpeg;
  return ffmpeg;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Impossible de charger une image (${src})`));
    img.src = src;
  });
}

const MONTAGE_FPS = 12; // kept low deliberately: mobile Safari/Chrome can silently
// crash/reload the tab (no catchable JS error) if memory use from hundreds of
// frames + the ~30MB ffmpeg.wasm core gets too high.

// Real-time recording via canvas.captureStream() + MediaRecorder is
// notoriously unreliable on mobile browsers (silently produces empty/broken
// video tracks on iOS Safari and some Android Chrome versions), even though
// it works fine on desktop. Rendering each frame to an image and assembling
// them with ffmpeg.wasm is slower but works identically everywhere.
async function renderMontageWithFFmpeg(images, audioBuffer, audioBlob, subtitleText, onProgress) {
  const ctx = montageCanvas.getContext("2d");
  const canvasW = montageCanvas.width;
  const canvasH = montageCanvas.height;

  const durationMs = audioBuffer.duration * 1000;
  const perImageMs = durationMs / images.length;
  const subtitleWords = (subtitleText || "").trim().split(/\s+/).filter(Boolean);
  const bgCache = { img: null, canvas: null };
  const totalFrames = Math.max(1, Math.ceil((durationMs / 1000) * MONTAGE_FPS));

  onProgress("Chargement de FFmpeg...");
  const ffmpeg = await getFFmpeg();

  for (let frame = 0; frame < totalFrames; frame++) {
    const elapsed = (frame / MONTAGE_FPS) * 1000;
    const index = Math.min(images.length - 1, Math.floor(elapsed / perImageMs));
    const segmentElapsed = elapsed - index * perImageMs;
    const progress = Math.min(1, segmentElapsed / perImageMs);
    const zoomIn = index % 2 !== 0; // first image always starts on a zoom-out

    drawKenBurnsFrame(ctx, images[index], canvasW, canvasH, progress, zoomIn, bgCache);
    drawSubtitle(ctx, subtitleWords, canvasW, canvasH, elapsed, durationMs);

    const frameBlob = await new Promise((resolve) => montageCanvas.toBlob(resolve, "image/jpeg", 0.8));
    const frameData = new Uint8Array(await frameBlob.arrayBuffer());
    await ffmpeg.writeFile(`frame${String(frame).padStart(5, "0")}.jpg`, frameData);

    if (frame % 5 === 0) {
      onProgress(`Rendu des images... ${Math.round(((frame + 1) / totalFrames) * 100)}%`);
    }
  }

  onProgress("Assemblage de la vidéo...");
  const audioData = new Uint8Array(await audioBlob.arrayBuffer());
  await ffmpeg.writeFile("audio.mp3", audioData);
  log("Audio écrit dans ffmpeg, lancement de l'encodage...");

  await ffmpeg.exec([
    "-framerate", String(MONTAGE_FPS),
    "-i", "frame%05d.jpg",
    "-i", "audio.mp3",
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-shortest",
    "-movflags", "+faststart",
    "output.mp4",
  ]);
  log("Encodage terminé, lecture du fichier de sortie...");

  const data = await ffmpeg.readFile("output.mp4");
  return new Blob([data.buffer], { type: "video/mp4" });
}

const KEN_BURNS_ZOOM_RANGE = 0.15; // 15% zoom amplitude

const KEN_BURNS_SPEED = 0.5; // halved speed: zoom only covers half its range per image

function drawKenBurnsFrame(ctx, img, canvasW, canvasH, progress, zoomIn, bgCache) {
  const eased = progress * KEN_BURNS_SPEED;
  const zoomScale = zoomIn
    ? 1 + KEN_BURNS_ZOOM_RANGE * eased
    : 1 + KEN_BURNS_ZOOM_RANGE * (1 - eased);

  // Blurred, darkened "cover" background fills the whole frame so the sharp
  // image on top never needs to be cropped or upscaled into blurriness.
  // The blur itself is expensive, so it's pre-rendered once per image and
  // cached instead of re-applying the filter on every animation frame
  // (which was causing real-time recording to stutter/freeze).
  const blurredBg = getBlurredBackground(img, canvasW, canvasH, bgCache);
  const bw = canvasW * zoomScale;
  const bh = canvasH * zoomScale;
  ctx.drawImage(blurredBg, (canvasW - bw) / 2, (canvasH - bh) / 2, bw, bh);

  drawScaledImage(ctx, img, canvasW, canvasH, zoomScale, "contain");
}

function getBlurredBackground(img, canvasW, canvasH, cache) {
  if (cache.img === img) return cache.canvas;

  const off = document.createElement("canvas");
  off.width = canvasW;
  off.height = canvasH;
  const offCtx = off.getContext("2d");
  offCtx.filter = "blur(40px) brightness(0.6)";

  // Slightly overscale so the blur's edge falloff never reveals a gap,
  // and so it still covers the frame at the largest Ken Burns zoom level.
  const scale = Math.max(canvasW / img.width, canvasH / img.height) * (1 + KEN_BURNS_ZOOM_RANGE);
  const w = img.width * scale;
  const h = img.height * scale;
  offCtx.drawImage(img, (canvasW - w) / 2, (canvasH - h) / 2, w, h);

  cache.img = img;
  cache.canvas = off;
  return off;
}

function drawScaledImage(ctx, img, canvasW, canvasH, zoomScale, mode) {
  const baseScale =
    mode === "cover"
      ? Math.max(canvasW / img.width, canvasH / img.height)
      : Math.min(canvasW / img.width, canvasH / img.height);
  const scale = baseScale * zoomScale;
  const w = img.width * scale;
  const h = img.height * scale;
  const x = (canvasW - w) / 2;
  const y = (canvasH - h) / 2;
  ctx.drawImage(img, x, y, w, h);
}

const SUBTITLE_BOUNCE_MS = 220;

function drawSubtitle(ctx, words, canvasW, canvasH, elapsedMs, totalMs) {
  if (!words || words.length === 0) return;

  const wordDurationMs = totalMs / words.length;
  const currentIndex = Math.min(words.length - 1, Math.floor(elapsedMs / wordDurationMs));
  const word = words[currentIndex].toUpperCase();

  const wordAppearedAt = currentIndex * wordDurationMs;
  const bounceProgress = Math.min(1, (elapsedMs - wordAppearedAt) / SUBTITLE_BOUNCE_MS);
  const scale = bounceEaseOut(bounceProgress);

  const fontSize = 30; // scaled down to match the 540x960 render canvas
  ctx.font = `700 ${fontSize}px "Obelix Pro", "Arial Black", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const x = canvasW / 2;
  const y = canvasH * 0.72;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 6;

  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  ctx.lineWidth = fontSize * 0.16 + 1;
  ctx.strokeStyle = "#000000";
  ctx.strokeText(word, 0, 0);

  ctx.shadowColor = "transparent";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(word, 0, 0);

  ctx.restore();
}

function bounceEaseOut(t) {
  const c1 = 1.70158 * 1.5;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
