
(() => {
  const $ = (id) => document.getElementById(id);
  const escapeHtml = (s = "") => String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

  const LS = {
    prio: "sbdash_prio_v101",
    freeText: "sbdash_freetext_v101",
    timer: "sbdash_timer_v101",
    stocksMini: "sbdash_stocksmini_v101",
    power: "sbdash_power_v101",
  };

  const SWIPE_THRESHOLD = 36;
  const MODULES = [
    { id: "timer", label: "Timer" },
    { id: "prio", label: "Prio" },
    { id: "weather", label: "Väder" },
    { id: "freeText", label: "Fritext" },
    { id: "stocks", label: "Aktier" },
    { id: "news", label: "Nyheter" },
    { id: "power", label: "Elpris" },
  ];

  const STOCKS = [
    { key: "gold", name: "Guld", symbol: "OANDA:XAUUSD", miniSymbol: "XAUUSD", short: "XAU/USD" },
    { key: "silver", name: "Silver", symbol: "OANDA:XAGUSD", miniSymbol: "XAGUSD", short: "XAG/USD" },
    { key: "oil", name: "Olja", symbol: "TVC:USOIL", miniSymbol: "USOIL", short: "USOIL" },
    { key: "us100", name: "US100", symbol: "CAPITALCOM:US100", miniSymbol: "US100", short: "US100" },
    { key: "eurusd", name: "EUR/USD", symbol: "FX:EURUSD", miniSymbol: "EURUSD", short: "EUR/USD" },
  ];

  const STOCK_MINI_DEFAULTS = {
    gold: { value: "--", meta: "Väntar data" },
    silver: { value: "--", meta: "Väntar data" },
    oil: { value: "--", meta: "Väntar data" },
    us100: { value: "--", meta: "Väntar data" },
    eurusd: { value: "--", meta: "Väntar data" },
  };

  const state = {
    slotIndexes: [1, 2],
    prios: loadJson(LS.prio, [
      { id: uid(), text: "Hämta bilen på vägen hem", note: "", done: false },
    ]),
    freeText: localStorage.getItem(LS.freeText) || "",
    timer: loadJson(LS.timer, { minutes: 5, running: false, endAt: 0, durationSec: 300 }),
    weather: null,
    power: loadJson(LS.power, null),
    stockMini: { ...STOCK_MINI_DEFAULTS, ...loadJson(LS.stocksMini, {}) },
  };

  const clockDate = $("clockDate");
  const clockTime = $("clockTime");
  const slotEls = [$("moduleSlot1"), $("moduleSlot2")];
  const slotContentEls = [$("moduleSlot1Content"), $("moduleSlot2Content")];

  const prioOverlay = $("prioOverlay");
  const prioPanelList = $("prioPanelList");
  const prioAddInput = $("prioAddInput");
  const prioAddBtn = $("prioAddBtn");
  const prioCloseFab = $("prioCloseFab");

  const weatherOverlay = $("weatherOverlay");
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

  const freeTextOverlay = $("freeTextOverlay");
  const freeTextInput = $("freeTextInput");
  const freeTextCloseFab = $("freeTextCloseFab");

  const genericOverlay = $("genericOverlay");
  const genericPanel = $("genericPanel");
  const genericCloseFab = $("genericCloseFab");

  const timerIconBtn = $("timerIconBtn");
  const timerFocus = $("timerFocus");
  const timerCloseFab = $("timerCloseFab");
  const timerBarWrap = $("timerBarWrap");
  const timerBar = $("timerBar");
  const timerWheel = $("timerWheel");
  const timerWheelValue = $("timerWheelValue");

  let activeOverlay = null;
  let tvScriptPromise = null;
  let timerTick = null;

  function uid() {
    return Math.random().toString(36).slice(2, 10);
  }

  function loadJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function saveJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function persistPrios() {
    saveJson(LS.prio, state.prios);
  }

  function persistTimer() {
    saveJson(LS.timer, state.timer);
  }

  function formatSvDate(date = new Date()) {
    const weekday = date.toLocaleDateString("sv-SE", { weekday: "long" }).toUpperCase();
    const day = date.getDate();
    const month = date.toLocaleDateString("sv-SE", { month: "long" }).toUpperCase();
    return `${weekday} | ${day} ${month}`;
  }

  function formatTime(date = new Date()) {
    return date.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
  }

  function updateClock() {
    const now = new Date();
    if (clockDate) clockDate.textContent = formatSvDate(now);
    if (clockTime) clockTime.textContent = formatTime(now);
  }

  function clamp(num, min, max) {
    return Math.min(max, Math.max(min, num));
  }

  function weatherIconPath(code) {
    const symbolMap = {
      0: "☀",
      1: "☀",
      2: "⛅",
      3: "☁",
      45: "〰",
      48: "〰",
      51: "🌦",
      53: "🌦",
      55: "🌦",
      56: "🌨",
      57: "🌨",
      61: "🌧",
      63: "🌧",
      65: "🌧",
      66: "🌨",
      67: "🌨",
      71: "❄",
      73: "❄",
      75: "❄",
      77: "❄",
      80: "🌦",
      81: "🌦",
      82: "⛈",
      85: "❄",
      86: "❄",
      95: "⛈",
      96: "⛈",
      99: "⛈",
    };
    const bgMap = {
      0: "#0a1520",
      1: "#0a1520",
      2: "#0d1723",
      3: "#0f1822",
      45: "#10161d",
      48: "#10161d",
      51: "#0d1620",
      53: "#0d1620",
      55: "#0d1620",
      56: "#111821",
      57: "#111821",
      61: "#0d1620",
      63: "#0d1620",
      65: "#0d1620",
      66: "#111821",
      67: "#111821",
      71: "#101722",
      73: "#101722",
      75: "#101722",
      77: "#101722",
      80: "#0d1620",
      81: "#0d1620",
      82: "#0d1620",
      85: "#101722",
      86: "#101722",
      95: "#0b141d",
      96: "#0b141d",
      99: "#0b141d",
    };
    const symbol = symbolMap[code] || "☁";
    const bg = bgMap[code] || "#0d1620";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 88 88">
      <defs>
        <radialGradient id="g" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stop-color="#173041"/>
          <stop offset="100%" stop-color="${bg}"/>
        </radialGradient>
      </defs>
      <circle cx="44" cy="44" r="36" fill="url(#g)" stroke="rgba(255,255,255,.08)" />
      <text x="44" y="54" text-anchor="middle" font-size="34" font-family="Arial, Apple Color Emoji, Segoe UI Emoji, sans-serif" fill="#ffffff">${symbol}</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  function weatherLabel(code) {
    const labels = {
      0: "Klart",
      1: "Mest klart",
      2: "Delvis molnigt",
      3: "Mulet",
      45: "Dimma",
      48: "Dimma",
      51: "Lätt duggregn",
      53: "Duggregn",
      55: "Kraftigt duggregn",
      56: "Underkylt duggregn",
      57: "Underkylt duggregn",
      61: "Lätt regn",
      63: "Regn",
      65: "Kraftigt regn",
      66: "Underkylt regn",
      67: "Underkylt regn",
      71: "Lätt snö",
      73: "Snö",
      75: "Kraftig snö",
      77: "Snökorn",
      80: "Regnskurar",
      81: "Regnskurar",
      82: "Kraftiga skurar",
      85: "Snöbyar",
      86: "Snöbyar",
      95: "Åska",
      96: "Åska/hagel",
      99: "Åska/hagel",
    };
    return labels[code] || "Väder";
  }

  async function fetchWeather() {
    const url = "https://api.open-meteo.com/v1/forecast?latitude=59.32&longitude=18.44&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,precipitation,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Europe%2FStockholm&forecast_days=2";
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("weather fetch failed");
      const data = await res.json();
      state.weather = data;
      renderSlots();
      renderWeatherOverlay();
    } catch (err) {
      console.error(err);
    }
  }

  function renderWeatherPreview() {
    const w = state.weather;
    if (!w || !w.current || !w.hourly) {
      return `
        <div class="weatherPreview weatherPreview--loading">
          <div class="weatherPreviewMain">
            <div class="weatherPreviewVisual"><img class="weatherPreviewIcon" src="${weatherIconPath(3)}" alt="" draggable="false"></div>
            <div class="weatherPreviewText">
              <div class="weatherPreviewTempBig">--°</div>
              <div class="weatherPreviewStatus">Laddar väder…</div>
              <div class="weatherPreviewMetaRow">
                <div class="weatherPreviewChip">Värmdö</div>
                <div class="weatherPreviewChip">Väder</div>
              </div>
            </div>
          </div>
        </div>`;
    }

    const current = w.current;
    const status = weatherLabel(current.weather_code);
    const icon = weatherIconPath(current.weather_code);
    const hours = nextWeatherHours(w, 3);

    return `
      <div class="weatherPreview">
        <div class="weatherPreviewMain">
          <div class="weatherPreviewVisual">
            <img class="weatherPreviewIcon" src="${escapeHtml(icon)}" alt="" draggable="false">
          </div>
          <div class="weatherPreviewText">
            <div class="weatherPreviewTempBig">${Math.round(current.temperature_2m)}°</div>
            <div class="weatherPreviewStatus">${escapeHtml(status)}</div>
            <div class="weatherPreviewMeta">Känns som ${Math.round(current.apparent_temperature)}° · Vind ${Math.round(current.wind_speed_10m)} m/s</div>
            <div class="weatherPreviewMetaRow">
              <div class="weatherPreviewChip">Värmdö</div>
              <div class="weatherPreviewChip">Regn ${Math.round(hours[0]?.precipitation_probability ?? 0)}%</div>
            </div>
          </div>
        </div>
        <div class="weatherPreviewHours">
          ${hours.map((hour) => `
            <div class="weatherPreviewHour">
              <div class="weatherPreviewHourTime">${escapeHtml(hour.label)}</div>
              <div class="weatherPreviewHourTemp">${Math.round(hour.temp)}°</div>
              <div class="weatherPreviewHourRain">${Math.round(hour.precipitation_probability || 0)}%</div>
            </div>
          `).join("")}
        </div>
      </div>`;
  }

  function nextWeatherHours(data, count = 4) {
    const now = Date.now();
    const times = data.hourly.time || [];
    const out = [];
    for (let i = 0; i < times.length && out.length < count; i += 1) {
      const ts = new Date(times[i]).getTime();
      if (ts + 15 * 60 * 1000 < now) continue;
      out.push({
        label: new Date(times[i]).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" }),
        temp: data.hourly.temperature_2m?.[i],
        precipitation_probability: data.hourly.precipitation_probability?.[i] ?? 0,
        precipitation: data.hourly.precipitation?.[i] ?? 0,
      });
    }
    return out;
  }

  function renderWeatherOverlay() {
    const w = state.weather;
    if (!w || !w.current) return;
    weatherHeroTemp.textContent = `${Math.round(w.current.temperature_2m)}°`;
    weatherHeroStatus.textContent = weatherLabel(w.current.weather_code);
    weatherHeroIcon.src = weatherIconPath(w.current.weather_code);
    weatherFeelsLike.textContent = `${Math.round(w.current.apparent_temperature)}°`;
    weatherWind.textContent = `${Math.round(w.current.wind_speed_10m)} m/s`;
    const nextHours = nextWeatherHours(w, 4);
    const rainMm = nextHours.reduce((sum, item) => sum + (item.precipitation || 0), 0);
    const rainRisk = Math.max(...nextHours.map((x) => x.precipitation_probability || 0));
    weatherRain.textContent = `${rainMm.toFixed(1)} mm`;
    weatherRainChance.textContent = `${Math.round(rainRisk)}%`;
    weatherHours.innerHTML = nextHours.map((hour) => `
      <div class="weatherHour">
        <div class="weatherHourTime">${escapeHtml(hour.label)}</div>
        <div class="weatherHourTemp">${Math.round(hour.temp)}°</div>
        <div class="weatherHourRain">${Math.round(hour.precipitation_probability || 0)}%</div>
      </div>
    `).join("");

    const d = w.daily;
    if (d) {
      weatherTodayLine.textContent = `Idag: ${Math.round(d.temperature_2m_min[0])}°–${Math.round(d.temperature_2m_max[0])}° · regnrisk ${Math.round(d.precipitation_probability_max[0] || 0)}%`;
      weatherTomorrowLine.textContent = `Imorgon: ${Math.round(d.temperature_2m_min[1])}°–${Math.round(d.temperature_2m_max[1])}° · regnrisk ${Math.round(d.precipitation_probability_max[1] || 0)}%`;
    }
  }

  function renderPrioPreview() {
    const visible = state.prios.slice(0, 3);
    const more = state.prios.length - visible.length;
    return `
      <div class="prioPreview">
        <div class="prioPreviewHeader">Prio</div>
        <div class="prioPreviewList">
          ${visible.map((item) => `
            <div class="prioPreviewRow ${item.done ? 'is-done' : ''}">
              <div class="prioPreviewDot"></div>
              <div>
                <div class="prioPreviewText">${escapeHtml(trimText(item.text, 34))}</div>
                ${item.note ? `<div class="prioPreviewNote">${escapeHtml(trimText(item.note, 28))}</div>` : ''}
              </div>
            </div>
          `).join("")}
          ${more > 0 ? `<div class="prioPreviewMore">+ ${more} till</div>` : ''}
        </div>
      </div>`;
  }

  function renderPrioList() {
    prioPanelList.innerHTML = state.prios.map((item) => `
      <div class="prioItem ${item.done ? 'is-done' : ''}" data-id="${escapeHtml(item.id)}">
        <div class="prioItemMain">
          <input class="prioCheck" type="checkbox" ${item.done ? 'checked' : ''} aria-label="Klar">
          <input class="prioTextInput" type="text" value="${escapeHtml(item.text)}" maxlength="160" aria-label="Prio">
          <button class="prioDeleteBtn" type="button" aria-label="Ta bort">✕</button>
        </div>
        <input class="prioNoteInput" type="text" value="${escapeHtml(item.note || '')}" maxlength="220" placeholder="Anteckning" aria-label="Anteckning">
      </div>
    `).join("");
  }

  function renderFreeTextPreview() {
    const text = state.freeText.trim();
    return `
      <div class="freeTextPreview">
        <div class="freeTextPreviewLabel">Fritext</div>
        <div class="freeTextPreviewText ${text ? '' : 'is-empty'}">${escapeHtml(text || 'Skriv något du vill komma ihåg…')}</div>
      </div>`;
  }

  function formatRemainingShort(totalSec) {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  }

  function timerRemainingSec() {
    if (!state.timer.running) return state.timer.durationSec || state.timer.minutes * 60;
    return Math.max(0, Math.round((state.timer.endAt - Date.now()) / 1000));
  }

  function renderTimerPreview() {
    const remaining = timerRemainingSec();
    const center = state.timer.running ? formatRemainingShort(remaining) : state.timer.minutes;
    const bottom = state.timer.running ? 'KVAR' : 'MIN';
    return `
      <div class="timerPreview timerPreview--direct">
        <div class="timerPreviewWrap">
          <div class="timerPreviewMain">
            <div class="timerPreviewWheel">
              <div class="timerPreviewCenter">
                <div class="timerPreviewTop">Timer</div>
                <div class="timerPreviewValue">${escapeHtml(String(center))}</div>
                <div class="timerPreviewBottom">${escapeHtml(bottom)}</div>
              </div>
            </div>
          </div>
          <div class="timerPreviewActions">
            ${[5, 10, 15, 25].map((m) => `<button class="timerPreviewPresetBtn ${state.timer.minutes === m ? 'is-active' : ''}" data-timer-min="${m}" type="button">${m}</button>`).join("")}
          </div>
          <div class="timerPreviewActionRow">
            <button class="timerPreviewAction is-primary" data-timer-action="${state.timer.running ? 'restart' : 'start'}" type="button">${state.timer.running ? 'Starta om' : 'Starta'}</button>
            <button class="timerPreviewAction" data-timer-action="reset" type="button">Reset</button>
          </div>
        </div>
      </div>`;
  }

  function renderStocksPreview() {
    return `
      <div class="stocksPreview">
        <div class="stocksPreviewTape">
          ${STOCKS.map((stock, idx) => `
            <div class="stockMiniRow">
              <div class="stockMiniLeft">
                <div class="stockMiniLabel">${escapeHtml(stock.short)}</div>
                <div class="stockMiniSpark">
                  <span style="height:${12 + (idx * 3)}px"></span>
                  <span style="height:${18 + (idx * 2)}px"></span>
                  <span style="height:${10 + (idx * 4)}px"></span>
                  <span style="height:${20 + (idx * 2)}px"></span>
                </div>
              </div>
              <div class="stockMiniRight">
                <div class="stockMiniValue">${escapeHtml(state.stockMini[stock.key]?.value || stock.short)}</div>
                <div class="stockMiniMeta">${escapeHtml(state.stockMini[stock.key]?.meta || 'Live i modul')}</div>
              </div>
            </div>
          `).join("")}
        </div>
      </div>`;
  }

  function renderNewsPreview() {
    return `
      <div class="newsPreview">
        <div class="newsPreviewTicker">MARKNAD · LIVE · TV</div>
        <div class="newsPreviewList">
          <div class="newsPreviewItem">
            <div class="newsPreviewItemTitle">Makro, index och råvaror i en mörk live-feed.</div>
            <div class="newsPreviewItemMeta">Öppna för hela flödet</div>
          </div>
          <div class="newsPreviewItem">
            <div class="newsPreviewItemTitle">US100, FX och olja samlat i samma vy.</div>
            <div class="newsPreviewItemMeta">TradingView</div>
          </div>
          <div class="newsPreviewPulseRow">
            <span></span><span></span><span></span><span></span>
          </div>
        </div>
      </div>`;
  }

  function renderPowerPreview() {
    const p = state.power;
    const bars = p?.today?.slice(0, 6) || [];
    const nowPrice = p?.nowPriceText || '--';
    const next = p?.today?.[new Date().getHours() + 1];
    const cheapest = p?.bestWindow || '--';
    return `
      <div class="powerPreview">
        <div class="powerPreviewTop">
          <div class="powerPreviewValue">${escapeHtml(nowPrice)}</div>
          <div class="powerPreviewMeta">Nu · ${escapeHtml(p?.nowLabel || 'SE3')}</div>
        </div>
        <div class="powerPreviewStats">
          <div class="powerPreviewStat"><div class="powerPreviewStatLabel">Nästa</div><div class="powerPreviewStatValue">${escapeHtml(next ? `${next.price.toFixed(2)} kr` : '--')}</div></div>
          <div class="powerPreviewStat"><div class="powerPreviewStatLabel">Billigast</div><div class="powerPreviewStatValue">${escapeHtml(cheapest)}</div></div>
        </div>
        <div class="powerPreviewBars">
          ${bars.map((item) => `<div class="powerPreviewBarWrap"><div class="powerPreviewBar" style="height:${Math.max(10, item.ratio * 44)}px"></div><div class="powerPreviewBarHour">${escapeHtml(item.hour)}</div></div>`).join("")}
        </div>
      </div>`;
  }

  function trimText(str, len) {
    return str.length > len ? `${str.slice(0, len - 1)}…` : str;
  }

  function renderModule(moduleId) {
    switch (moduleId) {
      case 'timer': return renderTimerPreview();
      case 'prio': return renderPrioPreview();
      case 'weather': return renderWeatherPreview();
      case 'freeText': return renderFreeTextPreview();
      case 'stocks': return renderStocksPreview();
      case 'news': return renderNewsPreview();
      case 'power': return renderPowerPreview();
      default: return '<div class="modulePlaceholder"><div class="modulePlaceholderBody"><div class="modulePlaceholderTitle">Modul</div><div class="modulePlaceholderText">Tom modul</div></div></div>';
    }
  }

  function renderSlots() {
    state.slotIndexes.forEach((moduleIndex, slotIndex) => {
      const module = MODULES[(moduleIndex + MODULES.length) % MODULES.length];
      slotContentEls[slotIndex].innerHTML = renderModule(module.id);
      slotEls[slotIndex].dataset.moduleId = module.id;
    });
  }

  function stepSlot(slotIndex, delta) {
    const slot = slotEls[slotIndex];
    state.slotIndexes[slotIndex] = (state.slotIndexes[slotIndex] + delta + MODULES.length) % MODULES.length;
    slot.classList.remove('is-animating-left', 'is-animating-right');
    slot.classList.add(delta > 0 ? 'is-animating-left' : 'is-animating-right');
    renderSlots();
    setTimeout(() => slot.classList.remove('is-animating-left', 'is-animating-right'), 260);
  }

  function attachSlotSwipe(slot, slotIndex) {
    let startX = 0;
    let currentX = 0;
    let dragging = false;

    slot.addEventListener('pointerdown', (e) => {
      if (activeOverlay) return;
      dragging = true;
      startX = e.clientX;
      currentX = e.clientX;
      slot.setPointerCapture?.(e.pointerId);
    });

    slot.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      currentX = e.clientX;
      const dx = currentX - startX;
      const content = slot.querySelector('.moduleSlotContent');
      slot.classList.add('is-swiping');
      slot.classList.toggle('swipe-left', dx < 0);
      slot.classList.toggle('swipe-right', dx > 0);
      content.style.setProperty('--swipeX', `${dx * 0.48}px`);
      content.style.setProperty('--swipeScale', `${1 - Math.min(Math.abs(dx) / 1800, 0.015)}`);
      content.style.setProperty('--swipeOpacity', `${1 - Math.min(Math.abs(dx) / 520, 0.08)}`);
    });

    function end(e) {
      if (!dragging) return;
      dragging = false;
      const dx = currentX - startX;
      const content = slot.querySelector('.moduleSlotContent');
      slot.classList.remove('is-swiping', 'swipe-left', 'swipe-right');
      content.style.removeProperty('--swipeX');
      content.style.removeProperty('--swipeScale');
      content.style.removeProperty('--swipeOpacity');
      if (Math.abs(dx) > SWIPE_THRESHOLD) {
        stepSlot(slotIndex, dx < 0 ? 1 : -1);
        slot.dataset.swiped = '1';
        setTimeout(() => { slot.dataset.swiped = ''; }, 200);
      } else if (e.type === 'pointerup' && !slot.dataset.swiped) {
        if (e.target.closest('[data-timer-action], [data-timer-min]')) return;
        const moduleId = slot.dataset.moduleId;
        if (moduleId !== 'timer') openCurrentModule(slotIndex);
      }
    }

    slot.addEventListener('pointerup', end);
    slot.addEventListener('pointercancel', end);
  }

  function openOverlay(overlay) {
    if (activeOverlay) closeOverlay(activeOverlay);
    activeOverlay = overlay;
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
  }

  function closeOverlay(overlay) {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    if (activeOverlay === overlay) activeOverlay = null;
  }

  function openCurrentModule(slotIndex) {
    const module = MODULES[state.slotIndexes[slotIndex]];
    switch (module.id) {
      case 'prio':
        renderPrioList();
        openOverlay(prioOverlay);
        break;
      case 'weather':
        renderWeatherOverlay();
        openOverlay(weatherOverlay);
        break;
      case 'freeText':
        freeTextInput.value = state.freeText;
        openOverlay(freeTextOverlay);
        setTimeout(() => freeTextInput.focus(), 80);
        break;
      case 'stocks':
      case 'news':
      case 'power':
        renderGenericModule(module.id);
        openOverlay(genericOverlay);
        break;
      case 'timer':
        break;
      default:
        break;
    }
  }

  prioAddBtn?.addEventListener('click', () => {
    const text = prioAddInput.value.trim();
    if (!text) return;
    state.prios.unshift({ id: uid(), text, note: '', done: false });
    prioAddInput.value = '';
    persistPrios();
    renderPrioList();
    renderSlots();
  });

  prioAddInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      prioAddBtn.click();
    }
  });

  prioPanelList?.addEventListener('click', (e) => {
    const itemEl = e.target.closest('.prioItem');
    if (!itemEl) return;
    const id = itemEl.dataset.id;
    if (e.target.classList.contains('prioDeleteBtn')) {
      state.prios = state.prios.filter((item) => item.id !== id);
    } else if (e.target.classList.contains('prioCheck')) {
      state.prios = state.prios.map((item) => item.id === id ? { ...item, done: !item.done } : item);
    }
    persistPrios();
    renderPrioList();
    renderSlots();
  });

  prioPanelList?.addEventListener('input', (e) => {
    const itemEl = e.target.closest('.prioItem');
    if (!itemEl) return;
    const id = itemEl.dataset.id;
    if (e.target.classList.contains('prioTextInput')) {
      state.prios = state.prios.map((item) => item.id === id ? { ...item, text: e.target.value } : item);
    }
    if (e.target.classList.contains('prioNoteInput')) {
      state.prios = state.prios.map((item) => item.id === id ? { ...item, note: e.target.value } : item);
    }
    persistPrios();
    renderSlots();
  });

  freeTextInput?.addEventListener('input', () => {
    state.freeText = freeTextInput.value;
    localStorage.setItem(LS.freeText, state.freeText);
    renderSlots();
  });

  function updateTimerWheelText() {
    timerWheelValue.textContent = state.timer.running ? formatRemainingShort(timerRemainingSec()) : String(state.timer.minutes);
    timerBarWrap.setAttribute('aria-hidden', state.timer.running ? 'false' : 'true');
    timerBarWrap.style.opacity = state.timer.running ? '1' : '0';
    if (state.timer.running) {
      const remaining = timerRemainingSec();
      const duration = state.timer.durationSec || state.timer.minutes * 60;
      const pct = clamp(remaining / duration, 0, 1);
      timerBar.style.transform = `scaleY(${pct})`;
      timerBar.style.transformOrigin = 'bottom center';
    }
    renderSlots();
  }

  function startTimerTick() {
    stopTimerTick();
    updateTimerWheelText();
    timerTick = setInterval(() => {
      const remaining = timerRemainingSec();
      if (remaining <= 0) {
        state.timer.running = false;
        state.timer.endAt = 0;
        persistTimer();
        stopTimerTick();
      }
      updateTimerWheelText();
    }, 250);
  }

  function stopTimerTick() {
    if (timerTick) clearInterval(timerTick);
    timerTick = null;
  }

  function openTimer() {
    openOverlay(timerFocus);
  }

  function closeTimer() {
    closeOverlay(timerFocus);
  }

  function setTimerMinutes(mins) {
    state.timer.minutes = mins;
    state.timer.durationSec = mins * 60;
    if (!state.timer.running) {
      persistTimer();
      updateTimerWheelText();
    }
  }

  function startTimer() {
    state.timer.durationSec = state.timer.minutes * 60;
    state.timer.endAt = Date.now() + state.timer.durationSec * 1000;
    state.timer.running = true;
    persistTimer();
    startTimerTick();
    closeTimer();
  }

  function resetTimer() {
    state.timer.running = false;
    state.timer.endAt = 0;
    persistTimer();
    updateTimerWheelText();
  }

  let wheelStartAngle = null;
  let currentWheelMinutes = state.timer.minutes;
  const timerChoices = [5, 10, 15, 20, 25, 30, 45, 60];

  function pointerAngle(evt) {
    const rect = timerWheel.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return Math.atan2(evt.clientY - cy, evt.clientX - cx);
  }

  timerWheel?.addEventListener('pointerdown', (e) => {
    wheelStartAngle = pointerAngle(e);
    timerWheel.setPointerCapture?.(e.pointerId);
  });

  timerWheel?.addEventListener('pointermove', (e) => {
    if (wheelStartAngle == null) return;
    const angle = pointerAngle(e);
    const diff = angle - wheelStartAngle;
    const step = Math.round((diff / (Math.PI * 2)) * timerChoices.length * 1.4);
    const currentIndex = timerChoices.indexOf(state.timer.minutes);
    const nextIndex = (currentIndex + step + timerChoices.length * 8) % timerChoices.length;
    currentWheelMinutes = timerChoices[nextIndex];
    timerWheelValue.textContent = String(currentWheelMinutes);
  });

  function finishWheelInteraction() {
    if (wheelStartAngle == null) return;
    wheelStartAngle = null;
    setTimerMinutes(currentWheelMinutes || state.timer.minutes);
  }

  timerWheel?.addEventListener('pointerup', finishWheelInteraction);
  timerWheel?.addEventListener('pointercancel', finishWheelInteraction);
  timerWheel?.addEventListener('dblclick', () => {
    if (state.timer.running) {
      resetTimer();
    } else {
      startTimer();
    }
  });

  document.addEventListener('click', (e) => {
    const presetBtn = e.target.closest('[data-timer-min]');
    if (presetBtn) {
      e.preventDefault();
      e.stopPropagation();
      setTimerMinutes(Number(presetBtn.dataset.timerMin));
      updateTimerWheelText();
      return;
    }

    const actionBtn = e.target.closest('[data-timer-action]');
    if (actionBtn) {
      e.preventDefault();
      e.stopPropagation();
      const action = actionBtn.dataset.timerAction;
      if (action === 'start' || action === 'restart') startTimer();
      if (action === 'reset') resetTimer();
    }
  });

  timerIconBtn?.addEventListener('click', openTimer);
  timerCloseFab?.addEventListener('click', closeTimer);
  prioCloseFab?.addEventListener('click', () => closeOverlay(prioOverlay));
  weatherCloseFab?.addEventListener('click', () => closeOverlay(weatherOverlay));
  freeTextCloseFab?.addEventListener('click', () => closeOverlay(freeTextOverlay));
  genericCloseFab?.addEventListener('click', () => closeOverlay(genericOverlay));

  [prioOverlay, weatherOverlay, freeTextOverlay, genericOverlay, timerFocus].forEach((overlay) => {
    overlay?.addEventListener('click', (e) => {
      if (e.target === overlay) closeOverlay(overlay);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && activeOverlay) closeOverlay(activeOverlay);
    if (activeOverlay === timerFocus) {
      if (e.key === 'Enter') startTimer();
      if (e.key.toLowerCase() === 'r') resetTimer();
    }
  });

  async function ensureTvScript() {
    if (window.TradingView) return;
    if (tvScriptPromise) return tvScriptPromise;
    tvScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    return tvScriptPromise;
  }

  function renderGenericModule(type) {
    if (type === 'stocks') {
      genericPanel.className = 'genericPanel genericPanel--stocks';
      genericPanel.innerHTML = `
        <div class="stocksCarousel" id="stocksCarousel">
          ${STOCKS.map((stock, idx) => `
            <section class="stockSlide">
              <div class="stockSlideCard">
                <div class="stockWidgetMount tvWidgetFill" id="tvChart${idx}"></div>
              </div>
            </section>
          `).join('')}
        </div>
        <div class="stocksPager" id="stocksPager">
          ${STOCKS.map((_, i) => `<div class="stocksPagerDot ${i === 0 ? 'is-active' : ''}"></div>`).join('')}
        </div>
      `;
      mountTradingViewStocks();
      return;
    }

    if (type === 'news') {
      genericPanel.className = 'genericPanel genericPanel--news';
      genericPanel.innerHTML = `
        <div class="newsWidgetMount" id="newsWidgetMount"></div>
      `;
      mountTradingViewNews();
      return;
    }

    if (type === 'power') {
      genericPanel.className = 'genericPanel genericPanel--power';
      const p = state.power;
      genericPanel.innerHTML = `
        <div class="powerPanelCard">
          <div class="powerHead">
            <div>
              <div class="powerHeroTemp">${escapeHtml(p?.nowPriceText || '--')}</div>
              <div class="powerHeroMeta">Just nu · ${escapeHtml(p?.nowLabel || 'saknas')}</div>
            </div>
            <div class="genericSubtle">SE3</div>
          </div>
          <div class="powerBody">
            <div class="powerStatsGrid">
              <div class="powerStatCard"><div class="powerStatCardLabel">Lägst idag</div><div class="powerStatCardValue">${escapeHtml(p?.todayLowText || '--')}</div></div>
              <div class="powerStatCard"><div class="powerStatCardLabel">Högst idag</div><div class="powerStatCardValue">${escapeHtml(p?.todayHighText || '--')}</div></div>
              <div class="powerStatCard"><div class="powerStatCardLabel">Snitt idag</div><div class="powerStatCardValue">${escapeHtml(p?.todayAvgText || '--')}</div></div>
            </div>
            <div class="powerBarsBig">
              ${(p?.today || []).map((item) => `
                <div class="powerBarCol">
                  <div class="powerBar" style="height:${Math.max(10, item.ratio * 170)}px"></div>
                  <div class="powerBarLabel">${escapeHtml(item.hour)}</div>
                </div>
              `).join('')}
            </div>
            <div class="powerTomorrowList">
              <div class="powerTomorrowChip">
                <div class="powerTomorrowChipLabel">Billigaste nästa fönster</div>
                <div class="powerTomorrowChipValue">${escapeHtml(p?.bestWindow || '--')}</div>
              </div>
              <div class="powerTomorrowChip">
                <div class="powerTomorrowChipLabel">Imorgon</div>
                <div class="powerTomorrowChipValue">${escapeHtml(p?.tomorrowText || 'Ingen prognos än')}</div>
              </div>
            </div>
          </div>
        </div>
      `;
      return;
    }
  }

  async function mountTradingViewStocks() {
    try {
      await ensureTvScript();
      const carousel = $("stocksCarousel");
      const pager = $("stocksPager");
      const dots = pager ? [...pager.children] : [];

      STOCKS.forEach((stock, idx) => {
        const mount = $(`tvChart${idx}`);
        if (!mount || mount.dataset.mounted === '1') return;
        mount.dataset.mounted = '1';
        new window.TradingView.widget({
          autosize: true,
          symbol: stock.symbol,
          interval: '15',
          timezone: 'Europe/Stockholm',
          theme: 'dark',
          style: '1',
          locale: 'sv',
          allow_symbol_change: false,
          save_image: false,
          hide_side_toolbar: true,
          hide_top_toolbar: false,
          hide_legend: true,
          withdateranges: true,
          container_id: `tvChart${idx}`,
          backgroundColor: '#05070b',
          gridColor: 'rgba(255,255,255,0.05)',
          studies: [],
        });
      });

      if (carousel && !carousel.dataset.bound) {
        carousel.dataset.bound = '1';
        carousel.addEventListener('scroll', () => {
          const width = carousel.clientWidth || 1;
          const index = Math.round(carousel.scrollLeft / width);
          dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
        });
      }
    } catch (err) {
      console.error('TradingView charts kunde inte laddas', err);
    }
  }

  function mountTradingViewNews() {
    const mount = $("newsWidgetMount");
    if (!mount || mount.dataset.mounted === '1') return;
    mount.dataset.mounted = '1';
    mount.innerHTML = '<div class="tradingview-widget-container__widget"></div>';
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-timeline.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      feedMode: 'all_symbols',
      isTransparent: true,
      displayMode: 'adaptive',
      width: '100%',
      height: 620,
      colorTheme: 'dark',
      locale: 'sv'
    });
    mount.appendChild(script);
  }

  async function fetchElPrice() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const y2 = tomorrow.getFullYear();
    const m2 = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const d2 = String(tomorrow.getDate()).padStart(2, '0');
    const urlToday = `https://www.elprisetjustnu.se/api/v1/prices/${y}/${m}-${d}_SE3.json`;
    const urlTomorrow = `https://www.elprisetjustnu.se/api/v1/prices/${y2}/${m2}-${d2}_SE3.json`;

    try {
      const [todayRes, tomorrowRes] = await Promise.all([
        fetch(urlToday, { cache: 'no-store' }),
        fetch(urlTomorrow, { cache: 'no-store' }).catch(() => null),
      ]);
      if (!todayRes.ok) throw new Error('power fetch failed');
      const todayData = await todayRes.json();
      let tomorrowData = [];
      if (tomorrowRes && tomorrowRes.ok) {
        tomorrowData = await tomorrowRes.json();
      }
      state.power = transformPowerData(todayData, tomorrowData);
      saveJson(LS.power, state.power);
      renderSlots();
      if (activeOverlay === genericOverlay) {
        const currentModule = MODULES.find((m) => m.id === 'power');
        if (currentModule) renderGenericModule('power');
      }
    } catch (err) {
      console.error(err);
    }
  }

  function transformPowerData(todayData, tomorrowData) {
    const prices = todayData.map((item) => ({
      hour: new Date(item.time_start).toLocaleTimeString('sv-SE', { hour: '2-digit' }),
      fullHour: new Date(item.time_start).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }),
      price: Number(item.SEK_per_kWh || 0),
    }));
    const max = Math.max(...prices.map((x) => x.price), 1);
    const min = Math.min(...prices.map((x) => x.price), 0);
    const avg = prices.reduce((sum, p) => sum + p.price, 0) / (prices.length || 1);
    const currentHour = new Date().getHours();
    const nowPrice = prices[currentHour] || prices[0];
    const best = [...prices].sort((a, b) => a.price - b.price)[0];
    const tomorrowText = tomorrowData.length
      ? `${new Date(tomorrowData[0].time_start).toLocaleDateString('sv-SE', { weekday: 'long' })}: ${Math.min(...tomorrowData.map(x => x.SEK_per_kWh)).toFixed(2)}–${Math.max(...tomorrowData.map(x => x.SEK_per_kWh)).toFixed(2)} kr`
      : 'Imorgon ej publicerat ännu';
    return {
      today: prices.map((p) => ({ ...p, ratio: (p.price - min) / ((max - min) || 1) })),
      nowPriceText: `${nowPrice.price.toFixed(2)} kr`,
      nowLabel: `${nowPrice.fullHour}–${String(Number(nowPrice.hour) + 1).padStart(2, '0')}:00`,
      todayLowText: `${min.toFixed(2)} kr`,
      todayHighText: `${max.toFixed(2)} kr`,
      todayAvgText: `${avg.toFixed(2)} kr`,
      bestWindow: `${best.fullHour} · ${best.price.toFixed(2)} kr`,
      tomorrowText,
      todayDateText: new Date().toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' }),
    };
  }

  async function refreshStocksMini() {
    const nowStamp = new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
    state.stockMini = {
      gold: { value: 'Live', meta: `XAU/USD · ${nowStamp}` },
      silver: { value: 'Live', meta: `XAG/USD · ${nowStamp}` },
      oil: { value: 'Live', meta: `USOIL · ${nowStamp}` },
      us100: { value: 'Live', meta: `US100 · ${nowStamp}` },
      eurusd: { value: 'Live', meta: `EUR/USD · ${nowStamp}` },
    };
    saveJson(LS.stocksMini, state.stockMini);
    renderSlots();
  }

  function boot() {
    updateClock();
    setInterval(updateClock, 1000);
    renderSlots();
    renderPrioList();
    updateTimerWheelText();
    slotEls.forEach((slot, i) => attachSlotSwipe(slot, i));
    fetchWeather();
    fetchElPrice();
    refreshStocksMini();
    if (state.timer.running && timerRemainingSec() > 0) {
      startTimerTick();
    } else {
      state.timer.running = false;
      state.timer.endAt = 0;
      persistTimer();
    }
  }

  boot();
})();
