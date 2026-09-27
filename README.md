# FlockSpot

FlockSpot is a privacy-first Next.js app for finding publicly mapped surveillance-camera locations and checking whether a user is nearby.

## What it does

- Displays mapped camera locations on a MapLibre map.
- Uses browser geolocation for local proximity checks.
- Alerts the user when a mapped camera is within the selected distance.
- Shows nearby cameras and their public metadata.
- Supports a manual location for testing.
- Provides an OpenStreetMap contribution workflow for new locations.
- Stores preferences and alert cooldowns locally in the browser.
- Does not maintain a user account, location history, or proprietary camera database.

## Camera data

The browser calls the lightweight `/api/spots` route hosted by Vercel. That route:

1. Fetches the public DeFlock dataset and filters it server-side to the requested geographic radius.
2. Falls back to OpenStreetMap Overpass if DeFlock is unavailable or has no matching cameras.
3. Returns only the normalized nearby camera records needed by the browser.

This keeps the large public dataset out of the client bundle and avoids asking the browser to download and parse an entire worldwide GeoJSON file.

The Vercel route is a serverless function, not a persistent application backend or database.

## Privacy

FlockSpot does not send a location history to a FlockSpot database. Browser location is used to request a nearby camera set and to perform the actual proximity calculation on the device.

The camera query necessarily includes the requested coordinates so the public-data lookup can be performed. No user account is required and no location history is retained by FlockSpot.

## Alerts

The default alert distance is 500 feet. Available distances are 250, 500, 1,000, and 2,500 feet.

Browser notifications are optional. Like other browser geolocation applications, reliable monitoring while a tab or device is completely closed is limited by the browser and operating system.

## Add a camera

The Add workflow checks for an existing mapped camera within 50 feet, then directs the user to OpenStreetMap for the actual public map edit. FlockSpot does not put an OAuth client secret in browser code.

## Configuration

Optional environment variables:

```bash
NEXT_PUBLIC_APP_NAME=FlockSpot
```

No secret environment variable is required for the normal deployment.

## Local development

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Vercel deployment

Import the repository into Vercel as a Next.js project and deploy. No database or persistent server is required.

## Project structure

- `app/page.tsx` — map UI, controls, proximity behavior
- `app/globals.css` — lightweight application styling
- `app/api/spots/route.ts` — public camera-data proxy/filter/fallback
- `config/config.ts` — map and application configuration
- `lib/geo.ts` — distance and GeoJSON helpers
- `lib/notifications.ts` — browser notification helper
- `lib/overpass.ts` — client API wrapper
- `lib/storage.ts` — localStorage helper
- `types/spot.ts` — normalized camera and location types
