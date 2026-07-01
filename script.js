const WORKER_URL = "https://autoshort-2ym.pages.dev";

const form = document.getElementById("prompt-form");
const promptInput = document.getElementById("prompt");
const resultSection = document.getElementById("result");
const scriptOutput = document.getElementById("script-output");
const status = document.getElementById("status");
const clearBtn = document.getElementById("clear-btn");
const audioPlayer = document.getElementById("audio-player");

clearBtn.addEventListener("click", () => {
  promptInput.value = "";
  resultSection.hidden = true;
  audioPlayer.hidden = true;
  audioPlayer.removeAttribute("src");
  status.textContent = "";
  promptInput.focus();
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const prompt = promptInput.value.trim();
  if (!prompt) return;

  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  status.textContent = "Génération en cours...";
  resultSection.hidden = true;

  try {
    const res = await fetch(`${WORKER_URL}/generate-prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: prompt }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Erreur inconnue");
    }

    scriptOutput.textContent = data.videoPrompt;
    resultSection.hidden = false;
    audioPlayer.hidden = true;

    if (data.voiceScript) {
      status.textContent = "Génération de l'audio...";
      try {
        const audioRes = await fetch(`${WORKER_URL}/generate-audio`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: data.voiceScript }),
        });

        if (!audioRes.ok) throw new Error("ElevenLabs indisponible");

        const audioBlob = await audioRes.blob();
        audioPlayer.src = URL.createObjectURL(audioBlob);
        audioPlayer.hidden = false;
        status.textContent = "";
      } catch {
        status.textContent = "Audio ElevenLabs indisponible, lecture via la voix du navigateur.";
        speakWithBrowser(data.voiceScript);
      }
    } else {
      status.textContent = "";
    }
  } catch (err) {
    status.textContent = `Erreur : ${err.message}`;
  } finally {
    button.disabled = false;
  }
});

function speakWithBrowser(text) {
  if (!("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 1.1;
  window.speechSynthesis.speak(utterance);
}
