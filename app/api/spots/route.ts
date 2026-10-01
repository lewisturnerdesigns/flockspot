import { distanceBetweenMeters } from "@/lib/geo";
import type { Spot } from "@/types/spot";

const DEFLOCK_DATASET_URL = "https://deflockdata.dontgetflocked.com/sharing-network-nodes.geojson";
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];
const MAX_QUERY_RADIUS_METERS = 300 * 1609.344;
const OVERPASS_CHUNK_RADIUS_METERS = 50_000;
const DUPLICATE_COORDINATE_PRECISION = 5;
const OVERPASS_RETRIES = 2;

type GeoJsonFeature = {
  geometry?: { coordinates?: unknown };
  properties?: Record<string, unknown>;
};

type OverpassElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
};

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseDirection(value: unknown): number | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return (numeric + 360) % 360;

  return {
    N: 0,
    NE: 45,
    E: 90,
    SE: 135,
    S: 180,
    SW: 225,
    W: 270,
    NW: 315,
  }[String(value).trim().toUpperCase()];
}

function toDeFlockSpot(feature: GeoJsonFeature, index: number): Spot | null {
  const coordinates = feature.geometry?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;

  const longitude = Number(coordinates[0]);
  const latitude = Number(coordinates[1]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const props = feature.properties ?? {};
  if (props.isJunk === true) return null;

  const id = asString(props.id) ?? `${latitude.toFixed(6)}-${longitude.toFixed(6)}-${index}`;
  const city = asString(props.city);
  const state = asString(props.state);
  const type = asString(props.type);

  return {
    id: `deflock-${id}`,
    latitude,
    longitude,
    type: type ? `DeFlock ${type}` : "Flock camera",
    manufacturer: asString(props.manufacturer) ?? "Flock Safety",
    operator: [city, state].filter(Boolean).join(", ") || "Public dataset",
    direction: parseDirection(props.direction),
    source: "DeFlock public dataset",
    name: asString(props.name) ?? ([city, state].filter(Boolean).join(", ") || "Mapped camera"),
    updatedAt: new Date().toISOString(),
  };
}

function toOverpassSpot(element: OverpassElement): Spot | null {
  const latitude = element.lat ?? element.center?.lat;
  const longitude = element.lon ?? element.center?.lon;
  if (typeof latitude !== "number" || typeof longitude !== "number") return null;

  const tags = element.tags ?? {};
  return {
    id: `osm-${element.type}-${element.id}`,
    latitude,
    longitude,
    type: tags["surveillance:type"] ?? tags["camera:type"] ?? "ALPR",
    manufacturer: tags.manufacturer,
    operator: tags.operator,
    direction: parseDirection(tags.direction),
    source: "OpenStreetMap / Overpass",
    name: tags.name ?? tags.ref ?? "Mapped camera",
    updatedAt: new Date().toISOString(),
  };
}

function filterNearby(spots: Spot[], latitude: number, longitude: number, radiusMeters: number) {
  const origin = { latitude, longitude };
  return spots.filter((spot) => distanceBetweenMeters(origin, spot) <= radiusMeters);
}

function coordinateKey(spot: Spot) {
  return `${spot.latitude.toFixed(5)}:${spot.longitude.toFixed(5)}`;
}

function mergeSpots(primary: Spot[], secondary: Spot[]) {
  const merged: Spot[] = [];
  const keys = new Set<string>();

  for (const spot of [...primary, ...secondary]) {
    const key = coordinateKey(spot);
    if (keys.has(key)) continue;

    const duplicate = merged.some(
      (existing) => distanceBetweenMeters(existing, spot) <= OVERPASS_DUPLICATE_RADIUS_METERS,
    );

    if (duplicate) continue;

    keys.add(key);
    merged.push(spot);
  }

  return merged;
}

async function fetchDeFlock(signal: AbortSignal) {
  const response = await fetch(DEFLOCK_DATASET_URL, {
    headers: { Accept: "application/geo+json, application/json" },
    cache: "force-cache",
    next: { revalidate: 3600 },
    signal,
  });

  if (!response.ok) throw new Error(`DeFlock returned HTTP ${response.status}.`);

  const data = (await response.json()) as { features?: GeoJsonFeature[] };
  return (data.features ?? [])
    .map(toDeFlockSpot)
    .filter((spot): spot is Spot => Boolean(spot));
}

function buildSearchPoints(latitude: number, longitude: number, radiusMeters: number) {
  const points: Array<[number, number]> = [[latitude, longitude]];
  const offsets = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];

  const stepDegrees = (OVERPASS_CHUNK_RADIUS_METERS * 1.35) / 111_320;
  const longitudeStep = stepDegrees / Math.max(0.25, Math.cos((latitude * Math.PI) / 180));

  for (const [latOffset, lngOffset] of offsets) {
    const pointLatitude = latitude + latOffset * stepDegrees;
    const pointLongitude = longitude + lngOffset * longitudeStep;

    if (distanceBetweenMeters(
      { latitude, longitude },
      { latitude: pointLatitude, longitude: pointLongitude },
    ) <= radiusMeters + OVERPASS_CHUNK_RADIUS_METERS) {
      points.push([pointLatitude, pointLongitude]);
    }
  }

  return points;
}

function buildOverpassQuery(points: Array<[number, number]>) {
  const clauses = points.flatMap(([latitude, longitude]) => [
    `nwr(around:${OVERPASS_CHUNK_RADIUS_METERS},${latitude},${longitude})["surveillance:type"~"ALPR|camera",i]`,
    `nwr(around:${OVERPASS_CHUNK_RADIUS_METERS},${latitude},${longitude})["camera:type"~"ALPR|plate",i]`,
    `nwr(around:${OVERPASS_CHUNK_RADIUS_METERS},${latitude},${longitude})[manufacturer~"Flock",i]`,
    `nwr(around:${OVERPASS_CHUNK_RADIUS_METERS},${latitude},${longitude})[operator~"Flock",i]`,
  ]);

  return `[out:json][timeout:25];(${clauses.join(";")};);out center tags;`;
}

async function fetchOverpass(
  latitude: number,
  longitude: number,
  radiusMeters: number,
  signal: AbortSignal,
) {
  const points = buildSearchPoints(
    latitude,
    longitude,
    Math.min(radiusMeters, MAX_QUERY_RADIUS_METERS),
  );

  let lastError: unknown;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    for (let attempt = 0; attempt <= OVERPASS_RETRIES; attempt += 1) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
          body: new URLSearchParams({ data: buildOverpassQuery(points) }).toString(),
          signal,
        });

        if (response.status === 429) {
          const retryAfter = Number(response.headers.get("Retry-After"));
          const delayMs = Number.isFinite(retryAfter)
            ? Math.min(Math.max(retryAfter * 1000, 500), 5000)
            : 1200 * (attempt + 1);

          if (attempt < OVERPASS_RETRIES) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            continue;
          }
        }

        if (!response.ok) {
          throw new Error(`Overpass returned HTTP ${response.status}.`);
        }

        const data = (await response.json()) as { elements?: OverpassElement[] };
        const spots = (data.elements ?? [])
          .map(toOverpassSpot)
          .filter((spot): spot is Spot => Boolean(spot));

        return filterNearby(spots, latitude, longitude, radiusMeters);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") throw error;
        lastError = error;
        break;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Camera data sources are unavailable.");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const latitude = Number(url.searchParams.get("lat"));
  const longitude = Number(url.searchParams.get("lng"));
  const requestedRadius = Number(url.searchParams.get("radius"));

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return Response.json({ error: "Valid lat and lng parameters are required." }, { status: 400 });
  }

  const radiusMeters = Number.isFinite(requestedRadius)
    ? Math.min(Math.max(requestedRadius, 500), MAX_QUERY_RADIUS_METERS)
    : 25_000;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);

  try {
    let deflockSpots: Spot[] = [];

    try {
      deflockSpots = filterNearby(
        await fetchDeFlock(controller.signal),
        latitude,
        longitude,
        radiusMeters,
      );
    } catch {
      // Keep going with OpenStreetMap when DeFlock is unavailable.
    }

    let overpassSpots: Spot[] = [];

    try {
      overpassSpots = await fetchOverpass(
        latitude,
        longitude,
        radiusMeters,
        controller.signal,
      );
    } catch {
      // DeFlock data can still be returned when Overpass is rate-limited.
    }

    const spots = mergeSpots(deflockSpots, overpassSpots);

    if (spots.length === 0 && deflockSpots.length === 0 && overpassSpots.length === 0) {
      return Response.json(
        { spots: [], source: "none", count: 0 },
        { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } },
      );
    }

    return Response.json(
      {
        spots,
        source: deflockSpots.length > 0 && overpassSpots.length > 0
          ? "DeFlock + OpenStreetMap"
          : deflockSpots.length > 0
            ? "DeFlock"
            : "OpenStreetMap",
        count: spots.length,
      },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } },
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return Response.json({ error: "Camera data request timed out." }, { status: 504 });
    }

    return Response.json(
      { error: error instanceof Error ? error.message : "Camera data unavailable." },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
