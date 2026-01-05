const STORAGE_KEYS = {
  plan: "plan",
  entries: "entries",
  checkins: "checkins",
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const TRACK_TOLERANCE_GRAMS = 120;

const state = {
  plan: null,
  entries: [],
  checkins: [],
};

const dom = {
  screens: document.querySelectorAll(".screen"),
  navButtons: document.querySelectorAll(".nav-btn"),
  setupCard: document.getElementById("setupCard"),
  actionHeadline: document.getElementById("actionHeadline"),
  actionDetail: document.getElementById("actionDetail"),
  actionPill: document.getElementById("actionPill"),
  heroCard: document.getElementById("heroCard"),
  currentWeight: document.getElementById("currentWeight"),
  currentWeightDate: document.getElementById("currentWeightDate"),
  expectedToday: document.getElementById("expectedToday"),
  differenceGrams: document.getElementById("differenceGrams"),
  statusPill: document.getElementById("statusPill"),
  statusText: document.getElementById("statusText"),
  dailyChange: document.getElementById("dailyChange"),
  expectedDaily: document.getElementById("expectedDaily"),
  entryForm: document.getElementById("entryForm"),
  entryDate: document.getElementById("entryDate"),
  entryWeight: document.getElementById("entryWeight"),
  entryFieldset: document.getElementById("entryFieldset"),
  saveFeedback: document.getElementById("saveFeedback"),
  intakeForm: document.getElementById("intakeForm"),
  intakeDate: document.getElementById("intakeDate"),
  intakeFieldset: document.getElementById("intakeFieldset"),
  intakeMorningWeight: document.getElementById("morningWeight"),
  intakeCurrentWeight: document.getElementById("intakeCurrentWeight"),
  intakeHeadline: document.getElementById("intakeHeadline"),
  intakeDetail: document.getElementById("intakeDetail"),
  intakePill: document.getElementById("intakePill"),
  intakeFeedback: document.getElementById("intakeFeedback"),
  planForms: document.querySelectorAll("[data-plan-form]"),
  progressPercent: document.getElementById("progressPercent"),
  progressLabel: document.getElementById("progressLabel"),
  progressCircle: document.getElementById("progressCircle"),
  startWeightStat: document.getElementById("startWeightStat"),
  currentWeightStat: document.getElementById("currentWeightStat"),
  targetWeightStat: document.getElementById("targetWeightStat"),
  streakValue: document.getElementById("streakValue"),
  heatmapGrid: document.getElementById("heatmapGrid"),
  timelineList: document.getElementById("timelineList"),
  resetBtn: document.getElementById("resetBtn"),
};

let ringCircumference = 0;

document.addEventListener("DOMContentLoaded", () => {
  state.plan = loadPlan();
  state.entries = normalizeEntries(loadEntries());
  state.checkins = normalizeCheckins(loadCheckins());

  initRing();
  initNav();
  initForms();
  initDefaults();
  renderAll();
  registerServiceWorker();
});

function initRing() {
  if (!dom.progressCircle) return;
  const radius = dom.progressCircle.r.baseVal.value;
  ringCircumference = 2 * Math.PI * radius;
  dom.progressCircle.style.strokeDasharray = `${ringCircumference} ${ringCircumference}`;
  dom.progressCircle.style.strokeDashoffset = `${ringCircumference}`;
}

function initNav() {
  dom.navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveTab(button.dataset.tab);
    });
  });
}

function initForms() {
  dom.planForms.forEach((form) => {
    form.addEventListener("submit", handlePlanSubmit);
  });
  initPlanModeControls();

  if (dom.entryForm) {
    dom.entryForm.addEventListener("submit", handleEntrySubmit);
  }

  if (dom.intakeForm) {
    dom.intakeForm.addEventListener("submit", handleCheckinSubmit);
  }
  if (dom.intakeDate) {
    dom.intakeDate.addEventListener("change", handleCheckinDateChange);
  }
  if (dom.intakeMorningWeight) {
    dom.intakeMorningWeight.addEventListener("input", renderCheckinSummary);
  }
  if (dom.intakeCurrentWeight) {
    dom.intakeCurrentWeight.addEventListener("input", renderCheckinSummary);
  }

  if (dom.resetBtn) {
    dom.resetBtn.addEventListener("click", handleReset);
  }
}

function initPlanModeControls() {
  dom.planForms.forEach((form) => {
    const buttons = form.querySelectorAll(".toggle-btn");
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        setPlanMode(form, button.dataset.mode);
      });
    });
    const initialMode = form.elements.planMode?.value || "duration";
    setPlanMode(form, initialMode);
  });
}

function setPlanMode(form, mode) {
  const planMode = mode === "daily" ? "daily" : "duration";
  if (form.elements.planMode) {
    form.elements.planMode.value = planMode;
  }

  const durationField = form.querySelector(".field-duration");
  const dailyField = form.querySelector(".field-daily");
  if (durationField) {
    durationField.classList.toggle("is-hidden", planMode !== "duration");
  }
  if (dailyField) {
    dailyField.classList.toggle("is-hidden", planMode !== "daily");
  }

  if (form.elements.durationDays) {
    form.elements.durationDays.required = planMode === "duration";
  }
  if (form.elements.dailyChangeKg) {
    form.elements.dailyChangeKg.required = planMode === "daily";
  }

  const buttons = form.querySelectorAll(".toggle-btn");
  buttons.forEach((button) => {
    const isActive = button.dataset.mode === planMode;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function initDefaults() {
  const todayISO = toISODate(new Date());
  if (dom.entryDate && !dom.entryDate.value) {
    dom.entryDate.value = todayISO;
  }
  if (dom.intakeDate && !dom.intakeDate.value) {
    dom.intakeDate.value = todayISO;
  }

  if (!state.plan) {
    dom.planForms.forEach((form) => {
      if (!form.elements.startDate.value) {
        form.elements.startDate.value = todayISO;
      }
    });
  } else {
    syncPlanForms(state.plan);
  }

  if (dom.intakeDate) {
    loadCheckinIntoForm(dom.intakeDate.value);
  }
}

function renderAll() {
  const hasPlan = Boolean(state.plan);
  dom.setupCard.style.display = hasPlan ? "none" : "block";
  dom.entryFieldset.disabled = !hasPlan;
  if (dom.intakeFieldset) {
    dom.intakeFieldset.disabled = !hasPlan;
  }
  if (!hasPlan) {
    dom.saveFeedback.textContent = "Set a plan to unlock logging.";
    dom.saveFeedback.classList.remove("error");
  }
  renderDashboard();
  renderStats();
}

function renderDashboard() {
  const plan = state.plan;
  const entries = state.entries;
  const todayISO = toISODate(new Date());
  const latestEntry = entries.length ? entries[entries.length - 1] : null;
  const currentWeight = latestEntry ? latestEntry.actualWeightKg : null;
  const expectedToday = plan ? expectedWeightForDate(plan, todayISO) : null;

  dom.currentWeight.textContent = currentWeight !== null ? `${formatKg(currentWeight)} kg` : "--";
  dom.currentWeightDate.textContent = latestEntry
    ? `Latest entry ${latestEntry.dateISO}`
    : "No entries yet";
  dom.expectedToday.textContent = expectedToday !== null ? formatKg(expectedToday) : "--";

  const deviationGrams =
    currentWeight !== null && expectedToday !== null
      ? Math.round((currentWeight - expectedToday) * 1000)
      : null;

  const displayDifferenceGrams =
    deviationGrams !== null && plan ? toPlanSignedGrams(plan, deviationGrams) : deviationGrams;

  dom.differenceGrams.textContent =
    displayDifferenceGrams !== null ? formatGramsSigned(displayDifferenceGrams) : "--";

  const status = buildStatus(plan, deviationGrams, currentWeight);
  dom.statusText.textContent = status.text;
  dom.statusPill.textContent = status.pill;
  updatePillTone(dom.statusPill, status.tone);

  renderActionCard(plan, entries, expectedToday);

  const todayEntry = entries.find((entry) => entry.dateISO === todayISO) || null;
  const yesterdayEntry = entries.find((entry) => entry.dateISO === shiftDateISO(todayISO, -1)) || null;
  const dailyChangeGrams =
    todayEntry && yesterdayEntry
      ? Math.round((todayEntry.actualWeightKg - yesterdayEntry.actualWeightKg) * 1000)
      : null;

  dom.dailyChange.textContent = dailyChangeGrams !== null ? formatGramsSigned(dailyChangeGrams) : "--";

  if (plan) {
    const expectedDailyChangeKg = getExpectedDailyChangeKg(plan);
    dom.expectedDaily.textContent = Number.isFinite(expectedDailyChangeKg)
      ? formatGramsSigned(Math.round(-expectedDailyChangeKg * 1000))
      : "--";
  } else {
    dom.expectedDaily.textContent = "--";
  }

  renderCheckinSummary();
}

function renderActionCard(plan, entries, expectedToday) {
  if (!dom.actionHeadline || !dom.actionDetail || !dom.actionPill) return;

  if (!plan) {
    dom.actionHeadline.textContent = "Set your plan";
    dom.actionDetail.textContent = "Enter a plan to get daily guidance.";
    dom.actionPill.textContent = "Guidance";
    updatePillTone(dom.actionPill, "neutral");
    return;
  }

  const todayISO = toISODate(new Date());
  const todayEntry = entries.find((entry) => entry.dateISO === todayISO) || null;
  const yesterdayEntry = entries.find((entry) => entry.dateISO === shiftDateISO(todayISO, -1)) || null;
  const expectedDailyChangeKg = getExpectedDailyChangeKg(plan);
  let targetDeltaKg = null;

  if (yesterdayEntry && expectedToday !== null) {
    targetDeltaKg = expectedToday - yesterdayEntry.actualWeightKg;
  } else if (Number.isFinite(expectedDailyChangeKg)) {
    targetDeltaKg = -expectedDailyChangeKg;
  }

  if (!Number.isFinite(targetDeltaKg)) {
    dom.actionHeadline.textContent = "Log yesterday";
    dom.actionDetail.textContent = "Add an entry to personalize today's target.";
    dom.actionPill.textContent = "Guidance";
    updatePillTone(dom.actionPill, "neutral");
    return;
  }

  dom.actionHeadline.textContent = formatActionDelta(targetDeltaKg);
  if (expectedToday !== null) {
    const targetDeltaText = Number.isFinite(targetDeltaKg)
      ? `${formatGramsSigned(Math.round(targetDeltaKg * 1000))} vs yesterday`
      : "";
    dom.actionDetail.textContent = todayEntry
      ? `Expected today: ${formatKg(expectedToday)} kg. Logged: ${formatKg(todayEntry.actualWeightKg)} kg.`
      : `Aim for ${formatKg(expectedToday)} kg today${targetDeltaText ? ` (${targetDeltaText})` : ""}.`;
  } else {
    dom.actionDetail.textContent = "Stay consistent with your plan pace.";
  }

  dom.actionPill.textContent = todayEntry ? "Logged today" : "Daily target";
  const tone = Math.abs(targetDeltaKg * 1000) <= TRACK_TOLERANCE_GRAMS ? "neutral" : "positive";
  updatePillTone(dom.actionPill, tone);
}

function formatActionDelta(deltaKg) {
  if (!Number.isFinite(deltaKg)) return "Hold steady today";
  const grams = Math.round(deltaKg * 1000);
  if (grams === 0) {
    return "Hold steady today";
  }
  const absGrams = Math.abs(grams);
  const unit =
    absGrams >= 1000 ? `${(absGrams / 1000).toFixed(1)} kg` : `${absGrams} g`;
  const verb = grams < 0 ? "Lose" : "Gain";
  return `${verb} ${unit} today`;
}

function renderStats() {
  const plan = state.plan;
  const entries = state.entries;
  const latestEntry = entries.length ? entries[entries.length - 1] : null;
  const currentWeight = latestEntry ? latestEntry.actualWeightKg : null;

  if (!plan) {
    dom.progressPercent.textContent = "--";
    dom.progressLabel.textContent = "Set a plan";
    dom.startWeightStat.textContent = "--";
    dom.currentWeightStat.textContent = "--";
    dom.targetWeightStat.textContent = "--";
    dom.streakValue.textContent = "0 days";
    setRingProgress(0);
    renderHeatmap([], null);
    renderTimeline([], null);
    return;
  }

  const progress = computeProgress(plan, currentWeight);
  const percent = Math.round(progress * 100);
  dom.progressPercent.textContent = currentWeight !== null ? `${percent}%` : "--";
  dom.progressLabel.textContent = "To target";
  dom.startWeightStat.textContent = `${formatKg(plan.startWeightKg)} kg`;
  dom.currentWeightStat.textContent = currentWeight !== null ? `${formatKg(currentWeight)} kg` : "--";
  dom.targetWeightStat.textContent = `${formatKg(plan.targetWeightKg)} kg`;
  dom.streakValue.textContent = `${computeStreak(entries)} days`;
  setRingProgress(progress);
  renderHeatmap(entries, plan);
  renderTimeline(entries.slice(-14), plan);
}

function renderHeatmap(entries, plan) {
  if (!dom.heatmapGrid) return;
  dom.heatmapGrid.innerHTML = "";

  if (!plan) {
    dom.heatmapGrid.innerHTML = '<p class="empty-state">Set a plan to view consistency.</p>';
    return;
  }
  if (!plan.startDate) {
    dom.heatmapGrid.innerHTML = '<p class="empty-state">Add a start date to view consistency.</p>';
    return;
  }

  const todayISO = toISODate(new Date());
  const totalDays = Math.max(1, Math.ceil(getPlanLengthDays(plan)));
  if (!Number.isFinite(totalDays) || totalDays <= 0) {
    dom.heatmapGrid.innerHTML = '<p class="empty-state">Plan starts soon.</p>';
    return;
  }

  const entryMap = new Map(entries.map((entry) => [entry.dateISO, entry]));

  for (let i = 0; i < totalDays; i += 1) {
    const dateISO = shiftDateISO(plan.startDate, i);
    const entry = entryMap.get(dateISO);
    const cell = document.createElement("div");
    cell.className = "heat-cell";

    if (dateISO > todayISO) {
      cell.classList.add("future");
      cell.title = `${dateISO}: upcoming`;
    } else if (!entry) {
      cell.classList.add("off");
      cell.title = `${dateISO}: missing entry`;
    } else {
      const expected = expectedWeightForDate(plan, dateISO);
      const deviation = Math.round((entry.actualWeightKg - expected) * 1000);
      const isLossPlan = plan.targetWeightKg < plan.startWeightKg;
      const ahead = isLossPlan ? deviation < 0 : deviation > 0;
      const onTrack = ahead || Math.abs(deviation) <= TRACK_TOLERANCE_GRAMS;
      cell.classList.add(onTrack ? "on" : "off");
      const statusLabel = ahead ? "Ahead" : onTrack ? "On track" : "Off track";
      cell.title = `${dateISO}: ${statusLabel} (${formatGramsSigned(deviation)})`;
    }

    dom.heatmapGrid.appendChild(cell);
  }
}

function renderTimeline(entries, plan) {
  dom.timelineList.innerHTML = "";
  if (!plan) {
    dom.timelineList.innerHTML = '<p class="empty-state">Set a plan to view the timeline.</p>';
    return;
  }
  if (!entries.length) {
    dom.timelineList.innerHTML = '<p class="empty-state">No entries yet.</p>';
    return;
  }

  const sorted = [...entries].sort((a, b) => b.dateISO.localeCompare(a.dateISO));
  sorted.forEach((entry) => {
    const expected = expectedWeightForDate(plan, entry.dateISO);
    const deviation = Math.round((entry.actualWeightKg - expected) * 1000);
    const item = document.createElement("div");
    item.className = "timeline-item";
    const isLossPlan = plan.targetWeightKg < plan.startWeightKg;
    const behind = isLossPlan ? deviation > 0 : deviation < 0;
    const deviationClass = behind ? "negative" : "";

    item.innerHTML = `
      <div>
        <div class="timeline-date">${entry.dateISO}</div>
        <div class="timeline-sub">Expected ${formatKg(expected)} kg</div>
      </div>
      <div class="timeline-values">
        <div class="timeline-actual">${formatKg(entry.actualWeightKg)} kg</div>
        <div class="timeline-deviation ${deviationClass}">${formatGramsSigned(deviation)}</div>
      </div>
    `;
    dom.timelineList.appendChild(item);
  });
}

function handlePlanSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const note = form.querySelector("[data-plan-note]");
  const plan = buildPlanFromForm(form);
  const validationMessage = validatePlan(plan);
  if (validationMessage) {
    setFormNote(note, validationMessage, true);
    return;
  }

  state.plan = plan;
  savePlan(plan);
  syncPlanForms(plan);
  setFormNote(note, "Plan saved.", false);
  setFormNote(dom.saveFeedback, "", false);
  renderAll();
}

function handleEntrySubmit(event) {
  event.preventDefault();
  if (!state.plan) {
    setFormNote(dom.saveFeedback, "Set a plan before logging entries.", true);
    return;
  }

  const dateISO = dom.entryDate.value;
  const weight = Number(dom.entryWeight.value);
  if (!dateISO || !Number.isFinite(weight) || weight <= 0) {
    setFormNote(dom.saveFeedback, "Enter a valid date and weight.", true);
    return;
  }

  const entry = {
    dateISO,
    actualWeightKg: weight,
  };

  state.entries = upsertEntry(state.entries, entry);
  saveEntries(state.entries);
  setFormNote(dom.saveFeedback, "Entry saved.", false);
  renderAll();
}

function handleCheckinSubmit(event) {
  event.preventDefault();
  if (!state.plan) {
    setFormNote(dom.intakeFeedback, "Set a plan before logging weigh-ins.", true);
    return;
  }

  const dateISO = dom.intakeDate.value;
  const morningWeightKg = Number(dom.intakeMorningWeight.value);
  const currentWeightKg = dom.intakeCurrentWeight.value
    ? Number(dom.intakeCurrentWeight.value)
    : null;

  if (!dateISO || !Number.isFinite(morningWeightKg) || morningWeightKg <= 0) {
    setFormNote(dom.intakeFeedback, "Enter a valid date and morning weight.", true);
    return;
  }
  if (currentWeightKg !== null && (!Number.isFinite(currentWeightKg) || currentWeightKg <= 0)) {
    setFormNote(dom.intakeFeedback, "Enter a valid current weight.", true);
    return;
  }

  const checkin = {
    dateISO,
    morningWeightKg,
    currentWeightKg,
  };

  state.checkins = upsertCheckin(state.checkins, checkin);
  saveCheckins(state.checkins);
  setFormNote(dom.intakeFeedback, "Weigh-ins saved.", false);
  renderCheckinSummary();
}

function handleCheckinDateChange() {
  if (!dom.intakeDate) return;
  loadCheckinIntoForm(dom.intakeDate.value);
  renderCheckinSummary();
}

function handleReset() {
  const confirmed = window.confirm("Reset all local data? This cannot be undone.");
  if (!confirmed) return;
  localStorage.removeItem(STORAGE_KEYS.plan);
  localStorage.removeItem(STORAGE_KEYS.entries);
  localStorage.removeItem(STORAGE_KEYS.checkins);
  state.plan = null;
  state.entries = [];
  state.checkins = [];
  syncPlanForms(null);
  renderAll();
}

function loadCheckinIntoForm(dateISO) {
  if (!dom.intakeDate) return;
  const checkin = state.checkins.find((item) => item.dateISO === dateISO);
  if (!checkin) {
    dom.intakeMorningWeight.value = "";
    dom.intakeCurrentWeight.value = "";
    return;
  }
  dom.intakeMorningWeight.value = formatInputNumber(checkin.morningWeightKg, 1);
  dom.intakeCurrentWeight.value =
    checkin.currentWeightKg !== null ? formatInputNumber(checkin.currentWeightKg, 1) : "";
}

function renderCheckinSummary() {
  if (!dom.intakeHeadline || !dom.intakeDetail || !dom.intakePill) return;
  const plan = state.plan;

  if (!plan) {
    dom.intakeHeadline.textContent = "Set a plan first";
    dom.intakeDetail.textContent = "Your plan defines the daily target.";
    dom.intakePill.textContent = "Plan";
    updatePillTone(dom.intakePill, "neutral");
    return;
  }

  const morningWeightKg = Number(dom.intakeMorningWeight?.value);
  const currentWeightKg = Number(dom.intakeCurrentWeight?.value);
  const hasMorning = Number.isFinite(morningWeightKg) && morningWeightKg > 0;
  const hasCurrent = Number.isFinite(currentWeightKg) && currentWeightKg > 0;

  if (!hasMorning) {
    dom.intakeHeadline.textContent = "Log your morning weight";
    dom.intakeDetail.textContent = "Add the first weigh-in to start the calculation.";
    dom.intakePill.textContent = "Morning";
    updatePillTone(dom.intakePill, "neutral");
    return;
  }

  if (!hasCurrent) {
    dom.intakeHeadline.textContent = "Log your current weight";
    dom.intakeDetail.textContent = "We will compare it with your morning weight.";
    dom.intakePill.textContent = "Current";
    updatePillTone(dom.intakePill, "neutral");
    return;
  }

  const expectedDailyChangeKg = getExpectedDailyChangeKg(plan);
  if (!Number.isFinite(expectedDailyChangeKg)) {
    dom.intakeHeadline.textContent = "Plan data missing";
    dom.intakeDetail.textContent = "Update your plan to calculate the daily target.";
    dom.intakePill.textContent = "Plan";
    updatePillTone(dom.intakePill, "neutral");
    return;
  }

  const targetGrams = Math.round(Math.abs(expectedDailyChangeKg * 1000));
  const actualDeltaGrams = Math.round((currentWeightKg - morningWeightKg) * 1000);
  const remainingGrams = targetGrams - actualDeltaGrams;
  const absRemaining = Math.abs(remainingGrams);
  const remainingText = `${absRemaining}g`;

  if (remainingGrams === 0) {
    dom.intakeHeadline.textContent = "You are on target today";
    updatePillTone(dom.intakePill, "positive");
  } else if (remainingGrams > 0) {
    dom.intakeHeadline.textContent = `You can eat ${remainingText} more`;
    updatePillTone(dom.intakePill, "positive");
  } else {
    dom.intakeHeadline.textContent = `You should eat ${remainingText} less`;
    updatePillTone(dom.intakePill, "negative");
  }

  dom.intakePill.textContent = "Today";
  dom.intakeDetail.textContent = `Change since morning: ${formatGramsSigned(
    actualDeltaGrams
  )} (target loss ${targetGrams}g).`;
}

function setActiveTab(tab) {
  dom.screens.forEach((screen) => {
    screen.classList.toggle("active", screen.dataset.screen === tab);
  });

  dom.navButtons.forEach((button) => {
    const isActive = button.dataset.tab === tab;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function buildStatus(plan, deviationGrams, currentWeight) {
  if (!plan) {
    return { text: "Set your plan", pill: "Set a plan", tone: "neutral" };
  }
  if (currentWeight === null || deviationGrams === null) {
    return { text: "Log your first entry", pill: "No entry yet", tone: "neutral" };
  }

  const absGrams = Math.abs(deviationGrams);
  if (absGrams <= 20) {
    return { text: "On track", pill: "On track", tone: "neutral" };
  }

  const isLossPlan = plan.targetWeightKg < plan.startWeightKg;
  const ahead = isLossPlan ? deviationGrams < 0 : deviationGrams > 0;
  const label = ahead ? "Ahead" : "Behind";
  const tone = ahead ? "positive" : "negative";
  const text = `${label} by ${absGrams}g`;

  return { text, pill: text, tone };
}

function toPlanSignedGrams(plan, deviationGrams) {
  if (!plan || !Number.isFinite(deviationGrams)) return deviationGrams;
  const isLossPlan = plan.targetWeightKg < plan.startWeightKg;
  const ahead = isLossPlan ? deviationGrams < 0 : deviationGrams > 0;
  const absGrams = Math.abs(deviationGrams);
  return ahead ? absGrams : -absGrams;
}

function updatePillTone(pill, tone) {
  pill.classList.remove("positive", "negative", "neutral");
  if (tone) {
    pill.classList.add(tone);
  }
}

function computeProgress(plan, currentWeight) {
  if (currentWeight === null) return 0;
  const denominator = plan.startWeightKg - plan.targetWeightKg;
  if (denominator === 0) return 1;
  const progress = (plan.startWeightKg - currentWeight) / denominator;
  return clamp(progress, 0, 1);
}

function setRingProgress(progress) {
  if (!dom.progressCircle) return;
  const offset = ringCircumference - progress * ringCircumference;
  dom.progressCircle.style.strokeDashoffset = `${offset}`;
}

function computeStreak(entries) {
  if (!entries.length) return 0;
  const sorted = [...entries].sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  let streak = 1;
  for (let i = sorted.length - 1; i > 0; i -= 1) {
    const current = sorted[i];
    const previous = sorted[i - 1];
    const diff = daysBetween(previous.dateISO, current.dateISO);
    if (diff === 1) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

function getExpectedDailyChangeKg(plan) {
  if (!plan) return null;
  if (Number.isFinite(plan.dailyChangeKg)) return plan.dailyChangeKg;
  if (Number.isFinite(plan.durationDays) && plan.durationDays !== 0) {
    return (plan.startWeightKg - plan.targetWeightKg) / plan.durationDays;
  }
  return null;
}

function getPlanLengthDays(plan) {
  if (!plan) return 0;
  if (Number.isFinite(plan.durationDays) && plan.durationDays !== 0) {
    return Math.abs(plan.durationDays);
  }
  const dailyChangeKg = getExpectedDailyChangeKg(plan);
  if (!Number.isFinite(dailyChangeKg) || dailyChangeKg === 0) return 0;
  const totalChangeKg = plan.startWeightKg - plan.targetWeightKg;
  return Math.abs(totalChangeKg / dailyChangeKg);
}

function expectedWeightForDate(plan, dateISO) {
  const expectedDailyChangeKg = getExpectedDailyChangeKg(plan);
  if (!Number.isFinite(expectedDailyChangeKg)) return plan.startWeightKg;
  const dayIndex = getDayIndex(plan.startDate, dateISO);
  return plan.startWeightKg - (dayIndex - 1) * expectedDailyChangeKg;
}

// Use UTC to avoid DST off-by-one in date math.
function getDayIndex(startISO, dateISO) {
  const diffDays = daysBetween(startISO, dateISO);
  const rawDay = diffDays + 1;
  return rawDay;
}

function daysBetween(startISO, endISO) {
  const start = parseISOToUTC(startISO);
  const end = parseISOToUTC(endISO);
  return Math.floor((end - start) / MS_PER_DAY);
}

function shiftDateISO(dateISO, deltaDays) {
  const date = parseISOToUTC(dateISO);
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return toISODateUTC(date);
}

function parseISOToUTC(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toISODateUTC(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatKg(value) {
  if (!Number.isFinite(value)) return "--";
  return value.toFixed(1);
}

function formatInputNumber(value, decimals) {
  if (!Number.isFinite(value)) return "";
  const factor = Math.pow(10, decimals);
  const rounded = Math.round(value * factor) / factor;
  return String(rounded);
}

function formatGramsSigned(value) {
  if (!Number.isFinite(value)) return "--";
  const rounded = Math.round(value);
  if (rounded === 0) return "0g";
  const sign = rounded > 0 ? "+" : "-";
  return `${sign}${Math.abs(rounded)}g`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeEntries(entries) {
  return entries
    .filter(
      (entry) =>
        entry &&
        entry.dateISO &&
        Number.isFinite(entry.actualWeightKg) &&
        entry.actualWeightKg > 0
    )
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO));
}

function upsertEntry(entries, entry) {
  const updated = [...entries];
  const index = updated.findIndex((item) => item.dateISO === entry.dateISO);
  if (index >= 0) {
    updated[index] = entry;
  } else {
    updated.push(entry);
  }
  return normalizeEntries(updated);
}

function normalizeCheckins(checkins) {
  return checkins
    .filter(
      (item) =>
        item &&
        item.dateISO &&
        Number.isFinite(item.morningWeightKg) &&
        item.morningWeightKg > 0
    )
    .map((item) => ({
      dateISO: item.dateISO,
      morningWeightKg: Number(item.morningWeightKg),
      currentWeightKg: Number.isFinite(item.currentWeightKg) ? Number(item.currentWeightKg) : null,
    }))
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO));
}

function upsertCheckin(checkins, checkin) {
  const updated = [...checkins];
  const index = updated.findIndex((item) => item.dateISO === checkin.dateISO);
  if (index >= 0) {
    updated[index] = checkin;
  } else {
    updated.push(checkin);
  }
  return normalizeCheckins(updated);
}

function buildPlanFromForm(form) {
  const planMode = form.elements.planMode?.value === "daily" ? "daily" : "duration";
  const startWeightKg = Number(form.elements.startWeightKg.value);
  const targetWeightKg = Number(form.elements.targetWeightKg.value);
  const startDate = form.elements.startDate.value;
  const totalChangeKg = startWeightKg - targetWeightKg;
  const durationInput = Number(form.elements.durationDays?.value);
  const dailyInput = Number(form.elements.dailyChangeKg?.value);

  let durationDays = durationInput;
  let dailyChangeKg = dailyInput;

  if (planMode === "duration") {
    durationDays = durationInput;
    dailyChangeKg = totalChangeKg / durationDays;
  } else {
    dailyChangeKg = dailyInput;
    durationDays = totalChangeKg / dailyChangeKg;
  }

  return {
    startDate,
    startWeightKg,
    targetWeightKg,
    durationDays,
    dailyChangeKg,
    planMode,
  };
}

function validatePlan(plan) {
  if (!plan.startDate) return "Please enter a start date.";
  if (!Number.isFinite(plan.startWeightKg) || plan.startWeightKg <= 0) {
    return "Please enter a valid start weight.";
  }
  if (!Number.isFinite(plan.targetWeightKg) || plan.targetWeightKg <= 0) {
    return "Please enter a valid target weight.";
  }

  if (plan.planMode === "duration") {
    if (!Number.isFinite(plan.durationDays) || plan.durationDays <= 0) {
      return "Please enter a valid duration.";
    }
    if (!Number.isFinite(plan.dailyChangeKg)) {
      return "Plan values do not line up.";
    }
  } else {
    if (!Number.isFinite(plan.dailyChangeKg) || plan.dailyChangeKg === 0) {
      return "Please enter a valid daily change.";
    }
    if (!Number.isFinite(plan.durationDays) || plan.durationDays <= 0) {
      return "Daily change does not match your goal.";
    }
  }

  return "";
}

function syncPlanForms(plan) {
  dom.planForms.forEach((form) => {
    if (!plan) {
      form.reset();
      if (form.elements.startDate) {
        form.elements.startDate.value = toISODate(new Date());
      }
      setPlanMode(form, "duration");
      return;
    }
    form.elements.startDate.value = plan.startDate;
    form.elements.startWeightKg.value = plan.startWeightKg;
    form.elements.targetWeightKg.value = plan.targetWeightKg;
    if (form.elements.durationDays) {
      form.elements.durationDays.value = formatInputNumber(plan.durationDays, 1);
    }
    if (form.elements.dailyChangeKg) {
      form.elements.dailyChangeKg.value = formatInputNumber(plan.dailyChangeKg, 2);
    }
    setPlanMode(form, plan.planMode || "duration");
  });
}

function setFormNote(target, message, isError) {
  if (!target) return;
  target.textContent = message;
  target.classList.toggle("error", Boolean(isError));
}

function loadPlan() {
  const raw = localStorage.getItem(STORAGE_KEYS.plan);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const startWeightKg = Number(parsed.startWeightKg);
    const targetWeightKg = Number(parsed.targetWeightKg);
    let durationDays = Number(parsed.durationDays);
    let dailyChangeKg = Number(parsed.dailyChangeKg);
    const planMode = parsed.planMode === "daily" ? "daily" : "duration";
    const totalChangeKg = startWeightKg - targetWeightKg;

    if (!Number.isFinite(dailyChangeKg) && Number.isFinite(durationDays) && durationDays !== 0) {
      dailyChangeKg = totalChangeKg / durationDays;
    }

    if (!Number.isFinite(durationDays) && Number.isFinite(dailyChangeKg) && dailyChangeKg !== 0) {
      durationDays = totalChangeKg / dailyChangeKg;
    }

    return {
      startDate: parsed.startDate,
      startWeightKg,
      targetWeightKg,
      durationDays,
      dailyChangeKg,
      planMode,
    };
  } catch (error) {
    return null;
  }
}

function savePlan(plan) {
  localStorage.setItem(STORAGE_KEYS.plan, JSON.stringify(plan));
}

function loadEntries() {
  const raw = localStorage.getItem(STORAGE_KEYS.entries);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEYS.entries, JSON.stringify(entries));
}

function loadCheckins() {
  const raw = localStorage.getItem(STORAGE_KEYS.checkins);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveCheckins(checkins) {
  localStorage.setItem(STORAGE_KEYS.checkins, JSON.stringify(checkins));
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
