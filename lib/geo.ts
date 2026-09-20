import type { Spot, UserLocation } from "@/types/spot";

export const EARTH_RADIUS_METERS = 6371000;

export function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function metersToFeet(value: number): number {
  return value * 3.28084;
}

export function feetToMeters(value: number): number {
  return value * 0.3048;
}

export function distanceBetweenMeters(
  pointA: Pick<UserLocation, "latitude" | "longitude">,
  pointB: Pick<UserLocation, "latitude" | "longitude">,
): number {
  const lat1 = toRadians(pointA.latitude);
  const lat2 = toRadians(pointB.latitude);
  const deltaLat = toRadians(pointB.latitude - pointA.latitude);
  const deltaLng = toRadians(pointB.longitude - pointA.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(
  valueMeters: number,
  unit: "miles" | "kilometers",
): string {
  if (unit === "miles") {
    const miles = valueMeters / 1609.344;
    if (miles < 1) {
      return `${Math.round(miles * 5280)} ft`;
    }
    return `${miles.toFixed(1)} mi`;
  }

  const kilometers = valueMeters / 1000;
  if (kilometers < 1) {
    return `${Math.round(valueMeters)} m`;
  }
  return `${kilometers.toFixed(1)} km`;
}

export function formatNearbyDistance(
  valueMeters: number,
  unit: "miles" | "kilometers",
): string {
  if (unit === "miles") {
    const miles = valueMeters / 1609.344;
    if (miles < 0.1) {
      return `${Math.round(miles * 5280)} ft`;
    }
    return `${miles.toFixed(1)} mi`;
  }

  const kilometers = valueMeters / 1000;
  if (kilometers < 1) {
    return `${Math.round(valueMeters)} m`;
  }
  return `${kilometers.toFixed(1)} km`;
}

export function findNearbySpots(
  spots: Spot[],
  point: UserLocation | null,
  radiusMeters: number,
): Spot[] {
  if (!point) {
    return [];
  }

  return spots
    .map((spot) => ({
      ...spot,
      distanceMeters: distanceBetweenMeters(point, {
        latitude: spot.latitude,
        longitude: spot.longitude,
      }),
    }))
    .filter((spot) => spot.distanceMeters <= radiusMeters)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}

export function isDuplicateSpot(
  candidate: Pick<Spot, "latitude" | "longitude">,
  existingSpot: Spot,
  radiusFeet: number,
): boolean {
  const radiusMeters = feetToMeters(radiusFeet);
  const distance = distanceBetweenMeters(candidate, {
    latitude: existingSpot.latitude,
    longitude: existingSpot.longitude,
  });

  return distance <= radiusMeters;
}

export function buildGeoJson(spots: Spot[]) {
  return {
    type: "FeatureCollection" as const,
    features: spots.map((spot) => ({
      type: "Feature" as const,
      properties: {
        id: spot.id,
        title: spot.name ?? "Spot",
        type: spot.type ?? "Camera",
        source: spot.source ?? "DeFlock",
        manufacturer: spot.manufacturer ?? "Unknown",
        operator: spot.operator ?? "Unknown",
        direction: spot.direction ?? null,
      },
      geometry: {
        type: "Point" as const,
        coordinates: [spot.longitude, spot.latitude],
      },
    })),
  };
}
