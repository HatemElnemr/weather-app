const global = {
  currentSystem: "metric",
  units: {
    temperature: "celsius",
    windSpeed: "km/h",
    precipitation: "millimeters",
  },
  api: {
    apiUrl: "https://api.open-meteo.com/v1/forecast?",
    apiEnd:
      "precipitation,wind_speed_10m,relative_humidity_2m,apparent_temperature,weather_code",
  },
  lastCity: "",
  currentLocation: null,
};

const unitSystem = {
  metric: {
    temperature: "Celsius",
    windSpeed: "km/h",
    precipitation: "Millimeters",
  },
  imperial: {
    temperature: "Fahrenheit",
    windSpeed: "mph",
    precipitation: "Inches",
  },
};

// Intialize DOM elements
const dropdownTemperature = document.querySelector(".temperature");
const dropdownWindSpeed = document.querySelector(".wind-speed");
const dropdownPrecipitation = document.querySelector(".precipitation");
const unitsDropdownBtn = document.getElementById("units-dropdown-btn");
const unitsDropdown = document.getElementById("units-dropdown");
const searchForm = document.querySelector(".search-form");

const switchUnitsBtn = document.querySelector(".switch-units");
const switchTemperatureBtn = document.querySelector(".unit-temperature");
const switchWindSpeedBtn = document.querySelector(".unit-wind-speed");
const switchPrecipitationBtn = document.querySelector(".unit-precipitation");

const temperatureText = document.querySelector(".temperature-text");
const temperatureIcon = document.querySelector(".temperature-icon");
const locationText = document.querySelector(".location-text");
const dateText = document.querySelector(".date-text");

const feelsLike = document.querySelector(".weather-details .feels-like");
const humidity = document.querySelector(".weather-details .humidity");
const wind = document.querySelector(".weather-details .wind");
const precipitation = document.querySelector(".weather-details .precipitation");

const retryBtn = document.querySelector(".retry-button");

const serverError = document.querySelector(".search-server-error");
const searchNotFound = document.querySelector(".search-not-found");
const contentContainer = document.querySelector(".content-container");
const weatherInfoContainer = document.querySelector(".current-weather");
const locationInfo = weatherInfoContainer.querySelector(".location-info");
const temperatureContainer = weatherInfoContainer.querySelector(
  ".temperature-container"
);

const loadingContainer =
  weatherInfoContainer.querySelector(".loading-container");

const cityInput = document.getElementById("citySearch");
const searchBtn = document.getElementById("searchBtn");
const cityDropdown = document.getElementById("cityDropdown");

// handle units dropdown visibility
unitsDropdownBtn.addEventListener("click", () => {
  unitsDropdown.classList.toggle("show");
});

window.addEventListener("click", (event) => {
  if (
    !event.target.matches("#units-dropdown-btn") &&
    !event.target.matches("#units-dropdown-btn *")
  ) {
    if (unitsDropdown.classList.contains("show")) {
      unitsDropdown.classList.remove("show");
    }
  }
});

function closeDropdowns(e) {
  if (!cityDropdown.contains(e.target) && e.target !== cityInput) {
    hideCityDropdown();
  }
}

function selectDropdownCity(city) {
  hideCityDropdown();
  intializeWithLocation(city.latitude, city.longitude);
}

// handle city input events
let suggestionTimer;

function handleCitySearch(e) {
  const query = e.target.value.trim();
  clearTimeout(suggestionTimer);

  if (query.length < 3) {
    hideCityDropdown();
    return;
  }

  suggestionTimer = setTimeout(() => {
    fetchCitySuggestion(query);
  }, 300);
}

//handle city search fetching
async function fetchCitySuggestion(cityName) {
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${cityName}&count=4`
    );
    const data = await response.json();

    if (data.results) {
      showCityDropdown(data.results);
    }

    return data.results;
  } catch (error) {
    throw new Error(error);
  }
}
// handle city dropdown visibility
const showCityDropdown = (cities) => {
  cityDropdown.innerHTML = "";

  cities.forEach((city) => {
    const cityOption = document.createElement("div");
    cityOption.classList.add("city-option");
    cityOption.textContent = `${city.name}, ${city.admin1}, ${city.country}`;
    cityOption.addEventListener("click", (e) => {
      e.preventDefault();
      selectDropdownCity(city);
    });
    cityDropdown.appendChild(cityOption);
  });
  cityDropdown.classList.remove("hidden");
};

const hideCityDropdown = () => {
  cityDropdown.classList.add("hidden");
};

// Handle Loading
function showLoading() {
  weatherInfoContainer.classList.add("weather-info-loading");
  locationInfo.classList.add("hidden");
  temperatureContainer.classList.add("hidden");
  loadingContainer.classList.remove("hidden");
}

function hideLoading() {
  weatherInfoContainer.classList.remove("weather-info-loading");
  locationInfo.classList.remove("hidden");
  temperatureContainer.classList.remove("hidden");
  loadingContainer.classList.add("hidden");
}

// Handle Error
function showNotFound() {
  searchNotFound.classList.remove("hidden");
  contentContainer.classList.add("hidden");
}

function hideNotFound() {
  searchNotFound.classList.add("hidden");
  contentContainer.classList.remove("hidden");
}

function showServerError() {
  serverError.classList.remove("hidden");
  contentContainer.classList.add("hidden");
}
function hideServerError() {
  serverError.classList.add("hidden");
  contentContainer.classList.remove("hidden");
}

function checkServerError(status) {
  if (status === 500) {
    showServerError();
    throw new Error(`Problem fetching data.`);
  }
}

function retrySearch() {
  document.querySelector("input").value = "";
  hideServerError();
  window.location.reload();
}



const options = {
  enableHighAccuracy: true,
  timeout: 5000,
  maximumAge: 0,
};

function success(pos) {
  const crd = pos.coords;

  intializeWithLocation(crd.latitude, crd.longitude);
}

function error(err) {
  console.warn(`ERROR(${err.code}): ${err.message}`);
}

function buildUnitParams(units) {
  const params = [];

  if (units.windSpeed === 'mph') params.push('wind_speed_unit=mph');

  if (units.temperature === 'fahrenheit') params.push('temperature_unit=fahrenheit');

  if (units.precipitation === 'inch') params.push('precipitation_unit=inch');

  return params.join('&');
}

async function fetchWeatherData(latitude, longitude) {
  showLoading();

  try {
    const unitParams = buildUnitParams(global.units);
    const url = `${global.api.apiUrl}latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&current=temperature_2m,${global.api.apiEnd}${unitParams ? `&${unitParams}` : ""}`;
    console.log('Fetching weather URL:', url);
    const response = await fetch(url);
    checkServerError(response.status);

    const weatherData = await response.json();
    console.log(weatherData);
    return weatherData;
  } catch (err) {
    console.log("Failed to fetch data.", err.message);
    throw err;
  }
}

// Helpers to normalize unit tokens coming from UI text
function getCanonicalUnit(type, text) {
  if (!text) return null;
  const t = text.toLowerCase();
  if (type === 'temperature') {
    if (t.includes('f') || t.includes('fahrenheit')) return 'fahrenheit';
    return 'celsius';
  }
  if (type === 'windSpeed') {
    if (t.includes('mph')) return 'mph';
    return 'km/h';
  }
  if (type === 'precipitation') {
    if (t.includes('inch') || t.includes('in')) return 'inch';
    return 'millimeters';
  }
  return text;
}

async function getCityFromCoordinates(latitude, longitude) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
  );
  checkServerError(response.status);
  const data = await response.json();
  console.log(data);
  const { address } = data;
  return {
    country: address.country,
    name: address.city ? address.city : address.state,
  };
}

async function intializeWithLocation(latitude, longitude) {
  global.currentLocation = { latitude, longitude };

  const weatherData = await fetchWeatherData(latitude, longitude);
  const cityData = await getCityFromCoordinates(latitude, longitude);

  // Update UI with fetched data
  updateWeatherUI(weatherData, cityData);
}


async function getWeatherByCity(cityName) {
  const cityData = await getCityInfo(cityName);

  const weatherData = await fetchWeatherData(
    cityData.latitude,
    cityData.longitude
  )

  return {weatherData, cityData};
}
async function getCityInfo (city) {
  const response = await fetch( 
    `https://geocoding-api.open-meteo.com/v1/search?name=${city}`
  );

  checkServerError(response.status);
  const geoData = await response.json();
  if (!geoData.results || geoData.results.length === 0) {
    showNotFound();
    throw new Error("City not found")
  }

  const place = geoData.results[0];

  return place;
}

async function getWeatherInformation(e) {
  if (e) e.preventDefault();
  if (contentContainer.classList.contains("hidden")) hideNotFound();

  const input = document.querySelector("input").value;

  const {weatherData, cityData} = await getWeatherByCity(input);

  global.lastCity = input;
  global.currentLocation = null;

  cityInput.value = ""
  hideCityDropdown();
  updateWeatherUI(weatherData, cityData)
}

async function refetchLastCity() {
  if (!global.lastCity && ! global.currentLocation) return;

  let weatherData, cityData;

  if (global.lastCity) {
    const result = await getWeatherByCity(global.lastCity)
    weatherData = result.weatherData;
    cityData = result.cityData;
  } else if (global.currentLocation) {
    weatherData = await fetchWeatherData (
      global.currentLocation.latitude,
      global.currentLocation.longitude
    )
    cityData = {
      name: " Current Location",
      country: "",
    }
  }
  updateWeatherUI(weatherData, cityData)
}

function changeTemperatureUnits(e) {
  const item = e.target.closest('.units-dropdown-item');
  if (!item) return;

  const items = dropdownTemperature.querySelectorAll('.units-dropdown-item');
  items.forEach((unit) => {
    unit.classList.remove('checked');
    const ch = unit.querySelector('.icon-checked');
    if (ch) ch.classList.add('hidden');
  });

  item.classList.add('checked');
  const ch = item.querySelector('.icon-checked');
  if (ch) ch.classList.remove('hidden');

  const canonical = item.dataset.unit || getCanonicalUnit('temperature', item.textContent);
  global.units.temperature = canonical;

  refetchLastCity();
}
function changeWindSpeedUnits(e) {
  const item = e.target.closest('.units-dropdown-item');
  if (!item) return;

  const items = dropdownWindSpeed.querySelectorAll('.units-dropdown-item');
  items.forEach((unit) => {
    unit.classList.remove('checked');
    const ch = unit.querySelector('.icon-checked');
    if (ch) ch.classList.add('hidden');
  });

  item.classList.add('checked');
  const ch = item.querySelector('.icon-checked');
  if (ch) ch.classList.remove('hidden');

  const canonical = item.dataset.unit || getCanonicalUnit('windSpeed', item.textContent);
  global.units.windSpeed = canonical;

  refetchLastCity();
}
function changePrecipitationUnits(e) {
  const item = e.target.closest('.units-dropdown-item');
  if (!item) return;

  const items = dropdownPrecipitation.querySelectorAll('.units-dropdown-item');
  items.forEach((unit) => {
    unit.classList.remove('checked');
    const ch = unit.querySelector('.icon-checked');
    if (ch) ch.classList.add('hidden');
  });

  item.classList.add('checked');
  const ch = item.querySelector('.icon-checked');
  if (ch) ch.classList.remove('hidden');

  const canonical = item.dataset.unit || getCanonicalUnit('precipitation', item.textContent);
  global.units.precipitation = canonical;

  refetchLastCity();
}

function switchUnits () {

  const targetSystem =
		global.currentSystem === 'metric' ? 'imperial' : 'metric';

	if (targetSystem === 'imperial') {
		switchUnitsBtn.textContent = `Switch to Metric`;
	} else {
		switchUnitsBtn.textContent = `Switch to Imperial`;
	}

	const tempBtns = document.querySelectorAll('.unit-temperature');
	tempBtns.forEach((btn) => {
		const btnText = btn.textContent.trim();
		if (btnText.includes(unitSystem[targetSystem].temperature)) btn.click();
	});

	const windSpeedBtns = document.querySelectorAll('.unit-wind-speed');
	windSpeedBtns.forEach((btn) => {
		const btnText = btn.textContent.trim();
		if (btnText.includes(unitSystem[targetSystem].windSpeed)) btn.click();
	});

	const precipitationBtns = document.querySelectorAll('.unit-precipitation');
	precipitationBtns.forEach((btn) => {
		const btnText = btn.textContent.trim();
		if (btnText.includes(unitSystem[targetSystem].precipitation)) btn.click();
	});

	global.currentSystem = targetSystem;
}













function iconSelector(weatherCode) {
  switch (weatherCode) {
    case (0, 1):
      return "assets/images/icon-sunny.webp";
    case 2:
      return "assets/images/icon-partly-cloudy.webp";
    case 3:
      return "assets/images/icon-overcast.webp";
    case (45, 48):
      return "assets/images/icon-fog.webp";
    case (51, 53, 55, 56, 57):
      return "assets/images/icon-drizzle.webp";
    case (61, 63, 65, 67, 80, 81, 82):
      return "assets/images/icon-rain.webp";
    case (71, 73, 75, 77, 85, 86):
      return "assets/images/icon-snow.webp";
    case (95, 96, 99):
      return "assets/images/icon-storm.webp";
    default:
      return "assets/images/icon-sunny.webp";
  }
}

function mainForecastInformation(weatherData, cityData) {
  temperatureText.textContent = `${Math.round(
    weatherData.current.temperature_2m
  )} \u00B0`;
  temperatureIcon.src = iconSelector(weatherData.current.weather_code);
  locationText.textContent = `${cityData.name}, ${cityData.country}`;
  console.log(weatherData.current)
  const today = new Date();
  const options = {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  };
  dateText.textContent = today.toLocaleDateString("en-US", options);

  feelsLike.textContent = `${Math.round(
    weatherData.current.apparent_temperature
  )} \u00B0`;

  humidity.textContent = `${weatherData.current.relative_humidity_2m}%`;

  wind.textContent = `${Math.round(weatherData.current.wind_speed_10m)} ${
    global.units.windSpeed === "km/h" ? "km/h" : "mph"
  }`;

  precipitation.textContent = `${Math.round(
    weatherData.current.precipitation
  )} ${global.units.precipitation === "millimeters" ? "mm" : "in"}`;
}

function getNext7Days() {
  const days = [];
  const options = { weekday: "short" };

  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(today.getDate() + i);
    days.push(date.toLocaleDateString("en-US", options));
  }

  return days;
}

function dailyForecastIcon(weatherCode) {
  const img = document.createElement("img");
  img.classList.add("weather-icon");
  img.src = iconSelector(weatherCode);

  return img;
}

function dailyForecastDiv(classes, content) {
  const dayDiv = document.createElement("div");
  dayDiv.className = classes;
  dayDiv.textContent = content;

  return dayDiv;
}

function dailyForecastInformation(weatherData) {
  const days = getNext7Days();
  const { daily } = weatherData;

  document.querySelector(".daily-forecast").innerHTML = ``;

  for (let i = 0; i < 7; i++) {
    const divCard = document.createElement("div");
    divCard.classList.add("daily-forecast-item");

    const divDay = dailyForecastDiv(["day"], days[i]);
    const img = dailyForecastIcon(daily.weather_code[i]);
    const divTempRange = document.createElement("div");
    divTempRange.classList.add("temp-range");
    const tempMin = dailyForecastDiv(
      "temperature low",
      `${Math.round(daily.temperature_2m_min[i])} \u00B0`
    );
    const tempMax = dailyForecastDiv(
      "temperature high",
      `${Math.round(daily.temperature_2m_max[i])} \u00B0`
    );
    divTempRange.append(tempMax, tempMin);
    divCard.append(divDay, img, divTempRange);
    document.querySelector(".daily-forecast").appendChild(divCard);
  }
}

function getNext8Hours(hourlyData) {
  const now = new Date();
  const currentHour = now.getHours();
  const hoursToShow = 8;
  const hoursForecast = [];

  for (let i = 0; i < hoursToShow; i++) {
    const index = currentHour + i;
    if (index < hourlyData.time.length) {
      hoursForecast.push({
        time: hourlyData.time[index],
        temperature: hourlyData.temperature_2m[index],
        weatherCode: hourlyData.weather_code[index],
      });
    }
  }
  return hoursForecast;
}

function generateDaysOption() {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  return days
    .map(
      (day, index) =>
        ` <button class="day-option" data-day="${index}">${day}</button>`
    )
    .join(" ");
}

function hourlyForecastInformation(weatherData) {
  const { hourly } = weatherData;
  const container = document.querySelector(".right-content-container");

  const today = new Date();
  const currentDay = today.toLocaleDateString("en-US", { weekday: "long" });

  const iconDropdownSrc = "assets/images/icon-dropdown.svg"
  container.innerHTML = `
  <div class="hourly-forecast-header">
              <h3 class="hourly-forecast-title">Hourly Forecast</h3>
              <div class="day-selector">
                <button id="day-selector-btn" class="day-selector-button">
                  <span class="selected-day"> ${currentDay} </span>
                  <img
                    src="${iconDropdownSrc}"
                    alt="dropdown"
                    class="hourly-dropdown-icon"
                  />
                </button>
                <div id="day-selector-dropdown" class="day-selector-dropdown hidden">
                  ${generateDaysOption()}
                </div>
              </div>
            </div>
  `;
  const todayHours = getHoursForDay(hourly, today.getDay());
  appendHourlyForecastCards(container, todayHours);
  setupDaySelector(container, hourly);
}

function getHoursForDay(hourlyData, dayIndex) {
  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.getDay();

  const hourlyForecast = [];

  for (let i = 0; i < hourlyData.time.length; i++) {
    const date = new Date(hourlyData.time[i]);

    if (date.getDay() === dayIndex) {
      if (dayIndex === currentDay) {
        const hour = date.getHours();
        if (hour >= currentHour && hourlyForecast.length < 8) {
          hourlyForecast.push({
            time: hourlyData.time[i],
            temperature: hourlyData.temperature_2m[i],
            weatherCode: hourlyData.weather_code[i],
          });
        }
      } else if (hourlyForecast.length < 8) {
        hourlyForecast.push({
          time: hourlyData.time[i],
          temperature: hourlyData.temperature_2m[i],
          weatherCode: hourlyData.weather_code[i],
        });
      }
    }
    if (hourlyForecast.length >= 8) {
      break;
    }
  }

  return hourlyForecast;
}

function appendHourlyForecastCards(container, hours) {
  const existingCards = container.querySelectorAll(".hourly-weather-card");
  existingCards.forEach((card) => card.remove());

  hours.forEach((hour) => {
    const card = createHourlyForecastCard(hour);
    container.appendChild(card);
  });
}

function createHourlyForecastCard(hourData) {
  const card = document.createElement("div");
  card.classList.add("hourly-weather-card");

  const timeDiv = document.createElement("div");
  timeDiv.classList.add("hourly-forecast-time");
  const icon = document.createElement("img");
  icon.classList.add("hourly-weather-icon");
  icon.src = iconSelector(hourData.weatherCode);

  const time = document.createElement("div");
  time.classList.add("hour");
  time.textContent = formatHour(hourData.time);

  timeDiv.append(icon, time);

  const tempDiv = document.createElement("div");
  tempDiv.classList.add("hourly-forecast-temperature");
  tempDiv.textContent = `${Math.round(hourData.temperature)} \u00B0`;

  card.append(timeDiv, tempDiv);
  return card;
}

function formatHour(timeString) {
  const date = new Date(timeString);
  const hours = date.getHours();

  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;

  return `${displayHour} ${period}`;
}

function setupDaySelector(container, hourlyData) {
  const daySelectorDropdown = container.querySelector("#day-selector-dropdown");
  const daySelectorBtn = container.querySelector("#day-selector-btn");
  const dayOptions = container.querySelectorAll(".day-option");
  const today = new Date().getDay();

  daySelectorBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    daySelectorDropdown.classList.toggle("hidden");
  });

  dayOptions.forEach((option) => {
    option.addEventListener("click", (e) => {
      const selectedDay = parseInt(option.dataset.day);
      const dayName = option.textContent.trim();

      container.querySelector(".selected-day").textContent = dayName;

      const hoursForSelectedDay = getHoursForDay(hourlyData, selectedDay);
      appendHourlyForecastCards(container, hoursForSelectedDay);

      daySelectorDropdown.classList.add("hidden");
    });
  });

  document.addEventListener("click", (e) => {
    if (!container.querySelector(".day-selector").contains(e.target)) {
      daySelectorDropdown.classList.add("hidden");
    }
  });
}

function updateWeatherUI(weatherData, cityData) {
  mainForecastInformation(weatherData, cityData);
  dailyForecastInformation(weatherData);
  hourlyForecastInformation(weatherData);

  setTimeout(hideLoading, 100);
}

function init() {
  dropdownWindSpeed.addEventListener("click", changeWindSpeedUnits);
  dropdownPrecipitation.addEventListener("click", changePrecipitationUnits);
  dropdownTemperature.addEventListener("click", changeTemperatureUnits)
  searchForm.addEventListener("submit", getWeatherInformation);
  switchUnitsBtn.addEventListener("click", switchUnits)
  retryBtn.addEventListener("click", retrySearch)
  cityInput.addEventListener("input", handleCitySearch);
  window.addEventListener("click", closeDropdowns);
  navigator.geolocation.getCurrentPosition(success, error, options);
}
init();
