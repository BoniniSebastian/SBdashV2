(() => {
  const $ = (id) => document.getElementById(id);

  const clockDate = $("clockDate");
  const clockTime = $("clockTime");

  const timerIconBtn = $("timerIconBtn");
  const timerFocus = $("timerFocus");
  const timerWheel = $("timerWheel");
  const timerWheelRing = $("timerWheelRing");
  const timerWheelValue = $("timerWheelValue");

  const timerBarWrap = $("timerBarWrap");
  const timerBar = $("timerBar");

  const weatherIcon = $("weatherIcon");
  const weatherTemp = $("weatherTemp");

  const alarmAudio = $("alarmAudio");

  const moduleSlot1 = $("moduleSlot1");
  const prioPreview = $("prioPreview");
  const prioOverlay = $("prioOverlay");
  const prioCard = $("prioCard");
  const prioPanelList = $("prioPanelList");
  const prioAddInput = $("prioAddInput");
  const prioAddBtn = $("prioAddBtn");

  const PRESETS = [1, 5, 10, 15, 30];
  const STEP = 360 / PRESETS.length;

  const WEATHER_ICONS = {
    clear: "assets/ui/weather/clear.svg",
    cloudy: "assets/ui/weather/cloudy.svg",
    rain: "assets/ui/weather/rain.svg",
    snow: "assets/ui/weather/snow.svg",
    fog: "assets/ui/weather/fog.svg",
    thunder: "assets/ui/weather/thunder.svg",
    na: "assets/ui/weather/na.svg",
  };

  const DEFAULT_LOC = { name: "Värmdö", lat: 59.319, lon: 18.5 };
  const PRIO_KEY = "sbdash_prio_v1";

  const TIMER = {
    presetIndex: 1,
    total: 0,
    left: 0,
    running: false,
    endAt: 0,
    intervalId: 0,
    finished: false,
  };

  let prios = loadPrios();
  let prioEditingId = null;
  let prioLongPressTriggered = false;

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function uid() {
    return (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random()}`);
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function defaultPrios() {
    return [
      { id: uid(), text: "Köp mjölk", note: "", done: false },
      { id: uid(), text: "Ring tandläkaren", note: "", done: false },
      { id: uid(), text: "Maila XX", note: "", done: false },
    ];
  }

  function loadPrios() {
    try {
      const raw = localStorage.getItem(PRIO_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (!Array.isArray(parsed)) return defaultPrios();

      return parsed
        .filter((x) => x && typeof x === "object")
        .map((x) => ({
          id: x.id || uid(),
          text: String(x.text || "").trim(),
          note: String(x.note || ""),
          done: !!x.done,
        }))
        .filter((x) => x.text);
    } catch {
      return defaultPrios();
    }
  }

  function savePrios() {
    localStorage.setItem(PRIO_KEY, JSON.stringify(prios));
  }

  function updateClock() {
    const now = new Date();

    const weekday = now.toLocaleDateString("sv-SE", { weekday: "long" }).toUpperCase();
    const day = now.toLocaleDateString("sv-SE", { day: "numeric" });
    const month = now.toLocaleDateString("sv-SE", { month: "long" }).toUpperCase();

    const h = pad2(now.getHours());
    const m = pad2(now.getMinutes());

    if (clockDate) clockDate.textContent = `${weekday} | ${day} ${month}`;
    if (clockTime) clockTime.textContent = `${h}:${m}`;
  }

  function setTimerDisplayValue() {
    if (!timerWheelValue) return;
    timerWheelValue.textContent = String(PRESETS[TIMER.presetIndex]);
  }

  function openTimerFocus({ finished = false } = {}) {
    if (!timerFocus) return;
    closePrioOverlay();

    TIMER.finished = finished;
    document.body.classList.toggle("timerFinished", finished);
    timerFocus.classList.add("open");
    timerFocus.setAttribute("aria-hidden", "false");
    setTimerDisplayValue();
  }

  function closeTimerFocus() {
    if (!timerFocus) return;
    TIMER.finished = false;
    document.body.classList.remove("timerFinished");
    timerFocus.classList.remove("open");
    timerFocus.setAttribute("aria-hidden", "true");
  }

  function stopTimerInternal() {
    TIMER.running = false;
    if (TIMER.intervalId) clearInterval(TIMER.intervalId);
    TIMER.intervalId = 0;
    document.body.classList.remove("timerRunning");
    timerBarWrap?.setAttribute("aria-hidden", "true");
  }

  function updateTimerBar() {
    if (!timerBar) return;
    const pct = TIMER.total > 0 ? TIMER.left / TIMER.total : 0;
    timerBar.style.transform = `scaleX(${Math.max(0, Math.min(1, pct))})`;
  }

  function beepFallback() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.value = 0.08;

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      setTimeout(() => {
        osc.stop();
        ctx.close();
      }, 1000);
    } catch {}
  }

  function playAlarm() {
    if (alarmAudio?.querySelector("source")) {
      alarmAudio.currentTime = 0;
      alarmAudio.play().catch(() => beepFallback());
      return;
    }
    beepFallback();
  }

  function tickTimer() {
    if (!TIMER.running) return;

    TIMER.left = Math.max(0, Math.ceil((TIMER.endAt - Date.now()) / 1000));
    updateTimerBar();

    if (TIMER.left <= 0) {
      stopTimerInternal();
      updateTimerBar();
      playAlarm();
      openTimerFocus({ finished: true });
    }
  }

  function startTimer(minutes) {
    const min = Number(minutes);
    if (!Number.isFinite(min) || min <= 0) return;

    closeTimerFocus();
    stopTimerInternal();

    TIMER.total = Math.round(min * 60);
    TIMER.left = TIMER.total;
    TIMER.endAt = Date.now() + TIMER.total * 1000;
    TIMER.running = true;
    TIMER.finished = false;

    document.body.classList.add("timerRunning");
    document.body.classList.remove("timerFinished");

    timerBarWrap?.setAttribute("aria-hidden", "false");
    updateTimerBar();
    tickTimer();

    TIMER.intervalId = setInterval(tickTimer, 250);
  }

  function sectorFromDeg(deg) {
    const raw = Math.round(deg / STEP);
    return ((raw % PRESETS.length) + PRESETS.length) % PRESETS.length;
  }

  function makeWheelEngine() {
    if (!timerWheel || !timerWheelRing) return;

    let dragging = false;
    let startAngle = 0;
    let rotationDeg = TIMER.presetIndex * STEP;
    let didMove = false;

    const angle = (cx, cy, x, y) => Math.atan2(y - cy, x - cx) * (180 / Math.PI);

    function apply(deg) {
      rotationDeg = deg;
      timerWheelRing.style.transform = `rotate(${deg}deg)`;
      TIMER.presetIndex = sectorFromDeg(deg);
      setTimerDisplayValue();
    }

    apply(rotationDeg);

    timerWheel.addEventListener("pointerdown", (e) => {
      if (TIMER.running) return;

      dragging = true;
      didMove = false;

      const r = timerWheel.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;

      startAngle = angle(cx, cy, e.clientX, e.clientY) - rotationDeg;
      timerWheel.setPointerCapture?.(e.pointerId);
    }, { passive: true });

    timerWheel.addEventListener("pointermove", (e) => {
      if (!dragging || TIMER.running) return;

      const r = timerWheel.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;

      const deg = angle(cx, cy, e.clientX, e.clientY) - startAngle;
      if (!didMove) didMove = true;
      apply(deg);
      e.preventDefault();
    }, { passive: false });

    timerWheel.addEventListener("pointerup", () => {
      if (!dragging || TIMER.running) return;
      dragging = false;

      const snapped = TIMER.presetIndex * STEP;
      apply(snapped);

      if (!didMove) {
        startTimer(PRESETS[TIMER.presetIndex]);
      }
    }, { passive: true });

    timerWheel.addEventListener("pointercancel", () => {
      dragging = false;
    }, { passive: true });

    timerWheel.addEventListener("wheel", (e) => {
      if (!timerFocus.classList.contains("open") || TIMER.running) return;

      e.preventDefault();
      const dir = e.deltaY > 0 ? 1 : -1;
      TIMER.presetIndex = (TIMER.presetIndex + dir + PRESETS.length) % PRESETS.length;
      apply(TIMER.presetIndex * STEP);
    }, { passive: false });

    timerFocus.addEventListener("click", (e) => {
      if (e.target === timerFocus && !TIMER.finished) closeTimerFocus();
    });
  }

  function pickWeatherIcon(code) {
    if (code === 0) return WEATHER_ICONS.clear;
    if (code >= 1 && code <= 3) return WEATHER_ICONS.cloudy;
    if (code === 45 || code === 48) return WEATHER_ICONS.fog;
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return WEATHER_ICONS.rain;
    if (code >= 71 && code <= 77) return WEATHER_ICONS.snow;
    if (code >= 95) return WEATHER_ICONS.thunder;
    return WEATHER_ICONS.na;
  }

  async function getCoords() {
    if ("geolocation" in navigator) {
      try {
        const pos = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 2500,
            maximumAge: 60000,
          })
        );

        return {
          name: "Här",
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        };
      } catch {}
    }
    return DEFAULT_LOC;
  }

  async function fetchWeather(lat, lon) {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${encodeURIComponent(lat)}` +
      `&longitude=${encodeURIComponent(lon)}` +
      `&current=temperature_2m,weather_code` +
      `&timezone=auto`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("Weather fetch failed");
    return res.json();
  }

  async function initWeather() {
    try {
      const loc = await getCoords();
      const data = await fetchWeather(loc.lat, loc.lon);
      const t = Math.round(data.current.temperature_2m);
      const code = data.current.weather_code;

      if (weatherTemp) weatherTemp.textContent = `${t}°`;
      if (weatherIcon) weatherIcon.src = pickWeatherIcon(code);
    } catch (e) {
      console.warn("Weather error:", e);
    }

    setInterval(async () => {
      try {
        const loc = await getCoords();
        const data = await fetchWeather(loc.lat, loc.lon);
        const t = Math.round(data.current.temperature_2m);
        const code = data.current.weather_code;

        if (weatherTemp) weatherTemp.textContent = `${t}°`;
        if (weatherIcon) weatherIcon.src = pickWeatherIcon(code);
      } catch {}
    }, 10 * 60 * 1000);
  }

  function renderPrioPreview() {
    if (!prioPreview) return;

    const topFive = prios.slice(0, 5);

    if (!topFive.length) {
      prioPreview.innerHTML = `
        <div class="prioPreviewRow">
          <span class="prioPreviewDot"></span>
          <span class="prioPreviewText" style="opacity:.45;">Tryck och lägg till dagens prios</span>
        </div>
      `;
      return;
    }

    const rows = topFive.map((item) => `
      <div class="prioPreviewRow ${item.done ? "is-done" : ""}">
        <span class="prioPreviewDot"></span>
        <span class="prioPreviewText">${escapeHtml(item.text)}</span>
      </div>
    `).join("");

    const more = prios.length > 5
      ? `<div class="prioPreviewMore">+${prios.length - 5}</div>`
      : "";

    prioPreview.innerHTML = rows + more;
  }

  function movePrio(index, dir) {
    const next = index + dir;
    if (next < 0 || next >= prios.length) return;
    const copy = [...prios];
    [copy[index], copy[next]] = [copy[next], copy[index]];
    prios = copy;
    savePrios();
    renderPrios();
  }

  function togglePrioDone(id, done) {
    prios = prios.map((item) => item.id === id ? { ...item, done } : item);
    savePrios();
    renderPrios();
  }

  function removePrio(id) {
    prios = prios.filter((item) => item.id !== id);
    if (prioEditingId === id) prioEditingId = null;
    savePrios();
    renderPrios();
  }

  function updatePrioField(id, patch) {
    prios = prios.map((item) => item.id === id ? { ...item, ...patch } : item);
    savePrios();
    renderPrioPreview();
  }

  function renderPrioPanel() {
    if (!prioPanelList) return;

    prioPanelList.innerHTML = "";

    prios.forEach((item, index) => {
      const isEditing = prioEditingId === item.id;

      const row = document.createElement("div");
      row.className = `prioItem ${item.done ? "is-done" : ""}`;

      row.innerHTML = `
        <div class="prioItemMain">
          <input class="prioCheck" type="checkbox" ${item.done ? "checked" : ""} aria-label="Klar" />
          <button class="prioItemTextBtn" type="button">${escapeHtml(item.text)}</button>
          <div class="prioItemActions">
            <button class="prioMiniBtn prioMoveUp" type="button" aria-label="Flytta upp" ${index === 0 ? "disabled" : ""}>↑</button>
            <button class="prioMiniBtn prioMoveDown" type="button" aria-label="Flytta ner" ${index === prios.length - 1 ? "disabled" : ""}>↓</button>
          </div>
        </div>
      `;

      const check = row.querySelector(".prioCheck");
      const textBtn = row.querySelector(".prioItemTextBtn");
      const upBtn = row.querySelector(".prioMoveUp");
      const downBtn = row.querySelector(".prioMoveDown");

      check?.addEventListener("change", (e) => {
        togglePrioDone(item.id, !!e.target.checked);
      });

      textBtn?.addEventListener("click", () => {
        prioEditingId = prioEditingId === item.id ? null : item.id;
        renderPrioPanel();
      });

      upBtn?.addEventListener("click", () => movePrio(index, -1));
      downBtn?.addEventListener("click", () => movePrio(index, 1));

      if (isEditing) {
        const editor = document.createElement("div");
        editor.className = "prioEditor";
        editor.innerHTML = `
          <input class="prioTextInput" type="text" maxlength="160" value="${escapeHtml(item.text)}" />
          <textarea class="prioNoteInput" maxlength="600" placeholder="Anteckning...">${escapeHtml(item.note || "")}</textarea>
          <div class="prioEditorActions">
            <button class="prioDeleteBtn" type="button">Ta bort</button>
          </div>
        `;

        const textInput = editor.querySelector(".prioTextInput");
        const noteInput = editor.querySelector(".prioNoteInput");
        const deleteBtn = editor.querySelector(".prioDeleteBtn");

        textInput?.addEventListener("input", (e) => {
          updatePrioField(item.id, { text: e.target.value });
        });

        noteInput?.addEventListener("input", (e) => {
          updatePrioField(item.id, { note: e.target.value });
        });

        deleteBtn?.addEventListener("click", () => {
          removePrio(item.id);
        });

        row.appendChild(editor);
      }

      prioPanelList.appendChild(row);
    });
  }

  function renderPrios() {
    renderPrioPreview();
    renderPrioPanel();
  }

  function addPrioFromInput() {
    const text = (prioAddInput?.value || "").trim();
    if (!text) return;

    const item = {
      id: uid(),
      text,
      note: "",
      done: false,
    };

    prios = [...prios, item];
    savePrios();
    prioAddInput.value = "";
    prioEditingId = item.id;
    renderPrios();
  }

  function openPrioOverlay({ focusAdd = false } = {}) {
    if (!prioOverlay) return;
    closeTimerFocus();

    prioOverlay.classList.add("open");
    prioOverlay.setAttribute("aria-hidden", "false");
    renderPrios();

    if (focusAdd) {
      requestAnimationFrame(() => prioAddInput?.focus());
    }
  }

  function closePrioOverlay() {
    if (!prioOverlay) return;
    prioOverlay.classList.remove("open");
    prioOverlay.setAttribute("aria-hidden", "true");
    prioEditingId = null;
    renderPrioPreview();
  }

  function bindPrioUI() {
    let pressTimer = 0;
    let startX = 0;
    let startY = 0;

    moduleSlot1?.addEventListener("click", () => {
      if (prioLongPressTriggered) {
        prioLongPressTriggered = false;
        return;
      }
      openPrioOverlay();
    });

    moduleSlot1?.addEventListener("pointerdown", (e) => {
      startX = e.clientX;
      startY = e.clientY;
      prioLongPressTriggered = false;

      pressTimer = window.setTimeout(() => {
        prioLongPressTriggered = true;
        openPrioOverlay({ focusAdd: true });
      }, 420);
    });

    const cancelLongPress = () => {
      if (pressTimer) clearTimeout(pressTimer);
      pressTimer = 0;
    };

    moduleSlot1?.addEventListener("pointermove", (e) => {
      if (!pressTimer) return;
      if (Math.hypot(e.clientX - startX, e.clientY - startY) > 10) {
        cancelLongPress();
      }
    });

    moduleSlot1?.addEventListener("pointerup", cancelLongPress);
    moduleSlot1?.addEventListener("pointercancel", cancelLongPress);
    moduleSlot1?.addEventListener("pointerleave", cancelLongPress);

    prioAddBtn?.addEventListener("click", addPrioFromInput);
    prioAddInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addPrioFromInput();
      }
    });

    prioOverlay?.addEventListener("click", (e) => {
      if (e.target === prioOverlay) {
        closePrioOverlay();
      }
    });

    let swipeStartY = null;

    prioCard?.addEventListener("pointerdown", (e) => {
      swipeStartY = e.clientY;
      prioCard.setPointerCapture?.(e.pointerId);
    });

    prioCard?.addEventListener("pointermove", (e) => {
      if (swipeStartY == null) return;
      const delta = e.clientY - swipeStartY;
      if (delta > 0) {
        prioCard.style.transform = `translateY(${delta}px)`;
      }
    });

    const endSwipe = () => {
      if (swipeStartY == null) return;
      const match = prioCard.style.transform.match(/translateY\(([-0-9.]+)px\)/);
      const delta = match ? parseFloat(match[1]) : 0;
      prioCard.style.transform = "";
      swipeStartY = null;

      if (delta > 120) {
        closePrioOverlay();
      }
    };

    prioCard?.addEventListener("pointerup", endSwipe);
    prioCard?.addEventListener("pointercancel", () => {
      prioCard.style.transform = "";
      swipeStartY = null;
    });
  }

  function bindUI() {
    timerIconBtn?.addEventListener("click", () => {
      openTimerFocus({ finished: false });
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (prioOverlay?.classList.contains("open")) {
          closePrioOverlay();
          return;
        }
        if (timerFocus?.classList.contains("open") && !TIMER.running) {
          closeTimerFocus();
        }
      }
    });

    timerWheel?.addEventListener("click", () => {
      if (TIMER.finished) {
        document.body.classList.remove("timerFinished");
      }
    });

    bindPrioUI();
  }

  function init() {
    updateClock();
    setInterval(updateClock, 1000);

    timerBarWrap?.setAttribute("aria-hidden", "true");
    updateTimerBar();

    setTimerDisplayValue();
    makeWheelEngine();
    bindUI();
    initWeather();
    renderPrios();
  }

  init();
})();
