/* ===============================
   SB DASH v2 – INITIAL CORE
   Wheel engine + basic views
================================= */

(() => {

  const $ = (id) => document.getElementById(id);

  /* =========================
     ELEMENTS
  ========================= */

  const wheel = $("wheel");
  const wheelRing = document.querySelector(".wheelRing");
  const wheelCenterText = $("wheelCenterText");

  const sheetWrap = $("sheetWrap");
  const sheetTitle = $("sheetTitle");
  const sheetContent = $("sheetContent");

  /* =========================
     VIEW CONFIG
  ========================= */

  const VIEW_DEFS = [
    { id: "weather", label: "Weather", icon: "☀️" },
    { id: "news", label: "News", icon: "📰" },
    { id: "todo", label: "Todo", icon: "✔️" },
    { id: "ideas", label: "Ideas", icon: "💡" },
    { id: "done", label: "Done", icon: "📦" }
  ];

  const SECTOR_SIZE = 360 / VIEW_DEFS.length;

  let currentRotation = 0;
  let currentIndex = 0;

  /* =========================
     ROTATION ENGINE
  ========================= */

  function applyRotation(deg) {
    currentRotation = deg;
    wheelRing.style.transform = `rotate(${deg}deg)`;

    const normalized = ((deg % 360) + 360) % 360;
    const index = Math.round(normalized / SECTOR_SIZE) % VIEW_DEFS.length;

    if (index !== currentIndex) {
      currentIndex = index;
      updateView();
    }
  }

  function snapToNearest() {
    const normalized = ((currentRotation % 360) + 360) % 360;
    const snappedIndex = Math.round(normalized / SECTOR_SIZE);
    const snappedDeg = snappedIndex * SECTOR_SIZE;
    applyRotation(snappedDeg);
  }

  /* =========================
     POINTER CONTROL
  ========================= */

  let isDragging = false;
  let startY = 0;
  let startRotation = 0;

  wheel.addEventListener("pointerdown", (e) => {
    isDragging = true;
    startY = e.clientY;
    startRotation = currentRotation;
    wheel.setPointerCapture(e.pointerId);
  });

  wheel.addEventListener("pointermove", (e) => {
    if (!isDragging) return;

    const delta = e.clientY - startY;
    applyRotation(startRotation + delta);
  });

  wheel.addEventListener("pointerup", () => {
    isDragging = false;
    snapToNearest();
  });

  /* =========================
     VIEW RENDERING
  ========================= */

  function updateView() {
    const view = VIEW_DEFS[currentIndex];

    wheelCenterText.textContent = view.icon;
    sheetTitle.textContent = view.label;

    renderContent(view.id);
  }

  function renderContent(viewId) {
    switch (viewId) {
      case "weather":
        sheetContent.innerHTML = `<p>Weather content</p>`;
        break;

      case "news":
        sheetContent.innerHTML = `<p>News content</p>`;
        break;

      case "todo":
        sheetContent.innerHTML = `<p>Todo list</p>`;
        break;

      case "ideas":
        sheetContent.innerHTML = `<p>Ideas board</p>`;
        break;

      case "done":
        sheetContent.innerHTML = `<p>Completed items</p>`;
        break;

      default:
        sheetContent.innerHTML = `<p>Unknown view</p>`;
    }
  }

  /* =========================
     INIT
  ========================= */

  applyRotation(0);
  updateView();

})();
