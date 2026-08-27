import { ELEVENLABS_VOICE_ID, json, corsHeaders } from "./_utils.js";

// Matches the rate requested from the fallback TTS model; used to build the
// WAV header when the model hands back bare PCM.
const FALLBACK_SAMPLE_RATE = 24000;

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
  // file is always produced.
  try {
    // linear16 (raw PCM) rather than mp3: iOS Safari rejects the MP3 this
    // model produces with MEDIA_ERR_SRC_NOT_SUPPORTED even though the file is
    // complete and carries a valid frame header. WAV is what the ElevenLabs
    // path already returns and plays fine on the same device, so the fallback
    // now lands in the same container instead of a second, flakier one.
    const aiResult = await env.AI.run("@cf/deepgram/aura-1", {
      text,
      speaker: "asteria",
      encoding: "linear16",
      sample_rate: FALLBACK_SAMPLE_RATE,
    });

    // Workers AI returns different shapes depending on the model and the
    // runtime version: a ReadableStream/Response for streamed binary, a raw
    // ArrayBuffer, or — for the Deepgram models — a plain JSON object with a
    // base64 "audio" field. Passing that object to new Response() would
    // stringify it to "[object Object]" and produce a 15-byte file that the
    // browser reports as a broken track, while the request still looked
    // successful. Each shape is handled explicitly instead.
    const audioBuffer = await normalizeAudioResult(aiResult);

    // Anything under a kilobyte is an error payload rather than speech, so
    // fail loudly instead of handing the client an unplayable file with a
    // reassuring "fallback voice used" message.
    assertNotEmpty(audioBuffer);

    // The model may honour linear16 or fall back to a container of its own,
    // so the bytes decide the format, not the request.
    const { buffer: playableBuffer, format } = toPlayableAudio(audioBuffer);
    const audioBase64 = bufferToBase64(playableBuffer);

    // This TTS model doesn't expose word-level timing, so forced-align the
    // actual generated audio via Whisper (Groq) to still get real per-word
    // timestamps for perfect subtitle sync on the fallback voice too.
    const wordTimings = await transcribeWordTimings(audioBuffer, env.GROQ_API_KEY);

    // Byte size is echoed back so a truncated file can be told apart from a
    // format the browser simply refuses to play.
    return json({ audioBase64, wordTimings, source: "workers-ai", bytes: audioBuffer.byteLength });
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

async function transcribeWordTimings(audioBuffer, format, apiKey) {
  try {
    const form = new FormData();
    const isWav = format === "wav";
    form.append(
      "file",
      new Blob([audioBuffer], { type: isWav ? "audio/wav" : "audio/mpeg" }),
      isWav ? "audio.wav" : "audio.mp3"
    );
    form.append("model", "whisper-large-v3-turbo");
    form.append("response_format", "verbose_json");
    form.append("timestamp_granularities[]", "word");

    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!res.ok) return null;

    const data = await res.json();
    const words = [];
    const startTimes = [];
    for (const w of data.words || []) {
      const wordText = (w.word || "").trim();
      if (!wordText) continue;
      words.push(wordText);
      startTimes.push(w.start);
    }

    return words.length > 0 ? { words, startTimes } : null;
  } catch {
    // Sync falls back to even spacing if transcription is unavailable —
    // still better than failing the whole audio generation over it.
    return null;
  }
}

// Turns any of Workers AI's return shapes into a plain ArrayBuffer.
async function normalizeAudioResult(result) {
  if (!result) throw new Error("réponse vide du modèle TTS");

  if (result instanceof ArrayBuffer) return result;
  if (ArrayBuffer.isView(result)) return result.buffer;
  if (result instanceof Response) return await result.arrayBuffer();
  if (typeof result.getReader === "function") {
    // ReadableStream of binary chunks.
    return await new Response(result).arrayBuffer();
  }

  // JSON object: the audio sits in a base64 field whose name varies between
  // models, so try the known ones before giving up.
  const base64 = result.audio ?? result.audio_base64 ?? result.data;
  if (typeof base64 === "string" && base64.length > 0) {
    return base64ToArrayBuffer(base64);
  }

  throw new Error(`format audio inattendu (${Object.keys(result).join(", ") || typeof result})`);
}

function assertNotEmpty(buffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 1024) {
    throw new Error(`audio trop court (${bytes.length} octets) — le modèle a renvoyé une erreur`);
  }
}

// Identifies what the model actually returned and guarantees a container the
// browser will accept: already-wrapped WAV passes through, MP3 passes through,
// and bare PCM samples get a RIFF header built around them.
function toPlayableAudio(buffer) {
  const bytes = new Uint8Array(buffer);
  const isRiff = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
  if (isRiff) return { buffer, format: "wav" };

  const isId3 = bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33;
  const isFrameSync = bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
  if (isId3 || isFrameSync) return { buffer, format: "mp3" };

  return { buffer: wrapPcmInWav(buffer, FALLBACK_SAMPLE_RATE, 1), format: "wav" };
}

// Minimal 44-byte RIFF/WAVE header for 16-bit little-endian PCM.
function wrapPcmInWav(pcmBuffer, sampleRate, channels) {
  const pcm = new Uint8Array(pcmBuffer);
  const bytesPerSample = 2;
  const blockAlign = channels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const out = new Uint8Array(44 + pcm.length);
  const view = new DataView(out.buffer);

  const writeAscii = (offset, text) => {
    for (let i = 0; i < text.length; i++) out[offset + i] = text.charCodeAt(i);
  };

  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + pcm.length, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true); // PCM subchunk size
  view.setUint16(20, 1, true); // format 1 = PCM
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 8 * bytesPerSample, true);
  writeAscii(36, "data");
  view.setUint32(40, pcm.length, true);
  out.set(pcm, 44);

  return out.buffer;
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
