/* =========================
   SB Dash v2 – app.js
   Clean build:
   - Main wheel = navigation
   - Tools = FAST spinner (glitch while spinning)
   - 501 = separate precision wheel
   - Timer = preset wheel
   ========================= */

(() => {

  const $ = (id) => document.getElementById(id);

  /* ======================================================
     MAIN NAV WHEEL
  ====================================================== */

  const wheel = $("wheel");
  const wheelRing = document.querySelector(".wheelRing");
  const iconRail = $("iconRail");

  const sheetWrap = $("sheetWrap");
  const sheetTitle = $("sheetTitle");
  const sheetContent = $("sheetContent");
  const sheetCloseBtn = $("sheetCloseBtn");

  const VIEW_DEFS = [
    { id: "stocks", label: "AKTIER", icon: "assets/ui/icon-stocks.svg" },
    { id: "calendar", label: "KALENDER", icon: "assets/ui/icon-calendar.svg" },
    { id: "weather", label: "VÄDER", icon: "assets/ui/icon-weather.svg" },
    { id: "lists", label: "LISTOR", icon: "assets/ui/icon-todo.svg" },
    { id: "tools", label: "TOOLS", icon: "assets/ui/icon-tools.svg" },
    { id: "timer", label: "TIMER", icon: "assets/ui/icon-pomodoro.svg" },
  ];

  const STEP = 360 / VIEW_DEFS.length;
  let activeIndex = 1;
  let rotationDeg = activeIndex * STEP;

  function renderWheelCenter() {
    const top = $("wcTop");
    const main = $("wcMain");
    const bot = $("wcBot");

    const n = VIEW_DEFS.length;
    top.textContent  = VIEW_DEFS[(activeIndex - 1 + n) % n].label;
    main.textContent = VIEW_DEFS[activeIndex].label;
    bot.textContent  = VIEW_DEFS[(activeIndex + 1) % n].label;
  }

  function renderIconRail() {
    iconRail.innerHTML = "";
    VIEW_DEFS.forEach((v, i) => {
      const btn = document.createElement("button");
      btn.className = "railIcon" + (i === activeIndex ? " active" : "");
      const img = document.createElement("img");
      img.src = v.icon;
      btn.appendChild(img);
      btn.onclick = () => {
        setRotation(i * STEP);
        openForView(v.id);
      };
      iconRail.appendChild(btn);
    });
  }

  function setRotation(deg) {
    rotationDeg = deg;
    wheelRing.style.transform = `rotate(${deg}deg)`;
    const idx = Math.round(deg / STEP) % VIEW_DEFS.length;
    activeIndex = (idx + VIEW_DEFS.length) % VIEW_DEFS.length;
    renderIconRail();
    renderWheelCenter();
  }

  /* wheel interaction */
  let dragging = false;
  let startAngle = 0;

  function angle(cx, cy, x, y) {
    return Math.atan2(y - cy, x - cx) * 180 / Math.PI;
  }

  wheel.addEventListener("pointerdown", (e) => {
    dragging = true;
    const r = wheel.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    startAngle = angle(cx, cy, e.clientX, e.clientY) - rotationDeg;
    wheel.setPointerCapture(e.pointerId);
  });

  wheel.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const r = wheel.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const deg = angle(cx, cy, e.clientX, e.clientY) - startAngle;
    setRotation(deg);
  });

  wheel.addEventListener("pointerup", () => {
    dragging = false;
    const idx = Math.round(rotationDeg / STEP);
    setRotation(idx * STEP);
  });

  /* ======================================================
     SHEET
  ====================================================== */

  function openSheet() {
    document.body.classList.add("sheetOpen");
    sheetWrap.setAttribute("aria-hidden", "false");
  }

  function closeSheet() {
    document.body.classList.remove("sheetOpen");
    sheetWrap.setAttribute("aria-hidden", "true");
  }

  sheetCloseBtn.onclick = closeSheet;

  function renderView(id) {
    sheetTitle.textContent = id.toUpperCase();
    sheetContent.innerHTML = `<div class="miniHint">${id}</div>`;
  }

  function openForView(id) {
    if (id === "tools") return openToolsOverlay();
    if (id === "timer") return openTimerOverlay();
    openSheet();
    renderView(id);
  }

  /* ======================================================
     TOOLS SPINNER
  ====================================================== */

  const toolsOverlay = $("toolsOverlay");
  const toolsClose = $("toolsClose");
  const toolsWheel = $("toolsSpinnerWheel");
  const toolsRing = $("toolsSpinnerRing");
  const toolsValue = $("toolsSpinValue");
  const guessOdd = $("guessOdd");
  const guessEven = $("guessEven");
  const btn501 = $("btn501");

  let guess = null;

  function openToolsOverlay() {
    closeSheet();
    toolsOverlay.classList.add("open");
    toolsValue.classList.add("glitch");
  }

  function closeToolsOverlay() {
    toolsOverlay.classList.remove("open");
    guess = null;
  }

  toolsClose.onclick = closeToolsOverlay;

  guessOdd.onclick = () => guess = "odd";
  guessEven.onclick = () => guess = "even";

  const SEGMENTS = 30;
  const SPIN_STEP = 360 / SEGMENTS;

  function valueFromDeg(deg) {
    const idx = Math.round(deg / SPIN_STEP);
    return ((idx % 10) + 10) % 10;
  }

  let spinDeg = 0;
  let spinVel = 0;
  let spinning = false;

  function spinLoop() {
    if (!spinning) return;
    spinVel *= 0.97;
    spinDeg += spinVel;
    toolsRing.style.transform = `rotate(${spinDeg}deg)`;
    toolsValue.textContent = valueFromDeg(spinDeg);
    toolsValue.setAttribute("data-text", toolsValue.textContent);

    if (Math.abs(spinVel) < 0.3) {
      spinning = false;
      toolsValue.classList.remove("glitch");
      return;
    }
    requestAnimationFrame(spinLoop);
  }

  toolsWheel.addEventListener("pointerdown", () => {
    spinning = false;
    spinVel = 20 + Math.random() * 25;
    toolsValue.classList.add("glitch");
    spinning = true;
    spinLoop();
  });

  /* ======================================================
     501 DART (SEPARATE OVERLAY)
  ====================================================== */

  const dartOverlay = $("dartOverlay");
  const dartClose = $("dartClose");
  const dartWheel = $("dartWheel");
  const dartRing = $("dartRing");
  const dartValue = $("dartValue");

  btn501.onclick = () => {
    toolsOverlay.classList.remove("open");
    dartOverlay.classList.add("open");
  };

  dartClose.onclick = () => {
    dartOverlay.classList.remove("open");
  };

  let dartDeg = 0;

  dartWheel.addEventListener("pointermove", (e) => {
    if (!e.pressure) return;
    dartDeg += e.movementX;
    dartRing.style.transform = `rotate(${dartDeg}deg)`;
    const score = Math.abs(Math.round(dartDeg)) % 180;
    dartValue.textContent = score;
    dartValue.setAttribute("data-text", score);
  });

  /* ======================================================
     TIMER
  ====================================================== */

  const timerOverlay = $("timerOverlay");
  const timerClose = $("timerClose");
  const timerWheel = $("timerWheel");
  const timerRing = $("timerRing");
  const timerBig = $("timerBig");

  const PRESETS = [1,5,10,15,20,30];
  let presetIndex = 1;

  function openTimerOverlay() {
    closeSheet();
    timerOverlay.classList.add("open");
    updateTimerDisplay();
  }

  function closeTimerOverlay() {
    timerOverlay.classList.remove("open");
  }

  timerClose.onclick = closeTimerOverlay;

  function updateTimerDisplay() {
    const m = PRESETS[presetIndex];
    timerBig.textContent = String(m).padStart(2,"0") + ":00";
  }

  timerWheel.addEventListener("pointermove", (e) => {
    if (!e.pressure) return;
    presetIndex += e.movementX > 0 ? 1 : -1;
    presetIndex = (presetIndex + PRESETS.length) % PRESETS.length;
    timerRing.style.transform = `rotate(${presetIndex * 20}deg)`;
    updateTimerDisplay();
  });

  /* ======================================================
     INIT
  ====================================================== */

  function init() {
    setRotation(activeIndex * STEP);
    renderWheelCenter();
    renderIconRail();
  }

  init();

})();