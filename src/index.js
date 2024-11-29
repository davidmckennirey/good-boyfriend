import { AutoRouter } from 'itty-router';

const router = AutoRouter();

// Function to fetch the weather
async function fetchWeather(env) {
	const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=47.6062&lon=-122.3321&appid=${env.WEATHER_API_KEY}&units=imperial`
	const weatherResponse = await fetch(weatherUrl)
	const weatherData = await weatherResponse.json()
	return weatherData
}

// Function to generate a campy good morning message using Cloudflare Workers AI
async function getMorningMessageWithWorkersAI(env, weatherDescription) {
	const prompt = `Write a sweet good morning message for my girlfriend that also gives her a weather update (including helpful things like wearing a raincoat if its raining, or staying shady if its hot). The weather for today is: ${weatherDescription}\n\nDo not include any foreword, just give me the message directly. Do not make it overly romantic, keep it light and fun. Keep it to a maximum of 200 characters. Use one or two emojis to make it fun! Do not make any plans in the message.`;
	const modelId = '@cf/meta/llama-3.1-8b-instruct';
	const response = await env.AI.run(modelId, { prompt: prompt });
	return response.response.trim().replace(/^"(.*)"$/, '$1');
}

// Function to generate a campy good morning message
async function getMorningMessage(env, weatherDescription) {
	return await getMorningMessageWithWorkersAI(env, weatherDescription);
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
	const weatherDescription = `${weatherData.weather[0].description}, with a high of ${Math.round(weatherData.main.temp)}°F.`;

	const goodMorningMessage = await getMorningMessage(env, weatherDescription);

	const sendSuccess = await sendNotification(env, goodMorningMessage);

	if (sendSuccess) {
		console.log('Message sent successfully!');
	} else {
		console.error('Failed to send the message!');
	}
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

