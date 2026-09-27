import type { Spot, UserLocation } from "@/types/spot";

export const EARTH_RADIUS_METERS = 6_371_000;

export function feetToMeters(value: number) {
  return value * 0.3048;
}

export function distanceBetweenMeters(
  a: Pick<UserLocation, "latitude" | "longitude">,
  b: Pick<UserLocation, "latitude" | "longitude">,
) {
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function formatDistance(valueMeters: number, unit: AlertPreferencesUnit) {
  if (unit === "miles") {
    const miles = valueMeters / 1609.344;
    return miles < 1 ? `${Math.round(miles * 5280)} ft` : `${miles.toFixed(1)} mi`;
  }

  const kilometers = valueMeters / 1000;
  return kilometers < 1 ? `${Math.round(valueMeters)} m` : `${kilometers.toFixed(1)} km`;
}

export function findNearbySpots(spots: Spot[], point: UserLocation | null, radiusMeters: number) {
  if (!point) return [];

  return spots
    .map((spot) => ({
      ...spot,
      distanceMeters: distanceBetweenMeters(point, spot),
    }))
    .filter((spot) => spot.distanceMeters <= radiusMeters)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}

export function isDuplicateSpot(candidate: UserLocation, spot: Spot, radiusFeet: number) {
  return distanceBetweenMeters(candidate, spot) <= feetToMeters(radiusFeet);
}

export function buildGeoJson(spots: Spot[]) {
  return {
    type: "FeatureCollection" as const,
    features: spots.map((spot) => ({
      type: "Feature" as const,
      properties: {
        id: spot.id,
        title: spot.name ?? "Mapped camera",
        type: spot.type ?? "Camera",
        source: spot.source ?? "Public data",
        direction: spot.direction ?? null,
      },
      geometry: {
        type: "Point" as const,
        coordinates: [spot.longitude, spot.latitude],
      },
    })),
  };
}

type AlertPreferencesUnit = "miles" | "kilometers";
