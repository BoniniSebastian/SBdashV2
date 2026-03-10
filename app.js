(() => {
  const $ = (id) => document.getElementById(id);

  const prioCloseFab = $("prioCloseFab");
  const weatherCloseFab = $("weatherCloseFab");
  const placeholderCloseFab = $("placeholderCloseFab");

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

  const weatherPreviewTempBig = $("weatherPreviewTempBig");
  const weatherPreviewStatus = $("weatherPreviewStatus");
  const weatherPreviewMeta = $("weatherPreviewMeta");
  const weatherPreviewMeta2 = $("weatherPreviewMeta2");
  const weatherPreviewIcon = $("weatherPreviewIcon");

  const moduleSlot1 = $("moduleSlot1");
  const moduleSlot2 = $("moduleSlot2");
  const moduleSlotContent1 = $("moduleSlotContent1");
  const moduleSlotContent2 = $("moduleSlotContent2");

  const alarmAudio = $("alarmAudio");

  const prioOverlay = $("prioOverlay");
  const prioCard = $("prioCard");
  const prioPanelList = $("prioPanelList");
  const prioAddInput = $("prioAddInput");
  const prioAddBtn = $("prioAddBtn");

  const weatherOverlay = $("weatherOverlay");
  const weatherCard = $("weatherCard");
  const weatherHeroTemp = $("weatherHeroTemp");
  const weatherHeroStatus = $("weatherHeroStatus");
  const weatherHeroIcon = $("weatherHeroIcon");
  const weatherFeelsLike = $("weatherFeelsLike");
  const weatherWind = $("weatherWind");
  const weatherRain = $("weatherRain");
  const weatherRainChance = $("weatherRainChance");
  const weatherHours = $("weatherHours");
  const weatherTodayLine = $("weatherTodayLine");
  const weatherTomorrowLine = $("weatherTomorrowLine");

  const placeholderOverlay = $("placeholderOverlay");
  const placeholderCard = $("placeholderCard");
  const placeholderPanelName = $("placeholderPanelName");

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

  const WEATHER_TEXT = {
    0: "Klart",
    1: "Mest klart",
    2: "Växlande molnighet",
    3: "Mulet",
    45: "Dimma",
    48: "Rimfrostig dimma",
    51: "Lätt duggregn",
    53: "Duggregn",
    55: "Tätt duggregn",
    56: "Lätt underkylt duggregn",
    57: "Underkylt duggregn",
    61: "Lätt regn",
    63: "Regn",
    65: "Kraftigt regn",
    66: "Lätt underkylt regn",
    67: "Underkylt regn",
    71: "Lätt snö",
    73: "Snö",
    75: "Kraftig snö",
    77: "Snökorn",
    80: "Lätta skurar",
    81: "Skurar",
    82: "Kraftiga skurar",
    85: "Lätta snöbyar",
    86: "Kraftiga snöbyar",
    95: "Åska",
    96: "Åska med hagel",
    99: "Kraftig åska",
  };

  const DEFAULT_LOC = { name: "Värmdö", lat: 59.319, lon: 18.5 };

  const PRIO_KEY = "sbdash_prio_v1";
  const WEATHER_CACHE_KEY = "sbdash_weather_cache_v2";
  const SLOT1_KEY = "sbdash_slot1_index_v1";
  const SLOT2_KEY = "sbdash_slot2_index_v1";

  const WEATHER_CACHE_MS = 10 * 60 * 1000;

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
  let weatherData = null;

  let slot1Index = loadSlotIndex(SLOT1_KEY, 0); // modul 1
  let slot2Index = loadSlotIndex(SLOT2_KEY, 1); // modul 2

  const MODULES = [
    { id: "prio", label: "Modul 1" },
    { id: "weather", label: "Modul 2" },
    { id: "placeholder3", label: "Modul 3" },
    { id: "placeholder4", label: "Modul 4" },
    { id: "placeholder5", label: "Modul 5" },
    { id: "placeholder6", label: "Modul 6" },
    { id: "placeholder7", label: "Modul 7" },
  ];

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function uid() {
    return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random()}`;
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function loadSlotIndex(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      const n = Number(raw);
      if (Number.isInteger(n) && n >= 0) return n % MODULES.length;
      return fallback;
    } catch {
      return fallback;
    }
  }

  function saveSlotIndex(key, value) {
    localStorage.setItem(key, String(value));
  }

  function moduleAt(index) {
    return MODULES[((index % MODULES.length) + MODULES.length) % MODULES.length];
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
    closeAllModuleOverlays();

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

      if (!didMove) startTimer(PRESETS[TIMER.presetIndex]);
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

  function weatherText(code) {
    return WEATHER_TEXT[code] || "Väder";
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

  function loadWeatherCache() {
    try {
      const raw = localStorage.getItem(WEATHER_CACHE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (!parsed || !parsed.ts || !parsed.data) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function saveWeatherCache(data) {
    try {
      localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({
        ts: Date.now(),
        data,
      }));
    } catch {}
  }

  function fmtHour(iso) {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:00`;
  }

  function getUpcomingHours(data, count = 4) {
    const times = data?.hourly?.time || [];
    const temps = data?.hourly?.temperature_2m || [];
    const rainChance = data?.hourly?.precipitation_probability || [];
    const now = new Date();

    let i0 = times.findIndex((ti) => new Date(ti) >= now);
    if (i0 < 0) i0 = 0;

    const out = [];
    for (let k = 0; k < count; k++) {
      const i = i0 + k;
      if (!times[i]) break;
      out.push({
        time: fmtHour(times[i]),
        temp: Math.round(temps[i]),
        rainChance: Number.isFinite(rainChance[i]) ? Math.round(rainChance[i]) : 0,
      });
    }
    return out;
  }

  function renderWeatherEverywhere(data) {
    weatherData = data;
    if (!data?.current) return;

    const currentTemp = Math.round(data.current.temperature_2m ?? 0);
    const currentCode = data.current.weather_code ?? 0;
    const feels = Math.round(data.current.apparent_temperature ?? currentTemp);
    const wind = Math.round(data.current.wind_speed_10m ?? 0);
    const rain = Number.isFinite(data.current.precipitation) ? data.current.precipitation : 0;
    const icon = pickWeatherIcon(currentCode);
    const status = weatherText(currentCode);

    const todayMin = Math.round(data.daily?.temperature_2m_min?.[0] ?? currentTemp);
    const todayMax = Math.round(data.daily?.temperature_2m_max?.[0] ?? currentTemp);
    const tomorrowMin = Math.round(data.daily?.temperature_2m_min?.[1] ?? todayMin);
    const tomorrowMax = Math.round(data.daily?.temperature_2m_max?.[1] ?? todayMax);
    const tomorrowCode = data.daily?.weather_code?.[1] ?? currentCode);

    const hours = getUpcomingHours(data, 4);
    const firstRainChance = hours[0]?.rainChance ?? 0;

    if (weatherTemp) weatherTemp.textContent = `${currentTemp}°`;
    if (weatherIcon) weatherIcon.src = icon;

    if (weatherPreviewTempBig) weatherPreviewTempBig.textContent = `${currentTemp}°`;
    if (weatherPreviewStatus) weatherPreviewStatus.textContent = status;
    if (weatherPreviewMeta) weatherPreviewMeta.textContent = `Känns som ${feels}°`;
    if (weatherPreviewMeta2) weatherPreviewMeta2.textContent = `Vind ${wind} m/s`;
    if (weatherPreviewIcon) weatherPreviewIcon.src = icon;

    if (weatherHeroTemp) weatherHeroTemp.textContent = `${currentTemp}°`;
    if (weatherHeroStatus) weatherHeroStatus.textContent = status;
    if (weatherHeroIcon) weatherHeroIcon.src = icon;
    if (weatherFeelsLike) weatherFeelsLike.textContent = `${feels}°`;
    if (weatherWind) weatherWind.textContent = `${wind} m/s`;
    if (weatherRain) weatherRain.textContent = `${rain} mm`;
    if (weatherRainChance) weatherRainChance.textContent = `${firstRainChance}%`;

    if (weatherHours) {
      weatherHours.innerHTML = hours.map((h) => `
        <div class="weatherHour">
          <div class="weatherHourTime">${escapeHtml(h.time)}</div>
          <div class="weatherHourTemp">${h.temp}°</div>
          <div class="weatherHourRain">${h.rainChance}%</div>
        </div>
      `).join("");
    }

    if (weatherTodayLine) {
      weatherTodayLine.textContent = `Idag: ${todayMin}° – ${todayMax}° · ${status}`;
    }
    if (weatherTomorrowLine) {
      weatherTomorrowLine.textContent = `Imorgon: ${tomorrowMin}° – ${tomorrowMax}° · ${weatherText(tomorrowCode)}`;
    }
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
      `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation` +
      `&hourly=temperature_2m,precipitation_probability` +
      `&daily=temperature_2m_max,temperature_2m_min,weather_code` +
      `&timezone=auto`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("Weather fetch failed");
    return res.json();
  }

  async function initWeather() {
    const cached = loadWeatherCache();
    if (cached?.data) {
      renderWeatherEverywhere(cached.data);
      renderSlots();
    }

    try {
      const loc = await getCoords();
      const staleEnough = !cached || (Date.now() - cached.ts > WEATHER_CACHE_MS);

      if (staleEnough) {
        const fresh = await fetchWeather(loc.lat, loc.lon);
        saveWeatherCache(fresh);
        renderWeatherEverywhere(fresh);
        renderSlots();
      } else if (cached?.data) {
        setTimeout(async () => {
          try {
            const fresh = await fetchWeather(loc.lat, loc.lon);
            saveWeatherCache(fresh);
            renderWeatherEverywhere(fresh);
            renderSlots();
          } catch {}
        }, 300);
      }
    } catch (e) {
      console.warn("Weather error:", e);
    }

    setInterval(async () => {
      try {
        const loc = await getCoords();
        const fresh = await fetchWeather(loc.lat, loc.lon);
        saveWeatherCache(fresh);
        renderWeatherEverywhere(fresh);
        renderSlots();
      } catch {}
    }, WEATHER_CACHE_MS);
  }

  function renderPrioPreviewHTML() {
    const topFive = prios.slice(0, 5);

    if (!topFive.length) {
      return `
        <div class="prioPreviewRow">
          <span class="prioPreviewDot"></span>
          <span class="prioPreviewText" style="opacity:.45;">Tryck och lägg till dagens prios</span>
        </div>
      `;
    }

    const rows = topFive.map((item) => {
      const notePreview = item.note && item.note.trim()
        ? `<div class="prioPreviewNote">${escapeHtml(item.note.trim())}</div>`
        : "";

      return `
        <div class="prioPreviewRow ${item.done ? "is-done" : ""}">
          <span class="prioPreviewDot"></span>
          <div style="min-width:0;">
            <div class="prioPreviewText">${escapeHtml(item.text)}</div>
            ${notePreview}
          </div>
        </div>
      `;
    }).join("");

    const more = prios.length > 5
      ? `<div class="prioPreviewMore">+${prios.length - 5}</div>`
      : "";

    return rows + more;
  }

  function renderWeatherPreviewHTML() {
    const temp = weatherPreviewTempBig?.textContent || "--°";
    const status = weatherPreviewStatus?.textContent || "Laddar väder...";
    const meta1 = weatherPreviewMeta?.textContent || "—";
    const meta2 = weatherPreviewMeta2?.textContent || "—";
    const icon = weatherPreviewIcon?.getAttribute("src") || "assets/ui/weather/na.svg";

    return `
      <div class="weatherPreview">
        <div class="weatherPreviewText">
          <div class="weatherPreviewTempBig">${escapeHtml(temp)}</div>
          <div class="weatherPreviewStatus">${escapeHtml(status)}</div>
          <div class="weatherPreviewMeta">${escapeHtml(meta1)}</div>
          <div class="weatherPreviewMeta">${escapeHtml(meta2)}</div>
        </div>
        <div class="weatherPreviewVisual">
          <img class="weatherPreviewIcon" src="${escapeHtml(icon)}" alt="" draggable="false" />
        </div>
      </div>
    `;
  }

  function renderPlaceholderHTML(label) {
    return `<div class="placeholderPreview">${escapeHtml(label)}</div>`;
  }

  function renderSlot(slotEl, moduleDef) {
    if (!slotEl) return;

    if (moduleDef.id === "prio") {
      slotEl.innerHTML = `<div class="moduleSlotContent">${renderPrioPreviewHTML()}</div>`;
      return;
    }

    if (moduleDef.id === "weather") {
      slotEl.innerHTML = `<div class="moduleSlotContent">${renderWeatherPreviewHTML()}</div>`;
      return;
    }

    slotEl.innerHTML = `<div class="moduleSlotContent">${renderPlaceholderHTML(moduleDef.label)}</div>`;
  }

  function renderSlots() {
    renderSlot(moduleSlot1, moduleAt(slot1Index));
    renderSlot(moduleSlot2, moduleAt(slot2Index));
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
    const next = prios.map((item) =>
      item.id === id ? { ...item, done } : item
    );

    const active = next.filter((item) => !item.done);
    const completed = next.filter((item) => item.done);

    prios = [...active, ...completed];

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
    renderSlots();
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
    renderPrioPanel();
    renderSlots();
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

    requestAnimationFrame(() => {
      const editor = prioPanelList?.querySelector(".prioItem:last-child .prioNoteInput");
      editor?.focus();
    });
  }

  function closeAllModuleOverlays() {
    closePrioOverlay();
    closeWeatherOverlay();
    closePlaceholderOverlay();
  }

  function openPrioOverlay({ focusAdd = false } = {}) {
    if (!prioOverlay) return;
    closeTimerFocus();
    closeWeatherOverlay();
    closePlaceholderOverlay();

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
    renderSlots();
  }

  function openWeatherOverlay() {
    if (!weatherOverlay) return;
    closeTimerFocus();
    closePrioOverlay();
    closePlaceholderOverlay();
    weatherOverlay.classList.add("open");
    weatherOverlay.setAttribute("aria-hidden", "false");
  }

  function closeWeatherOverlay() {
    if (!weatherOverlay) return;
    weatherOverlay.classList.remove("open");
    weatherOverlay.setAttribute("aria-hidden", "true");
  }

  function openPlaceholderOverlay(label) {
    if (!placeholderOverlay) return;
    closeTimerFocus();
    closePrioOverlay();
    closeWeatherOverlay();
    if (placeholderPanelName) placeholderPanelName.textContent = label;
    placeholderOverlay.classList.add("open");
    placeholderOverlay.setAttribute("aria-hidden", "false");
  }

  function closePlaceholderOverlay() {
    if (!placeholderOverlay) return;
    placeholderOverlay.classList.remove("open");
    placeholderOverlay.setAttribute("aria-hidden", "true");
  }

  function openModuleByIndex(index, slotName) {
    const mod = moduleAt(index);
    if (mod.id === "prio") {
      openPrioOverlay();
      return;
    }
    if (mod.id === "weather") {
      openWeatherOverlay();
      return;
    }
    openPlaceholderOverlay(mod.label);
  }

  function shiftSlot(slotNo, dir) {
    if (slotNo === 1) {
      slot1Index = (slot1Index + dir + MODULES.length) % MODULES.length;
      saveSlotIndex(SLOT1_KEY, slot1Index);
    } else {
      slot2Index = (slot2Index + dir + MODULES.length) % MODULES.length;
      saveSlotIndex(SLOT2_KEY, slot2Index);
    }
    renderSlots();
  }

  function bindSlotBand(slotEl, slotNo) {
    if (!slotEl) return;

    let startX = 0;
    let startY = 0;
    let tracking = false;
    let moved = false;

    slotEl.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse") return;
      startX = e.clientX;
      startY = e.clientY;
      tracking = true;
      moved = false;
    });

    slotEl.addEventListener("pointermove", (e) => {
      if (!tracking) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy)) {
        moved = true;
        tracking = false;
        if (dx < 0) shiftSlot(slotNo, +1);   // swipe left => next
        else shiftSlot(slotNo, -1);          // swipe right => prev
      }
    });

    const endTracking = () => {
      tracking = false;
    };

    slotEl.addEventListener("pointerup", endTracking);
    slotEl.addEventListener("pointercancel", endTracking);
    slotEl.addEventListener("pointerleave", endTracking);

    slotEl.addEventListener("wheel", (e) => {
      e.preventDefault();
      const dir = e.deltaY > 0 ? +1 : -1;
      shiftSlot(slotNo, dir);
    }, { passive: false });

    slotEl.addEventListener("click", () => {
      if (moved) {
        moved = false;
        return;
      }
      openModuleByIndex(slotNo === 1 ? slot1Index : slot2Index, `slot${slotNo}`);
    });
  }

  function bindPrioUI() {
    let pressTimer = 0;
    let startX = 0;
    let startY = 0;

    moduleSlot2?.addEventListener("pointerdown", (e) => {
      if (moduleAt(slot2Index).id !== "prio") return;

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

    moduleSlot2?.addEventListener("pointermove", (e) => {
      if (!pressTimer) return;
      if (Math.hypot(e.clientX - startX, e.clientY - startY) > 10) {
        cancelLongPress();
      }
    });

    moduleSlot2?.addEventListener("pointerup", cancelLongPress);
    moduleSlot2?.addEventListener("pointercancel", cancelLongPress);
    moduleSlot2?.addEventListener("pointerleave", cancelLongPress);

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
    let swipeActive = false;

    prioCard?.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse") {
        swipeStartY = null;
        swipeActive = false;
        return;
      }

      if (e.target.closest("input, textarea, button, label")) {
        swipeStartY = null;
        swipeActive = false;
        return;
      }

      swipeStartY = e.clientY;
      swipeActive = true;
      prioCard.setPointerCapture?.(e.pointerId);
    });

    prioCard?.addEventListener("pointermove", (e) => {
      if (!swipeActive || swipeStartY == null) return;

      const delta = e.clientY - swipeStartY;
      if (delta > 0) {
        prioCard.style.transform = `translateY(${delta}px)`;
      }
    });

    const endSwipe = () => {
      if (!swipeActive || swipeStartY == null) return;

      const match = prioCard.style.transform.match(/translateY\(([-0-9.]+)px\)/);
      const delta = match ? parseFloat(match[1]) : 0;

      prioCard.style.transform = "";
      swipeStartY = null;
      swipeActive = false;

      if (delta > 120) {
        closePrioOverlay();
      }
    };

    prioCard?.addEventListener("pointerup", endSwipe);
    prioCard?.addEventListener("pointercancel", () => {
      prioCard.style.transform = "";
      swipeStartY = null;
      swipeActive = false;
    });
  }

  function bindWeatherUI() {
    weatherOverlay?.addEventListener("click", (e) => {
      if (e.target === weatherOverlay) closeWeatherOverlay();
    });

    let swipeStartY = null;
    let swipeActive = false;

    weatherCard?.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse") {
        swipeStartY = null;
        swipeActive = false;
        return;
      }

      if (e.target.closest("input, textarea, button, label")) {
        swipeStartY = null;
        swipeActive = false;
        return;
      }

      swipeStartY = e.clientY;
      swipeActive = true;
      weatherCard.setPointerCapture?.(e.pointerId);
    });

    weatherCard?.addEventListener("pointermove", (e) => {
      if (!swipeActive || swipeStartY == null) return;

      const delta = e.clientY - swipeStartY;
      if (delta > 0) {
        weatherCard.style.transform = `translateY(${delta}px)`;
      }
    });

    const endSwipe = () => {
      if (!swipeActive || swipeStartY == null) return;

      const match = weatherCard.style.transform.match(/translateY\(([-0-9.]+)px\)/);
      const delta = match ? parseFloat(match[1]) : 0;

      weatherCard.style.transform = "";
      swipeStartY = null;
      swipeActive = false;

      if (delta > 120) {
        closeWeatherOverlay();
      }
    };

    weatherCard?.addEventListener("pointerup", endSwipe);
    weatherCard?.addEventListener("pointercancel", () => {
      weatherCard.style.transform = "";
      swipeStartY = null;
      swipeActive = false;
    });
  }

  function bindPlaceholderUI() {
    placeholderOverlay?.addEventListener("click", (e) => {
      if (e.target === placeholderOverlay) closePlaceholderOverlay();
    });

    let swipeStartY = null;
    let swipeActive = false;

    placeholderCard?.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse") {
        swipeStartY = null;
        swipeActive = false;
        return;
      }

      if (e.target.closest("input, textarea, button, label")) {
        swipeStartY = null;
        swipeActive = false;
        return;
      }

      swipeStartY = e.clientY;
      swipeActive = true;
      placeholderCard.setPointerCapture?.(e.pointerId);
    });

    placeholderCard?.addEventListener("pointermove", (e) => {
      if (!swipeActive || swipeStartY == null) return;

      const delta = e.clientY - swipeStartY;
      if (delta > 0) {
        placeholderCard.style.transform = `translateY(${delta}px)`;
      }
    });

    const endSwipe = () => {
      if (!swipeActive || swipeStartY == null) return;

      const match = placeholderCard.style.transform.match(/translateY\(([-0-9.]+)px\)/);
      const delta = match ? parseFloat(match[1]) : 0;

      placeholderCard.style.transform = "";
      swipeStartY = null;
      swipeActive = false;

      if (delta > 120) {
        closePlaceholderOverlay();
      }
    };

    placeholderCard?.addEventListener("pointerup", endSwipe);
    placeholderCard?.addEventListener("pointercancel", () => {
      placeholderCard.style.transform = "";
      swipeStartY = null;
      swipeActive = false;
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
        if (weatherOverlay?.classList.contains("open")) {
          closeWeatherOverlay();
          return;
        }
        if (placeholderOverlay?.classList.contains("open")) {
          closePlaceholderOverlay();
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

    bindSlotBand(moduleSlot1, 1);
    bindSlotBand(moduleSlot2, 2);

    bindPrioUI();
    bindWeatherUI();
    bindPlaceholderUI();

    prioCloseFab?.addEventListener("click", closePrioOverlay);
    weatherCloseFab?.addEventListener("click", closeWeatherOverlay);
    placeholderCloseFab?.addEventListener("click", closePlaceholderOverlay);
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
    renderSlots();
  }

  init();
})();