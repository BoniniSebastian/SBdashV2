(() => {
  const $ = (id) => document.getElementById(id);

  const STORAGE_KEYS = {
    tasks: "sbdash_v3_tasks",
    freeText: "sbdash_v3_freetext"
  };

  const dayDateEl = $("dayDate");
  const slotAContent = $("slotAContent");
  const slotBContent = $("slotBContent");
  const slotAButton = $("slotAButton");
  const slotBButton = $("slotBButton");
  const slotALeft = $("slotALeft");
  const slotARight = $("slotARight");
  const slotBLeft = $("slotBLeft");
  const slotBRight = $("slotBRight");
  const slotASection = $("slotASection");
  const slotBSection = $("slotBSection");

  const overlay = $("moduleOverlay");
  const overlayContent = $("overlayContent");
  const closeFab = $("closeFab");

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

  let freeText = localStorage.getItem(STORAGE_KEYS.freeText) || "";

  const slotGroups = {
    A: {
      index: 0,
      modules: [
        { key: "weather", name: "A1", title: "Väder" },
        { key: "placeholder", name: "A2", title: "A2" },
        { key: "placeholder", name: "A3", title: "A3" }
      ]
    },
    B: {
      index: 0,
      modules: [
        { key: "tasks", name: "B1", title: "Tasks" },
        { key: "freeText", name: "B2", title: "Fritext" },
        { key: "placeholder", name: "B3", title: "B3" }
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

  function saveFreeText() {
    localStorage.setItem(STORAGE_KEYS.freeText, freeText);
  }

  function formatDayDate() {
    const now = new Date();
    const fmt = new Intl.DateTimeFormat("sv-SE", {
      weekday: "long",
      day: "numeric",
      month: "long"
    }).format(now);

    const parts = fmt.split(" ");
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

      const labels = {
        sun: "Klart",
        cloud: "Molnigt",
        rain: "Regn"
      };

      const type = weatherTypeFromCode(current.weather_code);
      const nowHour = new Date().getHours();
      const hourlyRows = [];

      for (let i = 0; i < times.length && hourlyRows.length < 8; i += 1) {
        const dt = new Date(times[i]);
        if (dt.getDate() !== new Date().getDate() || dt.getHours() < nowHour) continue;
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
    } catch (error) {
      weatherState = {
        temp: "--°",
        status: "Kunde inte ladda väder",
        meta: "Kontrollera anslutning",
        type: "cloud",
        hourly: []
      };
    }

    renderSlots();
    if (overlay.dataset.moduleKey === "weather") {
      openModule("A");
    }
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
          <div class="moduleTitle">${slotGroups.A.modules[slotGroups.A.index].name} · Väder</div>
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
          <div class="moduleTitle">${slotGroups.B.modules[slotGroups.B.index].name} · Tasks</div>
          <div class="tasksEmpty">Inga tasks ännu. Tryck för att skapa din första.</div>
        </div>
      `;
    }

    return `
      <div class="tasksPreview">
        <div class="moduleTitle">${slotGroups.B.modules[slotGroups.B.index].name} · Tasks</div>
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

  function renderFreeTextPreview() {
    const hasText = freeText.trim().length > 0;
    return `
      <div class="freeTextPreview">
        <div class="moduleTitle">${slotGroups.B.modules[slotGroups.B.index].name} · Fritext</div>
        <div class="freeTextPreviewBody ${hasText ? "" : "is-empty"}">${escapeHtml(hasText ? freeText : "Tryck för att skriva fritt.")}</div>
      </div>
    `;
  }

  function renderPlaceholderPreview(module) {
    return `
      <div class="placeholderPreview">
        <div class="moduleTitle">${module.name}</div>
        <div class="placeholderTitle">${escapeHtml(module.title)}</div>
        <div class="placeholderBody">Den här sloten är redo för nästa modul när du vill lägga till den.</div>
      </div>
    `;
  }

  function renderSlot(groupKey) {
    const group = slotGroups[groupKey];
    const module = group.modules[group.index];

    if (groupKey === "A") {
      if (module.key === "weather") return renderWeatherPreview();
      return renderPlaceholderPreview(module);
    }

    if (module.key === "tasks") return renderTasksPreview();
    if (module.key === "freeText") return renderFreeTextPreview();
    return renderPlaceholderPreview(module);
  }

  function renderSlots() {
    slotAContent.innerHTML = renderSlot("A");
    slotBContent.innerHTML = renderSlot("B");
  }

  function openModule(groupKey) {
    const module = slotGroups[groupKey].modules[slotGroups[groupKey].index];
    overlay.dataset.moduleKey = module.key;
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");

    if (module.key === "weather") {
      overlayContent.innerHTML = renderWeatherModule();
    } else if (module.key === "tasks") {
      overlayContent.innerHTML = renderTasksModule();
      bindTasksModule();
    } else if (module.key === "freeText") {
      overlayContent.innerHTML = renderFreeTextModule();
      bindFreeTextModule();
    } else {
      overlayContent.innerHTML = renderPlaceholderModule(module);
    }
  }

  function closeModule() {
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
    overlay.dataset.moduleKey = "";
  }

  function renderWeatherModule() {
    return `
      <div class="fullModule">
        <div class="fullModuleHead">
          <div class="fullModuleLabel">A1 · Väder</div>
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
          ${(weatherState.hourly.length ? weatherState.hourly : [{ time: "Nu", temp: weatherState.temp, rain: "0%", type: weatherState.type }]).map(row => `
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
          <div class="fullModuleLabel">B1 · Tasks</div>
          <div class="fullModuleTitle">Tasks</div>
          <div class="fullModuleText">Skapa uppgifter, lägg till delmål och håll vyn ren.</div>
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

    function addTask() {
      const text = tasksInput.value.trim();
      if (!text) return;
      tasks.unshift({ id: uid(), text, done: false, subtasks: [] });
      tasksInput.value = "";
      saveTasks();
      renderSlots();
      overlayContent.innerHTML = renderTasksModule();
      bindTasksModule();
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
      const task = tasks.find((item) => item.id === taskId);
      if (!task) return;

      if (action === "delete-task") {
        tasks = tasks.filter((item) => item.id !== taskId);
      }

      if (action === "add-sub") {
        const input = $("sub_" + taskId);
        const val = input?.value.trim();
        if (val) {
          task.subtasks = task.subtasks || [];
          task.subtasks.push(val);
        }
      }

      if (action === "focus-sub") {
        const input = $("sub_" + taskId);
        input?.focus();
        return;
      }

      saveTasks();
      renderSlots();
      overlayContent.innerHTML = renderTasksModule();
      bindTasksModule();
    });

    tasksModuleList.addEventListener("change", (e) => {
      const checkbox = e.target.closest("[data-action='toggle-task']");
      if (!checkbox) return;
      const task = tasks.find((item) => item.id === checkbox.dataset.taskId);
      if (!task) return;
      task.done = checkbox.checked;
      saveTasks();
      renderSlots();
      overlayContent.innerHTML = renderTasksModule();
      bindTasksModule();
    });
  }

  function renderFreeTextModule() {
    return `
      <div class="freeTextModule fullModule">
        <div class="fullModuleHead">
          <div class="fullModuleLabel">B2 · Fritext</div>
          <div class="fullModuleTitle">Fritext</div>
        </div>
        <div class="freeTextBox">
          <textarea class="freeTextInput" id="freeTextInput" placeholder="Skriv fritt...">${escapeHtml(freeText)}</textarea>
        </div>
      </div>
    `;
  }

  function bindFreeTextModule() {
    const input = $("freeTextInput");
    if (!input) return;
    input.addEventListener("input", () => {
      freeText = input.value;
      saveFreeText();
      renderSlots();
    });
  }

  function renderPlaceholderModule(module) {
    return `
      <div class="fullModule">
        <div class="fullModuleHead">
          <div class="fullModuleLabel">${escapeHtml(module.name)}</div>
          <div class="fullModuleTitle">${escapeHtml(module.title)}</div>
          <div class="fullModuleText">Den här sloten är redo. Det blir inte jobbigt att lägga till fler slotar och moduler senare, eftersom allt nu bygger på samma A/B-struktur och samma render-logik.</div>
        </div>
      </div>
    `;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function stepSlot(groupKey, delta, direction) {
    const group = slotGroups[groupKey];
    group.index = (group.index + delta + group.modules.length) % group.modules.length;
    const section = groupKey === "A" ? slotASection : slotBSection;
    const content = groupKey === "A" ? slotAContent : slotBContent;

    content.style.setProperty("--slotX", direction === "left" ? "34px" : "-34px");
    content.style.setProperty("--slotOpacity", ".5");

    requestAnimationFrame(() => {
      renderSlots();
      const newContent = groupKey === "A" ? slotAContent : slotBContent;
      section.classList.remove("swipe-left", "swipe-right");
      section.classList.add(direction === "left" ? "swipe-left" : "swipe-right");
      newContent.style.setProperty("--slotX", "0px");
      newContent.style.setProperty("--slotOpacity", "1");
      setTimeout(() => section.classList.remove("swipe-left", "swipe-right"), 180);
    });
  }

  function bindSwipe(section, groupKey) {
    let startX = 0;
    let currentX = 0;
    let active = false;

    section.addEventListener("pointerdown", (e) => {
      active = true;
      startX = e.clientX;
      currentX = e.clientX;
      section.classList.add("is-swiping");
    });

    section.addEventListener("pointermove", (e) => {
      if (!active) return;
      currentX = e.clientX;
      const dx = currentX - startX;
      if (Math.abs(dx) > 8) {
        section.classList.toggle("swipe-right", dx > 0);
        section.classList.toggle("swipe-left", dx < 0);
      }
    });

    const end = () => {
      if (!active) return;
      const dx = currentX - startX;
      active = false;
      section.classList.remove("is-swiping");
      if (dx < -44) stepSlot(groupKey, 1, "left");
      else if (dx > 44) stepSlot(groupKey, -1, "right");
      else section.classList.remove("swipe-left", "swipe-right");
    };

    section.addEventListener("pointerup", end);
    section.addEventListener("pointercancel", end);
    section.addEventListener("pointerleave", end);
  }

  slotAButton.addEventListener("click", () => openModule("A"));
  slotBButton.addEventListener("click", () => openModule("B"));
  slotALeft.addEventListener("click", (e) => { e.stopPropagation(); stepSlot("A", -1, "right"); });
  slotARight.addEventListener("click", (e) => { e.stopPropagation(); stepSlot("A", 1, "left"); });
  slotBLeft.addEventListener("click", (e) => { e.stopPropagation(); stepSlot("B", -1, "right"); });
  slotBRight.addEventListener("click", (e) => { e.stopPropagation(); stepSlot("B", 1, "left"); });
  closeFab.addEventListener("click", closeModule);

  bindSwipe(slotASection, "A");
  bindSwipe(slotBSection, "B");
  formatDayDate();
  renderSlots();
  loadWeather();
  setInterval(formatDayDate, 60 * 1000);
})();
