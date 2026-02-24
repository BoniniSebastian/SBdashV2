/* ===============================
   SB DASH CORE v3
   DEL 1/3 – CORE ENGINE
================================= */

(() => {

const $ = (id) => document.getElementById(id)

/* ===============================
   GLOBAL STATE
================================= */

let rotationDeg = 0
let overlayOpen = null   // "timer" | "fidget" | "dart"
let inertiaVelocity = 0
let inertiaFrame = null
let isDragging = false
let startAngle = 0

/* ===============================
   ELEMENTS
================================= */

const wheel = $("wheel")
const wheelRing = document.querySelector(".wheelRing")
const wheelCenter = $("wheelCenterText")

/* ===============================
   UTIL
================================= */

function clamp(val, min, max){
  return Math.max(min, Math.min(max, val))
}

function getAngle(cx, cy, x, y){
  return Math.atan2(y - cy, x - cx) * (180 / Math.PI)
}

/* ===============================
   INERTIA SPIN ENGINE
================================= */

function stopInertia(){
  if(inertiaFrame){
    cancelAnimationFrame(inertiaFrame)
    inertiaFrame = null
  }
}

function startInertia(){
  stopInertia()

  function frame(){
    rotationDeg += inertiaVelocity
    inertiaVelocity *= 0.95

    if(Math.abs(inertiaVelocity) < 0.05){
      stopInertia()
      return
    }

    applyRotation(rotationDeg)
    inertiaFrame = requestAnimationFrame(frame)
  }

  inertiaFrame = requestAnimationFrame(frame)
}

/* ===============================
   APPLY ROTATION
================================= */

function applyRotation(deg){

  // FIDGET MODE
  if(overlayOpen === "fidget"){
    const delta = deg - rotationDeg
    fidgetSpin(delta)
  }

  // DART MODE
  if(overlayOpen === "dart"){
    dartSpin(deg)
  }

  rotationDeg = deg

  if(wheelRing){
    if (window.__SB_OVERLAY?.onRotate) {   window.__SB_OVERLAY.onRotate(deg); } else {   wheelRing.style.transform = `rotate(${deg}deg)` }
  }
}

/* ===============================
   POINTER EVENTS
================================= */

if(wheel){

wheel.addEventListener("pointerdown", (e)=>{
  stopInertia()
  isDragging = true

  const rect = wheel.getBoundingClientRect()
  const cx = rect.left + rect.width/2
  const cy = rect.top + rect.height/2

  startAngle = getAngle(cx, cy, e.clientX, e.clientY) - rotationDeg
  wheel.setPointerCapture(e.pointerId)
})

wheel.addEventListener("pointermove", (e)=>{
  if(!isDragging) return

  const rect = wheel.getBoundingClientRect()
  const cx = rect.left + rect.width/2
  const cy = rect.top + rect.height/2

  const angle = getAngle(cx, cy, e.clientX, e.clientY)
  const newDeg = angle - startAngle

  inertiaVelocity = newDeg - rotationDeg
  applyRotation(newDeg)
})

wheel.addEventListener("pointerup", ()=>{
  isDragging = false
  startInertia()
})

wheel.addEventListener("pointercancel", ()=>{
  isDragging = false
})

}

/* ===============================
   OVERLAY BASE SYSTEM
================================= */

function openOverlay(name){
  overlayOpen = name
  document.body.classList.add("overlayOpen")
  const el = document.getElementById(name + "Overlay")
  if(el) el.style.display = "block"
}

function closeOverlay(name){
  overlayOpen = null
  document.body.classList.remove("overlayOpen")
  const el = document.getElementById(name + "Overlay")
  if(el) el.style.display = "none"
}

/* ===============================
   BUTTON HOOKS (START PAGE)
================================= */

document.addEventListener("click", (e)=>{

  if(e.target.closest("#btnOpenTimer")){
    openOverlay("timer")
  }

  if(e.target.closest("#btnOpenFidget")){
    openOverlay("fidget")
  }

  if(e.target.closest("#btnOpenDart")){
    openOverlay("dart")
  }

  if(e.target.closest(".overlayClose")){
    const parent = e.target.closest(".overlay")
    if(parent){
      parent.style.display = "none"
      overlayOpen = null
      document.body.classList.remove("overlayOpen")
    }
  }

})

/* ===============================
   PLACEHOLDERS (next parts)
================================= */

function fidgetSpin(){ }
function dartSpin(){ }

})()
/* ===============================
   DEL 2/3 – FIDGET SYSTEM
================================= */

let FIDGET = {
  count: 0,
  lastRotation: 0
}

function fidgetSpin(delta){

  // summera total rotation
  FIDGET.lastRotation += delta

  // varje 360 grader = +1
  const turns = Math.floor(Math.abs(FIDGET.lastRotation) / 360)

  if(turns !== FIDGET.count){
    FIDGET.count = turns
    updateFidgetUI()
  }
}

function updateFidgetUI(){
  const el = document.getElementById("fidgetCount")
  if(el){
    el.textContent = FIDGET.count
  }

  updateOddEven()
}

function resetFidget(){
  FIDGET.count = 0
  FIDGET.lastRotation = 0
  updateFidgetUI()
}

/* ===============================
   ODD / EVEN GAME
================================= */

function updateOddEven(){

  const oddBtn = document.getElementById("btnOdd")
  const evenBtn = document.getElementById("btnEven")

  if(!oddBtn || !evenBtn) return

  const isEven = FIDGET.count % 2 === 0

  oddBtn.classList.remove("win")
  evenBtn.classList.remove("win")

  if(isEven){
    evenBtn.classList.add("win")
  } else {
    oddBtn.classList.add("win")
  }
}

/* ===============================
   FIDGET BUTTON HOOKS
================================= */

document.addEventListener("click", (e)=>{

  if(e.target.closest("#btnFidgetReset")){
    resetFidget()
  }

})
/* ===============================
   DEL 3/3 – OVERLAYS: TIMER + DART
   - Timer overlay med wheel-val 1/5/10/15/20/30
   - Edge progress bar (högerkant)
   - Dart 501 (4 spelare, auto-hoppar)
================================= */

window.__SB_OVERLAY = window.__SB_OVERLAY || { open: null, onRotate: null };

function sbMakeEl(html){
  const d = document.createElement("div");
  d.innerHTML = html.trim();
  return d.firstElementChild;
}

function sbCloseOverlay(){
  const wrap = document.getElementById("sbOverlayWrap");
  if (wrap) wrap.remove();
  window.__SB_OVERLAY.open = null;
  window.__SB_OVERLAY.onRotate = null;
}

/* ---------- Small floating buttons on Start ---------- */
/* (Om du redan har egna knappar/ikoner kan vi ta bort detta senare) */
(function ensureStartButtons(){
  if (document.getElementById("sbStartBtns")) return;

  const host = sbMakeEl(`
    <div id="sbStartBtns" style="
      position:fixed; right:12px; bottom:calc(12px + env(safe-area-inset-bottom));
      display:flex; flex-direction:column; gap:10px; z-index:60;">
      <button id="btnTimerOpen" style="width:54px;height:54px;border-radius:18px;border:1px solid rgba(255,255,255,.14);
        background:rgba(0,0,0,.25);backdrop-filter: blur(10px);-webkit-backdrop-filter: blur(10px);
        color:rgba(255,255,255,.9);font-weight:900;">⏱</button>
      <button id="btnDartOpen" style="width:54px;height:54px;border-radius:18px;border:1px solid rgba(255,255,255,.14);
        background:rgba(0,0,0,.25);backdrop-filter: blur(10px);-webkit-backdrop-filter: blur(10px);
        color:rgba(255,255,255,.9);font-weight:900;">🎯</button>
      <button id="btnFidgetOpen" style="width:54px;height:54px;border-radius:18px;border:1px solid rgba(255,255,255,.14);
        background:rgba(0,0,0,.25);backdrop-filter: blur(10px);-webkit-backdrop-filter: blur(10px);
        color:rgba(255,255,255,.9);font-weight:900;">🌀</button>
    </div>
  `);
  document.body.appendChild(host);

  document.getElementById("btnTimerOpen")?.addEventListener("click", openTimerOverlay);
  document.getElementById("btnDartOpen")?.addEventListener("click", openDartOverlay);
  document.getElementById("btnFidgetOpen")?.addEventListener("click", openFidgetOverlay);
})();

/* ===============================
   TIMER – state + alarm + edge bar
================================= */

const SB_TIMER = {
  options: [1,5,10,15,20,30],
  selIndex: 1, // default 5
  running: false,
  total: 5*60,
  endAt: 0,
  intervalId: 0,
};

function sbBeepFallback(){
  try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type="sine"; o.frequency.value = 880;
    g.gain.value = 0.08;
    o.connect(g); g.connect(ctx.destination);
    o.start();
    setTimeout(()=>{ o.stop(); ctx.close(); }, 900);
  }catch{}
}

function sbAlarm(){
  // Om du har <audio id="alarmAudio"> i HTML kan den användas annars beep
  const audio = document.getElementById("alarmAudio");
  if (audio && audio.querySelector("source")){
    audio.currentTime = 0;
    audio.play().catch(()=>sbBeepFallback());
    return;
  }
  sbBeepFallback();
}

function sbFmtLeft(sec){
  const s = Math.max(0, Math.floor(sec));
  const mm = String(Math.floor(s/60)).padStart(2,"0");
  const ss = String(s%60).padStart(2,"0");
  return `${mm}:${ss}`;
}

function sbStopTimer(){
  SB_TIMER.running = false;
  if (SB_TIMER.intervalId){
    clearInterval(SB_TIMER.intervalId);
    SB_TIMER.intervalId = 0;
  }
  document.body.classList.remove("timerRunning");
  sbSetEdgeBar(0, false);
  const zen = document.getElementById("sbZenPulse");
  if (zen) zen.remove();
}

function sbStartTimerMinutes(min){
  const m = Number(min);
  if (!Number.isFinite(m) || m <= 0) return;

  sbStopTimer();

  SB_TIMER.total = Math.round(m*60);
  SB_TIMER.endAt = Date.now() + SB_TIMER.total*1000;
  SB_TIMER.running = true;

  // Zen pulse (bakom allt)
  if (!document.getElementById("sbZenPulse")){
    const z = sbMakeEl(`<div id="sbZenPulse" style="
      position:fixed; inset:0; z-index:55; pointer-events:none;
      background: radial-gradient(circle at center, rgba(0,209,255,.16), transparent 60%);
      animation: sbZen 1.35s ease-in-out infinite;"></div>`);
    document.body.appendChild(z);

    const st = document.getElementById("sbZenStyle") || sbMakeEl(`<style id="sbZenStyle">
      @keyframes sbZen{ 0%{opacity:.45; transform:scale(1)} 50%{opacity:1; transform:scale(1.02)} 100%{opacity:.45; transform:scale(1)} }
    </style>`);
    if (!document.getElementById("sbZenStyle")) document.head.appendChild(st);
  }

  document.body.classList.add("timerRunning");

  // tick direkt + intervall
  sbTickTimer();
  SB_TIMER.intervalId = setInterval(sbTickTimer, 250);
}

function sbTickTimer(){
  if (!SB_TIMER.running) return;
  const left = Math.max(0, Math.ceil((SB_TIMER.endAt - Date.now())/1000));
  const pct = SB_TIMER.total ? (left / SB_TIMER.total) : 0;

  // UI
  const big = document.getElementById("sbTimerBig");
  if (big) big.textContent = sbFmtLeft(left);

  sbSetEdgeBar(pct, true);

  if (left <= 0){
    sbStopTimer();
    sbAlarm();
  }
}

function sbSetEdgeBar(pct, show){
  let bar = document.getElementById("sbTimerEdge");
  if (!bar){
    bar = sbMakeEl(`<div id="sbTimerEdge" style="
      position:fixed; right:8px; top:calc(8px + env(safe-area-inset-top));
      width:6px; border-radius:999px;
      height: calc(100vh - 16px - env(safe-area-inset-top) - env(safe-area-inset-bottom));
      background: rgba(255,255,255,.08);
      overflow:hidden; z-index:58; display:none;">
      <div id="sbTimerEdgeFill" style="
        position:absolute; right:0; bottom:0; width:100%;
        height:0%;
        background: linear-gradient(180deg, rgba(0,209,255,1), rgba(255,0,180,1), rgba(255,145,0,1));
        box-shadow: 0 0 18px rgba(0,209,255,.35);
      "></div>
    </div>`);
    document.body.appendChild(bar);
  }
  const fill = document.getElementById("sbTimerEdgeFill");
  if (fill) fill.style.height = `${Math.max(0, Math.min(1, pct))*100}%`;
  bar.style.display = show ? "block" : "none";
}

/* ---------- Timer overlay ---------- */
function openTimerOverlay(){
  sbCloseOverlay();
  window.__SB_OVERLAY.open = "timer";

  const selMin = SB_TIMER.options[SB_TIMER.selIndex];

  const wrap = sbMakeEl(`
    <div id="sbOverlayWrap" style="position:fixed; inset:0; z-index:70;">
      <div style="position:absolute; inset:0; background:rgba(0,0,0,.55); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);"></div>
      <div style="position:absolute; left:14px; right:14px; top:calc(14px + env(safe-area-inset-top)); bottom:calc(14px + env(safe-area-inset-bottom));
        border-radius:26px; border:1px solid rgba(255,255,255,.12); background:rgba(10,15,20,.72);
        box-shadow:0 18px 60px rgba(0,0,0,.6); overflow:hidden;">
        <div style="display:flex; align-items:center; justify-content:space-between; padding:14px 14px; border-bottom:1px solid rgba(255,255,255,.08);">
          <div style="font-weight:950; letter-spacing:.14em; text-transform:uppercase; font-size:12px; opacity:.9;">Timer</div>
          <button id="sbOverlayClose" style="width:40px;height:40px;border-radius:14px;border:1px solid rgba(255,255,255,.14); background:rgba(0,0,0,.25); color:rgba(255,255,255,.9);">✕</button>
        </div>

        <div style="height:calc(100% - 70px); display:flex; flex-direction:column; justify-content:center; align-items:center; gap:14px; padding:14px;">
          <div style="opacity:.8; font-weight:900; letter-spacing:.18em; text-transform:uppercase; font-size:11px;">Vrid hjulet</div>
          <div id="sbTimerPick" style="font-size:56px; font-weight:950; letter-spacing:.06em;">${selMin} min</div>

          <button id="sbTimerStartBtn" style="
            margin-top:10px; width:min(260px, 80%); padding:14px 16px;
            border-radius:18px; border:1px solid rgba(255,255,255,.14);
            background: rgba(0,209,255,.14);
            color: rgba(255,255,255,.95); font-weight:950; letter-spacing:.08em; text-transform:uppercase;">
            Start
          </button>

          <div id="sbTimerBig" style="margin-top:8px; font-size:28px; font-weight:900; opacity:.85;">${sbFmtLeft(SB_TIMER.running ? Math.ceil((SB_TIMER.endAt-Date.now())/1000) : SB_TIMER.total)}</div>

          <button id="sbTimerResetBtn" style="
            margin-top:6px; width:min(260px, 80%); padding:12px 16px;
            border-radius:18px; border:1px solid rgba(255,255,255,.14);
            background: rgba(255,70,70,.14);
            color: rgba(255,255,255,.95); font-weight:950; letter-spacing:.08em; text-transform:uppercase;">
            Reset
          </button>
        </div>
      </div>
    </div>
  `);

  document.body.appendChild(wrap);

  wrap.querySelector("#sbOverlayClose")?.addEventListener("click", sbCloseOverlay);
  wrap.querySelector("#sbTimerStartBtn")?.addEventListener("click", ()=>{
    const m = SB_TIMER.options[SB_TIMER.selIndex];
    sbStartTimerMinutes(m);
    sbTickTimer();
  });
  wrap.querySelector("#sbTimerResetBtn")?.addEventListener("click", ()=>{
    sbStopTimer();
    // visa 0 progress
    sbSetEdgeBar(0, false);
    const big = document.getElementById("sbTimerBig");
    if (big) big.textContent = sbFmtLeft(SB_TIMER.total);
  });

  // Wheel mapping
  window.__SB_OVERLAY.onRotate = (deg)=>{
    const raw = ((deg % 360) + 360) % 360;
    const idx = Math.round((raw/360) * (SB_TIMER.options.length-1));
    SB_TIMER.selIndex = Math.max(0, Math.min(SB_TIMER.options.length-1, idx));
    const pick = document.getElementById("sbTimerPick");
    if (pick) pick.textContent = `${SB_TIMER.options[SB_TIMER.selIndex]} min`;
  };
}

/* ===============================
   FIDGET overlay (räknare + udda/jämn)
================================= */

function openFidgetOverlay(){
  sbCloseOverlay();
  window.__SB_OVERLAY.open = "fidget";

  const wrap = sbMakeEl(`
    <div id="sbOverlayWrap" style="position:fixed; inset:0; z-index:70;">
      <div style="position:absolute; inset:0; background:rgba(0,0,0,.55); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);"></div>
      <div style="position:absolute; left:14px; right:14px; top:calc(14px + env(safe-area-inset-top)); bottom:calc(14px + env(safe-area-inset-bottom));
        border-radius:26px; border:1px solid rgba(255,255,255,.12); background:rgba(10,15,20,.72);
        box-shadow:0 18px 60px rgba(0,0,0,.6); overflow:hidden;">
        <div style="display:flex; align-items:center; justify-content:space-between; padding:14px 14px; border-bottom:1px solid rgba(255,255,255,.08);">
          <div style="font-weight:950; letter-spacing:.14em; text-transform:uppercase; font-size:12px; opacity:.9;">Fidget</div>
          <button id="sbOverlayClose" style="width:40px;height:40px;border-radius:14px;border:1px solid rgba(255,255,255,.14); background:rgba(0,0,0,.25); color:rgba(255,255,255,.9);">✕</button>
        </div>

        <div style="height:calc(100% - 70px); display:flex; flex-direction:column; justify-content:center; align-items:center; gap:14px; padding:14px;">
          <div id="fidgetCount" style="font-size:82px; font-weight:950; letter-spacing:.04em;">${(window.FIDGET?.count ?? 0)}</div>

          <div style="display:flex; gap:10px;">
            <button id="btnOdd" style="width:120px; padding:12px 12px; border-radius:0px; border:1px solid rgba(255,255,255,.14);
              background:rgba(0,0,0,.22); color:rgba(255,255,255,.9); font-weight:950; letter-spacing:.10em; text-transform:uppercase;">Udda</button>
            <button id="btnEven" style="width:120px; padding:12px 12px; border-radius:0px; border:1px solid rgba(255,255,255,.14);
              background:rgba(0,0,0,.22); color:rgba(255,255,255,.9); font-weight:950; letter-spacing:.10em; text-transform:uppercase;">Jämn</button>
          </div>

          <button id="btnFidgetReset" style="margin-top:4px; width:min(260px, 80%); padding:12px 16px;
            border-radius:18px; border:1px solid rgba(255,255,255,.14);
            background: rgba(255,70,70,.14);
            color: rgba(255,255,255,.95); font-weight:950; letter-spacing:.08em; text-transform:uppercase;">Reset</button>

          <div style="opacity:.7; font-size:12px; text-align:center; max-width:320px;">
            Vrid hjulet för att räkna varv. Udda/Jämn markeras automatiskt.
          </div>
        </div>
      </div>

      <style>
        #btnOdd.win, #btnEven.win{
          box-shadow: 0 0 22px rgba(0,209,255,.45);
          border-color: rgba(0,209,255,.55);
        }
      </style>
    </div>
  `);

  document.body.appendChild(wrap);
  wrap.querySelector("#sbOverlayClose")?.addEventListener("click", sbCloseOverlay);

  // init markering
  if (typeof updateOddEven === "function") updateOddEven();

  // wheel hook: räkna varv baserat på delta
  window.__SB_OVERLAY.onRotate = (deg)=>{
    // delta i grader (hantera wrap)
    const prev = (window.__SB_OVERLAY._lastDeg ?? deg);
    let delta = deg - prev;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    window.__SB_OVERLAY._lastDeg = deg;

    if (typeof fidgetSpin === "function") fidgetSpin(delta);
  };
}

/* ===============================
   DART 501 overlay
================================= */

const DART = {
  selected: 0,
  players: [
    { name:"Spelare 1", left:501, last:0, input:0, history:[] },
    { name:"Spelare 2", left:501, last:0, input:0, history:[] },
    { name:"Spelare 3", left:501, last:0, input:0, history:[] },
    { name:"Spelare 4", left:501, last:0, input:0, history:[] },
  ],
  stableT: 0,
  lastWheelVal: null,
};

function dartClamp(x){ return Math.max(0, Math.min(180, Math.round(x))); }

function dartDraw(){
  const root = document.getElementById("dartPlayers");
  if (!root) return;
  root.innerHTML = "";

  DART.players.forEach((p, i)=>{
    const card = sbMakeEl(`
      <div data-i="${i}" style="
        border-radius:0px;
        border:1px solid rgba(255,255,255,.12);
        background: rgba(0,0,0,.22);
        padding:12px;
        position:relative;
        overflow:hidden;
        box-shadow: ${i===DART.selected ? "0 0 24px rgba(0,209,255,.20)" : "none"};
        border-color: ${i===DART.selected ? "rgba(0,209,255,.45)" : "rgba(255,255,255,.12)"};
      ">
        <div style="font-weight:950; letter-spacing:.10em; text-transform:uppercase; font-size:11px; opacity:.8;">${p.name}</div>
        <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:8px;">
          <div style="font-size:36px; font-weight:950;">${p.left}</div>
          <div style="text-align:right;">
            <div style="font-size:12px; opacity:.7;">Senaste poängen</div>
            <div style="font-size:16px; font-weight:900;">${p.last || 0}</div>
          </div>
        </div>

        <div style="margin-top:10px; padding:10px 10px; border-radius:0px; border:1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04); font-weight:950; letter-spacing:.06em;">
          <span style="opacity:.7; font-size:12px;">Omgång:</span>
          <span id="dartInputVal_${i}" style="font-size:22px; margin-left:8px;">${p.input}</span>
        </div>

        ${i===DART.selected ? `<div style="position:absolute; inset:0; pointer-events:none; border:2px solid rgba(0,209,255,.35);"></div>` : ``}
      </div>
    `);
    card.addEventListener("click", ()=>{ DART.selected = i; dartDraw(); });
    root.appendChild(card);
  });
}

function dartCommit(){
  const p = DART.players[DART.selected];
  const v = dartClamp(p.input);

  if (v <= 0) return; // inget commit på 0

  const nextLeft = p.left - v;

  // enkel bust-regel: om under 0, ignorera (vi kan bygga riktig dart-regel senare)
  if (nextLeft < 0) return;

  p.left = nextLeft;
  p.last = v;
  p.history.push(v);

  // auto-hoppa till nästa spelare
  DART.selected = (DART.selected + 1) % DART.players.length;

  dartDraw();
}

function openDartOverlay(){
  sbCloseOverlay();
  window.__SB_OVERLAY.open = "dart";

  const wrap = sbMakeEl(`
    <div id="sbOverlayWrap" style="position:fixed; inset:0; z-index:70;">
      <div style="position:absolute; inset:0; background:rgba(0,0,0,.55); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);"></div>
      <div style="position:absolute; left:14px; right:14px; top:calc(14px + env(safe-area-inset-top)); bottom:calc(14px + env(safe-area-inset-bottom));
        border-radius:26px; border:1px solid rgba(255,255,255,.12); background:rgba(10,15,20,.72);
        box-shadow:0 18px 60px rgba(0,0,0,.6); overflow:hidden;">
        <div style="display:flex; align-items:center; justify-content:space-between; padding:14px 14px; border-bottom:1px solid rgba(255,255,255,.08);">
          <div style="font-weight:950; letter-spacing:.14em; text-transform:uppercase; font-size:12px; opacity:.9;">501</div>
          <button id="sbOverlayClose" style="width:40px;height:40px;border-radius:14px;border:1px solid rgba(255,255,255,.14); background:rgba(0,0,0,.25); color:rgba(255,255,255,.9);">✕</button>
        </div>

        <div style="padding:14px; height:calc(100% - 70px); overflow:auto; -webkit-overflow-scrolling:touch;">
          <div style="opacity:.75; font-size:12px; margin-bottom:10px;">
            Vrid hjulet för att ställa omgång (0–180). Auto-commit när du stannar.
          </div>

          <div id="dartPlayers" style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;"></div>

          <div style="margin-top:12px; display:flex; gap:10px;">
            <button id="dartResetAll" style="flex:1; padding:12px 12px; border-radius:18px; border:1px solid rgba(255,255,255,.14);
              background: rgba(255,70,70,.14); color:rgba(255,255,255,.95); font-weight:950; letter-spacing:.08em; text-transform:uppercase;">
              Reset
            </button>
            <button id="dartCommitBtn" style="flex:1; padding:12px 12px; border-radius:18px; border:1px solid rgba(255,255,255,.14);
              background: rgba(0,209,255,.14); color:rgba(255,255,255,.95); font-weight:950; letter-spacing:.08em; text-transform:uppercase;">
              Commit
            </button>
          </div>
        </div>
      </div>
    </div>
  `);

  document.body.appendChild(wrap);

  wrap.querySelector("#sbOverlayClose")?.addEventListener("click", sbCloseOverlay);
  wrap.querySelector("#dartCommitBtn")?.addEventListener("click", dartCommit);

  wrap.querySelector("#dartResetAll")?.addEventListener("click", ()=>{
    DART.players.forEach(p=>{ p.left=501; p.last=0; p.input=0; p.history=[]; });
    DART.selected = 0;
    dartDraw();
  });

  dartDraw();

  // wheel hook (0–180), auto-commit när man slutar vrida
  window.__SB_OVERLAY.onRotate = (deg)=>{
    const raw = ((deg % 360) + 360) % 360;
    const val = dartClamp((raw/360)*180);

    const p = DART.players[DART.selected];
    p.input = val;

    const el = document.getElementById("dartInputVal_" + DART.selected);
    if (el) el.textContent = String(val);

    // auto-commit när stabil i ~650ms
    DART.lastWheelVal = val;
    const stamp = Date.now();
    DART.stableT = stamp;

    setTimeout(()=>{
      if (DART.stableT !== stamp) return;
      // commit bara om något faktiskt valts
      if (DART.lastWheelVal != null && DART.lastWheelVal > 0) dartCommit();
    }, 650);
  };
}

/* ===============================
   HOOK: stoppa overlay på ESC (desktop)
================================= */
document.addEventListener("keydown", (e)=>{
  if (e.key === "Escape") sbCloseOverlay();
});