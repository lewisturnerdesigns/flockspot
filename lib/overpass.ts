import { distanceBetweenMeters } from "@/lib/geo";
import type { Spot, UserLocation } from "@/types/spot";

const DEFLOCK_ENDPOINTS = ["/api/deflock"];

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

function buildQuery(location: UserLocation, radiusMeters: number): string {
  const { latitude, longitude } = location;
  return `[out:json][timeout:25];(nwr(around:${radiusMeters},${latitude},${longitude})["surveillance:type"~"ALPR|camera",i];nwr(around:${radiusMeters},${latitude},${longitude})["camera:type"~"ALPR|plate",i];nwr(around:${radiusMeters},${latitude},${longitude})[manufacturer~"Flock",i];nwr(around:${radiusMeters},${latitude},${longitude})[operator~"Flock",i];);out center tags;`;
}

function getCoordinates(
  element: OverpassElement,
): { latitude: number; longitude: number } | null {
  if (typeof element.lat === "number" && typeof element.lon === "number") {
    return { latitude: element.lat, longitude: element.lon };
  }

  if (
    element.center &&
    typeof element.center.lat === "number" &&
    typeof element.center.lon === "number"
  ) {
    return { latitude: element.center.lat, longitude: element.center.lon };
  }

  return null;
}

function parseDirection(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const numericDirection = Number(value);
  if (Number.isFinite(numericDirection)) {
    return (numericDirection + 360) % 360;
  }

  const compassDirections: Record<string, number> = {
    N: 0,
    NE: 45,
    E: 90,
    SE: 135,
    S: 180,
    SW: 225,
    W: 270,
    NW: 315,
  };

  return compassDirections[value.trim().toUpperCase()];
}

function toSpot(element: OverpassElement): Spot | null {
  const coordinates = getCoordinates(element);
  if (!coordinates) {
    return null;
  }

  const tags = element.tags ?? {};
  const type = tags["surveillance:type"] ?? tags["camera:type"] ?? "ALPR";
  const name = tags.name ?? tags.ref;

  return {
    id: `osm-${element.type}-${element.id}`,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    type,
    manufacturer: tags.manufacturer,
    operator: tags.operator,
    direction: parseDirection(tags.direction),
    source: "OpenStreetMap / Overpass",
    name,
    updatedAt: new Date().toISOString(),
  };
}

function toDeFlockSpot(feature: DeFlockFeature): Spot | null {
  const coordinates = feature.geometry?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }

  const longitude = Number(coordinates[0]);
  const latitude = Number(coordinates[1]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const props = feature.properties ?? {};
  if (props.isJunk) {
    return null;
  }

  const label = props.type
    ? `DeFlock ${String(props.type).toUpperCase()}`
    : "DeFlock public data";

  return {
    id: `deflock-${props.id ?? `${latitude}-${longitude}`}`,
    latitude,
    longitude,
    type: props.isInactive ? `${label} (inactive)` : label,
    manufacturer: "DeFlock",
    operator: props.state
      ? `${props.city ?? "Public"}, ${props.state}`
      : (props.city ?? "Public dataset"),
    direction: undefined,
    source: "DeFlock public dataset",
    name:
      props.name ??
      `${props.city ?? "DeFlock"} ${props.state ? `(${props.state})` : ""}`.trim(),
    updatedAt: new Date().toISOString(),
  };
}

async function fetchFromDeFlock(
  location: UserLocation,
  radiusMeters: number,
  signal?: AbortSignal,
): Promise<Spot[] | null> {
  let lastError: unknown;
  let receivedDataset = false;

  for (const endpoint of DEFLOCK_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, { signal, cache: "no-store" });
      if (!response.ok) {
        throw new Error(
          `DeFlock public dataset request failed with HTTP ${response.status}.`,
        );
      }

      const data = (await response.json()) as DeFlockFeatureCollection;
      receivedDataset = true;
      const spots = (data.features ?? [])
        .map((feature) => toDeFlockSpot(feature))
        .filter((spot): spot is Spot => Boolean(spot))
        .filter(
          (spot) =>
            distanceBetweenMeters(location, {
              latitude: spot.latitude,
              longitude: spot.longitude,
            }) <= radiusMeters,
        );

      console.info(
        `[FlockSpot] DeFlock public dataset returned ${spots.length} nearby Markers from ${endpoint}.`,
      );

      if (spots.length > 0) {
        return spots;
      }
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      lastError = error;
    }
  }

  if (lastError instanceof Error) {
    console.warn(
      "[FlockSpot] DeFlock public data was unavailable; falling back to Overpass.",
      lastError,
    );
  }

  return receivedDataset ? [] : null;
}

export async function fetchNearbySpots(
  location: UserLocation,
  radiusMeters: number,
  signal?: AbortSignal,
): Promise<Spot[]> {
  const deflockSpots = await fetchFromDeFlock(location, radiusMeters, signal);
  if (deflockSpots !== null) {
    return deflockSpots;
  }

  let lastError: unknown;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: new URLSearchParams({
          data: buildQuery(location, radiusMeters),
        }).toString(),
        signal,
      });

      if (!response.ok) {
        throw new Error(
          `Camera data request failed with HTTP ${response.status}.`,
        );
      }

      const data = (await response.json()) as { elements?: OverpassElement[] };
      const uniqueSpots = new Map<string, Spot>();

      for (const element of data.elements ?? []) {
        const spot = toSpot(element);
        if (spot) {
          uniqueSpots.set(spot.id, spot);
        }
      }

      const spots = [...uniqueSpots.values()];
      console.info(
        `[FlockSpot] Overpass returned ${spots.length} camera spot(s) from ${endpoint}.`,
      );
      console.table(
        spots.map((spot) => ({
          id: spot.id,
          latitude: spot.latitude,
          longitude: spot.longitude,
          direction: spot.direction ?? "unknown",
          name: spot.name ?? "Unnamed",
        })),
      );

      return spots;
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("All camera data sources are unavailable.");
}

type DeFlockFeature = {
  type?: string;
  geometry?: {
    type?: string;
    coordinates?: [number, number];
  };
  properties?: {
    id?: string;
    name?: string;
    city?: string;
    state?: string;
    type?: string;
    isJunk?: boolean;
    isInactive?: boolean;
  };
};

type DeFlockFeatureCollection = {
  features?: DeFlockFeature[];
};

type OverpassElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: {
    lat?: number;
    lon?: number;
  };
  tags?: Record<string, string>;
};
