
const weatherForm = document.querySelector('.weatherForm');
const cityInput = document.querySelector('.cityInput');
const card = document.querySelector('.card');
const themeToggle = document.getElementById('themeToggle');
const API_KEY = "9ff2e4ca99981cadaac34e33559e7d91";

weatherForm.addEventListener('submit', async (event) => {
  event.preventDefault();

   const city = cityInput.value.trim();
    cityInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
       getWeatherData();
     }
});
  if (city) {
    try {
      const weatherData = await getWeatherData(city);
      displayWeatherInfo(weatherData);
      saveLastCity(city);
    } catch (err) {
      console.error('Failed to fetch WeatherData:', err);
      displayError(err.message || err);
    }

  } else {
    displayError('Please Enter a City');
  }

});


async function getWeatherData(query){
  try{
    let apiUrl = '';
    if (query && typeof query === 'object' && 'lat' in query && 'lon' in query) {
      apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${query.lat}&lon=${query.lon}&appid=${API_KEY}`;
    } else {
      const city = encodeURIComponent(String(query || ''));
      apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}`;
    }

    const response = await fetch(apiUrl);
    if(!response.ok){
         throw new Error("Network Response Was Not Ok!");
    }
    const data = await response.json();
    console.log(data);
    setWeatherBackground(data);
    return data;

  } catch(err){
    console.error('Failed to Fetch theData:', err);
    throw err;
  }

}

function displayWeatherInfo(data){
  const {name: cityName,
   main: {temp, humidity, pressure},
   wind:{speed},
   weather: [{description, id}]} = data;

     card.textContent = "";
     card.style.display = "flex";
    
     const cityDisplay = document.createElement('h1');
     const tempDisplay = document.createElement('p');
     const humidityDisplay = document.createElement('p');
     const descDisplay = document.createElement('p');
     const weatherEmoji = document.createElement('p');
    const AirSpeedDisplay = document.createElement('p');
    const pressureDisplay = document.createElement('p');
      
     cityDisplay.textContent = `City: ${cityName}`;
     tempDisplay.textContent = `Tempreture: ${(temp - 273.15).toFixed(1)}°C`;  //In °F (temp - 273.15)* (9/5) + 32
     humidityDisplay.textContent = `Humidity: ${humidity}%`;
     descDisplay.textContent = `${description}`;
     weatherEmoji.textContent = `${displayEmoji(id)}`;
     AirSpeedDisplay.textContent = `Wind: ${(Number(speed) * 3.6).toFixed(1)} km/h`;
     pressureDisplay.textContent = `AirPressure: ${pressure} hPa`;

     cityDisplay.classList.add('cityDisplay');
     tempDisplay.classList.add('tempDisplay');
     humidityDisplay.classList.add('humidityDisplay');
     descDisplay.classList.add('descDisplay');
     weatherEmoji.classList.add('weatherEmoji');
     AirSpeedDisplay.classList.add('speedDisplay');
     pressureDisplay.classList.add('pressureDisplay');

     card.appendChild(cityDisplay);
     card.appendChild(tempDisplay);
     card.appendChild(humidityDisplay);
     card.appendChild(descDisplay);
     card.appendChild(weatherEmoji);
     card.appendChild(AirSpeedDisplay);
     card.appendChild(pressureDisplay);
}

function displayEmoji(weatherID){

   switch(true){
    case(weatherID >=200 && weatherID < 300):
    return "🌩️";
    case(weatherID >=300 && weatherID < 400):
    return "🌦️";
    case(weatherID >=500 && weatherID < 600):
    return "🌧️";
    case(weatherID >=600 && weatherID < 700):
    return "🌨️";
    case(weatherID >=700 && weatherID < 800):
    return "🌫️";
    case(weatherID === 800):
    return "☀️";
    case(weatherID >=801 && weatherID < 810):
    return "☁️";
    default:
      return "🌈";
   }

}

function displayError(message){

    const errorDisplay = document.createElement('p');
    errorDisplay.textContent = message;
    errorDisplay.classList.add('weatherError');

    card.textContent = "";
    card.style.display = "flex";
    card.appendChild(errorDisplay);

}

function setWeatherBackground(data) {
  const body = document.body;
  if (!data || !data.weather || !data.weather[0]) {
    body.style.backgroundImage = '';
    return;
  }
  const id = data.weather[0].id;
  const day = isDayTime(data);
  let fileName = 'Clear Day.jpg';
  if (id >= 200 && id < 300) {
    fileName =  day ? 'Thenderstorm.jpg' : 'Thenderstorm-Night.jpg';
  } else if (id >= 300 && id < 600) {
    fileName = day ? 'Rain.jpg' : 'Raining-night.jpg';
  } else if (id >= 600 && id < 700) {
    fileName = day ? 'Snow-Day.jpg' : 'Snow-night.jpg';
  } else if (id >= 700 && id < 800) {
    fileName = day ? 'Atmosphere.jpg' : 'Atmosphere-Night.jpg';
  } else if (id === 800) {
    fileName = day ? 'Clear Day.jpg' : 'Night-Dark.jpg';
  } else if (id > 800) {
    fileName = 'Cloudy.jpg';
  }
  const path = encodeURI(`assets/${fileName}`);
  body.style.backgroundImage = `url("${path}")`;
  body.style.backgroundSize = '100% 100%';
  body.style.backgroundPosition = 'center';
  body.style.backgroundRepeat = 'no-repeat';
  body.style.transition = 'background-image 0.5s ease-in-out';
  body.style.backgroundAttachment = 'fixed';
}

function isDayTime(data) {
  if (!data) return true;
  const currentTime = data.dt;
  const morning = data.sys.sunrise;
  const evening = data.sys.sunset;
  if (currentTime >= morning && currentTime < evening) {
    return true; 
  } else{
    return false;
  } 
}

function saveLastCity(city){
  try{
    if(city) localStorage.setItem('lastCity', city);
  } 
  catch(e){
    console.warn('Could not save last city', e);
  }
}

function loadLastCity(){
  try{
    return localStorage.getItem('lastCity');
  } 
  catch(e){ 
    return null;
  }
}

function detectLocation(){
  if(!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(async (pos)=>{
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    try{
      const data = await getWeatherData({lat, lon});
      displayWeatherInfo(data);
    } 
    catch(err){
      console.warn('Geolocation weather fetch failed', err);
    }
  }, (err)=>{
    console.warn('Geolocation denied or failed', err);
  }, {timeout:10000});
}

async function init(){
  const savedTheme = loadTheme() || 'light';
  applyTheme(savedTheme);
  setupThemeToggle();
  const last = loadLastCity();
  if(last){
    cityInput.value = last;
    try{
      const data = await getWeatherData(last);
      displayWeatherInfo(data);
    }
    catch(err){
      console.warn('Failed loading last city weather', err);
    }
    return;
  }

  detectLocation();
}
init();

function saveTheme(theme){
  try{ 
    if(theme) localStorage.setItem('theme', theme); 
  } catch(e){
    console.warn('Could not save theme', e);
  } 
}

function loadTheme(){
  try{ 
    return localStorage.getItem('theme'); 
  }
  catch(e){ 
    return null; 
  }
}

function applyTheme(theme){
  const isDark = theme === 'dark';
  document.body.classList.toggle('dark-mode', isDark);
  if(themeToggle) {
    themeToggle.textContent = isDark ? '☀️' : '🌙';
  }
}

function setupThemeToggle(){
  if(!themeToggle) return;
  themeToggle.addEventListener('click', ()=>{
    const current = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    saveTheme(next);
  });
}