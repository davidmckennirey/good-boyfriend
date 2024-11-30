# Good Boyfriend
I want to be a good boyfriend and send my girlfriend the weather (where ever she is) along with a warm good morning message. However, I am also a nerd with a intrinsic desire to automate everything. So I wrote a bot that will pull the current weather for my girlfriends (saved) location and, using the magic of *AI*, will generate me a "good morning" weather update for her.

She thinks its hilarious.

## Running this yourself

If you to wish to automate the task of being a good partner/SO/friend you will need the following.

1. **Cloudflare account** (free). This bot was designed to be run on Cloudflare Workers using Cloudflare Workers AI to generate the message.
2. **OpenWeatherMap API Key** (requires card but free). This is how you will get the weather for your person's current location, your usage will be far below the threshold where this will cost money.
3. **Pushover API Key** (one-time purchase). This is how you will recieve the good morning message (so you can be the one to text it to your person).
4. **Google Developer Account** (requires card but free). Specifically, you need an API Key that has access to Google's geocoding API, which is used to convert a location into lat/lon for OpenWeatherMap. Your usage will be far below the threshold where this will cost money.

You have to then save these secrets to your Cloudflare Workers project, which you can read about [here](https://developers.cloudflare.com/workers/configuration/secrets/).

### Scheduled Messages

I use cron triggers to run this every morning at 5am my time, more information [here](https://developers.cloudflare.com/workers/configuration/cron-triggers/).

### Updating Their Location

If wish to be able to update your partner's location, then you can call the `/update-location` endpoint to save their new location to Cloudflare's KV storage. An example `curl` request for doing this is shown below:

```
curl -X POST https://YOUR-WORKER-NAME.YOUR-CF-ACCOUNT.workers.dev/update-location \
-H "Content-Type: application/json" \
-d '{"location":"Seattle WA"}'
```

The location doesn't have to be well formatted, it will call the Google Maps Geocoding API to convert the provided string into a lat, lon, & city/locality name that gets persisted and used for subsequent good morning messages. Calling this endpoint will also generate a new good morning message.
