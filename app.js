/* =========================
   SB Dash v2 – app.js (FULL)
   Views: Stocks, Calendar, Weather, Lists, Tools, Timer
   - Fix rotation direction (clockwise advances right)
   - Remove tape
   - Tools overlay: counter + 501 modes (separate)
   - Lists: Aktiva + Slutförda (dropdown) + subtasks via detail view
   - Timer bar shrinks from TOP down
   ========================= */

(() => {
  const $ = (id) => document.getElementById(id);

  const wheel = $("wheel");
  const wheelRing = document.querySelector(".wheelRing");

  const iconRail = $("iconRail");

  const sheetWrap = $("sheetWrap");
  const sheet = $("sheet");
  const sheetTitle = $("sheetTitle");
  const sheetContent = $("sheetContent");
  const sheetCloseBtn = $("sheetCloseBtn");

  const timerOverlay = $("timerOverlay");
  const timerClose = $("timerClose");
  const timerStartBtn = $("timerStartBtn");
  const timerBigEl = $("timerBig");
  const timerSub = $("timerSub");
  const timerBar = $("timerBar");
  const timerBarWrap = $("timerBarWrap");

  const toolsOverlay = $("toolsOverlay");
  const toolsClose = $("toolsClose");

  const toolsCounterMode = $("toolsCounterMode");
  const tools501Mode = $("tools501Mode");

  const fidgetCountEl = $("fidgetCount");
  const guessOdd = $("guessOdd");
  const guessEven = $("guessEven");
  const fidgetReset = $("fidgetReset");
  const btn501 = $("btn501");
  const btn501Back = $("btn501Back");
  const dartGrid = $("dartGrid");

  const alarmAudio = $("alarmAudio");

  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const pad2 = (n) => String(n).padStart(2, "0");

  /* ---------- storage ---------- */
  const LS_KEY = "sbdashv2_store_v4";

  function loadStore() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const d = raw ? JSON.parse(raw) : null;
      return {
        lists: Array.isArray(d?.lists) ? d.lists : [],
        done:  Array.isArray(d?.done)  ? d.done  : [],
        ui:    d?.ui && typeof d.ui === "object" ? d.ui : { doneOpen: false },
      };
    } catch {
      return { lists: [], done: [], ui: { doneOpen: false } };
    }
  }
  const store = loadStore();
  const saveStore = () => localStorage.setItem(LS_KEY, JSON.stringify(store));
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());

  const fmt = (ts) =>
    new Date(ts).toLocaleString("sv-SE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  /* ---------- views ---------- */
  const VIEW_DEFS = [
    { id: "stocks",   label: "AKTIER",   icon: "assets/ui/icon-stocks.svg" },
    { id: "calendar", label: "KALENDER", icon: "assets/ui/icon-calendar.svg" },
    { id: "weather",  label: "VÄDER",    icon: "assets/ui/icon-weather.svg" },
    { id: "lists",    label: "LISTOR",   icon: "assets/ui/icon-todo.svg" },
    { id: "tools",    label: "TOOLS",    icon: "assets/ui/icon-tools.svg" },
    { id: "timer",    label: "TIMER",    icon: "assets/ui/icon-pomodoro.svg" },
  ];

  let activeIndex = 1; // Calendar
  const STEP = 360 / VIEW_DEFS.length;
  let rotationDeg = activeIndex * STEP;

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
        setRotation(idx * STEP);
        openForView(v.id);
      });

      iconRail.appendChild(b);
    });
  }

  function setActiveIndex(idx) {
    activeIndex = ((idx % VIEW_DEFS.length) + VIEW_DEFS.length) % VIEW_DEFS.length;
    renderIconRail();
  }

  /* ---------- wheel math: clockwise => advances right ---------- */
  function sectorFromDeg(deg) {
    const raw = Math.round(deg / STEP);
    return ((raw % VIEW_DEFS.length) + VIEW_DEFS.length) % VIEW_DEFS.length;
  }

  function anyOverlayOpen() {
    return timerOverlay?.classList.contains("open") || toolsOverlay?.classList.contains("open");
  }

  function setRotation(deg) {
    rotationDeg = deg;
    if (wheelRing) wheelRing.style.transform = `rotate(${deg}deg)`;

    if (!anyOverlayOpen()) {
      const idx = sectorFromDeg(deg);
      if (idx !== activeIndex) setActiveIndex(idx);

      if (document.body.classList.contains("sheetOpen")) {
        const v = VIEW_DEFS[activeIndex];
        renderView(v.id, { fast: true });
      }
    }

    if (timerOverlay?.classList.contains("open")) timerWheelSelectFromDeg(deg);
    if (toolsOverlay?.classList.contains("open")) toolsWheelFromDeg(deg);
  }

  /* ---------- wheel input ---------- */
  let dragging = false;
  let startAngle = 0;
  let tapStartX = 0, tapStartY = 0;
  let didDrag = false;

  function angle(cx, cy, x, y) {
    return Math.atan2(y - cy, x - cx) * (180 / Math.PI);
  }

  wheel?.addEventListener("pointerdown", (e) => {
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
    if (!dragging) return;
    dragging = false;

    const idx = sectorFromDeg(rotationDeg);
    setRotation(idx * STEP);

    if (!didDrag && !anyOverlayOpen()) {
      openForView(VIEW_DEFS[activeIndex].id);
    }

    if (toolsOverlay?.classList.contains("open") && toolsMode === "dart501") {
      commitDartRound();
    }
  }, { passive: true });

  wheel?.addEventListener("pointercancel", () => { dragging = false; }, { passive: true });

  wheel?.addEventListener("wheel", (e) => {
    e.preventDefault();
    const dir = e.deltaY > 0 ? 1 : -1;
    const idx = (activeIndex + dir + VIEW_DEFS.length) % VIEW_DEFS.length;
    setRotation(idx * STEP);
  }, { passive: false });

  /* ---------- sheet ---------- */
  function openSheet() {
    document.body.classList.add("sheetOpen");
    sheetWrap?.setAttribute("aria-hidden", "false");
  }
  function closeSheet() {
    document.body.classList.remove("sheetOpen");
    sheetWrap?.setAttribute("aria-hidden", "true");
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

  /* ---------- timer ---------- */
  const TIMER_PRESETS = [1,5,10,15,20,30];
  let timerPresetIndex = 1;

  const TIMER = { total: 300, left: 300, running:false, endAt:0, intervalId:0 };

  function ensureTimerBarVisible(on){
    timerBarWrap?.setAttribute("aria-hidden", on ? "false" : "true");
  }

  function updateTimerBar() {
    if (!timerBar) return;
    const pct = TIMER.total ? (1 - (TIMER.left / TIMER.total)) : 0;
    timerBar.style.transform = `scaleY(${clamp01(pct)})`; // origin top => shrinks downward
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
      setTimeout(() => { o.stop(); ctx.close(); }, 900);
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

  function stopTimerInternal() {
    TIMER.running = false;
    if (TIMER.intervalId) clearInterval(TIMER.intervalId);
    TIMER.intervalId = 0;
    document.body.classList.remove("timerRunning");
    ensureTimerBarVisible(false);
  }

  function tickTimer() {
    if (!TIMER.running) return;
    const left = Math.max(0, Math.ceil((TIMER.endAt - Date.now()) / 1000));
    TIMER.left = left;
    updateTimerBar();
    if (timerOverlay?.classList.contains("open") && timerBigEl) {
      const mm = Math.floor(left / 60), ss = left % 60;
      timerBigEl.textContent = `${pad2(mm)}:${pad2(ss)}`;
    }
    if (left <= 0) {
      stopTimerInternal();
      updateTimerBar();
      alarm();
    }
  }

 function openTimerOverlay() {
  document.body.classList.remove("toolsOpen");   // säkerhet
  document.body.classList.add("timerOpen");

  timerOverlay?.classList.add("open");
  timerOverlay?.setAttribute("aria-hidden", "false");

  const m = TIMER_PRESETS[timerPresetIndex];
  if (timerBigEl) timerBigEl.textContent = `${pad2(m)}:00`;
  if (timerSub) timerSub.textContent = `Vrid hjulet: ${TIMER_PRESETS.join(" / ")}`;
}
  function closeTimerOverlay() {
  document.body.classList.remove("timerOpen");

  timerOverlay?.classList.remove("open");
  timerOverlay?.setAttribute("aria-hidden", "true");
}
  function timerWheelSelectFromDeg(deg) {
    const idx = sectorFromDeg(deg) % TIMER_PRESETS.length;
    timerPresetIndex = idx;
    const m = TIMER_PRESETS[idx];
    if (timerBigEl) timerBigEl.textContent = `${pad2(m)}:00`;
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
  timerOverlay?.addEventListener("click", (e) => { if (e.target === timerOverlay) closeTimerOverlay(); });
  timerStartBtn?.addEventListener("click", () => {
    setTimerMinutesAndStart(TIMER_PRESETS[timerPresetIndex]);
    closeTimerOverlay();
  });

  /* ---------- tools ---------- */
  let toolsMode = "counter"; // counter | dart501
  let fidgetCount = 0;
  let fidgetLastSector = null;

  function setToolsMode(mode){
    toolsMode = mode;
    toolsCounterMode.hidden = mode !== "counter";
    tools501Mode.hidden = mode !== "dart501";
    if (mode === "dart501") { renderDart(); dartWheelToScore(); }
  }

  function openToolsOverlay() {
    closeSheet();
    closeTimerOverlay();
    toolsOverlay?.classList.add("open");
    toolsOverlay?.setAttribute("aria-hidden", "false");
    setToolsMode("counter");
    renderTools();
  }
  function closeToolsOverlay() {
    toolsOverlay?.classList.remove("open");
    toolsOverlay?.setAttribute("aria-hidden", "true");
    setToolsMode("counter");
  }

  toolsClose?.addEventListener("click", closeToolsOverlay);
  toolsOverlay?.addEventListener("click", (e) => { if (e.target === toolsOverlay) closeToolsOverlay(); });

  function renderTools(){
    if (fidgetCountEl) fidgetCountEl.textContent = String(fidgetCount);
  }

  function toolsWheelFromDeg(deg){
    if (toolsMode === "dart501") return dartWheelToScore();

    const s = sectorFromDeg(deg);
    if (fidgetLastSector === null) fidgetLastSector = s;
    if (s === fidgetLastSector) return;

    const n = VIEW_DEFS.length;
    let diff = s - fidgetLastSector;
    if (diff > n/2) diff -= n;
    if (diff < -n/2) diff += n;

    fidgetCount += diff;
    fidgetLastSector = s;
    renderTools();
  }

  function lastDigitIsOdd(x){
    const d = Math.abs(x) % 10;
    return (d % 2) === 1;
  }
  function flashResult(win){
    const card = toolsOverlay?.querySelector(".overlayCard");
    if (!card) return;
    card.classList.remove("win","lose");
    void card.offsetWidth;
    card.classList.add(win ? "win" : "lose");
  }
  guessOdd?.addEventListener("click", () => flashResult(lastDigitIsOdd(fidgetCount)));
  guessEven?.addEventListener("click", () => flashResult(!lastDigitIsOdd(fidgetCount)));
  fidgetReset?.addEventListener("click", () => { fidgetCount = 0; fidgetLastSector = null; renderTools(); });

  btn501?.addEventListener("click", () => setToolsMode("dart501"));
  btn501Back?.addEventListener("click", () => setToolsMode("counter"));

  /* ---------- dart 501 ---------- */
  const DART = {
    activePlayer: 0,
    players: [
      { name: "Spelare 1", left: 501, last: 0, round: 0 },
      { name: "Spelare 2", left: 501, last: 0, round: 0 },
      { name: "Spelare 3", left: 501, last: 0, round: 0 },
      { name: "Spelare 4", left: 501, last: 0, round: 0 },
    ]
  };

  function renderDart(){
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
        </div>`;
      card.addEventListener("click", () => {
        DART.activePlayer = idx;
        renderDart();
        dartWheelToScore();
      });
      dartGrid.appendChild(card);
    });
  }

  function dartWheelToScore(){
    const t = Math.abs(rotationDeg) / STEP;
    const score = Math.max(0, Math.min(180, Math.round((t * 20) % 181)));
    DART.players[DART.activePlayer].round = score;
    renderDart();
  }

  function commitDartRound(){
    const p = DART.players[DART.activePlayer];
    const add = Math.max(0, Math.min(180, Math.round(p.round || 0)));
    p.last = add;
    p.left = Math.max(0, p.left - add);
    DART.activePlayer = (DART.activePlayer + 1) % DART.players.length;
    renderDart();
  }

  /* ---------- open per view ---------- */
  function openForView(id){
    if (id === "timer") return openTimerOverlay();
    if (id === "tools") return openToolsOverlay();
    openSheet();
    renderView(id);
  }

  /* ---------- views ---------- */
  function renderStocks(){
    sheetTitle.textContent = "Aktier";
    sheetContent.innerHTML = `
      <div class="miniHint" style="margin-bottom:10px;">
        (Tape borttagen tills vidare) TradingView kan vi bygga vidare på sen.
      </div>
      <div class="row"><div class="rowLeft"><div class="rowTitle">Placeholder</div></div></div>
    `;
  }

  function renderCalendar(){
    sheetTitle.textContent = "Kalender";
    const CAL_SRC =
      "https://calendar.google.com/calendar/embed?src=ZXJpY3Nzb25ib25pbmlAZ21haWwuY29t&mode=AGENDA&ctz=Europe%2FStockholm&hl=sv&bgcolor=%230b1118&showTitle=0&showTabs=0&showNav=0&showPrint=0&showCalendars=0&showDate=0";
    sheetContent.innerHTML = `
      <div style="border-radius:24px; overflow:hidden; border:1px solid rgba(255,255,255,.10); background:#0b1118;">
        <iframe src="${CAL_SRC}" style="width:100%; height:78vh; border:0; display:block;" loading="lazy"></iframe>
      </div>`;
  }

  async function renderWeather(){
    sheetTitle.textContent = "Väder";
    sheetContent.innerHTML = `<div class="miniHint">Laddar väder…</div>`;
    try{
      const lat = 59.3293, lon = 18.0686;
      const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,apparent_temperature,wind_speed_10m` +
        `&hourly=temperature_2m` +
        `&daily=temperature_2m_max,temperature_2m_min` +
        `&timezone=Europe%2FStockholm`;
      const r = await fetch(url, { cache: "no-store" });
      const data = await r.json();

      const nowT = Math.round(data.current.temperature_2m);
      const feels = Math.round(data.current.apparent_temperature);
      const wind = Math.round(data.current.wind_speed_10m);

      sheetContent.innerHTML = `
        <div class="row" style="margin-bottom:12px;">
          <div class="rowLeft">
            <div class="rowTitle">${nowT}° • Känns ${feels}°</div>
            <div class="miniHint">Vind ${wind} m/s</div>
          </div>
          <div class="rowMeta">${new Date().toLocaleTimeString("sv-SE",{hour:"2-digit",minute:"2-digit"})}</div>
        </div>
        <div class="miniHint">Nästa steg: full SB Dash-väder med ikoner/nederbörd.</div>`;
    } catch {
      sheetContent.innerHTML = `<div class="miniHint">Kunde inte hämta väder.</div>`;
    }
  }

  function renderTaskDetail({ id, fromDone }){
    const item = (fromDone ? store.done : store.lists).find(x => x.id === id);
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
      item.subtasks.forEach(st => {
        const li = document.createElement("li");
        li.className = "row";
        li.innerHTML = `
          <input class="roundCheck" type="checkbox" ${st.done ? "checked" : ""}/>
          <div class="rowLeft"><div class="rowTitle">${escapeHtml(st.text)}</div></div>
          <div class="rowMeta"></div>
        `;
        const cb = li.querySelector("input");
        cb.addEventListener("change", () => { st.done = !!cb.checked; saveStore(); });
        listEl.appendChild(li);
      });
    };

    const add = () => {
      const input = $("subtaskInput");
      const t = (input.value || "").trim();
      if (!t) return;
      item.subtasks.unshift({ id: uid(), text: t, done: false });
      input.value = "";
      saveStore();
      draw();
    };
    $("subtaskAdd")?.addEventListener("click", add);
    $("subtaskInput")?.addEventListener("keydown", (e) => { if (e.key === "Enter") add(); });

    draw();
  }

  function renderLists(){
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
        store.lists.forEach(item => {
          item.subtasks = Array.isArray(item.subtasks) ? item.subtasks : [];
          const li = document.createElement("li");
          li.className = "row";
          li.innerHTML = `
            <input class="roundCheck" type="checkbox" />
            <div class="rowLeft" style="cursor:pointer;">
              <div class="rowTitle">${escapeHtml(item.text)}</div>
              <div class="miniHint">${item.subtasks.length ? `${item.subtasks.filter(s=>s.done).length}/${item.subtasks.length} deluppgifter` : "Inga deluppgifter"}</div>
            </div>
            <div class="rowMeta">${fmt(item.createdAt)}</div>
          `;

          li.querySelector(".rowLeft")?.addEventListener("click", () => {
            renderTaskDetail({ id: item.id, fromDone: false });
          });

          const cb = li.querySelector("input");
          cb.addEventListener("change", () => {
            if (!cb.checked) return;
            store.lists = store.lists.filter(x => x.id !== item.id);
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
          store.done.forEach(item => {
            item.subtasks = Array.isArray(item.subtasks) ? item.subtasks : [];
            const li = document.createElement("li");
            li.className = "row";
            li.style.opacity = ".88";
            li.innerHTML = `
              <input class="roundCheck" type="checkbox" checked />
              <div class="rowLeft" style="cursor:pointer;">
                <div class="rowTitle">${escapeHtml(item.text)}</div>
                <div class="miniHint">${item.subtasks.length ? `${item.subtasks.filter(s=>s.done).length}/${item.subtasks.length} deluppgifter` : "—"}</div>
              </div>
              <div class="rowMeta">${fmt(item.doneAt || Date.now())}</div>
            `;

            li.querySelector(".rowLeft")?.addEventListener("click", () => {
              renderTaskDetail({ id: item.id, fromDone: true });
            });

            const cb = li.querySelector("input");
            cb.addEventListener("change", () => {
              if (cb.checked) return;
              store.done = store.done.filter(x => x.id !== item.id);
              store.lists.unshift({
                id: item.id,
                text: item.text,
                createdAt: item.createdAt || Date.now(),
                subtasks: item.subtasks
              });
              saveStore();
              renderLists();
            });

            doneEl.appendChild(li);
          });
        }
      }
    };

    const add = () => {
      const t = (input.value || "").trim();
      if (!t) return;
      store.lists.unshift({ id: uid(), text: t, createdAt: Date.now(), subtasks: [] });
      input.value = "";
      saveStore();
      renderLists();
    };

    addBtn?.addEventListener("click", add);
    input?.addEventListener("keydown", (e) => { if (e.key === "Enter") add(); });

    draw();
  }

  function renderView(id){
    if (id === "stocks") return renderStocks();
    if (id === "calendar") return renderCalendar();
    if (id === "weather") return renderWeather();
    if (id === "lists") return renderLists();
    sheetTitle.textContent = "—";
    sheetContent.innerHTML = `<div class="miniHint">—</div>`;
  }

  /* ---------- init ---------- */
  function init(){
    setActiveIndex(activeIndex);
    setRotation(activeIndex * STEP);
    updateTimerBar();
    ensureTimerBarVisible(false);

    // warn if wheel svg path is wrong
    const img = document.querySelector(".wheelRing");
    img?.addEventListener("error", () => {
      console.warn("wheel-ring.svg kunde inte laddas. Kolla src i index.html:", img.getAttribute("src"));
    });
  }

  init();
})();
