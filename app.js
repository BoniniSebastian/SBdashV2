(() => {
  const $ = (id) => document.getElementById(id);

  const STORAGE_KEYS = {
    tasks: "sbdash_v7_tasks",
    notes: "sbdash_v7_notes",
    timerPreset: "sbdash_v7_timer_preset",
    matchCards: "sbdash_v7_match_cards",
    newsCache: "sbdash_v7_news_cache"
  };

  const dayDateEl = $("dayDate");
  const slotAButton = $("slotAButton");
  const slotBButton = $("slotBButton");
  const slotAContent = $("slotAContent");
  const slotBContent = $("slotBContent");
  const slotASection = $("slotASection");
  const slotBSection = $("slotBSection");
  const overlay = $("moduleOverlay");
  const overlayContent = $("overlayContent");
  const closeFab = $("closeFab");
  const timerDoneOverlay = $("timerDoneOverlay");
  const timerDoneCloseFab = $("timerDoneCloseFab");
  const timerMidBarWrap = $("timerMidBarWrap");
  const timerMidBar = $("timerMidBar");
  const alarmAudio = $("alarmAudio");

  const articleOverlay = $("articleOverlay");
  const articleBackBtn = $("articleBackBtn");
  const articleOpenBtn = $("articleOpenBtn");
  const articleMeta = $("articleMeta");
  const articleTitle = $("articleTitle");
  const articleFrame = $("articleFrame");
  const calendarOpenBtn = $("calendarOpenBtn");

  const TIMER_OPTIONS = [
    { label: "1m", seconds: 60 },
    { label: "5m", seconds: 300 },
    { label: "10m", seconds: 600 },
    { label: "15m", seconds: 900 },
    { label: "25m", seconds: 1500 },
    { label: "30m", seconds: 1800 },
    { label: "1h", seconds: 3600 }
  ];

  const NEWS_REFRESH_MS = 10 * 60 * 1000;
  const NEWS_LIMIT = 12;

  const MARKET_SYMBOLS = [
    { id: "gold", name: "Guld", short: "Guld", tv: "OANDA:XAUUSD", tape: { description: "Guld", proName: "OANDA:XAUUSD" } },
    { id: "silver", name: "Silver", short: "Silver", tv: "OANDA:XAGUSD", tape: { description: "Silver", proName: "OANDA:XAGUSD" } },
    { id: "oil", name: "Olja", short: "Olja", tv: "TVC:USOIL", tape: { description: "Olja", proName: "TVC:USOIL" } },
    { id: "eth", name: "ETH", short: "ETH", tv: "BITSTAMP:ETHUSD", tape: { description: "ETH", proName: "BITSTAMP:ETHUSD" } },
    { id: "us100", name: "US100", short: "US100", tv: "FOREXCOM:NSXUSD", tape: { description: "US100", proName: "FOREXCOM:NSXUSD" } },
    { id: "usdeur", name: "USD/EUR", short: "USD/EUR", tv: "FX_IDC:USDEUR", tape: { description: "USD/EUR", proName: "FX_IDC:USDEUR" } }
  ];

  const TV_SCRIPT_TICKER = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
  const TV_SCRIPT_CHART = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";

  let weatherState = {
    temp: "--°",
    status: "Laddar väder…",
    meta: "—",
    type: "cloud",
    hourly: []
  };

  let tasks = loadJson(STORAGE_KEYS.tasks, [
    { id: uid(), text: "Planera dagen", done: false, subtasks: ["Välj fokus", "Stäm av kalendern"] },
    { id: uid(), text: "Kolla det viktigaste", done: false, subtasks: [] }
  ]);

  let notes = localStorage.getItem(STORAGE_KEYS.notes) || "";

  let timerState = {
    presetIndex: clampPresetIndex(Number(localStorage.getItem(STORAGE_KEYS.timerPreset)) || 0),
    selecting: false,
    running: false,
    startedAt: 0,
    totalMs: 0,
    remainingMs: 0,
    intervalId: null
  };

  let matchCards = normalizeMatchCards(loadJson(STORAGE_KEYS.matchCards, null));

  const initialNewsCache = normalizeNewsCache(loadJson(STORAGE_KEYS.newsCache, null));
  let newsState = {
    items: initialNewsCache.items,
    updatedAt: initialNewsCache.updatedAt,
    loading: false,
    error: ""
  };

  let currentArticle = null;
  let marketState = {
    selectedId: "gold",
    view: "hub"
  };

  const slotGroups = {
    A: {
      index: 0,
      modules: [
        { key: "weather" },
        { key: "timer" },
        { key: "news" },
        { key: "markets" }
      ]
    },
    B: {
      index: 0,
      modules: [
        { key: "tasks" },
        { key: "notes" },
        { key: "matches" }
      ]
    }
  };

  function uid() {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function loadJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function saveTasks() {
    localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks));
  }

  function saveNotes() {
    localStorage.setItem(STORAGE_KEYS.notes, notes);
  }

  function saveTimerPreset() {
    localStorage.setItem(STORAGE_KEYS.timerPreset, String(timerState.presetIndex));
  }

  function saveMatchCards() {
    localStorage.setItem(STORAGE_KEYS.matchCards, JSON.stringify(matchCards));
  }

  function saveNewsCache() {
    localStorage.setItem(STORAGE_KEYS.newsCache, JSON.stringify({
      items: newsState.items,
      updatedAt: newsState.updatedAt
    }));
  }

  function makeEmptyMatchCard() {
    return {
      id: uid(),
      imageSrc: "",
      dateText: "",
      timeText: "",
      player: "",
      series: "",
      opponent: "",
      location: "",
      gathering: "",
      note: "",
      ocrStatus: ""
    };
  }

  function normalizeMatchCards(cards) {
    const base = Array.from({ length: 5 }, () => makeEmptyMatchCard());
    if (!Array.isArray(cards)) return base;

    return base.map((item, index) => {
      const source = cards[index] || {};
      return {
        id: typeof source.id === "string" ? source.id : uid(),
        imageSrc: typeof source.imageSrc === "string" ? source.imageSrc : "",
        dateText: typeof source.dateText === "string" ? source.dateText : "",
        timeText: typeof source.timeText === "string" ? source.timeText : "",
        player: typeof source.player === "string" ? source.player : "",
        series: typeof source.series === "string" ? source.series : "",
        opponent: typeof source.opponent === "string" ? source.opponent : "",
        location: typeof source.location === "string" ? source.location : "",
        gathering: typeof source.gathering === "string" ? source.gathering : "",
        note: typeof source.note === "string" ? source.note : "",
        ocrStatus: typeof source.ocrStatus === "string" ? source.ocrStatus : ""
      };
    });
  }

  function normalizeNewsCache(cache) {
    if (!cache || typeof cache !== "object") {
      return { items: [], updatedAt: 0 };
    }

    const items = Array.isArray(cache.items)
      ? cache.items.map((item, index) => normalizeNewsItem(item, index)).filter(Boolean)
      : [];

    return {
      items,
      updatedAt: Number.isFinite(cache.updatedAt) ? cache.updatedAt : 0
    };
  }

  function normalizeNewsItem(item, index = 0) {
    if (!item || typeof item !== "object") return null;

    return {
      id: typeof item.id === "string" ? item.id : `news_${index}_${Date.now()}`,
      title: typeof item.title === "string" ? item.title : "",
      source: typeof item.source === "string" ? item.source : "",
      publishedAt: typeof item.publishedAt === "string" ? item.publishedAt : "",
      link: typeof item.link === "string" ? item.link : "",
      image: typeof item.image === "string" ? item.image : "",
      category: typeof item.category === "string" ? item.category : ""
    };
  }

  function clampPresetIndex(value) {
    if (Number.isNaN(value)) return 0;
    return Math.max(0, Math.min(TIMER_OPTIONS.length - 1, value));
  }

  function formatDayDate() {
    const now = new Date();
    const formatted = new Intl.DateTimeFormat("sv-SE", {
      weekday: "long",
      day: "numeric",
      month: "long"
    }).format(now);

    const parts = formatted.split(" ");
    const weekday = (parts.shift() || "").replace(/\.$/, "").toUpperCase();
    const rest = parts.join(" ").toUpperCase();
    dayDateEl.textContent = `${weekday} · ${rest}`;
  }

  function weatherTypeFromCode(code) {
    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code)) return "rain";
    if ([0].includes(code)) return "sun";
    return "cloud";
  }

  async function loadWeather() {
    try {
      const url =
        "https://api.open-meteo.com/v1/forecast?latitude=59.33&longitude=18.07&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code&timezone=Europe%2FStockholm&forecast_days=2";

      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();

      const current = data.current || {};
      const hourly = data.hourly || {};
      const times = hourly.time || [];
      const temps = hourly.temperature_2m || [];
      const rain = hourly.precipitation_probability || [];
      const codes = hourly.weather_code || [];

      const type = weatherTypeFromCode(current.weather_code);
      const labels = {
        sun: "Klart",
        cloud: "Molnigt",
        rain: "Regn"
      };

      const hourlyRows = [];
      const now = new Date();
      const currentHour = now.getHours();

      for (let i = 0; i < times.length && hourlyRows.length < 8; i += 1) {
        const dt = new Date(times[i]);
        if (dt.getDate() !== now.getDate() || dt.getHours() < currentHour) continue;

        hourlyRows.push({
          time: `${String(dt.getHours()).padStart(2, "0")}:00`,
          temp: `${Math.round(temps[i])}°`,
          rain: `${Math.round(rain[i] || 0)}%`,
          type: weatherTypeFromCode(codes[i])
        });
      }

      weatherState = {
        temp: `${Math.round(current.temperature_2m ?? 0)}°`,
        status: labels[type],
        meta: `Känns som ${Math.round(current.apparent_temperature ?? 0)}° · Vind ${Math.round(current.wind_speed_10m ?? 0)} m/s`,
        type,
        hourly: hourlyRows
      };
    } catch {
      weatherState = {
        temp: "--°",
        status: "Kunde inte ladda väder",
        meta: "Kontrollera anslutning",
        type: "cloud",
        hourly: []
      };
    }

    renderSlots();

    if (overlay.classList.contains("open") && currentModuleKey() === "weather") {
      openCurrentModule("A");
    }
  }

  async function loadNews(force = false) {
    if (newsState.loading) return;

    const now = Date.now();
    if (!force && newsState.updatedAt && now - newsState.updatedAt < NEWS_REFRESH_MS) {
      return;
    }

    newsState.loading = true;
    newsState.error = "";

    try {
      const worldFeed = "https://news.google.com/rss/search?q=världen%20OR%20world&hl=sv&gl=SE&ceid=SE:sv";
      const swedenFeed = "https://news.google.com/rss/search?q=Sverige&hl=sv&gl=SE&ceid=SE:sv";

      const [worldItems, swedenItems] = await Promise.all([
        fetchRssJson(worldFeed, "Världen"),
        fetchRssJson(swedenFeed, "Sverige")
      ]);

      const merged = [...worldItems, ...swedenItems]
        .filter((item) => item.title && item.link)
        .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));

      const unique = [];
      const seen = new Set();

      for (const item of merged) {
        const key = `${item.title}__${item.source}`;
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(item);
        if (unique.length >= NEWS_LIMIT) break;
      }

      if (unique.length) {
        newsState.items = unique;
        newsState.updatedAt = Date.now();
        saveNewsCache();
      } else if (!newsState.items.length) {
        newsState.error = "Kunde inte ladda nyheter";
      }
    } catch {
      if (!newsState.items.length) {
        newsState.error = "Kunde inte ladda nyheter";
      }
    } finally {
      newsState.loading = false;
      renderSlots();

      if (overlay.classList.contains("open") && currentModuleKey() === "news") {
        openCurrentModule("A");
      }
    }
  }

  async function fetchRssJson(feedUrl, category) {
    const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();

    if (!data || !Array.isArray(data.items)) return [];

    return data.items.map((item, index) => ({
      id: `${category}_${index}_${Date.now()}`,
      title: cleanText(item.title || ""),
      source: cleanText(item.author || data.feed?.title || category),
      publishedAt: item.pubDate || "",
      link: item.link || "",
      image: pickNewsImage(item),
      category
    }));
  }

  function pickNewsImage(item) {
    if (typeof item.thumbnail === "string" && item.thumbnail) return item.thumbnail;
    if (typeof item.enclosure?.link === "string" && item.enclosure.link) return item.enclosure.link;

    const content = item.content || item.description || "";
    const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);
    return match ? match[1] : "";
  }

  function cleanText(value) {
    const text = String(value || "");
    const tmp = document.createElement("textarea");
    tmp.innerHTML = text;
    return tmp.value.replace(/\s+/g, " ").trim();
  }

  function currentModuleKey() {
    return overlay.dataset.moduleKey || "";
  }


  function marketById(id) {
    return MARKET_SYMBOLS.find((item) => item.id === id) || MARKET_SYMBOLS[0];
  }

  function tradingViewSymbols() {
    return MARKET_SYMBOLS.map((item) => item.tape);
  }

  function mountTradingViewWidget(hostId, scriptSrc, config) {
    const host = $(hostId);
    if (!host) return;

    host.innerHTML = "";

    const container = document.createElement("div");
    container.className = "tradingview-widget-container";

    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    container.appendChild(widget);

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = scriptSrc;
    script.async = true;
    script.innerHTML = JSON.stringify(config);
    container.appendChild(script);

    host.appendChild(container);
  }

  function mountMarketsPreviewWidget() {
    const host = $("marketsPreviewTape");
    if (!host) return;

    mountTradingViewWidget("marketsPreviewTape", TV_SCRIPT_TICKER, {
      symbols: tradingViewSymbols(),
      showSymbolLogo: true,
      colorTheme: "dark",
      isTransparent: true,
      displayMode: "compact",
      locale: "sv"
    });
  }

  function mountMarketsHubWidget() {
    const host = $("marketsHubTape");
    if (!host) return;

    mountTradingViewWidget("marketsHubTape", TV_SCRIPT_TICKER, {
      symbols: tradingViewSymbols(),
      showSymbolLogo: true,
      colorTheme: "dark",
      isTransparent: true,
      displayMode: "adaptive",
      locale: "sv"
    });
  }

  function mountMarketsChartWidget(symbol) {
    const host = $("marketsChartWidget");
    if (!host) return;

    mountTradingViewWidget("marketsChartWidget", TV_SCRIPT_CHART, {
      autosize: true,
      symbol,
      interval: "2",
      timezone: "Europe/Stockholm",
      theme: "dark",
      style: "1",
      locale: "sv",
      allow_symbol_change: false,
      save_image: false,
      calendar: false,
      details: false,
      hotlist: false,
      support_host: "https://www.tradingview.com"
    });
  }

  function afterRenderSlots() {
    mountMarketsPreviewWidget();
  }

  function weatherGlyph(type, large = false) {
    return `
      <div class="weatherGlyph ${large ? "weatherGlyphLarge" : ""} is-${type}">
        <div class="sun"></div>
        <div class="cloud"></div>
        <div class="rain"></div>
      </div>
    `;
  }

  function cameraIconMarkup() {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4.5 7.5h3l1.4-2h6.2l1.4 2h3A1.5 1.5 0 0 1 21 9v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18V9a1.5 1.5 0 0 1 1.5-1.5Z"></path>
        <circle cx="12" cy="13" r="3.5"></circle>
      </svg>
    `;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function shortDayDate(value) {
    const v = (value || "").trim();
    if (!v) return "Datum saknas";
    return v
      .replace(/^måndag/i, "Mån")
      .replace(/^tisdag/i, "Tis")
      .replace(/^onsdag/i, "Ons")
      .replace(/^torsdag/i, "Tor")
      .replace(/^fredag/i, "Fre")
      .replace(/^lördag/i, "Lör")
      .replace(/^söndag/i, "Sön");
  }

  function playerClass(player) {
    return player === "Alice" ? "is-alice" : player === "Milo" ? "is-milo" : "";
  }

  function isFilledMatch(card) {
    return !!(
      card.dateText ||
      card.timeText ||
      card.player ||
      card.series ||
      card.opponent ||
      card.location ||
      card.gathering ||
      card.note ||
      card.imageSrc
    );
  }

  function formatNewsAge(publishedAt) {
    if (!publishedAt) return "";
    const diff = Date.now() - new Date(publishedAt).getTime();
    if (!Number.isFinite(diff)) return "";

    const mins = Math.max(1, Math.floor(diff / 60000));
    if (mins < 60) return `${mins}m`;

    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;

    const days = Math.floor(hours / 24);
    return `${days}d`;
  }

  function renderWeatherPreview() {
    return `
      <div class="weatherPreview">
        <div class="weatherPreviewVisual">${weatherGlyph(weatherState.type)}</div>
        <div class="weatherPreviewText">
          <div class="weatherPreviewTemp">${escapeHtml(weatherState.temp)}</div>
          <div class="weatherPreviewStatus">${escapeHtml(weatherState.status)}</div>
          <div class="weatherPreviewMeta">${escapeHtml(weatherState.meta)}</div>
        </div>
      </div>
    `;
  }

  function renderTasksPreview() {
    const active = tasks.slice(0, 3);
    if (!active.length) {
      return `<div class="tasksPreview"><div class="tasksEmpty">Inga tasks ännu. Tryck för att skapa din första.</div></div>`;
    }

    return `
      <div class="tasksPreview">
        <div class="tasksListPreview">
          ${active.map((task) => `
            <div class="tasksItemPreview">
              <div class="tasksDot"></div>
              <div class="tasksTextWrap">
                <div class="tasksText">${escapeHtml(task.text)}</div>
                <div class="tasksSub">${task.subtasks?.length ? `${task.subtasks.length} delmål` : "Inga delmål"}</div>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  function renderNotesPreview() {
    const hasText = notes.trim().length > 0;
    return `
      <div class="notesPreview">
        <div class="notesPreviewHead">Anteckningar</div>
        <div class="notesPreviewBody ${hasText ? "" : "is-empty"}">${escapeHtml(
          hasText ? notes : "Tryck för att skriva."
        )}</div>
      </div>
    `;
  }

  function renderTimerPreview() {
    return `
      <div class="timerPreview">
        <div class="timerPreviewWheel">
          <img class="timerNeonRing" src="assets/ui/wheel-ring.svg" alt="">
          <div class="timerPreviewBlob" aria-hidden="true"></div>
          <div class="timerPreviewCenter">
            <div class="timerPreviewTop">Timer</div>
            <div class="timerPreviewBottom">Tryck för att starta</div>
          </div>
        </div>
      </div>
    `;
  }

  function renderNewsPreview() {
    const items = newsState.items.slice(0, 3);

    if (!items.length) {
      return `
        <div class="newsPreview">
          <div class="newsPreviewLabel">Nyheter</div>
          <div class="newsPreviewEmpty">${escapeHtml(newsState.error || "Laddar nyheter…")}</div>
        </div>
      `;
    }

    const hero = items[0];
    const rest = items.slice(1);

    return `
      <div class="newsPreview">
        <div class="newsPreviewLabel">Nyheter</div>

        <div class="newsPreviewHero">
          <div class="newsPreviewThumb">
            ${hero.image ? `<img src="${hero.image}" alt="">` : ""}
          </div>
          <div class="newsPreviewHeroTitle">${escapeHtml(hero.title)}</div>
        </div>

        <div class="newsPreviewSubList">
          ${rest.map((item) => `
            <div class="newsPreviewSubItem">${escapeHtml(item.title)}</div>
          `).join("")}
        </div>
      </div>
    `;
  }

  function renderMarketsPreview() {
    const active = marketById(marketState.selectedId);

    return `
      <div class="marketsPreview">
        <div class="marketsPreviewLabelRow">
          <div class="newsPreviewLabel">Marknad</div>
          <div class="marketsPreviewCurrent">${escapeHtml(active.name)}</div>
        </div>
        <div class="marketsPreviewTapeShell">
          <div class="marketsPreviewTape" id="marketsPreviewTape"></div>
        </div>
        <div class="marketsPreviewFoot">Guld • Silver • Olja • ETH • US100 • USD/EUR</div>
      </div>
    `;
  }

  function renderMatchesPreview() {
    const visible = matchCards.filter(isFilledMatch).slice(0, 4);

    if (!visible.length) {
      return `
        <div class="matchPreview matchPreview--empty">
          <div class="matchPreviewEmpty">Lägg till upp till 5 matcher i modulen.</div>
        </div>
      `;
    }

    return `
      <div class="matchPreview">
        ${visible.map((card, index) => `
          <article class="matchPreviewCard ${index < visible.length - 1 ? "has-divider" : ""}">
            <div class="matchPreviewRow matchPreviewRow--strong">
              <span>${escapeHtml(shortDayDate(card.dateText))}</span>
              <span class="matchPlayer ${playerClass(card.player)}">${escapeHtml(card.player || "Spelare")}</span>
              <span class="matchGathering">Saml. ${escapeHtml(card.gathering || "--:--")}</span>
            </div>
            <div class="matchPreviewRow matchPreviewRow--muted">
              <span>${escapeHtml(card.location || "Plats saknas")}</span>
              <span>${escapeHtml(card.opponent || "Motstånd saknas")}</span>
              <span>${escapeHtml(card.timeText || "Tid saknas")}</span>
            </div>
            <div class="matchPreviewRow matchPreviewRow--note ${card.note.trim() ? "has-note" : "is-empty"}">
              ${card.note.trim() ? escapeHtml(card.note.trim()) : " "}
            </div>
          </article>
        `).join("")}
      </div>
    `;
  }

  function renderPlaceholderPreview(text) {
    return `<div class="placeholderPreview">${escapeHtml(text)}</div>`;
  }

  function renderSlot(groupKey) {
    const group = slotGroups[groupKey];
    const module = group.modules[group.index];

    if (module.key === "weather") return renderWeatherPreview();
    if (module.key === "timer") return renderTimerPreview();
    if (module.key === "tasks") return renderTasksPreview();
    if (module.key === "notes") return renderNotesPreview();
    if (module.key === "matches") return renderMatchesPreview();
    if (module.key === "news") return renderNewsPreview();
    if (module.key === "markets") return renderMarketsPreview();

    return renderPlaceholderPreview(module.text || "—");
  }

  function renderSlots() {
    slotAContent.innerHTML = renderSlot("A");
    slotBContent.innerHTML = renderSlot("B");
    requestAnimationFrame(afterRenderSlots);
  }

  function openCurrentModule(groupKey) {
    const module = slotGroups[groupKey].modules[slotGroups[groupKey].index];
    overlay.dataset.moduleKey = module.key;
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");

    if (module.key === "weather") {
      overlayContent.innerHTML = renderWeatherModule();
    } else if (module.key === "tasks") {
      overlayContent.innerHTML = renderTasksModule();
      bindTasksModule();
    } else if (module.key === "notes") {
      overlayContent.innerHTML = renderNotesModule();
      bindNotesModule();
    } else if (module.key === "timer") {
      overlayContent.innerHTML = renderTimerModule();
      bindTimerModule();
    } else if (module.key === "matches") {
      overlayContent.innerHTML = renderMatchesModule();
      bindMatchesModule();
    } else if (module.key === "news") {
      overlayContent.innerHTML = renderNewsModule();
      bindNewsModule();
    } else if (module.key === "markets") {
      overlayContent.innerHTML = renderMarketsModule();
      bindMarketsModule();
    } else if (module.key === "calendar") {
      overlayContent.innerHTML = renderCalendarModule();
    } else {
      overlayContent.innerHTML = renderPlaceholderModule(module.text || "Nästa modul");
    }
  }

  function closeModule() {
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
    overlay.dataset.moduleKey = "";
  }

  function openCalendarModule() {
    overlay.dataset.moduleKey = "calendar";
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    overlayContent.innerHTML = renderCalendarModule();
  }

  function showTimerDoneOverlay() {
    timerDoneOverlay.classList.add("open");
    timerDoneOverlay.setAttribute("aria-hidden", "false");
  }

  function hideTimerDoneOverlay() {
    timerDoneOverlay.classList.remove("open");
    timerDoneOverlay.setAttribute("aria-hidden", "true");
  }

  function openArticle(item) {
    currentArticle = item;
    articleMeta.textContent = `${item.source || "Nyhet"}${item.publishedAt ? ` • ${formatNewsAge(item.publishedAt)}` : ""}`;
    articleTitle.textContent = item.title || "";
    articleFrame.src = item.link || "";
    articleOverlay.classList.add("open");
    articleOverlay.setAttribute("aria-hidden", "false");
  }

  function closeArticle() {
    articleOverlay.classList.remove("open");
    articleOverlay.setAttribute("aria-hidden", "true");
    articleFrame.src = "about:blank";
    currentArticle = null;
  }

  function renderWeatherModule() {
    const rows = weatherState.hourly.length
      ? weatherState.hourly
      : [{ time: "Nu", temp: weatherState.temp, rain: "0%", type: weatherState.type }];

    return `
      <div class="fullModule">
        <div class="fullModuleHead">
          <div class="fullModuleTitle">Väder</div>
        </div>
        <div class="weatherModuleTop">
          <div>
            <div class="weatherBigTemp">${escapeHtml(weatherState.temp)}</div>
            <div class="weatherBigStatus">${escapeHtml(weatherState.status)}</div>
            <div class="weatherMetaLine">${escapeHtml(weatherState.meta)}</div>
          </div>
          ${weatherGlyph(weatherState.type, true)}
        </div>
        <div class="weatherRows">
          ${rows.map((row) => `
            <div class="weatherRow">
              <div class="weatherRowTime">${escapeHtml(row.time)}</div>
              <div class="weatherRowMain">${
                row.type === "sun" ? "Klart" : row.type === "rain" ? "Regn" : "Molnigt"
              } · Regnrisk ${escapeHtml(row.rain)}</div>
              <div class="weatherRowTemp">${escapeHtml(row.temp)}</div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  function renderTasksModule() {
    return `
      <div class="tasksModule fullModule">
        <div class="fullModuleHead">
          <div class="fullModuleTitle">Tasks</div>
        </div>
        <div class="tasksComposer">
          <input class="tasksInput" id="tasksInput" type="text" maxlength="140" placeholder="Skapa uppgift..." autocomplete="off" />
          <button class="tasksAddBtn" id="tasksAddBtn" type="button" aria-label="Lägg till task">+</button>
        </div>
        <div class="tasksModuleList" id="tasksModuleList">${renderTasksList()}</div>
      </div>
    `;
  }

  function renderTasksList() {
    if (!tasks.length) return `<div class="fullModuleText">Inga tasks ännu.</div>`;

    return tasks.map((task) => `
      <div class="taskCard ${task.done ? "is-done" : ""}" data-task-id="${task.id}">
        <div class="taskMainRow">
          <input class="taskCheck" type="checkbox" ${task.done ? "checked" : ""} data-action="toggle-task" data-task-id="${task.id}" />
          <button class="taskTextBtn" type="button" data-action="focus-sub" data-task-id="${task.id}">${escapeHtml(task.text)}</button>
          <button class="taskDeleteBtn" type="button" data-action="delete-task" data-task-id="${task.id}">Ta bort</button>
        </div>
        <div class="subTasks">
          ${(task.subtasks || []).map((sub) => `
            <div class="subTaskRow">
              <div class="subTaskMark"></div>
              <div class="subTaskText">${escapeHtml(sub)}</div>
            </div>
          `).join("")}
        </div>
        <div class="subTaskInputRow">
          <input class="taskSubInput" id="sub_${task.id}" type="text" maxlength="120" placeholder="Lägg till delmål..." autocomplete="off" />
          <button class="addSubBtn" type="button" data-action="add-sub" data-task-id="${task.id}">Spara</button>
        </div>
      </div>
    `).join("");
  }

  function bindTasksModule() {
    const tasksInput = $("tasksInput");
    const tasksAddBtn = $("tasksAddBtn");
    const tasksModuleList = $("tasksModuleList");

    function rerenderTasksModule() {
      overlayContent.innerHTML = renderTasksModule();
      bindTasksModule();
      renderSlots();
    }

    function addTask() {
      const text = tasksInput.value.trim();
      if (!text) return;
      tasks.unshift({ id: uid(), text, done: false, subtasks: [] });
      tasksInput.value = "";
      saveTasks();
      rerenderTasksModule();
    }

    function addSubtask(taskId) {
      const task = tasks.find((item) => item.id === taskId);
      const input = $(`sub_${taskId}`);
      const val = input?.value.trim();
      if (!task || !val) return;
      task.subtasks = task.subtasks || [];
      task.subtasks.push(val);
      saveTasks();
      rerenderTasksModule();
    }

    tasksAddBtn.addEventListener("click", addTask);

    tasksInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addTask();
      }
    });

    tasksModuleList.addEventListener("keydown", (e) => {
      const subInput = e.target.closest(".taskSubInput");
      if (!subInput) return;
      if (e.key === "Enter") {
        e.preventDefault();
        addSubtask(subInput.id.replace("sub_", ""));
      }
    });

    tasksModuleList.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const action = btn.dataset.action;
      const taskId = btn.dataset.taskId;
      const task = tasks.find((item) => item.id === taskId);

      if (action === "delete-task") {
        tasks = tasks.filter((item) => item.id !== taskId);
        saveTasks();
        rerenderTasksModule();
        return;
      }

      if (!task) return;

      if (action === "add-sub") {
        addSubtask(taskId);
        return;
      }

      if (action === "focus-sub") {
        const input = $(`sub_${taskId}`);
        input?.focus();
      }
    });

    tasksModuleList.addEventListener("change", (e) => {
      const checkbox = e.target.closest("[data-action='toggle-task']");
      if (!checkbox) return;
      const task = tasks.find((item) => item.id === checkbox.dataset.taskId);
      if (!task) return;
      task.done = checkbox.checked;
      saveTasks();
      rerenderTasksModule();
    });
  }

  function renderNotesModule() {
    return `
      <div class="notesModule fullModule">
        <div class="notesHead"><div class="notesLabel">Anteckningar</div></div>
        <div class="notesBox">
          <textarea class="notesInput" id="notesInput" placeholder="Skriv fritt...">${escapeHtml(notes)}</textarea>
        </div>
      </div>
    `;
  }

  function bindNotesModule() {
    const input = $("notesInput");
    if (!input) return;

    input.addEventListener("input", () => {
      notes = input.value;
      saveNotes();
      renderSlots();
    });
  }

  function renderTimerModule() {
    const preset = TIMER_OPTIONS[timerState.presetIndex];
    const valueText = timerState.running ? formatRemaining(timerState.remainingMs) : preset.label;
    const bottomText = timerState.running
      ? "Pågår"
      : timerState.selecting
        ? "Svep för att välja · tryck igen för start"
        : "Tryck för att starta";

    return `
      <div class="timerModule">
        <div class="timerWheelWrap">
          <button class="timerWheel" id="timerWheelBtn" type="button" aria-label="Timer">
            <img class="timerNeonRing" src="assets/ui/wheel-ring.svg" alt="">
            <div class="timerWheelBlob" aria-hidden="true"></div>
            <div class="timerWheelCenter">
              <div class="timerCenterTop">Timer</div>
              <div class="timerCenterValue" id="timerCenterValue">${escapeHtml(valueText)}</div>
              <div class="timerCenterBottom" id="timerCenterBottom">${escapeHtml(bottomText)}</div>
            </div>
          </button>
        </div>
        <div class="timerHint">${timerState.running ? "Svep upp eller ner för att se tiden gå klart." : "Välj 1m, 5, 10, 15, 25, 30 eller 1h."}</div>
      </div>
    `;
  }

  function bindTimerModule() {
    const wheelBtn = $("timerWheelBtn");
    const valueEl = $("timerCenterValue");
    const bottomEl = $("timerCenterBottom");
    if (!wheelBtn) return;

    let startY = 0;
    let dragging = false;

    function refreshTimerModuleView() {
      const preset = TIMER_OPTIONS[timerState.presetIndex];
      if (valueEl) valueEl.textContent = timerState.running ? formatRemaining(timerState.remainingMs) : preset.label;
      if (bottomEl) {
        bottomEl.textContent = timerState.running
          ? "Pågår"
          : timerState.selecting
            ? "Svep för att välja · tryck igen för start"
            : "Tryck för att starta";
      }
    }

    function startTimer() {
      if (timerState.running) return;

      const preset = TIMER_OPTIONS[timerState.presetIndex];
      timerState.running = true;
      timerState.selecting = false;
      timerState.totalMs = preset.seconds * 1000;
      timerState.remainingMs = timerState.totalMs;
      timerState.startedAt = Date.now();

      timerMidBarWrap.classList.add("show");
      updateTimerBar(1);

      if (timerState.intervalId) clearInterval(timerState.intervalId);
      timerState.intervalId = setInterval(() => {
        const elapsed = Date.now() - timerState.startedAt;
        const remaining = Math.max(0, timerState.totalMs - elapsed);
        timerState.remainingMs = remaining;
        const ratio = timerState.totalMs > 0 ? remaining / timerState.totalMs : 0;
        updateTimerBar(ratio);

        if (overlay.classList.contains("open") && currentModuleKey() === "timer") {
          refreshTimerModuleView();
        }

        if (remaining <= 0) finishTimer();
      }, 200);

      refreshTimerModuleView();
    }

    function finishTimer() {
      if (timerState.intervalId) {
        clearInterval(timerState.intervalId);
        timerState.intervalId = null;
      }

      timerState.running = false;
      timerState.remainingMs = 0;
      updateTimerBar(0);
      timerMidBarWrap.classList.remove("show");

      if (overlay.classList.contains("open") && currentModuleKey() === "timer") {
        overlayContent.innerHTML = renderTimerModule();
        bindTimerModule();
      }

      playAlarm();
      showTimerDoneOverlay();
      renderSlots();
    }

    wheelBtn.addEventListener("click", () => {
      if (timerState.running) return;

      if (!timerState.selecting) {
        timerState.selecting = true;
        refreshTimerModuleView();
      } else {
        startTimer();
      }
    });

    wheelBtn.addEventListener("pointerdown", (e) => {
      if (timerState.running) return;
      dragging = true;
      startY = e.clientY;
      wheelBtn.setPointerCapture?.(e.pointerId);
    });

    wheelBtn.addEventListener("pointermove", (e) => {
      if (!dragging || timerState.running) return;
      const dy = e.clientY - startY;
      if (Math.abs(dy) > 26) {
        timerState.selecting = true;
        timerState.presetIndex =
          dy < 0
            ? clampPresetIndex(timerState.presetIndex + 1)
            : clampPresetIndex(timerState.presetIndex - 1);
        saveTimerPreset();
        startY = e.clientY;
        refreshTimerModuleView();
      }
    });

    function endDrag() {
      dragging = false;
    }

    wheelBtn.addEventListener("pointerup", endDrag);
    wheelBtn.addEventListener("pointercancel", endDrag);
  }
    function renderNewsModule() {
    const items = newsState.items.slice(0, NEWS_LIMIT);

    return `
      <div class="newsModule fullModule">
        <div class="newsModuleHeader">
          <div class="fullModuleTitle">Nyheter</div>
          <div class="newsLiveRow">
            <div class="newsLiveDot"></div>
            <div class="newsLiveLabel">Live</div>
            <div class="newsLiveText">${escapeHtml(items[0]?.title || newsState.error || "Laddar nyheter…")}</div>
          </div>
        </div>

        ${items.length ? `
          <div class="newsList">
            ${items.map((item, index) => `
              <article class="newsItem" data-action="open-news-item" data-index="${index}">
                <div class="newsItemThumb">
                  ${item.image ? `<img src="${item.image}" alt="">` : ""}
                </div>
                <div class="newsItemBody">
                  <div class="newsItemTitle">${escapeHtml(item.title)}</div>
                  <div class="newsItemMeta">${escapeHtml(item.source || "Nyhet")}${item.publishedAt ? ` • ${escapeHtml(formatNewsAge(item.publishedAt))}` : ""}</div>
                </div>
              </article>
            `).join("")}
          </div>
        ` : `
          <div class="newsEmpty">${escapeHtml(newsState.error || "Laddar nyheter…")}</div>
        `}
      </div>
    `;
  }

  function bindNewsModule() {
    overlayContent.addEventListener("click", onNewsModuleClick, { once: true });
  }

  function onNewsModuleClick(e) {
    const itemEl = e.target.closest("[data-action='open-news-item']");
    if (!itemEl) {
      bindNewsModule();
      return;
    }

    const index = Number(itemEl.dataset.index);
    const item = newsState.items[index];
    if (item) openArticle(item);

    bindNewsModule();
  }

  function renderMatchesModule() {
    return `
      <div class="matchesModule fullModule">
        <div class="fullModuleHead">
          <div class="fullModuleTitle">Matcher</div>
          <div class="fullModuleText">Upp till 5 kort. Ladda upp SportAdmin-bild så försöker appen läsa av datum, tider, plats, spelare, serie och motstånd automatiskt. Du kan alltid rätta manuellt.</div>
        </div>

        <div class="matchesModuleList">
          ${matchCards.map((card, index) => `
            <section class="matchCardEditor" data-index="${index}">
              <div class="matchCardEditorTop">
                <div class="matchCardEditorCount">Kort ${index + 1}</div>
                <button class="matchDeleteBtn" type="button" data-action="clear-match" data-index="${index}">Ta bort</button>
              </div>

              <button class="matchImageBtn ${card.imageSrc ? "has-image" : "is-empty"}" type="button" data-action="pick-image" data-index="${index}">
                ${
                  card.imageSrc
                    ? `<img class="matchImagePreview" src="${card.imageSrc}" alt="Matchbild ${index + 1}">`
                    : `<div class="matchImageEmpty"><div class="matchImageEmptyIcon">${cameraIconMarkup()}</div><div class="matchImageEmptyText">Lägg till SportAdmin-bild</div></div>`
                }
              </button>

              <div class="matchImageActions">
                <div class="matchImageHint">${
                  card.ocrStatus
                    ? escapeHtml(card.ocrStatus)
                    : card.imageSrc
                      ? "Tryck för att byta bild"
                      : "Ladda upp bild som referens"
                }</div>
                ${card.imageSrc ? `<button class="matchDeleteImageBtn" type="button" data-action="remove-image" data-index="${index}">Ta bort bild</button>` : ""}
              </div>

              <div class="matchFieldsGrid">
                <label class="matchField">
                  <span>Datum</span>
                  <input type="text" data-field="dateText" data-index="${index}" value="${escapeHtml(card.dateText)}" placeholder="Lördag 15 mars">
                </label>

                <label class="matchField">
                  <span>Matchtid</span>
                  <input type="text" data-field="timeText" data-index="${index}" value="${escapeHtml(card.timeText)}" placeholder="12:15–14:15">
                </label>

                <label class="matchField">
                  <span>Spelare</span>
                  <select data-field="player" data-index="${index}" class="matchPlayerSelect ${playerClass(card.player)}">
                    <option value="" ${card.player === "" ? "selected" : ""}>Välj</option>
                    <option value="Milo" ${card.player === "Milo" ? "selected" : ""}>Milo</option>
                    <option value="Alice" ${card.player === "Alice" ? "selected" : ""}>Alice</option>
                  </select>
                </label>

                <label class="matchField">
                  <span>Serie</span>
                  <input type="text" data-field="series" data-index="${index}" value="${escapeHtml(card.series)}" placeholder="2013 B Mellersta">
                </label>

                <label class="matchField">
                  <span>Motstånd</span>
                  <input type="text" data-field="opponent" data-index="${index}" value="${escapeHtml(card.opponent)}" placeholder="Norrtulls SK (B)">
                </label>

                <label class="matchField">
                  <span>Plats</span>
                  <input type="text" data-field="location" data-index="${index}" value="${escapeHtml(card.location)}" placeholder="Värmdö sporthall">
                </label>

                <label class="matchField">
                  <span>Samling</span>
                  <input type="text" data-field="gathering" data-index="${index}" value="${escapeHtml(card.gathering)}" placeholder="11:30">
                </label>
              </div>

              <label class="matchField matchField--note">
                <span>Anteckning</span>
                <textarea data-field="note" data-index="${index}" placeholder="Åk 14, Ted ska med, restid 30 min...">${escapeHtml(card.note)}</textarea>
              </label>

              <input class="matchFileInput" id="matchFileInput_${index}" type="file" accept="image/*" hidden>
            </section>
          `).join("")}
        </div>
      </div>
    `;
  }

  function cleanOcrLines(text) {
    return text
      .split(/\r?\n/)
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean);
  }

  function normalizeTimeString(value) {
    return String(value || "")
      .replace(/\./g, ":")
      .replace(/\s+/g, "")
      .replace(/[^0-9:\-–]/g, "")
      .replace(/(\d{1,2}:\d{2})[-–](\d{1,2}:\d{2})/, "$1–$2");
  }

  function parseSportAdminText(rawText) {
    const lines = cleanOcrLines(rawText);
    const result = {
      dateText: "",
      timeText: "",
      player: "",
      series: "",
      opponent: "",
      location: "",
      gathering: ""
    };

    const lineText = lines.join(" | ");

    const dateLine =
      lines.find((line) => /måndag|tisdag|onsdag|torsdag|fredag|lördag|söndag/i.test(line) && /\d/.test(line)) ||
      lines.find((line) => /mån|tis|ons|tor|fre|lör|sön/i.test(line) && /\d/.test(line));

    if (dateLine) result.dateText = dateLine;

    const gatheringMatch = lineText.match(/samling\s*(\d{1,2}[:.]\d{2})/i);
    if (gatheringMatch) result.gathering = gatheringMatch[1].replace(".", ":");

    const timeRangeMatch = lineText.match(/(\d{1,2}[:.]\d{2})\s*[-–]\s*(\d{1,2}[:.]\d{2})/);
    if (timeRangeMatch) {
      result.timeText = `${timeRangeMatch[1].replace(".", ":")}–${timeRangeMatch[2].replace(".", ":")}`;
    }

    if (/milo/i.test(lineText)) result.player = "Milo";
    if (/alice/i.test(lineText)) result.player = result.player || "Alice";

    const locationLine =
      lines.find((line) => /sporthall|arena|idrottshall|hallen|gymnasium|center|centret|plan/i.test(line)) ||
      lines.find((line, idx) => /plats/i.test(line) && lines[idx + 1]);

    if (locationLine) {
      result.location = /plats/i.test(locationLine)
        ? (lines[lines.indexOf(locationLine) + 1] || "")
        : locationLine;
    }

    const seriesLine =
      lines.find((line) => /\b\d{4}\b/.test(line) && /mellersta|södra|norra|västra|östra|pojkar|flickor|\bA\b|\bB\b|\bC\b/i.test(line)) ||
      lines.find((line) => /pojkar|flickor/i.test(line));

    if (seriesLine) {
      result.series = seriesLine
        .replace(/^pantamera\s*/i, "")
        .replace(/^innebandy\s*/i, "")
        .trim();
    }

    const skipWords =
      /måndag|tisdag|onsdag|torsdag|fredag|lördag|söndag|samling|plats|aktivitet|svara|kallelse|kommentar|närvaro|sportadmin|pojkar|flickor|matchstart|starttid|sluttid|tid:/i;

    const opponentCandidates = lines.filter((line) => {
      if (line.length < 3) return false;
      if (/\d{1,2}[:.]\d{2}/.test(line)) return false;
      if (/sporthall|arena|idrottshall|hallen|gymnasium|center|centret|plan/i.test(line)) return false;
      if (skipWords.test(line)) return false;
      if (/milo|alice/i.test(line)) return false;
      return /[A-Za-zÅÄÖåäö]/.test(line);
    });

    if (opponentCandidates.length) {
      const bestOpponent = opponentCandidates.find((line) => /\([A-Z]\)/.test(line)) || opponentCandidates[0];
      result.opponent = bestOpponent;
    }

    result.dateText = result.dateText.trim();
    result.timeText = normalizeTimeString(result.timeText);
    result.series = result.series.trim();
    result.opponent = result.opponent.trim();
    result.location = result.location.trim();
    result.gathering = normalizeTimeString(result.gathering);

    return result;
  }

  async function extractMatchDataFromImage(dataUrl) {
    if (!window.Tesseract) {
      return {
        dateText: "",
        timeText: "",
        player: "",
        series: "",
        opponent: "",
        location: "",
        gathering: ""
      };
    }

    try {
      const result = await window.Tesseract.recognize(dataUrl, "swe+eng", {
        logger: () => {}
      });
      return parseSportAdminText(result.data.text || "");
    } catch {
      return {
        dateText: "",
        timeText: "",
        player: "",
        series: "",
        opponent: "",
        location: "",
        gathering: ""
      };
    }
  }

  function bindMatchesModule() {
    const root = overlayContent.querySelector(".matchesModule");
    if (!root) return;

    root.querySelectorAll(".matchFileInput").forEach((input) => {
      input.addEventListener("change", async () => {
        const file = input.files?.[0];
        const index = Number(input.id.replace("matchFileInput_", ""));
        if (!file) return;

        matchCards[index].ocrStatus = "Förbereder bild…";
        saveMatchCards();
        overlayContent.innerHTML = renderMatchesModule();
        bindMatchesModule();

        matchCards[index].imageSrc = await fileToDataUrlResized(file, 1800);
        matchCards[index].ocrStatus = "Läser av text…";
        saveMatchCards();
        overlayContent.innerHTML = renderMatchesModule();
        bindMatchesModule();

        const extracted = await extractMatchDataFromImage(matchCards[index].imageSrc);

        matchCards[index].dateText = extracted.dateText || matchCards[index].dateText;
        matchCards[index].timeText = extracted.timeText || matchCards[index].timeText;
        matchCards[index].player = extracted.player || matchCards[index].player;
        matchCards[index].series = extracted.series || matchCards[index].series;
        matchCards[index].opponent = extracted.opponent || matchCards[index].opponent;
        matchCards[index].location = extracted.location || matchCards[index].location;
        matchCards[index].gathering = extracted.gathering || matchCards[index].gathering;
        matchCards[index].ocrStatus = "OCR klar. Kontrollera gärna fälten.";

        saveMatchCards();
        overlayContent.innerHTML = renderMatchesModule();
        bindMatchesModule();
        renderSlots();
      });
    });

    root.addEventListener("click", (e) => {
      const actionEl = e.target.closest("[data-action]");
      if (!actionEl) return;
      const action = actionEl.dataset.action;
      const index = Number(actionEl.dataset.index);

      if (action === "pick-image") {
        const input = $(`matchFileInput_${index}`);
        input?.click();
        return;
      }

      if (action === "remove-image") {
        matchCards[index].imageSrc = "";
        matchCards[index].ocrStatus = "";
        saveMatchCards();
        overlayContent.innerHTML = renderMatchesModule();
        bindMatchesModule();
        renderSlots();
        return;
      }

      if (action === "clear-match") {
        matchCards[index] = makeEmptyMatchCard();
        saveMatchCards();
        overlayContent.innerHTML = renderMatchesModule();
        bindMatchesModule();
        renderSlots();
      }
    });

    root.addEventListener("input", (e) => {
      const fieldEl = e.target.closest("[data-field]");
      if (!fieldEl) return;

      const index = Number(fieldEl.dataset.index);
      const field = fieldEl.dataset.field;
      matchCards[index][field] = fieldEl.value;
      saveMatchCards();
      renderSlots();

      if (field === "player") {
        fieldEl.classList.toggle("is-milo", fieldEl.value === "Milo");
        fieldEl.classList.toggle("is-alice", fieldEl.value === "Alice");
      }
    });

    root.addEventListener("change", (e) => {
      const fieldEl = e.target.closest("[data-field]");
      if (!fieldEl) return;

      const index = Number(fieldEl.dataset.index);
      const field = fieldEl.dataset.field;
      matchCards[index][field] = fieldEl.value;
      saveMatchCards();
      renderSlots();
    });
  }

  function fileToDataUrlResized(file, maxSize = 1800) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const img = new Image();

        img.onload = () => {
          const ratio = Math.min(1, maxSize / Math.max(img.width, img.height));
          const width = Math.round(img.width * ratio);
          const height = Math.round(img.height * ratio);

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          resolve(canvas.toDataURL("image/jpeg", 0.9));
        };

        img.onerror = reject;
        img.src = reader.result;
      };

      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function updateTimerBar(ratio) {
    timerMidBar.style.transform = `scaleX(${Math.max(0, Math.min(1, ratio))})`;
  }

  function formatRemaining(ms) {
    const totalSec = Math.ceil(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;

    if (h > 0) {
      return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }

    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function playAlarm() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();

      o.type = "sine";
      o.frequency.value = 880;
      g.gain.value = 0.0001;

      o.connect(g);
      g.connect(ctx.destination);
      o.start();

      g.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.7);

      setTimeout(() => {
        o.stop();
        ctx.close();
      }, 800);
    } catch {
      if (alarmAudio) {
        try {
          alarmAudio.play();
        } catch {}
      }
    }
  }

  function renderMarketsModule() {
    const selected = marketById(marketState.selectedId);

    if (marketState.view === "chart") {
      return `
        <div class="marketsModule fullModule">
          <div class="marketsChartTop">
            <button class="marketsBackBtn" type="button" data-action="markets-back">← Marknad</button>
            <div class="marketsChartMeta">2m • ${escapeHtml(selected.name)}</div>
          </div>

          <div class="marketsChartShell">
            <div class="marketsChartWidget" id="marketsChartWidget"></div>
          </div>

          <div class="marketsSwitchBar">
            ${MARKET_SYMBOLS.map((item) => `
              <button class="marketsSwitchBtn ${item.id === selected.id ? "is-active" : ""}" type="button" data-action="open-market-chart" data-market-id="${item.id}">${escapeHtml(item.short)}</button>
            `).join("")}
          </div>
        </div>
      `;
    }

    return `
      <div class="marketsModule fullModule">
        <div class="fullModuleHead">
          <div class="fullModuleTitle">Marknad</div>
          <div class="fullModuleText">Översikt först. Tryck på en symbol för att öppna TradingView-chart i helskärm med 2m som default.</div>
        </div>

        <div class="marketsHubTapeShell">
          <div class="marketsHubTape" id="marketsHubTape"></div>
        </div>

        <div class="marketsGrid">
          ${MARKET_SYMBOLS.map((item) => `
            <button class="marketCard ${item.id === selected.id ? "is-active" : ""}" type="button" data-action="open-market-chart" data-market-id="${item.id}">
              <div class="marketCardName">${escapeHtml(item.name)}</div>
              <div class="marketCardSub">TradingView • 2m</div>
            </button>
          `).join("")}
        </div>
      </div>
    `;
  }

  function bindMarketsModule() {
    if (marketState.view === "hub") {
      mountMarketsHubWidget();
    } else {
      const selected = marketById(marketState.selectedId);
      mountMarketsChartWidget(selected.tv);
    }

    overlayContent.addEventListener("click", onMarketsModuleClick, { once: true });
  }

  function onMarketsModuleClick(e) {
    const trigger = e.target.closest("[data-action]");
    if (!trigger) {
      bindMarketsModule();
      return;
    }

    const action = trigger.dataset.action;

    if (action === "markets-back") {
      marketState.view = "hub";
      overlayContent.innerHTML = renderMarketsModule();
      bindMarketsModule();
      return;
    }

    if (action === "open-market-chart") {
      marketState.selectedId = trigger.dataset.marketId || marketState.selectedId;
      marketState.view = "chart";
      overlayContent.innerHTML = renderMarketsModule();
      bindMarketsModule();
      renderSlots();
      return;
    }

    bindMarketsModule();
  }

  function renderCalendarModule() {
    return `
      <div class="calendarModule fullModule">
        <div class="fullModuleHead">
          <div class="fullModuleTitle">Kalender</div>
        </div>
        <div class="calendarModuleFrameWrap">
          <iframe
            class="calendarModuleFrame"
            src="https://calendar.google.com/calendar/embed?src=ZXJpY3Nzb25ib25pbmlAZ21haWwuY29t&mode=AGENDA&ctz=Europe%2FStockholm&hl=sv&bgcolor=%23ffffff&showTitle=0&showTabs=0&showNav=1&showPrint=0&showCalendars=0&showDate=1"
            loading="lazy"
            referrerpolicy="strict-origin-when-cross-origin"
            title="Google Kalender helskärm"
          ></iframe>
        </div>
      </div>
    `;
  }

  function renderPlaceholderModule(text) {
    return `
      <div class="fullModule">
        <div class="fullModuleHead">
          <div class="fullModuleTitle">${escapeHtml(text)}</div>
          <div class="fullModuleText">Redo för nästa modul.</div>
        </div>
      </div>
    `;
  }

  function animateSlotSwitch(groupKey, direction) {
    renderSlots();
    const content = groupKey === "A" ? slotAContent : slotBContent;
    const startOffset = direction === "left" ? 22 : -22;

    content.style.setProperty("--slotX", `${startOffset}px`);
    content.style.setProperty("--slotOpacity", ".88");

    requestAnimationFrame(() => {
      content.style.setProperty("--slotX", "0px");
      content.style.setProperty("--slotOpacity", "1");
    });
  }

  function stepSlot(groupKey, delta, direction) {
    const group = slotGroups[groupKey];
    group.index = (group.index + delta + group.modules.length) % group.modules.length;
    animateSlotSwitch(groupKey, direction);
  }

  function bindSwipe(section, groupKey) {
    let dragging = false;
    let startX = 0;
    let currentX = 0;

    const content = groupKey === "A" ? slotAContent : slotBContent;

    section.addEventListener("pointerdown", (e) => {
      dragging = true;
      startX = e.clientX;
      currentX = e.clientX;
      section.classList.add("is-dragging");
      section.setPointerCapture?.(e.pointerId);
    });

    section.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      currentX = e.clientX;
      const dx = currentX - startX;
      content.style.setProperty("--slotX", `${dx * 0.55}px`);
      content.style.setProperty("--slotOpacity", String(Math.max(0.62, 1 - Math.abs(dx) / 220)));
    });

    function endSwipe() {
      if (!dragging) return;
      const dx = currentX - startX;
      dragging = false;
      section.classList.remove("is-dragging");

      if (dx < -48) stepSlot(groupKey, 1, "left");
      else if (dx > 48) stepSlot(groupKey, -1, "right");
      else {
        content.style.setProperty("--slotX", "0px");
        content.style.setProperty("--slotOpacity", "1");
      }
    }

    section.addEventListener("pointerup", endSwipe);
    section.addEventListener("pointercancel", endSwipe);
    section.addEventListener("pointerleave", endSwipe);

    section.addEventListener(
      "wheel",
      (e) => {
        if (overlay.classList.contains("open") || articleOverlay.classList.contains("open")) return;
        if (Math.abs(e.deltaY) < 12) return;

        e.preventDefault();

        if (e.deltaY > 0) stepSlot(groupKey, 1, "left");
        else stepSlot(groupKey, -1, "right");
      },
      { passive: false }
    );
  }

  slotAButton.addEventListener("click", () => openCurrentModule("A"));
  slotBButton.addEventListener("click", () => openCurrentModule("B"));
  calendarOpenBtn?.addEventListener("click", openCalendarModule);
  closeFab.addEventListener("click", closeModule);
  timerDoneCloseFab.addEventListener("click", hideTimerDoneOverlay);

  articleBackBtn.addEventListener("click", closeArticle);
  articleOpenBtn.addEventListener("click", () => {
    if (currentArticle?.link) {
      window.open(currentArticle.link, "_blank", "noopener,noreferrer");
    }
  });

  bindSwipe(slotASection, "A");
  bindSwipe(slotBSection, "B");

  formatDayDate();
  renderSlots();
  loadWeather();
  loadNews(true);

  setInterval(formatDayDate, 60 * 1000);
  setInterval(() => loadNews(true), NEWS_REFRESH_MS);
})();
