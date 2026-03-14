(() => {
  const $ = (id) => document.getElementById(id);

  const STORAGE_KEYS = {
    tasks: "sbdash_v4_tasks",
    notes: "sbdash_v4_notes",
    timerPreset: "sbdash_v4_timer_preset"
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

  const TIMER_OPTIONS = [
    { label: "1m", seconds: 60 },
    { label: "5m", seconds: 300 },
    { label: "10m", seconds: 600 },
    { label: "15m", seconds: 900 },
    { label: "25m", seconds: 1500 },
    { label: "30m", seconds: 1800 },
    { label: "1h", seconds: 3600 }
  ];

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

  const slotGroups = {
    A: {
      index: 0,
      modules: [
        { key: "weather" },
        { key: "timer" },
        { key: "placeholder", text: "A3" }
      ]
    },
    B: {
      index: 0,
      modules: [
        { key: "tasks" },
        { key: "notes" },
        { key: "placeholder", text: "B3" }
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
    if ([51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99].includes(code)) return "rain";
    if ([0].includes(code)) return "sun";
    return "cloud";
  }

  async function loadWeather() {
    try {
      const url = "https://api.open-meteo.com/v1/forecast?latitude=59.33&longitude=18.07&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code&timezone=Europe%2FStockholm&forecast_days=2";
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

  function currentModuleKey() {
    return overlay.dataset.moduleKey || "";
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

  function renderWeatherPreview() {
    return `
      <div class="weatherPreview">
        <div class="weatherPreviewVisual">
          ${weatherGlyph(weatherState.type)}
        </div>
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
      return `
        <div class="tasksPreview">
          <div class="tasksEmpty">Inga tasks ännu. Tryck för att skapa din första.</div>
        </div>
      `;
    }

    return `
      <div class="tasksPreview">
        <div class="tasksListPreview">
          ${active.map(task => `
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
        <div class="notesPreviewBody ${hasText ? "" : "is-empty"}">${escapeHtml(hasText ? notes : "Tryck för att skriva.")}</div>
      </div>
    `;
  }

  function renderTimerPreview() {
    return `
      <div class="timerPreview">
        <div class="timerPreviewWheel">
          <div class="timerPreviewBlob" aria-hidden="true"></div>
          <div class="timerPreviewCenter">
            <div class="timerPreviewTop">Timer</div>
            <div class="timerPreviewBottom">Tryck för att starta</div>
          </div>
        </div>
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
    return renderPlaceholderPreview(module.text || "—");
  }

  function renderSlots() {
    slotAContent.innerHTML = renderSlot("A");
    slotBContent.innerHTML = renderSlot("B");
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
    } else {
      overlayContent.innerHTML = renderPlaceholderModule(module.text || "Nästa modul");
    }
  }

  function closeModule() {
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
    overlay.dataset.moduleKey = "";
  }

  function showTimerDoneOverlay() {
    timerDoneOverlay.classList.add("open");
    timerDoneOverlay.setAttribute("aria-hidden", "false");
  }

  function hideTimerDoneOverlay() {
    timerDoneOverlay.classList.remove("open");
    timerDoneOverlay.setAttribute("aria-hidden", "true");
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
          ${rows.map(row => `
            <div class="weatherRow">
              <div class="weatherRowTime">${escapeHtml(row.time)}</div>
              <div class="weatherRowMain">${row.type === "sun" ? "Klart" : row.type === "rain" ? "Regn" : "Molnigt"} · Regnrisk ${escapeHtml(row.rain)}</div>
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

        <div class="tasksModuleList" id="tasksModuleList">
          ${renderTasksList()}
        </div>
      </div>
    `;
  }

  function renderTasksList() {
    if (!tasks.length) {
      return `<div class="fullModuleText">Inga tasks ännu.</div>`;
    }

    return tasks.map(task => `
      <div class="taskCard ${task.done ? "is-done" : ""}" data-task-id="${task.id}">
        <div class="taskMainRow">
          <input class="taskCheck" type="checkbox" ${task.done ? "checked" : ""} data-action="toggle-task" data-task-id="${task.id}" />
          <button class="taskTextBtn" type="button" data-action="focus-sub" data-task-id="${task.id}">${escapeHtml(task.text)}</button>
          <button class="taskDeleteBtn" type="button" data-action="delete-task" data-task-id="${task.id}">Ta bort</button>
        </div>

        <div class="subTasks">
          ${(task.subtasks || []).map(sub => `
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

    tasksAddBtn.addEventListener("click", addTask);

    tasksInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addTask();
      }
    });

    tasksModuleList.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;

      const action = btn.dataset.action;
      const taskId = btn.dataset.taskId;
      const task = tasks.find(item => item.id === taskId);
      if (!task) return;

      if (action === "delete-task") {
        tasks = tasks.filter(item => item.id !== taskId);
      }

      if (action === "add-sub") {
        const input = $(`sub_${taskId}`);
        const val = input?.value.trim();
        if (val) {
          task.subtasks = task.subtasks || [];
          task.subtasks.push(val);
        }
      }

      if (action === "focus-sub") {
        const input = $(`sub_${taskId}`);
        input?.focus();
        return;
      }

      saveTasks();
      rerenderTasksModule();
    });

    tasksModuleList.addEventListener("change", (e) => {
      const checkbox = e.target.closest("[data-action='toggle-task']");
      if (!checkbox) return;

      const task = tasks.find(item => item.id === checkbox.dataset.taskId);
      if (!task) return;

      task.done = checkbox.checked;
      saveTasks();
      rerenderTasksModule();
    });
  }

  function renderNotesModule() {
    return `
      <div class="notesModule fullModule">
        <div class="notesHead">
          <div class="notesLabel">Anteckningar</div>
        </div>

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
    const valueText = timerState.running
      ? formatRemaining(timerState.remainingMs)
      : preset.label;

    const bottomText = timerState.running
      ? "Pågår"
      : timerState.selecting
        ? "Svep för att välja · tryck igen för start"
        : "Tryck för att starta";

    return `
      <div class="timerModule">
        <div class="timerWheelWrap">
          <button class="timerWheel" id="timerWheelBtn" type="button" aria-label="Timer">
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
      if (valueEl) {
        valueEl.textContent = timerState.running
          ? formatRemaining(timerState.remainingMs)
          : preset.label;
      }
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

        if (remaining <= 0) {
          finishTimer();
        }
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

        if (dy < 0) {
          timerState.presetIndex = clampPresetIndex(timerState.presetIndex + 1);
        } else {
          timerState.presetIndex = clampPresetIndex(timerState.presetIndex - 1);
        }

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
        try { alarmAudio.play(); } catch {}
      }
    }
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

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function animateSlotSwitch(groupKey, direction) {
    const content = groupKey === "A" ? slotAContent : slotBContent;
    const offset = direction === "left" ? -30 : 30;

    content.style.setProperty("--slotX", `${offset}px`);
    content.style.setProperty("--slotOpacity", ".58");
    content.style.setProperty("--slotScale", ".985");

    requestAnimationFrame(() => {
      renderSlots();
      const newContent = groupKey === "A" ? slotAContent : slotBContent;
      newContent.style.setProperty("--slotX", `${direction === "left" ? 34 : -34}px`);
      newContent.style.setProperty("--slotOpacity", ".58");
      newContent.style.setProperty("--slotScale", ".985");

      requestAnimationFrame(() => {
        newContent.style.setProperty("--slotX", "0px");
        newContent.style.setProperty("--slotOpacity", "1");
        newContent.style.setProperty("--slotScale", "1");
      });
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

      content.style.setProperty("--slotX", `${dx * 0.42}px`);
      content.style.setProperty("--slotOpacity", String(Math.max(0.62, 1 - Math.abs(dx) / 220)));
      content.style.setProperty("--slotScale", String(1 - Math.min(0.02, Math.abs(dx) / 3000)));
    });

    function endSwipe() {
      if (!dragging) return;

      const dx = currentX - startX;
      dragging = false;
      section.classList.remove("is-dragging");

      if (dx < -48) {
        stepSlot(groupKey, 1, "left");
      } else if (dx > 48) {
        stepSlot(groupKey, -1, "right");
      } else {
        content.style.setProperty("--slotX", "0px");
        content.style.setProperty("--slotOpacity", "1");
        content.style.setProperty("--slotScale", "1");
      }
    }

    section.addEventListener("pointerup", endSwipe);
    section.addEventListener("pointercancel", endSwipe);
    section.addEventListener("pointerleave", endSwipe);
  }

  slotAButton.addEventListener("click", () => openCurrentModule("A"));
  slotBButton.addEventListener("click", () => openCurrentModule("B"));

  closeFab.addEventListener("click", closeModule);
  timerDoneCloseFab.addEventListener("click", hideTimerDoneOverlay);

  bindSwipe(slotASection, "A");
  bindSwipe(slotBSection, "B");

  formatDayDate();
  renderSlots();
  loadWeather();

  setInterval(formatDayDate, 60 * 1000);
})();