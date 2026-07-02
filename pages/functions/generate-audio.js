import { ELEVENLABS_VOICE_ID, json, corsHeaders } from "./_utils.js";

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders() });
}

export async function onRequestPost({ request, env }) {
  const { text, voiceId } = await request.json();

  if (!text) {
    return json({ error: "Missing 'text'" }, 400);
  }

  // WAV instead of MP3: MP3's encoder delay (a few tens of ms of priming
  // silence baked in by the encoder) isn't reliably stripped by
  // decodeAudioData() in every browser, which shifts real playback start
  // later than ElevenLabs' alignment timestamps assume — the actual
  // remaining source of subtitle drift even with correct per-word timings.
  // WAV is uncompressed PCM with a plain header, so it decodes sample-exact.
  const elevenRes = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId || ELEVENLABS_VOICE_ID}/with-timestamps?output_format=wav_24000`,
    {
      method: "POST",
      headers: {
        "xi-api-key": env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        // Lower stability + added style = more natural human variation in
        // pitch/pacing instead of a flat, robotic-sounding read.
        voice_settings: {
          stability: 0.3,
          similarity_boost: 0.8,
          style: 0.45,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (elevenRes.ok) {
    const data = await elevenRes.json();
    // Real per-word start times (from ElevenLabs' character-level alignment)
    // let the montage sync subtitles to when each word is actually spoken,
    // instead of assuming every word takes the same amount of time. The
    // words themselves are derived from the same alignment data as the
    // timings, so they're always paired 1:1 — no risk of a length mismatch
    // against a separately-split client-side copy of the script (which can
    // drift if ElevenLabs normalizes numbers/dates internally).
    const wordTimings = computeWordTimings(data.alignment || data.normalized_alignment);

    return json({ audioBase64: data.audio_base64, wordTimings, source: "elevenlabs" });
  }

  const elevenErrText = await elevenRes.text();

  // ElevenLabs failed (quota exhausted, key issue, etc.) — fall back to
  // Cloudflare Workers AI's free TTS model so a real, downloadable audio
  // file is always produced. No word-level timing is available here.
  try {
    const audioStream = await env.AI.run("@cf/deepgram/aura-1", {
      text,
      speaker: "asteria",
      encoding: "mp3",
    });
    const audioBase64 = await streamToBase64(audioStream);

    return json({ audioBase64, wordTimings: null, source: "workers-ai" });
  } catch (fallbackErr) {
    return json(
      {
        error: "Audio indisponible",
        details: `ElevenLabs: ${elevenErrText} | Secours Workers AI: ${fallbackErr.message || fallbackErr}`,
      },
      502
    );
  }
}

function computeWordTimings(alignment) {
  if (!alignment?.characters?.length) return null;

  const { characters, character_start_times_seconds } = alignment;
  const words = [];
  const startTimes = [];
  let wordStart = null;
  let wordChars = "";

  for (let i = 0; i < characters.length; i++) {
    const ch = characters[i];
    if (/\s/.test(ch)) {
      if (wordChars) {
        words.push(wordChars);
        startTimes.push(wordStart);
        wordChars = "";
        wordStart = null;
      }
    } else {
      if (wordStart === null) wordStart = character_start_times_seconds[i];
      wordChars += ch;
    }
  }
  if (wordChars) {
    words.push(wordChars);
    startTimes.push(wordStart);
  }

  return { words, startTimes };
}

async function streamToBase64(stream) {
  const buffer = await new Response(stream).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
