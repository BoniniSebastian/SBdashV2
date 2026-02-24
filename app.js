/* ===============================
   SB DASH v2 – LATEST
   - Inertia wheel
   - Snap to sectors
   - Dart indicator (active sector)
   - Fidget spin (double tap / key)
   - Optional overlay hook: window.__SB_OVERLAY.onRotate(...)
================================= */

(() => {
  const $ = (id) => document.getElementById(id);

  /* =========================
     ELEMENTS (safe lookup)
  ========================= */
  const wheel = $("wheel");
  const wheelRing = document.querySelector(".wheelRing");
  const wheelCenterText = $("wheelCenterText");

  const sheetWrap = $("sheetWrap");
  const sheetTitle = $("sheetTitle");
  const sheetContent = $("sheetContent");

  // Optional UI helpers
  const dart = $("dart");                 // can be a triangle div or text label
  const previewTitle = $("previewTitle"); // optional
  const previewBody  = $("previewBody");  // optional

  if (!wheel || !wheelRing) {
    console.warn("[SB DASH] Missing #wheel or .wheelRing");
    return;
  }

  /* =========================
     VIEW CONFIG
  ========================= */
  const VIEW_DEFS = [
    { id: "weather", label: "Weather", icon: "☀️" },
    { id: "news",    label: "News",    icon: "📰" },
    { id: "todo",    label: "TODO",    icon: "✅" },
    { id: "ideas",   label: "Ideas",   icon: "💡" },
    { id: "done",    label: "Done",    icon: "📦" }
  ];

  const SECTOR_SIZE = 360 / VIEW_DEFS.length;

  /* =========================
     STATE
  ========================= */
  let currentRotation = 0;   // degrees
  let currentIndex = 0;

  // Drag/inertia
  let isDragging = false;
  let startY = 0;
  let startRotation = 0;

  let lastMoveT = 0;
  let lastMoveY = 0;

  let velocity = 0;          // deg/ms
  let rafId = null;

  // Tuning
  const DRAG_SENSITIVITY = 0.55;  // px -> deg multiplier (feel)
  const FRICTION = 0.985;         // inertia decay per frame
  const STOP_VELOCITY = 0.0025;   // when to stop inertia
  const SNAP_SPEED = 0.22;        // snap easing (0..1)

  // Fidget
  let lastTapT = 0;
  let fidgetEnabled = true;

  /* =========================
     UTILS
  ========================= */
  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
  function normDeg(deg) {
    // 0..360
    return ((deg % 360) + 360) % 360;
  }
  function nearestIndexFromDeg(deg) {
    const n = normDeg(deg);
    return (Math.round(n / SECTOR_SIZE) % VIEW_DEFS.length + VIEW_DEFS.length) % VIEW_DEFS.length;
  }
  function snappedDegFromIndex(i) {
    return i * SECTOR_SIZE;
  }
  function haptic(ms = 10) {
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch {}
  }

  /* =========================
     OVERLAY HOOK (optional)
  ========================= */
  function callOverlay(deg, idx) {
    const overlay = window.__SB_OVERLAY;
    if (!overlay || typeof overlay.onRotate !== "function") return;
    try { overlay.onRotate({ deg, index: idx, view: VIEW_DEFS[idx] }); } catch {}
  }

  /* =========================
     CORE ROTATION
  ========================= */
  function applyRotation(deg, opts = {}) {
    currentRotation = deg;
    wheelRing.style.transform = `rotate(${deg}deg)`;

    const idx = nearestIndexFromDeg(deg);
    if (idx !== currentIndex) {
      currentIndex = idx;
      updateView();
    } else if (opts.force) {
      updateView();
    }

    // Dart indicator (optional)
    if (dart) {
      // If it's a triangle marker element, you typically keep it fixed.
      // We just update a label/data attribute so CSS can react if you want.
      dart.dataset.view = VIEW_DEFS[currentIndex].id;
      dart.setAttribute("aria-label", VIEW_DEFS[currentIndex].label);
      // If #dart is text-based:
      if (dart.childNodes.length === 0 || dart.tagName === "SPAN" || dart.tagName === "DIV") {
        // Don't overwrite if you use a custom SVG inside; comment out if needed.
        if (!dart.querySelector("svg") && !dart.querySelector("img")) {
          dart.textContent = VIEW_DEFS[currentIndex].label;
        }
      }
    }

    callOverlay(deg, currentIndex);
  }

  /* =========================
     SNAP (eased)
  ========================= */
  function snapToNearest() {
    const targetIdx = nearestIndexFromDeg(currentRotation);
    const targetDeg = snappedDegFromIndex(targetIdx);

    // choose the closest equivalent angle to avoid big jumps
    let cur = currentRotation;
    let t = targetDeg;

    // Bring target close to current by adding/subtracting 360
    while (t - cur > 180) t -= 360;
    while (t - cur < -180) t += 360;

    cancelInertia();

    const start = cur;
    const delta = t - start;

    let p = 0;
    const step = () => {
      p = clamp(p + SNAP_SPEED, 0, 1);
      // Smoothstep-ish easing
      const eased = p * p * (3 - 2 * p);
      applyRotation(start + delta * eased, { force: true });

      if (p < 1) rafId = requestAnimationFrame(step);
      else rafId = null;
    };

    rafId = requestAnimationFrame(step);
  }

  /* =========================
     INERTIA LOOP
  ========================= */
  function cancelInertia() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  function startInertia() {
    cancelInertia();

    const tick = () => {
      // apply velocity
      currentRotation += velocity * 16; // assume ~16ms frame
      applyRotation(currentRotation);

      // friction
      velocity *= FRICTION;

      if (Math.abs(velocity) < STOP_VELOCITY) {
        velocity = 0;
        rafId = null;
        snapToNearest();
        return;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
  }

  /* =========================
     POINTER CONTROL
  ========================= */
  wheel.addEventListener("pointerdown", (e) => {
    isDragging = true;
    startY = e.clientY;
    startRotation = currentRotation;

    lastMoveT = performance.now();
    lastMoveY = e.clientY;
    velocity = 0;

    cancelInertia();
    wheel.setPointerCapture(e.pointerId);
  });

  wheel.addEventListener("pointermove", (e) => {
    if (!isDragging) return;

    const y = e.clientY;
    const deltaPx = y - startY;
    const degDelta = deltaPx * DRAG_SENSITIVITY;

    applyRotation(startRotation + degDelta);

    // velocity estimate
    const now = performance.now();
    const dt = Math.max(1, now - lastMoveT);
    const dy = y - lastMoveY;

    // px/ms -> deg/ms
    velocity = (dy * DRAG_SENSITIVITY) / dt;

    lastMoveT = now;
    lastMoveY = y;
  });

  wheel.addEventListener("pointerup", () => {
    if (!isDragging) return;
    isDragging = false;

    // If velocity is tiny -> snap directly
    if (Math.abs(velocity) < STOP_VELOCITY * 3) {
      velocity = 0;
      snapToNearest();
      return;
    }

    startInertia();
  });

  wheel.addEventListener("pointercancel", () => {
    isDragging = false;
    velocity = 0;
    snapToNearest();
  });

  /* =========================
     FIDGET (double tap)
     - Double tap on wheel to spin
  ========================= */
  wheel.addEventListener("click", () => {
    const now = Date.now();
    const dt = now - lastTapT;
    lastTapT = now;

    if (!fidgetEnabled) return;

    if (dt < 280) {
      // double tap -> fidget spin
      fidgetSpin();
    }
  });

  function fidgetSpin() {
    cancelInertia();
    haptic(15);

    // Random impulse (deg/ms), direction random
    const dir = Math.random() < 0.5 ? -1 : 1;
    const strength = 0.06 + Math.random() * 0.08; // 0.06..0.14 deg/ms feel-good range
    velocity = dir * strength;

    // Add a small extra "kick" so it feels like a fidget
    currentRotation += dir * (10 + Math.random() * 20);
    applyRotation(currentRotation);

    startInertia();
  }

  // Optional: keyboard helper on desktop
  window.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "f") fidgetSpin();
    if (e.key.toLowerCase() === "g") { fidgetEnabled = !fidgetEnabled; }
  });

  /* =========================
     VIEW RENDERING
  ========================= */
  function updateView() {
    const view = VIEW_DEFS[currentIndex];

    if (wheelCenterText) wheelCenterText.textContent = view.icon;
    if (sheetTitle) sheetTitle.textContent = view.label;

    // Optional preview panel (if you use it)
    if (previewTitle) previewTitle.textContent = view.label;
    if (previewBody)  previewBody.textContent = "";

    renderContent(view.id);
  }

  function renderContent(viewId) {
    if (!sheetContent) return;

    switch (viewId) {
      case "weather":
        sheetContent.innerHTML = `<div class="panel"><h3>Weather</h3><p>(placeholder)</p></div>`;
        break;

      case "news":
        sheetContent.innerHTML = `<div class="panel"><h3>News</h3><p>(placeholder)</p></div>`;
        break;

      case "todo":
        sheetContent.innerHTML = `<div class="panel"><h3>TODO</h3><p>(placeholder)</p></div>`;
        break;

      case "ideas":
        sheetContent.innerHTML = `<div class="panel"><h3>Ideas</h3><p>(placeholder)</p></div>`;
        break;

      case "done":
        sheetContent.innerHTML = `<div class="panel"><h3>Done</h3><p>(placeholder)</p></div>`;
        break;

      default:
        sheetContent.innerHTML = `<div class="panel"><h3>Unknown</h3></div>`;
    }
  }

  /* =========================
     INIT
  ========================= */
  applyRotation(0, { force: true });
  updateView();

})();
