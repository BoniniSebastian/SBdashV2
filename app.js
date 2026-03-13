(() => {
  const $ = (id) => document.getElementById(id);

  /* =========================
     CONFIG
  ========================= */
  const APP = {
    location: {
      label: "Värmdö",
      lat: 59.313,
      lon: 18.417,
      timezone: "Europe/Stockholm"
    },
    calendarEmbedUrl: "",
    newsSiteEmbedUrl: "",
    lightningEmbedUrl: "https://www.lightningmaps.org/#m=oss;t=3;s=0;o=0;b=;ts=0;z=5;y=59.313;x=18.417;d=2;dl=2;dc=0;",
    favorites: [
      { label: "Gold", symbol: "OANDA:XAUUSD" },
      { label: "Silver", symbol: "OANDA:XAGUSD" },
      { label: "Oil", symbol: "TVC:USOIL" },
      { label: "ETH", symbol: "BINANCE:ETHUSDT" },
      { label: "France", symbol: "TVC:CAC40" },
      { label: "Japan", symbol: "TVC:NI225" },
      { label: "EUR/USD", symbol: "FX:EURUSD" }
    ]
  };

  const STORAGE = {
    tasks: "sbflip_tasks_v1",
    notes: "sbflip_notes_v1"
  };

  const previewOrder = [
    { id: "notes", label: "Notes", moduleId: "notesModule" },
    { id: "news", label: "News", moduleId: "newsModule" },
    { id: "markets", label: "Markets", moduleId: "marketsModule" },
    { id: "weather", label: "Weather", moduleId: "weatherModule" },
    { id: "earth", label: "Earth", moduleId: "earthModule" },
    { id: "iss", label: "ISS", moduleId: "issModule" },
    { id: "newssite", label: "Site", moduleId: "newsSiteModule" },
    { id: "lightning", label: "Lightning", moduleId: "lightningModule" },
    { id: "solar", label: "Solar", moduleId: "solarModule" }
  ];

  const homeCards = [
    { id: "weatherHome", moduleId: "weatherModule", type: "weather", className: "weatherCard", area: "a" },
    { id: "tasksHome", moduleId: "tasksModule", type: "tasks", className: "tasksCard", area: "b" },
    { id: "calendarHome", moduleId: "calendarModule", type: "calendar", className: "calendarCard", area: "c" }
  ];

  const moduleDefs = {
    tasksModule: {
      id: "tasksModule",
      type: "tasks",
      theme: "dark",
      pages: [{ id: "tasksAll", type: "tasks" }]
    },
    calendarModule: {
      id: "calendarModule",
      type: "calendar",
      theme: "light",
      pages: [{ id: "calendarFull", type: "calendar" }]
    },
    weatherModule: {
      id: "weatherModule",
      type: "weather",
      theme: "gradient",
      pages: [
        { id: "weatherNow", type: "weather-now" },
        { id: "weatherHours", type: "weather-hours" },
        { id: "weatherDays", type: "weather-days" }
      ]
    },
    notesModule: {
      id: "notesModule",
      type: "notes",
      theme: "dark",
      pages: [{ id: "notesEdit", type: "notes" }]
    },
    newsModule: {
      id: "newsModule",
      type: "news",
      theme: "dark",
      pages: [{ id: "newsTv", type: "tv-timeline" }]
    },
    marketsModule: {
      id: "marketsModule",
      type: "markets",
      theme: "dark",
      pages: [
        { id: "marketsOverview", type: "tv-symbol-overview" },
        { id: "marketsChart", type: "tv-advanced-chart" }
      ]
    },
    earthModule: {
      id: "earthModule",
      type: "earth",
      theme: "dark",
      pages: [{ id: "earthFull", type: "earth" }]
    },
    issModule: {
      id: "issModule",
      type: "iss",
      theme: "dark",
      pages: [
        { id: "issNow", type: "iss" },
        { id: "issMap", type: "iss-map" }
      ]
    },
    newsSiteModule: {
      id: "newsSiteModule",
      type: "newssite",
      theme: "light",
      pages: [{ id: "newsSiteFrame", type: "news-site" }]
    },
    lightningModule: {
      id: "lightningModule",
      type: "lightning",
      theme: "dark",
      pages: [{ id: "lightningFrame", type: "lightning" }]
    },
    solarModule: {
      id: "solarModule",
      type: "solar",
      theme: "dark",
      pages: [
        { id: "solarNow", type: "solar" },
        { id: "solarChart", type: "solar-chart" }
      ]
    }
  };

  /* =========================
     STATE
  ========================= */
  const state = {
    surface: { kind: "home", previewIndex: null },
    verticalGesture: null,
    module: { open: false, id: null, pageIndex: 0, origin: "home" },
    moduleGesture: null,
    notes: loadNotes(),
    tasks: loadTasks(),
    weather: null,
    solar: null,
    iss: null,
    earth: null,
    tvReady: false,
    tvInitQueue: new Set()
  };

  const els = {
    currentSurface: $("currentSurface"),
    incomingSurface: $("incomingSurface"),
    moduleLayer: $("moduleLayer"),
    moduleTrack: $("moduleTrack"),
    bottomRail: $("bottomRail"),
    railText: $("railText"),
    homeBtn: $("homeBtn")
  };

  init();

  function init() {
    renderSurface();
    updateRail();
    bindSurfaceGestures();
    bindHomeButton();
    bindGlobalKeys();
    bootData();
    ensureTradingView();
  }

  async function bootData() {
    await Promise.allSettled([
      fetchWeather(),
      fetchSolar(),
      fetchISS(),
      fetchEarth()
    ]);
    rerenderAll();
    setInterval(fetchWeather, 10 * 60 * 1000);
    setInterval(fetchSolar, 5 * 60 * 1000);
    setInterval(fetchISS, 30 * 1000);
    setInterval(fetchEarth, 30 * 60 * 1000);
  }

  function rerenderAll() {
    renderSurface();
    if (state.module.open) {
      const active = els.moduleTrack.querySelector(`.moduleShell[data-module="${state.module.id}"]`);
      if (active) populateModule(active, moduleDefs[state.module.id]);
    }
  }

  /* =========================
     SURFACE / HOME / PREVIEWS
  ========================= */
  function renderSurface() {
    els.currentSurface.innerHTML = "";
    const scroller = document.createElement("div");
    scroller.className = "pageScroller";
    const content = document.createElement("div");
    content.className = "pageContent";
    scroller.appendChild(content);
    els.currentSurface.appendChild(scroller);

    const shadow = document.createElement("div");
    shadow.className = "currentSurfaceShadow";
    els.currentSurface.appendChild(shadow);

    if (state.surface.kind === "home") {
      content.appendChild(renderHomePage());
    } else {
      content.appendChild(renderPreviewPage(previewOrder[state.surface.previewIndex]));
    }
    updateRail();
  }

  function renderHomePage() {
    const wrap = document.createElement("div");
    wrap.className = "homeGrid";

    const weatherCard = renderHomeWeatherCard();
    const tasksCard = renderHomeTasksCard();
    const calendarCard = renderHomeCalendarCard();

    wrap.appendChild(weatherCard);
    wrap.appendChild(tasksCard);
    wrap.appendChild(calendarCard);
    return wrap;
  }

  function renderHomeWeatherCard() {
    const btn = buildHomeCardBase("weatherCard");
    btn.dataset.module = "weatherModule";

    const weather = state.weather?.current;
    const icon = weatherEmoji(weather?.weathercode);
    const temp = weather ? `${Math.round(weather.temperature_2m)}°` : "--°";
    const feels = weather ? `${Math.round(weather.apparent_temperature)}°` : "--°";
    const humidity = weather ? `${Math.round(weather.relative_humidity_2m)}%` : "--%";
    const wind = weather ? `${Math.round(weather.windspeed_10m)} m/s` : "--";

    btn.querySelector(".homeCardInner").innerHTML = `
      <div class="dataStack">
        <div class="homeIconLine">
          <div class="homeIconBubble">${weatherSvg(icon)}</div>
          <div class="miniStats"><span>${APP.location.label}</span></div>
        </div>
        <div class="homeValue">${temp}</div>
        <div class="miniStats">
          <span>känns ${feels}</span>
          <span>fukt ${humidity}</span>
          <span>vind ${wind}</span>
        </div>
      </div>
    `;
    btn.addEventListener("click", () => openModule("weatherModule", "home"));
    return btn;
  }

  function renderHomeTasksCard() {
    const btn = buildHomeCardBase("tasksCard");
    btn.dataset.module = "tasksModule";

    const items = [...state.tasks].sort(sortTasksPreview).slice(0, 5);
    const listMarkup = items.length ? items.map((task) => `
      <div class="taskPreviewItem ${task.done ? "done" : ""}">
        <div class="taskPreviewDot"></div>
        <div class="taskPreviewMain">
          <div class="taskPreviewTitle">${escapeHtml(task.title)}</div>
          <div class="taskPreviewNote">${escapeHtml(task.note || subtaskSummary(task))}</div>
        </div>
      </div>
    `).join("") : `<div class="taskPreviewNote">lägg första tasken i modulen</div>`;

    btn.querySelector(".homeCardInner").innerHTML = `
      <div class="tasksPreview">
        <div class="miniStats"><span>${state.tasks.filter(t => !t.done).length} kvar</span><span>${state.tasks.length} totalt</span></div>
        <div class="taskListPreview">${listMarkup}</div>
      </div>
    `;
    btn.addEventListener("click", () => openModule("tasksModule", "home"));
    return btn;
  }

  function renderHomeCalendarCard() {
    const btn = buildHomeCardBase("calendarCard");
    btn.dataset.module = "calendarModule";
    btn.querySelector(".homeCardInner").innerHTML = `
      <div class="calendarPreview" id="calendarPreviewBox">
        ${renderCalendarPreviewMarkup()}
      </div>
    `;
    btn.addEventListener("click", () => openModule("calendarModule", "home"));
    return btn;
  }

  function renderPreviewPage(item) {
    const tpl = $("tplPreviewPage").content.firstElementChild.cloneNode(true);
    tpl.dataset.preview = item.id;
    tpl.addEventListener("click", () => openModule(item.moduleId, "preview"));
    const inner = tpl.querySelector(".previewPageInner");
    inner.innerHTML = previewMarkup(item.id);
    return tpl;
  }

  function previewMarkup(id) {
    switch (id) {
      case "notes": return notesPreviewMarkup();
      case "news": return newsPreviewMarkup();
      case "markets": return marketsPreviewMarkup();
      case "weather": return weatherPreviewMarkup();
      case "earth": return earthPreviewMarkup();
      case "iss": return issPreviewMarkup();
      case "newssite": return newsSitePreviewMarkup();
      case "lightning": return lightningPreviewMarkup();
      case "solar": return solarPreviewMarkup();
      default: return `<div class="previewShell"></div>`;
    }
  }

  function notesPreviewMarkup() {
    const preview = state.notes.trim() || "tryck för att börja skriva";
    return `
      <section class="notesShell">
        <div class="notesCard">
          <div class="smallMuted">senast sparat</div>
          <div style="height:10px"></div>
          <div style="font-size:15px;line-height:1.55;color:rgba(255,255,255,.88);white-space:pre-wrap">${escapeHtml(preview.slice(0, 580))}</div>
        </div>
        ${dotHint(previewOrder.findIndex(x => x.id === "notes"))}
      </section>
    `;
  }

  function newsPreviewMarkup() {
    return `
      <section class="embedShell">
        <div class="embedCard" style="height:66vh">
          <div class="tvWidget" data-tv="news-preview"></div>
        </div>
        ${dotHint(previewOrder.findIndex(x => x.id === "news"))}
      </section>
    `;
  }

  function marketsPreviewMarkup() {
    const rows = APP.favorites.map((fav) => `<div class="compactRow"><span class="label">${fav.label}</span><span class="value">${symbolToMini(fav.symbol)}</span></div>`).join("");
    return `
      <section class="previewShell">
        <div class="metricCard">
          <div class="compactList">${rows}</div>
        </div>
        <div class="embedCard" style="height:44vh">
          <div class="tvWidget" data-tv="market-preview"></div>
        </div>
        ${dotHint(previewOrder.findIndex(x => x.id === "markets"))}
      </section>
    `;
  }

  function weatherPreviewMarkup() {
    const current = state.weather?.current;
    const daily = state.weather?.daily;
    const icon = weatherEmoji(current?.weathercode);
    const hero = current ? `${Math.round(current.temperature_2m)}°` : "--°";
    const feels = current ? `${Math.round(current.apparent_temperature)}°` : "--°";
    const humidity = current ? `${Math.round(current.relative_humidity_2m)}%` : "--%";
    const wind = current ? `${Math.round(current.windspeed_10m)} m/s` : "--";
    const hi = daily ? `${Math.round(daily.temperature_2m_max[0])}°` : "--°";
    const lo = daily ? `${Math.round(daily.temperature_2m_min[0])}°` : "--°";
    return `
      <section class="weatherShell">
        <div class="previewHero">
          <div class="previewHeroContent">
            <div class="previewEyebrow">${APP.location.label}</div>
            <div class="previewMetric">${hero}</div>
            <div class="previewSub"><span>${icon}</span><span>känns ${feels}</span><span>fukt ${humidity}</span><span>vind ${wind}</span><span>${hi} / ${lo}</span></div>
          </div>
        </div>
        ${dotHint(previewOrder.findIndex(x => x.id === "weather"))}
      </section>
    `;
  }

  function earthPreviewMarkup() {
    const bg = state.earth?.image ? `style="background-image:url('${state.earth.image}')"` : "";
    const ts = state.earth?.date ? formatDateTimeShort(state.earth.date) : "hämtar";
    return `
      <section class="previewShell">
        <div class="previewHero earthHero" ${bg}>
          <div class="previewHeroContent">
            <div class="previewEyebrow">NASA EPIC</div>
            <div class="previewMetric" style="font-size:34px">Earth</div>
            <div class="previewSub"><span>${ts}</span></div>
          </div>
        </div>
        ${dotHint(previewOrder.findIndex(x => x.id === "earth"))}
      </section>
    `;
  }

  function issPreviewMarkup() {
    const iss = state.iss;
    return `
      <section class="issShell">
        <div class="metricCard">
          <div class="metricsGrid">
            ${metricCell("Lat", iss ? round(iss.latitude, 2) : "--")}
            ${metricCell("Lon", iss ? round(iss.longitude, 2) : "--")}
            ${metricCell("km/h", iss ? Math.round(iss.velocity) : "--")}
            ${metricCell("Altitude", iss ? `${Math.round(iss.altitude)} km` : "--")}
          </div>
        </div>
        ${dotHint(previewOrder.findIndex(x => x.id === "iss"))}
      </section>
    `;
  }

  function newsSitePreviewMarkup() {
    return `
      <section class="embedShell">
        <div class="embedCard light" style="height:66vh">
          ${APP.newsSiteEmbedUrl
            ? `<iframe src="${escapeAttr(APP.newsSiteEmbedUrl)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>`
            : `<div class="fallbackFill">lägg din nyhetssajt-url i <strong>app.js</strong><br>newsSiteEmbedUrl</div>`}
        </div>
        ${dotHint(previewOrder.findIndex(x => x.id === "newssite"))}
      </section>
    `;
  }

  function lightningPreviewMarkup() {
    return `
      <section class="embedShell">
        <div class="embedCard" style="height:66vh">
          <iframe src="${escapeAttr(APP.lightningEmbedUrl)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>
        </div>
        ${dotHint(previewOrder.findIndex(x => x.id === "lightning"))}
      </section>
    `;
  }

  function solarPreviewMarkup() {
    const s = state.solar;
    return `
      <section class="solarShell">
        <div class="solarCard">
          <div class="metricsGrid">
            ${metricCell("Wind", s?.speed ? `${Math.round(s.speed)} km/s` : "--")}
            ${metricCell("Density", s?.density ? round(s.density, 1) : "--")}
            ${metricCell("Bt", s?.bt ? round(s.bt, 1) : "--")}
            ${metricCell("Bz", s?.bz ? round(s.bz, 1) : "--")}
          </div>
        </div>
        ${dotHint(previewOrder.findIndex(x => x.id === "solar"))}
      </section>
    `;
  }

  function bindSurfaceGestures() {
    const host = els.currentSurface;
    let active = null;

    const onPointerDown = (e) => {
      if (state.module.open) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      active = {
        id: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY,
        mode: null,
        target: null
      };
      host.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e) => {
      if (!active || e.pointerId !== active.id) return;
      active.currentX = e.clientX;
      active.currentY = e.clientY;
      const dx = active.currentX - active.startX;
      const dy = active.currentY - active.startY;

      if (!active.mode) {
        if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx) * 1.1) {
          active.mode = "vertical";
          active.target = verticalTarget(dy < 0 ? "up" : "down");
          prepareIncomingSurface(active.target);
        } else if (Math.abs(dx) > 10) {
          return;
        } else {
          return;
        }
      }

      if (active.mode === "vertical") {
        e.preventDefault();
        applyVerticalDrag(dy, active.target);
      }
    };

    const onPointerEnd = (e) => {
      if (!active || e.pointerId !== active.id) return;
      const dy = active.currentY - active.startY;
      const velocityOk = Math.abs(dy) > 44;
      const threshold = Math.abs(dy) > window.innerHeight * 0.15;
      const commit = active.mode === "vertical" && (threshold || velocityOk);
      finalizeVertical(commit, active.target, dy);
      active = null;
      try { host.releasePointerCapture(e.pointerId); } catch (_) {}
    };

    host.addEventListener("pointerdown", onPointerDown, { passive: true });
    host.addEventListener("pointermove", onPointerMove, { passive: false });
    host.addEventListener("pointerup", onPointerEnd, { passive: true });
    host.addEventListener("pointercancel", onPointerEnd, { passive: true });
  }

  function verticalTarget(direction) {
    if (state.surface.kind === "home") {
      return direction === "up"
        ? { kind: "preview", previewIndex: 0 }
        : { kind: "preview", previewIndex: previewOrder.length - 1 };
    }
    if (direction === "up") {
      return state.surface.previewIndex === previewOrder.length - 1
        ? { kind: "home", previewIndex: null }
        : { kind: "preview", previewIndex: state.surface.previewIndex + 1 };
    }
    return state.surface.previewIndex === 0
      ? { kind: "home", previewIndex: null }
      : { kind: "preview", previewIndex: state.surface.previewIndex - 1 };
  }

  function prepareIncomingSurface(target) {
    els.incomingSurface.innerHTML = "";
    const scroller = document.createElement("div");
    scroller.className = "pageScroller";
    const content = document.createElement("div");
    content.className = "pageContent";
    scroller.appendChild(content);
    els.incomingSurface.appendChild(scroller);
    const shade = document.createElement("div");
    shade.className = "pageFlipShade";
    els.incomingSurface.appendChild(shade);

    if (target.kind === "home") content.appendChild(renderHomePage());
    else content.appendChild(renderPreviewPage(previewOrder[target.previewIndex]));
    els.incomingSurface.classList.add("ready");
  }

  function applyVerticalDrag(dy, target) {
    const h = window.innerHeight || 1;
    const progress = clamp(Math.abs(dy) / (h * 0.72), 0, 1);
    const direction = dy < 0 ? "up" : "down";
    const originCurrent = direction === "up" ? "top center" : "bottom center";
    const originIncoming = direction === "up" ? "bottom center" : "top center";
    const currentRotate = direction === "up" ? -progress * 22 : progress * 22;
    const incomingRotate = direction === "up" ? (1 - progress) * 88 : -(1 - progress) * 88;
    const incomingTranslate = direction === "up" ? (1 - progress) * 52 : -(1 - progress) * 52;
    const currentTranslate = dy * 0.08;

    els.currentSurface.style.transformOrigin = originCurrent;
    els.incomingSurface.style.transformOrigin = originIncoming;
    els.currentSurface.style.transform = `translate3d(0, ${currentTranslate}px, 0) rotateX(${currentRotate}deg) scale(${1 - progress * 0.035})`;
    els.incomingSurface.style.transform = `translate3d(0, ${incomingTranslate}px, 0) rotateX(${incomingRotate}deg) scale(${0.965 + progress * 0.035})`;
    els.incomingSurface.style.opacity = String(0.12 + progress * 0.88);

    const currentShade = els.currentSurface.querySelector(".currentSurfaceShadow");
    const incomingShade = els.incomingSurface.querySelector(".pageFlipShade");
    if (currentShade) currentShade.style.opacity = String(progress * 0.48);
    if (incomingShade) incomingShade.style.opacity = String((1 - progress) * 0.54);
  }

  function finalizeVertical(commit, target, dy = 0) {
    const direction = dy < 0 ? "up" : "down";
    if (commit && target) {
      const outgoing = els.currentSurface;
      const incoming = els.incomingSurface;
      outgoing.style.transition = `transform var(--anim), opacity var(--anim)`;
      incoming.style.transition = `transform var(--anim), opacity var(--anim)`;
      outgoing.style.transformOrigin = direction === "up" ? "top center" : "bottom center";
      incoming.style.transformOrigin = direction === "up" ? "bottom center" : "top center";
      outgoing.style.transform = `rotateX(${direction === "up" ? -92 : 92}deg) translate3d(0, ${direction === "up" ? -24 : 24}px, 0)`;
      outgoing.style.opacity = "0.04";
      incoming.style.transform = "translate3d(0,0,0) rotateX(0deg) scale(1)";
      incoming.style.opacity = "1";

      window.setTimeout(() => {
        state.surface = target;
        resetSurfaceTransforms();
        renderSurface();
      }, 360);
      return;
    }

    els.currentSurface.style.transition = `transform var(--anim), opacity var(--anim)`;
    els.incomingSurface.style.transition = `transform var(--anim), opacity var(--anim)`;
    els.currentSurface.style.transform = "translate3d(0,0,0) rotateX(0deg) scale(1)";
    els.currentSurface.style.opacity = "1";
    els.incomingSurface.style.transform = `translate3d(0, ${direction === "up" ? 52 : -52}px, 0) rotateX(${direction === "up" ? 88 : -88}deg)`;
    els.incomingSurface.style.opacity = "0";
    const currentShade = els.currentSurface.querySelector(".currentSurfaceShadow");
    const incomingShade = els.incomingSurface.querySelector(".pageFlipShade");
    if (currentShade) currentShade.style.opacity = "0";
    if (incomingShade) incomingShade.style.opacity = "0";

    window.setTimeout(() => {
      resetSurfaceTransforms();
    }, 360);
  }

  function resetSurfaceTransforms() {
    [els.currentSurface, els.incomingSurface].forEach((el) => {
      el.style.transition = "";
      el.style.transform = "";
      el.style.transformOrigin = "";
      el.style.opacity = "";
    });
    const shade = els.incomingSurface.querySelector(".pageFlipShade");
    const currentShade = els.currentSurface.querySelector(".currentSurfaceShadow");
    if (shade) shade.style.opacity = "0";
    if (currentShade) currentShade.style.opacity = "0";
    els.incomingSurface.innerHTML = "";
    els.incomingSurface.classList.remove("ready");
  }

  function bindHomeButton() {
    els.homeBtn.addEventListener("click", () => {
      if (state.module.open) return;
      if (state.surface.kind === "home") return;
      prepareIncomingSurface({ kind: "home", previewIndex: null });
      applyVerticalDrag(220, { kind: "home", previewIndex: null });
      finalizeVertical(true, { kind: "home", previewIndex: null }, 220);
    });
  }

  function updateRail() {
    if (state.module.open) {
      els.bottomRail.classList.add("hidden");
      return;
    }
    els.bottomRail.classList.remove("hidden");
    if (state.surface.kind === "home") {
      els.railText.textContent = `HOME → ${previewOrder[0].label.toUpperCase()}`;
      return;
    }
    const current = previewOrder[state.surface.previewIndex].label.toUpperCase();
    const next = state.surface.previewIndex === previewOrder.length - 1
      ? "HOME"
      : previewOrder[state.surface.previewIndex + 1].label.toUpperCase();
    els.railText.textContent = `${current} → ${next}`;
  }

  /* =========================
     MODULES
  ========================= */
  function openModule(moduleId, origin = "preview") {
    const def = moduleDefs[moduleId];
    if (!def) return;
    closeModule(false);

    const shell = document.createElement("section");
    shell.className = `moduleShell ${themeClass(def.theme)}`;
    shell.dataset.module = moduleId;
    shell.innerHTML = `
      <div class="moduleBody">
        <div class="modulePages"></div>
      </div>
      <div class="moduleShade"></div>
    `;
    els.moduleTrack.innerHTML = "";
    els.moduleTrack.appendChild(shell);
    state.module = { open: true, id: moduleId, pageIndex: 0, origin };
    els.moduleLayer.classList.add("open");
    els.moduleLayer.setAttribute("aria-hidden", "false");
    populateModule(shell, def);
    bindModuleGestures(shell, def);
    requestAnimationFrame(() => shell.classList.add("active"));
    updateRail();
  }

  function populateModule(shell, def) {
    const pagesEl = shell.querySelector(".modulePages");
    pagesEl.innerHTML = "";
    def.pages.forEach((page) => {
      const node = document.createElement("section");
      node.className = `modulePage ${pageTheme(page.type, def.theme)}`;
      node.dataset.page = page.id;
      node.innerHTML = `<div class="modulePageInner">${modulePageMarkup(page.type)}</div>`;
      pagesEl.appendChild(node);
    });
    syncModulePage(shell);
    initWidgets(shell, def);
    wireModuleInputs(shell, def);
  }

  function pageTheme(type, theme) {
    if (type === "calendar" || type === "news-site") return "pageLight";
    if (theme === "gradient") return "pageGradient";
    if (type === "lightning") return "pageDark";
    return theme === "light" ? "pageLight" : "pageDark";
  }

  function modulePageMarkup(type) {
    switch (type) {
      case "tasks": return tasksModuleMarkup();
      case "calendar": return calendarModuleMarkup();
      case "weather-now": return weatherNowMarkup();
      case "weather-hours": return weatherHoursMarkup();
      case "weather-days": return weatherDaysMarkup();
      case "notes": return notesModuleMarkup();
      case "tv-timeline": return `<div class="embedCard" style="height:calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 56px)"><div class="tvWidget" data-tv="news-module"></div></div>`;
      case "tv-symbol-overview": return `<div class="embedCard" style="height:42vh"><div class="tvWidget" data-tv="market-module-overview"></div></div><div class="modulePageDots">${pageDots(moduleDefs.marketsModule.pages.length)}</div>`;
      case "tv-advanced-chart": return `<div class="embedCard" style="height:calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 72px)"><div class="tvWidget" data-tv="market-module-chart"></div></div><div class="modulePageDots">${pageDots(moduleDefs.marketsModule.pages.length, 1)}</div>`;
      case "earth": return earthModuleMarkup();
      case "iss": return issModuleMarkup();
      case "iss-map": return issMapMarkup();
      case "news-site": return newsSiteModuleMarkup();
      case "lightning": return lightningModuleMarkup();
      case "solar": return solarModuleMarkup();
      case "solar-chart": return solarChartMarkup();
      default: return "";
    }
  }

  function tasksModuleMarkup() {
    return `
      <section class="tasksPanel">
        <div class="tasksComposer">
          <input class="tasksInput" id="taskTitleInput" maxlength="120" placeholder="ny task" />
          <textarea class="tasksTextarea" id="taskNoteInput" rows="3" placeholder="anteckning · delmål separeras med ny rad"></textarea>
          <div class="tasksActions"><button class="primaryBtn" id="addTaskBtn" type="button">lägg till</button></div>
        </div>
      </section>
      <section class="taskCards" id="taskCards">${renderTaskCardsMarkup()}</section>
    `;
  }

  function calendarModuleMarkup() {
    return APP.calendarEmbedUrl
      ? `<div class="embedCard light" style="height:calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 40px)"><iframe src="${escapeAttr(APP.calendarEmbedUrl)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`
      : `<div class="embedCard light" style="height:calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 40px)"><div class="fallbackFill">lägg in din publika google calendar-embed-url i <strong>app.js</strong><br>calendarEmbedUrl</div></div>`;
  }

  function weatherNowMarkup() {
    const c = state.weather?.current;
    const d = state.weather?.daily;
    const temp = c ? `${Math.round(c.temperature_2m)}°` : "--°";
    const feels = c ? `${Math.round(c.apparent_temperature)}°` : "--°";
    const humidity = c ? `${Math.round(c.relative_humidity_2m)}%` : "--%";
    const wind = c ? `${Math.round(c.windspeed_10m)} m/s` : "--";
    const precip = c ? `${round(c.precipitation, 1)} mm` : "--";
    const hi = d ? `${Math.round(d.temperature_2m_max[0])}°` : "--°";
    const lo = d ? `${Math.round(d.temperature_2m_min[0])}°` : "--°";
    return `
      <section class="weatherCard">
        <div class="weatherNowGrid">
          <div class="weatherLarge">
            <div class="smallMuted">${APP.location.label}</div>
            <div class="weatherBig">${temp}</div>
            <div class="smallMuted">känns ${feels}</div>
          </div>
          <div class="weatherLarge weatherDetails">
            <div class="weatherDetailRow"><span>fukt</span><span>${humidity}</span></div>
            <div class="weatherDetailRow"><span>vind</span><span>${wind}</span></div>
            <div class="weatherDetailRow"><span>regn</span><span>${precip}</span></div>
            <div class="weatherDetailRow"><span>idag</span><span>${hi} / ${lo}</span></div>
          </div>
        </div>
      </section>
      <div class="modulePageDots">${pageDots(moduleDefs.weatherModule.pages.length)}</div>
    `;
  }

  function weatherHoursMarkup() {
    const hourly = state.weather?.hourly;
    const markup = hourly ? buildHourlyRows(hourly) : "<div class='smallMuted'>hämtar timdata</div>";
    return `
      <section class="weatherCard">
        <div class="hourlyStrip">${markup}</div>
      </section>
      <div class="modulePageDots">${pageDots(moduleDefs.weatherModule.pages.length, 1)}</div>
    `;
  }

  function weatherDaysMarkup() {
    const daily = state.weather?.daily;
    const markup = daily ? buildDailyRows(daily) : "<div class='smallMuted'>hämtar prognos</div>";
    return `
      <section class="weatherCard">
        <div class="dailyList">${markup}</div>
      </section>
      <div class="modulePageDots">${pageDots(moduleDefs.weatherModule.pages.length, 2)}</div>
    `;
  }

  function notesModuleMarkup() {
    return `
      <section class="notesCard notesCardGrow">
        <textarea class="notesTextarea" id="notesTextarea" placeholder="skriv fritt">${escapeHtml(state.notes)}</textarea>
      </section>
    `;
  }

  function earthModuleMarkup() {
    const bg = state.earth?.image ? `style="background-image:url('${state.earth.image}')"` : "";
    return `
      <div class="earthImage" ${bg}></div>
      <div class="earthMeta">
        <div class="compactRow"><span class="label">källa</span><span class="value">NASA EPIC</span></div>
        <div class="compactRow"><span class="label">tid</span><span class="value">${state.earth?.date ? formatDateTimeShort(state.earth.date) : "hämtar"}</span></div>
      </div>
    `;
  }

  function issModuleMarkup() {
    const i = state.iss;
    return `
      <section class="issCard">
        <div class="metricsGrid">
          ${metricCell("Lat", i ? round(i.latitude, 2) : "--")}
          ${metricCell("Lon", i ? round(i.longitude, 2) : "--")}
          ${metricCell("km/h", i ? Math.round(i.velocity) : "--")}
          ${metricCell("Altitude", i ? `${Math.round(i.altitude)} km` : "--")}
        </div>
      </section>
      <div class="modulePageDots">${pageDots(moduleDefs.issModule.pages.length)}</div>
    `;
  }

  function issMapMarkup() {
    return `
      <section class="mapBox">
        <canvas class="mapCanvas" id="issMapCanvas"></canvas>
      </section>
      <div class="modulePageDots">${pageDots(moduleDefs.issModule.pages.length, 1)}</div>
    `;
  }

  function newsSiteModuleMarkup() {
    return APP.newsSiteEmbedUrl
      ? `<div class="embedCard light" style="height:calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 40px)"><iframe src="${escapeAttr(APP.newsSiteEmbedUrl)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`
      : `<div class="embedCard light" style="height:calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 40px)"><div class="fallbackFill">lägg in valfri nyhetssajt i <strong>app.js</strong><br>newsSiteEmbedUrl</div></div>`;
  }

  function lightningModuleMarkup() {
    return `<div class="embedCard" style="height:calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 40px)"><iframe src="${escapeAttr(APP.lightningEmbedUrl)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
  }

  function solarModuleMarkup() {
    const s = state.solar;
    return `
      <section class="solarCard">
        <div class="metricsGrid">
          ${metricCell("Wind", s?.speed ? `${Math.round(s.speed)} km/s` : "--")}
          ${metricCell("Density", s?.density ? round(s.density, 1) : "--")}
          ${metricCell("Bt", s?.bt ? round(s.bt, 1) : "--")}
          ${metricCell("Bz", s?.bz ? round(s.bz, 1) : "--")}
        </div>
      </section>
      <div class="modulePageDots">${pageDots(moduleDefs.solarModule.pages.length)}</div>
    `;
  }

  function solarChartMarkup() {
    return `
      <section class="solarCard">
        <svg class="sparkline" id="solarSpark"></svg>
      </section>
      <div class="modulePageDots">${pageDots(moduleDefs.solarModule.pages.length, 1)}</div>
    `;
  }

  function bindModuleGestures(shell, def) {
    let gesture = null;
    shell.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      gesture = {
        id: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY,
        mode: null,
        fromEdge: e.clientX <= 28
      };
      shell.setPointerCapture(e.pointerId);
    }, { passive: true });

    shell.addEventListener("pointermove", (e) => {
      if (!gesture || e.pointerId !== gesture.id) return;
      gesture.currentX = e.clientX;
      gesture.currentY = e.clientY;
      const dx = gesture.currentX - gesture.startX;
      const dy = gesture.currentY - gesture.startY;

      if (!gesture.mode) {
        if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.1) {
          gesture.mode = gesture.fromEdge && dx > 0 ? "back" : "pages";
        } else {
          return;
        }
      }

      if (gesture.mode === "back") {
        e.preventDefault();
        applyModuleBackDrag(shell, dx);
      }

      if (gesture.mode === "pages") {
        e.preventDefault();
        applyModulePageDrag(shell, dx);
      }
    }, { passive: false });

    const end = (e) => {
      if (!gesture || e.pointerId !== gesture.id) return;
      const dx = gesture.currentX - gesture.startX;
      if (gesture.mode === "back") {
        if (dx > window.innerWidth * 0.20 || dx > 72) closeModule(true);
        else resetModuleBackDrag(shell);
      }
      if (gesture.mode === "pages") finalizeModulePageDrag(shell, def, dx);
      gesture = null;
      try { shell.releasePointerCapture(e.pointerId); } catch (_) {}
    };

    shell.addEventListener("pointerup", end, { passive: true });
    shell.addEventListener("pointercancel", end, { passive: true });
  }

  function applyModuleBackDrag(shell, dx) {
    const amount = clamp(dx, 0, window.innerWidth);
    shell.style.transition = "none";
    shell.style.transform = `translate3d(${amount}px,0,0)`;
    const shade = shell.querySelector(".moduleShade");
    if (shade) shade.style.opacity = String(clamp(amount / window.innerWidth, 0, 1) * 0.28);
  }

  function resetModuleBackDrag(shell) {
    shell.style.transition = "transform var(--anim)";
    shell.style.transform = "translate3d(0,0,0)";
    const shade = shell.querySelector(".moduleShade");
    if (shade) shade.style.opacity = "0";
  }

  function applyModulePageDrag(shell, dx) {
    const pages = shell.querySelector(".modulePages");
    if (!pages) return;
    const base = -state.module.pageIndex * shell.clientWidth;
    const extra = dx * 0.38;
    pages.style.transition = "none";
    pages.style.transform = `translate3d(${base + extra}px,0,0)`;
  }

  function finalizeModulePageDrag(shell, def, dx) {
    const width = shell.clientWidth || window.innerWidth;
    let nextIndex = state.module.pageIndex;
    if (dx < -width * 0.16 && state.module.pageIndex < def.pages.length - 1) nextIndex += 1;
    if (dx > width * 0.16 && state.module.pageIndex > 0) nextIndex -= 1;
    state.module.pageIndex = nextIndex;
    syncModulePage(shell);
  }

  function syncModulePage(shell) {
    const pages = shell.querySelector(".modulePages");
    if (!pages) return;
    pages.style.transition = "transform var(--anim)";
    pages.style.transform = `translate3d(${-state.module.pageIndex * 100}%,0,0)`;
    const dots = shell.querySelectorAll(".modulePageDots");
    dots.forEach((wrap) => {
      [...wrap.children].forEach((dot, i) => dot.classList.toggle("active", i === state.module.pageIndex));
    });
    requestAnimationFrame(() => {
      drawSolarSpark(shell);
      drawIssMap(shell);
    });
  }

  function closeModule(animated = true) {
    const shell = els.moduleTrack.querySelector(".moduleShell");
    if (!shell) {
      state.module = { open: false, id: null, pageIndex: 0, origin: "home" };
      els.moduleLayer.classList.remove("open");
      updateRail();
      return;
    }

    const finish = () => {
      els.moduleTrack.innerHTML = "";
      els.moduleLayer.classList.remove("open");
      els.moduleLayer.setAttribute("aria-hidden", "true");
      state.module = { open: false, id: null, pageIndex: 0, origin: "home" };
      updateRail();
    };

    if (!animated) return finish();
    shell.classList.remove("active");
    shell.classList.add("closing");
    window.setTimeout(finish, 360);
  }

  /* =========================
     WIDGETS
  ========================= */
  function ensureTradingView() {
    if (window.TradingView) {
      state.tvReady = true;
      initQueuedTradingView();
      return;
    }
    if (document.querySelector('script[data-tv-loader="1"]')) return;
    const s = document.createElement("script");
    s.src = "https://s3.tradingview.com/external-embedding/embed-widget-timeline.js";
    s.async = true;
    s.dataset.tvLoader = "1";
    s.onload = () => {
      state.tvReady = true;
      initQueuedTradingView();
    };
    document.head.appendChild(s);
  }

  function initWidgets(scope, def) {
    if (!scope) return;
    const nodes = scope.querySelectorAll(".tvWidget");
    nodes.forEach((node) => {
      const kind = node.dataset.tv;
      state.tvInitQueue.add({ node, kind });
    });
    initQueuedTradingView();
  }

  function initQueuedTradingView() {
    const items = [...state.tvInitQueue];
    state.tvInitQueue.clear();
    items.forEach(({ node, kind }) => {
      if (!document.body.contains(node)) return;
      initTradingViewNode(node, kind);
    });
  }

  function initTradingViewNode(node, kind) {
    node.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "tradingview-widget-container";
    wrap.style.width = "100%";
    wrap.style.height = "100%";
    const slot = document.createElement("div");
    slot.className = "tradingview-widget-container__widget";
    slot.style.width = "100%";
    slot.style.height = "100%";
    wrap.appendChild(slot);
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;

    let config;
    if (kind === "news-preview") {
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-timeline.js";
      config = {
        feedMode: "market",
        market: "forex",
        colorTheme: "dark",
        isTransparent: true,
        displayMode: "compact",
        width: "100%",
        height: "100%",
        locale: "sv_SE"
      };
    } else if (kind === "news-module") {
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-timeline.js";
      config = {
        feedMode: "market",
        market: "forex",
        colorTheme: "dark",
        isTransparent: true,
        displayMode: "regular",
        width: "100%",
        height: "100%",
        locale: "sv_SE"
      };
    } else if (kind === "market-preview") {
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
      config = {
        symbols: APP.favorites.map((fav) => ({ proName: fav.symbol, title: fav.label })),
        colorTheme: "dark",
        isTransparent: true,
        displayMode: "compact",
        locale: "sv_SE"
      };
    } else if (kind === "market-module-overview") {
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js";
      config = {
        symbols: [APP.favorites.map((fav) => `${fav.symbol}|1D`)],
        chartOnly: false,
        width: "100%",
        height: "100%",
        locale: "sv_SE",
        colorTheme: "dark",
        autosize: true,
        showVolume: false,
        showMA: false,
        hideDateRanges: false,
        hideMarketStatus: false,
        hideSymbolLogo: false,
        scalePosition: "right",
        scaleMode: "Normal",
        fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Display, Segoe UI, sans-serif",
        fontSize: "11",
        noTimeScale: false,
        valuesTracking: "1",
        changeMode: "price-and-percent",
        chartType: "area",
        lineWidth: 2,
        lineType: 0
      };
    } else if (kind === "market-module-chart") {
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
      config = {
        autosize: true,
        symbol: APP.favorites[0].symbol,
        interval: "60",
        timezone: APP.location.timezone,
        theme: "dark",
        style: "1",
        locale: "sv_SE",
        backgroundColor: "#05070c",
        enable_publishing: false,
        hide_side_toolbar: false,
        allow_symbol_change: true,
        details: false,
        hotlist: false,
        calendar: false,
        support_host: "https://www.tradingview.com"
      };
    } else {
      node.innerHTML = `<div class="fallbackFill">widget saknas</div>`;
      return;
    }

    script.text = JSON.stringify(config);
    wrap.appendChild(script);
    node.appendChild(wrap);
  }

  /* =========================
     MODULE INPUTS
  ========================= */
  function wireModuleInputs(scope, def) {
    if (def.id === "tasksModule") {
      const addBtn = scope.querySelector("#addTaskBtn");
      const titleEl = scope.querySelector("#taskTitleInput");
      const noteEl = scope.querySelector("#taskNoteInput");
      addBtn?.addEventListener("click", () => {
        const title = titleEl.value.trim();
        const note = noteEl.value.trim();
        if (!title) return;
        const subtasks = note.split("\n").map((row) => row.trim()).filter(Boolean).map((text) => ({ id: uid(), text, done: false }));
        state.tasks.unshift({ id: uid(), title, note, done: false, subtasks, createdAt: Date.now() });
        saveTasks();
        populateModule(scope, def);
        renderSurface();
      });

      scope.querySelectorAll("[data-action='toggle-task']").forEach((btn) => {
        btn.addEventListener("click", () => {
          const task = state.tasks.find((t) => t.id === btn.dataset.id);
          if (!task) return;
          task.done = !task.done;
          saveTasks();
          populateModule(scope, def);
          renderSurface();
        });
      });

      scope.querySelectorAll("[data-action='delete-task']").forEach((btn) => {
        btn.addEventListener("click", () => {
          state.tasks = state.tasks.filter((t) => t.id !== btn.dataset.id);
          saveTasks();
          populateModule(scope, def);
          renderSurface();
        });
      });

      scope.querySelectorAll("[data-action='toggle-subtask']").forEach((btn) => {
        btn.addEventListener("click", () => {
          const task = state.tasks.find((t) => t.id === btn.dataset.task);
          const sub = task?.subtasks.find((s) => s.id === btn.dataset.subtask);
          if (!sub) return;
          sub.done = !sub.done;
          saveTasks();
          populateModule(scope, def);
          renderSurface();
        });
      });
    }

    if (def.id === "notesModule") {
      const textarea = scope.querySelector("#notesTextarea");
      textarea?.addEventListener("input", () => {
        state.notes = textarea.value;
        saveNotes();
        renderSurface();
      });
    }
  }

  function renderTaskCardsMarkup() {
    if (!state.tasks.length) return `<div class="smallMuted">tomt än</div>`;
    return [...state.tasks].sort(sortTasksPreview).map((task) => `
      <article class="taskCard ${task.done ? "done" : ""}">
        <div class="taskHead">
          <button class="taskCheck" data-action="toggle-task" data-id="${task.id}" type="button">${task.done ? "✓" : ""}</button>
          <div class="taskTitleWrap">
            <div class="taskTitle">${escapeHtml(task.title)}</div>
            ${task.note ? `<div class="taskNote">${escapeHtml(task.note)}</div>` : ""}
          </div>
          <button class="taskDel" data-action="delete-task" data-id="${task.id}" type="button">ta bort</button>
        </div>
        ${task.subtasks?.length ? `<div class="subtaskList">${task.subtasks.map((sub) => `
          <button class="subtaskItem ${sub.done ? "done" : ""}" data-action="toggle-subtask" data-task="${task.id}" data-subtask="${sub.id}" type="button">
            <span class="subtaskDot"></span>
            <span>${escapeHtml(sub.text)}</span>
          </button>
        `).join("")}</div>` : ""}
      </article>
    `).join("");
  }

  /* =========================
     DATA FETCH
  ========================= */
  async function fetchWeather() {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", APP.location.lat);
    url.searchParams.set("longitude", APP.location.lon);
    url.searchParams.set("current", "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weathercode,windspeed_10m");
    url.searchParams.set("hourly", "temperature_2m,weathercode");
    url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,weathercode");
    url.searchParams.set("forecast_days", "7");
    url.searchParams.set("timezone", APP.location.timezone);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error("weather");
    state.weather = await res.json();
  }

  async function fetchSolar() {
    const [plasmaRes, magRes] = await Promise.all([
      fetch("https://services.swpc.noaa.gov/products/solar-wind/plasma-2-hour.json"),
      fetch("https://services.swpc.noaa.gov/products/solar-wind/mag-2-hour.json")
    ]);
    if (!plasmaRes.ok || !magRes.ok) throw new Error("solar");
    const plasma = await plasmaRes.json();
    const mag = await magRes.json();
    const plasmaLast = plasma[plasma.length - 1];
    const magLast = mag[mag.length - 1];
    state.solar = {
      speed: Number(plasmaLast?.[2] || 0),
      density: Number(plasmaLast?.[1] || 0),
      bt: Number(magLast?.[1] || 0),
      bz: Number(magLast?.[3] || 0),
      sparkSource: mag.slice(Math.max(1, mag.length - 32)).map((row) => Number(row[3] || 0))
    };
  }

  async function fetchISS() {
    const res = await fetch("https://api.wheretheiss.at/v1/satellites/25544");
    if (!res.ok) throw new Error("iss");
    state.iss = await res.json();
  }

  async function fetchEarth() {
    const today = new Date().toISOString().slice(0, 10);
    const url = `https://api.nasa.gov/EPIC/api/natural/date/${today}?api_key=DEMO_KEY`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("earth");
    const data = await res.json();
    const item = data?.[0];
    if (!item) return;
    const date = new Date(item.date);
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    state.earth = {
      date: item.date,
      image: `https://epic.gsfc.nasa.gov/archive/natural/${y}/${m}/${d}/png/${item.image}.png`
    };
  }

  /* =========================
     DRAW HELPERS
  ========================= */
  function drawSolarSpark(scope) {
    const svg = scope.querySelector("#solarSpark");
    if (!svg || !state.solar?.sparkSource?.length) return;
    const values = state.solar.sparkSource;
    const rect = svg.getBoundingClientRect();
    const w = rect.width || 320;
    const h = rect.height || 90;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(max - min, 1);
    const points = values.map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * w;
      const y = h - ((v - min) / range) * (h - 18) - 9;
      return `${x},${y}`;
    }).join(" ");
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.innerHTML = `
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(255,255,255,.28)"/>
          <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
        </linearGradient>
      </defs>
      <polyline fill="none" stroke="rgba(255,255,255,.72)" stroke-width="2.4" points="${points}" />
    `;
  }

  function drawIssMap(scope) {
    const canvas = scope.querySelector("#issMapCanvas");
    if (!canvas || !state.iss) return;
    const box = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(box.width * dpr));
    canvas.height = Math.max(1, Math.round(box.height * dpr));
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    const w = box.width;
    const h = box.height;
    ctx.clearRect(0, 0, w, h);

    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#09111d");
    g.addColorStop(1, "#05070c");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(255,255,255,.07)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 6; i++) {
      const y = (h / 6) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let i = 1; i < 6; i++) {
      const x = (w / 6) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    const x = ((state.iss.longitude + 180) / 360) * w;
    const y = ((90 - state.iss.latitude) / 180) * h;
    ctx.fillStyle = "rgba(255,255,255,.18)";
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  /* =========================
     STORAGE
  ========================= */
  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE.tasks);
      if (!raw) return seedTasks();
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : seedTasks();
    } catch {
      return seedTasks();
    }
  }

  function saveTasks() {
    localStorage.setItem(STORAGE.tasks, JSON.stringify(state.tasks));
  }

  function loadNotes() {
    try {
      return localStorage.getItem(STORAGE.notes) || "";
    } catch {
      return "";
    }
  }

  function saveNotes() {
    localStorage.setItem(STORAGE.notes, state.notes);
  }

  function seedTasks() {
    return [
      { id: uid(), title: "Bygg grunden", note: "få navigationen på plats", done: false, subtasks: [{ id: uid(), text: "home + previews", done: false }, { id: uid(), text: "moduler från höger", done: false }], createdAt: Date.now() - 2 },
      { id: uid(), title: "Koppla kalender-url", note: "publik google embed", done: false, subtasks: [], createdAt: Date.now() - 1 },
      { id: uid(), title: "Välj nyhetssajt", note: "något som känns rent", done: false, subtasks: [], createdAt: Date.now() }
    ];
  }

  /* =========================
     MISC HELPERS
  ========================= */
  function bindGlobalKeys() {
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && state.module.open) closeModule(true);
    });
  }

  function renderCalendarPreviewMarkup() {
    if (!APP.calendarEmbedUrl) {
      return `<div class="calendarEmpty">lägg in calendarEmbedUrl i app.js</div>`;
    }
    return `
      <div class="calendarItem"><div class="calendarTime">08:00</div><div class="calendarText"><div>kalender preview kopplas när din url är inlagd</div></div></div>
      <div class="calendarItem"><div class="calendarTime">13:00</div><div class="calendarText"><div>visar fler händelser i fullvy</div></div></div>
      <div class="calendarItem"><div class="calendarTime">18:30</div><div class="calendarText"><div>vit modul för att smälta ihop</div></div></div>
    `;
  }

  function buildHourlyRows(hourly) {
    return hourly.time.slice(0, 12).map((time, i) => `
      <div class="hourlyItem">
        <span>${hourLabel(time)}</span>
        <span>${weatherEmoji(hourly.weathercode[i])}</span>
        <span>${Math.round(hourly.temperature_2m[i])}°</span>
      </div>
    `).join("");
  }

  function buildDailyRows(daily) {
    return daily.time.map((time, i) => `
      <div class="dailyItem">
        <span>${weekdayShort(time)}</span>
        <span>${Math.round(daily.temperature_2m_max[i])}°</span>
        <span>${Math.round(daily.temperature_2m_min[i])}°</span>
      </div>
    `).join("");
  }

  function metricCell(label, value, sub = "") {
    return `<div class="metricCell"><div class="mLabel">${escapeHtml(label)}</div><div class="mValue">${escapeHtml(String(value))}</div>${sub ? `<div class="mSub">${escapeHtml(sub)}</div>` : ""}</div>`;
  }

  function dotHint(index) {
    return `<div class="previewOpenHint">${previewOrder.map((_, i) => `<span class="${i === index ? "active" : ""}"></span>`).join("")}</div>`;
  }

  function pageDots(total, active = 0) {
    return Array.from({ length: total }, (_, i) => `<span class="${i === active ? "active" : ""}"></span>`).join("");
  }

  function weatherEmoji(code) {
    if (code == null) return "•";
    if ([0].includes(code)) return "☀️";
    if ([1, 2].includes(code)) return "⛅️";
    if ([3].includes(code)) return "☁️";
    if ([45, 48].includes(code)) return "🌫️";
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "🌧️";
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️";
    if ([95, 96, 99].includes(code)) return "⛈️";
    return "☁️";
  }

  function weatherSvg(icon) {
    const map = {
      "☀️": `<svg viewBox="0 0 24 24"><path d="M12 4.2a.85.85 0 0 1 .85.85v1.6a.85.85 0 1 1-1.7 0v-1.6A.85.85 0 0 1 12 4.2Zm0 12.3a3.65 3.65 0 1 0 0-7.3 3.65 3.65 0 0 0 0 7.3Zm6.95-4.3a.85.85 0 0 1 .85.85.85.85 0 0 1-.85.85h-1.6a.85.85 0 1 1 0-1.7h1.6ZM7.25 13.9a.85.85 0 1 1 0-1.7h-1.6a.85.85 0 1 0 0 1.7h1.6Zm8.06-5.52a.85.85 0 0 1 1.2 0l1.14 1.13a.85.85 0 0 1-1.2 1.2l-1.14-1.13a.85.85 0 0 1 0-1.2Zm-8.1 8.1a.85.85 0 0 1 1.2 0l1.14 1.13a.85.85 0 0 1-1.2 1.2l-1.14-1.13a.85.85 0 0 1 0-1.2Zm9.24 1.13 1.14-1.13a.85.85 0 0 1 1.2 1.2l-1.14 1.13a.85.85 0 0 1-1.2-1.2ZM8.41 8.38a.85.85 0 0 1 0 1.2L7.27 10.7a.85.85 0 1 1-1.2-1.2l1.14-1.13a.85.85 0 0 1 1.2 0Z"/></svg>`,
      "⛅️": `<svg viewBox="0 0 24 24"><path d="M8.3 18.8h8.1a3.8 3.8 0 0 0 .47-7.57A5.4 5.4 0 0 0 6.6 9.9a3.8 3.8 0 0 0 1.7 8.9Zm6.3-9.2a2.35 2.35 0 1 0-2.35-2.35A2.35 2.35 0 0 0 14.6 9.6Z"/></svg>`,
      "☁️": `<svg viewBox="0 0 24 24"><path d="M7.5 18.9h9.3a4.2 4.2 0 0 0 .41-8.38A5.7 5.7 0 0 0 6.44 9.6 4.2 4.2 0 0 0 7.5 18.9Z"/></svg>`,
      "🌧️": `<svg viewBox="0 0 24 24"><path d="M7.5 14.9h9.3a4.2 4.2 0 0 0 .41-8.38A5.7 5.7 0 0 0 6.44 5.6 4.2 4.2 0 0 0 7.5 14.9Zm1.2 4.7a.9.9 0 0 0 .9-.9v-.9a.9.9 0 1 0-1.8 0v.9a.9.9 0 0 0 .9.9Zm5.2 0a.9.9 0 0 0 .9-.9v-.9a.9.9 0 1 0-1.8 0v.9a.9.9 0 0 0 .9.9Z"/></svg>`,
      "❄️": `<svg viewBox="0 0 24 24"><path d="M12 4.3a.8.8 0 0 1 .8.8v4.1l3.55-2.04a.8.8 0 1 1 .8 1.38L13.6 10.6l3.55 2.05a.8.8 0 1 1-.8 1.38L12.8 12v4.1a.8.8 0 1 1-1.6 0V12l-3.55 2.03a.8.8 0 0 1-.8-1.38l3.55-2.05L6.85 8.56a.8.8 0 0 1 .8-1.38L11.2 9.2V5.1a.8.8 0 0 1 .8-.8Z"/></svg>`,
      "⛈️": `<svg viewBox="0 0 24 24"><path d="M7.5 14.1h9.3a4.2 4.2 0 0 0 .41-8.38A5.7 5.7 0 0 0 6.44 4.8 4.2 4.2 0 0 0 7.5 14.1Zm4.28 6.1.92-2.85H11.2l1.1-3.4 2.4.03-1.05 2.62h1.72l-3.57 3.6Z"/></svg>`
    };
    return map[icon] || map["☁️"];
  }

  function themeClass(theme) {
    if (theme === "light") return "lightModule";
    return "";
  }

  function sortTasksPreview(a, b) {
    if (a.done !== b.done) return Number(a.done) - Number(b.done);
    return (a.createdAt || 0) - (b.createdAt || 0);
  }

  function subtaskSummary(task) {
    const left = task.subtasks?.filter((s) => !s.done).length || 0;
    return left ? `${left} delmål kvar` : "";
  }

  function hourLabel(iso) {
    return new Date(iso).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
  }

  function weekdayShort(iso) {
    return new Date(iso).toLocaleDateString("sv-SE", { weekday: "short" });
  }

  function formatDateTimeShort(value) {
    return new Date(value).toLocaleString("sv-SE", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function symbolToMini(symbol) {
    return symbol.split(":").pop();
  }

  function buildHomeCardBase(className) {
    const tpl = $("tplHomeCard").content.firstElementChild.cloneNode(true);
    tpl.classList.add(className);
    return tpl;
  }

  function uid() {
    return Math.random().toString(36).slice(2, 10);
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function round(v, n = 0) {
    return Number(v).toFixed(n);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(str) {
    return escapeHtml(str);
  }
})();
