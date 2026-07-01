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
  currentCharacters = [];
  currentRealEntities = [];
  selectedImages = [];
  imageGrid.innerHTML = "";
  timelineStep.hidden = true;
  timelineList.innerHTML = "";
  montageBtn.hidden = true;
  montageResult.hidden = true;
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
  selectedImages = [];
  imageGrid.innerHTML = "";
  timelineStep.hidden = true;
  timelineList.innerHTML = "";

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

function renderTimeline() {
  timelineList.innerHTML = "";

  const words = (currentVoiceScript || "").trim().split(/\s+/).filter(Boolean);
  const totalSeconds = currentVoiceScript ? estimateDuration(currentVoiceScript) : 0;
  const perImageSeconds = selectedImages.length > 0 ? totalSeconds / selectedImages.length : 0;

  selectedImages.forEach((src, index) => {
    const row = document.createElement("div");
    row.className = "timeline-row";

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

    const upBtn = document.createElement("button");
    upBtn.type = "button";
    upBtn.textContent = "↑";
    upBtn.disabled = index === 0;
    upBtn.addEventListener("click", () => moveImage(index, index - 1));

    const downBtn = document.createElement("button");
    downBtn.type = "button";
    downBtn.textContent = "↓";
    downBtn.disabled = index === selectedImages.length - 1;
    downBtn.addEventListener("click", () => moveImage(index, index + 1));

    const replaceBtn = document.createElement("button");
    replaceBtn.type = "button";
    replaceBtn.textContent = "🔄";
    replaceBtn.addEventListener("click", () => replaceImage(index));

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "✕";
    removeBtn.addEventListener("click", () => {
      selectedImages.splice(index, 1);
      renderTimeline();
      syncGridSelection();
    });

    controls.append(upBtn, downBtn, replaceBtn, removeBtn);
    row.append(thumb, info, controls);
    timelineList.appendChild(row);
  });
}

function moveImage(from, to) {
  const [item] = selectedImages.splice(from, 1);
  selectedImages.splice(to, 0, item);
  renderTimeline();
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
  if (selectedImages.length === 0 || !audioPlayer.src) {
    status.textContent = "Il faut au moins une image et un audio généré avant le montage.";
    return;
  }

  montageBtn.disabled = true;
  status.textContent = "Chargement des images...";

  try {
    const imageUrls = [...selectedImages];
    const images = await Promise.all(imageUrls.map(loadImage));

    await document.fonts.load('700 90px "Obelix Pro"');

    status.textContent = "Chargement de l'audio...";
    const audioBuffer = await fetch(audioPlayer.src)
      .then((r) => r.arrayBuffer())
      .then((buf) => new AudioContext().decodeAudioData(buf));

    status.textContent = "Enregistrement du montage...";
    const blob = await renderMontage(images, audioBuffer, currentVoiceScript);

    montagePreview.src = URL.createObjectURL(blob);
    montageDownload.href = URL.createObjectURL(blob);
    montageResult.hidden = false;
    montageResult.scrollIntoView({ behavior: "smooth", block: "nearest" });
    status.textContent = "";
  } catch (err) {
    status.textContent = `Erreur montage : ${err.message}`;
  } finally {
    montageBtn.disabled = false;
  }
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

function renderMontage(images, audioBuffer, subtitleText) {
  return new Promise((resolve, reject) => {
    const ctx = montageCanvas.getContext("2d");
    const audioCtx = new AudioContext();
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    const dest = audioCtx.createMediaStreamDestination();
    source.connect(dest);
    source.connect(audioCtx.destination);

    const videoStream = montageCanvas.captureStream(30);
    const combinedStream = new MediaStream([
      ...videoStream.getVideoTracks(),
      ...dest.stream.getAudioTracks(),
    ]);

    const mimeType = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find(
      (t) => MediaRecorder.isTypeSupported(t)
    );
    const recorder = new MediaRecorder(combinedStream, mimeType ? { mimeType } : undefined);
    const chunks = [];
    recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
    recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
    recorder.onerror = (e) => reject(e.error || new Error("Erreur d'enregistrement"));

    const durationMs = audioBuffer.duration * 1000;
    const perImageMs = durationMs / images.length;
    const subtitleWords = (subtitleText || "").trim().split(/\s+/).filter(Boolean);
    const startTime = performance.now();
    const bgCache = { img: null, canvas: null };
    let rafId;

    function draw() {
      const elapsed = performance.now() - startTime;
      if (elapsed >= durationMs) {
        cancelAnimationFrame(rafId);
        recorder.stop();
        return;
      }

      const index = Math.min(images.length - 1, Math.floor(elapsed / perImageMs));
      const segmentElapsed = elapsed - index * perImageMs;
      const progress = Math.min(1, segmentElapsed / perImageMs);
      const zoomIn = index % 2 !== 0; // first image always starts on a zoom-out

      drawKenBurnsFrame(ctx, images[index], montageCanvas.width, montageCanvas.height, progress, zoomIn, bgCache);
      drawSubtitle(ctx, subtitleWords, montageCanvas.width, montageCanvas.height, elapsed, durationMs);

      rafId = requestAnimationFrame(draw);
    }

    recorder.start();
    source.start();
    draw();
  });
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

  const fontSize = 60;
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
