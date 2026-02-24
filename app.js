/* =========================
   SB Dash v2 – app.js (FULL)
   - Wheel left, icons centered row
   - Click opens section
   - Timer overlay (wheel selects minutes)
   - Fidget overlay + Odd/Even + 501 (Dart = A -> wheel active)
   ========================= */

(() => {
  const $ = (id) => document.getElementById(id);

  /* ===== ELEMENTS ===== */
  const wheel = $("wheel");
  const wheelRing = document.querySelector(".wheelRing");
  const wheelWrap = $("wheelWrap");
  const wheelDot = $("wheelDot");

  const iconRail = $("iconRail");
  const tape = $("tape");

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

  const btnTimer = $("btnTimer");
  const btnFidget = $("btnFidget");

  const fidgetOverlay = $("fidgetOverlay");
  const fidgetClose = $("fidgetClose");
  const fidgetCountEl = $("fidgetCount");
  const fidgetHint = $("fidgetHint");
  const guessOdd = $("guessOdd");
  const guessEven = $("guessEven");
  const fidgetReset = $("fidgetReset");
  const btn501 = $("btn501");
  const dartWrap = $("dartWrap");
  const dartGrid = $("dartGrid");

  const alarmAudio = $("alarmAudio");

  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const pad2 = (n) => String(n).padStart(2, "0");

  /* =========================
     STORAGE (lists etc)
  ========================= */
  const LS_KEY = "sbdashv2_store_v1";

  function loadStore() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const d = raw ? JSON.parse(raw) : null;
      return {
        lists: Array.isArray(d?.lists) ? d.lists : [],
        done:  Array.isArray(d?.done)  ? d.done  : [],
      };
    } catch {
      return { lists: [], done: [] };
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

  /* =========================
     VIEWS + ICONS
     (Start is center and NOT openable)
  ========================= */
  const VIEW_DEFS = [
    { id: "stocks",   label: "AKTIER",    icon: "assets/ui/icon-stocks.svg", openable: true },
    { id: "calendar", label: "KALENDER",  icon: "assets/ui/icon-calendar.svg", openable: true },
    { id: "start",    label: "START",     icon: "assets/ui/icon-start.svg", openable: false },
    { id: "weather",  label: "VÄDER",     icon: "assets/ui/icon-weather.svg", openable: true },
    { id: "lists",    label: "LISTOR",    icon: "assets/ui/icon-todo.svg", openable: true },
  ];

  let activeIndex = 2; // START
  const STEP = 360 / VIEW_DEFS.length;
  let rotationDeg = activeIndex * STEP;

  /* =========================
     ICON RAIL RENDER
  ========================= */
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
        if (v.openable) openSheetFor(v.id);
      });

      iconRail.appendChild(b);
    });
  }

  function setActiveIndex(idx) {
    activeIndex = ((idx % VIEW_DEFS.length) + VIEW_DEFS.length) % VIEW_DEFS.length;
    renderIconRail();
    renderTape();
  }

  /* =========================
     WHEEL MATH
     NOTE: "Clockwise => upper becomes next"
     We invert the angle mapping by negating deg in sectorFromDeg.
  ========================= */
  function sectorFromDeg(deg) {
    // invert so clockwise moves "forward"
    const inv = -deg;
    const raw = Math.round(inv / STEP);
    return ((raw % VIEW_DEFS.length) + VIEW_DEFS.length) % VIEW_DEFS.length;
  }

  function setRotation(deg) {
    rotationDeg = deg;
    if (wheelRing) wheelRing.style.transform = `rotate(${deg}deg)`;

    const idx = sectorFromDeg(deg);
    if (idx !== activeIndex) setActiveIndex(idx);

    // If a section sheet is open, keep it showing the current view (fast swap)
    if (document.body.classList.contains("sheetOpen")) {
      const v = VIEW_DEFS[activeIndex];
      if (v.openable) renderView(v.id, { fast: true });
    }

    // Timer overlay: wheel selects minutes
    if (timerOverlay?.classList.contains("open")) {
      timerWheelSelectFromDeg(deg);
    }

    // Fidget overlay: wheel increments counter
    if (fidgetOverlay?.classList.contains("open")) {
      fidgetWheelFromDeg(deg);
    }
  }

  /* =========================
     WHEEL INPUT (drag + wheel)
  ========================= */
  let dragging = false;
  let startAngle = 0;
  let tapStartX = 0, tapStartY = 0;
  let didDrag = false;

  function angle(cx, cy, x, y) {
    return Math.atan2(y - cy, x - cx) * (180 / Math.PI);
  }

  function openSheetFor(id) {
    const v = VIEW_DEFS.find(x => x.id === id);
    if (!v || !v.openable) return;
    openSheet();
    renderView(id, { fast: true });
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

    // snap
    const idx = sectorFromDeg(rotationDeg);
    setRotation((-idx) * STEP); // keep inversion consistent

    if (!didDrag) {
      const v = VIEW_DEFS[activeIndex];
      if (v.openable) openSheetFor(v.id);
    }
  }, { passive: true });

  wheel?.addEventListener("pointercancel", () => { dragging = false; }, { passive: true });

  wheel?.addEventListener("wheel", (e) => {
    e.preventDefault();
    const dir = e.deltaY > 0 ? 1 : -1;
    const idx = (activeIndex + dir + VIEW_DEFS.length) % VIEW_DEFS.length;
    setRotation((-idx) * STEP);
  }, { passive: false });

  /* =========================
     SHEET OPEN/CLOSE
  ========================= */
  function openSheet() {
    document.body.classList.add("sheetOpen");
    sheetWrap?.setAttribute("aria-hidden", "false");
  }
  function closeSheet() {
    document.body.classList.remove("sheetOpen");
    sheetWrap?.setAttribute("aria-hidden", "true");
  }
  sheetCloseBtn?.addEventListener("click", closeSheet);

  // swipe-down to close (keeps your iPhone feel)
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

  sheet?.addEventListener("pointerup", (e) => {
    if (sheetDragStartY == null) return;
    const delta = e.clientY - sheetDragStartY;
    sheet.style.transform = "";
    sheetDragStartY = null;
    if (delta > 140) closeSheet();
  }, { passive: true });

  sheet?.addEventListener("pointercancel", () => {
    sheet.style.transform = "";
    sheetDragStartY = null;
  }, { passive: true });

  /* =========================
     START TAPE (small)
  ========================= */
  const TAPE_ITEMS = [
    { sym: "US100", val: "—" },
    { sym: "XAUUSD", val: "—" },
    { sym: "XAGUSD", val: "—" },
    { sym: "EURUSD", val: "—" },
    { sym: "ETHUSD", val: "—" },
    { sym: "JP225", val: "—" },
    { sym: "FRA40", val: "—" },
  ];

  function renderTape() {
    if (!tape) return;
    // show it always but subtle
    tape.innerHTML = TAPE_ITEMS.slice(0, 6).map(x => `
      <div class="tapePill">
        <span class="tapeSym">${x.sym}</span>
        <span class="tapeVal">${x.val}</span>
      </div>
    `).join("");
  }

  /* =========================
     TIMER (overlay + bar + alarm)
     - wheel selects minutes
  ========================= */
  const TIMER_PRESETS = [1,5,10,15,20,30];
  let timerPresetIndex = 1; // default 5

  const TIMER = {
    total: 5 * 60,
    left:  5 * 60,
    running: false,
    endAt: 0,
    intervalId: 0,
  };

  function timerText() {
    const safe = Math.max(0, Math.floor(TIMER.left));
    const mm = Math.floor(safe / 60);
    const ss = safe % 60;
    return `${pad2(mm)}:${pad2(ss)}`;
  }

  function ensureTimerBarVisible(on){
    if (!timerBarWrap) return;
    timerBarWrap.setAttribute("aria-hidden", on ? "false" : "true");
  }

  function updateTimerBar() {
    if (!timerBar) return;
    const pct = TIMER.total ? (TIMER.left / TIMER.total) : 0;
    timerBar.style.transform = `scaleY(${clamp01(pct)})`;
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
    if (TIMER.intervalId) {
      clearInterval(TIMER.intervalId);
      TIMER.intervalId = 0;
    }
    document.body.classList.remove("timerRunning");
    ensureTimerBarVisible(false);
  }

  function tickTimer() {
    if (!TIMER.running) return;

    const now = Date.now();
    const left = Math.max(0, Math.ceil((TIMER.endAt - now) / 1000));
    TIMER.left = left;

    updateTimerBar();

    // update overlay text if open
    if (timerOverlay?.classList.contains("open")) {
      if (timerBigEl) timerBigEl.textContent = timerText();
    }

    if (left <= 0) {
      stopTimerInternal();
      updateTimerBar();
      alarm();
    }
  }

  function setTimerMinutesAndStart(min) {
    const m = Number(min);
    if (!Number.isFinite(m) || m <= 0) return;

    stopTimerInternal();

    TIMER.total = Math.round(m * 60);
    TIMER.left  = TIMER.total;
    TIMER.endAt = Date.now() + TIMER.total * 1000;
    TIMER.running = true;

    document.body.classList.add("timerRunning");
    ensureTimerBarVisible(true);

    tickTimer();
    TIMER.intervalId = setInterval(tickTimer, 250);
  }

  function openTimerOverlay() {
    timerOverlay?.classList.add("open");
    timerOverlay?.setAttribute("aria-hidden", "false");

    // show selected preset
    const m = TIMER_PRESETS[timerPresetIndex];
    if (timerBigEl) timerBigEl.textContent = `${pad2(m)}:00`;
    if (timerSub) timerSub.textContent = `Vrid hjulet: ${TIMER_PRESETS.join(" / ")}`;
  }

  function closeTimerOverlay() {
    timerOverlay?.classList.remove("open");
    timerOverlay?.setAttribute("aria-hidden", "true");
  }

  function timerWheelSelectFromDeg(deg) {
    // map wheel angle to preset index (snappy)
    const idx = sectorFromDeg(deg) % TIMER_PRESETS.length;
    timerPresetIndex = idx;
    const m = TIMER_PRESETS[timerPresetIndex];

    if (timerBigEl) timerBigEl.textContent = `${pad2(m)}:00`;
  }

  btnTimer?.addEventListener("click", openTimerOverlay);
  timerClose?.addEventListener("click", closeTimerOverlay);

  timerStartBtn?.addEventListener("click", () => {
    const m = TIMER_PRESETS[timerPresetIndex];
    setTimerMinutesAndStart(m);
    closeTimerOverlay();
  });

  /* =========================
     FIDGET (overlay)
     - wheel increments endlessly
     - odd/even guess on last digit
     - 501 panel toggled
  ========================= */
  let fidgetCount = 0;
  let fidgetLastSector = null;

  function openFidgetOverlay() {
    fidgetOverlay?.classList.add("open");
    fidgetOverlay?.setAttribute("aria-hidden", "false");
    if (wheelDot) wheelDot.style.opacity = "1";
    renderFidget();
  }

  function closeFidgetOverlay() {
    fidgetOverlay?.classList.remove("open");
    fidgetOverlay?.setAttribute("aria-hidden", "true");
    if (wheelDot) wheelDot.style.opacity = "0";
    // keep dart visible state as-is? we keep it but hide by default on next open:
    if (dartWrap) dartWrap.hidden = true;
  }

  function renderFidget() {
    if (fidgetCountEl) fidgetCountEl.textContent = String(fidgetCount);
  }

  function fidgetWheelFromDeg(deg) {
    const s = sectorFromDeg(deg);
    if (fidgetLastSector === null) fidgetLastSector = s;
    if (s === fidgetLastSector) return;

    // distance across wrap-around
    const n = VIEW_DEFS.length;
    let diff = s - fidgetLastSector;
    if (diff > n/2) diff -= n;
    if (diff < -n/2) diff += n;

    // each sector step increments by 1 (fast but controlled)
    fidgetCount += diff;
    fidgetLastSector = s;

    renderFidget();

    // If 501 active and a player is active, use wheel to set "round score"
    if (dartWrap && !dartWrap.hidden) {
      dartWheelToScore();
    }
  }

  function lastDigitIsOdd(x) {
    const d = Math.abs(x) % 10;
    return (d % 2) === 1;
  }

  function flashResult(win) {
    const card = fidgetOverlay?.querySelector(".overlayCard");
    if (!card) return;
    card.classList.remove("win","lose");
    // force reflow
    void card.offsetWidth;
    card.classList.add(win ? "win" : "lose");
  }

  function guessOddEven(wantOdd) {
    const isOdd = lastDigitIsOdd(fidgetCount);
    const win = (wantOdd === isOdd);
    flashResult(win);
  }

  btnFidget?.addEventListener("click", openFidgetOverlay);
  fidgetClose?.addEventListener("click", closeFidgetOverlay);

  guessOdd?.addEventListener("click", () => guessOddEven(true));
  guessEven?.addEventListener("click", () => guessOddEven(false));

  fidgetReset?.addEventListener("click", () => {
    fidgetCount = 0;
    fidgetLastSector = null;
    renderFidget();
  });

  /* =========================
     DART 501 (inside fidget overlay)
     - 4 player cards
     - wheel sets "round score" 0..180
     - auto-commits and hops to next player
  ========================= */
  const DART = {
    active: false,
    activePlayer: 0,
    players: [
      { name: "Spelare 1", left: 501, last: 0, round: 0 },
      { name: "Spelare 2", left: 501, last: 0, round: 0 },
      { name: "Spelare 3", left: 501, last: 0, round: 0 },
      { name: "Spelare 4", left: 501, last: 0, round: 0 },
    ]
  };

  function openDart501() {
    if (!dartWrap || !dartGrid) return;
    dartWrap.hidden = false;
    DART.active = true;
    renderDart();
    dartWheelToScore();
  }

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
        dartWheelToScore();
      });

      dartGrid.appendChild(card);
    });
  }

  function dartWheelToScore() {
    // Map wheel angle -> 0..180
    // Use rotationDeg to create a continuous value: each STEP changes score by ~20
    const t = Math.abs(rotationDeg) / STEP;     // grows with rotation
    const score = Math.max(0, Math.min(180, Math.round((t * 20) % 181)));

    const p = DART.players[DART.activePlayer];
    p.round = score;
    renderDart();
  }

  function commitDartRound() {
    const p = DART.players[DART.activePlayer];
    const add = Math.max(0, Math.min(180, Math.round(p.round || 0)));

    // basic safe: don’t go below 0 in this first version
    p.last = add;
    p.left = Math.max(0, p.left - add);

    // hop to next
    DART.activePlayer = (DART.activePlayer + 1) % DART.players.length;

    renderDart();
  }

  // Auto-commit in “real time” when wheel stops dragging (nice UX)
  wheel?.addEventListener("pointerup", () => {
    if (dartWrap && !dartWrap.hidden) commitDartRound();
  }, { passive: true });

  btn501?.addEventListener("click", () => {
    // toggle
    if (!dartWrap) return;
    if (dartWrap.hidden) openDart501();
    else dartWrap.hidden = true;
  });

  /* =========================
     WEATHER / NEWS / CALENDAR / STOCKS / LISTS
     (Simple + stable; can be upgraded later)
  ========================= */

  async function renderWeather() {
    sheetTitle.textContent = "Väder";
    sheetContent.innerHTML = `<div class="miniHint">Laddar väder…</div>`;

    try {
      const lat = 59.3293, lon = 18.0686;
      const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,apparent_temperature,wind_speed_10m,weather_code` +
        `&timezone=Europe%2FStockholm`;

      const r = await fetch(url, { cache: "no-store" });
      const data = await r.json();

      const t = Math.round(data.current.temperature_2m);
      const feels = Math.round(data.current.apparent_temperature);
      const w = Math.round(data.current.wind_speed_10m);

      sheetContent.innerHTML = `
        <div class="row" style="margin-bottom:12px;">
          <div class="rowLeft">
            <div class="rowTitle">${t}° • Känns ${feels}°</div>
            <div class="miniHint">Vind: ${w} m/s</div>
          </div>
          <div class="rowMeta">${new Date().toLocaleTimeString("sv-SE", { hour:"2-digit", minute:"2-digit" })}</div>
        </div>
        <div class="miniHint">Premium-vy kan vi bygga sen (timmar + tema + ikoner).</div>
      `;
    } catch {
      sheetContent.innerHTML = `<div class="miniHint">Kunde inte hämta väder.</div>`;
    }
  }

  async function renderNews() {
    sheetTitle.textContent = "Nyheter";
    sheetContent.innerHTML = `<div class="miniHint">Laddar nyheter…</div>`;

    // Keep it stable: one proxy (can expand later)
    const RSS = "https://news.google.com/rss?hl=sv&gl=SE&ceid=SE:sv";
    const proxy = (u) => `https://r.jina.ai/https://${u.replace(/^https?:\/\//, "")}`;

    try {
      const res = await fetch(proxy(RSS), { cache: "no-store" });
      const xmlText = await res.text();
      const xml = new DOMParser().parseFromString(xmlText, "text/xml");
      const items = Array.from(xml.querySelectorAll("item")).slice(0, 10).map((item) => ({
        title: item.querySelector("title")?.textContent?.trim() || "Nyhet",
        link: item.querySelector("link")?.textContent?.trim() || "#",
        pubDate: item.querySelector("pubDate")?.textContent?.trim() || "",
      }));

      const featured = items[0]?.title || "—";

      sheetContent.innerHTML = `
        <div class="row" style="margin-bottom:12px;">
          <div class="rowLeft">
            <div class="rowTitle">${escapeHtml(featured)}</div>
            <div class="miniHint">Tryck på en rad för att öppna i ny flik.</div>
          </div>
        </div>
        <ul class="miniList">
          ${items.map(it => `
            <li class="row" style="cursor:pointer;" data-link="${escapeHtml(it.link)}">
              <div class="rowLeft">
                <div class="rowTitle">${escapeHtml(it.title)}</div>
              </div>
              <div class="rowMeta">${it.pubDate ? new Date(it.pubDate).toLocaleTimeString("sv-SE",{hour:"2-digit",minute:"2-digit"}) : ""}</div>
            </li>
          `).join("")}
        </ul>
      `;

      sheetContent.querySelectorAll("[data-link]").forEach((li) => {
        li.addEventListener("click", () => {
          const link = li.getAttribute("data-link");
          if (link && link !== "#") window.open(link, "_blank", "noopener,noreferrer");
        });
      });
    } catch {
      sheetContent.innerHTML = `<div class="miniHint">Kunde inte hämta nyheter.</div>`;
    }
  }

  function renderCalendar() {
    sheetTitle.textContent = "Kalender";
    const CAL_SRC =
      "https://calendar.google.com/calendar/embed?src=ZXJpY3Nzb25ib25pbmlAZ21haWwuY29t&mode=AGENDA&ctz=Europe%2FStockholm&hl=sv&bgcolor=%230b1118&showTitle=0&showTabs=0&showNav=0&showPrint=0&showCalendars=0&showDate=0";

    sheetContent.innerHTML = `
      <div style="border-radius:24px; overflow:hidden; border:1px solid rgba(255,255,255,.10); background:#0b1118;">
        <iframe
          src="${CAL_SRC}"
          style="width:100%; height:78vh; border:0; display:block;"
          loading="lazy"
        ></iframe>
      </div>
      <div class="miniHint" style="margin-top:10px;">(Premium) Vi kan senare ersätta med riktig agenda-lista.</div>
    `;
  }

  function renderStocks() {
    sheetTitle.textContent = "Aktier";
    sheetContent.innerHTML = `
      <div class="miniHint" style="margin-bottom:10px;">
        TradingView (10–15s). Vi kan bygga 2–3 sidor här: Watchlist • Overview • (sen) Chart.
      </div>

      <div class="row" style="margin-bottom:12px;">
        <div class="rowLeft">
          <div class="rowTitle">Watchlist</div>
          <div class="miniHint">US100 • XAUUSD • XAGUSD • EURUSD • ETHUSD • JP225 • FRA40</div>
        </div>
      </div>

      <div id="tvWatch" style="border-radius:24px; overflow:hidden; border:1px solid rgba(255,255,255,.10); background:rgba(0,0,0,.18); min-height:520px;"></div>
    `;

    // Inject TradingView widget (watchlist)
    // Note: runs only when you open the view (good for performance)
    const target = document.getElementById("tvWatch");
    if (!target) return;

    target.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-market-quotes.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      width: "100%",
      height: 520,
      symbolsGroups: [
        {
          name: "Markets",
          symbols: [
            { name: "OANDA:NAS100USD", displayName: "US100" },
            { name: "OANDA:XAUUSD", displayName: "Gold" },
            { name: "OANDA:XAGUSD", displayName: "Silver" },
            { name: "OANDA:EURUSD", displayName: "EURUSD" },
            { name: "COINBASE:ETHUSD", displayName: "ETH" },
            { name: "OANDA:JP225USD", displayName: "Japan 225" },
            { name: "OANDA:FRA40EUR", displayName: "France 40" }
          ]
        }
      ],
      showSymbolLogo: true,
      colorTheme: "dark",
      isTransparent: true,
      locale: "sv",
    });
    target.appendChild(script);
  }

  function renderLists() {
    sheetTitle.textContent = "Listor";

    sheetContent.innerHTML = `
      <div class="miniForm">
        <input id="listInput" class="miniInput" placeholder="Ny sak..." maxlength="160"/>
        <button id="listAdd" class="miniBtn">+</button>
      </div>

      <div class="miniHint" style="margin-bottom:10px;">
        Bock = flytta till Slutförda • Ångra i Slutförda genom att bocka ur.
      </div>

      <div class="row" style="margin-bottom:10px;">
        <div class="rowLeft">
          <div class="rowTitle">Att göra</div>
        </div>
        <div class="rowMeta">${store.lists.length}</div>
      </div>
      <ul class="miniList" id="todoList"></ul>

      <div class="row" style="margin:18px 0 10px 0;">
        <div class="rowLeft">
          <div class="rowTitle">Slutförda</div>
        </div>
        <div class="rowMeta">${store.done.length}</div>
      </div>
      <ul class="miniList" id="doneList"></ul>
    `;

    const input = $("listInput");
    const addBtn = $("listAdd");
    const todoEl = $("todoList");
    const doneEl = $("doneList");

    const draw = () => {
      todoEl.innerHTML = "";
      doneEl.innerHTML = "";

      if (!store.lists.length) {
        todoEl.innerHTML = `<li class="miniHint">Inget här ännu.</li>`;
      } else {
        store.lists.forEach((item) => {
          const li = document.createElement("li");
          li.className = "row";
          li.innerHTML = `
            <input class="roundCheck" type="checkbox" />
            <div class="rowLeft">
              <div class="rowTitle">${escapeHtml(item.text)}</div>
            </div>
            <div class="rowMeta">${fmt(item.createdAt)}</div>
          `;

          const cb = li.querySelector("input");
          cb.addEventListener("change", () => {
            if (!cb.checked) return;
            // move to done
            store.lists = store.lists.filter(x => x.id !== item.id);
            store.done.unshift({ ...item, doneAt: Date.now() });
            saveStore();
            renderLists();
          });

          todoEl.appendChild(li);
        });
      }

      if (!store.done.length) {
        doneEl.innerHTML = `<li class="miniHint">Inget slutfört ännu.</li>`;
      } else {
        store.done.forEach((item) => {
          const li = document.createElement("li");
          li.className = "row";
          li.style.opacity = ".88";
          li.innerHTML = `
            <input class="roundCheck" type="checkbox" checked />
            <div class="rowLeft">
              <div class="rowTitle">${escapeHtml(item.text)}</div>
            </div>
            <div class="rowMeta">${fmt(item.doneAt)}</div>
          `;

          const cb = li.querySelector("input");
          cb.addEventListener("change", () => {
            // uncheck = restore
            if (cb.checked) return;
            store.done = store.done.filter(x => x.id !== item.id);
            store.lists.unshift({ id: item.id, text: item.text, createdAt: item.createdAt || Date.now() });
            saveStore();
            renderLists();
          });

          doneEl.appendChild(li);
        });
      }
    };

    const add = () => {
      const t = (input.value || "").trim();
      if (!t) return;
      store.lists.unshift({ id: uid(), text: t, createdAt: Date.now() });
      input.value = "";
      saveStore();
      renderLists();
    };

    addBtn.addEventListener("click", add);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") add(); });

    draw();
  }

  function renderView(id, { fast = false } = {}) {
    if (id === "calendar") return renderCalendar();
    if (id === "weather")  return renderWeather();
    if (id === "news")     return renderNews();
    if (id === "stocks")   return renderStocks();
    if (id === "lists")    return renderLists();

    sheetTitle.textContent = "—";
    sheetContent.innerHTML = `<div class="miniHint">Kommer snart.</div>`;
  }

  /* =========================
     INIT
  ========================= */
  function init() {
    // initial wheel orientation snapped to START
    setActiveIndex(activeIndex);
    setRotation((-activeIndex) * STEP);

    renderTape();

    // close sheet if tapping outside (optional)
    sheetWrap?.addEventListener("click", (e) => {
      if (e.target === sheetWrap) closeSheet();
    });

    // overlays: backdrop click close
    timerOverlay?.addEventListener("click", (e) => {
      if (e.target === timerOverlay) closeTimerOverlay();
    });
    fidgetOverlay?.addEventListener("click", (e) => {
      if (e.target === fidgetOverlay) closeFidgetOverlay();
    });

    // show initial timer bar state
    updateTimerBar();
    ensureTimerBarVisible(false);
  }

  init();
})();