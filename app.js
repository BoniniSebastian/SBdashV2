/* =========================
   SB Dash v2 – cleaned app.js
========================= */

(() => {
  const $ = (id) => document.getElementById(id);

  /* ---------- global elements ---------- */
  const ambientBlob = document.querySelector(".ambientBlob");
  const cnLine = $("cnLine");
  const centerNow = $("centerNow");

  const wheel = $("wheel");
  const wheelRing = document.querySelector(".wheelRing");
  const iconRail = $("iconRail");

  const tasksPanel = $("tasksPanel");
  const tasksAdd = $("tasksAdd");
  const tasksDone = $("tasksDone");
  const tasksList = $("tasksList");

  const sheetWrap = $("sheetWrap");
  const sheet = $("sheet");
  const sheetTitle = $("sheetTitle");
  const sheetContent = $("sheetContent");
  const sheetCloseBtn = $("sheetCloseBtn");

  const tasksOverlay = $("tasksOverlay");
  const tasksClose = $("tasksClose");
  const tasksOverlayTitle = $("tasksOverlayTitle");
  const tasksOverlayBody = $("tasksOverlayBody");

  const calendarOverlay = $("calendarOverlay");
  const calendarClose = $("calendarClose");

  const timerOverlay = $("timerOverlay");
  const timerClose = $("timerClose");
  const timerStartBtn = $("timerStartBtn");
  const timerBigEl = $("timerBig");
  const timerSub = $("timerSub");
  const timerBar = $("timerBar");
  const timerBarWrap = $("timerBarWrap");
  const timerWheel = $("timerWheel");
  const timerRing = $("timerRing");

  const timerDonePopup = $("timerDonePopup");
  const timerDoneBtn = $("timerDoneBtn");

  const toolsOverlay = $("toolsOverlay");
  const toolsClose = $("toolsClose");
  const guessOdd = $("guessOdd");
  const guessEven = $("guessEven");
  const fidgetReset = $("fidgetReset");
  const btn501 = $("btn501");
  const toolsSpinnerWheel = $("toolsSpinnerWheel");
  const toolsSpinnerRing = $("toolsSpinnerRing");
  const toolsSpinValue = $("toolsSpinValue");

  const dartOverlay = $("dartOverlay");
  const dartClose = $("dartClose");
  const dartWheel = $("dartWheel");
  const dartRing = $("dartRing");
  const dartValue = $("dartValue");
  const dartGrid = $("dartGrid");

  const alarmAudio = $("alarmAudio");

  /* ---------- helpers ---------- */
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const pad2 = (n) => String(n).padStart(2, "0");

  function setText(el, t) {
    if (!el) return;
    el.textContent = String(t);
    el.setAttribute("data-text", String(t));
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function updateCenterNow() {
    if (!cnLine) return;

    const d = new Date();
    const time = d.toLocaleTimeString("sv-SE", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const weekday = d.toLocaleDateString("sv-SE", {
      weekday: "long",
    });
    const date = d
      .toLocaleDateString("sv-SE", {
        day: "numeric",
        month: "long",
      })
      .toUpperCase();

    cnLine.textContent = `${time} | ${weekday} | ${date}`;
  }

  function setCenterNowVisible(on) {
    if (!centerNow) return;
    centerNow.style.opacity = on ? "" : "0";
  }

  function flashOverlay(el, win) {
    if (!el) return;
    el.classList.remove("win", "lose");
    void el.offsetWidth;
    el.classList.add(win ? "win" : "lose");
    setTimeout(() => el.classList.remove("win", "lose"), 700);
  }

  /* ---------- storage ---------- */
  const LS_KEY = "sbdashv2_store_v4";

  function loadStore() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const d = raw ? JSON.parse(raw) : null;
      return {
        lists: Array.isArray(d?.lists) ? d.lists : [],
        done: Array.isArray(d?.done) ? d.done : [],
        ui: d?.ui && typeof d.ui === "object" ? d.ui : { doneOpen: false },
        tools: d?.tools && typeof d.tools === "object" ? d.tools : { fidgetCount: 0 },
      };
    } catch {
      return { lists: [], done: [], ui: { doneOpen: false }, tools: { fidgetCount: 0 } };
    }
  }

  const store = loadStore();
  const saveStore = () => localStorage.setItem(LS_KEY, JSON.stringify(store));
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());

  const fmt = (ts) =>
    new Date(ts).toLocaleString("sv-SE", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  /* ---------- main nav ---------- */
  const VIEW_DEFS = [
    { id: "stocks", label: "AKTIER", icon: "assets/ui/icon-stocks.svg" },
    { id: "calendar", label: "KALENDER", icon: "assets/ui/icon-calendar.svg" },
    { id: "weather", label: "VÄDER", icon: "assets/ui/icon-weather.svg" },
    { id: "lists", label: "LISTOR", icon: "assets/ui/icon-todo.svg" },
    { id: "tools", label: "TOOLS", icon: "assets/ui/icon-tools.svg" },
    { id: "timer", label: "TIMER", icon: "assets/ui/icon-pomodoro.svg" },
    { id: "dart501", label: "501", icon: "assets/ui/icon-dart501.png" },
  ];

  let activeIndex = 1;
  const STEP = 360 / VIEW_DEFS.length;
  let rotationDeg = activeIndex * STEP;

  /* ---------- timer on main wheel ---------- */
  const TIMER_PRESETS = [1, 5, 10, 15, 20, 30];
  let timerMode = false;
  let timerPresetIndex = 0;

  const TIMER = {
    total: 300,
    left: 300,
    running: false,
    endAt: 0,
    intervalId: 0,
  };

  function renderWheelCenter() {
    const top = $("wcTop");
    const main = $("wcMain");
    const bot = $("wcBot");
    if (!top || !main || !bot) return;

    const n = VIEW_DEFS.length;
    top.textContent = VIEW_DEFS[(activeIndex - 1 + n) % n]?.label || "—";
    main.textContent = VIEW_DEFS[activeIndex]?.label || "—";
    bot.textContent = VIEW_DEFS[(activeIndex + 1) % n]?.label || "—";
  }

  function renderTimerWheelCenter() {
    const top = $("wcTop");
    const main = $("wcMain");
    const bot = $("wcBot");
    if (!top || !main || !bot) return;

    top.textContent = "TIMER";
    main.textContent = `${TIMER_PRESETS[timerPresetIndex]}`;
    bot.textContent = "MIN • TRYCK START";
  }

  function renderTimerRunningCenter(left) {
    const top = $("wcTop");
    const main = $("wcMain");
    const bot = $("wcBot");
    if (!top || !main || !bot) return;

    const mm = Math.floor(left / 60);
    const ss = left % 60;

    top.textContent = "TIMER";
    main.textContent = `${pad2(mm)}:${pad2(ss)}`;
    bot.textContent = "PÅGÅR";
  }

  function enterTimerMode() {
    timerMode = true;
    timerPresetIndex = 0;
    rotationDeg = 0;
    if (wheelRing) wheelRing.style.transform = "rotate(0deg)";
    renderTimerWheelCenter();
  }

  function exitTimerMode() {
    timerMode = false;
    setRotation(activeIndex * STEP);
    renderWheelCenter();
  }

  function renderIconRail() {
    if (!iconRail) return;
    iconRail.innerHTML = "";

    VIEW_DEFS.forEach((v, idx) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "railIcon" + (idx === activeIndex ? " active" : "");
      b.setAttribute("aria-label", v.label);

      const img = document.createElement("img");
      img.src = v.icon;
      img.alt = "";
      img.draggable = false;
      b.appendChild(img);

      b.addEventListener("click", () => {
        if (timerMode) exitTimerMode();
        setRotation(idx * STEP);
        openForView(v.id);
      });

      iconRail.appendChild(b);
    });
  }

  function setActiveIndex(idx) {
    activeIndex = ((idx % VIEW_DEFS.length) + VIEW_DEFS.length) % VIEW_DEFS.length;
    renderIconRail();
    if (!TIMER.running) renderWheelCenter();
  }

  function sectorFromDeg(deg) {
    const raw = Math.round(deg / STEP);
    return ((raw % VIEW_DEFS.length) + VIEW_DEFS.length) % VIEW_DEFS.length;
  }

  function anyOverlayOpen() {
    return (
      calendarOverlay?.classList.contains("open") ||
      timerOverlay?.classList.contains("open") ||
      toolsOverlay?.classList.contains("open") ||
      dartOverlay?.classList.contains("open") ||
      tasksOverlay?.classList.contains("open")
    );
  }

  function setRotation(deg) {
    rotationDeg = deg;
    if (wheelRing) wheelRing.style.transform = `rotate(${deg}deg)`;

    if (timerMode) {
      const step = 360 / TIMER_PRESETS.length;
      const idx = ((Math.round(deg / step) % TIMER_PRESETS.length) + TIMER_PRESETS.length) % TIMER_PRESETS.length;
      if (idx !== timerPresetIndex) {
        timerPresetIndex = idx;
        renderTimerWheelCenter();
      }
      return;
    }

    if (!anyOverlayOpen()) {
      const idx = sectorFromDeg(deg);
      if (idx !== activeIndex) setActiveIndex(idx);

      if (document.body.classList.contains("sheetOpen")) {
        renderView(VIEW_DEFS[activeIndex].id);
      }
    }
  }

  /* ---------- main wheel input ---------- */
  let dragging = false;
  let startAngle = 0;
  let tapStartX = 0;
  let tapStartY = 0;
  let didDrag = false;

  function angle(cx, cy, x, y) {
    return Math.atan2(y - cy, x - cx) * (180 / Math.PI);
  }

  wheel?.addEventListener("pointerdown", (e) => {
    if (ambientBlob) {
      ambientBlob.style.transform = "scale(1.12)";
      ambientBlob.style.opacity = ".85";
    }
    dragging = true;
    didDrag = false;
    tapStartX = e.clientX;
    tapStartY = e.clientY;

    const r = wheel.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    startAngle = angle(cx, cy, e.clientX, e.clientY) - rotationDeg;

    wheel.setPointerCapture?.(e.pointerId);
  }, { passive: true });

  wheel?.addEventListener("pointermove", (e) => {
    if (!dragging) return;

    const dx = e.clientX - tapStartX;
    const dy = e.clientY - tapStartY;
    if (!didDrag && Math.hypot(dx, dy) > 12) didDrag = true;

    if (didDrag) {
      const r = wheel.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const deg = angle(cx, cy, e.clientX, e.clientY) - startAngle;
      setRotation(deg);
      e.preventDefault();
    }
  }, { passive: false });

  wheel?.addEventListener("pointerup", () => {
    if (ambientBlob) {
      ambientBlob.style.transform = "scale(1)";
      ambientBlob.style.opacity = ".45";
    }
    if (!dragging) return;
    dragging = false;

    if (timerMode) {
      const step = 360 / TIMER_PRESETS.length;
      const idx = ((Math.round(rotationDeg / step) % TIMER_PRESETS.length) + TIMER_PRESETS.length) % TIMER_PRESETS.length;
      setRotation(idx * step);
    } else {
      const idx = sectorFromDeg(rotationDeg);
      setRotation(idx * STEP);
    }

    if (!didDrag && !anyOverlayOpen()) {
      if (timerMode) {
        setTimerMinutesAndStart(TIMER_PRESETS[timerPresetIndex]);
        exitTimerMode();
      } else {
        openForView(VIEW_DEFS[activeIndex].id);
      }
    }
  }, { passive: true });

  wheel?.addEventListener("pointercancel", () => {
    dragging = false;
  }, { passive: true });

  wheel?.addEventListener("wheel", (e) => {
    e.preventDefault();
    const dir = e.deltaY > 0 ? 1 : -1;

    if (timerMode) {
      const step = 360 / TIMER_PRESETS.length;
      const idx = (timerPresetIndex + dir + TIMER_PRESETS.length) % TIMER_PRESETS.length;
      setRotation(idx * step);
      return;
    }

    const idx = (activeIndex + dir + VIEW_DEFS.length) % VIEW_DEFS.length;
    setRotation(idx * STEP);
  }, { passive: false });

  /* ---------- sheet ---------- */
  function openSheet() {
    document.body.classList.add("sheetOpen");
    sheetWrap?.setAttribute("aria-hidden", "false");
    setCenterNowVisible(false);
  }

  function closeSheet() {
    document.body.classList.remove("sheetOpen");
    sheetWrap?.setAttribute("aria-hidden", "true");
    setCenterNowVisible(true);
  }

  sheetCloseBtn?.addEventListener("click", closeSheet);

  let sheetDragStartY = null;

  sheet?.addEventListener("pointerdown", (e) => {
    sheetDragStartY = e.clientY;
    sheet.setPointerCapture?.(e.pointerId);
  }, { passive: true });

  sheet?.addEventListener("pointermove", (e) => {
    if (sheetDragStartY == null) return;
    const delta = e.clientY - sheetDragStartY;
    if (delta > 0) {
      sheet.style.transform = `translateY(${delta}px)`;
      e.preventDefault();
    }
  }, { passive: false });

  sheet?.addEventListener("pointerup", () => {
    if (sheetDragStartY == null) return;
    const m = sheet.style.transform.match(/translateY\(([-0-9.]+)px\)/);
    const delta = m ? parseFloat(m[1]) : 0;
    sheet.style.transform = "";
    sheetDragStartY = null;
    if (delta > 140) closeSheet();
  }, { passive: true });

  sheet?.addEventListener("pointercancel", () => {
    sheet.style.transform = "";
    sheetDragStartY = null;
  }, { passive: true });

  sheetWrap?.addEventListener("click", (e) => {
    if (e.target === sheetWrap) closeSheet();
  });

  /* ---------- reusable overlay wheel engine ---------- */
  function makeWheelEngine(opts) {
    const el = opts.el;
    const ring = opts.ring;
    if (!el || !ring) return null;

    const state = {
      deg: 0,
      dragging: false,
      startAngle: 0,
      lastT: 0,
      lastDeg: 0,
      vel: 0,
      raf: 0,
      spinning: false,
    };

    const getCenter = () => {
      const r = el.getBoundingClientRect();
      return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
    };

    const ang = (cx, cy, x, y) => Math.atan2(y - cy, x - cx) * (180 / Math.PI);

    const apply = (deg) => {
      state.deg = deg;
      ring.style.transform = `rotate(${deg}deg)`;
      opts.onChange?.(deg, state);
    };

    const stopSpin = () => {
      state.spinning = false;
      if (state.raf) cancelAnimationFrame(state.raf);
      state.raf = 0;
      opts.onStop?.(state.deg, state);
    };

    const startInertia = () => {
      state.spinning = true;
      opts.onSpinStart?.(state);

      let last = performance.now();
      const step = (t) => {
        if (!state.spinning) return;
        const dt = Math.max(0.001, (t - last) / 1000);
        last = t;

        state.vel *= Math.pow(opts.friction ?? 0.92, dt * 60);
        const next = state.deg + state.vel * dt;
        apply(next);

        if (Math.abs(state.vel) < (opts.stopVel ?? 18)) {
          if (opts.snapStep) {
            const s = opts.snapStep;
            apply(Math.round(state.deg / s) * s);
          }
          return stopSpin();
        }

        state.raf = requestAnimationFrame(step);
      };

      state.raf = requestAnimationFrame(step);
    };

    el.addEventListener("pointerdown", (e) => {
      state.dragging = true;
      state.spinning = false;
      if (state.raf) cancelAnimationFrame(state.raf);
      state.raf = 0;

      const { cx, cy } = getCenter();
      state.startAngle = ang(cx, cy, e.clientX, e.clientY) - state.deg;
      state.lastT = performance.now();
      state.lastDeg = state.deg;
      state.vel = 0;

      el.setPointerCapture?.(e.pointerId);
    }, { passive: true });

    el.addEventListener("pointermove", (e) => {
      if (!state.dragging) return;

      const { cx, cy } = getCenter();
      const raw = ang(cx, cy, e.clientX, e.clientY) - state.startAngle;
      const deg = raw * (opts.sensitivity ?? 1);

      const now = performance.now();
      const dt = Math.max(0.001, (now - state.lastT) / 1000);
      state.vel = (deg - state.lastDeg) / dt;
      state.lastT = now;
      state.lastDeg = deg;

      apply(deg);
      e.preventDefault();
    }, { passive: false });

    el.addEventListener("pointerup", () => {
      if (!state.dragging) return;
      state.dragging = false;

      if (opts.noInertia) {
        if (opts.snapStep) {
          const s = opts.snapStep;
          apply(Math.round(state.deg / s) * s);
        }
        opts.onStop?.(state.deg, state);
        return;
      }

      startInertia();
    }, { passive: true });

    el.addEventListener("pointercancel", () => {
      state.dragging = false;
    }, { passive: true });

    return { apply, stop: stopSpin, state };
  }

  /* ---------- timer ---------- */
  function ensureTimerBarVisible(on) {
    timerBarWrap?.setAttribute("aria-hidden", on ? "false" : "true");
  }

  function updateTimerBar() {
    if (!timerBar) return;
    const pct = TIMER.total ? (TIMER.left / TIMER.total) : 0;
    timerBar.style.transform = `scaleX(${clamp01(pct)})`;
  }

  function beepFallback() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 880;
      g.gain.value = 0.08;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      setTimeout(() => {
        o.stop();
        ctx.close();
      }, 900);
    } catch {}
  }

  function alarm() {
    if (alarmAudio?.querySelector("source")) {
      alarmAudio.currentTime = 0;
      alarmAudio.play().catch(() => beepFallback());
      return;
    }
    beepFallback();
  }

  function openTimerDonePopup() {
    timerDonePopup?.classList.add("show");
    timerDonePopup?.setAttribute("aria-hidden", "false");
  }

  function closeTimerDonePopup() {
    timerDonePopup?.classList.remove("show");
    timerDonePopup?.setAttribute("aria-hidden", "true");
  }

  function stopTimerInternal() {
    TIMER.running = false;
    if (TIMER.intervalId) clearInterval(TIMER.intervalId);
    TIMER.intervalId = 0;
    document.body.classList.remove("timerRunning");
    ensureTimerBarVisible(false);
    renderWheelCenter();
  }

  function tickTimer() {
    if (!TIMER.running) return;

    const left = Math.max(0, Math.ceil((TIMER.endAt - Date.now()) / 1000));
    TIMER.left = left;
    updateTimerBar();

    const mm = Math.floor(left / 60);
    const ss = left % 60;

    if (timerBigEl) {
      timerBigEl.textContent = `${pad2(mm)}:${pad2(ss)}`;
    }

    if (!timerMode && TIMER.running) {
      renderTimerRunningCenter(left);
    }

    if (left <= 0) {
      stopTimerInternal();
      updateTimerBar();
      alarm();
      openTimerDonePopup();
    }
  }

  function openTimerOverlay() {
    closeSheet();
    closeTasksOverlay();
    closeCalendarOverlay();
    closeToolsOverlay();
    closeDartOverlay();
    setCenterNowVisible(false);

    timerOverlay?.classList.add("open");
    timerOverlay?.setAttribute("aria-hidden", "false");

    const m = TIMER_PRESETS[timerPresetIndex];
    if (timerBigEl) timerBigEl.textContent = `${pad2(m)}:00`;
    if (timerSub) timerSub.textContent = `Vrid hjulet: ${TIMER_PRESETS.join(" / ")}`;

    timerWheelEngine?.apply(timerPresetIndex * (360 / TIMER_PRESETS.length));
  }

  function closeTimerOverlay() {
    timerOverlay?.classList.remove("open");
    timerOverlay?.setAttribute("aria-hidden", "true");
    setCenterNowVisible(true);
  }

  function setTimerMinutesAndStart(min) {
    const m = Number(min);
    if (!Number.isFinite(m) || m <= 0) return;

    stopTimerInternal();
    TIMER.total = Math.round(m * 60);
    TIMER.left = TIMER.total;
    TIMER.endAt = Date.now() + TIMER.total * 1000;
    TIMER.running = true;

    document.body.classList.add("timerRunning");
    ensureTimerBarVisible(true);

    tickTimer();
    TIMER.intervalId = setInterval(tickTimer, 250);
  }

  timerClose?.addEventListener("click", closeTimerOverlay);
  timerOverlay?.addEventListener("click", (e) => {
    if (e.target === timerOverlay) closeTimerOverlay();
  });
  timerStartBtn?.addEventListener("click", () => {
    setTimerMinutesAndStart(TIMER_PRESETS[timerPresetIndex]);
    closeTimerOverlay();
  });

  const timerWheelEngine = makeWheelEngine({
    el: timerWheel,
    ring: timerRing,
    sensitivity: 1.0,
    noInertia: true,
    snapStep: 360 / TIMER_PRESETS.length,
    onChange: (deg) => {
      const step = 360 / TIMER_PRESETS.length;
      const idx = ((Math.round(deg / step) % TIMER_PRESETS.length) + TIMER_PRESETS.length) % TIMER_PRESETS.length;
      timerPresetIndex = idx;
      const m = TIMER_PRESETS[idx];
      if (timerBigEl) timerBigEl.textContent = `${pad2(m)}:00`;
    },
  });

  /* ---------- calendar ---------- */
  function openCalendarOverlay() {
    closeSheet();
    closeTasksOverlay();
    closeTimerOverlay();
    closeToolsOverlay();
    closeDartOverlay();
    setCenterNowVisible(false);

    calendarOverlay?.classList.add("open");
    calendarOverlay?.setAttribute("aria-hidden", "false");
  }

  function closeCalendarOverlay() {
    calendarOverlay?.classList.remove("open");
    calendarOverlay?.setAttribute("aria-hidden", "true");
    setCenterNowVisible(true);
  }

  calendarClose?.addEventListener("click", closeCalendarOverlay);
  calendarOverlay?.addEventListener("click", (e) => {
    if (e.target === calendarOverlay) closeCalendarOverlay();
  });

  /* ---------- tools ---------- */
  const toolsCard = toolsOverlay?.querySelector(".overlayCard");
  let spinGuess = null;
  let fidgetCount = Number(store.tools?.fidgetCount ?? 0);
  const SPIN_SEGMENTS = 30;
  const SPIN_STEP = 360 / SPIN_SEGMENTS;
  let lastSpinSector = null;

  function openToolsOverlay() {
    closeSheet();
    closeTasksOverlay();
    closeCalendarOverlay();
    closeTimerOverlay();
    closeDartOverlay();
    setCenterNowVisible(false);

    toolsOverlay?.classList.add("open");
    toolsOverlay?.setAttribute("aria-hidden", "false");

    spinGuess = null;
    toolsCard?.classList.remove("win", "lose");
    setText(toolsSpinValue, Math.abs(fidgetCount) % 10);
  }

  function closeToolsOverlay() {
    toolsOverlay?.classList.remove("open");
    toolsOverlay?.setAttribute("aria-hidden", "true");
    toolsSpinValue?.classList.remove("glitch");
    toolsCard?.classList.remove("win", "lose");
    spinGuess = null;

    store.tools.fidgetCount = fidgetCount;
    saveStore();
    setCenterNowVisible(true);
  }

  toolsClose?.addEventListener("click", closeToolsOverlay);
  toolsOverlay?.addEventListener("click", (e) => {
    if (e.target === toolsOverlay) closeToolsOverlay();
  });

  guessOdd?.addEventListener("click", () => {
    spinGuess = "odd";
  });

  guessEven?.addEventListener("click", () => {
    spinGuess = "even";
  });

  fidgetReset?.addEventListener("click", () => {
    fidgetCount = 0;
    spinGuess = null;
    toolsCard?.classList.remove("win", "lose");
    setText(toolsSpinValue, 0);
    store.tools.fidgetCount = fidgetCount;
    saveStore();
  });

  function spinSectorFromDeg(deg) {
    const raw = Math.round(deg / SPIN_STEP);
    return ((raw % SPIN_SEGMENTS) + SPIN_SEGMENTS) % SPIN_SEGMENTS;
  }

  makeWheelEngine({
    el: toolsSpinnerWheel,
    ring: toolsSpinnerRing,
    sensitivity: 1.55,
    friction: 0.945,
    stopVel: 20,
    snapStep: SPIN_STEP,
    onSpinStart: () => {
      toolsSpinValue?.classList.add("glitch");
    },
    onChange: (deg) => {
      const s = spinSectorFromDeg(deg);
      if (lastSpinSector === null) lastSpinSector = s;

      if (s !== lastSpinSector) {
        let diff = s - lastSpinSector;
        if (diff > SPIN_SEGMENTS / 2) diff -= SPIN_SEGMENTS;
        if (diff < -SPIN_SEGMENTS / 2) diff += SPIN_SEGMENTS;
        fidgetCount += diff;
        lastSpinSector = s;
      }

      setText(toolsSpinValue, Math.abs(fidgetCount) % 10);
    },
    onStop: () => {
      toolsSpinValue?.classList.remove("glitch");
      const v = Math.abs(fidgetCount) % 10;
      setText(toolsSpinValue, v);

      if (spinGuess) {
        const win = spinGuess === "odd" ? (v % 2 === 1) : (v % 2 === 0);
        flashOverlay(toolsCard, win);
      }

      store.tools.fidgetCount = fidgetCount;
      saveStore();
    },
  });

  /* ---------- dart 501 ---------- */
  const DART = {
    activePlayer: 0,
    players: [
      { name: "Spelare 1", left: 501, last: 0, round: 0 },
      { name: "Spelare 2", left: 501, last: 0, round: 0 },
      { name: "Spelare 3", left: 501, last: 0, round: 0 },
      { name: "Spelare 4", left: 501, last: 0, round: 0 },
    ],
  };

  function renderDart() {
    if (!dartGrid) return;
    dartGrid.innerHTML = "";

    DART.players.forEach((p, idx) => {
      const card = document.createElement("div");
      card.className = "playerCard" + (idx === DART.activePlayer ? " active" : "");
      card.innerHTML = `
        <div class="pName">${escapeHtml(p.name)}</div>
        <div class="pScore">${p.left}</div>
        <div class="pSub">
          <span>Senaste: ${p.last}</span>
          <span>Omgång: <b>${p.round}</b></span>
        </div>
      `;
      card.addEventListener("click", () => {
        DART.activePlayer = idx;
        renderDart();
        setText(dartValue, DART.players[DART.activePlayer].round || 0);
      });
      dartGrid.appendChild(card);
    });
  }

  function commitDartRound() {
    const p = DART.players[DART.activePlayer];
    const add = Math.max(0, Math.min(180, Math.round(p.round || 0)));
    p.last = add;
    p.left = Math.max(0, p.left - add);
    DART.activePlayer = (DART.activePlayer + 1) % DART.players.length;
    renderDart();
    setText(dartValue, DART.players[DART.activePlayer].round || 0);
  }

  function openDartOverlay() {
    closeSheet();
    closeTasksOverlay();
    closeCalendarOverlay();
    closeToolsOverlay();
    closeTimerOverlay();
    setCenterNowVisible(false);

    dartOverlay?.classList.add("open");
    dartOverlay?.setAttribute("aria-hidden", "false");

    renderDart();
    setText(dartValue, DART.players[DART.activePlayer].round || 0);
  }

  function closeDartOverlay() {
    dartOverlay?.classList.remove("open");
    dartOverlay?.setAttribute("aria-hidden", "true");
    setCenterNowVisible(true);
  }

  dartClose?.addEventListener("click", closeDartOverlay);
  dartOverlay?.addEventListener("click", (e) => {
    if (e.target === dartOverlay) closeDartOverlay();
  });
  btn501?.addEventListener("click", openDartOverlay);

  makeWheelEngine({
    el: dartWheel,
    ring: dartRing,
    sensitivity: 1.0,
    noInertia: true,
    snapStep: 360 / 18,
    onChange: (deg) => {
      const t = Math.abs(deg) / (360 / 18);
      const score = Math.max(0, Math.min(180, Math.round((t * 20) % 181)));
      DART.players[DART.activePlayer].round = score;
      setText(dartValue, score);
      renderDart();
    },
    onStop: () => {
      commitDartRound();
    },
  });

  /* ---------- tasks overlay ---------- */
  let taskDraftSubtasks = [];

  function closeTasksOverlay() {
    tasksOverlay?.classList.remove("open");
    tasksOverlay?.setAttribute("aria-hidden", "true");
    setCenterNowVisible(true);
  }

  function openTasksOverlay() {
    closeSheet();
    closeCalendarOverlay();
    closeTimerOverlay();
    closeToolsOverlay();
    closeDartOverlay();
    setCenterNowVisible(false);

    tasksOverlay?.classList.add("open");
    tasksOverlay?.setAttribute("aria-hidden", "false");
  }

  tasksClose?.addEventListener("click", closeTasksOverlay);
  tasksOverlay?.addEventListener("click", (e) => {
    if (e.target === tasksOverlay) closeTasksOverlay();
  });

  function renderTaskCreateOverlay() {
    if (!tasksOverlayBody || !tasksOverlayTitle) return;

    tasksOverlayTitle.textContent = "TASKS";
    taskDraftSubtasks = [];

    const renderDrafts = () => {
      const draftsEl = $("subtaskDrafts");
      if (!draftsEl) return;

      draftsEl.innerHTML = "";

      if (!taskDraftSubtasks.length) return;

      taskDraftSubtasks.forEach((text, idx) => {
        const row = document.createElement("div");
        row.className = "subtaskDraft";
        row.innerHTML = `
          <div class="subtaskDraftText">${escapeHtml(text)}</div>
          <button class="subtaskDraftRemove" type="button" data-idx="${idx}">✕</button>
        `;
        row.querySelector(".subtaskDraftRemove")?.addEventListener("click", () => {
          taskDraftSubtasks.splice(idx, 1);
          renderDrafts();
        });
        draftsEl.appendChild(row);
      });
    };

    tasksOverlayBody.innerHTML = `
      <div class="tasksForm">
        <input id="taskTitleInput" class="tasksField" placeholder="Titel på uppgift..." maxlength="160" />
        <textarea id="taskNotesInput" class="tasksField tasksTextarea" placeholder="Anteckningar (valfritt)"></textarea>

        <div class="subtaskBuilder">
          <input id="subtaskDraftInput" class="tasksField" placeholder="Lägg till delmål..." maxlength="160" />
          <button id="subtaskDraftAdd" class="miniBtn" type="button">+</button>
        </div>

        <div id="subtaskDrafts" class="subtaskDrafts"></div>

        <div class="tasksOverlayActions">
          <button id="taskCancelBtn" class="tasksGhostBtn" type="button">Avbryt</button>
          <button id="taskSaveBtn" class="tasksSaveBtn" type="button">Spara</button>
        </div>
      </div>
    `;

    const addDraft = () => {
      const input = $("subtaskDraftInput");
      const value = (input?.value || "").trim();
      if (!value) return;
      taskDraftSubtasks.push(value);
      input.value = "";
      renderDrafts();
    };

    $("subtaskDraftAdd")?.addEventListener("click", addDraft);
    $("subtaskDraftInput")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addDraft();
      }
    });

    $("taskCancelBtn")?.addEventListener("click", closeTasksOverlay);

    $("taskSaveBtn")?.addEventListener("click", () => {
      const title = ($("taskTitleInput")?.value || "").trim();
      const notes = ($("taskNotesInput")?.value || "").trim();

      if (!title) return;

      store.lists.unshift({
        id: uid(),
        text: title,
        notes,
        createdAt: Date.now(),
        subtasks: taskDraftSubtasks.map((text) => ({
          id: uid(),
          text,
          done: false,
        })),
      });

      saveStore();
      renderTasksPanel();
      closeTasksOverlay();
    });

    renderDrafts();
    requestAnimationFrame(() => $("taskTitleInput")?.focus());
  }

  function renderDoneOverlay() {
    if (!tasksOverlayBody || !tasksOverlayTitle) return;

    tasksOverlayTitle.textContent = "SLUTFÖRT";

    const items = Array.isArray(store.done) ? store.done : [];

    if (!items.length) {
      tasksOverlayBody.innerHTML = `<div class="miniHint" style="padding:8px 6px;">Inget slutfört ännu.</div>`;
      return;
    }

    tasksOverlayBody.innerHTML = `
      <div class="tasksDoneList">
        ${items.map((item) => `
          <div class="taskDoneRow">
            <div class="taskDoneTitle">${escapeHtml(item.text)}</div>
            <div class="taskDoneMeta">
              ${
                Array.isArray(item.subtasks) && item.subtasks.length
                  ? `${item.subtasks.filter((s) => s.done).length}/${item.subtasks.length} deluppgifter`
                  : "Utan deluppgifter"
              }
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  /* ---------- task detail / lists ---------- */
  function renderTaskDetail({ id, fromDone }) {
    const item = (fromDone ? store.done : store.lists).find((x) => x.id === id);
    if (!item) return renderLists();

    item.subtasks = Array.isArray(item.subtasks) ? item.subtasks : [];

    sheetTitle.textContent = "Listor";
    sheetContent.innerHTML = `
      <div class="row" id="taskBack" style="cursor:pointer;">
        <div class="rowLeft"><div class="rowTitle">← Tillbaka</div></div>
      </div>

      <div class="row">
        <div class="rowLeft">
          <div class="rowTitle">${escapeHtml(item.text)}</div>
          <div class="miniHint">Skapad: ${fmt(item.createdAt || Date.now())}</div>
          ${item.notes ? `<div class="miniHint" style="margin-top:8px;">${escapeHtml(item.notes)}</div>` : ""}
        </div>
      </div>

      <div class="miniHint" style="margin:12px 0 10px 0;">Deluppgifter</div>
      <ul class="miniList" id="subtaskList"></ul>

      <div style="display:flex; gap:10px; margin-top:12px;">
        <input id="subtaskInput" class="miniInput" placeholder="Ny deluppgift..." maxlength="160"/>
        <button id="subtaskAdd" class="miniBtn">+</button>
      </div>
    `;

    $("taskBack")?.addEventListener("click", () => renderLists());

    const listEl = $("subtaskList");

    const draw = () => {
      listEl.innerHTML = "";
      if (!item.subtasks.length) {
        listEl.innerHTML = `<li class="miniHint">Inga deluppgifter ännu.</li>`;
        return;
      }

      item.subtasks.forEach((st) => {
        const li = document.createElement("li");
        li.className = "row";
        li.innerHTML = `
          <input class="roundCheck" type="checkbox" ${st.done ? "checked" : ""}/>
          <div class="rowLeft">
            <div class="rowTitle" style="${st.done ? "text-decoration:line-through; opacity:.55;" : ""}">
              ${escapeHtml(st.text)}
            </div>
          </div>
          <div class="rowMeta"></div>
        `;
        li.querySelector("input")?.addEventListener("change", (e) => {
          st.done = !!e.target.checked;
          saveStore();
          draw();
          renderTasksPanel();
        });
        listEl.appendChild(li);
      });
    };

    const add = () => {
      const input = $("subtaskInput");
      const t = (input?.value || "").trim();
      if (!t) return;
      item.subtasks.unshift({ id: uid(), text: t, done: false });
      input.value = "";
      saveStore();
      draw();
      renderTasksPanel();
    };

    $("subtaskAdd")?.addEventListener("click", add);
    $("subtaskInput")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") add();
    });

    draw();
  }

  function renderTasksPanel() {
    if (!tasksList) return;

    tasksList.innerHTML = "";

    const items = Array.isArray(store.lists) ? store.lists.slice(0, 5) : [];

    if (!items.length) {
      tasksList.innerHTML = `
        <div class="taskRow">
          <div class="taskTitle" style="opacity:.55;">Inga tasks ännu</div>
        </div>
      `;
      return;
    }

    items.forEach((item) => {
      item.subtasks = Array.isArray(item.subtasks) ? item.subtasks : [];

      const doneCount = item.subtasks.filter((s) => s.done).length;
      const hasSubtasks = item.subtasks.length > 0;

      const row = document.createElement("div");
      row.className = "taskRow";
      row.innerHTML = `
        <input class="taskCheck" type="checkbox" />
        <div class="taskTitle">${escapeHtml(item.text)}</div>
        <div class="taskMeta">${hasSubtasks ? `${doneCount}/${item.subtasks.length}` : ""}</div>
      `;

      row.querySelector(".taskTitle")?.addEventListener("click", () => {
        openSheet();
        renderTaskDetail({ id: item.id, fromDone: false });
      });

      row.querySelector("input")?.addEventListener("change", (e) => {
        if (!e.target.checked) return;

        store.lists = store.lists.filter((x) => x.id !== item.id);
        store.done.unshift({ ...item, doneAt: Date.now() });
        saveStore();
        renderTasksPanel();
      });

      tasksList.appendChild(row);
    });
  }

  function renderLists() {
    sheetTitle.textContent = "Listor";
    const doneOpen = !!store.ui.doneOpen;

    sheetContent.innerHTML = `
      <div class="miniForm">
        <input id="listInput" class="miniInput" placeholder="Ny sak..." maxlength="160"/>
        <button id="listAdd" class="miniBtn">+</button>
      </div>

      <div class="row" style="margin-bottom:10px;">
        <div class="rowLeft"><div class="rowTitle">Aktiva</div></div>
      </div>
      <ul class="miniList" id="todoList"></ul>

      <div class="row" id="doneToggle" style="margin-top:14px; cursor:pointer;">
        <div class="rowLeft">
          <div class="rowTitle">Slutförda</div>
          <div class="miniHint">${doneOpen ? "Tryck för att dölja" : "Tryck för att visa"}</div>
        </div>
      </div>
      <div id="doneWrap" style="display:${doneOpen ? "block" : "none"};">
        <ul class="miniList" id="doneList"></ul>
      </div>
    `;

    const input = $("listInput");
    const addBtn = $("listAdd");
    const todoEl = $("todoList");
    const doneEl = $("doneList");

    $("doneToggle")?.addEventListener("click", () => {
      store.ui.doneOpen = !store.ui.doneOpen;
      saveStore();
      renderLists();
    });

    const draw = () => {
      todoEl.innerHTML = "";
      doneEl.innerHTML = "";

      if (!store.lists.length) {
        todoEl.innerHTML = `<li class="miniHint">Inget här ännu.</li>`;
      } else {
        store.lists.forEach((item) => {
          item.subtasks = Array.isArray(item.subtasks) ? item.subtasks : [];
          const li = document.createElement("li");
          li.className = "row";
          li.innerHTML = `
            <input class="roundCheck" type="checkbox" />
            <div class="rowLeft" style="cursor:pointer;">
              <div class="rowTitle">${escapeHtml(item.text)}</div>
              <div class="miniHint">${
                item.subtasks.length
                  ? `${item.subtasks.filter((s) => s.done).length}/${item.subtasks.length} deluppgifter`
                  : "Inga deluppgifter"
              }</div>
            </div>
            <div class="rowMeta">${fmt(item.createdAt)}</div>
          `;

          li.querySelector(".rowLeft")?.addEventListener("click", () => {
            renderTaskDetail({ id: item.id, fromDone: false });
          });

          li.querySelector("input")?.addEventListener("change", (e) => {
            if (!e.target.checked) return;
            store.lists = store.lists.filter((x) => x.id !== item.id);
            store.done.unshift({ ...item, doneAt: Date.now() });
            saveStore();
            renderLists();
          });

          todoEl.appendChild(li);
        });
      }

      if (store.ui.doneOpen) {
        if (!store.done.length) {
          doneEl.innerHTML = `<li class="miniHint">Inget slutfört ännu.</li>`;
        } else {
          store.done.forEach((item) => {
            item.subtasks = Array.isArray(item.subtasks) ? item.subtasks : [];
            const li = document.createElement("li");
            li.className = "row";
            li.style.opacity = ".88";
            li.innerHTML = `
              <input class="roundCheck" type="checkbox" checked />
              <div class="rowLeft" style="cursor:pointer;">
                <div class="rowTitle">${escapeHtml(item.text)}</div>
                <div class="miniHint">${
                  item.subtasks.length
                    ? `${item.subtasks.filter((s) => s.done).length}/${item.subtasks.length} deluppgifter`
                    : "—"
                }</div>
              </div>
              <div class="rowMeta">${fmt(item.doneAt || Date.now())}</div>
            `;

            li.querySelector(".rowLeft")?.addEventListener("click", () => {
              renderTaskDetail({ id: item.id, fromDone: true });
            });

            li.querySelector("input")?.addEventListener("change", (e) => {
              if (e.target.checked) return;
              store.done = store.done.filter((x) => x.id !== item.id);
              store.lists.unshift({
                id: item.id,
                text: item.text,
                notes: item.notes || "",
                createdAt: item.createdAt || Date.now(),
                subtasks: item.subtasks,
              });
              saveStore();
              renderLists();
            });

            doneEl.appendChild(li);
          });
        }
      }

      renderTasksPanel();
    };

    const add = () => {
      const t = (input?.value || "").trim();
      if (!t) return;
      store.lists.unshift({
        id: uid(),
        text: t,
        notes: "",
        createdAt: Date.now(),
        subtasks: [],
      });
      input.value = "";
      saveStore();
      renderLists();
    };

    addBtn?.addEventListener("click", add);
    input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") add();
    });

    draw();
  }

  function renderView(id) {
    if (id === "stocks") return renderStocks();
    if (id === "calendar") return renderCalendar();
    if (id === "weather") return renderWeather();
    if (id === "lists") return renderLists();

    sheetTitle.textContent = "—";
    sheetContent.innerHTML = `<div class="miniHint">—</div>`;
  }

  /* ---------- start panel tasks actions ---------- */
  tasksAdd?.addEventListener("click", () => {
    openTasksOverlay();
    renderTaskCreateOverlay();
  });

  tasksDone?.addEventListener("click", () => {
    openTasksOverlay();
    renderDoneOverlay();
  });

  /* ---------- weather dock ---------- */
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

  function pickWeatherIcon(code) {
    if (code === 0) return WEATHER_ICONS.clear;
    if (code >= 1 && code <= 3) return WEATHER_ICONS.cloudy;
    if (code === 45 || code === 48) return WEATHER_ICONS.fog;
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return WEATHER_ICONS.rain;
    if (code >= 71 && code <= 77) return WEATHER_ICONS.snow;
    if (code >= 95) return WEATHER_ICONS.thunder;
    return WEATHER_ICONS.na;
  }

  function fmtHour(iso) {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:00`;
  }

  async function getCoords() {
    if ("geolocation" in navigator) {
      try {
        const pos = await new Promise((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, {
            enableHighAccuracy: false,
            timeout: 2500,
            maximumAge: 60000,
          })
        );
        return { name: "Här", lat: pos.coords.latitude, lon: pos.coords.longitude };
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
      `&hourly=temperature_2m,weather_code` +
      `&daily=temperature_2m_max,temperature_2m_min` +
      `&timezone=auto`;

    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error("Weather fetch failed");
    return r.json();
  }

  function renderWeatherDock(locName, data) {
    const elTemp = $("dwTemp");
    const elCity = $("dwCity");
    const elRange = $("dwRange");
    const elForecast = $("dwForecast");
    const elIcon = $("dwIcon");

    if (!elTemp || !elCity || !elRange || !elForecast || !elIcon) return;

    const t = Math.round(data.current.temperature_2m);
    const code = data.current.weather_code;

    elTemp.textContent = `${t}°`;
    elCity.textContent = locName;

    const max = Math.round(data.daily.temperature_2m_max?.[0]);
    const min = Math.round(data.daily.temperature_2m_min?.[0]);
    if (Number.isFinite(min) && Number.isFinite(max)) {
      elRange.textContent = `${min}° / ${max}°`;
    }

    elIcon.src = pickWeatherIcon(code);

    const now = new Date();
    const times = data.hourly.time || [];
    const temps = data.hourly.temperature_2m || [];

    let i0 = times.findIndex((ti) => new Date(ti) >= now);
    if (i0 < 0) i0 = 0;

    const items = [];
    for (let k = 0; k < 3; k++) {
      const i = i0 + k;
      if (!times[i]) break;
      items.push(`<div class="dwFItem">${fmtHour(times[i])}<span class="dwDot"></span>${Math.round(temps[i])}°</div>`);
    }
    elForecast.innerHTML = items.join("");
  }

  async function initWeatherDock() {
    try {
      const loc = await getCoords();
      const data = await fetchWeather(loc.lat, loc.lon);
      renderWeatherDock(loc.name, data);
    } catch (e) {
      console.warn("Weather dock error:", e);
    }

    setInterval(async () => {
      try {
        const loc = await getCoords();
        const data = await fetchWeather(loc.lat, loc.lon);
        renderWeatherDock(loc.name, data);
      } catch {}
    }, 10 * 60 * 1000);
  }

  /* ---------- calendar widget ---------- */
  const PUBLIC_CALENDAR_ICS = "https://calendar.google.com/calendar/ical/ericssonbonini%40gmail.com/public/basic.ics";

  function formatCalendarWidgetDate(d = new Date()) {
    const weekday = d.toLocaleDateString("sv-SE", { weekday: "long" });
    const day = d.toLocaleDateString("sv-SE", { day: "numeric" });
    const month = d.toLocaleDateString("sv-SE", { month: "long" });
    return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} ${day} ${month}`;
  }

  function renderCalendarWidget(events = []) {
    const dateEl = $("calendarWidgetDate");
    const listEl = $("calendarEvents");
    if (!dateEl || !listEl) return;

    dateEl.textContent = formatCalendarWidgetDate(new Date());
    listEl.innerHTML = "";

    const items = Array.isArray(events) ? events.slice(0, 5) : [];

    if (!items.length) {
      listEl.innerHTML = `
        <div class="event">
          <div class="eventDot"></div>
          <div class="eventTime">—</div>
          <div class="eventTitle">Inga kommande händelser</div>
        </div>
      `;
      return;
    }

    items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "event";
      row.innerHTML = `
        <div class="eventDot"></div>
        <div class="eventTime">${escapeHtml(item.time || "—")}</div>
        <div class="eventTitle">${escapeHtml(item.title || "Utan titel")}</div>
      `;
      listEl.appendChild(row);
    });
  }

  function parseICSDate(raw) {
    if (!raw) return null;

    if (/^\d{8}$/.test(raw)) {
      const y = raw.slice(0, 4);
      const m = raw.slice(4, 6);
      const d = raw.slice(6, 8);
      return new Date(`${y}-${m}-${d}T00:00:00`);
    }

    const cleaned = raw.replace("Z", "");
    const match = cleaned.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/);
    if (!match) return null;

    const [, y, mo, d, h, mi, s] = match;
    return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}`);
  }

  async function loadCalendarWidget() {
    try {
      const res = await fetch(
        "https://api.allorigins.win/raw?url=" + encodeURIComponent(PUBLIC_CALENDAR_ICS),
        { cache: "no-store" }
      );

      if (!res.ok) throw new Error("Kunde inte läsa kalenderfeed");

      const text = await res.text();
      const blocks = text.split("BEGIN:VEVENT");
      const now = new Date();

      const events = [];

      for (const block of blocks) {
        const summaryMatch = block.match(/SUMMARY:(.+)/);
        const startMatch = block.match(/DTSTART(?:;VALUE=DATE)?(?::|;[^:]*:)(.+)/);

        if (!summaryMatch || !startMatch) continue;

        const title = summaryMatch[1].trim();
        const rawStart = startMatch[1].trim();
        const startDate = parseICSDate(rawStart);

        if (!startDate || startDate < now) continue;

        const allDay = /^\d{8}$/.test(rawStart);

        events.push({
          startDate,
          time: allDay
            ? "Heldag"
            : startDate.toLocaleTimeString("sv-SE", {
                hour: "2-digit",
                minute: "2-digit",
              }),
          title,
        });
      }

      events.sort((a, b) => a.startDate - b.startDate);
      renderCalendarWidget(events);
    } catch (err) {
      console.warn("Calendar widget error:", err);
      renderCalendarWidget([]);
    }
  }

  /* ---------- popup listeners ---------- */
  timerDoneBtn?.addEventListener("click", closeTimerDonePopup);
  timerDonePopup?.addEventListener("click", (e) => {
    if (e.target === timerDonePopup) closeTimerDonePopup();
  });

  /* ---------- init ---------- */
  function init() {
    setActiveIndex(activeIndex);
    renderWheelCenter();
    setRotation(activeIndex * STEP);

    updateTimerBar();
    ensureTimerBarVisible(false);

    setText(toolsSpinValue, Math.abs(fidgetCount) % 10);

    const img = document.querySelector(".wheelRing");
    img?.addEventListener("error", () => {
      console.warn("wheel-ring.svg kunde inte laddas. Kolla src i index.html:", img.getAttribute("src"));
    });

    updateCenterNow();
    setInterval(updateCenterNow, 20000);

    initWeatherDock();
    loadCalendarWidget();
    renderTasksPanel();
  }

  init();
})();
