# WeatherApp
Interactive weather app that greets the user by name and dynamically updates the background based on current weather conditions
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>WeatherApp</title>
<style>
  :root {
    --bg1: #3a7bd5; --bg2: #8ec5fc; --ink: #fff; --panel: rgba(255,255,255,.18);
  }
  body[data-theme="clear-day"]   { --bg1:#2b86e8; --bg2:#ffd37a; }
  body[data-theme="clear-night"] { --bg1:#0b1026; --bg2:#3b3f8f; }
  body[data-theme="cloudy"]      { --bg1:#6b7b8c; --bg2:#b8c4cf; }
  body[data-theme="fog"]         { --bg1:#8d9aa5; --bg2:#d4d9dd; }
  body[data-theme="rain"]        { --bg1:#27384d; --bg2:#5b7b99; }
  body[data-theme="snow"]        { --bg1:#7fa0c4; --bg2:#eef4fb; }
  body[data-theme="storm"]       { --bg1:#15151f; --bg2:#4a3b6b; }

  * { box-sizing: border-box; }
  html, body { margin: 0; min-height: 100%; }
  body {
    min-height: 100vh;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    color: var(--ink);
    background: linear-gradient(160deg, var(--bg1), var(--bg2));
    background-attachment: fixed;
    transition: background 1s ease;
    padding: 24px 20px 40px;
    display: flex; justify-content: center;
  }
  body[data-theme="snow"], body[data-theme="fog"] { --ink: #14202e; --panel: rgba(255,255,255,.45); }

  main { width: 100%; max-width: 440px; }

  .search { display: flex; gap: 8px; }
  input, button { font: inherit; }
  input {
    flex: 1; min-width: 0; padding: 12px 14px; border-radius: 12px; border: 0;
    background: var(--panel); color: var(--ink);
    backdrop-filter: blur(8px);
  }
  input::placeholder { color: var(--ink); opacity: .7; }
  button {
    padding: 12px 16px; border-radius: 12px; border: 0; cursor: pointer;
    background: var(--ink); color: var(--bg1); font-weight: 600;
  }
  button.ghost { background: var(--panel); color: var(--ink); }
  :focus-visible { outline: 3px solid var(--ink); outline-offset: 2px; }

  .tools { margin-top: 8px; display: flex; gap: 8px; }
  .tools button { flex: 1; font-size: .9rem; }

  #greeting {
    font-family: Georgia, "Times New Roman", serif;
    font-size: clamp(2rem, 9vw, 2.8rem);
    line-height: 1.1; margin: 40px 0 6px;
  }
  #place { margin: 0; opacity: .85; }

  .temp { font-size: clamp(5rem, 28vw, 7.5rem); font-weight: 200; line-height: 1; margin: 18px 0 0; }
  .cond { font-size: 1.3rem; margin: 4px 0 0; }
  .range { opacity: .85; margin: 4px 0 0; }

  .stats {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 28px;
  }
  .stat { background: var(--panel); border-radius: 14px; padding: 12px; backdrop-filter: blur(8px); }
  .stat span { display: block; font-size: .8rem; opacity: .8; }
  .stat strong { font-size: 1.15rem; }

  #msg { min-height: 1.4em; margin-top: 16px; opacity: .9; }

  dialog { border: 0; border-radius: 16px; padding: 22px; max-width: 340px; width: 90%; }
  dialog::backdrop { background: rgba(0,0,0,.5); }
  dialog h2 { margin: 0 0 6px; font-family: Georgia, serif; }
  dialog p { margin: 0 0 14px; color: #444; }
  dialog input { width: 100%; background: #eef1f5; color: #111; margin-bottom: 12px; }
  dialog input::placeholder { color: #666; }
  dialog button { width: 100%; background: #14202e; color: #fff; }

  @media (prefers-reduced-motion: reduce) { body { transition: none; } }
</style>
</head>
<body data-theme="clear-day">
<main>
  <form class="search" id="searchForm">
    <input id="city" type="text" placeholder="Search a city" aria-label="City" autocomplete="off">
    <button type="submit">Search</button>
  </form>
  <div class="tools">
    <button class="ghost" id="locBtn" type="button">Use my location</button>
    <button class="ghost" id="nameBtn" type="button">Change name</button>
  </div>

  <h1 id="greeting">Hello</h1>
  <p id="place">Pick a city to see the weather.</p>

  <p class="temp" id="temp">--°</p>
  <p class="cond" id="cond"></p>
  <p class="range" id="range"></p>

  <div class="stats">
    <div class="stat"><span>Feels like</span><strong id="feels">--</strong></div>
    <div class="stat"><span>Humidity</span><strong id="hum">--</strong></div>
    <div class="stat"><span>Wind</span><strong id="wind">--</strong></div>
  </div>

  <p id="msg" role="status"></p>
</main>

<dialog id="nameDialog">
  <form method="dialog" id="nameForm">
    <h2>Welcome</h2>
    <p>What should I call you?</p>
    <input id="nameInput" type="text" placeholder="Your name" maxlength="30" autocomplete="given-name">
    <button type="submit">Continue</button>
  </form>
</dialog>

<script>
(function () {
  const $ = (id) => document.getElementById(id);
  const body = document.body;
  let userName = "";
  let weather = null; // last loaded weather, so the greeting can refresh

  // ---------- storage (safe if blocked) ----------
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  // ---------- weather code -> text + theme ----------
  function describe(code, isDay) {
    if (code === 0) return { text: isDay ? "Clear sky" : "Clear night", theme: isDay ? "clear-day" : "clear-night" };
    if (code === 1 || code === 2) return { text: "Partly cloudy", theme: isDay ? "clear-day" : "clear-night" };
    if (code === 3) return { text: "Overcast", theme: "cloudy" };
    if (code === 45 || code === 48) return { text: "Foggy", theme: "fog" };
    if (code >= 51 && code <= 57) return { text: "Drizzle", theme: "rain" };
    if (code >= 61 && code <= 67) return { text: "Rain", theme: "rain" };
    if (code >= 71 && code <= 77) return { text: "Snow", theme: "snow" };
    if (code >= 80 && code <= 82) return { text: "Rain showers", theme: "rain" };
    if (code === 85 || code === 86) return { text: "Snow showers", theme: "snow" };
    if (code >= 95) return { text: "Thunderstorm", theme: "storm" };
    return { text: "Cloudy", theme: "cloudy" };
  }

  // ---------- greeting ----------
  function greet() {
    let hour = new Date().getHours();
    if (weather && weather.localHour !== undefined) hour = weather.localHour;
    const part = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    $("greeting").textContent = userName ? part + ", " + userName : part;
  }

  function askName(force) {
    const saved = store.get("weatherapp_name");
    if (saved && !force) { userName = saved; greet(); return; }
    $("nameInput").value = saved || "";
    $("nameDialog").showModal();
  }

  $("nameForm").addEventListener("submit", () => {
    const v = $("nameInput").value.trim();
    userName = v;
    store.set("weatherapp_name", v);
    greet();
  });
  $("nameBtn").addEventListener("click", () => askName(true));

  // ---------- fetching ----------
  async function getJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Request failed (" + res.status + ")");
    return res.json();
  }

  async function loadWeather(lat, lon, label) {
    $("msg").textContent = "Loading…";
    try {
      const url = "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon +
        "&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day" +
        "&daily=temperature_2m_max,temperature_2m_min&timezone=auto";
      const d = await getJSON(url);
      const c = d.current;
      const info = describe(c.weather_code, c.is_day === 1);

      weather = { localHour: parseInt(c.time.slice(11, 13), 10) };
      body.dataset.theme = info.theme;

      $("place").textContent = label;
      $("temp").textContent = Math.round(c.temperature_2m) + "°";
      $("cond").textContent = info.text;
      $("range").textContent = "H " + Math.round(d.daily.temperature_2m_max[0]) + "°  ·  L " + Math.round(d.daily.temperature_2m_min[0]) + "°";
      $("feels").textContent = Math.round(c.apparent_temperature) + "°";
      $("hum").textContent = c.relative_humidity_2m + "%";
      $("wind").textContent = Math.round(c.wind_speed_10m) + " km/h";
      $("msg").textContent = "";
      store.set("weatherapp_last", JSON.stringify({ lat: lat, lon: lon, label: label }));
      greet();
    } catch (e) {
      $("msg").textContent = "Couldn't load the weather. Check your connection and try again.";
    }
  }

  async function searchCity(name) {
    $("msg").textContent = "Searching…";
    try {
      const d = await getJSON("https://geocoding-api.open-meteo.com/v1/search?count=1&name=" + encodeURIComponent(name));
      if (!d.results || !d.results.length) {
        $("msg").textContent = "No city found for \"" + name + "\". Check the spelling.";
        return;
      }
      const r = d.results[0];
      const label = r.name + (r.admin1 ? ", " + r.admin1 : "") + (r.country ? ", " + r.country : "");
      loadWeather(r.latitude, r.longitude, label);
    } catch (e) {
      $("msg").textContent = "Search failed. Check your connection and try again.";
    }
  }

  $("searchForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const v = $("city").value.trim();
    if (v) searchCity(v);
  });

  $("locBtn").addEventListener("click", () => {
    if (!navigator.geolocation) { $("msg").textContent = "Location isn't supported on this device."; return; }
    $("msg").textContent = "Finding you…";
    navigator.geolocation.getCurrentPosition(
      (pos) => loadWeather(pos.coords.latitude.toFixed(3), pos.coords.longitude.toFixed(3), "Your location"),
      () => { $("msg").textContent = "Location blocked. Allow it in your browser settings, or search a city."; }
    );
  });

  // ---------- start ----------
  askName(false);
  const last = store.get("weatherapp_last");
  if (last) {
    try { const l = JSON.parse(last); loadWeather(l.lat, l.lon, l.label); } catch (e) {}
  }
})();
</script>
</body>
</html>
