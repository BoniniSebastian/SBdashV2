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

  const TIMER = {
    presetIndex: 1,
    total: 0,
    left: 0,
    running: false,
    endAt: 0,
    intervalId: 0,
    finished: false,
  };

  function pad2(n) {
    return String(n).padStart(2, "0");
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
      if (e.target === timerFocus && !TIMER.finished) {
        closeTimerFocus();
      }
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

  function bindUI() {
    timerIconBtn?.addEventListener("click", () => {
      openTimerFocus({ finished: false });
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && timerFocus?.classList.contains("open") && !TIMER.running) {
        closeTimerFocus();
      }
    });

    timerWheel?.addEventListener("click", () => {
      if (TIMER.finished) {
        document.body.classList.remove("timerFinished");
      }
    });
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
  }

  init();
})();
