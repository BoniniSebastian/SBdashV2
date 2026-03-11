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

  const moduleSlot1 = $("moduleSlot1");
  const moduleSlot2 = $("moduleSlot2");
  const moduleSlot1Content = $("moduleSlot1Content");
  const moduleSlot2Content = $("moduleSlot2Content");

  const prioOverlay = $("prioOverlay");
  const prioCard = $("prioCard");
  const prioPanelList = $("prioPanelList");
  const prioAddInput = $("prioAddInput");
  const prioAddBtn = $("prioAddBtn");
  const prioCloseFab = $("prioCloseFab");

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
  const weatherCloseFab = $("weatherCloseFab");

  const genericOverlay = $("genericOverlay");
  const genericCard = $("genericCard");
  const genericTitle = $("genericTitle");
  const genericBody = $("genericBody");
  const genericCloseFab = $("genericCloseFab");

  const alarmAudio = $("alarmAudio");

  const PRESETS = [1, 5, 10, 15, 30];
  const STEP = 360 / PRESETS.length;

  const MODULE_COUNT = 7;
  const SLOT_DEFAULTS = { slot1: 1, slot2: 2 };

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
  const WEATHER_CACHE_KEY = "sbdash_weather_cache_v1";
  const WEATHER_CACHE_MS = 10 * 60 * 1000;

  const SLOT_STATE = {
    slot1: SLOT_DEFAULTS.slot1,
    slot2: SLOT_DEFAULTS.slot2,
  };

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
  let genericOpenModule = 4;

  const MODULES = {
    1: {
      id: 1,
      title: "Prio",
      renderPreview: renderPrioPreviewMarkup,
      open: () => openPrioOverlay(),
    },
    2: {
      id: 2,
      title: "Väder",
      renderPreview: renderWeatherPreviewMarkup,
      open: () => openWeatherOverlay(),
    },
    3: {
      id: 3,
      title: "Timer",
      renderPreview: renderTimerPreviewMarkup,
      open: () => openTimerFocus({ finished: TIMER.finished }),
    },
    4: {
      id: 4,
      title: "Modul 4",
      renderPreview: () => renderPlaceholderPreviewMarkup(4),
      open: () => openGenericOverlay(4),
    },
    5: {
      id: 5,
      title: "Modul 5",
      renderPreview: () => renderPlaceholderPreviewMarkup(5),
      open: () => openGenericOverlay(5),
    },
    6: {
      id: 6,
      title: "Modul 6",
      renderPreview: () => renderPlaceholderPreviewMarkup(6),
      open: () => openGenericOverlay(6),
    },
    7: {
      id: 7,
      title: "Modul 7",
      renderPreview: () => renderPlaceholderPreviewMarkup(7),
      open: () => openGenericOverlay(7),
    },
  };

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

  function wrapModuleIndex(n) {
    return ((n - 1 + MODULE_COUNT * 1000) % MODULE_COUNT) + 1;
  }

  function getModule(id) {
    return MODULES[wrapModuleIndex(id)];
  }

  function shiftSlot(slotKey, direction) {
    SLOT_STATE[slotKey] = wrapModuleIndex(SLOT_STATE[slotKey] + direction);
    renderSlots();
  }

  function openSlotModule(slotKey) {
    const mod = getModule(SLOT_STATE[slotKey]);
    if (!mod) return;
    mod.open();
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
    renderSlots();
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
    renderSlots();

    if (TIMER.left <= 0) {
      stopTimerInternal();
      updateTimerBar();
      renderSlots();
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
    renderSlots();
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

  function getWeatherPreviewData() {
    if (!weatherData?.current) {
      return {
        currentTemp: "--",
        status: "Laddar väder...",
        feels: "—",
        wind: "—",
        icon: WEATHER_ICONS.na,
      };
    }

    const currentTemp = Math.round(weatherData.current.temperature_2m ?? 0);
    const currentCode = weatherData.current.weather_code ?? 0;
    const feels = Math.round(weatherData.current.apparent_temperature ?? currentTemp);
    const wind = Math.round(weatherData.current.wind_speed_10m ?? 0);

    return {
      currentTemp,
      status: weatherText(currentCode),
      feels,
      wind,
      icon: pickWeatherIcon(currentCode),
    };
  }

  function renderPrioPreviewMarkup() {
    const topFive = prios.slice(0, 5);

    if (!topFive.length) {
      return `
        <div class="moduleSlotTrack">
          <div class="prioPreview">
            <div class="prioPreviewRow">
              <span class="prioPreviewDot"></span>
              <span class="prioPreviewText" style="opacity:.45;">Tryck och lägg till dagens prios</span>
            </div>
          </div>
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

    return `
      <div class="moduleSlotTrack">
        <div class="prioPreview">
          ${rows}
          ${more}
        </div>
      </div>
    `;
  }

  function renderWeatherPreviewMarkup() {
    const info = getWeatherPreviewData();

    return `
      <div class="moduleSlotTrack">
        <div class="weatherPreview">
          <div class="weatherPreviewText">
            <div class="weatherPreviewTempBig">${escapeHtml(info.currentTemp)}°</div>
            <div class="weatherPreviewStatus">${escapeHtml(info.status)}</div>
            <div class="weatherPreviewMeta">Känns som ${escapeHtml(info.feels)}°</div>
            <div class="weatherPreviewMeta">Vind ${escapeHtml(info.wind)} m/s</div>
          </div>

          <div class="weatherPreviewVisual">
            <img class="weatherPreviewIcon" src="${escapeHtml(info.icon)}" alt="" draggable="false" />
          </div>
        </div>
      </div>
    `;
  }

  function formatTimerPreviewTime(totalSeconds) {
    const secs = Math.max(0, Math.floor(totalSeconds || 0));
    const mm = String(Math.floor(secs / 60)).padStart(2, "0");
    const ss = String(secs % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }

  function renderTimerPreviewMarkup() {
    const centerText = TIMER.running
      ? formatTimerPreviewTime(TIMER.left)
      : "TIMER";

    const centerClass = TIMER.running
      ? "timerPreviewValue"
      : "timerPreviewLabel";

    return `
      <div class="timerPreview">
        <div class="timerPreviewWheel">
          <div class="timerPreviewCenter">
            <div class="${centerClass}">${escapeHtml(centerText)}</div>
          </div>
        </div>
      </div>
    `;
  }

  function renderPlaceholderPreviewMarkup(n) {
    return `
      <div class="modulePlaceholder">
        <div class="modulePlaceholderBody">
          <div class="modulePlaceholderTitle">Modul ${n}</div>
          <div class="modulePlaceholderText">
            Tom placeholder just nu. Den här modulen är redo att byggas när du vill.
          </div>
        </div>
      </div>
    `;
  }

  function renderSlot(slotKey, el) {
    if (!el) return;
    const mod = getModule(SLOT_STATE[slotKey]);
    el.innerHTML = mod.renderPreview();
  }

  function renderSlots() {
    renderSlot("slot1", moduleSlot1Content);
    renderSlot("slot2", moduleSlot2Content);
  }

  function renderWeather(data) {
    weatherData = data;
    renderSlots();

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
    const tomorrowCode = data.daily?.weather_code?.[1] ?? currentCode;

    const hours = getUpcomingHours(data, 4);
    const firstRainChance = hours[0]?.rainChance ?? 0;

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
      renderWeather(cached.data);
    }

    try {
      const loc = await getCoords();
      const staleEnough = !cached || (Date.now() - cached.ts > WEATHER_CACHE_MS);

      if (staleEnough) {
        const fresh = await fetchWeather(loc.lat, loc.lon);
        saveWeatherCache(fresh);
        renderWeather(fresh);
      } else if (cached?.data) {
        setTimeout(async () => {
          try {
            const fresh = await fetchWeather(loc.lat, loc.lon);
            saveWeatherCache(fresh);
            renderWeather(fresh);
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
        renderWeather(fresh);
      } catch {}
    }, WEATHER_CACHE_MS);
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
    renderSlots();
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

    requestAnimationFrame(() => {
      const editor = prioPanelList?.querySelector(".prioItem:last-child .prioNoteInput");
      editor?.focus();
    });
  }

  function closeAllModuleOverlays() {
    closePrioOverlay();
    closeWeatherOverlay();
    closeGenericOverlay();
  }

  function openPrioOverlay({ focusAdd = false } = {}) {
    if (!prioOverlay) return;
    closeTimerFocus();
    closeWeatherOverlay();
    closeGenericOverlay();

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
    closeGenericOverlay();
    weatherOverlay.classList.add("open");
    weatherOverlay.setAttribute("aria-hidden", "false");
  }

  function closeWeatherOverlay() {
    if (!weatherOverlay) return;
    weatherOverlay.classList.remove("open");
    weatherOverlay.setAttribute("aria-hidden", "true");
  }

  function openGenericOverlay(moduleId) {
    closeTimerFocus();
    closePrioOverlay();
    closeWeatherOverlay();

    genericOpenModule = wrapModuleIndex(moduleId);
    if (genericTitle) genericTitle.textContent = `Modul ${genericOpenModule}`;
    if (genericBody) {
      genericBody.textContent = "Den här modulen är skapad som placeholder och väntar på innehåll. När vi bygger vidare ersätter vi den här texten med riktig funktionalitet.";
    }

    genericOverlay?.classList.add("open");
    genericOverlay?.setAttribute("aria-hidden", "false");
  }

  function closeGenericOverlay() {
    if (!genericOverlay) return;
    genericOverlay.classList.remove("open");
    genericOverlay.setAttribute("aria-hidden", "true");
  }

  function addVerticalSwipeToOverlay(cardEl, overlayEl, closeFn) {
    if (!cardEl || !overlayEl || !closeFn) return;

    let swipeStartY = null;
    let swipeActive = false;

    cardEl.addEventListener("pointerdown", (e) => {
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
      cardEl.setPointerCapture?.(e.pointerId);
    });

    cardEl.addEventListener("pointermove", (e) => {
      if (!swipeActive || swipeStartY == null) return;

      const delta = e.clientY - swipeStartY;
      if (delta > 0) {
        cardEl.style.transform = `translateY(${delta}px)`;
      }
    });

    const endSwipe = () => {
      if (!swipeActive || swipeStartY == null) return;

      const match = cardEl.style.transform.match(/translateY\(([-0-9.]+)px\)/);
      const delta = match ? parseFloat(match[1]) : 0;

      cardEl.style.transform = "";
      swipeStartY = null;
      swipeActive = false;

      if (delta > 120) closeFn();
    };

    cardEl.addEventListener("pointerup", endSwipe);
    cardEl.addEventListener("pointercancel", () => {
      cardEl.style.transform = "";
      swipeStartY = null;
      swipeActive = false;
    });

    overlayEl.addEventListener("click", (e) => {
      if (e.target === overlayEl) closeFn();
    });
  }

  function bindModuleSlot(slotEl, slotKey) {
    if (!slotEl) return;

    let startX = 0;
    let startY = 0;
    let dragging = false;
    let moved = false;
    let locked = false;
    let wheelLocked = false;

    slotEl.addEventListener("click", () => {
      if (moved) {
        moved = false;
        return;
      }

      if (slotKey === "slot1" && prioLongPressTriggered) {
        prioLongPressTriggered = false;
        return;
      }

      openSlotModule(slotKey);
    });

    slotEl.addEventListener("pointerdown", (e) => {
      dragging = true;
      moved = false;
      locked = false;
      startX = e.clientX;
      startY = e.clientY;

      slotEl.classList.add("is-swiping");

      if (slotKey === "slot1") {
        prioLongPressTriggered = false;
      }

      slotEl.setPointerCapture?.(e.pointerId);
    });

    slotEl.addEventListener("pointermove", (e) => {
      if (!dragging || locked) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx)) {
        dragging = false;
        slotEl.classList.remove("is-swiping");
        return;
      }

      if (Math.abs(dx) < 28) return;

      locked = true;
      moved = true;

      if (dx < 0) {
        shiftSlot(slotKey, 1);
        slotEl.classList.remove("is-animating-right");
        slotEl.classList.add("is-animating-left");
      } else {
        shiftSlot(slotKey, -1);
        slotEl.classList.remove("is-animating-left");
        slotEl.classList.add("is-animating-right");
      }

      window.setTimeout(() => {
        slotEl.classList.remove("is-animating-left", "is-animating-right");
      }, 260);
    }, { passive: true });

    slotEl.addEventListener("pointerup", () => {
      dragging = false;
      locked = false;
      slotEl.classList.remove("is-swiping");

      requestAnimationFrame(() => {
        moved = false;
      });
    });

    slotEl.addEventListener("pointercancel", () => {
      dragging = false;
      locked = false;
      moved = false;
      slotEl.classList.remove("is-swiping", "is-animating-left", "is-animating-right");
    });

    slotEl.addEventListener("wheel", (e) => {
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(delta) < 12) return;

      e.preventDefault();
      if (wheelLocked) return;

      wheelLocked = true;
      shiftSlot(slotKey, delta > 0 ? 1 : -1);

      window.setTimeout(() => {
        wheelLocked = false;
      }, 220);
    }, { passive: false });
  }

  function bindPrioLongPress() {
    let pressTimer = 0;
    let startX = 0;
    let startY = 0;

    const cancelLongPress = () => {
      if (pressTimer) clearTimeout(pressTimer);
      pressTimer = 0;
    };

    moduleSlot1?.addEventListener("pointerdown", (e) => {
      if (SLOT_STATE.slot1 !== 1) return;

      startX = e.clientX;
      startY = e.clientY;
      prioLongPressTriggered = false;

      pressTimer = window.setTimeout(() => {
        if (SLOT_STATE.slot1 !== 1) return;
        prioLongPressTriggered = true;
        openPrioOverlay({ focusAdd: true });
      }, 420);
    });

    moduleSlot1?.addEventListener("pointermove", (e) => {
      if (!pressTimer) return;
      if (Math.hypot(e.clientX - startX, e.clientY - startY) > 10) {
        cancelLongPress();
      }
    });

    moduleSlot1?.addEventListener("pointerup", cancelLongPress);
    moduleSlot1?.addEventListener("pointercancel", cancelLongPress);
    moduleSlot1?.addEventListener("pointerleave", cancelLongPress);
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
        if (genericOverlay?.classList.contains("open")) {
          closeGenericOverlay();
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

    prioAddBtn?.addEventListener("click", addPrioFromInput);
    prioAddInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addPrioFromInput();
      }
    });

    prioCloseFab?.addEventListener("click", closePrioOverlay);
    weatherCloseFab?.addEventListener("click", closeWeatherOverlay);
    genericCloseFab?.addEventListener("click", closeGenericOverlay);

    addVerticalSwipeToOverlay(prioCard, prioOverlay, closePrioOverlay);
    addVerticalSwipeToOverlay(weatherCard, weatherOverlay, closeWeatherOverlay);
    addVerticalSwipeToOverlay(genericCard, genericOverlay, closeGenericOverlay);

    bindModuleSlot(moduleSlot1, "slot1");
    bindModuleSlot(moduleSlot2, "slot2");
    bindPrioLongPress();
  }

  function init() {
    updateClock();
    setInterval(updateClock, 1000);

    timerBarWrap?.setAttribute("aria-hidden", "true");
    updateTimerBar();

    renderSlots();
    renderPrioPanel();

    setTimerDisplayValue();
    makeWheelEngine();
    bindUI();
    initWeather();
  }

  init();
})();
