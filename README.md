# FlockSpot

FlockSpot is a privacy-first, frontend-only web app for finding mapped surveillance camera locations and checking whether the user is nearby. It is intentionally lightweight, runs as a standard Next.js app, and keeps location processing on-device.

## What FlockSpot does

- Shows mapped camera Spots on an interactive MapLibre map.
- Uses browser geolocation to determine the user’s approximate current location.
- Alerts the user when they come within a configured distance of a mapped Spot.
- Lets the user inspect nearby cameras and view metadata.
- Provides a Spot submission flow that warns on duplicates and points the user toward the public OpenStreetMap OAuth workflow.
- Keeps every proximity calculation local to the browser and does not rely on a custom backend.

## How map and DeFlock / OSM data are used

You do not have to use OpenStreetMap as the basemap provider. FlockSpot currently uses a free, no-key CARTO raster basemap with labels removed, which is intentionally simple and still credits the underlying OpenStreetMap data. The map renderer is MapLibre, so the basemap can be replaced later without changing the camera logic.

FlockSpot uses the public DeFlock / OpenStreetMap ecosystem as the source of mapped camera data, but it does not host or maintain a proprietary database. The app includes a central `config` value, `deflockTileUrl`, so the public tile source can be replaced later without spreading it through the codebase.

In practice, the app is designed to be compatible with public vector-tile or viewport-based map data feeds and keeps the data access abstracted behind a configuration constant. This keeps the app deployable as a static frontend while making it straightforward to swap a source later. The map's Light/Dark setting changes the basemap treatment without requiring a paid map-style account.

## How proximity alerts work

- The app requests geolocation when needed.
- It evaluates only nearby Spots rather than every map feature.
- Proximity is calculated locally in the browser.
- The default alert distance is 500 feet and can be set to 250, 500, 1,000, or 2,500 feet.
- A simple local cooldown prevents notification spam for the same Spot until the user moves far enough away.
- Alerts can be disabled from the Settings screen.

## What data stays on the user’s device

The following data remains entirely on the device:

- user location
- alert settings
- local alert cooldown state
- recent local preferences
- geodesic proximity calculations

FlockSpot does not send user location history to a FlockSpot server, maintain a location database, or create user accounts.

## How users submit new Spots

The application supports an Add Spot workflow that:

1. Lets the user choose a location or use the current GPS position.
2. Checks for nearby existing Spots with a 50-foot duplicate radius.
3. Shows a warning for likely duplicates.
4. Directs the user toward the real OpenStreetMap OAuth registration flow.

Important limitation: OpenStreetMap OAuth for write access requires a confidential client secret. That secret cannot safely live in browser JavaScript or in a public Next.js client build. Because of that, the app does not attempt to masquerade as a confidential client. Instead, it clearly explains the limitation and redirects the user to the official OSM registration page for the secure OAuth flow.

## Configuration

Edit the values in `config/config.ts` and optionally set a public tile URL in `.env.example`.

Recommended public environment variable pattern:

```bash
NEXT_PUBLIC_DEFLOCK_TILE_URL=https://maps.deflock.org/tiles/deflock/{z}/{x}/{y}.pbf
```

Do not place OAuth client secrets in:

- `.env`
- `NEXT_PUBLIC_*`
- source code
- GitHub
- browser localStorage

## Deploying to Vercel

1. Push the project to GitHub.
2. Import the repository into Vercel.
3. Keep the framework preset as Next.js.
4. Deploy without adding a custom database or backend.
5. Confirm the build passes and the app loads with the browser geolocation permission flow.

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Browser limits and honest UX

Nearby alerts work while the app is open and the browser has location access. Background alerts may be limited by the browser and device operating system; this app does not pretend otherwise.

Notifications are also optional and only work when the browser supports them and the user grants permission.

## Security and privacy notes

- No user accounts
- No email collection
- No location history upload
- No proprietary data layer
- No custom backend
- No secret material in public client-side code

## Project structure

- `app/page.tsx` — main interface
- `app/layout.tsx` — app shell
- `config/config.ts` — central configuration
- `lib/geo.ts` — proximity and distance helpers
- `lib/notifications.ts` — browser notification helper
- `lib/storage.ts` — local storage access
- `types/spot.ts` — normalized Spot data type

## Limitations

This application is intentionally frontend-only and therefore does not provide server-side background tracking or a reliable closed-app location monitor. It also does not claim to have a secure browser-based OSM write flow when a confidential OAuth secret is required.

That is the correct tradeoff for a static app that stays low-cost and privacy-focused.
