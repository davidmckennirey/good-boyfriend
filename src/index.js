import { AutoRouter } from 'itty-router';

const router = AutoRouter();

// Function to fetch the weather
async function fetchWeather(env) {
	const location = await getLocation(env);
	const weatherUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${location.lat}&lon=${location.lon}&appid=${env.WEATHER_API_KEY}&units=imperial&exclude=current,minutely,hourly,alerts`;
	const weatherResponse = await fetch(weatherUrl);
	if (!weatherResponse.ok) throw new Error('Failed to fetch weather');
	return await weatherResponse.json();
}

// Function to generate a good morning message using ~AI~
async function getMorningMessage(env, weatherDescription) {
	const location = await getLocation(env);
	const prompt = `${env.PROMPT_INSTRUCTIONS}\n\nInclude the current city, which is ${location.city}.\nThe weather for today (from https://openweathermap.org/api/one-call-3) is: ${JSON.stringify(weatherDescription.daily[0])}`;
	const response = await env.AI.run(env.MODEL_ID, { prompt: prompt });
	return response.response.trim();
}

// Function to send the message via Pushover API
async function sendNotification(env, message) {
	const pushoverUrl = 'https://api.pushover.net/1/messages.json';
	const response = await fetch(pushoverUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			token: env.PUSHOVER_APP_TOKEN,
			user: env.PUSHOVER_USER_KEY,
			message: message
		})
	});
	return response.status === 200;
}

// Main function to handle the boyfriend duties
async function handleBoyfriendDuties(env) {
	const weatherData = await fetchWeather(env);
	const goodMorningMessage = await getMorningMessage(env, weatherData);
	const sendSuccess = await sendNotification(env, goodMorningMessage);

	if (sendSuccess) {
		console.log('Message sent successfully!');
	} else {
		console.error('Failed to send the message!');
	}
}

// Function to get my girlfriend's stored location from KV
async function getLocation(env) {
	const location = await env.GIRLFRIEND_LOCATION.get('location');
	return JSON.parse(location);
}

// Function to fetch lat/lon and city from Google Maps API
async function fetchLatLonFromLocation(env, location) {
	const mapsApiUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${env.GOOGLE_MAPS_API_KEY}`;
	const response = await fetch(mapsApiUrl);
	if (!response.ok) throw new Error('Failed to fetch geolocation');
	const data = await response.json();
	if (data.status !== 'OK' || !data.results.length) {
		throw new Error(`Geolocation failed: ${data.status}`);
	}
	const result = data.results[0];
	const lat = result.geometry.location.lat;
	const lon = result.geometry.location.lng;
	const city = result.address_components.find(component => component.types.includes("locality"))?.long_name || 'Unknown City';
	return { lat, lon, city };
}

// Function to update my girlfriend's location in KV
async function updateLocation(env, lat, lon, city) {
	const newLocation = JSON.stringify({ lat, lon, city });
	await env.GIRLFRIEND_LOCATION.put('location', newLocation);
}

// Setting up the Cloudflare Worker router to respond to requests
router.get('/', async (request, env, ctx) => {
	return new Response('Hello! Your worker is up and running!', { status: 200 });
});

// Endpoint to manually trigger the flow during development
router.get('/trigger', async (request, env, ctx) => {
	await handleBoyfriendDuties(env);
	return new Response('Flow triggered successfully!', { status: 200 });
});

router.post('/update-location', async (request, env) => {
	try {
		const { location } = await request.json();

		if (typeof location !== 'string' || !location.trim()) {
			return new Response('Invalid location input', { status: 400 });
		}

		const { lat, lon, city } = await fetchLatLonFromLocation(env, location);
		await updateLocation(env, lat, lon, city);
		await handleBoyfriendDuties(env);
		return new Response('Location updated successfully', { status: 200 });
	} catch (error) {
		console.error('Error updating location:', error);
		return new Response('Failed to update location', { status: 500 });
	}
});

export default {
	...router,
	async scheduled(event, env, ctx) {
		try {
			await handleBoyfriendDuties(env);
			console.log('Scheduled task executed successfully!');
		} catch (error) {
			console.error('Error executing scheduled task:', error);
		}
	}
};
