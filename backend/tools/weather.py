def get_weather(city: str) -> dict:
    weather_data = {
        "mumbai":  {"city": "Mumbai",  "temp_celsius": 31, "condition": "Partly Cloudy", "humidity": 72},
        "london":  {"city": "London",  "temp_celsius": 12, "condition": "Overcast",       "humidity": 85},
        "new york":{"city": "New York","temp_celsius": 18, "condition": "Clear",           "humidity": 55},
        "delhi":   {"city": "Delhi",   "temp_celsius": 28, "condition": "Hazy",            "humidity": 60},
    }
    city_lower = city.lower().strip()
    for key in weather_data:
        if key in city_lower:
            return {"status": "ok", "weather": weather_data[key]}
    return {"status": "ok", "weather": {"city": city, "temp_celsius": 22, "condition": "Unknown", "humidity": 50}}