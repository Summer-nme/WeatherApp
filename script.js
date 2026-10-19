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
