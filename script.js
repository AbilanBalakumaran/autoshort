const WORKER_URL = "https://autoshort-2ym.pages.dev";
const TEMPLATE_STORAGE_KEY = "autoshort-template";
const DURATION_STORAGE_KEY = "autoshort-duration";
const VOICE_STORAGE_KEY = "autoshort-voice";

// Publishing (Buffer) — declared up here with the other config because the
// init* calls near the top of this file run before the publishing section.
const BUFFER_KEY_STORAGE_KEY = "sukishort-buffer-key";
const PUBLISH_TIME_STORAGE_KEY = "sukishort-publish-time";
const PUBLISH_NOW_STORAGE_KEY = "sukishort-publish-now";
const BOOKED_DAYS_STORAGE_KEY = "sukishort-booked-days";
const DEFAULT_PUBLISH_TIME = "06:40";

const PLATFORMS = {
  tiktok: { label: "TikTok", service: "tiktok", maxCaption: 2200 },
  instagram: { label: "Instagram", service: "instagram", maxCaption: 2200 },
  youtube: { label: "YouTube", service: "youtube", maxCaption: 5000 },
};
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
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>',
  grip:
    '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>',
  chevronRight:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
  copy:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  swap:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 2 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
  plus:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
  back:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
  link:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
  trashSmall:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  home:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9 12 2l9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M9 22V12h6v10"/></svg>',
  compass:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
  clock:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  gear:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
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
const imageStep = document.getElementById("image-step");
const imageGrid = document.getElementById("image-grid");
const uploadInput = document.getElementById("upload-input");
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
const thumbnailPreview = document.getElementById("thumbnail-preview");
const thumbnailDownload = document.getElementById("thumbnail-download");
const thumbnailTiktokPreview = document.getElementById("thumbnail-tiktok-preview");
const thumbnailTiktokDownload = document.getElementById("thumbnail-tiktok-download");
const publishPanel = document.getElementById("publish-panel");
const historyPublishPanel = document.getElementById("history-publish-panel");
const bufferKeyInput = document.getElementById("buffer-key-input");
const saveBufferKeyBtn = document.getElementById("save-buffer-key-btn");
const testBufferBtn = document.getElementById("test-buffer-btn");
const bufferStatus = document.getElementById("buffer-status");
const publishTimeInput = document.getElementById("publish-time-input");
const publishNowDefault = document.getElementById("publish-now-default");
const debugLog = document.getElementById("debug-log");

const suggestionsStatus = document.getElementById("suggestions-status");
const suggestionsList = document.getElementById("suggestions-list");
const refreshSuggestionsBtn = document.getElementById("refresh-suggestions-btn");
const articleDetail = document.getElementById("article-detail");
const articleBackBtn = document.getElementById("article-back-btn");
const articleTitleEl = document.getElementById("article-title");
const articleImageEl = document.getElementById("article-image");
const articleContentEl = document.getElementById("article-content");
const articleSourceLink = document.getElementById("article-source-link");
const articleGenerateBtn = document.getElementById("article-generate-btn");

const historyStatus = document.getElementById("history-status");
const historyList = document.getElementById("history-list");
const historyDetail = document.getElementById("history-detail");
const historyBackBtn = document.getElementById("history-back-btn");
const historyDetailVideo = document.getElementById("history-detail-video");
const historyDetailDownload = document.getElementById("history-detail-download");
const historyDetailTitles = document.getElementById("history-detail-titles");
const historyDetailDescription = document.getElementById("history-detail-description");
const historyDetailTags = document.getElementById("history-detail-tags");
const historyDetailThumbnail = document.getElementById("history-detail-thumbnail");
const historyDetailThumbnailDownload = document.getElementById("history-detail-thumbnail-download");
const historyDetailThumbnailTiktok = document.getElementById("history-detail-thumbnail-tiktok");
const historyDetailThumbnailTiktokDownload = document.getElementById("history-detail-thumbnail-tiktok-download");

function log(msg) {
  debugLog.hidden = false;
  const time = new Date().toLocaleTimeString();
  debugLog.textContent += `[${time}] ${msg}\n`;
  debugLog.scrollTop = debugLog.scrollHeight;
}

window.addEventListener("error", (e) => log(`Erreur JS globale : ${e.message}`));
window.addEventListener("unhandledrejection", (e) => log(`Promesse rejetée : ${e.reason?.message || e.reason}`));

const notificationsBtn = document.getElementById("notifications-btn");
const notificationsStatus = document.getElementById("notifications-status");
const VAPID_PUBLIC_KEY = "BG3prAIiESQXs6H2h7Frwj2fkTzYXbjVkRbKBib0-rfmiFyWxNvAGAbiw-tUuNK1sTE1Vu_LTOGQxOTyp-hD6Wg";

const templateInput = document.getElementById("template-input");
const durationInput = document.getElementById("duration-input");
const voiceList = document.getElementById("voice-list");
const voicePreview = document.getElementById("voice-preview");
const saveTemplateBtn = document.getElementById("save-template-btn");
const resetTemplateBtn = document.getElementById("reset-template-btn");
const settingsStatus = document.getElementById("settings-status");

const PREVIEW_TEXT = "Hey! This is a quick preview of this narrator voice for Sukishort.";
let selectedVoiceId = "";

let currentVoiceScript = "";
let currentVisualStyle = "";
let currentShowName = "";
let currentCharacters = [];
let currentRealEntities = [];
// Set right before a suggestion-triggered generation so generateImages()
// always has at least this one guaranteed-relevant image to fall back on,
// even if the image search API comes back empty. Cleared as soon as the
// user manually edits the prompt, so it never leaks into an unrelated video.
let currentSuggestionImage = "";

// Every unique image offered so far for the current video — "Régénérer"
// APPENDS to this pool instead of replacing the grid, guaranteeing at
// least MIN_NEW_PER_REGEN fresh images per click (as long as the sources
// have any left). Fetches that return more than the per-click display cap
// park the overflow in imageReserve, which later regenerations drain
// before hitting the network again — so a popular show's huge first batch
// feeds several instant regenerations instead of being thrown away.
let imagePool = [];
let imageReserve = [];
let imageSearchPage = 1;
const IMAGE_POOL_CAP = 150;
const MIN_NEW_PER_REGEN = 10;
const MAX_ADD_FIRST = 40;
const MAX_ADD_REGEN = 30;
let currentWordTimings = null; // real per-word start times (seconds) from ElevenLabs, when available
let selectedImages = []; // ordered array of image URLs, order = order in the video
let defaultTemplate = "";

initButtons();
initTabs();
initSettings();
initPublishSettings();
initSuggestions();
initHistory();
initLogo();
initServiceWorker();
initNotifications();

function initLogo() {
  document.getElementById("app-logo").addEventListener("click", () => {
    document.querySelector('.tab-btn[data-tab="generate"]').click();
  });
}

function initServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("sw.js");
      // Browsers can keep serving a cached copy of sw.js for up to 24h, so
      // an update wouldn't be picked up until then otherwise. Forcing a
      // check on every launch means a new version is detected right away.
      registration.update();

      // sw.js already calls skipWaiting()/clients.claim(), so as soon as a
      // new worker takes over, reload once to actually load the new files —
      // otherwise the page keeps running the old JS/CSS until the user
      // manually refreshes or relaunches.
      let reloaded = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (reloaded) return;
        reloaded = true;
        location.reload();
      });
    } catch (err) {
      log(`Service worker non enregistré : ${err.message}`);
    }
  });
}

function urlBase64ToUint8Array(base64) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function initNotifications() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    notificationsBtn.hidden = true;
    notificationsStatus.textContent = "Les notifications ne sont pas supportées sur ce navigateur.";
    return;
  }

  notificationsBtn.addEventListener("click", async () => {
    notificationsBtn.disabled = true;
    try {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();

      if (existing) {
        await fetch(`${WORKER_URL}/unsubscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: existing.endpoint }),
        });
        await existing.unsubscribe();
        updateNotificationsUi(false);
        notificationsStatus.textContent = "Notifications désactivées.";
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        notificationsStatus.textContent = "Permission refusée — active les notifications dans les réglages du navigateur pour continuer.";
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      await fetch(`${WORKER_URL}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription }),
      });

      updateNotificationsUi(true);
      notificationsStatus.textContent = "Notifications activées !";
    } catch (err) {
      notificationsStatus.textContent = `Erreur notifications : ${err.message}`;
    } finally {
      notificationsBtn.disabled = false;
    }
  });

  try {
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    updateNotificationsUi(!!existing);
  } catch {
    updateNotificationsUi(false);
  }
}

function updateNotificationsUi(subscribed) {
  notificationsBtn.innerHTML = subscribed
    ? iconLabel("trashSmall", "Désactiver les notifications")
    : iconLabel("speaker", "Activer les notifications");
}

function initButtons() {
  generateAudioBtn.innerHTML = iconLabel("speaker", "Générer l'audio et continuer");
  regenerateImagesBtn.innerHTML = iconLabel("refresh", "Régénérer");
  montageBtn.innerHTML = iconLabel("film", "Générer le montage");
  montageDownload.innerHTML = iconLabel("download", "Télécharger la vidéo");
  historyDetailDownload.innerHTML = iconLabel("download", "Télécharger la vidéo");
  thumbnailDownload.innerHTML = iconLabel("download", "Télécharger la miniature");
  historyDetailThumbnailDownload.innerHTML = iconLabel("download", "Télécharger la miniature");
  articleBackBtn.innerHTML = `<span class="icon">${ICONS.back}</span><span>Retour</span>`;
  articleGenerateBtn.innerHTML = iconLabel("film", "Générer en short");
  historyBackBtn.innerHTML = `<span class="icon">${ICONS.back}</span><span>Retour</span>`;
  refreshSuggestionsBtn.innerHTML = iconLabel("refresh", "Actualiser les actus");
  setNavIcon("generate", "home");
  setNavIcon("suggestions", "compass");
  setNavIcon("history", "clock");
  setNavIcon("settings", "gear");
  updateConfirmLabel();
}

function setNavIcon(tab, iconName) {
  document.querySelector(`.bottom-nav .tab-btn[data-tab="${tab}"] .icon`).innerHTML = ICONS[iconName];
}

function updateConfirmLabel() {
  confirmImagesBtn.textContent = `Valider la sélection (${selectedImages.length})`;
}

function initTabs() {
  const tabButtons = document.querySelectorAll(".tab-btn");
  const mainEl = document.querySelector("main");
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      // Tapping the tab you're already on acts as "back", the way every
      // native mobile app behaves: it closes whatever detail view is open
      // and returns the tab to its list.
      if (btn.classList.contains("active")) {
        popTabDetail(btn.dataset.tab);
        return;
      }

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

// Re-tapping the active tab backs out of its open detail view; if nothing is
// open, scroll to the top instead (also standard mobile behaviour).
function popTabDetail(tab) {
  const backBtn =
    tab === "suggestions"
      ? (!articleDetail.hidden && articleBackBtn)
      : tab === "history"
        ? (!historyDetail.hidden && historyBackBtn)
        : null;

  if (backBtn) {
    backBtn.click();
    return;
  }
  document.querySelector("main").scrollTo({ top: 0, behavior: "smooth" });
  window.scrollTo({ top: 0, behavior: "smooth" });
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
    toggleVoicePreview(voice.voice_id, previewBtn);
  });

  card.appendChild(info);
  card.appendChild(previewBtn);

  card.addEventListener("click", () => {
    selectedVoiceId = voice.voice_id;
    document.querySelectorAll(".voice-card").forEach((c) => c.classList.remove("selected"));
    card.classList.add("selected");
    // Persist immediately — voice choice must not depend on also clicking
    // "Enregistrer" (which is for the template), or the selection silently
    // has no effect on the next generation.
    if (selectedVoiceId) {
      localStorage.setItem(VOICE_STORAGE_KEY, selectedVoiceId);
    } else {
      localStorage.removeItem(VOICE_STORAGE_KEY);
    }
  });

  voiceList.appendChild(card);
}

function base64ToBlob(base64, mimeType) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

let currentPreviewBtn = null;
const voicePreviewCache = new Map(); // voiceId -> object URL, avoids re-fetching (and re-spending quota) on repeat plays

voicePreview.addEventListener("ended", () => {
  if (currentPreviewBtn) currentPreviewBtn.innerHTML = ICONS.play;
  currentPreviewBtn = null;
});

async function toggleVoicePreview(voiceId, btn) {
  const cacheKey = voiceId || "default";

  // Same button clicked again while its preview is the active one — just
  // toggle play/pause instead of restarting or re-fetching.
  if (currentPreviewBtn === btn) {
    if (voicePreview.paused) {
      await voicePreview.play();
      btn.innerHTML = ICONS.pause;
    } else {
      voicePreview.pause();
      btn.innerHTML = ICONS.play;
    }
    return;
  }

  // Switching to a different voice — only one preview plays at a time.
  if (currentPreviewBtn) {
    voicePreview.pause();
    currentPreviewBtn.innerHTML = ICONS.play;
  }
  currentPreviewBtn = btn;

  btn.disabled = true;
  try {
    let url = voicePreviewCache.get(cacheKey);
    if (!url) {
      const res = await fetch(`${WORKER_URL}/generate-audio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: PREVIEW_TEXT, voiceId: voiceId || undefined }),
      });
      if (!res.ok) throw new Error("preview failed");
      const data = await res.json();
      const blob = base64ToBlob(data.audioBase64, data.source === "elevenlabs" ? "audio/wav" : "audio/mpeg");
      url = URL.createObjectURL(blob);
      voicePreviewCache.set(cacheKey, url);
    }
    voicePreview.src = url;
    voicePreview.hidden = false;
    await voicePreview.play();
    btn.innerHTML = ICONS.pause;
  } catch {
    speakWithBrowser(PREVIEW_TEXT);
    btn.innerHTML = ICONS.play;
    currentPreviewBtn = null;
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

promptInput.addEventListener("input", () => {
  currentSuggestionImage = "";
});

clearBtn.addEventListener("click", () => {
  promptInput.value = "";
  currentSuggestionImage = "";
  resultSection.hidden = true;
  audioWrapper.hidden = true;
  audioPlayer.removeAttribute("src");
  imageStep.hidden = true;
  status.textContent = "";
  durationEstimate.textContent = "";
  currentVoiceScript = "";
  currentVisualStyle = "";
  currentShowName = "";
  currentCharacters = [];
  currentRealEntities = [];
  currentWordTimings = null;
  selectedImages = [];
  imagePool = [];
  imageReserve = [];
  imageSearchPage = 1;
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
  imageStep.hidden = true;
  montageBtn.hidden = true;
  montageResult.hidden = true;
  metadataStep.hidden = true;
  selectedImages = [];
  imagePool = [];
  imageReserve = [];
  imageSearchPage = 1;
  currentWordTimings = null;
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

    const audioData = await audioRes.json();

    if (!audioRes.ok) {
      throw new Error(audioData.details || audioData.error || `ElevenLabs indisponible (HTTP ${audioRes.status})`);
    }

    // ElevenLabs now returns WAV (see generate-audio.js) so decodeAudioData
    // later on doesn't run into MP3 encoder-delay drift; the Workers AI
    // fallback still encodes MP3, which is fine since it has no real
    // per-word timings to keep in sync anyway.
    const audioBlob = base64ToBlob(audioData.audioBase64, audioData.source === "elevenlabs" ? "audio/wav" : "audio/mpeg");
    audioPlayer.src = URL.createObjectURL(audioBlob);
    audioWrapper.hidden = false;
    currentWordTimings = audioData.wordTimings || null;
    status.textContent =
      audioData.source === "workers-ai"
        ? "ElevenLabs indisponible (quota) — voix de secours Cloudflare utilisée."
        : "";

    goToImageStep();
  } catch (err) {
    status.textContent = `Audio indisponible (${err.message}). La voix du navigateur va la lire à titre d'aperçu, réessaie avant de continuer.`;
    speakWithBrowser(currentVoiceScript);
  } finally {
    generateAudioBtn.disabled = false;
  }
});

function goToImageStep() {
  imageStep.hidden = false;
  document.querySelector("main").classList.add("wide");
  imageStep.scrollIntoView({ behavior: "smooth", block: "nearest" });
  if (imageGrid.children.length === 0) {
    generateImages();
  }
}

regenerateImagesBtn.addEventListener("click", () => {
  imageSearchPage += 1;
  generateImages();
});

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

descriptionOutput.addEventListener("click", () => copyFromTextarea(descriptionOutput));
tagsOutput.addEventListener("click", () => copyFromTextarea(tagsOutput));

// The copy buttons are gone — clicking the text zone itself copies, with a
// brief "Copié !" badge overlaid on the zone as feedback.
async function copyFromTextarea(textarea) {
  try {
    await navigator.clipboard.writeText(textarea.value);
    const row = textarea.closest(".copy-row");
    if (row) {
      row.classList.add("copied");
      setTimeout(() => row.classList.remove("copied"), 1500);
    }
  } catch {
    status.textContent = "Impossible de copier automatiquement, sélectionne le texte manuellement.";
  }
}

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
  // Only "Valider la sélection" should reveal the montage button — hide it
  // again whenever the user goes back to picking/regenerating images.
  montageBtn.hidden = true;
  timelineStep.hidden = true;
  status.textContent = "Génération des images en cours...";

  const stylePrompt = currentVisualStyle || currentVoiceScript || promptInput.value;
  const searchQuery =
    currentShowName && currentShowName.toLowerCase() !== "anime" ? currentShowName : stylePrompt;
  const isRegen = imagePool.length > 0;

  try {
    const poolSet = new Set(imagePool);
    const addCap = isRegen ? MAX_ADD_REGEN : MAX_ADD_FIRST;
    let added = 0;
    let lastError = null;

    const drainReserve = () => {
      while (imageReserve.length > 0 && added < addCap && imagePool.length < IMAGE_POOL_CAP) {
        const url = imageReserve.shift();
        if (poolSet.has(url)) continue;
        poolSet.add(url);
        imagePool.push(url);
        added++;
      }
    };

    // Leftovers from earlier oversized batches first — instant, and always
    // on-topic since they came from the same searches.
    drainReserve();

    if (added < MIN_NEW_PER_REGEN || !isRegen) {
      // Up to 3 network passes to gather enough fresh images: the requested
      // page, the page after it, then page 1 again (whose backend galleries
      // are shuffled server-side, so a re-fetch still surfaces images the
      // first pass's cap cut off).
      const pagesToTry = isRegen ? [imageSearchPage, imageSearchPage + 1, 1] : [imageSearchPage];
      for (let attempt = 0; attempt < pagesToTry.length; attempt++) {
        const page = pagesToTry[attempt];
        const { images, backendError } = await fetchImageBatch(stylePrompt, searchQuery, page);
        if (backendError) lastError = backendError;
        // Advance the cursor past any extra page this pass consumed, so the
        // next Régénérer starts on genuinely unexplored ground.
        if (attempt === 1) imageSearchPage = page;

        for (const url of images) {
          if (poolSet.has(url)) continue;
          if (added < addCap && imagePool.length < IMAGE_POOL_CAP) {
            poolSet.add(url);
            imagePool.push(url);
            added++;
          } else if (!imageReserve.includes(url)) {
            imageReserve.push(url);
          }
        }
        if (added >= MIN_NEW_PER_REGEN || imagePool.length >= IMAGE_POOL_CAP) break;
      }
    }

    // A video generated from a Suggestion article always has the article's
    // own image on hand — guarantee it's offered even if the image search
    // APIs come back empty, so a suggestion-driven generation can never
    // dead-end with zero images.
    if (currentSuggestionImage && !poolSet.has(currentSuggestionImage)) {
      imagePool.unshift(currentSuggestionImage);
    }

    // Only surface a hard failure if it actually left us with nothing —
    // when AniList (or the suggestion image) filled the grid anyway, the
    // backend hiccup is invisible to the user and should stay that way.
    if (imagePool.length === 0 && lastError) throw lastError;

    // On the very first batch, pre-select up to 5 images so the user doesn't
    // have to click each one manually.
    if (selectedImages.length === 0) {
      selectedImages.push(...imagePool.slice(0, 5));
    }

    imageGrid.innerHTML = "";
    addUploadTile();

    // Keep previously selected images visible so a "Régénérer" click doesn't lose picks.
    selectedImages.forEach((src) => addImageCard(src));
    imagePool.forEach((src) => {
      if (!selectedImages.includes(src)) addImageCard(src);
    });

    updateConfirmLabel();
    if (!timelineStep.hidden) renderTimeline();
    if (imagePool.length === 0) {
      status.textContent = 'Aucune image trouvée automatiquement — ajoute les tiennes avec le bouton "+".';
    } else if (isRegen) {
      status.textContent =
        added > 0
          ? `${added} nouvelle(s) image(s) ajoutée(s) — ${imagePool.length} au total.`
          : "Toutes les images disponibles pour cet anime sont déjà affichées.";
    } else {
      status.textContent = "";
    }
  } catch (err) {
    // Even on a hard API failure, don't strand the user with an empty grid:
    // offer the suggestion's own image (if any) plus the upload tile so
    // they can always proceed.
    imageGrid.innerHTML = "";
    addUploadTile();
    if (currentSuggestionImage) {
      if (selectedImages.length === 0) selectedImages.push(currentSuggestionImage);
      addImageCard(currentSuggestionImage);
    }
    updateConfirmLabel();
    status.textContent = currentSuggestionImage
      ? `Recherche d'images indisponible (${err.message}) — l'image de l'actu a été ajoutée, ou uploade les tiennes.`
      : `Erreur images : ${err.message} — uploade tes propres images avec le bouton "+".`;
  } finally {
    regenerateImagesBtn.disabled = false;
    confirmImagesBtn.disabled = false;
  }
}

// One combined fetch pass: backend (MAL + Kitsu, which AniList-blocked
// Cloudflare can't cover) in parallel with the browser's own AniList
// query. `page` digs deeper into each source's results on regeneration.
async function fetchImageBatch(stylePrompt, searchQuery, page) {
  const aniListPromise = fetchAniListImagesClient(searchQuery, page);

  let backendImages = [];
  let backendError = null;
  try {
    const res = await fetch(`${WORKER_URL}/generate-images`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: stylePrompt,
        showName: currentShowName,
        page,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      const details = data.details ? ` — ${data.details}` : "";
      throw new Error((data.error || "Erreur de génération d'images") + details);
    }
    backendImages = data.images || [];
  } catch (err) {
    backendError = err;
  }

  const aniListImages = await aniListPromise;
  return { images: [...new Set([...backendImages, ...aniListImages])], backendError };
}

// Queried straight from the browser because AniList 403s Cloudflare-origin
// requests — the backend can't do this one for us. Top 4 matches so a
// franchise's other seasons contribute art too, plus main-cast portraits,
// per-episode scene stills (Crunchyroll thumbnails) and the best match's
// related entries — the episode stills especially keep the pool rich even
// for lesser-known shows whose poster galleries are nearly empty.
async function fetchAniListImagesClient(query, page = 1) {
  if (!query) return [];
  try {
    // Both anime AND manga in a single GraphQL request: an announced,
    // not-yet-aired adaptation has no anime entry in any database yet, but
    // the source manga's volume covers and character art are already there.
    // $page paginates the character lists, and the episode-still window
    // below slides with it, so each regeneration surfaces a genuinely new
    // batch instead of re-serving the same art.
    const gqlQuery = `
      query ($search: String, $page: Int) {
        anime: Page(perPage: 4) {
          media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
            coverImage { extraLarge large }
            bannerImage
            characters(sort: ROLE, page: $page, perPage: 20) {
              nodes { image { large } }
            }
            streamingEpisodes { thumbnail }
            relations {
              nodes { type coverImage { extraLarge large } bannerImage }
            }
          }
        }
        manga: Page(perPage: 3) {
          media(search: $search, type: MANGA, sort: SEARCH_MATCH) {
            coverImage { extraLarge large }
            bannerImage
            characters(sort: ROLE, page: $page, perPage: 15) {
              nodes { image { large } }
            }
          }
        }
      }
    `;

    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: gqlQuery, variables: { search: query, page } }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const animeList = data.data?.anime?.media || [];
    const mangaList = data.data?.manga?.media || [];

    const animeUrls = animeList.flatMap((media, i) => [
      media.coverImage?.extraLarge || media.coverImage?.large,
      media.bannerImage,
      ...(media.characters?.nodes || []).map((n) => n.image?.large),
      ...(media.streamingEpisodes || []).slice((page - 1) * 12, page * 12).map((ep) => ep.thumbnail),
      // Franchise relations only from the best match — the runner-ups'
      // relations drift too far from the requested show.
      ...(i === 0
        ? (media.relations?.nodes || [])
            .filter((n) => n.type === "ANIME")
            .flatMap((n) => [n.coverImage?.extraLarge || n.coverImage?.large, n.bannerImage])
        : []),
    ]);

    const mangaUrls = mangaList.flatMap((media) => [
      media.coverImage?.extraLarge || media.coverImage?.large,
      media.bannerImage,
      ...(media.characters?.nodes || []).map((n) => n.image?.large),
    ]);

    return [...new Set([...animeUrls, ...mangaUrls].filter(Boolean))];
  } catch {
    return [];
  }
}

function addUploadTile() {
  const tile = document.createElement("div");
  tile.className = "image-card upload-tile";
  tile.innerHTML = `<span class="icon">${ICONS.plus}</span>`;
  tile.title = "Ajouter depuis ma galerie";
  tile.addEventListener("click", () => uploadInput.click());
  imageGrid.appendChild(tile);
}

function addImageCard(src) {
  const card = document.createElement("div");
  card.className = "image-card" + (selectedImages.includes(src) ? " selected" : "");

  const img = document.createElement("img");
  img.src = src;
  img.alt = "Image proposée";
  img.loading = "lazy";
  // Dead/hotlink-blocked URLs remove themselves from the grid and the
  // selection so a broken image can never make it into the montage.
  img.onerror = () => {
    const i = selectedImages.indexOf(src);
    if (i !== -1) {
      selectedImages.splice(i, 1);
      updateConfirmLabel();
      if (!timelineStep.hidden) renderTimeline();
    }
    card.remove();
  };

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

// Pointer Events unify mouse (desktop drag) and touch (mobile press-and-drag
// from the handle) into a single implementation.
function startDrag(e, src) {
  e.preventDefault();
  draggedSrc = src;
  // CRITICAL for touch: never rebuild the timeline DOM mid-gesture. Touch
  // pointers implicitly capture to the element that received pointerdown
  // (the handle) — destroying it via renderTimeline() silently killed the
  // whole drag on iOS, which is why reordering "didn't take" on mobile.
  // Instead, move the live row element and only re-render on release.
  const dragRow = e.target.closest(".timeline-row");
  dragRow?.classList.add("dragging");

  const onPointerMove = (moveEvent) => {
    const el = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
    const targetRow = el?.closest(".timeline-row");
    if (!targetRow || targetRow === dragRow) return;

    const targetSrc = targetRow.dataset.src;
    if (!targetSrc || targetSrc === draggedSrc) return;

    const from = selectedImages.indexOf(draggedSrc);
    const to = selectedImages.indexOf(targetSrc);
    if (from !== -1 && to !== -1 && from !== to) {
      const [item] = selectedImages.splice(from, 1);
      selectedImages.splice(to, 0, item);
      if (dragRow) {
        if (from < to) targetRow.after(dragRow);
        else targetRow.before(dragRow);
      }
    }
  };

  const onPointerUp = () => {
    draggedSrc = null;
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    document.removeEventListener("pointercancel", onPointerUp);
    // Safe to fully re-render now — the gesture is over. This refreshes
    // the per-image time ranges and text segments for the new order.
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
    // A source image can 404 or hotlink-block between selection time and
    // now — skip the broken ones and build the montage with the rest
    // instead of failing the whole generation over one dead URL.
    const settled = await Promise.allSettled(imageUrls.map(loadImage));
    const images = settled.filter((s) => s.status === "fulfilled").map((s) => s.value);
    const failed = settled.length - images.length;
    if (failed > 0) log(`${failed} image(s) ignorée(s) (lien mort ou bloqué)`);
    if (images.length === 0) {
      throw new Error(
        "Aucune des images sélectionnées n'a pu être chargée — remplace-les ou uploade les tiennes."
      );
    }
    log(`${images.length} image(s) chargée(s)`);

    await document.fonts.load('700 90px "Obelix Pro"');
    log("Police Obelix Pro chargée");

    status.textContent = "Chargement de l'audio...";
    const audioBlob = await fetch(audioPlayer.src).then((r) => r.blob());
    log(`Audio récupéré (${audioBlob.size} octets)`);
    const audioBuffer = await new AudioContext().decodeAudioData(await audioBlob.arrayBuffer());
    log(`Audio décodé (${audioBuffer.duration.toFixed(1)}s)`);

    status.textContent = "Enregistrement du montage...";
    log("Enregistrement du montage (canvas + audio)...");
    const recording = await renderMontage(images, audioBuffer, currentVoiceScript, currentWordTimings);
    log(`Vidéo assemblée (${recording.blob.size} octets, ${recording.isMp4 ? "mp4" : "webm"})`);

    montagePreview.src = URL.createObjectURL(recording.blob);
    montageDownload.href = URL.createObjectURL(recording.blob);
    montageDownload.download = recording.isMp4 ? "sukishort.mp4" : "sukishort.webm";
    montageResult.hidden = false;
    montageResult.scrollIntoView({ behavior: "smooth", block: "nearest" });

    status.textContent = "Génération de la fiche technique...";
    const metadata = await generateMetadata();

    const thumbnailTitle = metadata?.titles?.[0] || currentShowName || currentVoiceScript.slice(0, 40);
    const thumbnail = generateThumbnail(images[0], thumbnailTitle, montageCanvas.width, montageCanvas.height);
    // TikTok's cover picker works from a 1080x1350 frame, so ship a second
    // render at that exact size rather than letting the app crop the 9:16 one.
    const thumbnailTikTok = generateThumbnail(
      images[0], thumbnailTitle, TIKTOK_THUMBNAIL_SIZE.width, TIKTOK_THUMBNAIL_SIZE.height
    );

    thumbnailPreview.src = thumbnail;
    thumbnailPreview.hidden = false;
    thumbnailDownload.href = thumbnail;
    thumbnailDownload.hidden = false;
    thumbnailTiktokPreview.src = thumbnailTikTok;
    thumbnailTiktokPreview.hidden = false;
    thumbnailTiktokDownload.href = thumbnailTikTok;
    thumbnailTiktokDownload.hidden = false;

    const historyId = await saveToHistory({
      voiceScript: currentVoiceScript,
      videoBlob: recording.blob,
      videoExt: recording.isMp4 ? "mp4" : "webm",
      thumbnail,
      thumbnailTikTok,
      title: metadata?.titles?.[0] || currentVoiceScript.slice(0, 60),
      titles: metadata?.titles || [],
      description: metadata?.description || "",
      tags: metadata?.tags || "",
    });

    // Feed the publishing panel (platform tabs + Buffer scheduling) with
    // everything it needs, so the user never has to download and re-upload.
    openPublishPanel({
      id: historyId,
      videoBlob: recording.blob,
      videoExt: recording.isMp4 ? "mp4" : "webm",
      thumbnail,
      thumbnailTikTok,
      titles: metadata?.titles || [],
      description: metadata?.description || "",
      tags: metadata?.tags || "",
    }, publishPanel);

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
    return data;
  } catch (err) {
    status.textContent = `Erreur fiche technique : ${err.message}`;
    return null;
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Plenty of source CDNs display fine in the grid but refuse the
      // crossOrigin load the canvas needs — retry through our proxy,
      // which serves the same bytes with permissive CORS. Without this,
      // those images were silently dropped from the montage.
      if (src.startsWith("data:") || src.startsWith("blob:")) {
        reject(new Error(`Impossible de charger une image (${src.slice(0, 80)})`));
        return;
      }
      const retry = new Image();
      retry.crossOrigin = "anonymous";
      retry.onload = () => resolve(retry);
      retry.onerror = () => reject(new Error(`Impossible de charger une image (${src})`));
      retry.src = `${WORKER_URL}/image-proxy?url=${encodeURIComponent(src)}`;
    };
    img.src = src;
  });
}

const MONTAGE_FPS = 30;

// wordTimings.words/startTimes come from the same ElevenLabs alignment data
// and are paired 1:1 by construction, so they're always trustworthy — unlike
// re-splitting our own copy of the script, which can drift out of sync with
// what ElevenLabs actually said (e.g. numbers/dates).
function prepareSubtitles(subtitleText, wordTimings) {
  const hasRealTimings =
    wordTimings?.words?.length && wordTimings.words.length === wordTimings.startTimes.length;
  const words = hasRealTimings
    ? wordTimings.words
    : (subtitleText || "").trim().split(/\s+/).filter(Boolean);
  const timingsMs = hasRealTimings ? wordTimings.startTimes.map((s) => s * 1000) : null;
  log(
    timingsMs
      ? "Sous-titres calés sur les vrais timings ElevenLabs (mots exacts de la voix)"
      : "Sous-titres à espacement égal (pas de timing réel disponible)"
  );
  return { words, timingsMs };
}

// Single source of truth for what a frame looks like at time `t`, shared by
// the deterministic WebCodecs encoder and the real-time fallback recorder.
function drawMontageFrameAt(ctx, images, t, durationMs, subtitleWords, timingsMs, bgCache, w, h) {
  const perImageMs = durationMs / images.length;
  const index = Math.min(images.length - 1, Math.floor(t / perImageMs));
  const progress = Math.min(1, (t - index * perImageMs) / perImageMs);
  const zoomIn = index % 2 !== 0; // first image always starts on a zoom-out

  drawKenBurnsFrame(ctx, images[index], w, h, progress, zoomIn, bgCache);
  drawSubtitle(ctx, subtitleWords, w, h, t, durationMs, timingsMs);
}

async function renderMontage(images, audioBuffer, subtitleText, wordTimings) {
  // WebCodecs first: it produces a constant-frame-rate H.264/AAC MP4 with the
  // moov atom at the front. MediaRecorder's output is variable-frame-rate with
  // trailing metadata, which is exactly what makes Instagram/TikTok's preview
  // freeze while YouTube (which re-encodes everything) plays it fine.
  if (webCodecsAvailable()) {
    try {
      return await renderMontageWebCodecs(images, audioBuffer, subtitleText, wordTimings);
    } catch (err) {
      log(`Encodage compatible indisponible (${err.message}) — repli sur l'enregistrement temps réel`);
    }
  } else {
    log("WebCodecs non supporté par ce navigateur — enregistrement temps réel");
  }
  return renderMontageRealtime(images, audioBuffer, subtitleText, wordTimings);
}

function webCodecsAvailable() {
  return (
    typeof VideoEncoder !== "undefined" &&
    typeof AudioEncoder !== "undefined" &&
    typeof VideoFrame !== "undefined" &&
    typeof AudioData !== "undefined" &&
    typeof Mp4Muxer !== "undefined"
  );
}

// Baseline profile first: it's the most widely decodable H.264 flavour, which
// matters because the file is handed straight to social apps' own players.
const H264_CODECS = ["avc1.42001f", "avc1.42002a", "avc1.4d001f", "avc1.640020"];

async function pickVideoCodec(width, height) {
  for (const codec of H264_CODECS) {
    const config = {
      codec,
      width,
      height,
      bitrate: 4_000_000,
      framerate: MONTAGE_FPS,
      avc: { format: "avc" },
    };
    try {
      const support = await VideoEncoder.isConfigSupported(config);
      if (support.supported) return config;
    } catch {
      // isConfigSupported throws on malformed codec strings — try the next.
    }
  }
  throw new Error("H.264 non supporté");
}

async function renderMontageWebCodecs(images, audioBuffer, subtitleText, wordTimings) {
  const width = montageCanvas.width;
  const height = montageCanvas.height;
  const ctx = montageCanvas.getContext("2d");
  const durationMs = audioBuffer.duration * 1000;
  const { words: subtitleWords, timingsMs } = prepareSubtitles(subtitleText, wordTimings);

  const videoConfig = await pickVideoCodec(width, height);
  const numberOfChannels = Math.min(2, audioBuffer.numberOfChannels);
  const audioConfig = {
    codec: "mp4a.40.2",
    sampleRate: audioBuffer.sampleRate,
    numberOfChannels,
    bitrate: 128_000,
  };
  const audioSupport = await AudioEncoder.isConfigSupported(audioConfig);
  if (!audioSupport.supported) throw new Error("AAC non supporté");

  const muxer = new Mp4Muxer.Muxer({
    target: new Mp4Muxer.ArrayBufferTarget(),
    video: { codec: "avc", width, height },
    audio: { codec: "aac", sampleRate: audioBuffer.sampleRate, numberOfChannels },
    // Rewrites the file so the moov atom sits before the media data — the
    // "faststart" layout every mobile player expects to preview without
    // downloading the whole file first.
    fastStart: "in-memory",
  });

  let encodeError = null;
  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => (encodeError = e),
  });
  videoEncoder.configure(videoConfig);

  const audioEncoder = new AudioEncoder({
    output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
    error: (e) => (encodeError = e),
  });
  audioEncoder.configure(audioConfig);

  log(`Encodage ${videoConfig.codec} + AAC à ${MONTAGE_FPS} i/s (compatible réseaux sociaux)`);

  const totalFrames = Math.max(1, Math.ceil((durationMs / 1000) * MONTAGE_FPS));
  const frameDurationUs = Math.round(1e6 / MONTAGE_FPS);
  const bgCache = { img: null, canvas: null };

  for (let i = 0; i < totalFrames; i++) {
    if (encodeError) throw encodeError;
    const t = (i / MONTAGE_FPS) * 1000;
    drawMontageFrameAt(ctx, images, Math.min(t, durationMs), durationMs, subtitleWords, timingsMs, bgCache, width, height);

    const frame = new VideoFrame(montageCanvas, {
      timestamp: i * frameDurationUs,
      duration: frameDurationUs,
    });
    // A keyframe every second keeps seeking/preview scrubbing responsive.
    videoEncoder.encode(frame, { keyFrame: i % MONTAGE_FPS === 0 });
    frame.close();

    if (i % 15 === 0) {
      status.textContent = `Encodage de la vidéo... ${Math.round((i / totalFrames) * 100)}%`;
      // Yield so the UI stays responsive and the encoder queue can drain.
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  await encodeAudioTrack(audioEncoder, audioBuffer, numberOfChannels);

  await videoEncoder.flush();
  await audioEncoder.flush();
  if (encodeError) throw encodeError;
  muxer.finalize();

  const blob = new Blob([muxer.target.buffer], { type: "video/mp4" });
  return { blob, isMp4: true };
}

async function encodeAudioTrack(audioEncoder, audioBuffer, numberOfChannels) {
  const sampleRate = audioBuffer.sampleRate;
  const total = audioBuffer.length;
  const CHUNK = 4096;

  const channels = [];
  for (let c = 0; c < numberOfChannels; c++) channels.push(audioBuffer.getChannelData(c));

  for (let offset = 0; offset < total; offset += CHUNK) {
    const n = Math.min(CHUNK, total - offset);
    // f32-planar wants every channel's samples laid out back to back.
    const planar = new Float32Array(n * numberOfChannels);
    for (let c = 0; c < numberOfChannels; c++) {
      planar.set(channels[c].subarray(offset, offset + n), c * n);
    }

    const audioData = new AudioData({
      format: "f32-planar",
      sampleRate,
      numberOfFrames: n,
      numberOfChannels,
      timestamp: Math.round((offset / sampleRate) * 1e6),
      data: planar,
    });
    audioEncoder.encode(audioData);
    audioData.close();

    if (audioEncoder.encodeQueueSize > 30) await new Promise((r) => setTimeout(r, 0));
  }
}

// Fallback for browsers without WebCodecs: real-time canvas.captureStream() +
// MediaRecorder. Produces a less universally compatible file, but it's better
// than no video at all.
function renderMontageRealtime(images, audioBuffer, subtitleText, wordTimings) {
  return new Promise((resolve, reject) => {
    const ctx = montageCanvas.getContext("2d");
    const audioCtx = new AudioContext();
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    // Only routed to `dest` (captured into the recording), not to
    // audioCtx.destination — that second connection isn't needed for the
    // recording itself and was making the narration audibly play out loud
    // during generation, which felt like a video starting on its own.
    const dest = audioCtx.createMediaStreamDestination();
    source.connect(dest);

    const videoStream = montageCanvas.captureStream(30);
    const combinedStream = new MediaStream([
      ...videoStream.getVideoTracks(),
      ...dest.stream.getAudioTracks(),
    ]);

    const candidates = [
      "video/mp4;codecs=avc1,mp4a",
      "video/mp4",
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];
    const mimeType = candidates.find((t) => MediaRecorder.isTypeSupported(t));
    const isMp4 = mimeType?.startsWith("video/mp4");
    log(`Format d'enregistrement choisi : ${mimeType || "défaut du navigateur"}`);

    // Left unset, MediaRecorder picks an unbounded/variable bitrate, which is
    // the classic cause of a file that freezes on strict mobile players
    // (Instagram/TikTok/WhatsApp) until re-encoded by YouTube. Pinning a
    // moderate, fixed bitrate matching typical YouTube Shorts output avoids
    // that without needing a real transcoder.
    const recorderOptions = {
      ...(mimeType ? { mimeType } : {}),
      videoBitsPerSecond: 4_000_000,
      audioBitsPerSecond: 128_000,
    };
    const recorder = new MediaRecorder(combinedStream, recorderOptions);
    const chunks = [];
    recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
    recorder.onstop = () =>
      resolve({ blob: new Blob(chunks, { type: isMp4 ? "video/mp4" : "video/webm" }), isMp4 });
    recorder.onerror = (e) => reject(e.error || new Error("Erreur d'enregistrement"));

    const durationMs = audioBuffer.duration * 1000;
    const { words: subtitleWords, timingsMs } = prepareSubtitles(subtitleText, wordTimings);

    const bgCache = { img: null, canvas: null };
    let rafId;

    // Subtitles and image cuts are timed on the AudioContext's own clock,
    // against the exact scheduled start of the narration. performance.now()
    // runs on a different clock than the audio hardware: it made the words
    // appear ahead of the voice (audio scheduling latency at the start,
    // then clock drift over the video's length). audioCtx.currentTime is
    // the clock the narration is actually rendered on, so words and voice
    // can't drift apart.
    const startAt = audioCtx.currentTime + 0.08;

    function draw() {
      const elapsed = (audioCtx.currentTime - startAt) * 1000;
      // Small tail so MediaRecorder never clips the final word's audio.
      if (elapsed >= durationMs + 150) {
        cancelAnimationFrame(rafId);
        recorder.stop();
        return;
      }

      const t = Math.min(Math.max(0, elapsed), durationMs);
      drawMontageFrameAt(
        ctx, images, t, durationMs, subtitleWords, timingsMs, bgCache,
        montageCanvas.width, montageCanvas.height
      );

      rafId = requestAnimationFrame(draw);
    }

    recorder.start();
    source.start(startAt);
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

// ctx.filter = "blur(...)" isn't reliably applied on every browser/mobile
// device (some silently ignore it, leaving the background sharp instead of
// blurred). Downsampling then upsampling produces the blur via plain image
// interpolation instead — and doing it PROGRESSIVELY (halving/doubling in
// 2x steps) is what makes it look like a real soft gaussian blur: a single
// big jump only samples a handful of pixels and comes out as a blocky
// pixelated mosaic, which is exactly what users saw behind the images.
function makeSmoothCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = Math.max(2, Math.round(w));
  c.height = Math.max(2, Math.round(h));
  const cctx = c.getContext("2d");
  cctx.imageSmoothingEnabled = true;
  cctx.imageSmoothingQuality = "high";
  return c;
}

function getBlurredBackground(img, canvasW, canvasH, cache) {
  if (cache.img === img) return cache.canvas;

  // Slightly overscale so the blur's edge falloff never reveals a gap,
  // and so it still covers the frame at the largest Ken Burns zoom level.
  const scale = Math.max(canvasW / img.width, canvasH / img.height) * (1 + KEN_BURNS_ZOOM_RANGE);
  const w = img.width * scale;
  const h = img.height * scale;

  // Cover-draw at half resolution, then keep halving down to ~1/16.
  const f = 0.5;
  let cur = makeSmoothCanvas(canvasW * f, canvasH * f);
  cur.getContext("2d").drawImage(img, (canvasW * f - w * f) / 2, (canvasH * f - h * f) / 2, w * f, h * f);
  for (let i = 0; i < 3; i++) {
    const next = makeSmoothCanvas(cur.width / 2, cur.height / 2);
    next.getContext("2d").drawImage(cur, 0, 0, next.width, next.height);
    cur = next;
  }

  // Back up in 2x steps — each doubling interpolates smoothly.
  while (cur.width * 2 < canvasW) {
    const next = makeSmoothCanvas(cur.width * 2, cur.height * 2);
    next.getContext("2d").drawImage(cur, 0, 0, next.width, next.height);
    cur = next;
  }

  const off = makeSmoothCanvas(canvasW, canvasH);
  const offCtx = off.getContext("2d");
  offCtx.drawImage(cur, 0, 0, canvasW, canvasH);

  // Darken so the sharp foreground image pops — a plain overlay works
  // everywhere, unlike ctx.filter's brightness() which has the same
  // cross-browser gaps as blur().
  offCtx.fillStyle = "rgba(0, 0, 0, 0.4)";
  offCtx.fillRect(0, 0, canvasW, canvasH);

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

function drawSubtitle(ctx, words, canvasW, canvasH, elapsedMs, totalMs, timingsMs) {
  if (!words || words.length === 0) return;

  let currentIndex;
  let wordAppearedAt;

  if (timingsMs) {
    // Real per-word start times: the current word is the last one whose
    // start time has already passed.
    currentIndex = 0;
    for (let i = 0; i < timingsMs.length; i++) {
      if (timingsMs[i] <= elapsedMs) currentIndex = i;
      else break;
    }
    wordAppearedAt = timingsMs[currentIndex];
  } else {
    const wordDurationMs = totalMs / words.length;
    currentIndex = Math.min(words.length - 1, Math.floor(elapsedMs / wordDurationMs));
    wordAppearedAt = currentIndex * wordDurationMs;
  }

  const word = words[currentIndex].toUpperCase();
  const bounceProgress = Math.min(1, (elapsedMs - wordAppearedAt) / SUBTITLE_BOUNCE_MS);
  const scale = bounceEaseOut(bounceProgress);

  const fontSize = 45;
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

// A custom, clickbait-style thumbnail generated per video (instead of just
// reusing a raw source image) — the show's art filled to the edges plus a
// bold title overlay, so it reads at a glance in the Historique list and
// entices a click the way a hand-made YouTube Shorts thumbnail would.
// Typography is authored against a 540px-wide reference frame and scaled
// from there, so the same composition holds at any output size (the 9:16
// video thumbnail and the 1080x1350 TikTok cover).
const THUMBNAIL_REFERENCE_WIDTH = 540;
const TIKTOK_THUMBNAIL_SIZE = { width: 1080, height: 1350 };

function generateThumbnail(img, titleText, canvasW, canvasH) {
  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");
  const s = canvasW / THUMBNAIL_REFERENCE_WIDTH;

  const blurredBg = getBlurredBackground(img, canvasW, canvasH, {});
  ctx.drawImage(blurredBg, 0, 0, canvasW, canvasH);

  // Cover-fit and slightly overscaled so the anime's art/character fills
  // the frame edge-to-edge — a thumbnail needs to read at a glance, unlike
  // the montage's "contain" letterboxing during playback.
  drawScaledImage(ctx, img, canvasW, canvasH, 1.08, "cover");

  const gradient = ctx.createLinearGradient(0, canvasH * 0.5, 0, canvasH);
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, "rgba(0,0,0,0.92)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, canvasH * 0.5, canvasW, canvasH * 0.5);

  drawBrandBadge(ctx, s);

  ctx.fillStyle = "#E63946";
  ctx.fillRect(0, canvasH - 12 * s, canvasW, 12 * s);

  drawThumbnailTitle(ctx, titleText, canvasW, canvasH, s);

  return canvas.toDataURL("image/jpeg", 0.9);
}

// Small "SukiAMV" pill in the top-left corner, in the app's red — the
// same branding treatment a hand-made channel thumbnail would carry.
function drawBrandBadge(ctx, s = 1) {
  const text = "SukiAMV";
  ctx.font = `700 ${24 * s}px "Obelix Pro", "Arial Black", system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const textW = ctx.measureText(text).width;
  const x = 20 * s;
  const y = 20 * s;
  const padX = 16 * s;
  const h = 44 * s;

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
  ctx.shadowBlur = 10 * s;
  ctx.shadowOffsetY = 4 * s;
  ctx.fillStyle = "#E63946";
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, textW + padX * 2, h, 12 * s);
  } else {
    ctx.rect(x, y, textW + padX * 2, h);
  }
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, x + padX, y + h / 2 + 2 * s);
  ctx.restore();
}

function drawThumbnailTitle(ctx, text, canvasW, canvasH, s = 1) {
  const clean = (text || "").trim().toUpperCase();
  if (!clean) return;

  const maxWidth = canvasW - 64 * s;
  let fontSize = 58 * s;
  let lines = [];

  while (fontSize >= 34 * s) {
    ctx.font = `700 ${fontSize}px "Obelix Pro", "Arial Black", system-ui, sans-serif`;
    lines = wrapTextLines(ctx, clean, maxWidth);
    if (lines.length <= 4) break;
    fontSize -= 4 * s;
  }
  lines = lines.slice(0, 4);

  ctx.font = `700 ${fontSize}px "Obelix Pro", "Arial Black", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;

  // The outlines visually thicken each glyph by ~0.2 x fontSize on every
  // side, so the line box needs generous spacing — a tighter 1.15 line
  // height made adjacent lines' rims collide and overlap.
  const lineHeight = fontSize * 1.5;
  const startY = canvasH - 56 * s - (lines.length - 1) * lineHeight;

  lines.forEach((line, i) => {
    const y = startY + i * lineHeight;

    // Three-pass GFX treatment in the app's palette: black outer rim with
    // a drop shadow, red mid outline, white fill.
    ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
    ctx.shadowBlur = 12 * s;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 5 * s;
    ctx.lineWidth = fontSize * 0.22;
    ctx.strokeStyle = "#000000";
    ctx.strokeText(line, canvasW / 2, y);

    ctx.shadowColor = "transparent";
    ctx.lineWidth = fontSize * 0.1;
    ctx.strokeStyle = "#E63946";
    ctx.strokeText(line, canvasW / 2, y);

    ctx.fillStyle = "#ffffff";
    ctx.fillText(line, canvasW / 2, y);
  });
}

function wrapTextLines(ctx, text, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// ---------- Publication (Buffer) ----------

function getBufferKey() {
  return localStorage.getItem(BUFFER_KEY_STORAGE_KEY) || "";
}

function getDefaultPublishTime() {
  return localStorage.getItem(PUBLISH_TIME_STORAGE_KEY) || DEFAULT_PUBLISH_TIME;
}

function getPublishNowDefault() {
  return localStorage.getItem(PUBLISH_NOW_STORAGE_KEY) === "true";
}

function getBookedDays() {
  try {
    return JSON.parse(localStorage.getItem(BOOKED_DAYS_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function bookDay(dayStr) {
  const days = new Set(getBookedDays());
  days.add(dayStr);
  // Forget anything in the past so the list can't grow forever.
  const today = parisDayString(new Date());
  const kept = [...days].filter((d) => d >= today).sort();
  localStorage.setItem(BOOKED_DAYS_STORAGE_KEY, JSON.stringify(kept));
}

// Paris is the reference timezone for scheduling regardless of where the
// device is, so a trip abroad can't silently shift every publication.
function parisOffsetMinutes(date) {
  const part = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris",
    timeZoneName: "longOffset",
  })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName")?.value;
  const m = /GMT([+-])(\d{2}):(\d{2})/.exec(part || "");
  if (!m) return 60;
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
}

function parisParts(date) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Paris",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t).value;
  return { y: get("year"), mo: get("month"), d: get("day"), h: get("hour"), mi: get("minute") };
}

function parisDayString(date) {
  const p = parisParts(date);
  return `${p.y}-${p.mo}-${p.d}`;
}

// "2026-07-30" + "06:40" understood as Paris wall-clock -> real UTC instant.
function parisToUtc(dayStr, timeStr) {
  const [y, mo, d] = dayStr.split("-").map(Number);
  const [h, mi] = timeStr.split(":").map(Number);
  const naive = Date.UTC(y, mo - 1, d, h, mi);
  return new Date(naive - parisOffsetMinutes(new Date(naive)) * 60000);
}

function toDatetimeLocalValue(date) {
  const p = parisParts(date);
  return `${p.y}-${p.mo}-${p.d}T${p.h}:${p.mi}`;
}

function addDays(dayStr, n) {
  const [y, mo, d] = dayStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

// Next free slot: start today if its publish time hasn't passed yet, then
// walk forward one day at a time over anything already booked.
function suggestNextSlot() {
  const time = getDefaultPublishTime();
  const booked = new Set(getBookedDays());
  let day = parisDayString(new Date());
  if (parisToUtc(day, time).getTime() <= Date.now()) day = addDays(day, 1);
  let guard = 0;
  while (booked.has(day) && guard++ < 400) day = addDays(day, 1);
  return parisToUtc(day, time);
}

function buildCaption(platform, item) {
  const description = (item.description || "").trim();
  const tags = (item.tags || "")
    .split(/[,\n]/)
    .map((t) => t.trim().replace(/^#/, ""))
    .filter(Boolean);

  if (platform === "youtube") {
    // YouTube keeps tags out of the visible description.
    return description.slice(0, PLATFORMS.youtube.maxCaption);
  }

  const hashtags = tags.slice(0, platform === "tiktok" ? 6 : 12).map((t) => `#${t.replace(/\s+/g, "")}`);
  const text = [description, hashtags.join(" ")].filter(Boolean).join("\n\n");
  return text.slice(0, PLATFORMS[platform].maxCaption);
}

// The thumbnail already shows titles[0], so the post headline uses the next
// suggestion instead — same video, no duplicated wording on screen.
function buildPostTitle(item) {
  const titles = item.titles || [];
  return (titles[1] || titles[0] || item.title || "").trim();
}

async function bufferGraphql(query, variables) {
  const apiKey = getBufferKey();
  if (!apiKey) throw new Error("Aucune clé API Buffer enregistrée (Réglages).");

  const res = await fetch(`${WORKER_URL}/buffer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey, query, variables }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.details ? `${data.error} — ${data.details}` : data.error || "Erreur Buffer");
  return data.data;
}

async function fetchBufferChannels() {
  const account = await bufferGraphql(`query { account { organizations { id name } } }`);
  const orgId = account?.account?.organizations?.[0]?.id;
  if (!orgId) throw new Error("Aucune organisation Buffer trouvée pour cette clé.");

  const result = await bufferGraphql(
    `query ($orgId: OrganizationId!) {
      channels(input: { organizationId: $orgId }) { id name service }
    }`,
    { orgId }
  );
  return result?.channels || [];
}

async function uploadMedia(blobOrDataUrl, contentType) {
  const blob =
    typeof blobOrDataUrl === "string" ? await (await fetch(blobOrDataUrl)).blob() : blobOrDataUrl;

  const res = await fetch(`${WORKER_URL}/media`, {
    method: "POST",
    headers: { "Content-Type": contentType || blob.type || "application/octet-stream" },
    body: blob,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.details ? `${data.error} — ${data.details}` : data.error || "Envoi du média échoué");
  return data.url;
}

async function schedulePost({ platform, item, title, caption, publishNow, when }) {
  const channels = await fetchBufferChannels();
  const service = PLATFORMS[platform].service;
  const channel = channels.find((c) => (c.service || "").toLowerCase() === service);
  if (!channel) {
    throw new Error(
      `Aucun compte ${PLATFORMS[platform].label} connecté sur Buffer (comptes trouvés : ${
        channels.map((c) => c.service).join(", ") || "aucun"
      }).`
    );
  }

  const videoUrl = await uploadMedia(item.videoBlob, "video/mp4");
  const coverSource = platform === "tiktok" && item.thumbnailTikTok ? item.thumbnailTikTok : item.thumbnail;
  const coverUrl = coverSource ? await uploadMedia(coverSource, "image/jpeg") : null;

  const input = {
    channelId: channel.id,
    text: caption,
    schedulingType: "automatic",
    mode: publishNow ? "shareNow" : "customScheduled",
    assets: [
      {
        video: {
          url: videoUrl,
          ...(coverUrl ? { thumbnailUrl: coverUrl } : {}),
          metadata: { title },
        },
      },
    ],
  };
  if (!publishNow) input.dueAt = when.toISOString();

  const result = await bufferGraphql(
    `mutation ($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess { post { id dueAt } }
        ... on MutationError { message }
      }
    }`,
    { input }
  );

  const payload = result?.createPost;
  if (payload?.message) throw new Error(payload.message);
  if (!payload?.post?.id) throw new Error("Buffer n'a pas confirmé la création du post.");
  return payload.post;
}

function openPublishPanel(item, host) {
  if (!host) return;
  host.innerHTML = "";
  const node = document.getElementById("publish-template").content.cloneNode(true);
  const panel = node.querySelector(".publish-panel");

  const titleInput = panel.querySelector(".publish-title");
  const captionInput = panel.querySelector(".publish-caption");
  const cover = panel.querySelector(".publish-cover");
  const nowToggle = panel.querySelector(".publish-now");
  const scheduleWrap = panel.querySelector(".publish-schedule");
  const dateInput = panel.querySelector(".publish-date");
  const publishBtn = panel.querySelector(".publish-btn");
  const statusEl = panel.querySelector(".publish-status");
  const tabs = [...panel.querySelectorAll(".platform-tab")];

  let platform = "tiktok";
  let loadedOnce = false;
  // Per-platform edits are kept so switching tabs back and forth doesn't
  // wipe what the user just typed.
  const drafts = {};

  function loadPlatform(next) {
    // Skipped on the very first call: the inputs are still empty then, and
    // storing that as a draft would blank out the pre-filled values.
    if (loadedOnce) drafts[platform] = { title: titleInput.value, caption: captionInput.value };
    loadedOnce = true;
    platform = next;
    tabs.forEach((t) => t.classList.toggle("active", t.dataset.platform === platform));
    const draft = drafts[platform];
    titleInput.value = draft ? draft.title : buildPostTitle(item);
    captionInput.value = draft ? draft.caption : buildCaption(platform, item);
    const coverSrc = platform === "tiktok" && item.thumbnailTikTok ? item.thumbnailTikTok : item.thumbnail;
    cover.src = coverSrc || "";
    cover.hidden = !coverSrc;
  }

  tabs.forEach((t) => t.addEventListener("click", () => loadPlatform(t.dataset.platform)));

  nowToggle.checked = getPublishNowDefault();
  scheduleWrap.hidden = nowToggle.checked;
  nowToggle.addEventListener("change", () => {
    scheduleWrap.hidden = nowToggle.checked;
    publishBtn.innerHTML = iconLabel("film", nowToggle.checked ? "Publier maintenant" : "Programmer sur Buffer");
  });

  dateInput.value = toDatetimeLocalValue(suggestNextSlot());
  publishBtn.innerHTML = iconLabel("film", nowToggle.checked ? "Publier maintenant" : "Programmer sur Buffer");
  loadPlatform("tiktok");

  publishBtn.addEventListener("click", async () => {
    if (!getBufferKey()) {
      statusEl.textContent = "Ajoute d'abord ta clé API Buffer dans les Réglages.";
      return;
    }
    publishBtn.disabled = true;
    const publishNow = nowToggle.checked;
    const [dayStr, timeStr] = (dateInput.value || "").split("T");
    const when = publishNow ? new Date() : parisToUtc(dayStr, timeStr || getDefaultPublishTime());

    statusEl.textContent = publishNow
      ? `Publication sur ${PLATFORMS[platform].label}...`
      : `Programmation sur ${PLATFORMS[platform].label}...`;

    try {
      const post = await schedulePost({
        platform, item,
        title: titleInput.value.trim(),
        caption: captionInput.value.trim(),
        publishNow, when,
      });
      if (!publishNow) bookDay(dayStr);
      statusEl.textContent = publishNow
        ? `Publié sur ${PLATFORMS[platform].label} ✓`
        : `Programmé sur ${PLATFORMS[platform].label} pour le ${new Date(post.dueAt || when).toLocaleString("fr-FR")} ✓`;
    } catch (err) {
      statusEl.textContent = `Échec : ${err.message}`;
    } finally {
      publishBtn.disabled = false;
    }
  });

  host.appendChild(node);
}

function initPublishSettings() {
  bufferKeyInput.value = getBufferKey();
  publishTimeInput.value = getDefaultPublishTime();
  publishNowDefault.checked = getPublishNowDefault();

  saveBufferKeyBtn.addEventListener("click", () => {
    const key = bufferKeyInput.value.trim();
    if (key) localStorage.setItem(BUFFER_KEY_STORAGE_KEY, key);
    else localStorage.removeItem(BUFFER_KEY_STORAGE_KEY);
    bufferStatus.textContent = key ? "Clé Buffer enregistrée." : "Clé Buffer supprimée.";
  });

  testBufferBtn.addEventListener("click", async () => {
    testBufferBtn.disabled = true;
    bufferStatus.textContent = "Connexion à Buffer...";
    try {
      const channels = await fetchBufferChannels();
      bufferStatus.textContent = channels.length
        ? `Connecté ✓ — comptes : ${channels.map((c) => c.service).join(", ")}`
        : "Connecté, mais aucun compte social n'est relié à ton Buffer.";
    } catch (err) {
      bufferStatus.textContent = `Échec : ${err.message}`;
    } finally {
      testBufferBtn.disabled = false;
    }
  });

  publishTimeInput.addEventListener("change", () => {
    localStorage.setItem(PUBLISH_TIME_STORAGE_KEY, publishTimeInput.value || DEFAULT_PUBLISH_TIME);
  });
  publishNowDefault.addEventListener("change", () => {
    localStorage.setItem(PUBLISH_NOW_STORAGE_KEY, String(publishNowDefault.checked));
  });
}

// ---------- Historique (IndexedDB) ----------

const HISTORY_DB_NAME = "autoshort-history";
const HISTORY_STORE = "generations";

function openHistoryDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(HISTORY_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(HISTORY_STORE)) {
        db.createObjectStore(HISTORY_STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveToHistory({ voiceScript, videoBlob, videoExt, thumbnail, thumbnailTikTok, title, titles, description, tags }) {
  try {
    const db = await openHistoryDb();
    const tx = db.transaction(HISTORY_STORE, "readwrite");
    const req = tx.objectStore(HISTORY_STORE).add({
      title,
      titles: titles || [],
      description: description || "",
      tags: tags || "",
      voiceScript,
      videoBlob,
      videoExt,
      thumbnail,
      thumbnailTikTok: thumbnailTikTok || "",
      date: Date.now(),
    });
    const id = await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
    });
    if (!document.getElementById("tab-history").hidden) renderHistory();
    return id;
  } catch (err) {
    log(`Historique non sauvegardé : ${err.message || err}`);
    return null;
  }
}

async function getAllHistory() {
  const db = await openHistoryDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HISTORY_STORE, "readonly");
    const req = tx.objectStore(HISTORY_STORE).getAll();
    req.onsuccess = () => resolve(req.result.reverse());
    req.onerror = () => reject(req.error);
  });
}

async function deleteHistoryItem(id) {
  const db = await openHistoryDb();
  const tx = db.transaction(HISTORY_STORE, "readwrite");
  tx.objectStore(HISTORY_STORE).delete(id);
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

function initHistory() {
  document.querySelector('.tab-btn[data-tab="history"]').addEventListener("click", renderHistory);
  historyBackBtn.addEventListener("click", () => {
    historyDetail.hidden = true;
    historyList.hidden = false;
    historyDetailVideo.pause();
    historyDetailVideo.removeAttribute("src");
    historyDetailVideo.load();
  });
  historyDetailDescription.addEventListener("click", () => copyFromTextarea(historyDetailDescription));
  historyDetailTags.addEventListener("click", () => copyFromTextarea(historyDetailTags));
}

function openHistoryDetail(item) {
  historyList.hidden = true;
  historyDetail.hidden = false;

  historyDetailVideo.src = URL.createObjectURL(item.videoBlob);
  historyDetailDownload.href = URL.createObjectURL(item.videoBlob);
  historyDetailDownload.download = `sukishort.${item.videoExt}`;

  historyDetailTitles.innerHTML = "";
  const titles = item.titles && item.titles.length ? item.titles : [item.title || "Sans titre"];
  titles.forEach((title) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "title-item";
    btn.textContent = title;
    btn.addEventListener("click", () => copyToClipboard(title, btn, title));
    historyDetailTitles.appendChild(btn);
  });

  historyDetailDescription.value = item.description || "";
  historyDetailTags.value = item.tags || "";

  // Older history entries stored a plain source-image URL as thumbnail;
  // both that and the newer generated data-URL miniature display fine.
  const hasThumbnail = !!item.thumbnail;
  historyDetailThumbnail.src = item.thumbnail || "";
  historyDetailThumbnail.hidden = !hasThumbnail;
  historyDetailThumbnailDownload.href = item.thumbnail || "";
  historyDetailThumbnailDownload.hidden = !hasThumbnail;

  // Only entries generated since the TikTok cover was added carry one.
  const hasTikTok = !!item.thumbnailTikTok;
  historyDetailThumbnailTiktok.src = item.thumbnailTikTok || "";
  historyDetailThumbnailTiktok.hidden = !hasTikTok;
  historyDetailThumbnailTiktokDownload.href = item.thumbnailTikTok || "";
  historyDetailThumbnailTiktokDownload.hidden = !hasTikTok;

  // Same publishing panel as right after generation, so an old project can
  // be scheduled without re-downloading and re-uploading anything.
  openPublishPanel(item, historyPublishPanel);

  historyDetail.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function renderHistory() {
  historyStatus.textContent = "Chargement...";
  historyList.innerHTML = "";
  historyDetail.hidden = true;
  historyList.hidden = false;
  try {
    const items = await getAllHistory();
    historyStatus.textContent = items.length === 0 ? "Aucune génération sauvegardée pour l'instant." : "";

    items.forEach((item) => {
      const card = document.createElement("div");
      card.className = "history-card";
      card.title = "Voir la fiche et la proposition SEO";
      card.addEventListener("click", () => openHistoryDetail(item));

      const thumb = document.createElement("img");
      thumb.className = "history-thumb";
      thumb.src = item.thumbnail || "";
      thumb.alt = "";

      const info = document.createElement("div");
      info.className = "history-info";
      const dateStr = new Date(item.date).toLocaleString();
      const titleEl = document.createElement("strong");
      titleEl.textContent = item.title || "Sans titre";
      const dateEl = document.createElement("span");
      dateEl.textContent = dateStr;
      info.append(titleEl, dateEl);

      const controls = document.createElement("div");
      controls.className = "history-controls";

      const downloadBtn = document.createElement("a");
      downloadBtn.className = "timeline-action-btn";
      downloadBtn.innerHTML = ICONS.download;
      downloadBtn.title = "Télécharger";
      downloadBtn.href = URL.createObjectURL(item.videoBlob);
      downloadBtn.download = `sukishort.${item.videoExt}`;
      downloadBtn.addEventListener("click", (e) => e.stopPropagation());

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "timeline-action-btn";
      removeBtn.innerHTML = ICONS.trashSmall;
      removeBtn.title = "Supprimer";
      removeBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        await deleteHistoryItem(item.id);
        renderHistory();
      });

      controls.append(downloadBtn, removeBtn);
      card.append(thumb, info, controls);
      historyList.appendChild(card);
    });
  } catch (err) {
    historyStatus.textContent = `Erreur historique : ${err.message}`;
  }
}

// ---------- Suggestions (actus) ----------

const FALLBACK_ARTICLE_IMAGE = "icon.svg";
// img.src always reads back as the fully-resolved absolute URL, even when
// set to a relative path — precomputed here so the error handler can
// compare against it without triggering itself in a loop.
const FALLBACK_ARTICLE_IMAGE_ABSOLUTE = new URL(FALLBACK_ARTICLE_IMAGE, window.location.href).href;

let currentArticle = null;
let suggestionsLoaded = false;

function initSuggestions() {
  document.querySelector('.tab-btn[data-tab="suggestions"]').addEventListener("click", loadSuggestions);
  articleBackBtn.addEventListener("click", () => {
    articleDetail.hidden = true;
    suggestionsList.hidden = false;
  });
  articleGenerateBtn.addEventListener("click", () => {
    if (!currentArticle) return;
    document.querySelector('.tab-btn[data-tab="generate"]').click();
    currentSuggestionImage = currentArticle.image || "";
    promptInput.value = `${currentArticle.title}\n\n${currentArticle.description}`;
    form.requestSubmit();
  });
  refreshSuggestionsBtn.addEventListener("click", async () => {
    refreshSuggestionsBtn.disabled = true;
    await refreshSuggestions();
    refreshSuggestionsBtn.disabled = false;
  });
}

function loadSuggestions() {
  if (suggestionsLoaded) return;
  suggestionsLoaded = true;
  refreshSuggestions();
}

async function refreshSuggestions() {
  suggestionsStatus.textContent = "Chargement des actus...";
  suggestionsList.innerHTML = "";
  articleDetail.hidden = true;
  suggestionsList.hidden = false;

  try {
    const res = await fetch(`${WORKER_URL}/news`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erreur");

    const groups = groupArticlesByDate(data.articles || []);
    suggestionsStatus.textContent = Object.values(groups).every((g) => g.length === 0)
      ? "Aucune actu disponible pour l'instant."
      : "";

    Object.entries(groups).forEach(([label, articles]) => {
      if (articles.length === 0) return;
      const heading = document.createElement("h3");
      heading.className = "suggestions-heading";
      heading.textContent = label;
      suggestionsList.appendChild(heading);

      // Real news doesn't publish fast enough for the underlying article
      // pool to actually change between two clicks a few seconds apart —
      // shuffling within each date group (recency order is preserved at
      // the group level) means the display still visibly changes every
      // time "Actualiser" is pressed instead of showing the identical list.
      shuffle(articles).forEach((article) => suggestionsList.appendChild(buildArticleCard(article)));
    });
  } catch (err) {
    suggestionsStatus.textContent = `Erreur actus : ${err.message}`;
  }
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function groupArticlesByDate(articles) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfThisWeek = new Date(startOfToday);
  startOfThisWeek.setDate(startOfThisWeek.getDate() - startOfToday.getDay());
  const startOfLastWeek = new Date(startOfThisWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
  const startOfWeekBefore = new Date(startOfLastWeek);
  startOfWeekBefore.setDate(startOfWeekBefore.getDate() - 7);
  // Month buckets beyond the last ~3 weeks, going back up to 3 months —
  // anything older than that is dropped so the list stays relevant.
  const startOfMonth1Ago = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  const startOfMonth2Ago = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());
  const startOfMonth3Ago = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());

  const groups = {
    "Aujourd'hui": [],
    "Cette semaine": [],
    "La semaine dernière": [],
    "La semaine d'avant": [],
    "Il y a 1 mois": [],
    "Il y a 2 mois": [],
    "Il y a 3 mois": [],
  };

  articles.forEach((article) => {
    const date = new Date(article.pubDate);
    if (isNaN(date)) return;
    if (date >= startOfToday) {
      groups["Aujourd'hui"].push(article);
    } else if (date >= startOfThisWeek) {
      groups["Cette semaine"].push(article);
    } else if (date >= startOfLastWeek) {
      groups["La semaine dernière"].push(article);
    } else if (date >= startOfWeekBefore) {
      groups["La semaine d'avant"].push(article);
    } else if (date >= startOfMonth1Ago) {
      groups["Il y a 1 mois"].push(article);
    } else if (date >= startOfMonth2Ago) {
      groups["Il y a 2 mois"].push(article);
    } else if (date >= startOfMonth3Ago) {
      groups["Il y a 3 mois"].push(article);
    }
    // Older than 3 months: dropped, not shown.
  });

  return groups;
}

function buildArticleCard(article) {
  const card = document.createElement("div");
  card.className = "article-card";

  const thumb = document.createElement("img");
  thumb.className = "article-thumb";
  thumb.src = article.image || FALLBACK_ARTICLE_IMAGE;
  thumb.alt = "";
  thumb.loading = "lazy";
  // Some sources' image URLs occasionally 404 or hotlink-block at runtime
  // even when the article had one — fall back instead of a broken icon.
  thumb.addEventListener("error", () => {
    if (thumb.src !== FALLBACK_ARTICLE_IMAGE_ABSOLUTE) thumb.src = FALLBACK_ARTICLE_IMAGE;
  });

  const textWrap = document.createElement("div");
  textWrap.className = "article-card-text";

  const title = document.createElement("span");
  title.textContent = article.title;

  const source = document.createElement("span");
  source.className = "article-card-source";
  source.textContent = article.source || "";

  textWrap.append(title, source);
  card.append(thumb, textWrap);
  card.addEventListener("click", () => openArticle(article));
  return card;
}

function openArticle(article) {
  currentArticle = article;
  suggestionsList.hidden = true;
  articleDetail.hidden = false;

  articleTitleEl.textContent = article.title;
  if (article.image) {
    articleImageEl.onerror = () => (articleImageEl.hidden = true);
    articleImageEl.src = article.image;
    articleImageEl.hidden = false;
  } else {
    articleImageEl.hidden = true;
  }
  articleContentEl.textContent = article.description || "";
  articleSourceLink.href = article.link;
  const sourceLabel = article.source ? `Voir la source (${article.source})` : "Voir la source";
  articleSourceLink.innerHTML = `<span class="icon">${ICONS.link}</span><span>${sourceLabel}</span>`;
  articleDetail.scrollIntoView({ behavior: "smooth", block: "start" });
}
