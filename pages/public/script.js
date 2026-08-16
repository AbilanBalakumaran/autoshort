diff --git a/script.js b/script.js
index 2bcd172..47ec3f7 100644
--- a/script.js
+++ b/script.js
@@ -1805,10 +1805,26 @@ async function encodeAudioTrack(audioEncoder, audioBuffer, numberOfChannels) {
 // Fallback for browsers without WebCodecs: real-time canvas.captureStream() +
 // MediaRecorder. Produces a less universally compatible file, but it's better
 // than no video at all.
-function renderMontageRealtime(images, audioBuffer, subtitleText, wordTimings) {
+async function renderMontageRealtime(images, audioBuffer, subtitleText, wordTimings) {
+  const audioCtx = new AudioContext();
+
+  // iOS Safari starts an AudioContext in the "suspended" state whenever it's
+  // created outside a user gesture — which is the case here, since the context
+  // is only built after the audio has been fetched and decoded (several awaits
+  // after the button click). A suspended context's currentTime stays frozen at
+  // 0, so the draw loop below never reaches the end of the audio, never calls
+  // recorder.stop(), and the promise never resolves: the log simply stops and
+  // no file is ever produced. Resuming it first is what unfreezes the clock.
+  if (audioCtx.state === "suspended") {
+    try {
+      await audioCtx.resume();
+    } catch {
+      log("Contexte audio non réveillé — bascule sur l'horloge système");
+    }
+  }
+
   return new Promise((resolve, reject) => {
     const ctx = montageCanvas.getContext("2d");
-    const audioCtx = new AudioContext();
     const source = audioCtx.createBufferSource();
     source.buffer = audioBuffer;
     // Only routed to `dest` (captured into the recording), not to
@@ -1847,10 +1863,16 @@ function renderMontageRealtime(images, audioBuffer, subtitleText, wordTimings) {
     };
     const recorder = new MediaRecorder(combinedStream, recorderOptions);
     const chunks = [];
+    let safetyTimer;
     recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
-    recorder.onstop = () =>
+    recorder.onstop = () => {
+      clearTimeout(safetyTimer);
       resolve({ blob: new Blob(chunks, { type: isMp4 ? "video/mp4" : "video/webm" }), isMp4 });
-    recorder.onerror = (e) => reject(e.error || new Error("Erreur d'enregistrement"));
+    };
+    recorder.onerror = (e) => {
+      clearTimeout(safetyTimer);
+      reject(e.error || new Error("Erreur d'enregistrement"));
+    };
 
     const durationMs = audioBuffer.duration * 1000;
     const { words: subtitleWords, timingsMs } = prepareSubtitles(subtitleText, wordTimings);
@@ -1866,13 +1888,34 @@ function renderMontageRealtime(images, audioBuffer, subtitleText, wordTimings) {
     // the clock the narration is actually rendered on, so words and voice
     // can't drift apart.
     const startAt = audioCtx.currentTime + 0.08;
+    const wallStart = performance.now() + 80;
+
+    function stopRecording() {
+      cancelAnimationFrame(rafId);
+      clearTimeout(safetyTimer);
+      if (recorder.state !== "inactive") recorder.stop();
+    }
+
+    // Last-resort guard: if the audio clock is still stuck for any reason
+    // (locked screen, backgrounded tab, a resume() the browser refused), the
+    // draw loop would otherwise spin forever and no file would come out.
+    // Forcing a stop well past the expected end always yields a video.
+    safetyTimer = setTimeout(() => {
+      log("Fin non détectée par l'horloge audio — arrêt forcé de l'enregistrement");
+      stopRecording();
+    }, durationMs + 5000);
 
     function draw() {
-      const elapsed = (audioCtx.currentTime - startAt) * 1000;
+      // Prefer the audio clock (keeps subtitles locked to the voice), but fall
+      // back to the wall clock if the context never actually started running,
+      // so the recording always terminates.
+      const elapsed =
+        audioCtx.state === "running"
+          ? (audioCtx.currentTime - startAt) * 1000
+          : performance.now() - wallStart;
       // Small tail so MediaRecorder never clips the final word's audio.
       if (elapsed >= durationMs + 150) {
-        cancelAnimationFrame(rafId);
-        recorder.stop();
+        stopRecording();
         return;
       }
 
@@ -1885,7 +1928,9 @@ function renderMontageRealtime(images, audioBuffer, subtitleText, wordTimings) {
       rafId = requestAnimationFrame(draw);
     }
 
-    recorder.start();
+    // A timeslice makes Safari flush chunks as it goes instead of holding
+    // everything until stop(), where a long recording can come back empty.
+    recorder.start(1000);
     source.start(startAt);
     draw();
   });
