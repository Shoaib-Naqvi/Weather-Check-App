const state = {
  currentCity: "Rawalpindi",
  lat: 33.6007,
  lon: 73.0679,
  unit: "metric",
  theme: "light",
  savedCities: [],
  weatherData: null,
  forecastData: null,
};

const sections = {
  dashboard: document.getElementById("section-dashboard"),
  map: document.getElementById("section-map"),
  saved: document.getElementById("section-saved"),
  calendar: document.getElementById("section-calendar"),
  settings: document.getElementById("section-settings"),
};

const navButtons = {
  dashboard: document.getElementById("nav-dashboard"),
  map: document.getElementById("nav-map"),
  saved: document.getElementById("nav-saved"),
  calendar: document.getElementById("nav-calendar"),
  settings: document.getElementById("nav-settings"),
  logout: document.getElementById("nav-logout"),
};

const loader = document.getElementById("loader");
const errorToast = document.getElementById("errorToast");
const errorMsg = document.getElementById("errorMsg");
const themeToggle = document.getElementById("themeToggle");
const saveLocationBtn = document.getElementById("saveLocationBtn");
const weatherForm = document.getElementById("weatherForm");
const cityInput = document.getElementById("cityInput");

let map;
let mapMarker;

init();

async function init() {
  loadState();
  applyTheme();
  setupEventListeners();

  await fetchWeatherData(state.currentCity);
}

function loadState() {
  state.theme = localStorage.getItem("theme") || "light";
  state.unit = localStorage.getItem("unit") || "metric";
  state.savedCities = JSON.parse(localStorage.getItem("savedCities")) || [];
  const lastCity = localStorage.getItem("lastCity");
  if (lastCity) state.currentCity = lastCity;

  updateUnitToggles();
}

function setupEventListeners() {
  Object.keys(navButtons).forEach((key) => {
    if (key === "logout") {
      navButtons[key].addEventListener("click", handleLogout);
    } else {
      navButtons[key].addEventListener("click", () => switchView(key));
    }
  });

  themeToggle.addEventListener("click", toggleTheme);
  document
    .getElementById("setting-light")
    .addEventListener("click", () => setTheme("light"));
  document
    .getElementById("setting-dark")
    .addEventListener("click", () => setTheme("dark"));
  document.querySelectorAll(".toggle-btn[data-unit]").forEach((btn) => {
    btn.addEventListener("click", (e) => setUnit(e.target.dataset.unit));
  });

  weatherForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const city = cityInput.value.trim();
    if (city) {
      await fetchWeatherData(city);
      switchView("dashboard");
      cityInput.value = "";
    }
  });

  saveLocationBtn.addEventListener("click", toggleSaveLocation);
  document
    .getElementById("clearSavedBtn")
    .addEventListener("click", clearSavedLocations);
}

function switchView(viewName) {
  Object.values(navButtons).forEach((btn) => btn.classList.remove("active"));
  if (navButtons[viewName]) navButtons[viewName].classList.add("active");

  Object.values(sections).forEach((sec) => sec.classList.remove("active"));
  sections[viewName].classList.add("active");

  if (viewName === "map") initMap();
  if (viewName === "saved") renderSavedLocations();
  if (viewName === "calendar") renderCalendar();
}

async function fetchWeatherData(query) {
  showLoading(true);
  try {
    let weatherUrl, forecastUrl;
    const unit = state.unit;

    if (typeof query === "object") {
      weatherUrl = `/.netlify/functions/getData?lat=${query.lat}&lon=${query.lon}&units=${unit}`;
      forecastUrl = `/.netlify/functions/getData?lat=${query.lat}&lon=${query.lon}&units=${unit}&type=forecast`;
    } else {
      weatherUrl = `/.netlify/functions/getData?q=${encodeURIComponent(query)}&units=${unit}`;
      forecastUrl = `/.netlify/functions/getData?q=${encodeURIComponent(query)}&units=${unit}&type=forecast`;
    }

    const [wRes, fRes] = await Promise.all([
      fetch(weatherUrl),
      fetch(forecastUrl),
    ]);

    if (!wRes.ok) throw new Error("City not found");

    const wData = await wRes.json();
    const fData = await fRes.json();

    state.weatherData = wData;
    state.forecastData = fData;
    state.currentCity = wData.name;
    state.lat = wData.coord.lat;
    state.lon = wData.coord.lon;

    localStorage.setItem("lastCity", state.currentCity);

    updateDashboardUI();
    updateSaveBtnState();
  } catch (err) {
    showError(err.message);
  } finally {
    showLoading(false);
  }
}

function updateDashboardUI() {
  const data = state.weatherData;
  if (!data) return;

  document.getElementById("cityDisplay").textContent = data.name;
  document.getElementById("tempDisplay").textContent =
    Math.round(data.main.temp) + "°";
  document.getElementById("descDisplay").textContent =
    data.weather[0].description;
  document.getElementById("dateTimeDisplay").textContent =
    new Date().toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  const isDay = data.dt > data.sys.sunrise && data.dt < data.sys.sunset;
  document.getElementById("weatherIcon3D").src = getSafeIcon(
    data.weather[0].id,
    isDay,
  );

  const uvMock = Math.floor(Math.random() * 10);
  document.getElementById("uvIndex").textContent = uvMock;
  updateGauge(uvMock);

  const speed =
    state.unit === "metric"
      ? (data.wind.speed * 3.6).toFixed(1)
      : data.wind.speed;
  const unitText = state.unit === "metric" ? "km/h" : "mph";
  document.getElementById("speedDisplay").textContent = speed;
  document.getElementById("speedUnit").textContent = unitText;
  document.getElementById("sunriseTime").textContent = formatTime(
    data.sys.sunrise,
  );
  document.getElementById("sunsetTime").textContent = formatTime(
    data.sys.sunset,
  );
  document.getElementById("humidityDisplay").textContent = data.main.humidity;
  document.getElementById("humidityBar").style.width = data.main.humidity + "%";

  const vis =
    state.unit === "metric"
      ? (data.visibility / 1000).toFixed(1)
      : (data.visibility / 1609).toFixed(1);
  document.getElementById("visibilityDisplay").textContent = vis;
  document.getElementById("airQuality").textContent = Math.floor(
    Math.random() * (150 - 20) + 20,
  );

  renderHourlyForecast();
  renderWeeklyForecast();
  updateBackground(data.weather[0].id, isDay);
}

function renderHourlyForecast() {
  const list = document.getElementById("hourlyList");
  list.innerHTML = "";
  const current = state.weatherData;
  const forecast = state.forecastData;
  if (!current || !forecast) return;

  const nowEl = document.createElement("div");
  nowEl.className = "hourly-item";
  nowEl.style.animationDelay = "0s";
  const nowH = new Date().getHours();
  const isDayNow = nowH >= 6 && nowH <= 20;

  nowEl.innerHTML = `
      <span class="time">Now</span>
      <img src="${getSafeIcon(current.weather[0].id, isDayNow)}" alt="ico">
      <span class="temp">${Math.round(current.main.temp)}°</span>
  `;
  list.appendChild(nowEl);

  forecast.list.forEach((item, index) => {
    const date = new Date(item.dt * 1000);
    const timeLabel = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      hour12: true,
    });
    const h = date.getHours();
    const isDay = h >= 6 && h <= 20;

    const el = document.createElement("div");
    el.className = "hourly-item";
    el.style.animationDelay = `${(index + 1) * 0.05}s`;

    el.innerHTML = `
        <span class="time">${timeLabel}</span>
        <img src="${getSafeIcon(item.weather[0].id, isDay)}" alt="ico">
        <span class="temp">${Math.round(item.main.temp)}°</span>
    `;
    list.appendChild(el);
  });
}

function renderWeeklyForecast() {
  const list = document.getElementById("forecastList");
  list.innerHTML = "";

  const daily = processDailyForecast();
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowName = tomorrow.toLocaleDateString("en-US", {
    weekday: "long",
  });

  daily.forEach((day, index) => {
    let displayName = day.name;
    let subText = day.dateStr;

    if (day.name === tomorrowName) {
      displayName = `Tomorrow ${day.name}`;
    }

    const el = document.createElement("div");
    el.className = "forecast-item";
    el.style.animationDelay = `${index * 0.1}s`;

    el.innerHTML = `
            <div class="day-info">
                <span class="day-name">${displayName}</span>
                <span class="day-date">${subText}</span>
             </div>
            <span class="temps">${Math.round(day.max)}° - ${Math.round(day.min)}°</span>
            <img src="${getSafeIcon(day.icon, true)}" alt="ico">
        `;
    list.appendChild(el);
  });
}

function initMap() {
  if (!map) {
    map = L.map("map").setView([state.lat, state.lon], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(map);

    mapMarker = L.marker([state.lat, state.lon]).addTo(map);

    map.on("click", async (e) => {
      const { lat, lng } = e.latlng;
      await fetchWeatherData({ lat, lon: lng });
      switchView("dashboard");
    });
  } else {
    map.setView([state.lat, state.lon], 13);
    mapMarker.setLatLng([state.lat, state.lon]);
    map.invalidateSize();
  }
}

function renderCalendar() {
  const grid = document.getElementById("calendarGrid");
  grid.innerHTML = "";

  const daily = processDailyForecast();

  daily.forEach((day) => {
    const el = document.createElement("div");
    el.className = "calendar-row";
    el.innerHTML = `
            <span class="date">${day.fullDate}</span>
            <div class="condition">
                <img src="${getSafeIcon(day.icon, true)}" alt="weather">
                <span>${day.desc}</span>
            </div>
            <span class="temp-range">${Math.round(day.max)}° / ${Math.round(day.min)}°</span>
        `;
    grid.appendChild(el);
  });
}

function processDailyForecast() {
  if (!state.forecastData) return [];

  const map = new Map();

  state.forecastData.list.forEach((item) => {
    const date = new Date(item.dt * 1000);
    const dayKey = date.toDateString();

    if (!map.has(dayKey)) {
      map.set(dayKey, {
        name: date.toLocaleDateString("en-US", { weekday: "long" }),
        dateStr: date.toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
        }),
        fullDate: date.toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        }),
        min: item.main.temp_min,
        max: item.main.temp_max,
        icon: item.weather[0].id,
        desc: item.weather[0].main,
      });
    } else {
      const entry = map.get(dayKey);
      entry.min = Math.min(entry.min, item.main.temp_min);
      entry.max = Math.max(entry.max, item.main.temp_max);
    }
  });

  const todayKey = new Date().toDateString();
  const days = Array.from(map.values());

  if (
    days.length > 0 &&
    new Date(state.forecastData.list[0].dt * 1000).toDateString() === todayKey
  ) {
    return days.slice(1);
  }
  return days;
}

function toggleSaveLocation() {
  if (state.savedCities.includes(state.currentCity)) {
    removeLocation(state.currentCity);
  } else {
    saveLocation(state.currentCity);
  }
}

function saveLocation(city) {
  if (!state.savedCities.includes(city)) {
    state.savedCities.push(city);
    localStorage.setItem("savedCities", JSON.stringify(state.savedCities));
    updateSaveBtnState();
  }
}

function removeLocation(city) {
  state.savedCities = state.savedCities.filter((c) => c !== city);
  localStorage.setItem("savedCities", JSON.stringify(state.savedCities));
  updateSaveBtnState();
  if (document.getElementById("section-saved").classList.contains("active")) {
    renderSavedLocations();
  }
}

async function renderSavedLocations() {
  const list = document.getElementById("savedList");
  list.innerHTML = "";

  if (state.savedCities.length === 0) {
    list.innerHTML = '<p class="empty-msg">No saved locations yet.</p>';
    return;
  }

  for (const city of state.savedCities) {
    const temp = await getQuickTemp(city);

    const card = document.createElement("div");
    card.className = "saved-card";
    card.innerHTML = `
            <h3>${city}</h3>
            <div class="temp">${Math.round(temp)}°</div>
            <button class="delete-btn" title="Remove"><i class="fa-solid fa-trash"></i></button>
        `;

    card.addEventListener("click", (e) => {
      if (!e.target.closest(".delete-btn")) {
        fetchWeatherData(city);
        switchView("dashboard");
      }
    });

    card.querySelector(".delete-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      removeLocation(city);
    });

    list.appendChild(card);
  }
}

async function getQuickTemp(city) {
  try {
    const url = `/.netlify/functions/getData?q=${encodeURIComponent(city)}&units=${state.unit}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.main.temp;
  } catch {
    return "--";
  }
}

function updateSaveBtnState() {
  const isSaved = state.savedCities.includes(state.currentCity);
  saveLocationBtn.innerHTML = isSaved
    ? '<i class="fa-solid fa-bookmark"></i>'
    : '<i class="fa-regular fa-bookmark"></i>';
}

function clearSavedLocations() {
  state.savedCities = [];
  localStorage.removeItem("savedCities");
  renderSavedLocations();
  updateSaveBtnState();
}

function toggleTheme() {
  state.theme = state.theme === "light" ? "dark" : "light";
  applyTheme();
}

function setTheme(theme) {
  state.theme = theme;
  applyTheme();
}

function applyTheme() {
  if (state.theme === "dark") document.body.classList.add("dark-mode");
  else document.body.classList.remove("dark-mode");

  localStorage.setItem("theme", state.theme);
  themeToggle.innerHTML =
    state.theme === "dark"
      ? '<i class="fa-solid fa-sun"></i>'
      : '<i class="fa-solid fa-moon"></i>';

  document
    .getElementById("setting-light")
    .classList.toggle("active", state.theme === "light");
  document
    .getElementById("setting-dark")
    .classList.toggle("active", state.theme === "dark");
}

function setUnit(u) {
  if (state.unit === u) return;
  state.unit = u;
  localStorage.setItem("unit", u);
  updateUnitToggles();
  fetchWeatherData(state.currentCity);
}

function updateUnitToggles() {
  document.querySelectorAll(".toggle-btn[data-unit]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.unit === state.unit);
  });
}

function handleLogout() {
  localStorage.clear();
  location.reload();
}

function updateGauge(val) {
  const deg = Math.min((val / 10) * 180, 180);
  document.getElementById("uvGaugeFill").style.transform = `rotate(${deg}deg)`;
}

function updateBackground(id, isDay) {
  const heroBg = document.getElementById("heroBg");
  if (!heroBg) return;

  let bgImage = "";

  if (id >= 200 && id < 300) bgImage = "assets/Thenderstorm-BackG.jpg";
  else if (id >= 300 && id < 500) bgImage = "assets/Drizzle-BackG.jpg";
  else if (id >= 500 && id < 600) bgImage = "assets/Rain-BackG.jpg";
  else if (id >= 600 && id < 700) bgImage = "assets/bg-snowy.png";
  else if (id >= 700 && id < 800) bgImage = "assets/bg-atmosphere.png";
  else if (id === 800) {
    bgImage = isDay ? "assets/clear-BackG.jpg" : "assets/clear-night.jpg";
  } else if (id > 800) {
    bgImage = "assets/Cloudy-BackG.jpg";
  }

  if (bgImage) {
    heroBg.style.backgroundImage = `url('${bgImage}')`;
    heroBg.style.opacity = "0";
    setTimeout(() => {
      heroBg.style.opacity = "1";
    }, 100);
  }
}

function getSafeIcon(id, isDay) {
  if (id >= 200 && id < 300) return "assets/storm.png";
  if (id >= 300 && id < 600) return "assets/rainy-day.png";
  if (id >= 600 && id < 700) return "assets/snow.png";
  if (id >= 700 && id < 800) return "assets/fog.png";

  if (id === 800) {
    return isDay ? "assets/sun.png" : "assets/night.png";
  }

  if (id > 800) {
    return "assets/cloudy.png";
  }

  return "assets/sun.png";
}

function formatTime(unix) {
  return new Date(unix * 1000).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function showLoading(show) {
  if (show) loader.classList.remove("hidden");
  else loader.classList.add("hidden");
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorToast.classList.remove("hidden");
  setTimeout(() => errorToast.classList.add("hidden"), 3000);
}
