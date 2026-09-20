import type { Spot, UserLocation } from "@/types/spot";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

function buildQuery(location: UserLocation, radiusMeters: number): string {
  const { latitude, longitude } = location;
  return `[out:json][timeout:25];(nwr(around:${radiusMeters},${latitude},${longitude})["surveillance:type"="ALPR"];nwr(around:${radiusMeters},${latitude},${longitude})["camera:type"="ALPR"];nwr(around:${radiusMeters},${latitude},${longitude})[manufacturer~"Flock",i];);out center tags;`;
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

export async function fetchNearbySpots(
  location: UserLocation,
  radiusMeters: number,
  signal?: AbortSignal,
): Promise<Spot[]> {
  let lastError: unknown;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: buildQuery(location, radiusMeters),
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

      return [...uniqueSpots.values()];
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
