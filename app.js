/* =========================
   SB Dash v2 – app.js (FULL)
   ========================= */

(() => {
  const $ = (id) => document.getElementById(id);

  /* =========================
     ELEMENTS
  ========================= */
  const iconBar = $("iconBar");
  const wheel = $("wheel");
  const wheelRing = document.querySelector(".wheelRing");

  const sheetWrap = $("sheetWrap");
  const sheet = $("sheet");
  const sheetTitle = $("sheetTitle");
  const sheetContent = $("sheetContent");
  const sheetCloseBtn = $("sheetCloseBtn");

  const tapeInner = $("tapeInner");

  const timerOverlay = $("timerOverlay");
  const timerClose = $("timerClose");
  const timerPick = $("timerPick");
  const timerBig = $("timerBig");
  const timerStartBtn = $("timerStartBtn");
  const timerStopBtn = $("timerStopBtn");
  const timerResetBtn = $("timerResetBtn");

  const timerEdgeFill = $("timerEdgeFill");

  function pad2(n){ return String(n).padStart(2,"0"); }
  function clamp01(x){ return Math.max(0, Math.min(1, x)); }

  /* =========================
     VIEWS (icon row)
     - START is real section but not opened as sheet
     - TIMER is overlay (not a sheet section)
  ========================= */
  const VIEW_DEFS = [
    { id: "calendar", label: "KALENDER", icon: "assets/ui/icon-calendar.svg", type: "sheet" },
    { id: "stocks",   label: "AKTIER",   icon: "assets/ui/icon-stocks.svg",   type: "sheet" },
    { id: "start",    label: "START",    icon: "assets/ui/icon-start.svg",    type: "start" },
    { id: "weather",  label: "VÄDER",    icon: "assets/ui/icon-weather.svg",  type: "sheet" },
    { id: "lists",    label: "LISTOR",   icon: "assets/ui/icon-todo.svg",     type: "sheet" },
    { id: "news",     label: "NYHETER",  icon: "assets/ui/icon-news.svg",     type: "sheet" },
    { id: "timer",    label: "TIMER",    icon: "assets/ui/icon-pomodoro.svg",type: "overlay" },
  ];

  /* =========================
     ICON BAR RENDER
  ========================= */
  function renderIconBar(){
    if (!iconBar) return;

    const strip = document.createElement("div");
    strip.className = "iconStrip";

    VIEW_DEFS.forEach((v, idx) => {
      const b = document.createElement("button");
      b.className = "iconBtn";
      b.type = "button";
      b.setAttribute("data-idx", String(idx));
      b.setAttribute("aria-label", v.label);

      const img = document.createElement("img");
      img.src = v.icon;
      img.alt = "";
      b.appendChild(img);

      b.addEventListener("click", () => {
        setActiveIndex(idx, { fromTap: true });
        activateCurrent();
      });

      strip.appendChild(b);
    });

    iconBar.innerHTML = "";
    iconBar.appendChild(strip);
  }

  function setIconActive(){
    const btns = iconBar?.querySelectorAll(".iconBtn");
    if (!btns?.length) return;
    btns.forEach((b, i) => {
      b.classList.toggle("active", i === activeIndex);
    });

    // keep active icon in view
    const activeBtn = btns[activeIndex];
    activeBtn?.scrollIntoView({ block:"nearest", inline:"center", behavior:"smooth" });
  }

  /* =========================
     WHEEL: selection logic
  ========================= */
  let activeIndex = VIEW_DEFS.findIndex(v => v.id === "start");
  if (activeIndex < 0) activeIndex = 0;

  const STEP = 360 / VIEW_DEFS.length;
  let rotationDeg = 0;

  function sectorFromDeg(deg){
    const raw = Math.round(deg / STEP);
    return ((raw % VIEW_DEFS.length) + VIEW_DEFS.length) % VIEW_DEFS.length;
  }

  function setActiveIndex(idx, { fromTap=false } = {}){
    activeIndex = idx;
    setIconActive();

    // If user is spinning, we still rotate ring for feedback.
    if (fromTap) {
      // Snap wheel ring to selection (nice)
      setRotation(idx * STEP, { silent: true });
    }
  }

  function setRotation(deg, { silent=false } = {}){
    rotationDeg = deg;
    if (wheelRing) wheelRing.style.transform = `rotate(${deg}deg)`;

    if (silent) return;

    const idx = sectorFromDeg(deg);
    if (idx !== activeIndex) setActiveIndex(idx);
  }

  /* =========================
     SHEET OPEN/CLOSE + drag down
  ========================= */
  function openSheet(title, html){
    if (sheetTitle) sheetTitle.textContent = title || "—";
    if (sheetContent) sheetContent.innerHTML = html || "";
    sheetWrap?.classList.add("open");
    sheetWrap?.setAttribute("aria-hidden","false");
  }

  function closeSheet(){
    sheetWrap?.classList.remove("open");
    sheetWrap?.setAttribute("aria-hidden","true");
  }

  sheetCloseBtn?.addEventListener("click", closeSheet);

  let sheetDragStartY = null;
  sheet?.addEventListener("pointerdown", (e) => {
    sheetDragStartY = e.clientY;
    sheet.setPointerCapture?.(e.pointerId);
  }, { passive:true });

  sheet?.addEventListener("pointermove", (e) => {
    if (sheetDragStartY == null) return;
    const delta = e.clientY - sheetDragStartY;
    if (delta > 0) {
      sheet.style.transform = `translateY(${delta}px)`;
      e.preventDefault();
    }
  }, { passive:false });

  sheet?.addEventListener("pointerup", (e) => {
    if (sheetDragStartY == null) return;
    const delta = e.clientY - sheetDragStartY;
    sheet.style.transform = "";
    sheetDragStartY = null;
    if (delta > 160) closeSheet();
  }, { passive:true });

  sheet?.addEventListener("pointercancel", () => {
    sheet.style.transform = "";
    sheetDragStartY = null;
  }, { passive:true });

  /* =========================
     TIMER (overlay, global progress bar)
  ========================= */
  const TIMER_STEPS = [1,5,10,15,20,30];
  let timerPickIndex = 1; // default 5

  const TIMER = {
    total: 5*60,
    left:  5*60,
    running: false,
    endAt: 0,
    intervalId: 0,
  };

  function timerText(){
    const safe = Math.max(0, Math.floor(TIMER.left));
    const mm = Math.floor(safe/60);
    const ss = safe % 60;
    return `${pad2(mm)}:${pad2(ss)}`;
  }

  function setTimerPickByIndex(i){
    timerPickIndex = ((i % TIMER_STEPS.length) + TIMER_STEPS.length) % TIMER_STEPS.length;
    const m = TIMER_STEPS[timerPickIndex];
    TIMER.total = m*60;
    TIMER.left = TIMER.total;

    if (timerPick) timerPick.textContent = pad2(m);
    if (timerBig) timerBig.textContent = timerText();
    updateTimerEdge();
  }

  function updateTimerEdge(){
    const pct = TIMER.total ? (TIMER.left / TIMER.total) : 0;
    const h = clamp01(pct) * 100;
    if (timerEdgeFill) timerEdgeFill.style.height = `${h}%`;
  }

  function ensureOverlay(open){
    timerOverlay?.classList.toggle("open", !!open);
    timerOverlay?.setAttribute("aria-hidden", open ? "false" : "true");
  }

  function beepFallback(){
    try{
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 880;
      g.gain.value = 0.08;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      setTimeout(() => { o.stop(); ctx.close(); }, 900);
    }catch{}
  }

  function alarm(){
    const audio = document.getElementById("alarmAudio");
    if (audio?.src) {
      audio.currentTime = 0;
      audio.play().catch(() => beepFallback());
    } else {
      beepFallback();
    }
  }

  function stopTimerInternal(){
    TIMER.running = false;
    if (TIMER.intervalId){
      clearInterval(TIMER.intervalId);
      TIMER.intervalId = 0;
    }
    document.body.classList.remove("timerRunning");
    updateTimerEdge();
  }

  function tickTimer(){
    if (!TIMER.running) return;
    const now = Date.now();
    const left = Math.max(0, Math.ceil((TIMER.endAt - now) / 1000));
    TIMER.left = left;

    if (timerBig) timerBig.textContent = timerText();
    updateTimerEdge();

    if (left <= 0){
      stopTimerInternal();
      alarm();
    }
  }

  function startTimer(){
    stopTimerInternal();

    TIMER.running = true;
    TIMER.left = TIMER.total;
    TIMER.endAt = Date.now() + TIMER.total*1000;

    document.body.classList.add("timerRunning");

    tickTimer();
    TIMER.intervalId = setInterval(tickTimer, 250);
  }

  function resetTimer(){
    stopTimerInternal();
    TIMER.left = TIMER.total;
    if (timerBig) timerBig.textContent = timerText();
    updateTimerEdge();
  }

  timerClose?.addEventListener("click", () => ensureOverlay(false));
  timerStartBtn?.addEventListener("click", startTimer);
  timerStopBtn?.addEventListener("click", stopTimerInternal);
  timerResetBtn?.addEventListener("click", resetTimer);

  /* =========================
     CONTENT RENDERERS (sheet)
  ========================= */
  const CAL_SRC =
    "https://calendar.google.com/calendar/embed?src=ZXJpY3Nzb25ib25pbmlAZ21haWwuY29t&mode=AGENDA&ctz=Europe%2FStockholm&hl=sv&bgcolor=%230b1118&showTitle=0&showTabs=0&showNav=0&showPrint=0&showCalendars=0&showDate=0";

  function renderCalendar(){
    openSheet("Kalender", `
      <div class="card" style="padding:0; overflow:hidden;">
        <div style="position:relative; width:100%; height:75vh; border-radius:22px; overflow:hidden; background:#0b1118;">
          <iframe src="${CAL_SRC}" loading="lazy" style="position:absolute; inset:0; width:100%; height:100%; border:0;" scrolling="no"></iframe>
        </div>
      </div>
      <div class="miniHint">Tips: agenda-läget är snabbast. Vi kan göra “premium” senare med egen kalender-feed.</div>
    `);
  }

  function renderWeather(){
    openSheet("Väder", `
      <div class="card">
        <div style="font-weight:950;">Placeholder</div>
        <div class="miniHint" style="margin-top:6px;">Vi kopplar in Open-Meteo igen när layouten sitter helt.</div>
      </div>
    `);
  }

  function renderLists(){
    openSheet("Listor", `
      <div class="card">
        <div style="font-weight:950;">Placeholder</div>
        <div class="miniHint" style="margin-top:6px;">Din listlogik flyttar vi in efter att v2-layouten är stabil.</div>
      </div>
    `);
  }

  function renderNews(){
    openSheet("Nyheter", `
      <div class="card">
        <div style="font-weight:950;">Placeholder</div>
        <div class="miniHint" style="margin-top:6px;">Vi gör nyheter “en i taget” på START senare, och sektion här.</div>
      </div>
    `);
  }

  function renderStocks(){
    // (Vi håller den lätt nu – du sa prestanda. TradingView widgets kan vi plugga in efter.)
    openSheet("Aktier", `
      <div class="card">
        <div style="font-weight:950; margin-bottom:6px;">Watchlist</div>
        <div class="miniHint">US100 • XAUUSD • XAGUSD • EURUSD • ETHUSD • JP225 • FRA40</div>
      </div>

      <div class="card">
        <div style="font-weight:950; margin-bottom:6px;">Översikt</div>
        <div class="miniHint">Här lägger vi TradingView “Market Overview” / “Symbol Overview”. Uppdatering ~10–15s (via widget).</div>
      </div>

      <div class="card">
        <div style="font-weight:950; margin-bottom:6px;">Chart</div>
        <div class="miniHint">Här lägger vi en full TradingView chart senare, autosize.</div>
      </div>
    `);
  }

  function activateCurrent(){
    const v = VIEW_DEFS[activeIndex];

    // START is just… start. Close sheet/overlay.
    if (v.type === "start"){
      closeSheet();
      ensureOverlay(false);
      return;
    }

    // overlay
    if (v.type === "overlay"){
      closeSheet();
      ensureOverlay(true);
      return;
    }

    // sheet sections
    ensureOverlay(false);
    if (v.id === "calendar") return renderCalendar();
    if (v.id === "stocks") return renderStocks();
    if (v.id === "weather") return renderWeather();
    if (v.id === "lists") return renderLists();
    if (v.id === "news") return renderNews();
  }

  /* =========================
     TAPE (start)
  ========================= */
  function setTapeSymbols(){
    const symbols = ["US100", "XAUUSD", "XAGUSD", "EURUSD", "ETHUSD", "JP225", "FRA40"];
    const chunk = symbols.map(s => `• ${s}`).join("   ");
    // duplicate for seamless loop
    if (tapeInner) tapeInner.textContent = `${chunk}     ${chunk}`;
  }

  /* =========================
     WHEEL INPUT
  ========================= */
  let dragging = false;
  let startAngle = 0;
  let tapStartX = 0, tapStartY = 0;
  let didDrag = false;

  function angle(cx, cy, x, y){
    return Math.atan2(y - cy, x - cx) * (180 / Math.PI);
  }

  wheel?.addEventListener("pointerdown", (e) => {
    dragging = true;
    didDrag = false;
    tapStartX = e.clientX;
    tapStartY = e.clientY;

    const r = wheel.getBoundingClientRect();
    const cx = r.left + r.width/2;
    const cy = r.top + r.height/2;

    startAngle = angle(cx, cy, e.clientX, e.clientY) - rotationDeg;

    wheel.setPointerCapture?.(e.pointerId);
  }, { passive:true });

  wheel?.addEventListener("pointermove", (e) => {
    if (!dragging) return;

    const dx = e.clientX - tapStartX;
    const dy = e.clientY - tapStartY;
    if (!didDrag && Math.hypot(dx, dy) > 14) didDrag = true;

    if (didDrag){
      const r = wheel.getBoundingClientRect();
      const cx = r.left + r.width/2;
      const cy = r.top + r.height/2;

      const deg = angle(cx, cy, e.clientX, e.clientY) - startAngle;
      setRotation(deg);

      // if timer overlay is open: wheel adjusts pick (1/5/10/15/20/30)
      if (timerOverlay?.classList.contains("open")){
        const idx = sectorFromDeg(deg);
        // map wheel sectors -> timer steps
        const mapped = idx % TIMER_STEPS.length;
        setTimerPickByIndex(mapped);
      }

      e.preventDefault();
    }
  }, { passive:false });

  wheel?.addEventListener("pointerup", () => {
    if (!dragging) return;
    dragging = false;

    // Snap to nearest
    const idx = sectorFromDeg(rotationDeg);
    setRotation(idx * STEP, { silent:true });
    setActiveIndex(idx);

    // Tap = open current (like before)
    if (!didDrag){
      activateCurrent();
    }
  }, { passive:true });

  wheel?.addEventListener("pointercancel", () => { dragging = false; }, { passive:true });

  // Mouse wheel (desktop)
  wheel?.addEventListener("wheel", (e) => {
    e.preventDefault();
    const dir = e.deltaY > 0 ? 1 : -1;
    const next = (activeIndex + dir + VIEW_DEFS.length) % VIEW_DEFS.length;
    setActiveIndex(next);
  }, { passive:false });

  /* =========================
     INIT
  ========================= */
  renderIconBar();
  setTapeSymbols();

  setActiveIndex(activeIndex, { fromTap:true });
  setRotation(activeIndex * STEP, { silent:true });

  // timer defaults
  setTimerPickByIndex(timerPickIndex);
  updateTimerEdge();

})();