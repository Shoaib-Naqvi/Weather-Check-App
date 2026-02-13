const fetch = require("node-fetch");
exports.handler = async (event, context) => {
  const API_KEY = process.env.API_KEY;

  const { q, lat, lon, units, type } = event.queryStringParameters;

  if (!API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "API_KEY environment variable is not set.",
      }),
    };
  }

  try {
    let baseUrl = "https://api.openweathermap.org/data/2.5/";
    let endpoint = type === "forecast" ? "forecast" : "weather";
    let url = `${baseUrl}${endpoint}?appid=${API_KEY}&units=${units || "metric"}`;

    if (q) {
      url += `&q=${encodeURIComponent(q)}`;
    } else if (lat && lon) {
      url += `&lat=${lat}&lon=${lon}`;
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Missing query parameters (q or lat/lon).",
        }),
      };
    }

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify(data),
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to fetch data from OpenWeatherMap.",
        details: error.message,
      }),
    };
  }
};
