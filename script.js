/*
  FitTrack v1 JavaScript
  Beginner-friendly structure:
  1) Load data
  2) Attach events
  3) Render UI
*/

const STORAGE_KEY = "fittrack_v1";

// Central app state. Easy to extend later for public users/API sync.
const state = {
  entries: [],
  plans: {
    workout: "",
    nutrition: "",
  },
};

// ------- Utility helpers -------
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    state.entries = parsed.entries || [];
    state.plans = parsed.plans || state.plans;
  } catch (error) {
    console.error("Could not load saved data", error);
  }
}

function getInputValue(id) {
  return document.getElementById(id).value.trim();
}

function toNumber(value) {
  if (value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function sortEntriesByDate(entries) {
  return [...entries].sort((a, b) => a.date.localeCompare(b.date));
}

// ------- Tabs -------
function setupTabs() {
  const buttons = document.querySelectorAll(".tab-btn");
  const panels = document.querySelectorAll(".tab-panel");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const tabId = button.dataset.tab;

      buttons.forEach((b) => b.classList.remove("active"));
      panels.forEach((p) => p.classList.remove("active"));

      button.classList.add("active");
      document.getElementById(tabId).classList.add("active");
    });
  });
}

// ------- Daily form -------
function setupDailyForm() {
  const form = document.getElementById("dailyForm");
  const dateInput = document.getElementById("entryDate");

  // Default to today for convenience.
  if (!dateInput.value) {
    dateInput.value = new Date().toISOString().split("T")[0];
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const entry = {
      date: getInputValue("entryDate"),
      weight: toNumber(getInputValue("weight")),
      bmi: toNumber(getInputValue("bmi")),
      bodyFat: toNumber(getInputValue("bodyFat")),
      muscleMass: toNumber(getInputValue("muscleMass")),
      bodyWater: toNumber(getInputValue("bodyWater")),
      workout: getInputValue("workout"),
      nutrition: getInputValue("nutrition"),
    };

    // If user saves the same date again, replace old entry.
    const existingIndex = state.entries.findIndex((item) => item.date === entry.date);
    if (existingIndex >= 0) {
      state.entries[existingIndex] = entry;
    } else {
      state.entries.push(entry);
    }

    saveState();
    renderAll();
    alert("Daily entry saved.");
  });
}

// ------- Plans -------
function setupPlans() {
  const workoutPlanInput = document.getElementById("workoutPlan");
  const nutritionPlanInput = document.getElementById("nutritionPlan");

  workoutPlanInput.value = state.plans.workout || "";
  nutritionPlanInput.value = state.plans.nutrition || "";

  document.getElementById("saveWorkoutPlan").addEventListener("click", () => {
    state.plans.workout = workoutPlanInput.value;
    saveState();
    alert("Workout plan saved.");
  });

  document.getElementById("saveNutritionPlan").addEventListener("click", () => {
    state.plans.nutrition = nutritionPlanInput.value;
    saveState();
    alert("Nutrition plan saved.");
  });
}

// ------- Photo upload (preview only) -------
function setupPhotoUpload() {
  const photoInput = document.getElementById("photoInput");
  const preview = document.getElementById("photoPreview");

  photoInput.addEventListener("change", () => {
    const file = photoInput.files[0];
    if (!file) {
      preview.classList.add("hidden");
      preview.src = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      preview.src = event.target.result;
      preview.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
  });
}

// ------- Rendering -------
function renderRecentEntries() {
  const list = document.getElementById("recentEntries");
  list.innerHTML = "";

  const recent = sortEntriesByDate(state.entries).reverse().slice(0, 7);

  if (recent.length === 0) {
    list.innerHTML = "<li>No entries yet. Add your first daily log.</li>";
    return;
  }

  recent.forEach((entry) => {
    const li = document.createElement("li");
    li.textContent = `${entry.date} • Weight: ${entry.weight ?? "-"} • BMI: ${entry.bmi ?? "-"} • Workout: ${entry.workout || "-"}`;
    list.appendChild(li);
  });
}

function drawLineChart(canvasId, label, points, color) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext("2d");

  const w = canvas.width;
  const h = canvas.height;
  const padding = 24;

  ctx.clearRect(0, 0, w, h);

  // Title
  ctx.fillStyle = "#1f2937";
  ctx.font = "12px Arial";
  ctx.fillText(label, 10, 14);

  if (points.length < 2) {
    ctx.fillStyle = "#6b7280";
    ctx.fillText("Need at least 2 data points", 10, h / 2);
    return;
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  // Axis line
  ctx.strokeStyle = "#dbe1ea";
  ctx.beginPath();
  ctx.moveTo(padding, h - padding);
  ctx.lineTo(w - 8, h - padding);
  ctx.moveTo(padding, h - padding);
  ctx.lineTo(padding, 20);
  ctx.stroke();

  // Data line
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();

  points.forEach((p, index) => {
    const x = padding + (index * (w - padding - 12)) / (points.length - 1);
    const y = h - padding - ((p.value - min) / range) * (h - padding - 24);

    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);

    // Dot
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.stroke();

  // Min/max hint text
  ctx.fillStyle = "#6b7280";
  ctx.font = "10px Arial";
  ctx.fillText(`Min: ${min}`, 10, h - 8);
  ctx.fillText(`Max: ${max}`, w - 64, 14);
}

function renderCharts() {
  const sorted = sortEntriesByDate(state.entries);

  const weightPoints = sorted.filter((e) => e.weight != null).map((e) => ({ date: e.date, value: e.weight }));
  const fatPoints = sorted.filter((e) => e.bodyFat != null).map((e) => ({ date: e.date, value: e.bodyFat }));
  const musclePoints = sorted.filter((e) => e.muscleMass != null).map((e) => ({ date: e.date, value: e.muscleMass }));
  const waterPoints = sorted.filter((e) => e.bodyWater != null).map((e) => ({ date: e.date, value: e.bodyWater }));

  drawLineChart("weightChart", "Weight (kg)", weightPoints, "#2563eb");
  drawLineChart("bodyFatChart", "Body Fat (%)", fatPoints, "#dc2626");
  drawLineChart("muscleChart", "Muscle Mass (kg)", musclePoints, "#059669");
  drawLineChart("waterChart", "Body Water (%)", waterPoints, "#7c3aed");
}

function renderRecommendations() {
  const list = document.getElementById("recommendations");
  list.innerHTML = "";

  const sorted = sortEntriesByDate(state.entries);
  const latest = sorted[sorted.length - 1];

  if (!latest) {
    list.innerHTML = "<li>Add entries to receive recommendations.</li>";
    return;
  }

  const recs = [];

  // Basic rules (placeholder "AI"). Keep easy to edit.
  if (latest.bodyFat != null && latest.bodyFat > 25) {
    recs.push("Body fat is above your target range. Consider adding 2-3 cardio sessions this week.");
  }

  if (latest.bodyWater != null && latest.bodyWater < 50) {
    recs.push("Body water looks low. Increase daily water intake and include electrolyte-rich foods.");
  }

  if (latest.muscleMass != null && sorted.length > 1) {
    const previousWithMuscle = [...sorted].reverse().find((e) => e.date !== latest.date && e.muscleMass != null);
    if (previousWithMuscle && latest.muscleMass < previousWithMuscle.muscleMass) {
      recs.push("Muscle mass dipped since last check. Prioritize strength training and protein intake.");
    }
  }

  if ((latest.workout || "").length < 10) {
    recs.push("Workout log is short today. Add specific exercises so progress is easier to review.");
  }

  if ((latest.nutrition || "").length < 10) {
    recs.push("Nutrition log is light today. Tracking meals in more detail helps improve recommendations.");
  }

  if (recs.length === 0) {
    recs.push("Great consistency. Keep following your plans and check trends weekly.");
  }

  recs.forEach((text) => {
    const li = document.createElement("li");
    li.textContent = text;
    list.appendChild(li);
  });
}

function renderAll() {
  renderRecentEntries();
  renderCharts();
  renderRecommendations();
}

// ------- App startup -------
function init() {
  loadState();
  setupTabs();
  setupDailyForm();
  setupPlans();
  setupPhotoUpload();
  renderAll();
}

init();
