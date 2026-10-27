/* Prefer RunningHub IndexTTS 2.5 mp3; fall back to Web Speech API.
   Shows a live Chinese caption bar synced by character-weighted time. */
(function () {
  "use strict";

  let currentBtn = null;
  let currentAudio = null;
  let synthActive = false;
  let captionRaf = 0;
  let captionCues = [];
  let captionBar = null;
  let captionTextEl = null;

  function hasSynth() {
    return "speechSynthesis" in window;
  }

  function pickVoice() {
    if (!hasSynth()) return null;
    const voices = speechSynthesis.getVoices();
    return (
      voices.find(
        (v) =>
          v.lang === "zh-CN" &&
          /Xiaoxiao|Xiaoyi|Huihui|Yaoyao|Google/i.test(v.name)
      ) ||
      voices.find((v) => v.lang === "zh-CN" || v.lang.startsWith("zh")) ||
      voices.find((v) => /Chinese|中文/i.test(v.name)) ||
      null
    );
  }

  if (hasSynth()) {
    speechSynthesis.onvoiceschanged = function () {};
  }

  function ensureCaptionBar() {
    if (captionBar) return captionBar;
    captionBar = document.createElement("div");
    captionBar.id = "speech-caption-bar";
    captionBar.className = "speech-caption-bar";
    captionBar.setAttribute("aria-live", "polite");
    captionBar.hidden = true;
    captionBar.innerHTML =
      '<div class="speech-caption-inner"><span class="speech-caption-text"></span></div>';
    document.body.appendChild(captionBar);
    captionTextEl = captionBar.querySelector(".speech-caption-text");
    return captionBar;
  }

  function hideCaption() {
    if (captionRaf) {
      cancelAnimationFrame(captionRaf);
      captionRaf = 0;
    }
    captionCues = [];
    if (captionBar) {
      captionBar.hidden = true;
      captionBar.classList.remove("visible");
    }
    if (captionTextEl) captionTextEl.textContent = "";
  }

  function showCaption(text) {
    ensureCaptionBar();
    captionTextEl.textContent = text || "";
    captionBar.hidden = !text;
    if (text) captionBar.classList.add("visible");
    else captionBar.classList.remove("visible");
  }

  /** Split into cue segments: sentence punctuation first; long cues by commas. */
  function splitCues(text) {
    const raw = String(text || "")
      .replace(/\s+/g, " ")
      .trim();
    if (!raw) return [];
    let parts = raw
      .split(/(?<=[。！？；…])/)
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean);
    if (!parts.length) parts = [raw];

    const MAX = 42;
    const out = [];
    parts.forEach(function (p) {
      if (p.length <= MAX) {
        out.push(p);
        return;
      }
      const sub = p
        .split(/(?<=[，、,])/)
        .map(function (s) {
          return s.trim();
        })
        .filter(Boolean);
      if (sub.length <= 1) {
        out.push(p);
        return;
      }
      let buf = "";
      sub.forEach(function (chunk) {
        if (!buf) {
          buf = chunk;
          return;
        }
        if ((buf + chunk).length <= MAX) {
          buf += chunk;
        } else {
          out.push(buf);
          buf = chunk;
        }
      });
      if (buf) out.push(buf);
    });
    return out.length ? out : [raw];
  }

  /** Character-count weighted cue timings over duration (seconds). */
  function buildTimedCues(text, duration) {
    const parts = splitCues(text);
    const total = parts.reduce(function (n, p) {
      return n + Math.max(p.length, 1);
    }, 0);
    const dur = Math.max(Number(duration) || 0, 0.01);
    let t = 0;
    return parts.map(function (p) {
      const w = Math.max(p.length, 1) / total;
      const start = t;
      const end = Math.min(dur, t + w * dur);
      t = end;
      return { text: p, start: start, end: end };
    });
  }

  function activeCueAt(cues, t) {
    if (!cues.length) return null;
    for (let i = 0; i < cues.length; i++) {
      if (t >= cues[i].start && t < cues[i].end) return cues[i];
    }
    if (t >= cues[cues.length - 1].start) return cues[cues.length - 1];
    return cues[0];
  }

  function startCaptionSync(audio, text) {
    hideCaption();
    ensureCaptionBar();

    function arm() {
      const dur = audio.duration;
      if (!isFinite(dur) || dur <= 0) {
        showCaption(splitCues(text)[0] || text);
        return;
      }
      captionCues = buildTimedCues(text, dur);
      const first = captionCues[0];
      showCaption(first ? first.text : text);

      function tick() {
        if (currentAudio !== audio) return;
        const cue = activeCueAt(captionCues, audio.currentTime || 0);
        if (cue && captionTextEl && captionTextEl.textContent !== cue.text) {
          captionTextEl.textContent = cue.text;
        }
        captionRaf = requestAnimationFrame(tick);
      }
      captionRaf = requestAnimationFrame(tick);
    }

    if (audio.readyState >= 1 && isFinite(audio.duration) && audio.duration > 0) {
      arm();
    } else {
      audio.addEventListener("loadedmetadata", arm, { once: true });
      // fallback if metadata never fires
      setTimeout(function () {
        if (currentAudio === audio && !captionCues.length) arm();
      }, 800);
    }
  }

  function clearPlaying() {
    if (currentBtn) {
      currentBtn.classList.remove("playing");
      const label = currentBtn.getAttribute("data-label") || "播放讲解";
      if (!currentBtn.disabled) currentBtn.textContent = label;
      currentBtn = null;
    }
  }

  function stopAll() {
    if (currentAudio) {
      try {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      } catch (_) {}
      currentAudio = null;
    }
    if (hasSynth()) {
      try {
        speechSynthesis.cancel();
      } catch (_) {}
    }
    synthActive = false;
    hideCaption();
    clearPlaying();
  }

  function markPlaying(btn) {
    if (!btn.getAttribute("data-label")) {
      btn.setAttribute("data-label", btn.textContent.trim() || "播放讲解");
    }
    btn.classList.add("playing");
    btn.textContent = "暂停讲解";
    currentBtn = btn;
  }

  function chunkBySentence(text) {
    return splitCues(text);
  }

  function speakFallback(text, btn) {
    if (!hasSynth()) {
      btn.disabled = true;
      btn.title = "当前浏览器不支持语音，且讲解音频未加载";
      btn.textContent = "语音不可用";
      return;
    }
    stopAll();
    markPlaying(btn);
    synthActive = true;
    const voice = pickVoice();
    const chunks = chunkBySentence(text);
    let i = 0;
    showCaption(chunks[0] || text);

    function next() {
      if (!synthActive || currentBtn !== btn) return;
      if (i >= chunks.length) {
        hideCaption();
        clearPlaying();
        synthActive = false;
        return;
      }
      const piece = chunks[i++];
      showCaption(piece);
      const u = new SpeechSynthesisUtterance(piece);
      u.lang = "zh-CN";
      u.rate = 0.95;
      u.pitch = 1;
      if (voice) u.voice = voice;
      u.onend = next;
      u.onerror = function () {
        hideCaption();
        clearPlaying();
        synthActive = false;
      };
      speechSynthesis.speak(u);
    }
    speechSynthesis.getVoices();
    next();
  }

  function playMp3(url, btn, fallbackText) {
    stopAll();
    const audio = new Audio(url);
    currentAudio = audio;
    markPlaying(btn);
    startCaptionSync(audio, fallbackText);
    audio.addEventListener("ended", function () {
      if (currentAudio === audio) currentAudio = null;
      hideCaption();
      clearPlaying();
    });
    audio.addEventListener("error", function () {
      if (currentAudio === audio) currentAudio = null;
      hideCaption();
      clearPlaying();
      speakFallback(fallbackText, btn);
    });
    const p = audio.play();
    if (p && typeof p.catch === "function") {
      p.catch(function () {
        if (currentAudio === audio) currentAudio = null;
        hideCaption();
        clearPlaying();
        speakFallback(fallbackText, btn);
      });
    }
  }

  function getText(id) {
    const src = document.getElementById(id);
    if (!src) return "";
    return (src.getAttribute("data-speech") || src.textContent || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  document.querySelectorAll("[data-voice]").forEach(function (btn) {
    if (!btn.getAttribute("data-label")) {
      btn.setAttribute("data-label", btn.textContent.trim() || "播放讲解");
    }
    btn.addEventListener("click", function () {
      if (btn.classList.contains("playing")) {
        stopAll();
        return;
      }
      const id = btn.getAttribute("data-voice");
      if (!id) return;
      const text = getText(id);
      const url = "audio/" + id + ".mp3";

      fetch(url, { method: "HEAD", cache: "no-cache" })
        .then(function (res) {
          if (res.ok) {
            playMp3(url, btn, text);
          } else {
            speakFallback(text, btn);
          }
        })
        .catch(function () {
          speakFallback(text, btn);
        });
    });
  });

  window.addEventListener("beforeunload", stopAll);
  document.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", function () {
      if (a.href && !a.href.includes("#")) stopAll();
    });
  });
})();
