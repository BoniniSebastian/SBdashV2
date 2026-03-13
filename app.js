(() => {
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
